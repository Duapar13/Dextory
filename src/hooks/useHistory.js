import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'dextory_history';
const MAX_LOCAL = 50;

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

export function useHistory(token) {
  const [history, setHistory] = useState(loadLocal);

  // Load from server when logged in
  useEffect(() => {
    if (!token) return;
    fetch('/api/history', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setHistory(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      })
      .catch(() => {});
  }, [token]);

  const addToHistory = useCallback((track) => {
    setHistory(prev => {
      const entry = { ...track, playedAt: new Date().toISOString() };
      const updated = [entry, ...prev.filter(t => t.id !== track.id)].slice(0, MAX_LOCAL);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Sync to server
    if (token) {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ track }),
      }).catch(() => {});
    }
  }, [token]);

  return { history, addToHistory };
}
