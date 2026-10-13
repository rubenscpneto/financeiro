#!/bin/sh
set -e
STORAGE_DIR="${STORAGE_DIR:-/data/statements}"
mkdir -p "$STORAGE_DIR"
chown -R node:node "$STORAGE_DIR" || true
chmod -R u+rwX "$STORAGE_DIR" || true
exec su-exec node sh -c "node scripts/migrate.mjs && exec node server.js"
