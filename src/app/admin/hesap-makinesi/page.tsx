import { requireAdminSession } from "@/lib/adminAuth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import CalculatorClient from "./CalculatorClient";

export default async function CalculatorPage() {
  await requireAdminSession("/admin/hesap-makinesi");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);

  return <CalculatorClient messages={messages.admin.calculator} />;
}
