// WebSocket 代理配置 - http-proxy-middleware v3（开发环境）
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  console.log('🔧 [Proxy] 配置 WebSocket 代理...');

  // WebSocket 代理 - 使用 http-proxy-middleware v3 API
  // 在开发环境中，localhost:9090/ws 代理到 http://127.0.0.1:8081
  app.use('/ws', createProxyMiddleware({
    target: 'http://127.0.0.1:8081',
    ws: true,
    changeOrigin: true,
    logLevel: 'info',
    pathRewrite: {
      '^/ws': '/ws', // 保持路径不变
    },
    onProxyReq: function (proxyReq, req, res) {
      console.log(`[Proxy] WS 请求: ${req.method} ${req.path}`);
      // 确保设置正确的头
      proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
      proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
    },
    onProxyRes: function (proxyRes, req, res) {
      console.log(`[Proxy] WS 响应: ${proxyRes.statusCode}`);
    },
    onError: function (err, req, res) {
      console.error('❌ [Proxy] WebSocket 错误:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'WebSocket proxy error: ' + err.message }));
    },
    // 性能优化
    ws: true,
    timeout: 60000, // 60 秒超时
  }));

  console.log('✅ [Proxy] WebSocket 代理已配置：/ws → http://127.0.0.1:8081');

  // API 代理
  app.use('/api', createProxyMiddleware({
    target: 'http://127.0.0.1:8081',
    changeOrigin: true,
    logLevel: 'info',
    pathRewrite: {
      '^/api': '/api', // 保持 API 路径不变
    },
  }));

  console.log('✅ [Proxy] API 代理已配置：/api → http://127.0.0.1:8081');
};
