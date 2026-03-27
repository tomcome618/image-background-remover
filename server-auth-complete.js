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
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    secure: false, // 生产环境应该设为true（HTTPS）
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
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          max-width: 400px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          text-align: center;
          width: 100%;
        }
        h1 {
          color: white;
          margin-bottom: 30px;
          font-size: 2em;
        }
        .google-btn {
          background: white;
          color: #757575;
          border: none;
          padding: 15px 30px;
          font-size: 1.1em;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          margin: 20px 0;
        }
        .google-btn:hover {
          background: #f5f5f5;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        .google-icon {
          width: 24px;
          height: 24px;
        }
        .info {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9em;
          margin-top: 20px;
        }
        .back-link {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 0.9em;
          margin-top: 20px;
          display: inline-block;
        }
        .back-link:hover {
          color: white;
        }
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
        
        <div class="info">
          登录后您可以：
          <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
            <li>使用图片背景移除功能</li>
            <li>查看处理历史记录</li>
            <li>管理您的账户设置</li>
          </ul>
        </div>
        
        <a href="/" class="back-link">返回首页</a>
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
    // 认证成功，重定向到主页
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

// 用户信息API
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// 主页 - 需要登录
app.get('/', ensureAuthenticated, (req, res) => {
  const user = req.user;
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Image Background Remover 🖼️</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: white;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.1);
          padding: 10px 15px;
          border-radius: 10px;
          backdrop-filter: blur(5px);
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid white;
        }
        .user-details {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: bold;
          font-size: 1.1em;
        }
        .user-email {
          font-size: 0.8em;
          opacity: 0.8;
        }
        .logout-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 8px 15px;
          border-radius: 5px;
          cursor: pointer;
          text-decoration: none;
          font-size: 0.9em;
          transition: all 0.3s;
        }
        .logout-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
          text-align: center;
          margin-bottom: 30px;
          font-size: 2.5em;
        }
        .upload-area {
          border: 3px dashed rgba(255, 255, 255, 0.3);
          border-radius: 15px;
          padding: 60px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 30px;
        }
        .upload-area:hover {
          border-color: rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.05);
        }
        .upload-area.dragover {
          border-color: #4CAF50;
          background: rgba(76, 175, 80, 0.1);
        }
        #fileInput {
          display: none;
        }
        .upload-label {
          display: block;
          font-size: 1.2em;
          margin-bottom: 10px;
        }
        .upload-hint {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9em;
        }
        .preview-container {
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          gap: 20px;
          margin: 30px 0;
        }
        .preview-box {
          flex: 1;
          min-width: 300px;
          text-align: center;
        }
        .preview-img {
          max-width: 100%;
          max-height: 300px;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          background: white;
          padding: 10px;
        }
        .preview-label {
          margin-top: 10px;
          font-weight: bold;
        }
        .btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 15px 30px;
          font-size: 1.1em;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          display: block;
          margin: 20px auto;
          width: 200px;
        }
        .btn:hover {
          background: #45a049;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        .btn:disabled {
          background: #cccccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .loading {
          text-align: center;
          margin: 20px 0;
          display: none;
        }
        .result {
          text-align: center;
          margin-top: 30px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          display: none;
        }
        .download-btn {
          background: #2196F3;
          margin-top: 15px;
        }
        .download-btn:hover {
          background: #1976D2;
        }
        .error {
          color: #ff6b6b;
          text-align: center;
          margin: 20px 0;
          padding: 15px;
          background: rgba(255, 107, 107, 0.1);
          border-radius: 10px;
          display: none;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9em;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="user-info">
          <img src="${user.picture}" alt="${user.name}" class="user-avatar">
          <div class="user-details">
            <div class="user-name">${user.name}</div>
            <div class="user-email">${user.email}</div>
          </div>
        </div>
        <a href="/logout" class="logout-btn">登出</a>
      </div>
      
      <div class="container">
        <h1>🖼️ Image Background Remover</h1>
        
        <div class="upload-area" id="uploadArea">
          <input type="file" id="fileInput" accept="image/*">
          <label for="fileInput" class="upload-label">
            📁 点击选择图片或拖拽到此处
          </label>
          <div class="upload-hint">
            支持 JPG, PNG, WebP 格式 (最大 10MB)
          </div>
        </div>
        
        <div class="preview-container" id="previewContainer" style="display: none;">
          <div class="preview-box">
            <div class="preview-label">原图</div>
            <img id="originalPreview" class="preview-img" src="" alt="原图">
          </div>
          <div class="preview-box">
            <div class="preview-label">处理后</div>
            <img id="processedPreview" class="preview-img" src="" alt="处理后">
          </div>
        </div>
        
        <button class="btn" id="processBtn" disabled>开始移除背景</button>
        
        <div class="loading" id="loading">
          <div>🔄 正在处理中，请稍候...</div>
          <div style="margin-top: 10px; font-size: 0.9em;">这可能需要几秒钟时间</div>
        </div>
        
        <div class="error" id="error"></div>
        
        <div class="result" id="result">
          <div>✅ 背景移除完成！</div>
          <a class="btn download-btn" id="downloadLink" download>下载图片</a>
        </div>
        
        <div class="footer">
          <p>使用 Remove.bg API 技术 | 已登录用户: ${user.email}</p>
          <p>API Key: ${process.env.REMOVE_BG_API_KEY ? '已配置' : '未配置'}</p>
        </div>
      </div>
      
      <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const previewContainer = document.getElementById('previewContainer');
        const originalPreview = document.getElementById('originalPreview');
        const processBtn = document.getElementById('processBtn');
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');
        const error = document.getElementById('error');
        const downloadLink = document.getElementById('downloadLink');
        const processedPreview = document.getElementById('processedPreview');
        
        let currentFile = null;
        
        // 拖拽功能
        uploadArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
          uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadArea.classList.remove('dragover');
          
          if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
          }
        });
        
        // 点击选择文件
        uploadArea.addEventListener('click', () => {
          fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
          if (e.target.files.length) {
            handleFile(e.target.files[0]);
          }
        });
        
        function handleFile(file) {
          // 验证文件类型和大小
          if (!file.type.match('image.*')) {
            showError('请选择图片文件');
            return;
          }
          
          if (file.size > 10 * 1024 * 1024) {
            showError('文件大小不能超过 10MB');
            return;
          }
          
          currentFile = file;
          
          // 显示预览
          const reader = new FileReader();
          reader.onload = (e) => {
            originalPreview.src = e.target.result;
            previewContainer.style.display = 'flex';
            processBtn.disabled = false;
            hideError();
            hideResult();
          };
          reader.read