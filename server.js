import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const exec = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 8020;
const JWT_SECRET = 'dextory_secret_key_2026';
const DB_PATH = './db.json';

app.use(cors());
app.use(express.json());

// ─── Strip /api prefix (production compatibility) ──────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/deezer')) {
    req.url = req.url.replace(/^\/api/, '');
  }
  next();
});

// ─── Simple JSON DB ────────────────────────────────────────────
function loadDB() {
  if (!existsSync(DB_PATH)) {
    const initial = { users: [], libraries: {}, history: {}, playlists: {}, friends: {}, friendRequests: {} };
    writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const db = JSON.parse(readFileSync(DB_PATH, 'utf-8'));
  if (!db.history) db.history = {};
  if (!db.playlists) db.playlists = {};
  if (!db.friends) db.friends = {};
  if (!db.friendRequests) db.friendRequests = {};
  return db;
}

function saveDB(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ─── Auth Middleware ───────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.userId = decoded.id;
    req.username = decoded.username;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// ─── Auth Routes ───────────────────────────────────────────────
app.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 4 caractères' });
  }

  const db = loadDB();
  if (db.users.find(u => u.email === email.toLowerCase())) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  }
  if (db.users.find(u => u.username === username.toLowerCase())) {
    return res.status(409).json({ error: 'Ce pseudo est déjà pris' });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    username: username.toLowerCase(),
    displayName: username,
    email: email.toLowerCase(),
    password: hash,
    avatar: null,
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  db.libraries[user.id] = [];
  saveDB(db);

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  console.log(`[auth] New user: ${user.displayName}`);
  
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, email: user.email, avatar: user.avatar },
  });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.email === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  console.log(`[auth] Login: ${user.displayName}`);

  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, email: user.email, avatar: user.avatar },
  });
});

app.get('/auth/me', authMiddleware, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, displayName: user.displayName, email: user.email, avatar: user.avatar });
});

// ─── Library Routes ────────────────────────────────────────────
app.get('/library', authMiddleware, (req, res) => {
  const db = loadDB();
  const lib = db.libraries[req.userId] || [];
  res.json(lib);
});

app.post('/library', authMiddleware, (req, res) => {
  const { track } = req.body;
  if (!track?.id) return res.status(400).json({ error: 'Track data required' });

  const db = loadDB();
  if (!db.libraries[req.userId]) db.libraries[req.userId] = [];
  
  if (!db.libraries[req.userId].some(t => t.id === track.id)) {
    db.libraries[req.userId].unshift(track);
    saveDB(db);
  }
  res.json(db.libraries[req.userId]);
});

app.delete('/library/:trackId', authMiddleware, (req, res) => {
  const trackId = parseInt(req.params.trackId) || req.params.trackId;
  const db = loadDB();
  if (!db.libraries[req.userId]) db.libraries[req.userId] = [];
  
  db.libraries[req.userId] = db.libraries[req.userId].filter(t => t.id !== trackId);
  saveDB(db);
  res.json(db.libraries[req.userId]);
});

// ─── History Routes ────────────────────────────────────────────
const MAX_HISTORY = 100;

app.get('/history', authMiddleware, (req, res) => {
  const db = loadDB();
  res.json(db.history[req.userId] || []);
});

app.post('/history', authMiddleware, (req, res) => {
  const { track } = req.body;
  if (!track?.id) return res.status(400).json({ error: 'Track data required' });

  const db = loadDB();
  if (!db.history[req.userId]) db.history[req.userId] = [];

  // Remove duplicate if already in history
  db.history[req.userId] = db.history[req.userId].filter(t => t.id !== track.id);
  // Add to front with timestamp
  db.history[req.userId].unshift({ ...track, playedAt: new Date().toISOString() });
  // Limit
  db.history[req.userId] = db.history[req.userId].slice(0, MAX_HISTORY);
  saveDB(db);
  res.json(db.history[req.userId]);
});

// ─── Playlists Routes ─────────────────────────────────────────
app.get('/playlists', authMiddleware, (req, res) => {
  const db = loadDB();
  const own = (db.playlists[req.userId] || []).map(p => ({ ...p, isOwner: true }));
  // Also include playlists where user is a collaborator
  const collab = [];
  for (const [ownerId, plists] of Object.entries(db.playlists)) {
    if (ownerId === req.userId) continue;
    for (const p of plists) {
      if ((p.collaborators || []).includes(req.userId)) {
        const owner = db.users.find(u => u.id === ownerId);
        collab.push({ ...p, isOwner: false, ownerName: owner?.displayName || 'Inconnu' });
      }
    }
  }
  res.json([...own, ...collab]);
});

app.post('/playlists', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });

  const db = loadDB();
  if (!db.playlists[req.userId]) db.playlists[req.userId] = [];

  const playlist = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    tracks: [],
    collaborators: [],
    owner: req.userId,
    createdAt: new Date().toISOString(),
  };

  db.playlists[req.userId].push(playlist);
  saveDB(db);
  res.status(201).json(playlist);
});

app.put('/playlists/:id', authMiddleware, (req, res) => {
  const db = loadDB();
  if (!db.playlists[req.userId]) return res.status(404).json({ error: 'Playlist not found' });

  const playlist = db.playlists[req.userId].find(p => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  if (req.body.name) playlist.name = req.body.name.trim();
  if (req.body.tracks) playlist.tracks = req.body.tracks;
  saveDB(db);
  res.json(playlist);
});

// Helper: find playlist by id across all users (owner or collaborator)
function findPlaylistWithAccess(db, playlistId, userId) {
  // Check own playlists
  for (const [ownerId, plists] of Object.entries(db.playlists || {})) {
    const pl = plists.find(p => p.id === playlistId);
    if (pl && (ownerId === userId || (pl.collaborators || []).includes(userId))) {
      return { playlist: pl, ownerId };
    }
  }
  return null;
}

app.post('/playlists/:id/tracks', authMiddleware, (req, res) => {
  const { track } = req.body;
  if (!track?.id) return res.status(400).json({ error: 'Track data required' });

  const db = loadDB();
  const found = findPlaylistWithAccess(db, req.params.id, req.userId);
  if (!found) return res.status(404).json({ error: 'Playlist not found' });

  if (!found.playlist.tracks.some(t => t.id === track.id)) {
    found.playlist.tracks.push(track);
    saveDB(db);
  }
  res.json(found.playlist);
});

app.delete('/playlists/:id/tracks/:trackId', authMiddleware, (req, res) => {
  const trackId = parseInt(req.params.trackId) || req.params.trackId;
  const db = loadDB();
  const found = findPlaylistWithAccess(db, req.params.id, req.userId);
  if (!found) return res.status(404).json({ error: 'Playlist not found' });

  found.playlist.tracks = found.playlist.tracks.filter(t => t.id !== trackId);
  saveDB(db);
  res.json(found.playlist);
});

// Add collaborator to playlist
app.post('/playlists/:id/collaborators', authMiddleware, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId requis' });

  const db = loadDB();
  const userPlaylists = db.playlists[req.userId] || [];
  const playlist = userPlaylists.find(p => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist introuvable (tu dois être le propriétaire)' });

  // Check friends
  if (!(db.friends[req.userId] || []).includes(userId)) {
    return res.status(403).json({ error: 'Vous devez être amis' });
  }

  if (!playlist.collaborators) playlist.collaborators = [];
  if (playlist.collaborators.includes(userId)) {
    return res.status(409).json({ error: 'Déjà collaborateur' });
  }
  playlist.collaborators.push(userId);
  saveDB(db);

  const enriched = playlist.collaborators.map(cid => {
    const u = db.users.find(u => u.id === cid);
    return u ? { id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar } : null;
  }).filter(Boolean);
  res.json({ collaborators: enriched });
});

app.delete('/playlists/:id/collaborators/:userId', authMiddleware, (req, res) => {
  const db = loadDB();
  const userPlaylists = db.playlists[req.userId] || [];
  const playlist = userPlaylists.find(p => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist introuvable' });

  if (!playlist.collaborators) playlist.collaborators = [];
  playlist.collaborators = playlist.collaborators.filter(id => id !== req.params.userId);
  saveDB(db);
  res.json({ ok: true });
});

app.get('/playlists/:id/collaborators', authMiddleware, (req, res) => {
  const db = loadDB();
  const found = findPlaylistWithAccess(db, req.params.id, req.userId);
  if (!found) return res.status(404).json({ error: 'Playlist introuvable' });

  const enriched = (found.playlist.collaborators || []).map(cid => {
    const u = db.users.find(u => u.id === cid);
    return u ? { id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar } : null;
  }).filter(Boolean);
  res.json(enriched);
});

app.delete('/playlists/:id', authMiddleware, (req, res) => {
  const db = loadDB();
  if (!db.playlists[req.userId]) return res.status(404).json({ error: 'Playlist not found' });

  db.playlists[req.userId] = db.playlists[req.userId].filter(p => p.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// ─── Profile Routes ───────────────────────────────────────────
app.put('/auth/profile', authMiddleware, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { displayName, avatar } = req.body;
  if (displayName?.trim()) user.displayName = displayName.trim();
  if (avatar !== undefined) {
    // avatar is base64 string or null to remove
    if (avatar && avatar.length > 500000) {
      return res.status(400).json({ error: 'Image trop lourde (max 500KB)' });
    }
    user.avatar = avatar || null;
  }
  saveDB(db);
  res.json({ id: user.id, username: user.username, displayName: user.displayName, email: user.email, avatar: user.avatar });
});

// ─── Users Search ─────────────────────────────────────────────
app.get('/users/search', authMiddleware, (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q || q.length < 2) return res.json([]);

  const db = loadDB();
  const results = db.users
    .filter(u => u.id !== req.userId && (u.username.includes(q) || u.displayName.toLowerCase().includes(q)))
    .slice(0, 20)
    .map(u => ({ id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar }));
  res.json(results);
});

app.get('/users/:id', authMiddleware, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar });
});

// ─── Friends Routes ───────────────────────────────────────────
app.get('/friends', authMiddleware, (req, res) => {
  const db = loadDB();
  const friendIds = db.friends[req.userId] || [];
  const friends = friendIds.map(fid => {
    const u = db.users.find(u => u.id === fid);
    return u ? { id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar } : null;
  }).filter(Boolean);
  res.json(friends);
});

app.get('/friends/requests', authMiddleware, (req, res) => {
  const db = loadDB();
  const requests = db.friendRequests[req.userId] || [];
  const enriched = requests.map(r => {
    const u = db.users.find(u => u.id === r.from);
    return u ? { id: r.id, from: { id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar }, sentAt: r.sentAt } : null;
  }).filter(Boolean);
  res.json(enriched);
});

app.post('/friends/request', authMiddleware, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId requis' });
  if (userId === req.userId) return res.status(400).json({ error: 'Tu ne peux pas t\'ajouter toi-même' });

  const db = loadDB();
  const targetUser = db.users.find(u => u.id === userId);
  if (!targetUser) return res.status(404).json({ error: 'Utilisateur introuvable' });

  // Check already friends
  if ((db.friends[req.userId] || []).includes(userId)) {
    return res.status(409).json({ error: 'Déjà amis' });
  }

  // Check if request already sent
  if (!db.friendRequests[userId]) db.friendRequests[userId] = [];
  if (db.friendRequests[userId].some(r => r.from === req.userId)) {
    return res.status(409).json({ error: 'Demande déjà envoyée' });
  }

  // Check if the other person already sent us a request -> auto-accept
  if (!db.friendRequests[req.userId]) db.friendRequests[req.userId] = [];
  const reverseReq = db.friendRequests[req.userId].find(r => r.from === userId);
  if (reverseReq) {
    // Auto-accept
    db.friendRequests[req.userId] = db.friendRequests[req.userId].filter(r => r.from !== userId);
    if (!db.friends[req.userId]) db.friends[req.userId] = [];
    if (!db.friends[userId]) db.friends[userId] = [];
    if (!db.friends[req.userId].includes(userId)) db.friends[req.userId].push(userId);
    if (!db.friends[userId].includes(req.userId)) db.friends[userId].push(req.userId);
    saveDB(db);
    return res.json({ status: 'accepted', message: 'Vous êtes maintenant amis !' });
  }

  db.friendRequests[userId].push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    from: req.userId,
    sentAt: new Date().toISOString(),
  });
  saveDB(db);
  res.status(201).json({ status: 'sent', message: 'Demande envoyée' });
});

app.post('/friends/accept', authMiddleware, (req, res) => {
  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ error: 'requestId requis' });

  const db = loadDB();
  if (!db.friendRequests[req.userId]) return res.status(404).json({ error: 'Demande introuvable' });

  const reqIdx = db.friendRequests[req.userId].findIndex(r => r.id === requestId);
  if (reqIdx === -1) return res.status(404).json({ error: 'Demande introuvable' });

  const request = db.friendRequests[req.userId][reqIdx];
  db.friendRequests[req.userId].splice(reqIdx, 1);

  if (!db.friends[req.userId]) db.friends[req.userId] = [];
  if (!db.friends[request.from]) db.friends[request.from] = [];
  if (!db.friends[req.userId].includes(request.from)) db.friends[req.userId].push(request.from);
  if (!db.friends[request.from].includes(req.userId)) db.friends[request.from].push(req.userId);

  saveDB(db);
  res.json({ status: 'accepted' });
});

app.post('/friends/decline', authMiddleware, (req, res) => {
  const { requestId } = req.body;
  const db = loadDB();
  if (!db.friendRequests[req.userId]) return res.json({ ok: true });
  db.friendRequests[req.userId] = db.friendRequests[req.userId].filter(r => r.id !== requestId);
  saveDB(db);
  res.json({ ok: true });
});

app.delete('/friends/:friendId', authMiddleware, (req, res) => {
  const db = loadDB();
  const fid = req.params.friendId;
  if (db.friends[req.userId]) db.friends[req.userId] = db.friends[req.userId].filter(id => id !== fid);
  if (db.friends[fid]) db.friends[fid] = db.friends[fid].filter(id => id !== req.userId);
  saveDB(db);
  res.json({ ok: true });
});

// ─── Shared Playlists ────────────────────────────────────────
app.post('/playlists/:id/share', authMiddleware, (req, res) => {
  const { friendId } = req.body;
  if (!friendId) return res.status(400).json({ error: 'friendId requis' });

  const db = loadDB();
  // Check they're friends
  if (!(db.friends[req.userId] || []).includes(friendId)) {
    return res.status(403).json({ error: 'Vous devez être amis' });
  }

  const userPlaylists = db.playlists[req.userId] || [];
  const playlist = userPlaylists.find(p => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist introuvable' });

  // Create a copy for the friend
  if (!db.playlists[friendId]) db.playlists[friendId] = [];

  const sender = db.users.find(u => u.id === req.userId);
  const sharedPlaylist = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: `${playlist.name} (de ${sender?.displayName || 'ami'})`,
    tracks: [...playlist.tracks],
    createdAt: new Date().toISOString(),
    sharedBy: req.userId,
  };

  db.playlists[friendId].push(sharedPlaylist);
  saveDB(db);
  res.json({ ok: true, message: 'Playlist partagée !' });
});

// Cache audio URLs to avoid repeated yt-dlp calls (URLs expire after ~6h)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 60 * 1000; // 5 hours

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}
setInterval(cleanCache, 10 * 60 * 1000);

// GET /stream?q=artist+title  → returns audio URL
app.get('/stream', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  // Check cache
  const cacheKey = query.toLowerCase().trim();
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[cache hit] ${query}`);
      return res.json(cached.data);
    }
    cache.delete(cacheKey);
  }

  try {
    console.log(`[yt-dlp] Searching: ${query}`);
    
    const { stdout } = await exec('yt-dlp', [
      '--print', '%(urls)s\n%(title)s\n%(duration)s\n%(id)s',
      '-f', 'bestaudio[ext=m4a]/bestaudio',
      '--no-warnings',
      '--no-playlist',
      '--no-check-certificates',
      '--socket-timeout', '8',
      `ytsearch1:${query}`,
    ], { timeout: 12000 });

    const lines = stdout.trim().split('\n');
    if (lines.length < 4 || !lines[0].startsWith('http')) {
      return res.status(404).json({ error: 'No audio found' });
    }

    const data = {
      audioUrl: lines[0],
      title: lines[1],
      duration: parseInt(lines[2]) || 0,
      videoId: lines[3],
    };

    cache.set(cacheKey, { data, timestamp: Date.now() });
    console.log(`[yt-dlp] Found: ${data.title} (${data.duration}s)`);
    
    res.json(data);
  } catch (err) {
    console.error(`[yt-dlp error]`, err.message);
    res.status(500).json({ error: 'Failed to get audio stream' });
  }
});

// GET /proxy-stream?url=...  → proxies the googlevideo audio to avoid CORS
app.get('/proxy-stream', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Range': req.headers.range || 'bytes=0-',
      },
    });

    // Forward relevant headers
    res.status(response.status);
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');
    
    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    // Stream the audio
    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        if (!res.write(value)) {
          await new Promise(resolve => res.once('drain', resolve));
        }
      }
    };
    
    pump().catch(err => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
    });

    req.on('close', () => {
      reader.cancel().catch(() => {});
    });
  } catch (err) {
    console.error('[proxy error]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy stream failed' });
    }
  }
});

// ─── Deezer API proxy (for production) ─────────────────────────
app.all('/api/deezer/*path', async (req, res) => {
  try {
    const deezerPath = req.path.replace(/^\/api\/deezer/, '');
    const url = `https://api.deezer.com${deezerPath}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[deezer proxy]', err.message);
    res.status(500).json({ error: 'Deezer API error' });
  }
});

// ─── Production: serve Vite build ──────────────────────────────
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*path', (req, res) => {
    if (!req.path.startsWith('/auth') && !req.path.startsWith('/library') &&
        !req.path.startsWith('/history') && !req.path.startsWith('/playlists') &&
        !req.path.startsWith('/friends') && !req.path.startsWith('/users') &&
        !req.path.startsWith('/stream') && !req.path.startsWith('/proxy-stream')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
  console.log('📦 Serving production build from /dist');
}

app.listen(PORT, () => {
  console.log(`🎵 Dextory backend running on http://localhost:${PORT}`);
});
