# Multi-stage Dockerfile for WhatsApp CRM Backend
# Build arguments for configuration
ARG NODE_VERSION=20
ARG NODE_ENV=production

# Stage 1: Builder
FROM node:${NODE_VERSION}-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files first for better layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for Prisma)
# Skip Chromium download for puppeteer (whatsapp-web.js will use system Chrome)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm ci && \
    npm cache clean --force

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy application code
COPY . .

# Remove devDependencies to reduce image size
RUN npm prune --production

# Stage 2: Runtime
FROM node:${NODE_VERSION}-alpine

# Build arguments
ARG NODE_ENV
ARG PORT=5000

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/sessions /app/uploads && \
    chown -R nodejs:nodejs /app

# Copy from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --chown=nodejs:nodejs . .

# Set environment variables
ENV NODE_ENV=${NODE_ENV} \
    PORT=${PORT} \
    NODE_OPTIONS="--max-old-space-size=2048"

# Expose port
EXPOSE ${PORT}

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
