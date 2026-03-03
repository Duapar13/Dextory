import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './AuthPage.css';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, loading, error, clearError } = useAuth();

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'login') {
      await login(email, password);
    } else {
      await register(username, email, password);
    }
  };

  return (
    <div className="auth">
      <div className="auth__bg">
        <div className="auth__orb auth__orb--1" />
        <div className="auth__orb auth__orb--2" />
        <div className="auth__orb auth__orb--3" />
      </div>

      <div className="auth__card">
        <div className="auth__logo">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" fill="var(--accent)" />
            <circle cx="12" cy="12" r="7.5" stroke="var(--accent)" strokeWidth="1" opacity="0.5" />
          </svg>
          <h1 className="auth__brand">Dextory</h1>
        </div>

        <p className="auth__subtitle">
          {mode === 'login' ? 'Content de te revoir' : 'Crée ton compte'}
        </p>

        <form className="auth__form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth__field">
              <label className="auth__label">Pseudo</label>
              <div className="auth__input-wrap">
                <svg className="auth__input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ton_pseudo"
                  className="auth__input"
                  required
                  minLength={2}
                  autoComplete="username"
                />
              </div>
            </div>
          )}

          <div className="auth__field">
            <label className="auth__label">Email</label>
            <div className="auth__input-wrap">
              <svg className="auth__input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="auth__input"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth__field">
            <label className="auth__label">Mot de passe</label>
            <div className="auth__input-wrap">
              <svg className="auth__input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth__input"
                required
                minLength={4}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="auth__eye"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {error && <div className="auth__error">{error}</div>}

          <button type="submit" className="auth__submit" disabled={loading}>
            {loading ? (
              <div className="auth__spinner" />
            ) : (
              mode === 'login' ? 'Se connecter' : 'Créer mon compte'
            )}
          </button>
        </form>

        <div className="auth__switch">
          <span>{mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}</span>
          <button onClick={switchMode} className="auth__switch-btn">
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  );
}
