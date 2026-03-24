#!/usr/bin/env node

// 简单的构建脚本：只复制文件，不修改内容
const fs = require('fs');
const path = require('path');

console.log('🚀 开始构建 Image Background Remover...');

// 创建 dist 目录
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// 读取环境变量
const apiKey = process.env.REMOVE_BG_API_KEY || 'uRDGpJCnTetH4cwCJSQVUW2L';
const nodeEnv = process.env.NODE_ENV || 'production';

console.log(`环境变量: NODE_ENV=${nodeEnv}, API_KEY=${apiKey ? '已设置' : '未设置'}`);

// 复制 public 目录
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
    console.log('📁 复制 public 目录文件...');
    
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
                fs.copyFileSync(srcPath, destPath);
                console.log(`✅ 复制: ${entry.name}`);
            }
        }
    };
    
    copyDir(publicDir, distDir);
    console.log('🎉 构建完成！');
} else {
    console.error('❌ public 目录不存在！');
    process.exit(1);
}
