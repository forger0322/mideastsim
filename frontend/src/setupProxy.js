// WebSocket 代理配置 - http-proxy-middleware v3
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('🔧 [Proxy] 配置 WebSocket 代理...');
  
  // WebSocket 代理 - 使用 http-proxy-middleware v3 API
  app.use('/ws', createProxyMiddleware({
    target: 'http://127.0.0.1:8080',
    ws: true,
    changeOrigin: true,
    logLevel: 'info',
    onError: function(err, req, res) {
      console.error('❌ [Proxy] WebSocket 错误:', err.message);
    }
  }));
  
  console.log('✅ [Proxy] WebSocket 代理已配置：/ws → http://127.0.0.1:8080');
};
