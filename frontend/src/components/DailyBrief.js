import React from 'react';
import './DailyBrief.css';

function DailyBrief({ hotspots, events }) {
  // Get today's date for the brief title
  const today = new Date();
  const formatDate = (date) => {
    const year = date.getFullYear() - 2020; // Assuming AE starts in 2020
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `AE ${year}年${month}月${day}日`;
  };

  // Extract headline from recent events
  const getHeadline = () => {
    if (events && events.length > 0) {
      // Find the most critical event (military first, then diplomacy, then economic)
      const militaryEvent = events.find(e => e.type === 'military');
      if (militaryEvent) return militaryEvent.text;
      
      const diplomacyEvent = events.find(e => e.type === 'diplomacy');
      if (diplomacyEvent) return diplomacyEvent.text;
      
      return events[0].text;
    }
    return "中东地区局势动态";
  };

  // Calculate conflict escalation probability based on hotspot severity
  const calculateConflictProbability = () => {
    if (!hotspots || hotspots.length === 0) return 30;
    
    let baseProbability = 30;
    hotspots.forEach(hotspot => {
      if (hotspot.color === 'red' || hotspot.status.includes('权力真空')) {
        baseProbability += 25;
      } else if (hotspot.color === 'yellow' || hotspot.status.includes('紧急')) {
        baseProbability += 15;
      }
    });
    
    // Cap at 95%
    return Math.min(baseProbability, 95);
  };

  return (
    <div className="daily-brief-container">
      <h3>今日简报</h3>
      <div className="brief-content">
        <div className="brief-date">{formatDate(today)}</div>
        <div className="brief-title">{getHeadline()}</div>
        
        {hotspots && hotspots.length > 0 && (
          <div className="brief-hotspots">
            {hotspots.map((hotspot, index) => (
              <div key={index} className="brief-hotspot">
                <span className="hotspot-location">{hotspot.location}</span>
                <span className={`hotspot-status ${
                  hotspot.color === 'red' ? 'status-red' : 
                  hotspot.color === 'yellow' ? 'status-yellow' : 'status-gold'
                }`}>
                  {hotspot.status}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <div className="brief-probability">
          冲突升级概率: 
          <span className={`probability-value ${
            calculateConflictProbability() > 70 ? 'high' : 
            calculateConflictProbability() > 50 ? 'medium' : 'low'
          }`}>
            {calculateConflictProbability()}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default DailyBrief;