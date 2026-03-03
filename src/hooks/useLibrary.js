import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'dextory_library';

function loadLocalLibrary() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalLibrary(tracks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
}

export function useLibrary(token) {
  const [library, setLibrary] = useState(loadLocalLibrary);
  const [syncing, setSyncing] = useState(false);

  // Load library from server when logged in
  useEffect(() => {
    if (!token) return;
    setSyncing(true);
    fetch('/api/library', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setLibrary(data);
        saveLocalLibrary(data);
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [token]);

  const addToLibrary = useCallback((track) => {
    setLibrary(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      const updated = [track, ...prev];
      saveLocalLibrary(updated);
      return updated;
    });
    // Sync to server
    if (token) {
      fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ track }),
      }).catch(() => {});
    }
  }, [token]);

  const removeFromLibrary = useCallback((trackId) => {
    setLibrary(prev => {
      const updated = prev.filter(t => t.id !== trackId);
      saveLocalLibrary(updated);
      return updated;
    });
    // Sync to server
    if (token) {
      fetch(`/api/library/${trackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [token]);

  const isInLibrary = useCallback((trackId) => {
    return library.some(t => t.id === trackId);
  }, [library]);

  return { library, addToLibrary, removeFromLibrary, isInLibrary, syncing };
}
