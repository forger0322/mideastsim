import React from 'react';
import './MemorialModal.css';

const MemorialModal = ({ isOpen, onClose, title, children, type = 'default', width, disableAnimation = false }) => {
  if (!isOpen) return null;

  // 根据类型设置印章颜色
  const getSealColor = () => {
    const colors = {
      '地图': '#1E4F8A', // 深蓝
      '经济': '#B8860B', // 暗金
      '外交': '#2D5A27', // 墨绿
      '军事': '#8B1A1A', // 深红
      '排行榜': '#8B5A2B', // 铜色
      '设置': '#5D4A2E', // 深褐
      '行动': '#A52A2A', // 朱红
      '策略': '#CD853F', // 青铜
      '军令': '#8B1A1A', // 深红
      'default': '#8B5A2B'
    };
    // 从标题中提取类型（去掉 emoji 前缀）
    const typeKey = title ? title.replace(/^[^\u4e00-\u9fa5a-zA-Z]*/, '') : 'default';
    return colors[typeKey] || colors.default;
  };

  const containerStyle = width ? { width: width, minWidth: width } : {};
  const isLeaderboard = title && title.includes('排行榜');
  const containerClass = disableAnimation || isLeaderboard 
    ? 'memorial-container no-animation leaderboard-modal' 
    : 'memorial-container';
  const overlayClass = disableAnimation || isLeaderboard 
    ? 'memorial-overlay no-animation' 
    : 'memorial-overlay';

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={containerClass} onClick={e => e.stopPropagation()} style={containerStyle}>
        {/* 卷轴上轴头 */}
        <div className="scroll-top">
          <div className="scroll-knob left"></div>
          <div className="scroll-rod"></div>
          <div className="scroll-knob right"></div>
        </div>

        {/* 奏折主体 */}
        <div className="memorial-content">
          {/* 标题区 - 带印章 */}
          <div className="memorial-header">
            <h3 className="memorial-title">{title}</h3>
            <div className="title-seal" style={{ backgroundColor: getSealColor() }}></div>
          </div>

          {/* 内容区 */}
          <div className="memorial-body">
            {children}
          </div>
        </div>

        {/* 卷轴下轴头 */}
        <div className="scroll-bottom">
          <div className="scroll-knob left"></div>
          <div className="scroll-rod"></div>
          <div className="scroll-knob right"></div>
        </div>

        {/* 关闭按钮（火漆印） */}
        <button className="close-seal" onClick={onClose}>×</button>
      </div>
    </div>
  );
};

export default MemorialModal;
