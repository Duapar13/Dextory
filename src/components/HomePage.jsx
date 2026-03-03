import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import TrackList from './TrackList';
import './HomePage.css';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function HomePage({
  user,
  history,
  playlists,
  // search
  onSearch,
  searchResults,
  searchQuery,
  searchLoading,
  // player
  onPlay,
  currentTrack,
  isPlaying,
  // library
  isInLibrary,
  onToggleLibrary,
  // actions
  onArtistClick,
  onOpenPlaylist,
  onAddToPlaylist,
}) {
  const [trending, setTrending] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/deezer/chart/0/tracks?limit=20');
        const data = await res.json();
        if (!cancelled && data.data) {
          setTrending(data.data.map(t => ({
            id: t.id, title: t.title,
            artist: t.artist?.name || 'Unknown', artistId: t.artist?.id,
            album: t.album?.title || '',
            albumCover: t.album?.cover_medium || t.album?.cover,
            albumCoverSmall: t.album?.cover_small,
            albumCoverBig: t.album?.cover_big || t.album?.cover_xl,
            duration: t.duration, preview: t.preview,
            rank: t.rank || t.position || 0,
          })));
        }
      } catch {}
      setLoadingTrending(false);
    };
    const fetchSuggestions = async () => {
      try {
        const res = await fetch('/api/deezer/editorial/0/charts?limit=15');
        const data = await res.json();
        if (!cancelled && data.tracks?.data) {
          setSuggestions(data.tracks.data.slice(0, 15).map(t => ({
            id: t.id, title: t.title,
            artist: t.artist?.name || 'Unknown', artistId: t.artist?.id,
            album: t.album?.title || '',
            albumCover: t.album?.cover_medium || t.album?.cover,
            albumCoverSmall: t.album?.cover_small,
            albumCoverBig: t.album?.cover_big || t.album?.cover_xl,
            duration: t.duration, preview: t.preview,
            rank: t.rank || 0,
          })));
        }
      } catch {}
    };
    fetchTrending();
    fetchSuggestions();
    return () => { cancelled = true; };
  }, []);

  const showResults = searchQuery && searchQuery.trim().length > 0;
  const recentTracks = history.slice(0, 8);
  const topPlaylists = playlists.slice(0, 6);

  return (
    <div className="home">
      {/* Hero */}
      <div className="home__hero">
        <h1 className="home__greeting">
          {getGreeting()}, <span>{user?.displayName}</span> 👋
        </h1>
        <p className="home__subtitle">Quoi de neuf aujourd'hui ?</p>
        <div className="home__search-wrapper">
          <SearchBar onSearch={onSearch} loading={searchLoading} />
        </div>
      </div>

      {/* ===== SEARCH RESULTS (inline) ===== */}
      {showResults && (
        <section className="home__section home__results-section">
          <div className="home__results-header">
            <h2 className="home__section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              Résultats pour « {searchQuery} »
            </h2>
            <span className="home__results-count">
              {searchResults.length} titre{searchResults.length !== 1 ? 's' : ''}
            </span>
          </div>
          {searchResults.length === 0 && !searchLoading && (
            <div className="home__empty home__empty--small">
              <p>Aucun résultat</p>
              <span>Essaie avec d'autres mots-clés</span>
            </div>
          )}
          <TrackList
            tracks={searchResults}
            onPlay={onPlay}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            isInLibrary={isInLibrary}
            onToggleLibrary={onToggleLibrary}
            onArtistClick={onArtistClick}
            onAddToPlaylist={onAddToPlaylist}
          />
        </section>
      )}

      {/* ===== DASHBOARD (hidden when searching) ===== */}
      {!showResults && (
        <>
          {/* Playlists */}
          {topPlaylists.length > 0 && (
            <section className="home__section">
              <h2 className="home__section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
                Tes playlists
              </h2>
              <div className="home__playlist-grid">
                {topPlaylists.map(pl => (
                  <div key={pl.id} className="home__playlist-tile" onClick={() => onOpenPlaylist(pl)}>
                    <div className="home__playlist-tile-cover">
                      {pl.tracks.length > 0 ? (
                        <img src={pl.tracks[0].albumCover || pl.tracks[0].albumCoverSmall} alt="" />
                      ) : (
                        <div className="home__playlist-tile-empty">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="home__playlist-tile-name">{pl.name}</span>
                    <span className="home__playlist-tile-count">
                      {pl.tracks.length} titre{pl.tracks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recently played */}
          {recentTracks.length > 0 && (
            <section className="home__section">
              <h2 className="home__section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                Écoutés récemment
              </h2>
              <div className="home__scroll-row">
                {recentTracks.map(track => (
                  <div
                    key={track.id + (track.playedAt || '')}
                    className={`home__track-card ${currentTrack?.id === track.id ? 'home__track-card--active' : ''}`}
                    onClick={() => onPlay(track, recentTracks)}
                  >
                    <div className="home__track-card-cover">
                      <img src={track.albumCover || track.albumCoverSmall} alt={track.album} loading="lazy" />
                      <div className="home__track-card-play">
                        {currentTrack?.id === track.id && isPlaying ? (
                          <div className="home__eq"><span /><span /><span /></div>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                        )}
                      </div>
                    </div>
                    <span className="home__track-card-title">{track.title}</span>
                    <span className="home__track-card-artist" onClick={e => { e.stopPropagation(); onArtistClick(track.artistId, track.artist); }}>
                      {track.artist}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <section className="home__section">
              <h2 className="home__section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
                Tendances
              </h2>
              <div className="home__scroll-row">
                {trending.map((track, i) => (
                  <div
                    key={track.id}
                    className={`home__track-card ${currentTrack?.id === track.id ? 'home__track-card--active' : ''}`}
                    onClick={() => onPlay(track, trending)}
                  >
                    <div className="home__track-card-cover">
                      <img src={track.albumCover || track.albumCoverSmall} alt={track.album} loading="lazy" />
                      <span className="home__track-card-rank">#{i + 1}</span>
                      <div className="home__track-card-play">
                        {currentTrack?.id === track.id && isPlaying ? (
                          <div className="home__eq"><span /><span /><span /></div>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                        )}
                      </div>
                    </div>
                    <span className="home__track-card-title">{track.title}</span>
                    <span className="home__track-card-artist" onClick={e => { e.stopPropagation(); onArtistClick(track.artistId, track.artist); }}>
                      {track.artist}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <section className="home__section">
              <h2 className="home__section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
                </svg>
                Suggestions pour toi
              </h2>
              <div className="home__scroll-row">
                {suggestions.map(track => (
                  <div
                    key={track.id}
                    className={`home__track-card ${currentTrack?.id === track.id ? 'home__track-card--active' : ''}`}
                    onClick={() => onPlay(track, suggestions)}
                  >
                    <div className="home__track-card-cover">
                      <img src={track.albumCover || track.albumCoverSmall} alt={track.album} loading="lazy" />
                      <div className="home__track-card-play">
                        {currentTrack?.id === track.id && isPlaying ? (
                          <div className="home__eq"><span /><span /><span /></div>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                        )}
                      </div>
                    </div>
                    <span className="home__track-card-title">{track.title}</span>
                    <span className="home__track-card-artist" onClick={e => { e.stopPropagation(); onArtistClick(track.artistId, track.artist); }}>
                      {track.artist}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty */}
          {recentTracks.length === 0 && topPlaylists.length === 0 && trending.length === 0 && !loadingTrending && (
            <div className="home__empty">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="0.8">
                <circle cx="12" cy="12" r="11" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="7.5" opacity="0.5" />
              </svg>
              <p>Bienvenue sur Dextory !</p>
              <span>Utilise la barre de recherche pour trouver ta musique</span>
            </div>
          )}

          {loadingTrending && trending.length === 0 && (
            <div className="home__loading">
              <div className="home__loading-spinner" />
              <span>Chargement des tendances...</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
