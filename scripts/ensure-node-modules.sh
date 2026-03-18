#!/bin/sh
set -e

if [ ! -d "node_modules" ] || [ ! -d "node_modules/sonner" ] || [ ! -d "node_modules/@editorjs/editorjs" ] || [ ! -d "node_modules/isomorphic-dompurify" ]; then
  echo "node_modules eksik, npm ci çalıştırılıyor..."
  npm ci
fi

if [ ! -d "node_modules/.prisma/client" ]; then
  echo "Prisma client eksik, prisma generate çalıştırılıyor..."
  npx prisma generate
fi

exec npm run dev -- -H 0.0.0.0 -p 3000
