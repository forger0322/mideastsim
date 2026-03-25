import React, { useState, useEffect } from 'react';

/**
 * 连接测试组件
 * 用于诊断 API 和 WebSocket 连接问题
 */
const ConnectionTest = () => {
  const [apiStatus, setApiStatus] = useState('testing');
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [logs, setLogs] = useState([]);
  const [apiData, setApiData] = useState(null);
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };
  
  // 测试 API 连接
  const testAPI = async () => {
    setApiStatus('testing');
    addLog('🔄 测试 API 连接...', 'info');
    
    try {
      const response = await fetch('/api/world/state');
      
      if (response.ok) {
        const data = await response.json();
        setApiStatus('connected');
        setApiData(data);
        addLog('✅ API 连接成功！', 'success');
        addLog(`📊 时间：${data.timestamp}`, 'info');
      } else {
        setApiStatus('error');
        addLog(`❌ API 错误：HTTP ${response.status}`, 'error');
      }
    } catch (error) {
      setApiStatus('error');
      addLog(`❌ API 错误：${error.message}`, 'error');
    }
  };
  
  // 测试 WebSocket 连接
  const testWebSocket = () => {
    setWsStatus('connecting');
    addLog('🔄 测试 WebSocket 连接...', 'info');
    
    const wsHost = process.env.REACT_APP_WS_HOST || 'localhost';
    const wsPort = process.env.REACT_APP_WS_PORT || '8080';
    const wsUrl = `ws://${wsHost}:${wsPort}/ws`;
    
    addLog(`📍 连接地址：${wsUrl}`, 'info');
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setWsStatus('connected');
      addLog('✅ WebSocket 连接成功！', 'success');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(`📨 收到消息：${data.type}`, 'info');
      } catch (err) {
        addLog(`📨 收到原始消息：${event.data}`, 'info');
      }
    };
    
    ws.onerror = (error) => {
      setWsStatus('error');
      addLog(`❌ WebSocket 错误`, 'error');
    };
    
    ws.onclose = (event) => {
      if (wsStatus === 'connecting') {
        setWsStatus('error');
        addLog(`❌ WebSocket 连接失败：${event.code}`, 'error');
      } else if (wsStatus === 'connected') {
        setWsStatus('disconnected');
        addLog(`🔌 WebSocket 断开连接`, 'warning');
      }
    };
  };
  
  // 组件加载时自动测试
  useEffect(() => {
    testAPI();
  }, []);
  
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🔧 连接测试</h2>
      
      {/* API 连接状态 */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">📡 API 连接</h3>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${
            apiStatus === 'connected' ? 'bg-green-500' :
            apiStatus === 'testing' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`} />
          <span className="text-white">
            {apiStatus === 'connected' ? '已连接' :
             apiStatus === 'testing' ? '测试中...' :
             '连接失败'}
          </span>
        </div>
        
        <button
          onClick={testAPI}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          🔄 重新测试
        </button>
        
        {apiData && (
          <div className="mt-4 p-3 bg-gray-700 rounded text-sm">
            <div>时间：{apiData.timestamp}</div>
            <div>油价：${apiData.market?.oil}</div>
            <div>黄金：${apiData.market?.gold}</div>
            <div>BTC: ${apiData.market?.btc}</div>
          </div>
        )}
      </div>
      
      {/* WebSocket 连接状态 */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">📶 WebSocket 连接</h3>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${
            wsStatus === 'connected' ? 'bg-green-500' :
            wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            wsStatus === 'error' ? 'bg-red-500' :
            'bg-gray-500'
          }`} />
          <span className="text-white">
            {wsStatus === 'connected' ? '已连接' :
             wsStatus === 'connecting' ? '连接中...' :
             wsStatus === 'error' ? '连接失败' :
             '未连接'}
          </span>
        </div>
        
        <button
          onClick={testWebSocket}
          disabled={wsStatus === 'connecting'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50"
        >
          🔄 测试连接
        </button>
      </div>
      
      {/* 日志 */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">📝 连接日志</h3>
        <div className="bg-gray-900 rounded p-3 h-64 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500">暂无日志</div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`mb-1 ${
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  'text-gray-300'
                }`}
              >
                [{log.timestamp}] {log.message}
              </div>
            ))
          )}
        </div>
        
        <button
          onClick={() => setLogs([])}
          className="mt-3 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
        >
          🗑️ 清空日志
        </button>
      </div>
      
      {/* 环境信息 */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">ℹ️ 环境信息</h3>
        <div className="text-sm text-gray-400 space-y-1">
          <div>主机名：{window.location.hostname}</div>
          <div>端口：{window.location.port}</div>
          <div>协议：{window.location.protocol}</div>
          <div>API 主机：{process.env.REACT_APP_WS_HOST || 'localhost'}</div>
          <div>WS 端口：{process.env.REACT_APP_WS_PORT || '8080'}</div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTest;
