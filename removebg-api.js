const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

class RemoveBgAPI {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.REMOVE_BG_API_KEY;
    this.baseUrl = 'https://api.remove.bg/v1.0';
    
    if (!this.apiKey) {
      throw new Error('Remove.bg API Key 未配置。请设置 REMOVE_BG_API_KEY 环境变量。');
    }
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Api-Key': this.apiKey,
        'User-Agent': 'ImageBackgroundRemover/1.0.0'
      },
      timeout: 30000
    });
  }
  
  /**
   * 移除图片背景
   * @param {string} inputPath - 输入图片路径
   * @param {string} outputPath - 输出图片路径
   * @param {object} options - 选项
   * @returns {Promise<object>} 处理结果
   */
  async removeBackground(inputPath, outputPath, options = {}) {
    try {
      console.log(`开始处理图片: ${inputPath}`);
      
      // 验证文件存在
      if (!fs.existsSync(inputPath)) {
        throw new Error(`输入文件不存在: ${inputPath}`);
      }
      
      // 准备表单数据
      const formData = new FormData();
      formData.append('image_file', fs.createReadStream(inputPath));
      
      // 添加选项
      if (options.size) {
        formData.append('size', options.size); // auto, preview, full, 4k
      }
      
      if (options.type) {
        formData.append('type', options.type); // auto, person, product, car
      }
      
      if (options.format) {
        formData.append('format', options.format); // png, jpg, zip
      }
      
      if (options.bg_color) {
        formData.append('bg_color', options.bg_color); // 背景颜色
      }
      
      if (options.bg_image_url) {
        formData.append('bg_image_url', options.bg_image_url); // 背景图片URL
      }
      
      // 发送请求
      const response = await this.client.post('/removebg', formData, {
        headers: formData.getHeaders(),
        responseType: 'arraybuffer'
      });
      
      // 保存结果
      fs.writeFileSync(outputPath, response.data);
      
      console.log(`背景移除完成: ${outputPath}`);
      
      return {
        success: true,
        outputPath: outputPath,
        fileSize: fs.statSync(outputPath).size,
        contentType: response.headers['content-type'],
        credits: response.headers['x-credits-charged'] || '未知'
      };
      
    } catch (error) {
      console.error('Remove.bg API 错误:', error.message);
      
      // 解析错误响应
      let errorMessage = '背景移除失败';
      if (error.response) {
        try {
          const errorData = JSON.parse(error.response.data.toString());
          errorMessage = errorData.errors ? errorData.errors[0].title : errorMessage;
        } catch (e) {
          errorMessage = `API 错误: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = '网络请求失败，请检查网络连接';
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * 获取账户信息
   * @returns {Promise<object>} 账户信息
   */
  async getAccountInfo() {
    try {
      const response = await this.client.get('/account');
      return {
        success: true,
        data: response.data.data.attributes
      };
    } catch (error) {
      console.error('获取账户信息失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 验证 API Key
   * @returns {Promise<boolean>} 是否有效
   */
  async validateApiKey() {
    try {
      await this.getAccountInfo();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = RemoveBgAPI;