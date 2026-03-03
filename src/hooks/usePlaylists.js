import { useState, useCallback, useEffect } from 'react';

export function usePlaylists(token) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load playlists from server
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/playlists', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setPlaylists(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const createPlaylist = useCallback(async (name) => {
    if (!token) return null;
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      const playlist = await res.json();
      setPlaylists(prev => [...prev, playlist]);
      return playlist;
    } catch { return null; }
  }, [token]);

  const deletePlaylist = useCallback(async (playlistId) => {
    if (!token) return;
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    fetch(`/api/playlists/${playlistId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [token]);

  const renamePlaylist = useCallback(async (playlistId, name) => {
    if (!token) return;
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, name } : p));
    fetch(`/api/playlists/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }, [token]);

  const addTrackToPlaylist = useCallback(async (playlistId, track) => {
    if (!token) return;
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      if (p.tracks.some(t => t.id === track.id)) return p;
      return { ...p, tracks: [...p.tracks, track] };
    }));
    fetch(`/api/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ track }),
    }).catch(() => {});
  }, [token]);

  const removeTrackFromPlaylist = useCallback(async (playlistId, trackId) => {
    if (!token) return;
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
    }));
    fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [token]);

  return {
    playlists,
    loading,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
  };
}
