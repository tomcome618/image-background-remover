#!/bin/bash
# 部署 Cloudflare Workers API

set -e

echo "🚀 开始部署 Cloudflare Workers..."

cd "$(dirname "$0")"

# 1. 检查登录状态
echo "📋 检查 Cloudflare 登录状态..."
wrangler whoami || { echo "❌ 请先运行 wrangler login"; exit 1; }

# 2. 部署 Worker
echo "📤 部署 Worker..."
wrangler deploy

# 3. 获取部署 URL
echo "✅ 部署完成!"
echo "📝 API 端点: https://image-background-eraser-api.<your-subdomain>.workers.dev"

echo ""
echo "后续步骤:"
echo "1. 在 Cloudflare Dashboard 创建 D1 数据库"
echo "2. 运行 schema.sql 初始化表结构"
echo "3. 更新前端 API_BASE_URL"
