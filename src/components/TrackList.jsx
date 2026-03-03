import './TrackList.css';

function formatDuration(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function formatPlays(n) {
  if (!n) return null;
  if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace('.0', '') + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return n.toString();
}

export default function TrackList({ tracks, onPlay, currentTrack, isPlaying, isInLibrary, onToggleLibrary, onArtistClick, onAddToPlaylist, onRemoveTrack }) {
  if (!tracks || tracks.length === 0) return null;

  return (
    <div className="track-list">
      {tracks.map((track, index) => {
        const isCurrent = currentTrack?.id === track.id;
        const inLib = isInLibrary(track.id);

        return (
          <div
            key={track.id}
            className={`track-item ${isCurrent ? 'track-item--active' : ''}`}
          >
            <div className="track-item__left" onClick={() => onPlay(track, tracks)}>
              <div className="track-item__cover-wrapper">
                <img
                  src={track.albumCoverSmall || track.albumCover}
                  alt={track.album}
                  className="track-item__cover"
                  loading="lazy"
                />
                {isCurrent && isPlaying ? (
                  <div className="track-item__playing">
                    <div className="eq-bar"></div>
                    <div className="eq-bar"></div>
                    <div className="eq-bar"></div>
                  </div>
                ) : (
                  <div className="track-item__play-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="track-item__info">
                <span className={`track-item__title ${isCurrent ? 'track-item__title--active' : ''}`}>
                  {track.title}
                </span>
                <span
                  className={`track-item__artist ${onArtistClick ? 'track-item__artist--link' : ''}`}
                  onClick={(e) => {
                    if (onArtistClick && track.artistId) {
                      e.stopPropagation();
                      onArtistClick(track.artistId, track.artist);
                    }
                  }}
                >
                  {track.artist}
                </span>
              </div>
            </div>
            <div className="track-item__right">
              {track.rank > 0 && (
                <span className="track-item__streams" title="Popularité Deezer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
                  </svg>
                  {formatPlays(track.rank)}
                </span>
              )}
              <span className="track-item__duration">
                {formatDuration(track.duration)}
              </span>
              {onAddToPlaylist && (
                <button
                  className="track-item__add"
                  onClick={() => onAddToPlaylist(track)}
                  title="Ajouter à une playlist"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
              {onRemoveTrack && (
                <button
                  className="track-item__remove"
                  onClick={() => onRemoveTrack(track.id)}
                  title="Retirer de la playlist"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
              <button
                className={`track-item__fav ${inLib ? 'track-item__fav--active' : ''}`}
                onClick={() => onToggleLibrary(track)}
                title={inLib ? 'Retirer de la bibliothèque' : 'Ajouter à la bibliothèque'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" 
                  fill={inLib ? 'var(--accent)' : 'none'} 
                  stroke={inLib ? 'var(--accent)' : 'currentColor'} 
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
