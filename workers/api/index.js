/**
 * Cloudflare Workers API - 用户积分系统
 * 
 * 端点:
 * - POST /api/user/register     - 注册/绑定Google用户
 * - GET  /api/user/me          - 获取当前用户信息
 * - GET  /api/user/credits     - 获取积分余额
 * - POST /api/user/deduct      - 扣减积分
 * - POST /api/user/add         - 增加积分（管理员/充值）
 * - GET  /api/pricing          - 获取定价方案
 */

// 定价方案配置
const PRICING_PLANS = {
  starter: {
    name: '入门包',
    price: 3,
    credits: 20,
    description: '首次充值优惠'
  },
  standard: {
    name: '标准包',
    price: 8,
    credits: 60,
    description: '常用选择'
  },
  pro: {
    name: 'Pro月付',
    price: 25,
    credits: 200,
    description: '高频用户首选'
  }
};

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

// 解析 JWT token (Google OAuth)
function parseJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// 获取用户ID (从 Authorization header)
async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = parseJWT(token);
  if (!payload || !payload.sub) {
    return null;
  }
  
  // 查询数据库
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE google_id = ?'
  ).bind(payload.sub).first();
  
  return user;
}

async function handleRegister(request, env) {
  try {
    const body = await request.json();
    const { googleToken } = body;
    
    if (!googleToken) {
      return errorResponse('Missing googleToken');
    }
    
    const payload = parseJWT(googleToken);
    if (!payload || !payload.sub) {
      return errorResponse('Invalid token');
    }
    
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || 'User';
    const avatar = payload.picture || '';
    
    // 检查用户是否已存在
    const existingUser = await env.DB.prepare(
      'SELECT * FROM users WHERE google_id = ?'
    ).bind(googleId).first();
    
    if (existingUser) {
      // 用户已存在，返回用户信息
      return jsonResponse({
        success: true,
        isNewUser: false,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          avatar: existingUser.avatar,
          credits: existingUser.credits
        }
      });
    }
    
    // 创建新用户 (注册送3积分)
    const result = await env.DB.prepare(
      'INSERT INTO users (google_id, email, name, avatar, credits) VALUES (?, ?, ?, ?, 3)'
    ).bind(googleId, email, name, avatar).run();
    
    const userId = result.meta.last_row_id;
    
    // 记录注册赠送事务
    await env.DB.prepare(
      'INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, 'register', 3, 3, '注册赠送').run();
    
    return jsonResponse({
      success: true,
      isNewUser: true,
      user: {
        id: userId,
        email,
        name,
        avatar,
        credits: 3
      }
    });
    
  } catch (e) {
    console.error('Register error:', e);
    return errorResponse('Server error: ' + e.message, 500);
  }
}

async function handleGetUser(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }
  
  return jsonResponse({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      credits: user.credits
    }
  });
}

async function handleGetCredits(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }
  
  // 获取最近交易记录
  const transactions = await env.DB.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
  ).bind(user.id).all();
  
  return jsonResponse({
    success: true,
    credits: user.credits,
    transactions: transactions.results
  });
}

async function handleDeductCredits(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }
  
  try {
    const body = await request.json();
    const { amount, description } = body;
    
    if (!amount || amount <= 0) {
      return errorResponse('Invalid amount');
    }
    
    if (user.credits < amount) {
      return errorResponse('Insufficient credits');
    }
    
    const newBalance = user.credits - amount;
    
    // 扣减积分
    await env.DB.prepare(
      'UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newBalance, user.id).run();
    
    // 记录事务
    await env.DB.prepare(
      'INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)'
    ).bind(user.id, 'deduct', -amount, newBalance, description || '图片处理').run();
    
    return jsonResponse({
      success: true,
      credits: newBalance,
      deducted: amount
    });
    
  } catch (e) {
    console.error('Deduct error:', e);
    return errorResponse('Server error: ' + e.message, 500);
  }
}

async function handleAddCredits(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }
  
  try {
    const body = await request.json();
    const { amount, type, description } = body;
    
    if (!amount || amount <= 0) {
      return errorResponse('Invalid amount');
    }
    
    const newBalance = user.credits + amount;
    
    // 增加积分
    await env.DB.prepare(
      'UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newBalance, user.id).run();
    
    // 记录事务
    await env.DB.prepare(
      'INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)'
    ).bind(user.id, type || 'purchase', amount, newBalance, description || '充值').run();
    
    return jsonResponse({
      success: true,
      credits: newBalance,
      added: amount
    });
    
  } catch (e) {
    console.error('Add credits error:', e);
    return errorResponse('Server error: ' + e.message, 500);
  }
}

async function handleGetPricing(request, env) {
  return jsonResponse({
    success: true,
    plans: PRICING_PLANS,
    freeCredits: 3  // 注册赠送
  });
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 处理 CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // 路由
    if (path === '/api/user/register' && request.method === 'POST') {
      return handleRegister(request, env);
    }
    
    if (path === '/api/user/me' && request.method === 'GET') {
      return handleGetUser(request, env);
    }
    
    if (path === '/api/user/credits' && request.method === 'GET') {
      return handleGetCredits(request, env);
    }
    
    if (path === '/api/user/deduct' && request.method === 'POST') {
      return handleDeductCredits(request, env);
    }
    
    if (path === '/api/user/add' && request.method === 'POST') {
      return handleAddCredits(request, env);
    }
    
    if (path === '/api/pricing' && request.method === 'GET') {
      return handleGetPricing(request, env);
    }
    
    return errorResponse('Not found', 404);
    
  } catch (e) {
    console.error('Request error:', e);
    return errorResponse('Server error: ' + e.message, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};
