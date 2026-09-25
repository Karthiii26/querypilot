# Multi-stage Dockerfile for QueryPilot Fullstack Production Build

# --- Stage 1: Builder ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy full application code
COPY . .

# Build Vite frontend and bundled Node server
RUN npm run build

# --- Stage 2: Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package info
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built dist files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database ./database
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
