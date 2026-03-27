import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { useTranslation, setLang } from '../i18n';
import './Auth.css';

const Auth = ({ onAuthSuccess }) => {
  const { t, lang } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [scrollUnrolled, setScrollUnrolled] = useState(false);
  const [sealTooltip, setSealTooltip] = useState(false);

  // 谶语列表
  const prophecies = lang === 'zh' 
    ? ['天下大势，尽在推演', '乱世风云，谁主沉浮', '中东棋局，待君入局', '权力更迭，一念之间']
    : ['The fate of nations lies in simulation', 'Chaos reigns, who will prevail?', 'Middle East chessboard awaits', 'Power shifts with a single thought'];

  const [currentProphecy, setCurrentProphecy] = useState(prophecies[0]);

  // 页面加载时横向展开卷轴（使用 transform 动画，避免布局重排）
  useEffect(() => {
    const timer = setTimeout(() => {
      setScrollUnrolled(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 随机谶语
  const handleSealHover = () => {
    const random = prophecies[Math.floor(Math.random() * prophecies.length)];
    setCurrentProphecy(random);
    setSealTooltip(true);
  };

  // 监听语言切换，清除验证错误（让用户重新输入时显示新语言的错误）
  useEffect(() => {
    setValidationErrors({});
    setError('');
  }, [lang]);

  // 验证函数
  const validateForm = () => {
    const errors = {};
    
    // 邮箱验证（仅注册时，必填）
    if (!isLogin) {
      if (!email || email.trim() === '') {
        errors.email = lang === 'zh' ? '邮箱不能为空' : 'Email is required';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.email = lang === 'zh' ? '请输入有效的邮箱地址' : 'Please enter a valid email address';
        }
      }
    }
    
    // 密码验证（仅注册时，简化验证）
    if (!isLogin) {
      if (password.length < 4) {
        errors.password = lang === 'zh' ? '密码长度至少 4 位' : 'Password must be at least 4 characters';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});
    
    // 先验证表单
    if (!isLogin && !validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { username, password } 
        : { username, email, password };

      console.log('=== 注册请求调试 ===');
      console.log('Endpoint:', endpoint);
      console.log('Payload:', payload);
      console.log('Payload JSON:', JSON.stringify(payload));
      console.log('====================');

      const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || '认证失败');
      }

      // 保存 token 到 localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('player', JSON.stringify(data.player));

      // 通知父组件认证成功
      onAuthSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* 势力色块淡影背景 */}
      <div className="faction-shadows">
        <div className="faction-shadow resistance"></div>
        <div className="faction-shadow alliance"></div>
        <div className="faction-shadow moderate"></div>
        <div className="faction-shadow brotherhood"></div>
      </div>
      
      {/* 横向古卷轴容器 */}
      <div className={`scroll-wrapper ${scrollUnrolled ? 'unrolled' : ''}`}>
        
        {/* 左卷轴 */}
        <div className="scroll-rod-left">
          <div className="rod-axis"></div>
          <div className="rod-cap top"></div>
          <div className="rod-cap bottom"></div>
          <div className="rod-decoration">
            <span className="deco-char">龍</span>
          </div>
        </div>

        {/* 卷轴主体 - 宣纸 */}
        <div className="scroll-body">
          <div className="scroll-paper">
            {/* 宣纸纹理 */}
            <div className="paper-texture"></div>
            
            {/* 边框装饰 */}
            <div className="paper-border top"></div>
            <div className="paper-border bottom"></div>
            <div className="paper-border left"></div>
            <div className="paper-border right"></div>

            {/* 内容区域 */}
            <div className="auth-card">
              <div className="auth-header">
                {/* 语言切换按钮 - 右上角 */}
                <button 
                  className="lang-switch-btn"
                  onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                  title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
                >
                  {lang === 'zh' ? 'EN' : '中文'}
                </button>
                
                {/* 顶部装饰 - 蝙蝠纹样 */}
                <div className="header-ornament">
                  <span className="ornament-symbol">☯</span>
                </div>
                
                <h1 className="auth-title" data-text={t('login.title')}>{t('login.title')}</h1>
                <p className="auth-subtitle">{t('login.subtitle')}</p>
                
                {/* 分隔线 - 回纹 */}
                <div className="divider-pattern">
                  <span className="pattern-symbol">❖</span>
                </div>
              </div>

              <div className="auth-tabs">
                <button
                  className={`auth-tab ${isLogin ? 'active' : ''}`}
                  onClick={() => setIsLogin(true)}
                >
                  <span className="tab-char">{lang === 'zh' ? '登' : 'L'}</span>
                  <span className="tab-text">{t('auth.login')}</span>
                </button>
                <button
                  className={`auth-tab ${!isLogin ? 'active' : ''}`}
                  onClick={() => setIsLogin(false)}
                >
                  <span className="tab-char">{lang === 'zh' ? '注' : 'R'}</span>
                  <span className="tab-text">{t('auth.register')}</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="username" className="form-label">
                    <span className="label-char">{lang === 'zh' ? '名' : 'U'}</span>
                    {t('auth.username')}
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={lang === 'zh' ? '请输入用户名' : 'Enter username'}
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>

                {!isLogin && (
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      <span className="label-char">{lang === 'zh' ? '邮' : 'E'}</span>
                      {t('auth.email')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={lang === 'zh' ? '请输入邮箱' : 'Enter email'}
                      required
                      disabled={loading}
                      className={`form-input ${validationErrors.email ? 'input-error' : ''}`}
                    />
                    {validationErrors.email && (
                      <div className="field-error">
                        <span className="error-char">⚠</span>
                        {validationErrors.email}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    <span className="label-char">{lang === 'zh' ? '密' : 'P'}</span>
                    {t('auth.password')}
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={lang === 'zh' ? '请输入密码' : 'Enter password'}
                      required
                      disabled={loading}
                      className="form-input"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      title={showPassword ? (lang === 'zh' ? '隐藏密码' : 'Hide password') : (lang === 'zh' ? '显示密码' : 'Show password')}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {!isLogin && validationErrors.password && (
                    <div className="field-error">
                      <span className="error-char">⚠</span>
                      {validationErrors.password}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="error-message">
                    <span className="error-char">⚠</span>
                    {error}
                  </div>
                )}

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <span className="loading-text">⏳ {lang === 'zh' ? '处理中...' : 'Processing...'}</span>
                  ) : (
                    <span>
                      {isLogin ? t('auth.login') : t('auth.register')}
                    </span>
                  )}
                </button>
              </form>

              <div className="auth-footer">
                <div className="footer-divider">
                  <span className="divider-dot">◆</span>
                </div>
                <p>{lang === 'zh' ? '🐎 驿卒快马：无需登录即可观看推演' : '🐎 Express Rider: Watch simulation without login'}</p>
                <button 
                  className="guest-btn"
                  onClick={() => onAuthSuccess({ token: null, player: { id: 'guest', username: lang === 'zh' ? '游客' : 'Guest' } })}
                >
                  {lang === 'zh' ? '以游客身份进入' : 'Enter as Guest'}
                </button>
              </div>

              {/* 火漆印 - 可点击动态元素 */}
              <div 
                className="seal-mark"
                onMouseEnter={handleSealHover}
                onMouseLeave={() => setSealTooltip(false)}
                onClick={() => {
                  const random = prophecies[Math.floor(Math.random() * prophecies.length)];
                  setCurrentProphecy(random);
                }}
              >
                <div className="seal-frame">
                  <span className="seal-char">推</span>
                  <span className="seal-char">演</span>
                </div>
                {sealTooltip && (
                  <div className="seal-tooltip">{currentProphecy}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右卷轴 */}
        <div className="scroll-rod-right">
          <div className="rod-axis"></div>
          <div className="rod-cap top"></div>
          <div className="rod-cap bottom"></div>
          <div className="rod-decoration">
            <span className="deco-char">鳳</span>
          </div>
        </div>

        {/* 飘带装饰 */}
        <div className="ribbon-flow left"></div>
        <div className="ribbon-flow right"></div>
      </div>

      {/* 底部题字 */}
      <div className="bottom-inscription">
        <span>{t('login.subtitle')}</span>
      </div>
    </div>
  );
};

export default Auth;
