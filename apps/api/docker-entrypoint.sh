#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  echo "Applying database migrations..."
  npx prisma migrate deploy
else
  echo "Skipping migrations on API boot. Run the migrate service during deploy."
fi

echo "Starting AgroTraders API..."
exec node dist/main.js
