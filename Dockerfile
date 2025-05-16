# Use Node.js LTS version as the base image
FROM node:20-alpine3.20 AS builder
# Set working directory
WORKDIR /build
# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Install pnpm globally
RUN npm install -g pnpm
# Install dependencies
RUN pnpm install --frozen-lockfile
# Copy source files and tsconfig
COPY tsconfig.json ./
COPY src/ ./src/
# Check tsconfig.json for outDir setting
RUN cat tsconfig.json || echo "No tsconfig.json found"
# Try different build commands
RUN pnpm run build || pnpm tsc || echo "Build command failed, checking for prebuilt files"
# Debug: Print directory contents to verify where files are built
RUN echo "=== JS Files in the project ===" && \
    find /build -type f -name "*.js" | sort && \
    echo "=== Directory Structure ===" && \
    find /build -type d | sort

# Create production image
FROM node:20-alpine3.20
WORKDIR /app
# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy ALL files from builder to ensure we don't miss anything
COPY --from=builder /build/ ./
# Install production dependencies only
RUN npm install -g pnpm && \
    pnpm install --prod --frozen-lockfile
# Debug: Verify files are in place with detailed listing
RUN echo "=== Production Container File Structure ===" && \
    find /app -type d | sort && \
    echo "=== JS Files in Production Container ===" && \
    find /app -type f -name "*.js" | sort && \
    echo "=== Package.json Main Entry Point ===" && \
    grep '"main"' package.json || echo "No main field in package.json"
# Set environment variables
ENV NODE_ENV=production
# Attempt multiple ways to start the application with extensive logging
CMD echo "Starting application..." && \
    ls -la && \
    if grep -q '"main"' package.json; then \
    echo "Starting via package.json main entry point" && \
    MAIN_FILE=$(grep -o '"main"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | cut -d'"' -f4) && \
    echo "Main file from package.json: $MAIN_FILE" && \
    node "$MAIN_FILE"; \
    elif [ -f "dist/main.js" ]; then \
    echo "Starting dist/main.js" && \
    node dist/main.js; \
    elif [ -f "dist/index.js" ]; then \
    echo "Starting dist/index.js" && \
    node dist/index.js; \
    elif [ -f "src/main.js" ]; then \
    echo "Starting src/main.js" && \
    node src/main.js; \
    elif [ -f "src/index.js" ]; then \
    echo "Starting src/index.js" && \
    node src/index.js; \
    else \
    echo "Cannot find main entry point. Files in current directory:" && \
    find /app -type f -name "*.js" | sort && \
    exit 1; \
    fi