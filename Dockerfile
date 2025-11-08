# Production image for Health Check Dashboard
FROM node:18-alpine

WORKDIR /app/backend

# Copy backend files
COPY backend/package*.json ./
COPY backend/node_modules ./node_modules
COPY backend/src ./src/

# Copy pre-built frontend
WORKDIR /app
COPY frontend/build ./public/

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
