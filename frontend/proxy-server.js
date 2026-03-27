const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 9090;
const API_URL = 'http://localhost:8080';
const BUILD_DIR = path.join(__dirname, 'build');

// 获取 MIME 类型
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  const url = req.url;
  
  // API 代理
  if (url.startsWith('/api')) {
    const options = new URL(url, API_URL);
    
    // 构建请求头（只转发存在的头）
    const proxyHeaders = {};
    if (req.headers['content-type']) proxyHeaders['Content-Type'] = req.headers['content-type'];
    if (req.headers['authorization']) proxyHeaders['Authorization'] = req.headers['authorization'];
    if (req.headers['content-length']) proxyHeaders['Content-Length'] = req.headers['content-length'];
    
    const proxyReq = (options.protocol === 'https:' ? https : http).request(options, {
      method: req.method,
      headers: proxyHeaders
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unavailable' }));
    });
    
    req.pipe(proxyReq);
    return;
  }
  
  // 静态文件
  let filePath = path.join(BUILD_DIR, url === '/' ? 'index.html' : url);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA 回退
        fs.readFile(path.join(BUILD_DIR, 'index.html'), (err2, content2) => {
          if (err2) {
            res.writeHead(500);
            res.end('Server error');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content2);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MideastSim frontend on http://0.0.0.0:${PORT}`);
  console.log(`🔄 API proxy to ${API_URL}`);
});
