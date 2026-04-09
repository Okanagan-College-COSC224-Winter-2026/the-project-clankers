# ===========================
# Stage 1: Build Stage
# ===========================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
# Use --frozen-lockfile equivalent for npm (ci for clean install)
RUN npm ci

# Copy source code and configuration files
COPY . .

# Build the application
# Vite build (skips TypeScript checking for Docker)
RUN npx vite build

# ===========================
# Stage 2: Production Stage
# ===========================
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for HTTP traffic
EXPOSE 80

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
