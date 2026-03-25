// frontend/src/components/SettingsPanel.js
import React, { useState, useEffect } from 'react';
import { t, setLang, getLang } from '../i18n';
import './SettingsPanel.css';

const SettingsPanel = ({ onClose }) => {
  const [currentLang, setCurrentLang] = useState(getLang());

  // 监听语言变更
  useEffect(() => {
    const handler = (e) => {
      setCurrentLang(e.detail.lang);
    };
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  const handleLangChange = (lang) => {
    setLang(lang);
  };

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h3>⚙️ {t('settings.title')}</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        {/* 语言设置 */}
        <div className="setting-section">
          <h4>{t('settings.language')}</h4>
          <div className="language-options">
            <button
              className={`lang-btn ${currentLang === 'zh' ? 'active' : ''}`}
              onClick={() => handleLangChange('zh')}
            >
              🇨🇳 中文
            </button>
            <button
              className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
              onClick={() => handleLangChange('en')}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* 通知设置 */}
        <div className="setting-section">
          <h4>{t('settings.notifications')}</h4>
          <div className="toggle-option">
            <span>{t('settings.actionNotifications')}</span>
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="toggle-option">
            <span>{t('settings.warAlerts')}</span>
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* 音效设置 */}
        <div className="setting-section">
          <h4>{t('settings.sound')}</h4>
          <div className="toggle-option">
            <span>{t('settings.soundEffects')}</span>
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="toggle-option">
            <span>{t('settings.music')}</span>
            <label className="toggle">
              <input type="checkbox" />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* 关于 */}
        <div className="setting-section">
          <h4>{t('settings.about')}</h4>
          <div className="about-info">
            <div className="info-item">
              <span className="info-label">{t('settings.version')}</span>
              <span className="info-value">v1.1.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">{t('settings.buildDate')}</span>
              <span className="info-value">2026-03-12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
