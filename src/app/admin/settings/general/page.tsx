import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/adminAuth";
import { getResolvedSiteSettings, upsertSiteSettings } from "@/lib/siteSettings";
import { getMessages, getServerLocale } from "@/lib/i18n";
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
  const messages = await getMessages(language === "en" ? "en" : "tr");

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
  redirect(`/admin/settings/general?success=${encodeURIComponent(messages.admin.settings.general.successSaved)}`);
}

export default async function AdminGeneralSettingsPage() {
  await requireAdminSession("/admin/settings/general");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const t = messages.admin.settings.general;
  const settings = await getResolvedSiteSettings();
  const weekStartLabels: Record<(typeof WEEK_START_OPTIONS)[number], string> = {
    Monday: t.weekStartsOnMonday,
    Sunday: t.weekStartsOnSunday,
    Saturday: t.weekStartsOnSaturday,
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t.title}</h1>
        <p>{t.description}</p>
      </header>

      <form action={saveSettings} className={styles.form}>
        <label>
          {t.siteTitle}
          <input name="siteName" defaultValue={settings.siteName} required />
        </label>

        <label>
          {t.siteDescription}
          <textarea
            name="siteDescription"
            rows={3}
            defaultValue={settings.siteDescription}
            required
          />
        </label>

        <label>
          {t.siteUrl}
          <input name="siteUrl" defaultValue={settings.siteUrl} required />
        </label>

        <div className={styles.row}>
          <label>
            {t.adminEmail}
            <input name="adminEmail" type="email" defaultValue={settings.adminEmail} required />
          </label>

          <label>
            {t.timezone}
            <input name="timezone" defaultValue={settings.timezone} required />
          </label>
        </div>

        <div className={styles.row}>
          <label>
            {t.adminFirstName}
            <input name="adminFirstName" defaultValue={settings.adminFirstName} required />
          </label>
          <label>
            {t.adminLastName}
            <input name="adminLastName" defaultValue={settings.adminLastName} required />
          </label>
        </div>

        <div className={styles.row}>
          <label>
            {t.dateFormat}
            <input name="dateFormat" defaultValue={settings.dateFormat} required />
          </label>
          <label>
            {t.timeFormat}
            <input name="timeFormat" defaultValue={settings.timeFormat} required />
          </label>
        </div>

        <div className={styles.row}>
          <label>
            {t.weekStartsOn}
            <select name="weekStartsOn" defaultValue={settings.weekStartsOn}>
              {WEEK_START_OPTIONS.map((value) => (
                <option key={value} value={value}>{weekStartLabels[value]}</option>
              ))}
            </select>
          </label>

          <label>
            {t.language}
            <select name="language" defaultValue={settings.language}>
              <option value="tr">{t.languageTurkish}</option>
              <option value="en">{t.languageEnglish}</option>
            </select>
          </label>
        </div>

        <button type="submit" className={styles.submit}>
          {t.saveChanges}
        </button>
      </form>
    </div>
  );
}
