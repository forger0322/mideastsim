import React, { useState, useEffect, useRef } from 'react';

/**
 * 历史回放组件
 * 功能：
 * - 时间线视图
 * - 事件详情
 * - 状态快照回放
 * - 播放/暂停/快进控制
 */
const HistoryPlayback = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x
  const [currentTime, setCurrentTime] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const playbackInterval = useRef(null);
  
  // 加载历史事件
  useEffect(() => {
    loadHistoryEvents();
  }, []);
  
  const loadHistoryEvents = async () => {
    try {
      const response = await fetch('/api/history/events?limit=50');
      const data = await response.json();
      
      if (data.status === 'ok') {
        setEvents(data.events);
        
        // 如果有事件，设置当前时间为最新事件
        if (data.events.length > 0) {
          setCurrentTime(data.events[0].timestamp);
        }
      }
    } catch (err) {
      setError('加载历史事件失败');
      console.error(err);
    }
  };
  
  // 加载时间线
  const loadTimeline = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const response = await fetch(`/api/history/timeline?start=${yesterday.toISOString()}&end=${now.toISOString()}`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        setTimeline(data.timeline);
      }
    } catch (err) {
      console.error('加载时间线失败:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // 获取某个时间点的快照
  const loadSnapshot = async (timestamp) => {
    try {
      const response = await fetch(`/api/history/snapshot?timestamp=${encodeURIComponent(timestamp)}`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        setSnapshot(data.snapshot);
        return data.snapshot;
      }
    } catch (err) {
      console.error('加载快照失败:', err);
    }
    return null;
  };
  
  // 播放控制
  const togglePlayback = () => {
    if (isPlaying) {
      // 暂停
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
        playbackInterval.current = null;
      }
      setIsPlaying(false);
    } else {
      // 播放
      setIsPlaying(true);
      playbackInterval.current = setInterval(() => {
        // 找到下一个事件
        const currentIndex = events.findIndex(e => e.timestamp === currentTime);
        if (currentIndex >= 0 && currentIndex < events.length - 1) {
          const nextEvent = events[currentIndex + 1];
          setCurrentTime(nextEvent.timestamp);
          setSelectedEvent(nextEvent);
          loadSnapshot(nextEvent.timestamp);
        } else {
          // 播放结束
          togglePlayback();
        }
      }, 2000 / playbackSpeed);
    }
  };
  
  // 快进到指定事件
  const jumpToEvent = (event) => {
    setCurrentTime(event.timestamp);
    setSelectedEvent(event);
    loadSnapshot(event.timestamp);
    
    // 如果在播放，先停止
    if (isPlaying) {
      togglePlayback();
    }
  };
  
  // 获取事件严重程度颜色
  const getSeverityColor = (severity) => {
    if (severity >= 8) return 'bg-red-500';
    if (severity >= 5) return 'bg-orange-500';
    return 'bg-blue-500';
  };
  
  // 获取事件类型图标
  const getEventTypeIcon = (type) => {
    const icons = {
      'declare_war': '⚔️',
      'sanction': '💰',
      'alliance': '🤝',
      'peace': '🕊️',
      'military_exercise': '🎯',
      'statement': '📢',
    };
    return icons[type] || '📌';
  };
  
  return (
    <div className="history-playback p-4">
      <h2 className="text-2xl font-bold mb-4">🎬 历史回放</h2>
      
      {/* 播放控制 */}
      <div className="playback-controls bg-gray-800 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlayback}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-400">速度:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-gray-700 px-2 py-1 rounded"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
            </select>
          </div>
          
          {currentTime && (
            <div className="text-gray-300">
              当前时间：{new Date(currentTime).toLocaleString()}
            </div>
          )}
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 左侧：时间线 */}
        <div className="col-span-2">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">📅 时间线</h3>
            
            {loading ? (
              <div className="text-gray-400">加载中...</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((event, index) => (
                  <div
                    key={event.id}
                    onClick={() => jumpToEvent(event)}
                    className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                      selectedEvent?.id === event.id
                        ? 'bg-blue-900 border-blue-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    } border-l-4 ${getSeverityColor(event.severity)}`}
                  >
                    <span className="text-2xl">{getEventTypeIcon(event.type)}</span>
                    
                    <div className="flex-1">
                      <div className="font-medium">{event.title_zh || event.title}</div>
                      <div className="text-sm text-gray-400">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      严重度：{event.severity}/10
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* 右侧：事件详情 */}
        <div className="col-span-1">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">📋 事件详情</h3>
            
            {selectedEvent ? (
              <div className="space-y-4">
                <div>
                  <div className="text-2xl mb-2">
                    {getEventTypeIcon(selectedEvent.type)}
                  </div>
                  <h4 className="text-xl font-bold">
                    {selectedEvent.title_zh || selectedEvent.title}
                  </h4>
                </div>
                
                <div className="text-sm text-gray-400">
                  <div>时间：{new Date(selectedEvent.timestamp).toLocaleString()}</div>
                  <div>发起者：{selectedEvent.actor_id}</div>
                  {selectedEvent.target_id && (
                    <div>目标：{selectedEvent.target_id}</div>
                  )}
                  <div>严重程度：{selectedEvent.severity}/10</div>
                </div>
                
                {selectedEvent.data && (
                  <div className="bg-gray-700 p-3 rounded text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedEvent.data, null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* 快照信息 */}
                {snapshot && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h5 className="font-semibold mb-2">📊 当时状态</h5>
                    <div className="text-sm text-gray-400">
                      <div>活跃国家：{Object.keys(snapshot.roles || {}).length}</div>
                      <div>关系记录：{Object.keys(snapshot.relations || {}).length}</div>
                      <div>战争数量：{snapshot.wars?.length || 0}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                点击时间线上的事件查看详情
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 时间线索引 */}
      {timeline.length > 0 && (
        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">📊 时间线索引</h3>
          <div className="grid grid-cols-3 gap-4">
            {timeline.map((section, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded">
                <div className="font-medium mb-2">{section.label}</div>
                <div className="text-2xl font-bold text-blue-400">{section.count}</div>
                <div className="text-xs text-gray-500">事件数量</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPlayback;
