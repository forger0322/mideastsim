// frontend/src/services/websocket.js

class WorldWebSocket {
  constructor() {
    this.ws = null;
    this.publicListeners = [];
    this.privateListeners = [];
    this.actionListeners = [];
    this.reconnectTimer = null;
    
    // 使用环境变量配置（支持本地和远程部署）
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDevelopment = process.env.NODE_ENV === 'development';

    let wsUrl;
    if (isDevelopment) {
      // 开发环境：直接连接后端 8081 端口
      wsUrl = `${protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/ws`;
      console.log(`[WebSocket] DEV 模式，同源连接: ${wsUrl}`);
    } else {
      // 生产环境：优先用环境变量，次选同源
      const customWsHost = process.env.REACT_APP_WS_HOST;
      const customWsPort = process.env.REACT_APP_WS_PORT;

      if (customWsHost) {
        wsUrl = `${protocol}//${customWsHost}${customWsPort && customWsPort !== '80' && customWsPort !== '443' ? ':' + customWsPort : ''}/ws`;
        console.log(`[WebSocket] PROD 模式，使用环境变量: ${wsUrl}`);
      } else {
        wsUrl = `${protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/ws`;
        console.log(`[WebSocket] PROD 模式，使用同源: ${wsUrl}`);
      }
    }

    this.url = wsUrl;
  }

  connect(agentId = 'unknown') {
    const url = agentId !== 'unknown' ? `${this.url}?agentId=${agentId}` : this.url;
    console.log('🔌 [WebSocket] 尝试连接:', url);
    console.log('🔌 [WebSocket] agentId:', agentId);
    this.ws = new WebSocket(url);

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
