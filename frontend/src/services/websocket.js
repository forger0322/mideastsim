// frontend/src/services/websocket.js

class WorldWebSocket {
  constructor() {
    this.ws = null;
    this.publicListeners = [];
    this.privateListeners = [];
    this.actionListeners = [];
    // 使用环境变量配置（支持本地和远程部署）
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // 开发环境：用 setupProxy 代理（/ws → 8080）
    // 生产环境：优先用环境变量，其次用同源
    const isDevelopment = process.env.NODE_ENV === 'development';

    let wsUrl;
    if (isDevelopment) {
      // 开发环境：通过 setupProxy 代理（localhost:9090/ws）
      // setupProxy 会自动转到 http://127.0.0.1:8080
      wsUrl = `${protocol}//localhost${window.location.port ? ':' + window.location.port : ''}/ws`;
      console.log(`[WebSocket] DEV 模式，使用本地代理: ${wsUrl}`);
    } else {
      // 生产环境：优先用环境变量，次选同源
      const customWsHost = process.env.REACT_APP_WS_HOST;
      const customWsPort = process.env.REACT_APP_WS_PORT;

      if (customWsHost) {
        // 用环境变量指定的远程 WS 地址
        wsUrl = `${protocol}//${customWsHost}${customWsPort && customWsPort !== '80' && customWsPort !== '443' ? ':' + customWsPort : ''}/ws`;
        console.log(`[WebSocket] PROD 模式，使用环境变量: ${wsUrl}`);
      } else {
        // 自动用当前页面的域名端口，路径映射到 /ws
        // 假设前端和后端都通过同一个 Nginx 代理，前端 9090 → Nginx 代理 /ws 到后端 8080
        wsUrl = `${protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/ws`;
        console.log(`[WebSocket] PROD 模式，使用同源: ${wsUrl}`);
      }
    }

    this.url = wsUrl;
    this.reconnectTimer = null;
    this.ws.onopen = () => {
      console.log('✅ [WebSocket] 连接成功！');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'public') {
          this.publicListeners.forEach(cb => cb(msg));
        } else if (msg.type === 'private') {
          this.privateListeners.forEach(cb => cb(msg));
        } else if (msg.type === 'action_result') {
          this.actionListeners.forEach(cb => cb(msg));
        } else if (msg.type === 'subscribed') {
          // 订阅确认
        } else if (msg.type === 'world_message' || msg.type === 'public_statement' || msg.type === 'diplomatic_statement') {
          // 世界频道声明消息，作为公共消息处理
          this.publicListeners.forEach(cb => cb(msg));
        }
      } catch (err) {
        console.error('❌ [WebSocket] 解析消息失败:', err);
      }
    };

    const handleClose = (event) => {
      console.log('🔌 [WebSocket] 连接关闭:', event.code, event.reason);
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(() => this.connect(agentId), 5000);
    };

    this.ws.onclose = handleClose;

    this.ws.onerror = (error) => {
      console.error('❌ [WebSocket] 错误:', error);
      console.error('❌ [WebSocket] readyState:', this.ws?.readyState);
      // 发生错误时强制重连
      if (this.ws) {
        this.ws.close();
      }
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // 清空所有监听器，防止重复注册
    this.publicListeners = [];
    this.privateListeners = [];
    this.actionListeners = [];
  }

  onPublicMessage(callback) {
    this.publicListeners.push(callback);
  }

  onPrivateMessage(callback) {
    this.privateListeners.push(callback);
  }

  onActionResult(callback) {
    // 监听行动结果广播
    this.actionListeners.push(callback);
  }

  subscribe(channels) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channels: Array.isArray(channels) ? channels : [channels]
      }));
    }
  }

  unsubscribe(channels) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        channels: Array.isArray(channels) ? channels : [channels]
      }));
    }
  }

  sendPublic(content) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({
        type: 'public',
        content
      });
      this.ws.send(msg);
    }
  }

  sendPrivate(channel, content) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'private',
        channel,
        content
      }));
    }
  }
}

export default new WorldWebSocket();
