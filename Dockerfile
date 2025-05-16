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
RUN pnpm tsc && \
    ls -la dist/

# Create production image
FROM node:20-alpine3.20

WORKDIR /app

# Copy only the compiled JavaScript files and assets
COPY --from=builder /build/dist ./dist
COPY assets/ ./assets/
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only
RUN npm install -g pnpm && \
    pnpm install --prod --frozen-lockfile

# Verify files are in place
RUN ls -la /app/dist/

# Set environment variables
ENV NODE_ENV=production

# Command to run the compiled code
CMD ["node", "dist/main.js"]