import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  return (
    <main style={{ maxWidth: 720, margin: "80px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Admin Panel</h1>
      <p style={{ margin: 0 }}>
        Hoş geldin {session?.user?.name ?? ""}.
      </p>
      <p style={{ color: "#6b7280" }}>
        Faz 2 tamamlandı. Sonraki adımda içerik yönetimi ekranlarını kuracağız.
      </p>
    </main>
  );
}
