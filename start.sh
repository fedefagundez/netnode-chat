#!/bin/sh
set -e

# Start the Node.js backend in the background
node /app/server/index.js &
NODE_PID=$!

# Start Caddy in the foreground (keeps the container alive).
# If Caddy exits for any reason, kill the Node.js process so the
# container restarts cleanly rather than running headless.
caddy run --config /app/Caddyfile --adapter caddyfile
EXIT_CODE=$?

kill $NODE_PID 2>/dev/null || true
exit $EXIT_CODE
