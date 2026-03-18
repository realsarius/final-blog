import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import ConfirmDeleteForm from "@/components/admin/ConfirmDeleteForm";
import styles from "./page.module.css";

async function deletePost(formData: FormData) {
  "use server";
  const id = formData.get("id")?.toString();
  if (!id) {
    return;
  }
  await prisma.postCategory.deleteMany({ where: { postId: id } });
  await prisma.postTag.deleteMany({ where: { postId: id } });
  await prisma.post.delete({ where: { id } });
  revalidatePath("/admin/posts");
  redirect(`/admin/posts?success=${encodeURIComponent("Yazı silindi.")}`);
}

export default async function AdminPostsPage() {
  const posts = await prisma.post.findMany({
    orderBy: [{ createdAt: "desc" }],
  });

  const statusLabel = (status: string) =>
    status === "PUBLISHED" ? "Yayında" : "Taslak";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Yazılar</h1>
          <p>Taslakları ve yayınlanan yazıları buradan yönetebilirsin.</p>
        </div>
        <Link className={styles.primary} href="/admin/posts/new">
          Yeni yazı
        </Link>
      </header>

      {posts.length === 0 ? (
        <div className={styles.empty}>
          <p>Henüz yazı yok.</p>
          <p>İlk yazı için yeni yazı butonunu kullan.</p>
        </div>
      ) : (
        <div className={styles.table}>
          {posts.map((post) => (
            <div key={post.id} className={styles.row}>
              <div className={styles.info}>
                <p className={styles.title}>{post.title}</p>
                <span className={styles.meta}>
                  {formatDate(post.createdAt)} · {statusLabel(post.status)}
                </span>
              </div>
              <div className={styles.actions}>
                <Link className={styles.link} href={`/admin/posts/${post.id}/edit`}>
                  Düzenle
                </Link>
                <ConfirmDeleteForm
                  action={deletePost}
                  idValue={post.id}
                  className={styles.danger}
                  confirmMessage="Bu yazıyı silmek istediğine emin misin?"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
