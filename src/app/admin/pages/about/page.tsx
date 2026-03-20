import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/lib/adminAuth";
import { getMessages, getServerLocale, isLocale } from "@/lib/i18n";
import { getContentText } from "@/lib/content";
import { getAboutContent, upsertAboutContent } from "@/lib/aboutContent";
import EditorField from "@/app/admin/posts/EditorField";
import styles from "./page.module.css";

type EditableLocale = "tr" | "en";

function resolveEditableLocale(raw: string | undefined): EditableLocale {
  return isLocale(raw) ? raw : "tr";
}

async function saveAboutPage(formData: FormData) {
  "use server";

  await requireAdminSession("/admin/pages/about");

  const targetLocale = resolveEditableLocale(formData.get("targetLocale")?.toString());
  const content = formData.get("content")?.toString()?.trim() ?? "";
  const uiLocale = await getServerLocale();

  if (getContentText(content).length < 10) {
    const errorMessage = uiLocale === "en"
      ? "Content must be at least 10 characters."
      : "İçerik en az 10 karakter olmalı.";
    redirect(`/admin/pages/about?target=${targetLocale}&error=${encodeURIComponent(errorMessage)}`);
  }

  await upsertAboutContent(targetLocale, content);

  revalidatePath("/about");
  revalidatePath("/admin/pages/about");

  const successMessage = uiLocale === "en"
    ? "About page content saved."
    : "Hakkımda sayfası içeriği kaydedildi.";

  redirect(`/admin/pages/about?target=${targetLocale}&success=${encodeURIComponent(successMessage)}`);
}

export default async function AdminAboutPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession("/admin/pages/about");

  const params = (await searchParams) ?? {};
  const uiLocale = await getServerLocale();
  const messages = await getMessages(uiLocale);
  const targetLocale = resolveEditableLocale(
    typeof params.target === "string" ? params.target : undefined,
  );
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";
  const content = await getAboutContent(targetLocale);
  const t = uiLocale === "en"
    ? {
      title: "About Page",
      description: "Edit About page content with the same block editor used for posts.",
      languageLabel: "Content language",
      languageTr: "Turkish",
      languageEn: "English",
      save: "Save About Content",
      openPublic: "Open public page",
    }
    : {
      title: "Hakkımda Sayfası",
      description: "Yazı editörüyle aynı blok editörünü kullanarak Hakkımda içeriğini düzenleyin.",
      languageLabel: "İçerik dili",
      languageTr: "Türkçe",
      languageEn: "English",
      save: "Hakkımda İçeriğini Kaydet",
      openPublic: "Public sayfayı aç",
    };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t.title}</h1>
        <p>{t.description}</p>
      </header>

      <div className={styles.localeSwitch}>
        <span>{t.languageLabel}</span>
        <div className={styles.localeLinks}>
          <Link
            href="/admin/pages/about?target=tr"
            className={targetLocale === "tr" ? styles.localeLinkActive : styles.localeLink}
          >
            {t.languageTr}
          </Link>
          <Link
            href="/admin/pages/about?target=en"
            className={targetLocale === "en" ? styles.localeLinkActive : styles.localeLink}
          >
            {t.languageEn}
          </Link>
        </div>
      </div>

      {success ? <p className={styles.success}>{success}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <form className={styles.form} action={saveAboutPage}>
        <input type="hidden" name="targetLocale" value={targetLocale} />
        <EditorField
          name="content"
          defaultValue={content}
          messages={messages.admin.posts.editor}
          locale={targetLocale}
        />

        <div className={styles.actions}>
          <button type="submit" className={styles.primary}>{t.save}</button>
          <Link href="/about" className={styles.secondary}>{t.openPublic}</Link>
        </div>
      </form>
    </div>
  );
}
