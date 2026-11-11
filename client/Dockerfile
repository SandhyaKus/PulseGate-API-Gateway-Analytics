## ------------------------------------------------------------
##  Client – multi‑stage build (Vite + Nginx)
## ------------------------------------------------------------
# ---- Builder -------------------------------------------------
FROM node:lts-alpine AS builder
WORKDIR /app

# Install all dependencies (needs dev dependencies for Vite build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build the static assets
COPY . ./
RUN npm run build

# ---- Runtime -------------------------------------------------
FROM nginx:alpine AS runtime
# Remove the default nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Serve the built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
# Simple health‑check – nginx returns HTTP 200 for the root page
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]