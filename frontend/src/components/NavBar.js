// frontend/src/components/NavBar.js
import React, { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { t, getLang } from '../i18n';
import './NavBar.css';

const NavBar = ({ onNavigate, currentPage, onLogout, player, currentRole }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(getLang());

  // 监听语言变更
  useEffect(() => {
    const handler = (e) => {
      setCurrentLang(e.detail.lang);
    };
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  const navItems = [
    { id: 'map', icon: '🗺️', label: t('nav.map') },
    { id: 'economy', icon: '📊', label: t('nav.economy') },
    { id: 'diplomacy', icon: '🤝', label: t('nav.diplomacy') },
    { id: 'military', icon: '⚔️', label: t('nav.military') },
    { id: 'leaderboard', icon: '🏆', label: t('nav.leaderboard') || '排行榜' },
    { id: 'settings', icon: '⚙️', label: t('nav.settings') },
  ];

  const handleNavClick = (pageId) => {
    console.log('NavBar click:', pageId, 'onNavigate:', typeof onNavigate);
    if (onNavigate) {
      onNavigate(pageId);
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand">
          <span className="logo">🌍</span>
          <span className="brand-text">MideastSim</span>
        </div>

        {/* Desktop Navigation */}
        <div className="navbar-menu desktop-menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="navbar-right">
          {/* 用户信息 */}
          {player && (
            <div className="user-info">
              <div className="user-avatar">👤</div>
              <div className="user-details">
                <div className="user-name">{player.username}</div>
                {currentRole && (
                  <div className="user-role">
                    {currentRole.flag || '🏛️'} {currentRole.role_name || currentRole.name}
                  </div>
                )}
              </div>
              <button className="logout-btn" onClick={onLogout} title="登出">
                🚪
              </button>
            </div>
          )}
          
          <LanguageSwitcher />
          
          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="hamburger"></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`mobile-nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default NavBar;
