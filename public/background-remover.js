// 前端背景移除工具 - 直接调用 Remove.bg API
class BackgroundRemover {
    constructor() {
        this.apiKey = null;
        this.initialize();
    }

    async initialize() {
        // 从环境变量或用户输入获取 API Key
        await this.loadApiKey();
        this.setupEventListeners();
        this.updateUI();
    }

    async loadApiKey() {
        // 从页面配置获取 API Key
        const configElement = document.getElementById('apiKeyConfig');
        if (configElement && configElement.dataset.apiKey) {
            this.apiKey = configElement.dataset.apiKey;
            console.log('从页面配置获取 API Key');
        }
        
        // 如果页面配置没有，尝试从环境变量获取
        if (!this.apiKey && typeof process !== 'undefined' && process.env && process.env.REMOVE_BG_API_KEY) {
            this.apiKey = process.env.REMOVE_BG_API_KEY;
            console.log('从环境变量获取 API Key');
        }
        
        // 如果都没有，使用实际的 API Key
        if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') {
            this.apiKey = 'uRDGpJCnTetH4cwCJSQVUW2L';
            console.log('使用硬编码的 API Key');
        }
        
        // 更新 UI 状态
        this.updateApiStatus();
    }
    
    updateApiStatus() {
        const apiStatusElement = document.getElementById('apiStatus');
        if (apiStatusElement) {
            if (this.apiKey && this.apiKey !== 'YOUR_API_KEY_HERE') {
                apiStatusElement.textContent = '✅ API Key 已配置';
                apiStatusElement.className = 'status-success';
            } else {
                apiStatusElement.textContent = '❌ API Key 未配置';
                apiStatusElement.className = 'status-error';
            }
        }
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const processBtn = document.getElementById('processBtn');

        if (uploadArea && fileInput) {
            // 拖拽上传
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
                    this.handleFile(e.dataTransfer.files[0]);
                }
            });

            // 点击上传
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }

        if (processBtn) {
            processBtn.addEventListener('click', () => this.processImage());
        }
    }

    handleFile(file) {
        // 验证文件
        if (!file.type.match('image.*')) {
            this.showError('请选择图片文件 (JPG, PNG, WebP)');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showError('文件大小不能超过 10MB');
            return;
        }

        this.currentFile = file;
        
        // 显示预览
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('originalPreview');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            
            const previewContainer = document.getElementById('previewContainer');
            if (previewContainer) {
                previewContainer.style.display = 'flex';
            }
            
            const processBtn = document.getElementById('processBtn');
            if (processBtn) {
                processBtn.disabled = false;
            }
            
            this.hideError();
            this.hideResult();
        };
        reader.readAsDataURL(file);
    }

    async processImage() {
        if (!this.currentFile) {
            this.showError('请先选择图片');
            return;
        }

        if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') {
            this.showError('API Key 未配置，请检查环境变量设置');
            return;
        }

        // 显示加载状态
        this.showLoading(true);
        this.hideError();
        this.hideResult();

        try {
            const formData = new FormData();
            formData.append('image_file', this.currentFile);
            formData.append('size', 'auto');
            formData.append('format', 'png');

            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: {
                    'X-Api-Key': this.apiKey
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.errors?.[0]?.title || `API 错误: ${response.status}`);
            }

            const blob = await response.blob();
            const processedUrl = URL.createObjectURL(blob);

            // 显示处理结果
            const processedPreview = document.getElementById('processedPreview');
            if (processedPreview) {
                processedPreview.src = processedUrl;
                processedPreview.style.display = 'block';
            }

            // 创建下载链接
            const downloadLink = document.getElementById('downloadLink');
            if (downloadLink) {
                downloadLink.href = processedUrl;
                downloadLink.download = `background-removed-${Date.now()}.png`;
                downloadLink.style.display = 'block';
            }

            // 显示结果区域
            const resultArea = document.getElementById('result');
            if (resultArea) {
                resultArea.style.display = 'block';
            }

            // 显示 API 使用信息
            const credits = response.headers.get('X-Credits-Charged');
            if (credits) {
                const creditsInfo = document.getElementById('creditsInfo');
                if (creditsInfo) {
                    creditsInfo.textContent = `本次处理消耗: ${credits} credits`;
                    creditsInfo.style.display = 'block';
                }
            }

        } catch (error) {
            console.error('处理错误:', error);
            this.showError(`处理失败: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const processBtn = document.getElementById('processBtn');
        
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
        
        if (processBtn) {
            processBtn.disabled = show;
        }
    }

    showError(message) {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    hideError() {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    hideResult() {
        const resultArea = document.getElementById('result');
        if (resultArea) {
            resultArea.style.display = 'none';
        }
        
        const downloadLink = document.getElementById('downloadLink');
        if (downloadLink) {
            downloadLink.style.display = 'none';
        }
        
        const creditsInfo = document.getElementById('creditsInfo');
        if (creditsInfo) {
            creditsInfo.style.display = 'none';
        }
    }

    updateUI() {
        // 更新 API Key 状态显示
        const apiStatus = document.getElementById('apiStatus');
        if (apiStatus) {
            if (this.apiKey && this.apiKey !== 'YOUR_API_KEY_HERE') {
                apiStatus.textContent = '✅ API Key 已配置';
                apiStatus.className = 'status-success';
            } else {
                apiStatus.textContent = '⚠️ API Key 未配置';
                apiStatus.className = 'status-warning';
            }
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.backgroundRemover = new BackgroundRemover();
});

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackgroundRemover;
}