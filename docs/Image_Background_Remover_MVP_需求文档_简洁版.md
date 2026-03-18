# Image Background Remover - MVP需求文档

## 项目概述
- **项目**: 智能背景移除工具
- **目标**: 7天内上线最小可行产品
- **架构**: Cloudflare Pages + Workers + Remove.bg API
- **成本**: ~$10/月 (Remove.bg API)

## 核心功能 (MVP)
### 1. 图片上传
- 拖拽/点击上传 (JPG/PNG/WebP)
- 5MB大小限制
- 实时预览

### 2. 背景移除
- 调用Remove.bg API
- 30秒超时处理
- 错误重试机制

### 3. 结果处理
- 左右对比视图
- 一键下载PNG
- 响应式设计

## 技术栈
### 前端 (Cloudflare Pages)
- React 18 + TypeScript + Vite
- Tailwind CSS + react-dropzone
- 部署: Cloudflare Pages

### 后端 (Cloudflare Workers)
- API代理调用Remove.bg
- 无状态，图片仅内存处理
- 部署: Cloudflare Workers

## 开发计划 (7天)
### Day 1-2: 基础搭建
- 项目初始化
- Cloudflare配置
- Remove.bg API注册

### Day 3-5: 核心功能
- 图片上传组件
- API集成
- 结果展示

### Day 6-7: 优化部署
- 测试优化
- 生产部署
- 监控配置

## 成本估算
| 项目 | 成本 | 说明 |
|------|------|------|
| Remove.bg API | $9.99/月 | 500张/月 |
| Cloudflare | $0 | 免费套餐 |
| 域名 | $10/年 | 可选 |
| **总计** | **~$10/月** | 按需使用 |

## 成功标准
1. 用户能上传并移除背景
2. 处理时间 < 10秒
3. 移动端友好
4. 零服务器运维

## 独特卖点
1. **极简体验**: 三步完成
2. **专业效果**: Remove.bg AI技术
3. **完全免费**: 免费试用
4. **隐私安全**: 图片不存储
5. **全球访问**: Cloudflare CDN

---
*文档版本: MVP 1.0*
*创建日期: 2026年3月17日*