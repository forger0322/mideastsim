// frontend/src/components/Leaderboard.js
import React, { memo } from 'react';
import { t } from '../i18n';
import './Leaderboard.css';

const Leaderboard = () => {
  return (
    <div className="coming-soon-container">
      <div className="coming-soon-icon">🚧</div>
      <h2 className="coming-soon-title">Coming Soon</h2>
      <p className="coming-soon-desc">排行榜功能正在开发中</p>
      <p className="coming-soon-desc-en">Leaderboard is under construction</p>
      <div className="coming-soon-features">
        <div className="feature-item">📊 国力排名</div>
        <div className="feature-item">🏆 玩家统计</div>
        <div className="feature-item">📈 历史趋势</div>
      </div>
    </div>
  );
};

export default memo(Leaderboard);
