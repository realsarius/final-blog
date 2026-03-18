This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Upload Storage (Local / Cloudflare R2)

Ana upload endpoint'i: `/api/v1/uploads`

Geriye dönük uyumluluk için `/api/uploads` endpoint'i de aynı handler ile çalışır.

Cloudflare R2 kullanmak için `.env` içinde aşağıdaki değişkenleri doldurun:

- `UPLOAD_PROVIDER="r2"` (veya `auto`)
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL` (ör: `https://cdn.example.com`)
- `R2_ENDPOINT` (boş bırakılırsa `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)
- `R2_REGION` (`auto`)

Admin yazı formunda içerik görselleri ve kapak görselleri aynı endpoint üzerinden yüklenir.

### Upload Güvenliği

- Upload endpoint'i varsayılan olarak admin oturumu ister (`UPLOAD_REQUIRE_ADMIN=true`).
- Upload işlemlerine ayrı rate-limit uygulanır (`UPLOAD_RATE_LIMIT_WINDOW_SEC`, `UPLOAD_RATE_LIMIT_MAX`).
- Opsiyonel malware taraması için ClamAV desteği vardır:
  - `UPLOAD_MALWARE_SCAN=clamav`
  - `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_TIMEOUT_MS`
  - Scanner erişilemiyorsa davranış `UPLOAD_MALWARE_FAIL_OPEN` ile belirlenir.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
