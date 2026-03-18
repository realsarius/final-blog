#!/bin/sh
set -e

if [ ! -d "node_modules" ] || [ ! -d "node_modules/sonner" ]; then
  echo "node_modules eksik, npm ci çalıştırılıyor..."
  npm ci
fi

if [ ! -d "node_modules/.prisma/client" ]; then
  echo "Prisma client eksik, prisma generate çalıştırılıyor..."
  npx prisma generate
fi

exec npm run dev -- -H 0.0.0.0 -p 3000
