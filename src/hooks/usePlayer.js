import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Fetch full audio URL from our backend (yt-dlp).
 * Falls back to Deezer 30s preview if backend fails.
 */
async function fetchFullAudio(track) {
  try {
    const query = `${track.artist} ${track.title}`;
    const res = await fetch(`/api/stream?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.audioUrl) {
      // Proxy through our backend to avoid CORS with googlevideo
      return `/api/proxy-stream?url=${encodeURIComponent(data.audioUrl)}`;
    }
  } catch (err) {
    console.warn('Full audio fetch failed, falling back to preview:', err.message);
  }
  return track.preview; // Fallback to 30s Deezer preview
}

export function usePlayer(onTrackPlay) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const audioRef = useRef(null);
  const onTrackPlayRef = useRef(onTrackPlay);
  onTrackPlayRef.current = onTrackPlay;

  // Create audio element lazily
  if (!audioRef.current) {
    audioRef.current = new Audio();
  }

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      if (shuffle && queue.length > 1) {
        let nextIdx;
        do { nextIdx = Math.floor(Math.random() * queue.length); } while (nextIdx === queueIndex);
        playFromQueue(nextIdx);
      } else if (queueIndex < queue.length - 1) {
        playFromQueue(queueIndex + 1);
      } else if (repeatMode === 'all' && queue.length > 0) {
        playFromQueue(0);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };
    const onError = (e) => {
      console.error('Audio error:', audio.error?.message, audio.error?.code);
      setIsPlaying(false);
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [queueIndex, queue.length, shuffle, repeatMode]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  const startPlayback = useCallback(async (audio, track) => {
    setCurrentTrack(track);
    setIsLoading(true);
    setIsPlaying(false);
    
    // Notify history
    if (onTrackPlayRef.current) onTrackPlayRef.current(track);

    try {
      const audioUrl = await fetchFullAudio(track);
      
      audio.src = audioUrl;
      audio.preload = 'auto';
      
      // Play as soon as browser has enough data (faster than waiting for full load)
      const playWhenReady = () => {
        audio.play()
          .then(() => { setIsPlaying(true); setIsLoading(false); })
          .catch((err) => { console.error('Play failed:', err.message); setIsPlaying(false); setIsLoading(false); });
      };

      // Use canplay (not canplaythrough) for fastest start
      audio.addEventListener('canplay', playWhenReady, { once: true });
      audio.load();
    } catch (err) {
      console.error('Play failed:', err.message);
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, []);

  const playTrack = useCallback((track, trackList = null) => {
    const audio = audioRef.current;
    
    if (trackList) {
      setQueue(trackList);
      const idx = trackList.findIndex(t => t.id === track.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    }

    startPlayback(audio, track);
  }, [startPlayback]);

  const playFromQueue = useCallback((index) => {
    if (index >= 0 && index < queue.length) {
      const track = queue[index];
      setQueueIndex(index);
      startPlayback(audioRef.current, track);
    }
  }, [queue, startPlayback]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  }, [isPlaying]);

  const seek = useCallback((time) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  }, []);

  const nextTrack = useCallback(() => {
    if (shuffle && queue.length > 1) {
      let nextIdx;
      do { nextIdx = Math.floor(Math.random() * queue.length); } while (nextIdx === queueIndex);
      playFromQueue(nextIdx);
    } else if (queueIndex < queue.length - 1) {
      playFromQueue(queueIndex + 1);
    } else if (repeatMode === 'all' && queue.length > 0) {
      playFromQueue(0);
    }
  }, [queueIndex, queue.length, playFromQueue, shuffle, repeatMode]);

  const prevTrack = useCallback(() => {
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else if (queueIndex > 0) {
      playFromQueue(queueIndex - 1);
    }
  }, [queueIndex, playFromQueue]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src = '';
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsLoading(false);
    setProgress(0);
    setDuration(0);
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  const toggleShuffle = useCallback(() => setShuffle(s => !s), []);
  const toggleRepeat = useCallback(() => {
    setRepeatMode(m => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off');
  }, []);

  return {
    currentTrack,
    isPlaying,
    isLoading,
    progress,
    duration,
    volume,
    setVolume,
    playTrack,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    hasNext: shuffle || repeatMode === 'all' || queueIndex < queue.length - 1,
    hasPrev: queueIndex > 0,
    stop,
    shuffle,
    repeatMode,
    toggleShuffle,
    toggleRepeat,
  };
}
