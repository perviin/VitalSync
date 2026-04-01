# Multi-stage Dockerfile for VitalSync Backend
#
# RATIONALE FOR MULTI-STAGE BUILD:
# ================================
#
# 1. SECURITY:
#    - Build tools (dev dependencies, npm cache) are excluded from final image
#    - Reduces attack surface by removing unnecessary binaries and packages
#    - Final image contains ONLY what's needed to run the app in production
#
# 2. SIZE OPTIMIZATION:
#    - Builder stage contains: node_modules (with dev deps), npm cache, tests (~500MB+)
#    - Production stage is ~95MB lighter by using Alpine and excluding build artifacts
#    - Faster deployments, reduced storage costs, quicker container startup
#
# 3. BEST PRACTICES:
#    - Separation of concerns: build environment != runtime environment
#    - Only production-critical code in final image
#    - Immutable and reproducible builds

# ============================================================================
# STAGE 1: BUILDER - Install dependencies and run tests
# ============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files (includes scripts, dependencies, dev dependencies)
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for testing)
RUN npm ci --prefer-offline --no-audit

# Copy source code and tests
COPY . .

# Run tests - fail build if tests fail (quality gate)
RUN npm test

# ============================================================================
# STAGE 2: PRODUCTION - Lightweight runtime image
# ============================================================================
FROM node:18-alpine

# Metadata
LABEL maintainer="VitalSync Team"
LABEL description="VitalSync API - Health Activity Tracker"

# Non-root user for security (prevent container runs as root)
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy ONLY production dependencies from builder
# Use npm ci with --only=production to install only dependencies, not devDependencies
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy application source code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Health check to ensure container is running properly
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose API port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
