import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import Player from './components/Player';
import AuthPage from './components/AuthPage';
import AccountPage from './components/AccountPage';
import ArtistPage from './components/ArtistPage';
import HomePage from './components/HomePage';
import { useSearch } from './hooks/useSearch';
import { useLibrary } from './hooks/useLibrary';
import { usePlayer } from './hooks/usePlayer';
import { useAuth } from './hooks/useAuth';
import { useHistory } from './hooks/useHistory';
import { usePlaylists } from './hooks/usePlaylists';
import './App.css';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState(null);

  const { results, loading, query, search, clearResults } = useSearch();
  const { user, isLoggedIn, token } = useAuth();
  const { library, addToLibrary, removeFromLibrary, isInLibrary } = useLibrary(token);
  const { history, addToHistory } = useHistory(token);
  const {
    playlists, createPlaylist, deletePlaylist, renamePlaylist,
    addTrackToPlaylist, removeTrackFromPlaylist,
  } = usePlaylists(token);
  const player = usePlayer(addToHistory);

  useEffect(() => {
    if (!isLoggedIn) player.stop();
  }, [isLoggedIn]);

  if (!isLoggedIn) return <AuthPage />;

  const handleToggleLibrary = (track) => {
    if (isInLibrary(track.id)) removeFromLibrary(track.id);
    else addToLibrary(track);
  };

  const handlePlay = (track, trackList) => {
    player.playTrack(track, trackList);
  };

  const handleArtistClick = (artistId, artistName) => {
    if (artistId) {
      navigate(`/artiste/${artistId}`, { state: { artistName } });
    }
  };

  const handleAddToPlaylist = (playlistId) => {
    if (addToPlaylistTrack) {
      addTrackToPlaylist(playlistId, addToPlaylistTrack);
      setAddToPlaylistTrack(null);
    }
  };

  const currentPath = location.pathname;
  const isHome = currentPath === '/' || currentPath === '/homepage';
  const isProfile = currentPath === '/profil';

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__logo" onClick={() => { navigate('/homepage'); clearResults(); }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" fill="var(--accent)" />
            <circle cx="12" cy="12" r="7.5" stroke="var(--accent)" strokeWidth="1" opacity="0.5" />
          </svg>
          <h1 className="app__title">Dextory</h1>
        </div>
        <nav className="app__nav">
          <button
            className={`app__nav-btn ${isHome ? 'app__nav-btn--active' : ''}`}
            onClick={() => navigate('/homepage')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Accueil</span>
          </button>
          <button
            className={`app__nav-btn ${isProfile ? 'app__nav-btn--active' : ''}`}
            onClick={() => navigate('/profil')}
          >
            <div className="app__nav-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                user?.displayName?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            <span>Mon profil</span>
          </button>
        </nav>
      </header>

      <main className={`app__main ${player.currentTrack ? 'app__main--with-player' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/homepage" replace />} />
          <Route path="/homepage" element={
            <HomePage
              user={user}
              history={history}
              playlists={playlists}
              onSearch={search}
              searchResults={results}
              searchQuery={query}
              searchLoading={loading}
              onPlay={handlePlay}
              currentTrack={player.currentTrack}
              isPlaying={player.isPlaying}
              isInLibrary={isInLibrary}
              onToggleLibrary={handleToggleLibrary}
              onArtistClick={handleArtistClick}
              onOpenPlaylist={() => navigate('/profil')}
              onAddToPlaylist={setAddToPlaylistTrack}
            />
          } />
          <Route path="/profil" element={
            <AccountPage
              library={library}
              isInLibrary={isInLibrary}
              onToggleLibrary={handleToggleLibrary}
              playlists={playlists}
              createPlaylist={createPlaylist}
              deletePlaylist={deletePlaylist}
              addTrackToPlaylist={addTrackToPlaylist}
              removeTrackFromPlaylist={removeTrackFromPlaylist}
              history={history}
              onPlay={handlePlay}
              currentTrack={player.currentTrack}
              isPlaying={player.isPlaying}
              onArtistClick={handleArtistClick}
              onAddToPlaylist={setAddToPlaylistTrack}
            />
          } />
          <Route path="/artiste/:artistId" element={
            <ArtistPageWrapper
              onBack={() => navigate(-1)}
              onPlay={handlePlay}
              currentTrack={player.currentTrack}
              isPlaying={player.isPlaying}
              isInLibrary={isInLibrary}
              onToggleLibrary={handleToggleLibrary}
            />
          } />
          <Route path="*" element={<Navigate to="/homepage" replace />} />
        </Routes>
      </main>

      {/* Add to playlist modal */}
      {addToPlaylistTrack && (
        <div className="app__modal-overlay" onClick={() => setAddToPlaylistTrack(null)}>
          <div className="app__modal" onClick={e => e.stopPropagation()}>
            <h3>Ajouter à une playlist</h3>
            <p className="app__modal-track">{addToPlaylistTrack.title} — {addToPlaylistTrack.artist}</p>
            {playlists.length === 0 ? (
              <p className="app__modal-empty">Aucune playlist. Crée-en une d'abord !</p>
            ) : (
              <div className="app__modal-list">
                {playlists.map(pl => (
                  <button key={pl.id} className="app__modal-item" onClick={() => handleAddToPlaylist(pl.id)}>
                    {pl.name}
                    <span>{pl.tracks.length} titres</span>
                  </button>
                ))}
              </div>
            )}
            <button className="app__modal-close" onClick={() => setAddToPlaylistTrack(null)}>Fermer</button>
          </div>
        </div>
      )}

      <Player
        currentTrack={player.currentTrack}
        isPlaying={player.isPlaying}
        isLoading={player.isLoading}
        progress={player.progress}
        duration={player.duration}
        volume={player.volume}
        setVolume={player.setVolume}
        onTogglePlay={player.togglePlay}
        onSeek={player.seek}
        onNext={player.nextTrack}
        onPrev={player.prevTrack}
        hasNext={player.hasNext}
        hasPrev={player.hasPrev}
        isInLibrary={isInLibrary}
        onToggleLibrary={handleToggleLibrary}
        shuffle={player.shuffle}
        repeatMode={player.repeatMode}
        onToggleShuffle={player.toggleShuffle}
        onToggleRepeat={player.toggleRepeat}
        onArtistClick={handleArtistClick}
      />
    </div>
  );
}

// Wrapper to extract artistId from URL params
function ArtistPageWrapper({ onBack, onPlay, currentTrack, isPlaying, isInLibrary, onToggleLibrary }) {
  const params = useParams();
  const location = useLocation();
  const artistName = location.state?.artistName || '';

  return (
    <ArtistPage
      artistId={params.artistId}
      artistName={artistName}
      onBack={onBack}
      onPlay={onPlay}
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      isInLibrary={isInLibrary}
      onToggleLibrary={onToggleLibrary}
    />
  );
}

export default App;
