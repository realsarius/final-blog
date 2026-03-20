import { redirect } from "next/navigation";

export default function AdminSettingsRootPage() {
  redirect("/admin/settings/general");
}
