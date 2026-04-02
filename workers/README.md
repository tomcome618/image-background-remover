# Cloudflare Workers 部署指南

## 前置要求

1. 安装 Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. 登录 Cloudflare:
   ```bash
   wrangler login
   ```

## 部署步骤

### 1. 创建 D1 数据库

```bash
cd workers

# 创建数据库
wrangler d1 create image-background-eraser

# 会返回 database_id，填入 wrangler.toml
```

### 2. 初始化数据库表

```bash
# 本地测试
wrangler d1 execute image-background-eraser --local --file=./schema.sql

# 推送到生产
wrangler d1 execute image-background-eraser --remote --file=./schema.sql
```

### 3. 配置环境变量

编辑 `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "image-background-eraser"
database_id = "你复制的database_id"
```

### 4. 部署 Worker

```bash
wrangler deploy
```

### 5. 获取 API URL

部署后会返回:
```
https://image-background-eraser-api.xxx.workers.dev
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/user/register` | POST | 注册/绑定Google用户 |
| `/api/user/me` | GET | 获取当前用户信息 |
| `/api/user/credits` | GET | 获取积分余额和交易记录 |
| `/api/user/deduct` | POST | 扣减积分 |
| `/api/user/add` | POST | 增加积分（充值） |
| `/api/pricing` | GET | 获取定价方案 |

## 前端配置

在 `public/index.html` 中配置 API_BASE_URL:
```javascript
const API_BASE_URL = 'https://image-background-eraser-api.xxx.workers.dev';
```

## 本地开发

```bash
# 启动本地 Worker
wrangler dev

# 本地 D1 操作
wrangler d1 execute image-background-eraser --local --command="SELECT * FROM users"
```
