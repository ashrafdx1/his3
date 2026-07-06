import React, { useState } from 'react';
import { apiClient } from '../services/api-client';
import { translations, Language } from '../services/translations';

interface LoginPageProps {
  onLoginSuccess: (tokenData: { accessToken: string; refreshToken: string; user: { id: string; username: string; roles: string[] } }) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  colorTheme: string;
  setColorTheme: (color: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function LoginPage({
  onLoginSuccess,
  theme,
  toggleTheme,
  colorTheme,
  setColorTheme,
  lang,
  setLang,
}: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Client-side validation errors
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const t = translations[lang];
  const isRtl = lang === 'ar';

  const validateForm = (): boolean => {
    const newErrors: { username?: string; password?: string } = {};
    
    if (!username.trim()) {
      newErrors.username = lang === 'ar' ? 'اسم المستخدم مطلوب' : 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = lang === 'ar' ? 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل' : 'Username must be at least 3 characters';
    }

    if (!password) {
      newErrors.password = lang === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = lang === 'ar' ? 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password,
      });

      // Reset fields on success
      setUsername('');
      setPassword('');
      
      // Callback to parent app
      onLoginSuccess(response.data);
    } catch (err: any) {
      // Clear password field on error
      setPassword('');
      
      // Handle Axios error responses
      if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message;

        if (status === 403) {
          setError(message || (lang === 'ar' ? 'تم قفل هذا الحساب مؤقتاً. يرجى المحاولة لاحقاً.' : 'This account is temporarily locked. Please try again later.'));
        } else if (status === 401) {
          setError(message || (lang === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صالحة.' : 'Invalid username or password.'));
        } else if (status === 400) {
          setError(message || (lang === 'ar' ? 'طلب غير صالح. يرجى التحقق من المدخلات.' : 'Invalid request. Please verify inputs.'));
        } else if (status === 429) {
          setError(lang === 'ar' ? 'طلبات كثيرة جداً. يرجى الانتظار قليلاً.' : 'Too many requests. Please wait a moment.');
        } else {
          setError(message || (lang === 'ar' ? 'فشل المصادقة. يرجى الاتصال بمسؤول النظام.' : 'Authentication failed. Please contact your system administrator.'));
        }
      } else {
        setError(lang === 'ar' ? 'خطأ في الشبكة. تعذر الاتصال بخادم HIS Core.' : 'Network error. Unable to establish connection to HIS Core server.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
      background: 'radial-gradient(circle at center, hsl(var(--bg-secondary)) 0%, hsl(var(--bg-primary)) 100%)',
      direction: isRtl ? 'rtl' : 'ltr',
    }}>
      <div className="glass-panel login-glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
        border: '1px solid hsl(var(--border-color))',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Action Controls Header */}
        <div className="login-controls-header" style={{
          position: 'absolute',
          top: '20px',
          left: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: isRtl ? 'row-reverse' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}>
          {/* Group 1: Theme and Language Buttons */}
          <div style={{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: '8px' }}>
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none',
                color: 'hsl(var(--text-secondary))',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'hsl(var(--accent-blue) / 0.05)',
                transition: 'var(--transition-smooth)',
              }}
              title={t.themeTooltip}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Language Toggle Button */}
            <button
              type="button"
              className="lang-toggle-btn"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              style={{
                background: 'none',
                border: '1px solid hsl(var(--border-color))',
                color: 'hsl(var(--text-secondary))',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 600,
                backgroundColor: 'hsl(var(--accent-blue) / 0.03)',
                transition: 'var(--transition-smooth)',
              }}
            >
              {lang === 'en' ? '🌐 العربية (AR)' : '🌐 English (EN)'}
            </button>
          </div>

          {/* Group 2: Color Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', background: 'hsl(var(--accent-blue) / 0.03)', borderRadius: '20px', border: '1px solid hsl(var(--border-color))' }}>
            {['blue', 'green', 'purple', 'red', 'orange', 'yellow', 'pink'].map((color) => {
              const hexMap: Record<string, string> = {
                blue: '#2563eb',
                green: '#0d9488',
                purple: '#8b5cf6',
                red: '#e11d48',
                orange: '#ea580c',
                yellow: '#ca8a04',
                pink: '#db2777'
              };
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColorTheme(color)}
                  className={`color-swatch color-swatch-${color}`}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: hexMap[color],
                    border: colorTheme === color ? '1.5px solid hsl(var(--text-primary))' : '1px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                    transform: colorTheme === color ? 'scale(1.2)' : 'none'
                  }}
                  title={color}
                />
              );
            })}
          </div>
        </div>

        {/* Top colored accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, hsl(var(--accent-blue)), hsl(var(--accent-teal)))',
        }} />

        {/* Brand Header */}
        <div className="login-brand-header" style={{ textAlign: 'center', marginBottom: '32px', paddingTop: '36px' }}>
          <div className="login-logo-wrapper" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, hsl(var(--accent-blue) / 0.08), hsl(var(--accent-teal) / 0.08))',
            border: '1px solid hsl(var(--accent-blue) / 0.2)',
            marginBottom: '28px',
            boxShadow: '0 4px 12px hsl(var(--accent-blue) / 0.08)'
          }}>
            {/* Hospital Cross Shield SVG */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 2Z" fill="url(#accent-grad)" fillOpacity="0.08" stroke="url(#accent-grad)" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 7V17M7 12H17" stroke="url(#accent-grad)" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="accent-grad" x1="3" y1="2" x2="21" y2="23" gradientUnits="userSpaceOnUse">
                  <stop stopColor="hsl(var(--accent-blue))" />
                  <stop offset="1" stopColor="hsl(var(--accent-teal))" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'hsl(var(--text-primary))' }}>
            {t.loginTitle}
          </h2>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '6px' }}>
            {t.loginSubtitle}
          </p>
        </div>

        {/* Global Lockout / Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'hsl(var(--danger) / 0.05)',
            border: '1px solid hsl(var(--danger) / 0.25)',
            color: 'hsl(var(--text-primary))',
            fontSize: '0.85rem',
            lineHeight: '1.4',
            marginBottom: '24px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'hsl(var(--danger))', flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <span style={{ fontWeight: 600, display: 'block', color: 'hsl(var(--danger))', marginBottom: '2px' }}>{t.securityAlert}</span>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Username Field */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'hsl(var(--text-secondary))'
            }}>
              {t.userIdLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={t.userIdPlaceholder}
                className="form-input"
                style={{
                  paddingLeft: isRtl ? '16px' : '44px',
                  paddingRight: isRtl ? '44px' : '16px',
                  borderColor: errors.username ? 'hsl(var(--danger) / 0.4)' : 'hsl(var(--border-color))'
                }}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors(prev => ({ ...prev, username: undefined }));
                }}
                disabled={isLoading}
              />
              {/* User Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{
                position: 'absolute',
                left: isRtl ? 'auto' : '16px',
                right: isRtl ? '16px' : 'auto',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'hsl(var(--text-muted))'
              }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            {errors.username && (
              <p style={{ color: 'hsl(var(--danger))', fontSize: '0.75rem', marginTop: '6px' }}>{errors.username}</p>
            )}
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '4px', display: 'block' }}>
              {t.usernameWarning}
            </span>
          </div>

          {/* Password Field */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'hsl(var(--text-secondary))'
            }}>
              {t.passwordLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t.passwordPlaceholder}
                className="form-input"
                style={{
                  paddingLeft: isRtl ? '48px' : '44px',
                  paddingRight: isRtl ? '44px' : '48px',
                  borderColor: errors.password ? 'hsl(var(--danger) / 0.4)' : 'hsl(var(--border-color))'
                }}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                disabled={isLoading}
              />
              {/* Lock Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{
                position: 'absolute',
                left: isRtl ? 'auto' : '16px',
                right: isRtl ? '16px' : 'auto',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'hsl(var(--text-muted))'
              }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>

              {/* Show/Hide Toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                style={{
                  position: 'absolute',
                  right: isRtl ? 'auto' : '16px',
                  left: isRtl ? '16px' : 'auto',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'hsl(var(--text-muted))',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? (
                  /* Eye SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  /* Eye Off SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p style={{ color: 'hsl(var(--danger))', fontSize: '0.75rem', marginTop: '6px' }}>{errors.password}</p>
            )}
          </div>

          {/* Actions */}
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '12px',
              fontSize: '0.95rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {isLoading ? (
              <>
                <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{
                  animation: 'spin 1s linear infinite',
                }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" />
                </svg>
                {t.loggingInButton}
              </>
            ) : (
              t.loginButton
            )}
          </button>
        </form>

        {/* Footer Support Text */}
        <div style={{
          textAlign: 'center',
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid hsl(var(--border-color))',
          fontSize: '0.8rem',
          color: 'hsl(var(--text-muted))'
        }}>
          {t.loginFooter}
        </div>
      </div>

      {/* Embedded CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block;
          color: #ffffff;
        }
      `}</style>
    </div>
  );
}
