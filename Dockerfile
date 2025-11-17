# Multi-stage build for Health Check Dashboard

# Stage 1: Build backend dependencies
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install production dependencies
RUN npm install --production --no-audit --prefer-offline

# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install --no-audit --prefer-offline

# Copy frontend source
COPY frontend/public ./public/
COPY frontend/src ./src/

# Build frontend
RUN npm run build

# Stage 3: Final production image
FROM node:18-alpine

WORKDIR /app/backend

# Copy backend dependencies from builder
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package*.json ./

# Copy backend source
COPY backend/src ./src/

# Copy built frontend
WORKDIR /app
COPY --from=frontend-builder /app/frontend/build ./public/

# Create data directory for database
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/database.sqlite

# Set working directory to backend for execution
WORKDIR /app/backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "src/index.js"]
