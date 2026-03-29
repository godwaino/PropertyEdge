FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source and compile
COPY . .
RUN npx tsc

# Cloud Run expects PORT env var (default 8080)
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
