# Google OAuth 登录集成部署指南

## 已完成的工作

✅ 已安装所需依赖包
✅ 已创建认证模块 (auth.js)
✅ 已创建支持Google OAuth的服务器 (server-google-oauth.js)
✅ 已配置环境变量模板 (.env)
✅ 服务器已成功启动并运行

## 当前状态

服务器正在运行：
- 地址: http://43.162.82.13:3000
- 本地: http://localhost:3000
- 健康检查: http://43.162.82.13:3000/health

## 需要你完成的配置

### 1. 获取Google OAuth凭据

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 "Google Identity Services API"
4. 创建 OAuth 2.0 客户端ID
5. 配置授权重定向URI：
   ```
   http://43.162.82.13:3000/auth/google/callback
   ```

### 2. 更新环境变量

编辑 `.env` 文件，替换以下值：

```bash
# Google OAuth 2.0 配置
GOOGLE_CLIENT_ID=你的真实Google Client ID
GOOGLE_CLIENT_SECRET=你的真实Google Client Secret
GOOGLE_CALLBACK_URL=http://43.162.82.13:3000/auth/google/callback

# 会话配置 - 生成一个随机字符串
SESSION_SECRET=$(openssl rand -base64 32)

# Remove.bg API
REMOVE_BG_API_KEY=uRDGpJCnTetH4cwCJSQVUW2L
```

### 3. 生成会话密钥

运行以下命令生成安全的会话密钥：

```bash
openssl rand -base64 32
```

将生成的字符串复制到 `.env` 文件的 `SESSION_SECRET` 中。

## 测试流程

### 1. 启动服务器

```bash
cd /root/.openclaw/workspace/image-background-remover
node server-google-oauth.js
```

### 2. 测试访问

1. 访问主页: http://43.162.82.13:3000/
   - 会自动重定向到登录页面
   
2. 登录页面: http://43.162.82.13:3000/login
   - 显示Google登录按钮
   
3. 点击"使用 Google 账号登录"
   - 重定向到Google认证页面
   - 授权后返回应用主页
   
4. 主页显示用户信息
   - 显示用户头像、姓名、邮箱
   - 显示登出按钮
   
5. 使用图片处理功能
   - 上传图片
   - 处理背景移除
   - 下载结果

## 文件说明

### 核心文件
- `server-google-oauth.js` - 主服务器文件，包含Google OAuth集成
- `auth.js` - 认证模块，处理Google OAuth策略
- `.env` - 环境变量配置文件
- `.env.example` - 环境变量示例文件

### 辅助文件
- `README-google-oauth.md` - 详细集成指南
- `DEPLOYMENT-GUIDE.md` - 本部署指南

## 安全注意事项

### 生产环境建议
1. **使用HTTPS**: 重定向URI应该使用HTTPS
2. **会话安全**: 设置 `secure: true` 和 `httpOnly: true`
3. **环境变量**: 不要将敏感信息硬编码在代码中
4. **防火墙**: 确保端口3000安全
5. **日志**: 监控认证日志

### 会话配置
当前会话配置：
- 有效期: 24小时
- HTTP Only: 是
- Secure Cookie: 否 (开发环境)
- 在生产环境应设置为 `secure: true`

## 故障排除

### 常见问题

1. **Google OAuth 错误 "redirect_uri_mismatch"**
   - 检查Google Cloud Console中的重定向URI配置
   - 确保与 `.env` 中的 `GOOGLE_CALLBACK_URL` 一致

2. **会话不持久**
   - 检查 `SESSION_SECRET` 是否正确设置
   - 确保浏览器接受cookies

3. **认证后无法访问主页**
   - 检查用户信息序列化/反序列化
   - 查看服务器日志

4. **Remove.bg API 错误**
   - 检查 `REMOVE_BG_API_KEY` 是否正确
   - 确认API额度是否充足

### 日志检查
服务器启动时会显示关键信息：
- Remove.bg API 初始化状态
- Google OAuth 配置状态
- 服务器监听地址

## 扩展功能建议

### 短期改进
1. **用户数据库**: 保存用户信息到数据库
2. **处理历史**: 记录用户的图片处理记录
3. **API限制**: 根据用户限制API调用次数

### 长期改进
1. **多提供商**: 支持GitHub、Facebook等其他OAuth
2. **邮箱验证**: 添加邮箱验证功能
3. **用户管理**: 用户资料编辑和管理
4. **统计分析**: 用户使用统计和分析

## 技术支持

如有问题，请检查：
1. 服务器日志输出
2. 浏览器开发者工具控制台
3. 网络请求状态
4. 环境变量配置

服务器日志会显示详细的错误信息和状态，有助于诊断问题。