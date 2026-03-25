// frontend/src/services/websocket.js

class WorldWebSocket {
  constructor() {
    this.ws = null;
    this.publicListeners = [];
    this.privateListeners = [];
    this.actionListeners = [];
    // 直连后端 8080 端口（3 月 20 日测试成功的配置）
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.hostname}:8080/ws`;
    this.reconnectTimer = null;
  }

  connect(agentId = 'unknown') {
    // 清空旧监听器，防止 StrictMode 重复注册
    this.publicListeners = [];
    this.privateListeners = [];
    this.actionListeners = [];
    
    const url = agentId !== 'unknown' ? `${this.url}?agentId=${agentId}` : this.url;
    console.log('🔌 [WebSocket] 尝试连接:', url);
    console.log('🔌 [WebSocket] agentId:', agentId);
    console.log('🔌 [WebSocket] 环境变量:', { wsHost: process.env.REACT_APP_WS_HOST, wsPort: process.env.REACT_APP_WS_PORT });
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
    
    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(agentId), 5000);
    };
    
    this.ws.onerror = (error) => {
      console.error('❌ [WebSocket] 错误:', error);
      console.error('❌ [WebSocket] readyState:', this.ws?.readyState);
    };
    
    this.ws.onclose = (event) => {
      console.log('🔌 [WebSocket] 连接关闭:', event.code, event.reason);
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
