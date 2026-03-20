import Link from "next/link";
import { requireAdminSession } from "@/lib/adminAuth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import { interpolate } from "@/lib/interpolate";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

type HealthStatus = "good" | "warn";

type HealthItem = {
  label: string;
  status: HealthStatus;
  detail: string;
};

function statusLabel(status: HealthStatus, messages: { statusGood: string; statusWarn: string }) {
  return status === "good" ? messages.statusGood : messages.statusWarn;
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

async function getDatabaseHealth(messages: {
  dbLabel: string;
  dbDetailGood: string;
  dbDetailWarn: string;
}): Promise<HealthItem> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      label: messages.dbLabel,
      status: "good",
      detail: messages.dbDetailGood,
    };
  } catch {
    return {
      label: messages.dbLabel,
      status: "warn",
      detail: messages.dbDetailWarn,
    };
  }
}

function getR2Health(messages: {
  r2Label: string;
  r2DetailR2Good: string;
  r2DetailAutoGood: string;
  r2DetailR2Warn: string;
  r2DetailWarn: string;
}): HealthItem {
  const provider = (process.env.UPLOAD_PROVIDER ?? "local").trim().toLowerCase();
  const configured = hasR2Config();
  if (provider === "r2" && configured) {
    return {
      label: messages.r2Label,
      status: "good",
      detail: messages.r2DetailR2Good,
    };
  }
  if (provider === "auto" && configured) {
    return {
      label: messages.r2Label,
      status: "good",
      detail: messages.r2DetailAutoGood,
    };
  }
  if (provider === "r2" && !configured) {
    return {
      label: messages.r2Label,
      status: "warn",
      detail: messages.r2DetailR2Warn,
    };
  }
  return {
    label: messages.r2Label,
    status: "warn",
    detail: messages.r2DetailWarn,
  };
}

function getAuthHealth(messages: {
  authLabel: string;
  authDetailGood: string;
  authDetailWarn: string;
}): HealthItem {
  const hasAuthUrl = Boolean(process.env.NEXTAUTH_URL);
  return {
    label: messages.authLabel,
    status: hasAuthUrl ? "good" : "warn",
    detail: hasAuthUrl
      ? messages.authDetailGood
      : messages.authDetailWarn,
  };
}

export default async function AdminSiteHealthPage() {
  await requireAdminSession("/admin/tools/site-health");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const t = messages.admin.siteHealth;

  const checks: HealthItem[] = [
    await getDatabaseHealth(t),
    getR2Health(t),
    getAuthHealth(t),
  ];

  const warnCount = checks.filter((item) => item.status === "warn").length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t.title}</h1>
        <p>
          {warnCount === 0 ? t.subtitleStable : interpolate(t.subtitleWarn, { count: warnCount })}
        </p>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.heroLabel}>{t.heroLabel}</p>
          <h2>{warnCount === 0 ? t.heroTitleGood : t.heroTitleWarn}</h2>
          <p>
            {t.heroDescription}
          </p>
          <Link href="/admin/tools" className={styles.heroAction}>
            {t.backToTools}
          </Link>
        </div>
      </section>

      <section className={styles.grid}>
        {checks.map((item) => (
          <article key={item.label} className={styles.card}>
            <div className={styles.cardTop}>
              <h3>{item.label}</h3>
              <span className={item.status === "good" ? styles.good : styles.warn}>
                {statusLabel(item.status, t)}
              </span>
            </div>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
