<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

<h1 align="center">🎵 Dextory</h1>

<p align="center">
  <strong>Application de streaming musical full-stack avec recherche, playlists collaboratives et fonctionnalités sociales.</strong>
</p>

<p align="center">
  <a href="#-fonctionnalités">Fonctionnalités</a> •
  <a href="#-stack-technique">Stack</a> •
  <a href="#-démarrage-rapide">Démarrage</a> •
  <a href="#-docker">Docker</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-api">API</a>
</p>

---

## ✨ Fonctionnalités

### 🎧 Lecture audio
- Stream audio complet via **yt-dlp** (pas de limite 30s)
- Player persistant avec barre de progression, volume, shuffle, repeat
- File d'attente automatique, lecture enchaînée
- Touch-friendly sur mobile (barre de progression tactile)

### 🔍 Recherche
- Recherche intégrée sur la page d'accueil (pas de changement de page)
- Résultats en temps réel via l'API **Deezer**
- Debounce intelligent pour limiter les requêtes

### 📋 Playlists & Collaboration
- Créer, renommer, supprimer des playlists
- Ajouter/retirer des morceaux
- **Playlists collaboratives** : inviter des amis à contribuer
- Panel de gestion des collaborateurs intégré

### 👥 Social
- Système d'amis (demandes, acceptation, suppression)
- Recherche d'utilisateurs
- Partage de playlists entre amis

### 📱 Interface
- Design **dark theme** moderne (accent rose #e91e63)
- Responsive complet (mobile, tablette, desktop)
- Safe area pour les téléphones à encoche
- Animations fluides et transitions soignées
- Navigation par URL (`/homepage`, `/profil`, `/artiste/:id`)

### 🔐 Authentification
- Inscription / Connexion avec JWT (30 jours)
- Profil personnalisable (nom d'affichage)
- Sessions persistantes

---

## 🛠 Stack technique

| Composant | Technologie |
|-----------|------------|
| **Frontend** | React 19, Vite 7, React Router |
| **Backend** | Express 5 (ESM) |
| **Audio** | yt-dlp + ffmpeg |
| **API Musique** | Deezer API |
| **Auth** | bcryptjs + jsonwebtoken |
| **Base de données** | JSON file (db.json) |
| **Déploiement** | Docker, Docker Compose |

---

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** 20+
- **yt-dlp** installé (`brew install yt-dlp` sur macOS)
- **ffmpeg** installé (`brew install ffmpeg` sur macOS)

### Installation

```bash
# Cloner le repo
git clone https://github.com/duapar/dextory.git
cd dextory

# Installer les dépendances
npm install
```

### Développement

```bash
# Terminal 1 — Backend
node server.js

# Terminal 2 — Frontend (avec proxy Deezer)
npx vite --port 5173
```

Ouvrir **http://localhost:5173**

### Production (sans Docker)

```bash
# Build le frontend
npm run build

# Lancer le serveur (sert le frontend + API)
node server.js
```

Ouvrir **http://localhost:3001**

---

## 🐳 Docker

### Build & Run

```bash
# Build et lancer
docker compose up -d

# Ou sans compose
docker build -t dextory .
docker run -d -p 3001:3001 --name dextory dextory
```

L'app est accessible sur **http://localhost:3001**

### Avec données persistantes

```bash
# Les données (db.json) sont automatiquement persistées via un volume Docker
docker compose up -d
```

### Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `3001` | Port du serveur |
| `NODE_ENV` | `production` | Environnement |

---

## 📁 Architecture

```
dextory/
├── src/
│   ├── App.jsx                 # Router principal + état global
│   ├── App.css                 # Styles globaux + modal
│   ├── main.jsx                # Point d'entrée React + BrowserRouter
│   ├── index.css               # Variables CSS + reset
│   ├── components/
│   │   ├── HomePage.jsx        # Accueil + recherche inline + trending
│   │   ├── AccountPage.jsx     # Profil + bibliothèque + amis + collab
│   │   ├── ArtistPage.jsx      # Page artiste (top tracks + albums)
│   │   ├── Player.jsx          # Lecteur audio persistant
│   │   ├── TrackList.jsx       # Liste de morceaux réutilisable
│   │   ├── SearchBar.jsx       # Barre de recherche avec debounce
│   │   ├── AuthPage.jsx        # Login / Register
│   │   └── *.css               # Styles par composant
│   └── hooks/
│       ├── useAuth.jsx         # Auth context + JWT
│       ├── usePlayer.js        # Lecteur audio + queue + shuffle/repeat
│       ├── useSearch.js        # Recherche Deezer avec debounce
│       ├── useLibrary.js       # Favoris (ajout/suppression)
│       ├── useHistory.js       # Historique d'écoute
│       └── usePlaylists.js     # CRUD playlists
├── server.js                   # Backend Express (API + streaming + auth)
├── db.json                     # Base de données JSON
├── Dockerfile                  # Multi-stage build (Node 20 Alpine)
├── docker-compose.yml          # Orchestration Docker
├── vite.config.js              # Config Vite + proxys API
└── package.json
```

---

## 🔌 API

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/auth/register` | Inscription |
| `POST` | `/api/auth/login` | Connexion |
| `GET` | `/api/auth/me` | Utilisateur courant |
| `PUT` | `/api/auth/profile` | Modifier le profil |

### Bibliothèque
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/library` | Récupérer les favoris |
| `POST` | `/api/library` | Ajouter un favori |
| `DELETE` | `/api/library/:trackId` | Retirer un favori |

### Playlists
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/playlists` | Lister les playlists |
| `POST` | `/api/playlists` | Créer une playlist |
| `PUT` | `/api/playlists/:id` | Renommer |
| `DELETE` | `/api/playlists/:id` | Supprimer |
| `POST` | `/api/playlists/:id/tracks` | Ajouter un morceau |
| `DELETE` | `/api/playlists/:id/tracks/:trackId` | Retirer un morceau |
| `GET` | `/api/playlists/:id/collaborators` | Lister les collaborateurs |
| `POST` | `/api/playlists/:id/collaborators` | Ajouter un collaborateur |
| `DELETE` | `/api/playlists/:id/collaborators/:userId` | Retirer un collaborateur |

### Social
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/friends` | Liste d'amis |
| `GET` | `/api/friends/requests` | Demandes reçues |
| `POST` | `/api/friends/request` | Envoyer une demande |
| `POST` | `/api/friends/accept` | Accepter |
| `POST` | `/api/friends/decline` | Refuser |
| `DELETE` | `/api/friends/:friendId` | Supprimer un ami |
| `GET` | `/api/users/search?q=` | Rechercher des utilisateurs |

### Streaming
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/stream?q=` | Stream audio via yt-dlp |
| `GET` | `/api/proxy-stream?url=` | Proxy stream YouTube |

### Musique (Deezer)
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/deezer/search?q=` | Recherche de morceaux |
| `GET` | `/api/deezer/artist/:id` | Info artiste |
| `GET` | `/api/deezer/artist/:id/top` | Top tracks artiste |
| `GET` | `/api/deezer/chart/0/tracks` | Trending |

---

## 📱 Routes frontend

| URL | Page |
|-----|------|
| `/homepage` | Page d'accueil (recherche + trending + playlists) |
| `/profil` | Mon profil (bibliothèque + amis + playlists) |
| `/artiste/:artistId` | Page artiste (top tracks + albums) |

---

## 📄 Licence

Ce projet est personnel et n'est pas sous licence open-source.

---

<p align="center">
  Made with ❤️ by <strong>Duapar</strong>
</p>
