// 🏛️ 创建会议室页面
import React, { useState } from 'react';
import './CreateMeetingRoom.css';

const CreateMeetingRoom = ({ lang = 'zh', onCreate, onCancel }) => {
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      setError(lang === 'zh' ? '请输入会议室名称' : 'Please enter room name');
      return;
    }

    onCreate(roomName.trim());
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="create-meeting-room-overlay">
      <div className="create-meeting-room-container">
        <div className="create-meeting-room-card">
          <h2 className="create-meeting-room-title">
            {lang === 'zh' ? '🏛️ 创建会议室' : '🏛️ Create Meeting Room'}
          </h2>
          
          <form onSubmit={handleSubmit} className="create-meeting-room-form">
            <div className="form-group">
              <label htmlFor="roomName">
                {lang === 'zh' ? '会议室名称' : 'Room Name'}
              </label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => {
                  setRoomName(e.target.value);
                  setError('');
                }}
                placeholder={lang === 'zh' ? '输入会议室名称...' : 'Enter room name...'}
                className="room-name-input"
                autoFocus
              />
              {error && <div className="error-message">{error}</div>}
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-cancel"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="btn-create"
              >
                {lang === 'zh' ? '创建' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMeetingRoom;
