# ─── Stage 1: Build frontend ────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Production ────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install yt-dlp + ffmpeg (required for audio streaming)
RUN apk add --no-cache python3 py3-pip ffmpeg \
    && pip3 install --break-system-packages yt-dlp \
    && yt-dlp --version

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
  CMD wget --no-verbose --tries=1 --spider http://localhost:8020/auth/me || exit 1

CMD ["node", "server.js"]
