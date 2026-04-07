import React, { useState, useEffect } from 'react';

const AgentMemoryModal = ({ leader, onClose }) => {
  const [memoryEvents, setMemoryEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (leader) {
      // Fetch memory events from P0 API
      fetch(`/api/agent/${leader.id}/memory`)
        .then(response => response.json())
        .then(data => {
          setMemoryEvents(data.memory_events || []);
          setLoading(false);
        })
        .catch(error => {
          console.error('Failed to fetch memory events:', error);
          // Fallback to mock data
          const mockMemories = {
            'trump': [
              { date: '2月28日', content: '下令空袭德黑兰' },
              { date: '3月1日', content: '威胁伊朗"新领袖需我批准"' },
              { date: '3月5日', content: '考虑派特种部队' },
              { date: '3月8日', content: '与内塔尼亚胡通电话' },
              { date: '今天', content: '召开国安会议' }
            ],
            'khamenei': [
              { date: '2月27日', content: '发表强硬讲话' },
              { date: '2月28日', content: '下令加强防空' }
            ],
            'mbin': [
              { date: '3月1日', content: '呼吁克制' },
              { date: '3月4日', content: '主持紧急会议' },
              { date: '3月7日', content: '参加欧佩克会议' }
            ]
          };
          setMemoryEvents(mockMemories[leader.id] || []);
          setLoading(false);
        });
    }
  }, [leader]);

  if (!leader) return null;

  return (
    <div className="agent-memory-modal-overlay" onClick={onClose}>
      <div className="agent-memory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="agent-memory-header">
          <h3>{leader.name}的记忆</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <div className="agent-memory-content">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <>
              <div className="memory-divider">────────────────────</div>
              {memoryEvents.map((event, index) => (
                <div key={index} className="memory-event">
                  <span className="memory-date">[{event.date}]</span>
                  <span className="memory-content">{event.content}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentMemoryModal;