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
# Build TypeScript files and verify output
RUN pnpm run build || pnpm tsc
# Print directory contents to verify where files are built
RUN find . -type f -name "*.js" | sort

# Create production image
FROM node:20-alpine3.20
WORKDIR /app
# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy assets
COPY assets/ ./assets/
# Find and copy the built files from the builder stage
COPY --from=builder /build/dist/ ./dist/
# Also copy the src directory in case compiled JS files are output there
COPY --from=builder /build/src/ ./src/
# Install production dependencies only
RUN npm install -g pnpm && \
    pnpm install --prod --frozen-lockfile
# Verify files are in place
RUN find /app -type f -name "*.js" | sort
# Set environment variables
ENV NODE_ENV=production
# Use a more flexible approach to find and run the main.js file
CMD find /app -name "main.js" -type f -exec node {} \;