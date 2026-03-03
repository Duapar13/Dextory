import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'dextory_token';
const USER_KEY = 'dextory_user';

function getStored() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    return token && user ? { token, user } : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStored()?.user || null);
  const [token, setToken] = useState(() => getStored()?.token || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLoggedIn = !!token && !!user;

  const saveAuth = (data) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  };

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const register = useCallback(async (username, email, password) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inscription');
      saveAuth(data);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur connexion');
      saveAuth(data);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
  }, []);

  const updateProfile = useCallback(async (data) => {
    if (!token) return false;
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Erreur');
      setUser(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [token]);

  const clearError = useCallback(() => setError(''), []);

  // Verify token on mount
  useEffect(() => {
    if (!token) return;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      if (!res.ok) clearAuth();
    }).catch(() => clearAuth());
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn, loading, error, register, login, logout, updateProfile, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
