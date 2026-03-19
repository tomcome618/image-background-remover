#!/usr/bin/env node

// 构建脚本：处理环境变量注入
const fs = require('fs');
const path = require('path');

console.log('🚀 开始构建 Image Background Remover...');

// 创建 dist 目录
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// 读取环境变量
const apiKey = process.env.REMOVE_BG_API_KEY || 'YOUR_API_KEY_HERE';
const nodeEnv = process.env.NODE_ENV || 'production';

console.log(`环境变量: NODE_ENV=${nodeEnv}, API_KEY=${apiKey ? '已设置' : '未设置'}`);

// 处理 public 目录下的文件
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
    console.log('📁 复制 public 目录文件...');
    
    // 复制所有文件
    const copyDir = (src, dest) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath, { recursive: true });
                }
                copyDir(srcPath, destPath);
            } else {
                let content = fs.readFileSync(srcPath, 'utf8');
                
                // 如果是 HTML 文件，注入环境变量
                if (entry.name.endsWith('.html')) {
                    console.log(`处理 HTML 文件: ${entry.name}`);
                    
                    // 注入 API Key
                    content = content.replace(
                        'data-api-key="uRDGpJCnTetH4cwCJSQVUW2L"',
                        `data-api-key="${apiKey}"`
                    );
                    
                    // 注入环境信息
                    content = content.replace(
                        '<div id="apiKeyConfig"',
                        `<div id="apiKeyConfig" data-environment="${nodeEnv}" `
                    );
                    
                    // 更新页面标题
                    if (nodeEnv === 'production') {
                        content = content.replace(
                            '<title>Image Background Remover 🖼️</title>',
                            '<title>Image Background Remover 🖼️ (生产环境)</title>'
                        );
                    }
                }
                
                // 如果是 JS 文件，注入环境变量
                if (entry.name.endsWith('.js')) {
                    console.log(`处理 JS 文件: ${entry.name}`);
                    
                    // 替换 API Key 占位符
                    content = content.replace(
                        /this\.apiKey = 'YOUR_API_KEY_HERE'/g,
                        `this.apiKey = '${apiKey}'`
                    );
                }
                
                fs.writeFileSync(destPath, content);
                console.log(`✅ 复制: ${entry.name}`);
            }
        }
    };
    
    copyDir(publicDir, distDir);
    
    // 复制其他必要文件
    const filesToCopy = ['_redirects', 'static.json'];
    for (const file of filesToCopy) {
        const srcPath = path.join(__dirname, file);
        if (fs.existsSync(srcPath)) {
            const destPath = path.join(distDir, file);
            fs.copyFileSync(srcPath, destPath);
            console.log(`✅ 复制: ${file}`);
        }
    }
    
    console.log('🎉 构建完成！');
    console.log(`输出目录: ${distDir}`);
    console.log(`文件数量: ${fs.readdirSync(distDir).length} 个文件`);
    
    // 显示构建信息
    const indexHtml = path.join(distDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
        const stats = fs.statSync(indexHtml);
        console.log(`首页大小: ${(stats.size / 1024).toFixed(2)} KB`);
    }
    
} else {
    console.log('❌ public 目录不存在，创建默认页面...');
    
    // 创建默认页面
    const defaultHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Background Remover 🖼️</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
            text-align: center;
        }
        h1 { color: #333; }
        .status {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .success { color: green; }
        .info { color: blue; }
        .warning { color: orange; }
    </style>
</head>
<body>
    <h1>🖼️ Image Background Remover</h1>
    <div class="status">
        <p class="success">✅ Cloudflare Pages 部署成功</p>
        <p class="info">环境: ${nodeEnv}</p>
        <p class="${apiKey ? 'success' : 'warning'}">
            ${apiKey ? '✅ API Key 已配置' : '⚠️ API Key 未配置'}
        </p>
        <p>🚀 这是一个静态部署版本</p>
        <p>请检查 public 目录是否存在并包含网站文件</p>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(distDir, 'index.html'), defaultHtml);
    console.log('✅ 创建了默认页面');
}

console.log('\n📋 构建总结:');
console.log(`   环境: ${nodeEnv}`);
console.log(`   API Key: ${apiKey ? '已配置' : '未配置'}`);
console.log(`   输出目录: ${distDir}`);
console.log(`   时间: ${new Date().toLocaleString()}`);