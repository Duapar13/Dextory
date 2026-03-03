import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import TrackList from './TrackList';
import './AccountPage.css';

export default function AccountPage({
  // library
  library,
  isInLibrary,
  onToggleLibrary,
  // playlists
  playlists,
  createPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  // history
  history,
  // player
  onPlay,
  currentTrack,
  isPlaying,
  // actions
  onArtistClick,
  onAddToPlaylist,
}) {
  const { user, token, logout, updateProfile } = useAuth();
  const [tab, setTab] = useState('library'); // 'library' | 'profile' | 'friends'
  const [libraryTab, setLibraryTab] = useState('favorites'); // 'favorites' | 'playlists' | 'history'
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Playlist
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);

  // Collab
  const [collabPlaylist, setCollabPlaylist] = useState(null);
  const [collabFriends, setCollabFriends] = useState([]);
  const [collabList, setCollabList] = useState([]);

  // Friends
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [friendMsg, setFriendMsg] = useState('');

  const loadFriends = useCallback(async () => {
    if (!token) return;
    try {
      const [fRes, rRes] = await Promise.all([
        fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/friends/requests', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (fRes.ok) setFriends(await fRes.json());
      if (rRes.ok) setRequests(await rRes.json());
    } catch {}
  }, [token]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  if (!user) return null;
  const initial = user.displayName?.charAt(0).toUpperCase() || '?';

  // Profile handlers
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { alert('Image trop lourde (max 500KB)'); return; }
    setSavingAvatar(true);
    const reader = new FileReader();
    reader.onload = async () => {
      await updateProfile({ avatar: reader.result });
      setSavingAvatar(false);
    };
    reader.readAsDataURL(file);
  };
  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await updateProfile({ displayName: newName.trim() });
    setEditing(false);
  };

  // Playlist handlers
  const handleCreatePlaylist = async () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    await createPlaylist(name);
    setNewPlaylistName('');
    setShowNewPlaylist(false);
  };

  // Collab handlers
  const openCollabPanel = async (pl) => {
    setCollabPlaylist(pl);
    try {
      const [fRes, cRes] = await Promise.all([
        fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/playlists/${pl.id}/collaborators`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (fRes.ok) setCollabFriends(await fRes.json());
      if (cRes.ok) setCollabList(await cRes.json());
    } catch {}
  };

  const addCollaborator = async (userId) => {
    if (!collabPlaylist) return;
    try {
      const res = await fetch(`/api/playlists/${collabPlaylist.id}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCollabList(data.collaborators);
      }
    } catch {}
  };

  const removeCollaborator = async (userId) => {
    if (!collabPlaylist) return;
    try {
      await fetch(`/api/playlists/${collabPlaylist.id}/collaborators/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setCollabList(prev => prev.filter(c => c.id !== userId));
    } catch {}
  };

  // Friends handlers
  const handleSearchUsers = async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSearchResults(await res.json());
    } catch {}
    setSearchLoading(false);
  };

  const handleSendRequest = async (userId) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      setFriendMsg(data.message || (res.ok ? 'Demande envoyée !' : data.error));
      if (data.status === 'accepted') loadFriends();
      setTimeout(() => setFriendMsg(''), 3000);
    } catch {}
  };

  const handleAccept = async (requestId) => {
    await fetch('/api/friends/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId }),
    });
    loadFriends();
  };

  const handleDecline = async (requestId) => {
    await fetch('/api/friends/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId }),
    });
    loadFriends();
  };

  const handleRemoveFriend = async (friendId) => {
    await fetch(`/api/friends/${friendId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadFriends();
  };

  const currentPl = selectedPlaylist ? playlists.find(p => p.id === selectedPlaylist.id) : null;

  return (
    <div className="account">
      {/* Profile header */}
      <div className="account__profile-bar">
        <div className="account__avatar-mini" onClick={() => fileInputRef.current?.click()}>
          {user.avatar ? (
            <img src={user.avatar} alt="avatar" />
          ) : (
            <span>{initial}</span>
          )}
          <div className="account__avatar-mini-overlay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          {savingAvatar && <div className="account__avatar-mini-loading" />}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
        <div className="account__profile-info">
          {editing ? (
            <div className="account__edit-inline">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Pseudo..."
                className="account__edit-input"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              />
              <button className="account__edit-save" onClick={handleSaveName}>✓</button>
              <button className="account__edit-cancel" onClick={() => setEditing(false)}>✕</button>
            </div>
          ) : (
            <div className="account__name-row">
              <h2 className="account__name">{user.displayName}</h2>
              <button className="account__edit-btn" onClick={() => { setNewName(user.displayName); setEditing(true); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}
          <span className="account__username">@{user.username}</span>
        </div>
        <button className="account__logout-btn" onClick={logout} title="Se déconnecter">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="account__tabs">
        <button className={`account__tab ${tab === 'library' ? 'account__tab--active' : ''}`} onClick={() => { setTab('library'); setSelectedPlaylist(null); setCollabPlaylist(null); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Ma Bibli
        </button>
        <button className={`account__tab ${tab === 'friends' ? 'account__tab--active' : ''}`} onClick={() => setTab('friends')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Amis
          {requests.length > 0 && <span className="account__tab-badge">{requests.length}</span>}
        </button>
      </div>

      {/* ===== LIBRARY TAB ===== */}
      {tab === 'library' && (
        <div className="account__library">
          {/* Library sub-tabs */}
          <div className="account__subtabs">
            <button className={`account__subtab ${libraryTab === 'favorites' ? 'account__subtab--active' : ''}`} onClick={() => { setLibraryTab('favorites'); setSelectedPlaylist(null); setCollabPlaylist(null); }}>
              ❤️ Favoris
              {library.length > 0 && <span className="account__subtab-count">{library.length}</span>}
            </button>
            <button className={`account__subtab ${libraryTab === 'playlists' ? 'account__subtab--active' : ''}`} onClick={() => { setLibraryTab('playlists'); setSelectedPlaylist(null); setCollabPlaylist(null); }}>
              🎵 Playlists
              {playlists.length > 0 && <span className="account__subtab-count">{playlists.length}</span>}
            </button>
            <button className={`account__subtab ${libraryTab === 'history' ? 'account__subtab--active' : ''}`} onClick={() => { setLibraryTab('history'); setSelectedPlaylist(null); setCollabPlaylist(null); }}>
              🕐 Historique
            </button>
          </div>

          {/* Favorites */}
          {libraryTab === 'favorites' && (
            <div className="account__lib-content">
              {library.length === 0 ? (
                <div className="account__lib-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <p>Ta bibliothèque est vide</p>
                  <span>Clique sur le ❤️ pour ajouter des morceaux</span>
                </div>
              ) : (
                <TrackList
                  tracks={library}
                  onPlay={onPlay}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  isInLibrary={isInLibrary}
                  onToggleLibrary={onToggleLibrary}
                  onArtistClick={onArtistClick}
                  onAddToPlaylist={onAddToPlaylist}
                />
              )}
            </div>
          )}

          {/* Playlists list */}
          {libraryTab === 'playlists' && !selectedPlaylist && (
            <div className="account__lib-content">
              <div className="account__lib-header">
                <button className="account__create-btn" onClick={() => setShowNewPlaylist(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Nouvelle playlist
                </button>
              </div>

              {showNewPlaylist && (
                <div className="account__new-playlist">
                  <input
                    value={newPlaylistName}
                    onChange={e => setNewPlaylistName(e.target.value)}
                    placeholder="Nom de la playlist..."
                    className="account__new-playlist-input"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()}
                  />
                  <button className="account__new-playlist-ok" onClick={handleCreatePlaylist}>OK</button>
                  <button className="account__new-playlist-cancel" onClick={() => { setShowNewPlaylist(false); setNewPlaylistName(''); }}>✕</button>
                </div>
              )}

              {playlists.length === 0 && !showNewPlaylist && (
                <div className="account__lib-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                  <p>Aucune playlist</p>
                  <span>Crée ta première playlist</span>
                </div>
              )}

              <div className="account__playlists-list">
                {playlists.map(pl => (
                  <div key={pl.id} className="account__pl-card" onClick={() => setSelectedPlaylist(pl)}>
                    <div className="account__pl-card-cover">
                      {pl.tracks.length > 0 ? (
                        <img src={pl.tracks[0].albumCoverSmall || pl.tracks[0].albumCover} alt="" />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                      )}
                    </div>
                    <div className="account__pl-card-info">
                      <span className="account__pl-card-name">{pl.name}</span>
                      <span className="account__pl-card-meta">
                        {pl.tracks.length} titre{pl.tracks.length !== 1 ? 's' : ''}
                        {pl.ownerName ? ` · par ${pl.ownerName}` : ''}
                        {(pl.collaborators || []).length > 0 && (
                          <span className="account__pl-collab-badge">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                            </svg>
                            {pl.collaborators.length}
                          </span>
                        )}
                      </span>
                    </div>
                    {pl.isOwner === false && <span className="account__pl-badge">Collab</span>}
                    {pl.isOwner !== false && (
                      <button className="account__pl-delete" onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }} title="Supprimer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playlist detail */}
          {libraryTab === 'playlists' && selectedPlaylist && (
            <div className="account__lib-content">
              <button className="account__back-btn" onClick={() => { setSelectedPlaylist(null); setCollabPlaylist(null); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Retour
              </button>

              <div className="account__pl-detail-header">
                <div className="account__pl-detail-cover">
                  {currentPl && currentPl.tracks.length > 0 ? (
                    <img src={currentPl.tracks[0].albumCover || currentPl.tracks[0].albumCoverSmall} alt="" />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                  )}
                </div>
                <div className="account__pl-detail-info">
                  <h3>{selectedPlaylist.name}</h3>
                  <span>{(currentPl?.tracks || []).length} titre(s)</span>
                  {selectedPlaylist.ownerName && <span className="account__pl-detail-owner">par {selectedPlaylist.ownerName}</span>}
                </div>
                {selectedPlaylist.isOwner !== false && (
                  <button
                    className={`account__pl-share-btn ${collabPlaylist?.id === selectedPlaylist.id ? 'account__pl-share-btn--active' : ''}`}
                    onClick={() => collabPlaylist?.id === selectedPlaylist.id ? setCollabPlaylist(null) : openCollabPanel(selectedPlaylist)}
                    title="Partager / Collaborateurs"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Collab panel inline */}
              {collabPlaylist?.id === selectedPlaylist.id && (
                <div className="account__collab-panel">
                  <h4 className="account__collab-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Collaborateurs
                  </h4>

                  {/* Current collaborators */}
                  {collabList.length > 0 && (
                    <div className="account__collab-list">
                      {collabList.map(c => (
                        <div key={c.id} className="account__collab-row">
                          <div className="account__collab-avatar">
                            {c.avatar ? <img src={c.avatar} alt="" /> : c.displayName?.charAt(0).toUpperCase()}
                          </div>
                          <span className="account__collab-name">{c.displayName}</span>
                          <button className="account__collab-remove" onClick={() => removeCollaborator(c.id)} title="Retirer">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add friends */}
                  <div className="account__collab-add">
                    <span className="account__collab-add-label">Ajouter un ami :</span>
                    <div className="account__collab-friends">
                      {collabFriends.filter(f => !collabList.some(c => c.id === f.id)).map(f => (
                        <button key={f.id} className="account__collab-friend-btn" onClick={() => addCollaborator(f.id)}>
                          <div className="account__collab-friend-avatar">
                            {f.avatar ? <img src={f.avatar} alt="" /> : f.displayName?.charAt(0).toUpperCase()}
                          </div>
                          {f.displayName}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      ))}
                      {collabFriends.filter(f => !collabList.some(c => c.id === f.id)).length === 0 && (
                        <span className="account__collab-none">Aucun ami disponible</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(currentPl?.tracks || []).length === 0 ? (
                <div className="account__lib-empty">
                  <p>Playlist vide</p>
                  <span>Ajoute des morceaux depuis la recherche</span>
                </div>
              ) : (
                <TrackList
                  tracks={currentPl.tracks}
                  onPlay={onPlay}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  isInLibrary={isInLibrary}
                  onToggleLibrary={onToggleLibrary}
                  onArtistClick={onArtistClick}
                  onRemoveTrack={trackId => removeTrackFromPlaylist(selectedPlaylist.id, trackId)}
                />
              )}
            </div>
          )}

          {/* History */}
          {libraryTab === 'history' && (
            <div className="account__lib-content">
              {history.length === 0 ? (
                <div className="account__lib-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <p>Aucun historique</p>
                  <span>Écoute de la musique pour voir ton historique ici</span>
                </div>
              ) : (
                <TrackList
                  tracks={history}
                  onPlay={onPlay}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  isInLibrary={isInLibrary}
                  onToggleLibrary={onToggleLibrary}
                  onArtistClick={onArtistClick}
                  onAddToPlaylist={onAddToPlaylist}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== FRIENDS TAB ===== */}
      {tab === 'friends' && (
        <div className="account__friends">
          <div className="account__friend-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={searchQuery}
              onChange={e => handleSearchUsers(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              className="account__friend-search-input"
            />
            {searchLoading && <div className="account__friend-search-spin" />}
          </div>

          {friendMsg && <p className="account__friend-msg">{friendMsg}</p>}

          {searchResults.length > 0 && (
            <div className="account__friend-results">
              {searchResults.map(u => {
                const isFriend = friends.some(f => f.id === u.id);
                return (
                  <div key={u.id} className="account__friend-card">
                    <div className="account__friend-avatar">
                      {u.avatar ? <img src={u.avatar} alt="" /> : u.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="account__friend-info">
                      <span className="account__friend-name">{u.displayName}</span>
                      <span className="account__friend-username">@{u.username}</span>
                    </div>
                    {isFriend ? (
                      <span className="account__friend-status">Ami ✓</span>
                    ) : (
                      <button className="account__friend-add" onClick={() => handleSendRequest(u.id)}>Ajouter</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {requests.length > 0 && (
            <div className="account__friend-section">
              <h3>Demandes reçues</h3>
              {requests.map(r => (
                <div key={r.id} className="account__friend-card">
                  <div className="account__friend-avatar">
                    {r.from.avatar ? <img src={r.from.avatar} alt="" /> : r.from.displayName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="account__friend-info">
                    <span className="account__friend-name">{r.from.displayName}</span>
                    <span className="account__friend-username">@{r.from.username}</span>
                  </div>
                  <div className="account__friend-actions">
                    <button className="account__friend-accept" onClick={() => handleAccept(r.id)}>✓</button>
                    <button className="account__friend-decline" onClick={() => handleDecline(r.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="account__friend-section">
            <h3>Mes amis ({friends.length})</h3>
            {friends.length === 0 ? (
              <p className="account__friend-empty">Recherche des utilisateurs pour ajouter des amis</p>
            ) : (
              friends.map(f => (
                <div key={f.id} className="account__friend-card">
                  <div className="account__friend-avatar">
                    {f.avatar ? <img src={f.avatar} alt="" /> : f.displayName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="account__friend-info">
                    <span className="account__friend-name">{f.displayName}</span>
                    <span className="account__friend-username">@{f.username}</span>
                  </div>
                  <button className="account__friend-remove" onClick={() => handleRemoveFriend(f.id)} title="Supprimer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
