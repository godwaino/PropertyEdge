# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

# Install client dependencies and build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install --ignore-scripts
COPY client/ ./client/
RUN npm run build:client

# Install server dependencies and build
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --ignore-scripts
COPY server/ ./server/
RUN npm run build:server

# ---- Production Stage ----
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy server production dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev --ignore-scripts

# Copy compiled server
COPY --from=builder /app/server/dist ./server/dist

# Copy built client
COPY --from=builder /app/client/dist ./client/dist

# Copy root package.json for start script
COPY package.json ./

# Non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

CMD ["npm", "start"]
