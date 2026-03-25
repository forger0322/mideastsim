const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 9090;
const API_URL = process.env.API_URL || 'http://localhost:8080';

// 添加 CORS 支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 1. 代理 /api 请求到后端（最优先）
app.use('/api', createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log('🔗 代理请求:', req.originalUrl, '->', API_URL + req.originalUrl);
  },
  onError: (err, req, res) => {
    console.error('代理错误:', err.message);
    res.status(502).json({ error: '后端服务不可用' });
  }
}));

// 2. 提供静态文件
app.use(express.static(path.join(__dirname, 'build')));

// 3. 所有其他请求返回 index.html（支持 React Router）
app.get(/^\/.*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 前端服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`🔗 API 代理到：${API_URL}`);
});
