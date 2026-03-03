import { useState, useEffect } from 'react';
import './ArtistPage.css';

function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return n.toString();
}

function formatDuration(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function ArtistPage({ artistId, artistName, onBack, onPlay, currentTrack, isPlaying, isInLibrary, onToggleLibrary }) {
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllTracks, setShowAllTracks] = useState(false);

  useEffect(() => {
    if (!artistId) return;
    setLoading(true);
    setSelectedAlbum(null);
    setAlbumTracks([]);
    setShowAllTracks(false);

    Promise.all([
      fetch(`/api/deezer/artist/${artistId}`).then(r => r.json()),
      fetch(`/api/deezer/artist/${artistId}/top?limit=20`).then(r => r.json()),
      fetch(`/api/deezer/artist/${artistId}/albums?limit=50`).then(r => r.json()),
    ])
      .then(([artistData, topData, albumsData]) => {
        setArtist(artistData);
        setTopTracks(
          (topData.data || []).map(t => ({
            id: t.id,
            title: t.title,
            artist: t.artist?.name || artistName,
            artistId: t.artist?.id || artistId,
            album: t.album?.title || '',
            albumCover: t.album?.cover_medium || t.album?.cover,
            albumCoverSmall: t.album?.cover_small,
            albumCoverBig: t.album?.cover_big || t.album?.cover_xl,
            duration: t.duration,
            preview: t.preview,
          }))
        );
        setAlbums(
          (albumsData.data || [])
            .filter(a => a.record_type !== 'single' || true) // Keep everything
            .map(a => ({
              id: a.id,
              title: a.title,
              cover: a.cover_medium || a.cover,
              coverBig: a.cover_big || a.cover_xl,
              releaseDate: a.release_date,
              type: a.record_type,
              nbTracks: a.nb_tracks,
            }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [artistId]);

  const handleAlbumClick = async (album) => {
    if (selectedAlbum?.id === album.id) {
      setSelectedAlbum(null);
      setAlbumTracks([]);
      return;
    }
    setSelectedAlbum(album);
    try {
      const res = await fetch(`/api/deezer/album/${album.id}/tracks?limit=50`);
      const data = await res.json();
      setAlbumTracks(
        (data.data || []).map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist?.name || artist?.name || artistName,
          artistId: t.artist?.id || artistId,
          album: album.title,
          albumCover: album.cover,
          albumCoverSmall: album.cover,
          albumCoverBig: album.coverBig,
          duration: t.duration,
          preview: t.preview,
        }))
      );
    } catch (err) {
      console.error('Album tracks fetch error:', err);
    }
  };

  if (loading) {
    return (
      <div className="artist-page">
        <button className="artist-page__back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <div className="artist-page__loading">
          <div className="artist-page__spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  const displayedTracks = showAllTracks ? topTracks : topTracks.slice(0, 5);

  return (
    <div className="artist-page">
      <button className="artist-page__back" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      {/* Hero */}
      <div className="artist-page__hero">
        <img
          src={artist?.picture_xl || artist?.picture_big || artist?.picture_medium}
          alt={artist?.name}
          className="artist-page__picture"
        />
        <div className="artist-page__hero-overlay" />
        <div className="artist-page__hero-info">
          <h1 className="artist-page__name">{artist?.name}</h1>
          <div className="artist-page__stats">
            <span>{formatNumber(artist?.nb_fan)} fans</span>
            <span>•</span>
            <span>{artist?.nb_album} album{artist?.nb_album !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Top Tracks */}
      {topTracks.length > 0 && (
        <section className="artist-page__section">
          <h2 className="artist-page__section-title">Titres populaires</h2>
          <div className="artist-page__tracks">
            {displayedTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const inLib = isInLibrary(track.id);
              return (
                <div
                  key={track.id}
                  className={`artist-page__track ${isCurrent ? 'artist-page__track--active' : ''}`}
                >
                  <span className="artist-page__track-num">
                    {isCurrent && isPlaying ? (
                      <div className="artist-page__eq">
                        <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                      </div>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <div className="artist-page__track-main" onClick={() => onPlay(track, topTracks)}>
                    <img src={track.albumCoverSmall || track.albumCover} alt="" className="artist-page__track-cover" />
                    <div className="artist-page__track-info">
                      <span className={`artist-page__track-title ${isCurrent ? 'artist-page__track-title--active' : ''}`}>
                        {track.title}
                      </span>
                      <span className="artist-page__track-album">{track.album}</span>
                    </div>
                  </div>
                  <span className="artist-page__track-dur">{formatDuration(track.duration)}</span>
                  <button
                    className={`artist-page__track-fav ${inLib ? 'artist-page__track-fav--active' : ''}`}
                    onClick={() => onToggleLibrary(track)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24"
                      fill={inLib ? 'var(--accent)' : 'none'}
                      stroke={inLib ? 'var(--accent)' : 'currentColor'}
                      strokeWidth="2"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
          {topTracks.length > 5 && (
            <button className="artist-page__show-more" onClick={() => setShowAllTracks(s => !s)}>
              {showAllTracks ? 'Voir moins' : `Voir tout (${topTracks.length})`}
            </button>
          )}
        </section>
      )}

      {/* Discography */}
      {albums.length > 0 && (
        <section className="artist-page__section">
          <h2 className="artist-page__section-title">Discographie</h2>
          <div className="artist-page__albums">
            {albums.map(album => (
              <div key={album.id}>
                <div
                  className={`artist-page__album ${selectedAlbum?.id === album.id ? 'artist-page__album--selected' : ''}`}
                  onClick={() => handleAlbumClick(album)}
                >
                  <img src={album.cover} alt={album.title} className="artist-page__album-cover" />
                  <div className="artist-page__album-info">
                    <span className="artist-page__album-title">{album.title}</span>
                    <span className="artist-page__album-meta">
                      {album.releaseDate?.slice(0, 4)} • {album.type === 'single' ? 'Single' : album.type === 'ep' ? 'EP' : 'Album'}
                    </span>
                  </div>
                </div>
                {selectedAlbum?.id === album.id && albumTracks.length > 0 && (
                  <div className="artist-page__album-tracks">
                    {albumTracks.map((track, idx) => {
                      const isCurrent = currentTrack?.id === track.id;
                      const inLib = isInLibrary(track.id);
                      return (
                        <div
                          key={track.id}
                          className={`artist-page__track artist-page__track--album ${isCurrent ? 'artist-page__track--active' : ''}`}
                        >
                          <span className="artist-page__track-num">
                            {isCurrent && isPlaying ? (
                              <div className="artist-page__eq">
                                <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                              </div>
                            ) : (
                              idx + 1
                            )}
                          </span>
                          <div className="artist-page__track-main" onClick={() => onPlay(track, albumTracks)}>
                            <div className="artist-page__track-info">
                              <span className={`artist-page__track-title ${isCurrent ? 'artist-page__track-title--active' : ''}`}>
                                {track.title}
                              </span>
                            </div>
                          </div>
                          <span className="artist-page__track-dur">{formatDuration(track.duration)}</span>
                          <button
                            className={`artist-page__track-fav ${inLib ? 'artist-page__track-fav--active' : ''}`}
                            onClick={() => onToggleLibrary(track)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24"
                              fill={inLib ? 'var(--accent)' : 'none'}
                              stroke={inLib ? 'var(--accent)' : 'currentColor'}
                              strokeWidth="2"
                            >
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
