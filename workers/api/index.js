/**
 * Cloudflare Workers API - 用户积分系统 + PayPal 支付 (ES Module Format)
 */

// PayPal API 配置 - 沙箱环境
const PAYPAL_API = {
  baseUrl: 'https://api-m.sandbox.paypal.com',  // 沙箱环境用这个
  // 生产环境用: 'https://api-m.paypal.com'
  clientId: 'Afo5KNuE2afvKy5AKDO0AYcBTajVj59T9whC6PvnSJZmaCTTN3IQ8vJcImPD37MM7SeCrix1tcxyEbzL',
  clientSecret: 'EA9F_cmcLsV3JV-hQl9lq-Up87kYRJCPws5az04UkBNFI6qlPAAf6WscjAVPgvwOyzz4AGSq0H8iwM9j',
  merchantEmail: 'tomcome@126.com'
};

// 定价方案配置
const PRICING_PLANS = {
  starter: { name: '入门包', price: 3, credits: 20, description: '首次充值优惠' },
  standard: { name: '标准包', price: 8, credits: 60, description: '常用选择' },
  pro: { name: 'Pro月付', price: 25, credits: 200, description: '高频用户首选' }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env, ctx);
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

function parseJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) { return null; }
}

async function getPayPalAccessToken() {
  const auth = btoa(`${PAYPAL_API.clientId}:${PAYPAL_API.clientSecret}`);
  const response = await fetch(`${PAYPAL_API.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  return data.access_token;
}

async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const payload = parseJWT(token);
  if (!payload || !payload.sub) return null;
  return await env.DB.prepare('SELECT * FROM users WHERE google_id = ?').bind(payload.sub).first();
}

async function handleRegister(request, env) {
  try {
    const body = await request.json();
    const { googleToken } = body;
    if (!googleToken) return errorResponse('Missing googleToken');
    
    const payload = parseJWT(googleToken);
    if (!payload || !payload.sub) return errorResponse('Invalid token');
    
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || 'User';
    const avatar = payload.picture || '';
    
    const existingUser = await env.DB.prepare('SELECT * FROM users WHERE google_id = ?').bind(googleId).first();
    if (existingUser) {
      return jsonResponse({
        success: true, isNewUser: false,
        user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, avatar: existingUser.avatar, credits: existingUser.credits }
      });
    }
    
    const result = await env.DB.prepare('INSERT INTO users (google_id, email, name, avatar, credits) VALUES (?, ?, ?, ?, 3)')
      .bind(googleId, email, name, avatar).run();
    const userId = result.meta.last_row_id;
    
    await env.DB.prepare('INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, 'register', 3, 3, '注册赠送').run();
    
    return jsonResponse({
      success: true, isNewUser: true,
      user: { id: userId, email, name, avatar, credits: 3 }
    });
  } catch (e) {
    console.error('Register error:', e);
    return errorResponse('Server error: ' + e.message, 500);
  }
}

async function handleGetUser(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return errorResponse('Unauthorized', 401);
  return jsonResponse({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, credits: user.credits }
  });
}

async function handleGetCredits(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return errorResponse('Unauthorized', 401);
  const transactions = await env.DB.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10')
    .bind(user.id).all();
  return jsonResponse({ success: true, credits: user.credits, transactions: transactions.results });
}

async function handleDeductCredits(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return errorResponse('Unauthorized', 401);
  try {
    const body = await request.json();
    const { amount, description } = body;
    if (!amount || amount <= 0) return errorResponse('Invalid amount');
    if (user.credits < amount) return errorResponse('Insufficient credits');
    
    const newBalance = user.credits - amount;
    await env.DB.prepare('UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(newBalance, user.id).run();
    await env.DB.prepare('INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
      .bind(user.id, 'deduct', -amount, newBalance, description || '图片处理').run();
    
    return jsonResponse({ success: true, credits: newBalance, deducted: amount });
  } catch (e) {
    console.error('Deduct error:', e);
    return errorResponse('Server error: ' + e.message, 500);
  }
}

async function handleAddCredits(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return errorResponse('Unauthorized', 401);
  try {
    const body = await request.json();
    const { amount, type, description } = body;
    if (!amount || amount <= 0) return errorResponse('Invalid amount');
    
    const newBalance = user.credits + amount;
    await env.DB.prepare('UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(newBalance, user.id).run();
    await env.DB.prepare('INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
      .bind(user.id, type || 'purchase', amount, newBalance, description || '充值').run();
    
    return jsonResponse({ success: true, credits: newBalance, added: amount });
  } catch (e) {
    console.error('Add credits error:', e);
    return errorResponse('Server error: ' + e.message, 500);
  }
}

async function handleGetPricing(request, env) {
  return jsonResponse({ success: true, plans: PRICING_PLANS, freeCredits: 3 });
}

// ==================== PayPal 支付接口 ====================

async function handlePayPalCreateOrder(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return errorResponse('Unauthorized', 401);
  
  try {
    const body = await request.json();
    const { plan } = body;
    
    const planData = PRICING_PLANS[plan];
    if (!planData) return errorResponse('Invalid plan');
    
    const accessToken = await getPayPalAccessToken();
    
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `user_${user.id}_plan_${plan}`,
        description: `${planData.name} - ${planData.credits} 积分`,
        amount: {
          currency_code: 'USD',
          value: planData.price.toFixed(2)
        },
        payee: {
          email_address: PAYPAL_API.merchantEmail
        }
      }],
      application_context: {
        brand_name: 'Image Background Remover',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: 'https://image-background-eraser.shop/payment-success.html',
        cancel_url: 'https://image-background-eraser.shop/payment-cancel.html'
      }
    };
    
    const response = await fetch(`${PAYPAL_API.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });
    
    const order = await response.json();
    
    if (!response.ok) {
      console.error('PayPal create order error:', order);
      return errorResponse('Failed to create PayPal order', 500);
    }
    
    return jsonResponse({
      success: true,
      orderId: order.id,
      plan: plan,
      credits: planData.credits
    });
    
  } catch (e) {
    console.error('Create order error:', e);
    return errorResponse('Server error: ' + e.message, 500);
  }
}

async function handlePayPalCaptureOrder(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return errorResponse('Unauthorized', 401);
  
  try {
    const body = await request.json();
    const { orderId, plan } = body;
    
    if (!orderId) return errorResponse('Missing orderId');
    
    const planData = PRICING_PLANS[plan];
    if (!planData) return errorResponse('Invalid plan');
    
    const accessToken = await getPayPalAccessToken();
    
    const response = await fetch(`${PAYPAL_API.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const capture = await response.json();
    
    if (!response.ok) {
      console.error('PayPal capture error:', capture);
      return errorResponse('Payment capture failed', 500);
    }
    
    // 检查支付状态
    if (capture.status === 'COMPLETED') {
      // 添加积分
      const newBalance = user.credits + planData.credits;
      await env.DB.prepare('UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(newBalance, user.id).run();
      await env.DB.prepare('INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
        .bind(user.id, 'paypal', planData.credits, newBalance, `PayPal 购买 ${planData.name}`).run();
      
      return jsonResponse({
        success: true,
        message: 'Payment successful',
        credits: newBalance,
        addedCredits: planData.credits
      });
    } else {
      return jsonResponse({
        success: false,
        status: capture.status,
        message: 'Payment not completed'
      });
    }
    
  } catch (e) {
    console.error('Capture order error:', e);
    return errorResponse('Server error: ' + e.message, 500);
  }
}

// PayPal Webhook 处理
async function handlePayPalWebhook(request, env) {
  try {
    const body = await request.text();
    const event = JSON.parse(body);
    
    console.log('PayPal webhook event:', event.event_type);
    
    // 处理不同的 webhook 事件
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('Payment completed:', event.resource);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        console.log('Payment denied:', event.resource);
        break;
      default:
        console.log('Unhandled event type:', event.event_type);
    }
    
    return jsonResponse({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return errorResponse('Webhook processing failed', 500);
  }
}

// ==================== 路由处理 ====================

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // 用户认证相关
    if (path === '/api/user/register' && request.method === 'POST') return handleRegister(request, env);
    if (path === '/api/user/me' && request.method === 'GET') return handleGetUser(request, env);
    if (path === '/api/user/credits' && request.method === 'GET') return handleGetCredits(request, env);
    if (path === '/api/user/deduct' && request.method === 'POST') return handleDeductCredits(request, env);
    if (path === '/api/user/add' && request.method === 'POST') return handleAddCredits(request, env);
    if (path === '/api/pricing' && request.method === 'GET') return handleGetPricing(request, env);
    
    // PayPal 支付相关
    if (path === '/api/paypal/create-order' && request.method === 'POST') return handlePayPalCreateOrder(request, env);
    if (path === '/api/paypal/capture-order' && request.method === 'POST') return handlePayPalCaptureOrder(request, env);
    if (path === '/api/paypal/webhook' && request.method === 'POST') return handlePayPalWebhook(request, env);
    
    return errorResponse('Not found', 404);
  } catch (e) {
    console.error('Request error:', e);
    return errorResponse('Server error: ' + e.message, 500);
  }
}
