import React, { useState, useEffect } from 'react';

const AbsenceBrief = ({ onClose }) => {
  const [showBrief, setShowBrief] = useState(false);
  const [briefData, setBriefData] = useState(null);
  
  useEffect(() => {
    // Check if user has been away (using localStorage)
    const lastVisit = localStorage.getItem('lastVisit');
    const now = new Date();
    
    if (lastVisit) {
      const lastVisitDate = new Date(lastVisit);
      const daysAway = Math.floor((now - lastVisitDate) / (1000 * 60 * 60 * 24));
      
      if (daysAway >= 1) {
        // Fetch absence brief from API (using relative path to leverage proxy)
        fetch('/api/user/absence-brief')
          .then(response => response.json())
          .then(data => {
            setBriefData(data);
            setShowBrief(true);
          })
          .catch(error => {
            console.error('Failed to fetch absence brief:', error);
            // Fallback to mock data
            setBriefData({
              daysAway: 3,
              keyEvents: [
                "穆杰塔巴正式当选最高领袖",
                "以色列威胁\"追杀\"新领袖", 
                "油价一度突破$110"
              ]
            });
            setShowBrief(true);
          });
      }
    } else {
      // First time visit - show brief after a short delay to let main content load
      setTimeout(() => {
        setBriefData({
          daysAway: 0,
          keyEvents: [
            "欢迎来到MideastSim推演平台",
            "点击领导人头像查看其记忆",
            "世界统计显示在顶部栏"
          ]
        });
        setShowBrief(true);
      }, 2000);
    }
    
    // Update last visit time
    localStorage.setItem('lastVisit', now.toISOString());
  }, []);

  if (!showBrief || !briefData) {
    return null;
  }

  return (
    <div className="absence-brief-overlay">
      <div className="absence-brief-modal">
        <div className="absence-brief-header">
          <h2>👋 欢迎回来！</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <div className="absence-brief-content">
          <p>你离开了大约 <strong>{briefData.daysAway}天</strong></p>
          <div className="key-events">
            <h3>📌 你错过的关键事件：</h3>
            <ul>
              {briefData.keyEvents.map((event, index) => (
                <li key={index}>▸ {event}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="absence-brief-footer">
          <button onClick={onClose} className="acknowledge-button">知道了</button>
        </div>
      </div>
    </div>
  );
};

export default AbsenceBrief;