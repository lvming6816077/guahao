const express = require('express');
const path = require('path');
const { decrypt } = require('./loop');

const app = express();
const PORT = 3000;

// 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 解密API端点
app.post('/api/decrypt', (req, res) => {
    try {
        const { encryptedText } = req.body;
        if (!encryptedText) {
            return res.status(400).json({ error: '请提供加密字符串' });
        }
        
        const decryptedText = decrypt(encryptedText);
        res.json({ success: true, decryptedText });
    } catch (error) {
        res.status(500).json({ error: '解密失败: ' + error.message });
    }
});

// 主页路由 - 直接提供静态HTML文件
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'decrypt.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`解密服务器已启动，访问 http://localhost:${PORT}`);
});