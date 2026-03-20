import { requireAdminSession } from "@/lib/adminAuth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import NotesClient from "./NotesClient";

export default async function NotesPage() {
  await requireAdminSession("/admin/notlar");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);

  return <NotesClient locale={locale} messages={messages.admin.notes} />;
}
