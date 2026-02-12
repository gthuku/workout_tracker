# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend and backend
# This runs: tsc -b && vite build && npm run build:server
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/data/workout.db

# Install AWS CLI for S3 sync
RUN apk add --no-cache aws-cli

# Create data directory
RUN mkdir -p /app/data && chown -R node:node /app/data

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Switch to non-root user
USER node

# Expose port
EXPOSE 3001

# Use entrypoint script for S3 sync + app startup
ENTRYPOINT ["./entrypoint.sh"]
