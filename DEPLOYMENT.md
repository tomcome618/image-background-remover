# Cloudflare Pages 部署指南

## 部署前提

### 1. 需要的 Token
- **GitHub Personal Access Token**
  - 权限: `repo` (完全控制)
  - 获取: https://github.com/settings/tokens
- **Cloudflare API Token** (可选)
  - 权限: `Cloudflare Pages:Edit`
  - 获取: https://dash.cloudflare.com/profile/api-tokens

### 2. Cloudflare 账户信息
- **Account ID**: 从 Cloudflare 仪表板获取
- **Project Name**: `image-background-remover`

## 部署步骤

### 方法一: 通过 Cloudflare 仪表板 (推荐)

1. **登录 Cloudflare Dashboard**
   - 访问: https://dash.cloudflare.com/
   - 进入 "Workers & Pages" 部分

2. **创建新项目**
   - 点击 "Create application" → "Pages" → "Connect to Git"
   - 选择 GitHub 作为 Git 提供商
   - 授权 Cloudflare 访问 GitHub

3. **选择仓库**
   - 选择: `tomcome618/image-background-remover`
   - 分支: `main` 或 `master`

4. **配置构建设置**
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: (留空，使用仓库根目录)

5. **环境变量** (重要)
   - 点击 "Environment variables"
   - 添加: `REMOVE_BG_API_KEY` = `uRDGpJCnTetH4cwCJSQVUW2L`
   - 选择: "Encrypted" 和 "Available in Production"

6. **开始部署**
   - 点击 "Save and Deploy"
   - 等待构建完成

### 方法二: 通过 GitHub Actions (自动)

1. **配置 GitHub Secrets**
   - 进入仓库 Settings → Secrets and variables → Actions
   - 添加以下 secrets:
     - `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
     - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID
     - `REMOVE_BG_API_KEY`: Remove.bg API Key

2. **触发部署**
   - 推送代码到 main/master 分支
   - 或手动运行 GitHub Actions

## 项目结构说明

### 构建输出
```
dist/                    # Cloudflare Pages 服务目录
├── index.html          # 主页面
├── style.css           # 样式文件
├── script.js           # 脚本文件
├── _redirects          # 重定向规则
└── static.json         # 静态配置
```

### 配置文件
- `.github/workflows/` - GitHub Actions 工作流
- `package.json` - 构建脚本配置
- `_redirects` - Cloudflare Pages 重定向
- `static.json` - 静态文件配置

## 环境变量

### 生产环境变量
```env
REMOVE_BG_API_KEY=uRDGpJCnTetH4cwCJSQVUW2L
NODE_ENV=production
```

### 开发环境变量
```env
REMOVE_BG_API_KEY=你的测试API_KEY
NODE_ENV=development
```

## 自定义域名

### 添加自定义域名
1. 进入 Cloudflare Pages 项目设置
2. 点击 "Custom domains"
3. 添加你的域名
4. 按照提示配置 DNS

### SSL/TLS 证书
- Cloudflare 自动提供免费 SSL
- 证书自动续期
- 支持 HTTP/2 和 HTTP/3

## 监控和日志

### 访问日志
- Cloudflare Analytics: 实时流量统计
- Web Analytics: 页面访问分析
- Error Tracking: 错误监控

### 构建日志
- 每次部署的完整构建日志
- 构建成功/失败通知
- 部署历史记录

## 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 本地测试构建
npm run build

# 检查 dist 目录
ls -la dist/
```

#### 2. API 调用失败
- 检查环境变量是否正确设置
- 验证 Remove.bg API Key 是否有效
- 检查网络连接

#### 3. 页面无法访问
- 检查 Cloudflare Pages 部署状态
- 验证自定义域名配置
- 检查 DNS 设置

#### 4. GitHub Actions 失败
- 检查 GitHub Secrets 配置
- 查看 Actions 日志详情
- 验证权限设置

## 性能优化

### 缓存策略
- 静态资源: 长期缓存
- API 响应: 适当缓存
- 图片资源: 优化压缩

### CDN 优势
- 全球边缘网络
- 自动压缩和优化
- DDoS 防护
- 免费 SSL

## 成本估算

### 免费套餐包含
- ✅ 无限请求
- ✅ 无限带宽
- ✅ 自定义域名
- ✅ 自动 SSL
- ✅ 全球 CDN
- ✅ 构建分钟: 500分钟/月
- ✅ 部署次数: 无限

### 可能需要付费
- ❌ 额外的构建分钟
- ❌ 高级功能
- ❌ 优先支持

## 支持资源

### 官方文档
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Remove.bg API Docs](https://www.remove.bg/api)

### 社区支持
- [Cloudflare Community](https://community.cloudflare.com/)
- [GitHub Discussions](https://github.com/tomcome618/image-background-remover/discussions)

---
**最后更新**: 2026-03-19
**部署状态**: 待配置
**文档版本**: 1.0