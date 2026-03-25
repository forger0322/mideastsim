import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { useTranslation } from '../i18n';
import './RoleSelector.css';

const RoleSelector = ({ player, onRoleSelect }) => {
  const { t, lang } = useTranslation();
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);

  // 国家旗帜映射
  const countryFlags = {
    'YEM': '🇾🇪', 'ISR': '🇮🇱', 'IRQ': '🇮🇶', 'IRN': '🇮🇷',
    'QAT': '🇶🇦', 'SYR': '🇸🇾', 'TUR': '🇹🇷', 'EGY': '🇪🇬',
    'PSE': '🇵🇸', 'BHR': '🇧🇭', 'SAU': '🇸🇦', 'KWT': '🇰🇼',
    'JOR': '🇯🇴', 'USA': '🇺🇸', 'OMN': '🇴🇲', 'ARE': '🇦🇪',
    'LBN': '🇱🇧'
  };

  const getCountryFlag = (countryCode) => countryFlags[countryCode] || '🏛️';

  // 势力颜色映射 - 古代兵书风格
  const factionColors = {
    '抵抗轴心': 'linear-gradient(135deg, #8B1A1A, #dc2626)',
    '美以联盟': 'linear-gradient(135deg, #1E4F8A, #1e3a8a)',
    '温和联盟': 'linear-gradient(135deg, #B8860B, #d4af37)',
    '亲穆兄会': 'linear-gradient(135deg, #2D5A27, #166534)',
    'resistance-axis': 'linear-gradient(135deg, #8B1A1A, #dc2626)',
    'us-israel-alliance': 'linear-gradient(135deg, #1E4F8A, #1e3a8a)',
    'moderate-alliance': 'linear-gradient(135deg, #B8860B, #d4af37)',
    'brotherhood': 'linear-gradient(135deg, #2D5A27, #166534)',
  };

  // 势力 CSS 类名
  const factionClasses = {
    '抵抗轴心': 'faction-resistance',
    '美以联盟': 'faction-alliance',
    '温和联盟': 'faction-moderate',
    '亲穆兄会': 'faction-brotherhood',
  };

  useEffect(() => {
    fetchAvailableRoles();
  }, []);

  const fetchAvailableRoles = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_CONFIG.baseUrl}/api/roles/available`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(lang === 'zh' ? '获取角色列表失败' : 'Failed to fetch roles');
      }

      const data = await response.json();
      console.log('📊 获取到的角色列表:', data);
      setAvailableRoles(data.available_roles || data.roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRole = async (roleId) => {
    setSelectedRole(roleId);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_CONFIG.baseUrl}/api/roles/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role_id: roleId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || (lang === 'zh' ? '选择角色失败' : 'Failed to select role'));
      }

      const data = await response.json();
      onRoleSelect(data.role);
    } catch (err) {
      setError(err.message);
      setSelectedRole(null);
    }
  };

  if (loading) {
    return (
      <div className="role-selector-container">
        <div className="role-selector-card">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>{lang === 'zh' ? '加载角色列表中...' : 'Loading roles...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="role-selector-container">
      <div className="role-selector-card">
        <div className="role-header">
          <button 
            className="back-to-login-btn"
            onClick={() => {
              localStorage.clear();
              window.location.reload(true);
            }}
            title="返回登录页面"
          >
            ← 返回登录
          </button>
          <h1 className="role-title">🎭 选择你的角色</h1>
          <p className="role-subtitle">
            欢迎，<span className="player-name">{player.username}</span>
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="roles-grid">
          {availableRoles.map((role) => (
            <div
              key={role.id}
              className={`role-card ${selectedRole === role.id ? 'selected' : ''}`}
              onClick={() => handleClaimRole(role.id)}
              style={{ 
                borderColor: selectedRole && selectedRole !== role.id ? 'rgba(139, 90, 43, 0.3)' : 'var(--border-brown)',
                opacity: selectedRole && selectedRole !== role.id ? 0.5 : 1,
                cursor: selectedRole && selectedRole !== role.id ? 'not-allowed' : 'pointer'
              }}
            >
              <div className="role-flag">{getCountryFlag(role.id)}</div>
              <h3 className="role-name">{role.name}</h3>
              <p className="role-name-en">{role.name_en}</p>
              
              <div 
                className={`role-faction ${factionClasses[role.faction] || ''}`}
                style={{ 
                  background: factionColors[role.faction] || factionColors[role.faction.replace(/-/g, '-')] || 'var(--border-brown)',
                }}
              >
                {role.faction}
              </div>

              <div className="role-stats">
                <div className="stat">
                  <span className="stat-label">经济</span>
                  <span className="stat-value">{role.attributes?.economy || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">军事</span>
                  <span className="stat-value">{role.attributes?.army || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">稳定</span>
                  <span className="stat-value">{role.attributes?.stability || 0}</span>
                </div>
              </div>

              {selectedRole === role.id && (
                <div className="selecting-indicator">
                  <div className="spinner-small"></div>
                  <span>选择中...</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="role-footer">
          <button 
            className="skip-btn"
            onClick={() => onRoleSelect(null)}
          >
            跳过选择，以观察者身份进入
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
