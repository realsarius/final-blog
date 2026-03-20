import { requireAdminSession } from "@/lib/adminAuth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import MediaLibraryClient from "./MediaLibraryClient";
import styles from "./page.module.css";

export default async function AdminMediaPage() {
  await requireAdminSession("/admin/media");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);

  return (
    <div className={styles.page}>
      <MediaLibraryClient locale={locale} messages={messages.admin.media} />
    </div>
  );
}
