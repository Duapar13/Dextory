# ─── Stage 1: Build frontend ────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Production (Debian slim for yt-dlp compatibility) ─
FROM node:20-slim

WORKDIR /app

# Install yt-dlp + ffmpeg
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ffmpeg curl ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && yt-dlp --version \
    && apt-get remove -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy package files & install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy server + built frontend
COPY server.js ./
COPY --from=builder /app/dist ./dist

# Create db.json if not mounted
RUN echo '{"users":[],"libraries":{},"history":{},"playlists":{},"friends":{},"friendRequests":{}}' > db.json

# Expose port
EXPOSE 8020

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8020/auth/me').then(r => process.exit(r.ok || r.status === 401 ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
