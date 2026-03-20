# FinalBlog Platform

[Türkçe README](./README.md) | [English README](./README.en.md)

## Table of Contents

- [0. Quick Setup](#0-quick-setup)
- [1. Scope](#1-scope)
- [2. Technology Stack](#2-technology-stack)
- [3. Database Design](#3-database-design)
- [4. API Design and Standards](#4-api-design-and-standards)
- [5. Logging, Observability, and Error Handling](#5-logging-observability-and-error-handling)
- [6. Testing Strategy](#6-testing-strategy)
- [7. Installation and Run](#7-installation-and-run)
- [8. Frontend](#8-frontend)
- [9. Production Notes](#9-production-notes)
- [10. License and Usage Note](#10-license-and-usage-note)
- [Additional Documents](#additional-documents)

## 0. Quick Setup

### Docker (Recommended)

```bash
# 1) Prepare environment variables
cp .env.example .env

# 2) Start development stack (web + postgres-dev + redis + pgadmin)
docker compose --profile dev up -d --build

# 3) Run migration + seed
docker compose --profile dev exec blog-web-dev npx prisma migrate deploy
docker compose --profile dev exec blog-web-dev npx prisma db seed

# 4) Start test DB infra (optional)
docker compose --profile test up -d

# 5) Stop
docker compose --profile dev --profile test down
```

### Access URLs

- Application: <http://localhost:3007>
- Admin: <http://localhost:3007/admin>
- pgAdmin: <http://localhost:5052>
- PostgreSQL (dev): `localhost:5438`
- Redis: `localhost:6381`

---

## 1. Scope

**Authentication and Authorization**: Session handling is built on NextAuth Credentials flow. The admin area is protected by both middleware and server-side role checks. Active session invalidation is supported via `tokenVersion` and `isActive` controls.

**Blog Content Management**: Posts are managed through `DRAFT`/`PUBLISHED` lifecycle states. The system includes slug-based public access, category/tag binding, and featured posts support.

**Notion-like Editor Experience**: The admin post editor uses an Editor.js block-based content model. Content is stored as JSON and rendered on the public side.

**Hero Area Management**: The home hero slider is managed from the admin panel. Each slide can store image, linked post, title gradient colors, and autoplay/transition settings.

**Media Library and Upload**: Image upload/list/delete flows are exposed through `/api/uploads` and `/api/v1/uploads`. Storage provider can be switched between local disk and Cloudflare R2.

**Contact Form**: `/api/contact` provides Zod validation, honeypot filtering, IP-based rate limiting, and Resend email delivery.

**Localization and Site Settings**: Turkish/English language flow, locale cookie handling, and admin-managed site metadata (name/description/URL/timezone/About page content) are available.

**SEO and Discovery**: `sitemap.xml`, `robots.txt`, canonical fields, and route-based metadata generation are active. Public content exposes SEO signals through slug and meta fields.

## 2. Technology Stack

| Category | Technology / Library | Purpose |
|---|---|---|
| **Core** | Next.js 16 (App Router), React 19, TypeScript 5 | Full-stack web application |
| **Auth** | NextAuth (Credentials), bcryptjs | Session, password validation, role-based access |
| **Data Access** | Prisma 7, `@prisma/adapter-pg`, PostgreSQL 16 | ORM, migrations, persistence |
| **Caching & Rate Limit** | Redis 7 (`redis` package) | Login/upload/contact rate limiting |
| **Validation** | Zod | API payload validation |
| **Editor** | Editor.js + Header/List/Quote/Code/Image tools | Block-based post editor |
| **Upload & Storage** | Local FS, AWS S3 SDK, Cloudflare R2 | Media upload/delete/list |
| **Email** | Resend | Contact form email delivery |
| **Lint & Security** | ESLint, npm audit, security smoke script | Code quality and security checks |
| **DevOps** | Docker, Docker Compose | Multi-profile environment orchestration |

## 3. Database Design

Schema is managed with Prisma code-first approach: [`prisma/schema.prisma`](prisma/schema.prisma)

### 3.1 Entity List

1. **User**: Admin/editor/author accounts, profile fields, `tokenVersion`.
2. **Post**: Post content, slug, publish status, SEO fields, author relation.
3. **Category**: Hierarchical category structure (`parentId` self relation).
4. **Tag**: Tag dictionary.
5. **PostCategory**: Post-category many-to-many join table.
6. **PostTag**: Post-tag many-to-many join table.
7. **PostView**: Post view records.
8. **HeroSlide**: Home slider items.
9. **HeroConfig**: Hero autoplay/transition singleton settings.
10. **SiteSettings**: Global site settings + multilingual about content fields.

### 3.2 Migration and Schema Management

- Prisma migrations directory: [`prisma/migrations`](prisma/migrations)
- New migration: `npx prisma migrate dev --name <migration_name>`
- Deploy migration: `npx prisma migrate deploy`
- Seed: `npx prisma db seed`

## 4. API Design and Standards

In this project, API surface is implemented via Next.js route handlers under `src/app/api/**`.

### 4.1 Endpoint Standards

- **Base Pattern:** `/api/{resource}`
- **Versioned Upload Alias:** `/api/v1/uploads` (same handler as `/api/uploads`)
- **HTTP Methods:** GET, POST, PUT, DELETE, OPTIONS
- **Auth Model:** Session cookie + 401/403 semantics for admin-protected endpoints

### 4.2 Response and Error Model

Two primary response styles are used:

**Pattern A (`ok`):**

```json
{
  "ok": true
}
```

**Pattern B (`success`):**

```json
{
  "success": 1
}
```

On errors, endpoints return either `ok: false` or `success: 0` with an explanatory `error` field.

### 4.3 Pagination

Examples:

- Public blog list: `/blog?page=1&view=list&tag=...`
- Admin post options API: `/api/admin/posts/options?page=1&limit=12&q=...`

### 4.4 Key Endpoints

- `GET /api/auth/*` and `POST /api/auth/*`: NextAuth endpoints
- No `GET /api/contact`; active endpoint is `POST /api/contact`
- `GET/POST/DELETE/OPTIONS /api/uploads`
- `GET/POST/DELETE/OPTIONS /api/v1/uploads`
- `GET /api/locale?locale=tr|en&redirect=/path`
- `GET/PUT /api/admin/hero`
- `GET /api/admin/posts/options`
- `PUT /api/admin/posts/{id}/featured`
- `PUT /api/admin/profile/author`

### 4.5 Upload API Security and Operational Semantics

- Only image MIME types are accepted (`jpeg/png/webp/gif`)
- File signatures are validated (not relying only on extension/type)
- Size limit is env-driven (`UPLOAD_MAX_FILE_SIZE_MB`, hard cap 40 MB)
- Rate limit is enforced (`UPLOAD_RATE_LIMIT_*`)
- Optional malware scanning (ClamAV) is supported
- CORS is restricted via allow-list (`UPLOAD_CORS_ALLOWED_ORIGINS`)

### 4.6 Contact API Semantics

- `POST /api/contact`
- Zod payload validation + honeypot field
- IP-based rate limit (`CONTACT_RATE_LIMIT_*`)
- Email delivery via Resend (`RESEND_API_KEY`, `CONTACT_FROM_EMAIL`)

## 5. Logging, Observability, and Error Handling

### 5.1 Structured Security Logging

Security events are logged in JSON line format via `src/lib/securityLog.ts`:

- `type=security_event`
- `severity=info|warn|error`
- `event` + `context` fields

### 5.2 Security Headers

Global headers are applied in `next.config.ts`:

- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`

### 5.3 Unauthorized Access and Session Handling

- Admin routes are protected with middleware + server-side role checks
- Session invalidation is handled with `tokenVersion`
- `isActive=false` users are logged out automatically

## 6. Testing Strategy

Current testing is focused on lint + smoke + security checks.

### 6.1 Active Checks

- `npm run lint`
- `npm run audit:prod`
- `npm run audit:high`
- `npm run security:smoke`
- `npm run security:check`

### 6.2 CI Check

GitHub Actions workflow: [`.github/workflows/security-audit.yml`](.github/workflows/security-audit.yml)

- Push to `main`/`master`
- Pull Requests
- Weekly cron

### 6.3 Note

There is no classic unit/integration test folder yet. Current strategy is mostly security smoke and static analysis driven.

## 7. Installation and Run

### 7.1 Requirements

- Node.js 22 (`.nvmrc`: `22`)
- npm
- Docker & Docker Compose
- PostgreSQL 16 (manual mode)
- Redis 7 (manual mode)

### 7.2 Environment Variables

Base example file: [`.env.example`](.env.example)

```bash
cp .env.example .env
```

Critical fields:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `REDIS_URL`
- `ADMIN_*` seed user fields
- For upload: `UPLOAD_*`, optional `R2_*`
- For contact: `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`

### 7.3 Run with Docker Compose

```bash
# Development
docker compose --profile dev up -d --build

# Production-like stack
docker compose --profile prod up -d --build

# Test infra (db + redis)
docker compose --profile test up -d

# Stop all
docker compose --profile dev --profile test --profile prod down
```

### 7.4 Manual Setup

```bash
# 1) Dependencies
npm ci

# 2) Prisma client + migration
npx prisma generate
npx prisma migrate deploy

# 3) Seed
npx prisma db seed

# 4) Development server
npm run dev
```

### 7.5 Seed Data

Seed script: [`prisma/seed.mjs`](prisma/seed.mjs)

- Creates/updates admin user from env
- Bootstraps site settings with initial values
- Creates sample published posts with category/tag relations

## 8. Frontend

Next.js App Router structure:

```text
src/
├── app/
│   ├── (public)/        # Home, blog list/detail, about, contact, privacy
│   ├── admin/           # posts, media, taxonomy, settings, tools
│   └── api/             # route handler API surface
├── components/          # layout, blog, sidebar, admin components
├── i18n/                # message catalogs (tr/en)
├── lib/                 # auth, upload, rate-limit, seo, prisma helpers
└── types/               # NextAuth type augmentations etc.
```

Main UI surfaces:

- Public: Home, Blog, Blog Detail, About, Contact, Privacy
- Admin: Dashboard, Posts, Categories, Tags, Media, Site Settings, About Page Editor, Site Health, Profile

## 9. Production Notes

### 9.1 Security and Env Policy

- `NEXTAUTH_SECRET` is mandatory in production
- Enable `RATE_LIMIT_TRUST_PROXY_HEADERS=true` only behind trusted reverse proxies
- Recommended upload settings:
  - `UPLOAD_MALWARE_SCAN=clamav`
  - `UPLOAD_MALWARE_FAIL_OPEN=false`

### 9.2 Upload Storage Strategy

- `UPLOAD_PROVIDER=local | r2 | auto`
- In `auto`, R2 is selected if R2 env vars are present, otherwise local
- `R2_PUBLIC_BASE_URL` should match your CDN/domain setup

### 9.3 Quick Operational Checks

```bash
curl -I http://localhost:3007
curl -i http://localhost:3007/admin
curl -i "http://localhost:3007/api/uploads?limit=1"
npm run security:smoke
```

### 9.4 CI Security Check

Weekly and PR-triggered `npm audit` check is active:

- [`.github/workflows/security-audit.yml`](.github/workflows/security-audit.yml)

## 10. License and Usage Note

This project is licensed under the MIT License.

- License text: [`LICENSE`](LICENSE)
- Third-party dependencies are subject to their own licenses.

## Additional Documents

- [DBML Diagram Source](docs/dbdiagram.dbml)
