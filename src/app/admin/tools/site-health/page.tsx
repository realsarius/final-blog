import Link from "next/link";
import { requireAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

type HealthStatus = "good" | "warn";

type HealthItem = {
  label: string;
  status: HealthStatus;
  detail: string;
};

function statusLabel(status: HealthStatus) {
  return status === "good" ? "İyi" : "Dikkat";
}

function hasR2Config() {
  return Boolean(
    process.env.R2_ACCOUNT_ID
    && process.env.R2_ACCESS_KEY_ID
    && process.env.R2_SECRET_ACCESS_KEY
    && process.env.R2_BUCKET_NAME
    && process.env.R2_PUBLIC_BASE_URL,
  );
}

async function getDatabaseHealth(): Promise<HealthItem> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      label: "Veritabanı bağlantısı",
      status: "good",
      detail: "Veritabanına bağlantı başarılı.",
    };
  } catch {
    return {
      label: "Veritabanı bağlantısı",
      status: "warn",
      detail: "Veritabanı bağlantısı doğrulanamadı.",
    };
  }
}

function getR2Health(): HealthItem {
  const provider = (process.env.UPLOAD_PROVIDER ?? "local").trim().toLowerCase();
  const configured = hasR2Config();
  if (provider === "r2" && configured) {
    return {
      label: "Cloudflare R2",
      status: "good",
      detail: "R2 aktif ve zorunlu değişkenler tanımlı.",
    };
  }
  if (provider === "auto" && configured) {
    return {
      label: "Cloudflare R2",
      status: "good",
      detail: "Auto modda R2 yapılandırması bulundu.",
    };
  }
  if (provider === "r2" && !configured) {
    return {
      label: "Cloudflare R2",
      status: "warn",
      detail: "UPLOAD_PROVIDER=r2 ama R2 değişkenleri eksik.",
    };
  }
  return {
    label: "Cloudflare R2",
    status: "warn",
    detail: "R2 aktif değil, yüklemeler local depoya düşebilir.",
  };
}

function getAuthHealth(): HealthItem {
  const hasAuthUrl = Boolean(process.env.NEXTAUTH_URL);
  return {
    label: "Oturum yapılandırması",
    status: hasAuthUrl ? "good" : "warn",
    detail: hasAuthUrl
      ? "NEXTAUTH_URL tanımlı."
      : "NEXTAUTH_URL bulunamadı.",
  };
}

export default async function AdminSiteHealthPage() {
  await requireAdminSession("/admin/tools/site-health");

  const checks: HealthItem[] = [
    await getDatabaseHealth(),
    getR2Health(),
    getAuthHealth(),
  ];

  const warnCount = checks.filter((item) => item.status === "warn").length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Site Sağlığı</h1>
        <p>
          Sistem durumu kontrolü. {warnCount === 0 ? "Her şey stabil görünüyor." : `${warnCount} uyarı var.`}
        </p>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.heroLabel}>Genel Durum</p>
          <h2>{warnCount === 0 ? "Siteniz iyi durumda" : "Bazı iyileştirmeler gerekli"}</h2>
          <p>
            Temel altyapı kontrolü tamamlandı. Ayrıntıları aşağıdaki kartlarda görebilirsin.
          </p>
          <Link href="/admin/tools" className={styles.heroAction}>
            Araçlara geri dön
          </Link>
        </div>
      </section>

      <section className={styles.grid}>
        {checks.map((item) => (
          <article key={item.label} className={styles.card}>
            <div className={styles.cardTop}>
              <h3>{item.label}</h3>
              <span className={item.status === "good" ? styles.good : styles.warn}>
                {statusLabel(item.status)}
              </span>
            </div>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
