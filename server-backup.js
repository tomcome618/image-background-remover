// 加载环境变量
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// 创建公共目录
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// API Key 检查端点
app.get('/api/check-api-key', (req, res) => {
  const hasApiKey = !!process.env.REMOVE_BG_API_KEY;
  res.json({
    success: true,
    hasApiKey: hasApiKey,
    message: hasApiKey ? 'API Key 已配置' : 'API Key 未配置',
    keyPreview: hasApiKey ? process.env.REMOVE_BG_API_KEY.substring(0, 10) + '...' : null,
    environment: process.env.NODE_ENV || 'production',
    serverTime: new Date().toISOString()
  });
});

// 主页
app.get('/', (req, res) => {
  console.log(`📨 收到主页请求: Host=${req.headers.host}, IP=${req.ip}`);
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
          <p>使用 Remove.bg API 技术 | 本地测试版本</p>
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
          reader.readAsDataURL(file);
        }
        
        // 处理按钮点击
        processBtn.addEventListener('click', async () => {
          if (!currentFile) return;
          
          const formData = new FormData();
          formData.append('image', currentFile);
          
          // 显示加载中
          loading.style.display = 'block';
          processBtn.disabled = true;
          hideError();
          hideResult();
          
          try {
            const response = await fetch('/process', {
              method: 'POST',
              body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
              // 显示处理后的图片
              processedPreview.src = data.processedUrl;
              downloadLink.href = data.processedUrl;
              downloadLink.download = 'background-removed.png';
              result.style.display = 'block';
            } else {
              showError(data.error || '处理失败');
            }
          } catch (err) {
            showError('网络错误: ' + err.message);
          } finally {
            loading.style.display = 'none';
            processBtn.disabled = false;
          }
        });
        
        function showError(message) {
          error.textContent = message;
          error.style.display = 'block';
        }
        
        function hideError() {
          error.style.display = 'none';
        }
        
        function hideResult() {
          result.style.display = 'none';
        }
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

// 处理图片上传
app.post('/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请上传图片文件' });
    }
    
    // 检查 API 客户端
    if (!removeBgClient) {
      return res.status(500).json({ 
        success: false, 
        error: 'Remove.bg API 未正确配置，请检查 API Key' 
      });
    }
    
    const inputPath = req.file.path;
    const outputFilename = `processed-${Date.now()}.png`;
    const outputPath = path.join('public', outputFilename);
    
    console.log(`处理图片: ${inputPath} -> ${outputPath}`);
    
    // 使用 Remove.bg API 处理图片
    const result = await removeBgClient.removeBackground(inputPath, outputPath, {
      size: 'auto',
      type: 'auto',
      format: 'png'
    });
    
    console.log('处理结果:', result);
    
    // 清理上传的临时文件
    try {
      fs.unlinkSync(inputPath);
    } catch (e) {
      console.warn('清理临时文件失败:', e.message);
    }
    
    // 返回结果
    res.json({
      success: true,
      originalUrl: `/uploads/${req.file.filename}`,
      processedUrl: `/${outputFilename}`,
      message: '背景移除完成',
      credits: result.credits,
      fileSize: result.fileSize
    });
    
  } catch (error) {
    console.error('处理错误:', error);
    
    // 清理临时文件
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // 忽略清理错误
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || '处理过程中发生错误'
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'image-background-remover',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 服务器已启动: http://0.0.0.0:${port}`);
  console.log(`📱 本地访问: http://localhost:${port}`);
  console.log(`🌐 外部访问: http://43.162.82.13:${port}`);
  console.log(`🔧 API Key 状态: ${process.env.REMOVE_BG_API_KEY ? '已配置' : '未配置'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('正在关闭服务器...');
  process.exit(0);
});