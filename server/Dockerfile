# ------------------------------------------------------------
# Server – multi‑stage build (Node.js)
# ------------------------------------------------------------
# ---- Builder -------------------------------------------------
FROM node:lts-alpine AS builder
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . ./

# ---- Runtime -------------------------------------------------
FROM node:lts-alpine AS runtime
WORKDIR /app

# Copy only the needed files from the builder stage
COPY --from=builder /app ./

# Expose the gateway port (default 4000)
EXPOSE 4000

# Health‑check – call the /health endpoint
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Start the server
CMD ["npm", "start"]