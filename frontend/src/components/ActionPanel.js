// frontend/src/components/ActionPanel.js
import React, { useState, useEffect, memo } from 'react';
import { t, getLang } from '../i18n';
import { actions as apiActions, roles } from '../services/api';
import './ActionPanel.css';

const ActionPanel = ({ currentNation, onActionComplete, onClose, onShowDecision, wars = [] }) => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionParams, setActionParams] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLang, setCurrentLang] = useState(getLang());
  const [availableRoles, setAvailableRoles] = useState([]);
  
  // 检查是否已经与某国处于战争状态
  const isAtWarWith = (targetId) => {
    return wars.some(war => 
      war.status === 'ongoing' && 
      ((war.aggressor_id === currentNation && war.defender_id === targetId) ||
       (war.aggressor_id === targetId && war.defender_id === currentNation))
    );
  };
  
  // 获取进行中的战争
  const ongoingWars = wars.filter(w => 
    w.status === 'ongoing' && 
    (w.aggressor_id === currentNation || w.defender_id === currentNation)
  );

  // 监听语言变更
  useEffect(() => {
    const handler = (e) => {
      setCurrentLang(e.detail.lang);
    };
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  // 获取可用国家列表（仅在已登录时）
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('未登录，跳过获取国家列表');
      return;
    }
    
    const fetchRoles = async () => {
      try {
        const data = await roles.available();
        console.log('可用国家列表:', data);
        // 后端返回 { available_roles: [...], total: N }
        setAvailableRoles(data.available_roles || data.roles || data || []);
      } catch (err) {
        console.error('获取国家列表失败:', err);
      }
    };
    fetchRoles();
  }, []);

  const actions = [
    {
      id: 'declare_war',
      icon: '⚔️',
      label: t('actions.declareWar'),
      color: '#8B1A1A',
      requiresTarget: true,
      confirm: true,
    },
    {
      id: 'propose_peace',
      icon: '🕊️',
      label: t('actions.proposePeace'),
      color: '#4A7C59',
      requiresTarget: true,
    },
    {
      id: 'sanction',
      icon: '💰',
      label: t('actions.sanction'),
      color: '#B8860B',
      requiresTarget: true,
      params: [
        { name: 'type', label: '类型', options: ['economic', 'military', 'diplomatic'] }
      ],
    },
    {
      id: 'propose_alliance',
      icon: '🤝',
      label: t('actions.proposeAlliance'),
      color: '#1E4F8A',
      requiresTarget: true,
      params: [
        { name: 'type', label: '类型', options: ['mutual', 'defense', 'economic'] }
      ],
    },
    {
      id: 'military_exercise',
      icon: '🎯',
      label: t('actions.militaryExercise'),
      color: '#8B0000',
      requiresTarget: true,
      params: [
        { name: 'scale', label: '规模', options: ['routine', 'large'] }
      ],
    },
    {
      id: 'diplomatic_statement',
      icon: '📢',
      label: t('actions.diplomaticStatement'),
      color: '#4169E1',
      requiresTarget: true,
      params: [
        { name: 'attitude', label: '态度', options: ['support', 'neutral', 'criticize'] }
      ],
    },
  ];

  const handleActionClick = (action) => {
    // 如果是战争分析，直接显示分析面板
    if (action.id === 'war_analysis') {
      setSelectedAction(action);
      setError(null);
      setActionParams({});
      return;
    }
    
    setSelectedAction(action);
    setError(null);
    setActionParams({});
  };

  const handleExecute = async () => {
    if (!currentNation || !selectedAction) return;

    setLoading(true);
    setError(null);

    try {
      const targetId = actionParams.target_id || currentNation.id;
      
      // 第一步：发送指令给 Agent，让 Agent 决策
      const token = localStorage.getItem('auth_token');
      const agentResponse = await fetch('/api/agent/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: selectedAction.id,
          target: targetId,
          params: actionParams
        })
      });

      const decision = await agentResponse.json();
      
      // 检查 Agent 决策
      if (!decision.execute) {
        // Agent 拒绝执行，通过回调通知 App 显示弹窗
        onShowDecision?.({
          decision: decision,
          action: selectedAction,
          target: targetId,
          params: actionParams,
          rejected: true
        });
        setLoading(false);
        return;
      }

      // Agent 同意执行，通过回调通知 App 显示弹窗
      onShowDecision?.({
        decision: decision,
        action: selectedAction,
        target: targetId,
        params: actionParams,
        rejected: false
      });
      setLoading(false);
    } catch (err) {
      setError(err.message || t('error'));
      setLoading(false);
    }
  };

  const handleParamChange = (paramName, value) => {
    setActionParams(prev => ({ ...prev, [paramName]: value }));
  };

  if (!currentNation) {
    return (
      <div className="action-panel">
        <div className="panel-header">
          <h3>⚡ {t('actions.title')}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="panel-content">
          <p className="no-nation-message">
            {t('auth.chooseNation')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="action-panel">
      <div className="panel-header">
        <h3>⚡ {t('actions.title')}</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        {/* 当前国家 */}
        <div className="current-nation">
          <span className="nation-flag">{currentNation.flag || '🏳️'}</span>
          <span className="nation-name">{currentNation.name}</span>
        </div>

        {/* 行动列表 */}
        {!selectedAction ? (
          <div className="action-grid">
            {actions.map((action) => {
              // 检查宣战行动：如果已经与某国处于战争状态，显示不同状态
              const isWarAction = action.id === 'declare_war';
              const warTarget = isWarAction ? availableRoles.find(role => 
                role.id !== currentNation.id && isAtWarWith(role.id)
              ) : null;
              
              // 如果正在战争中，禁用宣战按钮
              const isDisabled = isWarAction && ongoingWars.length > 0;
              
              return (
                <button
                  key={action.id}
                  className={`action-btn ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && handleActionClick(action)}
                  style={{ '--action-color': action.color }}
                  disabled={isDisabled}
                >
                  <span className="action-icon">{action.icon}</span>
                  <span className="action-label">
                    {action.label}
                    {isDisabled && warTarget && ` (与${warTarget.name}战争中)`}
                    {isDisabled && !warTarget && ' (战争进行中)'}
                  </span>
                </button>
              );
            })}
            
            {/* 如果正在进行战争，显示战争分析按钮 */}
            {ongoingWars.length > 0 && (
              <button
                className="action-btn"
                onClick={() => handleActionClick({
                  id: 'war_analysis',
                  icon: '📊',
                  label: '📊 战争分析',
                  color: '#FF6B35'
                })}
                style={{ '--action-color': '#FF6B35' }}
              >
                <span className="action-icon">📊</span>
                <span className="action-label">📊 战争分析</span>
              </button>
            )}
          </div>
        ) : (
          /* 行动确认 */
          <div className="action-detail">
            {/* 战争分析特殊处理 */}
            {selectedAction.id === 'war_analysis' ? (
              <div className="war-analysis">
                <div className="action-icon-large">📊</div>
                <h4>📊 战争分析</h4>
                
                <div className="war-list">
                  {ongoingWars.map((war) => {
                    const enemyId = war.aggressor_id === currentNation ? war.defender_id : war.aggressor_id;
                    const enemy = availableRoles.find(r => r.id === enemyId);
                    const startDate = new Date(war.start_time);
                    const duration = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60)); // 小时
                    
                    return (
                      <div key={war.id} className="war-item">
                        <div className="war-header">
                          <span className="war-enemy">{enemy?.flag || '🏳️'} {enemy?.name || enemyId}</span>
                          <span className="war-status">🔥 进行中</span>
                        </div>
                        <div className="war-info">
                          <div>⏱️ 持续时间：{duration} 小时</div>
                          <div>⚔️ 开始时间：{startDate.toLocaleString('zh-CN')}</div>
                          <div>💀 伤亡：进攻方 {war.casualty_attacker || 0} | 防守方 {war.casualty_defender || 0}</div>
                        </div>
                        <div className="war-analysis-text">
                          <strong>📈 战局分析:</strong>
                          <p>当前战争处于僵持状态。建议评估军事资源和国际支持，考虑是否增兵或寻求和谈。</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="action-buttons">
                  <button
                    className="btn-cancel"
                    onClick={() => setSelectedAction(null)}
                  >
                    关闭
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="action-icon-large">{selectedAction.icon}</div>
                <h4>{selectedAction.label}</h4>

            {/* 目标国家选择（如果需要目标） */}
            {selectedAction.requiresTarget && (
              <div className="target-selector">
                <label>🎯 {t('actions.target') || '目标国家'}:</label>
                <select
                  value={actionParams.target_id || ''}
                  onChange={(e) => handleParamChange('target_id', e.target.value)}
                >
                  <option value="">-- 请选择 --</option>
                  {availableRoles
                    .filter(role => role.id !== currentNation.id) // 排除自己
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.flag || '🏳️'} {role.name} {role.name_en ? `(${role.name_en})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* 参数选择 */}
            {selectedAction.params?.map((param) => (
              <div key={param.name} className="param-selector">
                <label>{param.label}:</label>
                <select
                  value={actionParams[param.name] || param.options[0]}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                >
                  {param.options.map((opt) => {
                    const label = t(`actions.${opt}`);
                    // 确保渲染的是字符串，不是对象
                    const displayLabel = typeof label === 'string' ? label : opt;
                    return (
                      <option key={opt} value={opt}>
                        {displayLabel}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}

            {/* 错误信息 */}
            {error && <div className="error-message">{error}</div>}

            {/* 确认按钮 */}
            <div className="action-buttons">
              <button
                className="btn-cancel"
                onClick={() => setSelectedAction(null)}
                disabled={loading}
              >
                {t('cancel')}
              </button>
              <button
                className="btn-confirm"
                onClick={handleExecute}
                disabled={loading || (selectedAction.requiresTarget && !actionParams.target_id)}
                style={{ '--action-color': selectedAction.color }}
              >
                {loading ? (currentLang === 'zh' ? '加载中...' : 'Loading...') : t('confirm')}
              </button>
            </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ActionPanel);
