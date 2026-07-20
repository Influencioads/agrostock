#!/bin/sh
set -e

echo "→ Applying database migrations…"
npx prisma migrate deploy

echo "→ Starting AgroTraders API…"
exec node dist/main.js
