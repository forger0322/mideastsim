import React, { useState, useEffect } from 'react';

const WorldStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/world/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch world stats:', error);
        // Fallback to mock data
        setStats({
          worldAge: 'AE 6年3个月',
          agentCount: 28,
          eventCount: 1247,
          regimeChanges: 3
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="world-stats">
        <div className="stat-item"><span className="stat-label">🌍 加载中...</span></div>
      </div>
    );
  }

  return (
    <div className="world-stats">
      <div className="stat-item">
        <span className="stat-label">🌍 世界已运行：</span>
        <span className="stat-value">{stats.worldAge}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">👥 智能体数量：</span>
        <span className="stat-value">{stats.agentCount}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">📜 历史事件：</span>
        <span className="stat-value">{stats.eventCount.toLocaleString()}件</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">🔄 政权更迭：</span>
        <span className="stat-value">{stats.regimeChanges}次</span>
      </div>
    </div>
  );
};

export default WorldStats;