const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { passport, ensureAuthenticated, ensureNotAuthenticated } = require('./auth');
const RemoveBgAPI = require('./removebg-api');

const app = express();
const port = 3000;

// 配置 multer 处理文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片文件 (jpeg, jpg, png, webp)'));
    }
  }
});

// 中间件
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 会话配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: false,
    httpOnly: true
  }
}));

// 初始化Passport
app.use(passport.initialize());
app.use(passport.session());

// 创建公共目录
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// 登录页面
app.get('/login', ensureNotAuthenticated, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>登录 - Image Background Remover</title>
      <style>
        body { font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .login-container { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 40px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); text-align: center; width: 100%; }
        h1 { color: white; margin-bottom: 30px; font-size: 2em; }
        .google-btn { background: white; color: #757575; border: none; padding: 15px 30px; font-size: 1.1em; border-radius: 10px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; margin: 20px 0; }
        .google-btn:hover { background: #f5f5f5; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2); }
        .google-icon { width: 24px; height: 24px; }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>🖼️ Image Background Remover</h1>
        <p style="color: white; margin-bottom: 30px;">请登录以使用图片背景移除功能</p>
        <a href="/auth/google" class="google-btn">
          <img src="https://www.google.com/favicon.ico" alt="Google" class="google-icon">
          使用 Google 账号登录
        </a>
        <a href="/" style="color: rgba(255, 255, 255, 0.7); text-decoration: none; font-size: 0.9em; margin-top: 20px; display: inline-block;">返回首页</a>
      </div>
    </body>
    </html>
  `);
});

// Google OAuth 认证路由
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

// 登出路由
app.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// 主页 - 需要登录
app.get('/', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  
  const user = req.user;
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Image Background Remover 🖼️</title>
      <style>
        body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: white; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .user-info { display: flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, 0.1); padding: 10px 15px; border-radius: 10px; backdrop-filter: blur(5px); }
        .user-avatar { width: 40px; height: 40px; border-radius: 50%; border: 2px solid white; }
        .logout-btn { background: rgba(255, 255, 255, 0.2); color: white; border: 1px solid rgba(255, 255, 255, 0.3); padding: 8px 15px; border-radius: 5px; cursor: pointer; text-decoration: none; font-size: 0.9em; }
        .container { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 40px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); }
        h1 { text-align: center; margin-bottom: 30px; font-size: 2.5em; }
        .upload-area { border: 3px dashed rgba(255, 255, 255, 0.3); border-radius: 15px; padding: 60px 20px; text-align: center; cursor: pointer; transition: all 0.3s; margin-bottom: 30px; }
        .upload-area:hover { border-color: rgba(255, 255, 255, 0.6); background: rgba(255, 255, 255, 0.05); }
        #fileInput { display: none; }
        .btn { background: #4CAF50; color: white; border: none; padding: 15px 30px; font-size: 1.1em; border-radius: 10px; cursor: pointer; transition: all 0.3s; display: block; margin: 20px auto; width: 200px; }
        .btn:hover { background: #45a049; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); }
        .btn:disabled { background: #cccccc; cursor: not-allowed; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="user-info">
          <img src="${user.picture}" alt="${user.name}" class="user-avatar">
          <div>${user.name} (${user.email})</div>
        </div>
        <a href="/logout" class="logout-btn">登出</a>
      </div>
      
      <div class="container">
        <h1>🖼️ Image Background Remover</h1>
        
        <div class="upload-area" id="uploadArea">
          <input type="file" id="fileInput" accept="image/*">
          <label for="fileInput" style="display: block; font-size: 1.2em; margin-bottom: 10px;">
            📁 点击选择图片或拖拽到此处
          </label>
          <div style="color: rgba(255, 255, 255, 0.7); font-size: 0.9em;">
            支持 JPG, PNG, WebP 格式 (最大 10MB)
          </div>
        </div>
        
        <button class="btn" id="processBtn" disabled>开始移除背景</button>
        
        <div style="text-align: center; margin-top: 40px; color: rgba(255, 255, 255, 0.7); font-size: 0.9em;">
          <p>已登录用户: ${user.email}</p>
        </div>
      </div>
      
      <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const processBtn = document.getElementById('processBtn');
        
        uploadArea.addEventListener('click', () => {
          fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
          if (e.target.files.length) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) {
              alert('文件大小不能超过 10MB');
              return;
            }
            processBtn.disabled = false;
          }
        });
        
        processBtn.addEventListener('click', async () => {
          const file = fileInput.files[0];
          if (!file) return;
          
          const formData = new FormData();
          formData.append('image', file);
          
          processBtn.disabled = true;
          processBtn.textContent = '处理中...';
          
          try {
            const response = await fetch('/process', {
              method: 'POST',
              body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
              alert('处理完成！可以下载图片了。');
              // 这里可以添加下载链接
            } else {
              alert('处理失败: ' + data.error);
            }
          } catch (err) {
            alert('网络错误: ' + err.message);
          } finally {
            processBtn.disabled = false;
            processBtn.textContent = '开始移除背景';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// 初始化 Remove.bg API
let removeBgClient;
try {
  removeBgClient = new RemoveBgAPI();
  console.log('✅ Remove.bg API 客户端初始化成功');
} catch (error) {
  console.error('❌ Remove.bg API 初始化失败:', error.message);
  removeBgClient = null;
}

// 处理图片上传 - 需要登录
app.post('/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请上传图片文件' });
    }
    
    if (!removeBgClient) {
      return res.status(500).json({ 
        success: false, 
        error: 'Remove.bg API 未正确配置' 
      });
    }
    
    const inputPath = req.file.path;
    const outputFilename = `processed-${Date.now()}-${req.user.id}.png`;
    const outputPath = path.join('public', outputFilename);
    
    console.log(`处理图片: ${inputPath} -> ${outputPath} (用户: ${req.user.email})`);
    
    const result = await removeBgClient.removeBackground(inputPath, outputPath, {
      size: 'auto',
      type: 'auto',
      format: 'png'
    });
    
    // 清理临时文件
    try {
      fs.unlinkSync(inputPath);
    } catch (e) {
      console.warn('清理临时文件失败:', e.message);
    }
    
    res.json({
      success: true,
      processedUrl: `/${outputFilename}`,
      message: '背景移除完成',
      user: req.user.email
    });
    
  } catch (error) {
    console.error('处理错误:', error);
    
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || '处理过程中发生错误'
    });
  }
});

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'image-background-remover',
    version: '1.0.0',
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? req.user.email : null,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 服务器已启动: http://0.0.0.0:${port}`);
  console.log(`📱 本地访问: http://localhost:${port}`);
  console.log(`🌐 外部访问: http://43.162.82.13:${port}`);
  console.log(`🔐 认证系统: Google OAuth 已启用`);
  console.log(`🔧 API Key 状态: ${process.env.REMOVE_BG_API_KEY ? '已配置' : '未配置'}`);
  console.log(`🔑 Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? '已配置' : '未配置'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('正在关闭服务器...');
  process.exit(0);
});