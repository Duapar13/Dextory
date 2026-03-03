import { useState, useCallback, useRef } from 'react';

export function useSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const abortRef = useRef(null);

  const search = useCallback(async (searchQuery) => {
    const trimmed = searchQuery.trim();
    setQuery(trimmed);
    
    if (!trimmed) {
      setResults([]);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const url = `/api/deezer/search?q=${encodeURIComponent(trimmed)}&limit=25`;
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      
      if (!controller.signal.aborted) {
        const tracks = (data.data || [])
          .filter(track => track.preview) // Only keep tracks with a preview URL
          .map(track => ({
            id: track.id,
            title: track.title,
            artist: track.artist?.name || 'Unknown',
            artistId: track.artist?.id,
            album: track.album?.title || 'Unknown',
            albumCover: track.album?.cover_medium || track.album?.cover,
            albumCoverSmall: track.album?.cover_small,
            albumCoverBig: track.album?.cover_big || track.album?.cover_xl,
            duration: track.duration,
            preview: track.preview,
            rank: track.rank || 0,
          }));
        setResults(tracks);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
        setResults([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
  }, []);

  return { results, loading, query, search, clearResults };
}
