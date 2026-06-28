FROM node:20-alpine

# Install Caddy from the official Alpine package repository
RUN apk add --no-cache caddy

WORKDIR /app

# Copy application source
COPY . .

# Install Node.js server dependencies
RUN npm install --prefix /app/server

# Make the startup script executable
RUN chmod +x /app/start.sh

# Port 80  – Caddy (public-facing reverse proxy)
# Port 3000 – Node.js / Express + Socket.IO backend
EXPOSE 80 3000

CMD ["/app/start.sh"]
