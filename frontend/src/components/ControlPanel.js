import React from 'react';
import './ControlPanel.css';

function ControlPanel({ onPlay, onPause, onTrackLeader, isPlaying }) {
  return (
    <div className="control-panel-container">
      <div className="controls">
        <button 
          className="control-btn track"
          onClick={onTrackLeader}
        >
          📍 追踪 AI 特朗普
        </button>
        <div className="view-options">
          <label>显示模式:</label>
          <div className="toggle-group">
            <button className="toggle-btn active">军事</button>
            <button className="toggle-btn">外交</button>
            <button className="toggle-btn">经济</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
