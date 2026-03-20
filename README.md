# FinalBlog Platform

[Türkçe README](./README.md) | [English README](./README.en.md)

## İçindekiler

- [0. Hızlı Kurulum](#0-hızlı-kurulum)
- [1. Kapsam](#1-kapsam)
- [2. Teknoloji Yığını](#2-teknoloji-yığını-technology-stack)
- [3. Veritabanı Tasarımı](#3-veritabanı-tasarımı-database-design)
- [4. API Tasarımı](#4-api-tasarımı-ve-standartlar-api-design)
- [5. Loglama ve Hata Yönetimi](#5-loglama-i̇zlenebilirlik-ve-hata-yönetimi-observability)
- [6. Test Stratejisi](#6-test-stratejisi-testing)
- [7. Kurulum ve Çalıştırma](#7-kurulum-ve-çalıştırma)
- [8. Frontend](#8-frontend)
- [9. Production Notes](#9-production-notes)
- [10. Lisans ve Kullanım Notu](#10-lisans-ve-kullanım-notu)
- [Ek Dokümanlar](#ek-dokümanlar)

## 0. Hızlı Kurulum

### Docker ile (Önerilen)

```bash
# 1) Ortam değişkenlerini hazırla
cp .env.example .env

# 2) Development stack'i başlat (web + postgres-dev + redis + pgadmin)
docker compose --profile dev up -d --build

# 3) Migration + seed çalıştır
docker compose --profile dev exec blog-web-dev npx prisma migrate deploy
docker compose --profile dev exec blog-web-dev npx prisma db seed

# 4) Test DB altyapısı (opsiyonel)
docker compose --profile test up -d

# 5) Durdur
docker compose --profile dev --profile test down
```

### Erişim Adresleri

- Uygulama: <http://localhost:3007>
- Admin: <http://localhost:3007/admin>
- pgAdmin: <http://localhost:5052>
- PostgreSQL (dev): `localhost:5438`
- Redis: `localhost:6381`

---

## 1. Kapsam

**Kimlik Doğrulama ve Yetkilendirme**: NextAuth Credentials akışı ile oturum yönetimi var. Admin alanı hem middleware hem server-side role kontrolü ile korunuyor. `tokenVersion` ve `isActive` kontrolü ile aktif session invalidation destekleniyor.

**Blog İçerik Yönetimi**: Yazılar taslak/yayında (`DRAFT`/`PUBLISHED`) statüsüyle yönetiliyor. Slug bazlı public erişim, kategori/etiket bağlama, öne çıkarılmış yazı (`featured`) desteği mevcut.

**Notion-benzeri Editör Deneyimi**: Admin yazı editörü Editor.js tabanlı blok içerik modeli kullanıyor. İçerik JSON olarak saklanıp public tarafta renderer ile gösteriliyor.

**Hero Alanı Yönetimi**: Ana sayfa hero slider’ı admin panelden yönetiliyor. Slide başına görsel, bağlı yazı, başlık degrade renkleri ve autoplay/transition ayarları tutuluyor.

**Medya Kütüphanesi ve Upload**: `/api/uploads` ve `/api/v1/uploads` endpoint’leri ile görsel upload/list/delete akışları var. Local disk ve Cloudflare R2 arasında provider seçimi yapılabiliyor.

**İletişim Formu**: `/api/contact` endpoint’i ile Zod doğrulama, honeypot alanı, IP bazlı rate limit ve Resend email teslimi uygulanıyor.

**Çok Dil ve Site Ayarları**: Türkçe/İngilizce dil akışı, locale cookie yönetimi ve admin panelden site adı/açıklama/URL/zaman dilimi/Hakkımda içeriği güncelleme desteği bulunuyor.

**SEO ve Keşif**: `sitemap.xml`, `robots.txt`, canonical alanları ve route bazlı metadata üretimi aktif. Public içeriklerde slug ve meta alanları üzerinden SEO sinyalleri veriliyor.

## 2. Teknoloji Yığını (Technology Stack)

| Kategori | Teknoloji / Kütüphane | Kullanım Amacı |
|---|---|---|
| **Core** | Next.js 16 (App Router), React 19, TypeScript 5 | Full-stack web uygulaması |
| **Auth** | NextAuth (Credentials), bcryptjs | Oturum, parola doğrulama, role-based erişim |
| **Data Access** | Prisma 7, `@prisma/adapter-pg`, PostgreSQL 16 | ORM, migration, kalıcı veri katmanı |
| **Caching & Rate Limit** | Redis 7 (`redis` package) | Login/upload/contact rate limiting |
| **Validation** | Zod | API payload doğrulama |
| **Editor** | Editor.js + Header/List/Quote/Code/Image araçları | Blok tabanlı yazı editörü |
| **Upload & Storage** | Local FS, AWS S3 SDK, Cloudflare R2 | Medya yükleme/silme/listeleme |
| **Email** | Resend | Contact form email teslimi |
| **Lint & Security** | ESLint, npm audit, security smoke script | Kod kalitesi ve güvenlik kontrolleri |
| **DevOps** | Docker, Docker Compose | Dev/test/prod profilleriyle orkestrasyon |

## 3. Veritabanı Tasarımı (Database Design)

Şema Prisma code-first yaklaşımıyla yönetilir: [`prisma/schema.prisma`](prisma/schema.prisma)

### 3.1 Entity Listesi

1. **User**: Admin/editor/author kullanıcı hesapları, profil alanları, `tokenVersion`.
2. **Post**: Yazı içeriği, slug, yayın durumu, SEO alanları, yazar ilişkisi.
3. **Category**: Hiyerarşik kategori yapısı (`parentId` ile self relation).
4. **Tag**: Etiket sözlüğü.
5. **PostCategory**: Yazı-kategori many-to-many join tablosu.
6. **PostTag**: Yazı-etiket many-to-many join tablosu.
7. **PostView**: Yazı görüntüleme kayıtları.
8. **HeroSlide**: Ana sayfa slider öğeleri.
9. **HeroConfig**: Hero autoplay/transition singleton ayar kaydı.
10. **SiteSettings**: Site genel ayarları + çok dilli about content alanları.

### 3.2 Migration ve Şema Yönetimi

- Prisma migration dizini: [`prisma/migrations`](prisma/migrations)
- Yeni migration: `npx prisma migrate dev --name <migration_name>`
- Uygulama ortamına migration: `npx prisma migrate deploy`
- Seed: `npx prisma db seed`

## 4. API Tasarımı ve Standartlar (API Design)

Bu projede API yüzeyi Next.js route handler’ları altında çalışır (`src/app/api/**`).

### 4.1 Endpoint Standartları

- **Temel Pattern:** `/api/{resource}`
- **Upload için Versioned Alias:** `/api/v1/uploads` (`/api/uploads` ile aynı handler)
- **HTTP Metotları:** GET, POST, PUT, DELETE, OPTIONS
- **Auth Modeli:** Session cookie + admin role kontrolü gereken endpoint’lerde 401/403 semantiği

### 4.2 Response ve Hata Modeli

API yüzeyinde iki temel pattern kullanılıyor:

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

Hatalarda endpoint’e göre `ok: false` veya `success: 0` ve açıklayıcı `error` alanı dönülüyor.

### 4.3 Pagination (Sayfalama)

Örnek sayfalama akışı:

- Public blog listesi: `/blog?page=1&view=list&tag=...`
- Admin post seçenek API’si: `/api/admin/posts/options?page=1&limit=12&q=...`

### 4.4 Başlıca Endpoint’ler

- `GET /api/auth/*` ve `POST /api/auth/*`: NextAuth endpoint’leri
- `GET /api/contact` yok, aktif endpoint `POST /api/contact`
- `GET/POST/DELETE/OPTIONS /api/uploads`
- `GET/POST/DELETE/OPTIONS /api/v1/uploads`
- `GET /api/locale?locale=tr|en&redirect=/path`
- `GET/PUT /api/admin/hero`
- `GET /api/admin/posts/options`
- `PUT /api/admin/posts/{id}/featured`
- `PUT /api/admin/profile/author`

### 4.5 Upload API Güvenlik ve Operasyon Semantiği

- Sadece görsel MIME tipleri kabul edilir (`jpeg/png/webp/gif`)
- Dosya içeriği signature kontrolü yapılır (sadece extension/type’e güvenilmez)
- Boyut limiti env ile yönetilir (`UPLOAD_MAX_FILE_SIZE_MB`, üst sınır 40 MB)
- Rate limit uygulanır (`UPLOAD_RATE_LIMIT_*`)
- İsteğe bağlı malware taraması (ClamAV) desteklenir
- CORS allow-list ile sınırlanır (`UPLOAD_CORS_ALLOWED_ORIGINS`)

### 4.6 Contact API Semantiği

- `POST /api/contact`
- Zod payload doğrulaması + honeypot alanı
- IP bazlı rate-limit (`CONTACT_RATE_LIMIT_*`)
- Resend ile email teslimi (`RESEND_API_KEY`, `CONTACT_FROM_EMAIL`)

## 5. Loglama, İzlenebilirlik ve Hata Yönetimi (Observability)

### 5.1 Structured Security Logging

`src/lib/securityLog.ts` üzerinden güvenlik olayları JSON satır formatında loglanır:

- `type=security_event`
- `severity=info|warn|error`
- `event` + `context` alanları

### 5.2 Güvenlik Header’ları

Global header’lar `next.config.ts` içinde tüm route’lara uygulanır:

- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`

### 5.3 Yetkisiz Erişim ve Session Yönetimi

- Admin route’ları middleware + server-side role check ile korunur
- Session invalidation için `tokenVersion` kontrolü uygulanır
- `isActive=false` kullanıcılar oturumdan düşürülür

## 6. Test Stratejisi (Testing)

Projede şu an ağırlıklı olarak lint + smoke + security test yaklaşımı bulunuyor.

### 6.1 Çalışan Kontroller

- `npm run lint`
- `npm run audit:prod`
- `npm run audit:high`
- `npm run security:smoke`
- `npm run security:check`

### 6.2 CI Kontrolü

GitHub Actions workflow: [`.github/workflows/security-audit.yml`](.github/workflows/security-audit.yml)

- `main`/`master` push
- PR
- Haftalık cron

### 6.3 Not

Repository’de klasik unit/integration test klasörü henüz bulunmuyor. Mevcut test stratejisi security smoke ve statik analiz ağırlıklı ilerliyor.

## 7. Kurulum ve Çalıştırma

### 7.1 Gereksinimler

- Node.js 22 (`.nvmrc`: `22`)
- npm
- Docker & Docker Compose
- PostgreSQL 16 (manuel kurulum için)
- Redis 7 (manuel kurulum için)

### 7.2 Environment Değişkenleri

Temel örnek dosya: [`.env.example`](.env.example)

```bash
cp .env.example .env
```

Kritik alanlar:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `REDIS_URL`
- `ADMIN_*` seed kullanıcı alanları
- Upload için: `UPLOAD_*`, gerekiyorsa `R2_*`
- Contact için: `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`

### 7.3 Docker Compose ile Çalıştırma

```bash
# Development
docker compose --profile dev up -d --build

# Production benzeri stack
docker compose --profile prod up -d --build

# Test altyapısı (db + redis)
docker compose --profile test up -d

# Durdur
docker compose --profile dev --profile test --profile prod down
```

### 7.4 Manuel Kurulum

```bash
# 1) Bağımlılıklar
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

- Admin kullanıcıyı env’den üretir/günceller
- Site ayarlarını başlangıç değerleriyle bootstrap eder
- Kategori/etiket ilişkileriyle örnek yayınlanmış yazılar oluşturur

## 8. Frontend

Next.js App Router yapısı:

```text
src/
├── app/
│   ├── (public)/        # Home, blog list/detail, about, contact, privacy
│   ├── admin/           # Yazı, medya, kategori/etiket, ayarlar, araçlar
│   └── api/             # Route handler API yüzeyi
├── components/          # Layout, blog, sidebar, admin bileşenleri
├── i18n/                # Mesaj katalogları (tr/en)
├── lib/                 # Auth, upload, rate-limit, seo, prisma yardımcıları
└── types/               # NextAuth tip genişletmeleri vb.
```

Öne çıkan arayüz yüzeyleri:

- Public: Home, Blog, Blog Detail, About, Contact, Privacy
- Admin: Dashboard, Posts, Categories, Tags, Media, Site Settings, About Page Editor, Site Health, Profil

## 9. Production Notes

### 9.1 Security ve Env Politikası

- Production’da `NEXTAUTH_SECRET` zorunludur
- `RATE_LIMIT_TRUST_PROXY_HEADERS=true` sadece güvenilen reverse proxy arkasında açılmalıdır
- Upload için production önerisi:
  - `UPLOAD_MALWARE_SCAN=clamav`
  - `UPLOAD_MALWARE_FAIL_OPEN=false`

### 9.2 Upload Storage Stratejisi

- `UPLOAD_PROVIDER=local | r2 | auto`
- `auto` modunda R2 env’leri doluysa R2, değilse local seçilir
- R2 kullanımında `R2_PUBLIC_BASE_URL` CDN/domain uyumlu olmalıdır

### 9.3 Operasyonel Hızlı Kontroller

```bash
curl -I http://localhost:3007
curl -i http://localhost:3007/admin
curl -i "http://localhost:3007/api/uploads?limit=1"
npm run security:smoke
```

### 9.4 CI Güvenlik Kontrolü

Haftalık ve PR tetiklemeli `npm audit` kontrolü aktif:

- [`.github/workflows/security-audit.yml`](.github/workflows/security-audit.yml)

## 10. Lisans ve Kullanım Notu

Bu repoda şu anda açık bir OSS lisans dosyası tanımlı değil. Aksi yazılı bir lisans belirtilmedikçe kodun kullanım/dağıtım hakları varsayılan olarak repo sahibinde kalır.

## Ek Dokümanlar

- [DBML Diyagram Kaynağı](docs/dbdiagram.dbml)
