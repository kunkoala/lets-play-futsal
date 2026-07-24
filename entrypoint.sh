#!/bin/sh
set -e

# Applies any pending migrations (schema is created automatically on first
# boot, no manual migration step) then starts the standalone Next.js server.
npx prisma migrate deploy
exec node server.js
