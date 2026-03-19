#!/bin/sh
set -e

LOCKFILE_HASH_FILE="node_modules/.package-lock.hash"
PRISMA_SCHEMA_HASH_FILE="node_modules/.prisma-schema.hash"

get_lockfile_hash() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum package-lock.json | awk '{print $1}'
    return
  fi

  shasum -a 256 package-lock.json | awk '{print $1}'
}

get_schema_hash() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum prisma/schema.prisma | awk '{print $1}'
    return
  fi

  shasum -a 256 prisma/schema.prisma | awk '{print $1}'
}

needs_install=false

if [ ! -d "node_modules" ]; then
  needs_install=true
fi

current_lockfile_hash="$(get_lockfile_hash)"
saved_lockfile_hash=""

if [ -f "$LOCKFILE_HASH_FILE" ]; then
  saved_lockfile_hash="$(cat "$LOCKFILE_HASH_FILE")"
fi

if [ "$current_lockfile_hash" != "$saved_lockfile_hash" ]; then
  needs_install=true
fi

if ! npm ls --depth=0 >/dev/null 2>&1; then
  needs_install=true
fi

if [ "$needs_install" = true ]; then
  echo "node_modules eksik veya package-lock.json ile uyumsuz, npm ci çalıştırılıyor..."
  npm ci
  mkdir -p node_modules
  printf "%s" "$current_lockfile_hash" > "$LOCKFILE_HASH_FILE"
fi

if [ ! -d "node_modules/.prisma/client" ]; then
  echo "Prisma client eksik, prisma generate çalıştırılıyor..."
  npx prisma generate
fi

current_schema_hash="$(get_schema_hash)"
saved_schema_hash=""

if [ -f "$PRISMA_SCHEMA_HASH_FILE" ]; then
  saved_schema_hash="$(cat "$PRISMA_SCHEMA_HASH_FILE")"
fi

if [ "$current_schema_hash" != "$saved_schema_hash" ]; then
  echo "Prisma şeması değişmiş, prisma generate çalıştırılıyor..."
  npx prisma generate
  mkdir -p node_modules
  printf "%s" "$current_schema_hash" > "$PRISMA_SCHEMA_HASH_FILE"
fi

exec npm run dev -- -H 0.0.0.0 -p 3000
