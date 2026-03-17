import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import styles from "./page.module.css";

async function addTag(formData: FormData) {
  "use server";
  const name = formData.get("name")?.toString().trim() ?? "";
  if (!name) {
    return;
  }
  const slug = slugify(name) || "etiket";
  let finalSlug = slug;
  let counter = 2;
  while (await prisma.tag.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter}`;
    counter += 1;
  }
  await prisma.tag.create({
    data: { name, slug: finalSlug },
  });
  revalidatePath("/admin/tags");
}

async function deleteTag(formData: FormData) {
  "use server";
  const id = formData.get("id")?.toString();
  if (!id) {
    return;
  }
  await prisma.postTag.deleteMany({ where: { tagId: id } });
  await prisma.tag.delete({ where: { id } });
  revalidatePath("/admin/tags");
}

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Etiketler</h1>
          <p>Yazıları detaylandırmak için etiketleri buradan yönetebilirsin.</p>
        </div>
      </header>

      <form className={styles.form} action={addTag}>
        <input name="name" placeholder="Yeni etiket" />
        <button type="submit">Ekle</button>
      </form>

      {tags.length === 0 ? (
        <div className={styles.empty}>
          <p>Henüz etiket eklenmemiş.</p>
        </div>
      ) : (
        <div className={styles.table}>
          {tags.map((tag) => (
            <div key={tag.id} className={styles.row}>
              <div>
                <p className={styles.title}>{tag.name}</p>
                <span className={styles.meta}>{tag._count.posts} yazı</span>
              </div>
              <form action={deleteTag}>
                <input type="hidden" name="id" value={tag.id} />
                <button className={styles.danger} type="submit">
                  Sil
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
