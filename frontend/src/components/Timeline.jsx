import React, { useState, useEffect } from 'react';

const Timeline = ({ currentDate, onDateChange, lastVisit }) => {
  const dates = [
    { label: '2/28', event: '空袭日' },
    { label: '3/1', event: '权力真空' },
    { label: '3/2', event: '穆杰塔巴' },
    { label: '3/3', event: '以军威胁' },
    { label: '3/4', event: '沙特斡旋' },
    { label: '3/5', event: '油价暴涨' },
    { label: '3/6', event: '美舰调动' },
    { label: '3/7', event: '欧佩克会议' },
    { label: '3/8', event: '联合国决议' },
    { label: '今天', event: '推演中' }
  ];
  
  const [currentIndex, setCurrentIndex] = useState(dates.length - 1);
  
  useEffect(() => {
    // 如果有上次访问记录，计算位置
    if (lastVisit) {
      const lastIndex = dates.findIndex(d => d.label === lastVisit);
      // 可以通过CSS高亮
    }
  }, [lastVisit]);
  
  const handleSliderChange = (e) => {
    const index = parseInt(e.target.value);
    setCurrentIndex(index);
    onDateChange(dates[index].label);
  };
  
  return (
    <div className="w-full px-4 py-2 bg-gray-900/50 border-b border-gray-700">
      <div className="flex items-center space-x-2 mb-1">
        <span className="text-gold-500 text-sm font-mono">⏱️ 时间轴</span>
        <span className="text-xs text-gray-400">
          {dates[currentIndex].label} - {dates[currentIndex].event}
        </span>
      </div>
      
      <div className="relative">
        {/* 滑块 */}
        <input
          type="range"
          min="0"
          max={dates.length - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer timeline-slider"
          style={{
            background: `linear-gradient(to right, #F0B90B 0%, #F0B90B ${(currentIndex/(dates.length-1))*100}%, #374151 ${(currentIndex/(dates.length-1))*100}%, #374151 100%)`
          }}
        />
        
        {/* 日期标签 */}
        <div className="flex justify-between mt-1 text-xs">
          {dates.map((date, i) => (
            <div key={i} className="relative flex flex-col items-center">
              <span className={i === currentIndex ? 'text-gold-500 font-bold' : 'text-gray-400'}>
                {date.label}
              </span>
              <span className="text-[10px] text-gray-500">{date.event}</span>
              
              {/* 上次访问标记 */}
              {lastVisit === date.label && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <span className="text-gold-500 text-xs whitespace-nowrap">↑ 上次访问</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* 时间提示 */}
      <div className="flex justify-between mt-2 text-[10px] text-gray-500">
        <span>拖动时间轴查看历史状态</span>
        <span className="text-gold-500">当前: {dates[currentIndex].event}</span>
      </div>
    </div>
  );
};

export default Timeline;