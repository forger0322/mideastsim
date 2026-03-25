// frontend/src/components/LanguageSwitcher.js
import React, { useState, useEffect } from 'react';
import { getLang, setLang } from '../i18n';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const [currentLang, setCurrentLang] = useState(getLang());

  useEffect(() => {
    const handler = (e) => {
      setCurrentLang(e.detail.lang);
    };
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  const handleToggle = () => {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    setLang(newLang);
  };

  return (
    <button 
      className="language-switcher" 
      onClick={handleToggle}
      title={currentLang === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <span className={`lang-option ${currentLang === 'zh' ? 'active' : ''}`}>
        🇨🇳 中文
      </span>
      <span className="separator">|</span>
      <span className={`lang-option ${currentLang === 'en' ? 'active' : ''}`}>
        🇺🇸 EN
      </span>
    </button>
  );
};

export default LanguageSwitcher;
