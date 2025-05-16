# Use Node.js LTS version as the base image
FROM node:20-slim AS builder

# Set working directory
WORKDIR /build

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy source files and tsconfig
COPY tsconfig.json ./
COPY src/ ./src/

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm tsc

# Create production image
FROM node:20-slim

WORKDIR /app

# Copy only the compiled JavaScript files and assets
COPY --from=builder /build/dist ./dist
COPY assets/ ./assets/
COPY package.json ./

# Install production dependencies only
RUN npm install -g pnpm && \
    pnpm install --prod --no-frozen-lockfile

# Set environment variables
ENV NODE_ENV=production

# Command to run the compiled code
CMD ["node", "dist/main.js"]
