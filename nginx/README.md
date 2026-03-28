# Nginx 部署指南 (Docker 环境)

## 当前环境

| 组件 | 位置 | 端口 |
|------|------|------|
| Docker 容器 IP | - | 172.18.0.2 |
| 前端 (React) | 容器内 | 9090 |
| 后端 (Go) | 容器内 | 8081 |
| 主机 Nginx | 宿主机 | 80 |

## 1. 在主机上安装 Nginx

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y nginx

# 检查 Nginx 状态
sudo systemctl status nginx
```

## 2. 配置 Nginx

### 复制配置文件到主机

```bash
# 将配置文件复制到主机（从容器外执行）
# 或者手动创建文件

sudo cp nginx.conf /etc/nginx/sites-available/clawdbotgame
sudo ln -s /etc/nginx/sites-available/clawdbotgame /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

### 或者手动创建配置

```bash
sudo nano /etc/nginx/sites-available/clawdbotgame
```

粘贴 `nginx.conf` 的内容。

## 3. 测试并重启 Nginx

```bash
# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 检查状态
sudo systemctl status nginx
```

## 4. 配置防火墙

```bash
# 开放 HTTP 端口
sudo ufw allow 80/tcp

# 如果需要 HTTPS
sudo ufw allow 443/tcp

# 检查状态
sudo ufw status
```

## 5. 验证部署

访问 http://www.clawdbotgame.com

应该看到：
- ✅ 前端页面正常加载
- ✅ API 调用正常工作
- ✅ WebSocket 连接成功

## 6. 可选：配置 HTTPS (推荐)

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d www.clawdbotgame.com -d clawdbotgame.com

# 自动续期测试
sudo certbot renew --dry-run
```

## 网络架构

```
用户浏览器
    ↓
http://www.clawdbotgame.com:80
    ↓
主机 Nginx
    ↓ (反向代理)
    ├─ / → 172.18.0.2:9090 (前端 React)
    ├─ /api/* → 172.18.0.2:8081 (后端 API)
    └─ /ws → 172.18.0.2:8081 (WebSocket)
```

## 故障排查

### 1. 检查容器 IP 是否变化

```bash
# 在容器内执行
hostname -I
# 或
ip addr show eth0 | grep "inet "
```

如果 IP 变化，更新 nginx.conf 中的 172.18.0.2

### 2. 测试从主机访问容器

```bash
# 在主机上执行
curl http://172.18.0.2:8081/api/world/state
curl http://172.18.0.2:9090
```

如果无法访问，可能需要：
- 检查 Docker 网络配置
- 确保容器和主机在同一网络

### 3. 查看 Nginx 日志

```bash
sudo tail -f /var/log/nginx/clawdbotgame_error.log
sudo tail -f /var/log/nginx/clawdbotgame_access.log
```

### 4. 查看容器内服务日志

```bash
# 后端
tail -f /home/node/.openclaw/workspace/mideastsim/backend/mideastsim.log

# 前端
tail -f /home/node/.openclaw/workspace/mideastsim/frontend/frontend.log
```

## 当前服务状态

| 服务 | 端口 | 状态 |
|------|------|------|
| 后端 (Go) | 8081 | ✅ 运行中 |
| 前端 (React) | 9090 | ✅ 运行中 |
