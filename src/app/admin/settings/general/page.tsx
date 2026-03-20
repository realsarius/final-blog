import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/adminAuth";
import { getResolvedSiteSettings, upsertSiteSettings } from "@/lib/siteSettings";
import styles from "./page.module.css";

const WEEK_START_OPTIONS = ["Monday", "Sunday", "Saturday"] as const;
const LANGUAGE_OPTIONS = ["tr", "en"] as const;

function normalizeWithFallback(raw: FormDataEntryValue | null, fallback: string) {
  const value = raw?.toString().trim() ?? "";
  return value.length > 0 ? value : fallback;
}

function normalizeUrl(raw: FormDataEntryValue | null, fallback: string) {
  const value = normalizeWithFallback(raw, fallback);
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return fallback;
  }
}

function normalizeEmail(raw: FormDataEntryValue | null, fallback: string) {
  const value = normalizeWithFallback(raw, fallback).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : fallback;
}

async function saveSettings(formData: FormData) {
  "use server";

  await requireAdminSession("/admin/settings/general");

  const current = await getResolvedSiteSettings();

  const siteName = normalizeWithFallback(formData.get("siteName"), current.siteName);
  const siteDescription = normalizeWithFallback(formData.get("siteDescription"), current.siteDescription);
  const siteUrl = normalizeUrl(formData.get("siteUrl"), current.siteUrl);
  const adminEmail = normalizeEmail(formData.get("adminEmail"), current.adminEmail);
  const adminFirstName = normalizeWithFallback(formData.get("adminFirstName"), current.adminFirstName);
  const adminLastName = normalizeWithFallback(formData.get("adminLastName"), current.adminLastName);
  const timezone = normalizeWithFallback(formData.get("timezone"), current.timezone);
  const dateFormat = normalizeWithFallback(formData.get("dateFormat"), current.dateFormat);
  const timeFormat = normalizeWithFallback(formData.get("timeFormat"), current.timeFormat);
  const weekStartsRaw = normalizeWithFallback(formData.get("weekStartsOn"), current.weekStartsOn);
  const languageRaw = normalizeWithFallback(formData.get("language"), current.language);

  const weekStartsOn = WEEK_START_OPTIONS.includes(weekStartsRaw as (typeof WEEK_START_OPTIONS)[number])
    ? weekStartsRaw
    : current.weekStartsOn;
  const language = LANGUAGE_OPTIONS.includes(languageRaw as (typeof LANGUAGE_OPTIONS)[number])
    ? languageRaw
    : current.language;

  await upsertSiteSettings({
    siteName,
    siteDescription,
    siteUrl,
    adminEmail,
    adminFirstName,
    adminLastName,
    timezone,
    dateFormat,
    timeFormat,
    weekStartsOn,
    language,
  });

  revalidatePath("/", "layout");
  revalidatePath("/contact");
  revalidatePath("/privacy");
  revalidatePath("/admin/settings/general");
  redirect("/admin/settings/general?success=Ayarlar%20kaydedildi.");
}

export default async function AdminGeneralSettingsPage() {
  await requireAdminSession("/admin/settings/general");
  const settings = await getResolvedSiteSettings();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Genel Ayarlar</h1>
        <p>Öncelik veritabanı ayarlarında. Kayıt yoksa .env değerleri otomatik kullanılır.</p>
      </header>

      <form action={saveSettings} className={styles.form}>
        <label>
          Site Başlığı
          <input name="siteName" defaultValue={settings.siteName} required />
        </label>

        <label>
          Site Açıklaması (Tagline)
          <textarea
            name="siteDescription"
            rows={3}
            defaultValue={settings.siteDescription}
            required
          />
        </label>

        <label>
          Site URL
          <input name="siteUrl" defaultValue={settings.siteUrl} required />
        </label>

        <div className={styles.row}>
          <label>
            Admin E-posta
            <input name="adminEmail" type="email" defaultValue={settings.adminEmail} required />
          </label>

          <label>
            Saat Dilimi
            <input name="timezone" defaultValue={settings.timezone} required />
          </label>
        </div>

        <div className={styles.row}>
          <label>
            Admin Ad
            <input name="adminFirstName" defaultValue={settings.adminFirstName} required />
          </label>
          <label>
            Admin Soyad
            <input name="adminLastName" defaultValue={settings.adminLastName} required />
          </label>
        </div>

        <div className={styles.row}>
          <label>
            Tarih Formatı
            <input name="dateFormat" defaultValue={settings.dateFormat} required />
          </label>
          <label>
            Saat Formatı
            <input name="timeFormat" defaultValue={settings.timeFormat} required />
          </label>
        </div>

        <div className={styles.row}>
          <label>
            Hafta Başlangıcı
            <select name="weekStartsOn" defaultValue={settings.weekStartsOn}>
              {WEEK_START_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <label>
            Dil
            <select name="language" defaultValue={settings.language}>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>

        <button type="submit" className={styles.submit}>
          Save Changes
        </button>
      </form>
    </div>
  );
}
