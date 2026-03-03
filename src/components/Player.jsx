import { useRef, useState } from 'react';
import './Player.css';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function Player({
  currentTrack,
  isPlaying,
  isLoading,
  progress,
  duration,
  volume,
  setVolume,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  isInLibrary,
  onToggleLibrary,
  shuffle,
  repeatMode,
  onToggleShuffle,
  onToggleRepeat,
  onArtistClick,
}) {
  const progressBarRef = useRef(null);
  const fullProgressBarRef = useRef(null);
  const volumeBarRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  if (!currentTrack) return null;

  const handleProgressClick = (e) => {
    const bar = progressBarRef.current;
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(percent * duration);
  };

  const handleFullProgressInteraction = (e) => {
    e.stopPropagation();
    const bar = fullProgressBarRef.current;
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(percent * duration);
  };

  const handleVolumeClick = (e) => {
    const bar = volumeBarRef.current;
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setVolume(percent);
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const inLib = isInLibrary(currentTrack.id);

  return (
    <>
      {/* ═══ FULLSCREEN MOBILE PLAYER ═══ */}
      <div className={`player-full ${expanded ? 'player-full--open' : ''}`}>
        <div className="player-full__header">
          <button className="player-full__close" onClick={() => setExpanded(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <span className="player-full__now">En cours de lecture</span>
          <button className="player-full__more">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>

        <div className="player-full__artwork">
          <img
            src={currentTrack.albumCover || currentTrack.albumCoverSmall}
            alt={currentTrack.album}
            className="player-full__img"
          />
        </div>

        <div className="player-full__info">
          <div className="player-full__text">
            <h2 className="player-full__title">{currentTrack.title}</h2>
            <p
              className="player-full__artist"
              onClick={() => {
                setExpanded(false);
                onArtistClick && onArtistClick(currentTrack.artistId, currentTrack.artist);
              }}
            >
              {currentTrack.artist}
            </p>
          </div>
          <button
            className={`player-full__fav ${inLib ? 'player-full__fav--active' : ''}`}
            onClick={() => onToggleLibrary(currentTrack)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24"
              fill={inLib ? 'var(--accent)' : 'none'}
              stroke={inLib ? 'var(--accent)' : 'currentColor'}
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        <div className="player-full__progress">
          <div
            className="player-full__progress-bar"
            ref={fullProgressBarRef}
            onClick={handleFullProgressInteraction}
            onTouchStart={handleFullProgressInteraction}
          >
            <div className="player-full__progress-fill" style={{ width: `${progressPercent}%` }}>
              <div className="player-full__progress-thumb" />
            </div>
          </div>
          <div className="player-full__times">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-full__controls">
          <button
            className={`player-full__btn player-full__btn--mode ${shuffle ? 'player-full__btn--active' : ''}`}
            onClick={onToggleShuffle}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>
          <button className="player-full__btn" onClick={onPrev} disabled={!hasPrev}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button className="player-full__btn player-full__btn--play" onClick={onTogglePlay} disabled={isLoading}>
            {isLoading ? (
              <div className="player__spinner" />
            ) : isPlaying ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="3" width="5" height="18" rx="1.5" />
                <rect x="14" y="3" width="5" height="18" rx="1.5" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
          <button className="player-full__btn" onClick={onNext} disabled={!hasNext}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 18h2V6h-2zm-8.5-6l8.5 6V6z" transform="rotate(180 12 12)" />
            </svg>
          </button>
          <button
            className={`player-full__btn player-full__btn--mode ${repeatMode !== 'off' ? 'player-full__btn--active' : ''}`}
            onClick={onToggleRepeat}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            {repeatMode === 'one' && <span className="player-full__repeat-one">1</span>}
          </button>
        </div>
      </div>

      {/* ═══ MINI BAR PLAYER ═══ */}
      <div className="player">
        <div
          className="player__progress-bar"
          ref={progressBarRef}
          onClick={handleProgressClick}
          onTouchStart={handleProgressClick}
        >
          <div className="player__progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="player__content">
          {/* Left: track info (clickable on mobile to expand) */}
          <div className="player__track-info" onClick={() => setExpanded(true)}>
            <img
              src={currentTrack.albumCoverSmall || currentTrack.albumCover}
              alt={currentTrack.album}
              className="player__cover"
            />
            <div className="player__text">
              <span className="player__title">{currentTrack.title}</span>
              <span
                className="player__artist player__artist--clickable"
                onClick={(e) => {
                  e.stopPropagation();
                  onArtistClick && onArtistClick(currentTrack.artistId, currentTrack.artist);
                }}
              >
                {currentTrack.artist}
              </span>
            </div>
            <button
              className={`player__fav ${inLib ? 'player__fav--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleLibrary(currentTrack); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"
                fill={inLib ? 'var(--accent)' : 'none'}
                stroke={inLib ? 'var(--accent)' : 'currentColor'}
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* Center: controls */}
          <div className="player__controls">
            <button
              className={`player__btn player__btn--mode ${shuffle ? 'player__btn--mode-active' : ''}`}
              onClick={onToggleShuffle}
              title="Aléatoire"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>
            <button className="player__btn" onClick={onPrev} disabled={!hasPrev}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button className="player__btn player__btn--play" onClick={onTogglePlay} disabled={isLoading}>
              {isLoading ? (
                <div className="player__spinner" />
              ) : isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>
            <button className="player__btn" onClick={onNext} disabled={!hasNext}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 18h2V6h-2zm-8.5-6l8.5 6V6z" transform="rotate(180 12 12)" />
              </svg>
            </button>
            <button
              className={`player__btn player__btn--mode ${repeatMode !== 'off' ? 'player__btn--mode-active' : ''}`}
              onClick={onToggleRepeat}
              title={repeatMode === 'off' ? 'Répéter' : repeatMode === 'all' ? 'Répéter tout' : 'Répéter un'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {repeatMode === 'one' && <span className="player__repeat-badge">1</span>}
            </button>
          </div>

          {/* Right: time + volume (desktop only) */}
          <div className="player__right">
            <span className="player__time">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
            <div className="player__volume">
              <button className="player__vol-btn" onClick={() => setVolume(volume > 0 ? 0 : 0.7)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {volume === 0 ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      {volume > 0.4 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
                    </>
                  )}
                </svg>
              </button>
              <div className="player__volume-bar" ref={volumeBarRef} onClick={handleVolumeClick}>
                <div className="player__volume-fill" style={{ width: `${volume * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
