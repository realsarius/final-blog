import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getFirstErrorMessage, nameSchema } from "@/lib/validation";
import styles from "./page.module.css";

async function addTag(formData: FormData) {
  "use server";
  const name = formData.get("name")?.toString().trim() ?? "";
  const validation = nameSchema.safeParse(name);
  if (!validation.success) {
    const message = getFirstErrorMessage(validation);
    redirect(`/admin/tags?error=${encodeURIComponent(message)}`);
  }
  const slug = slugify(name) || "etiket";
  let finalSlug = slug;
  let counter = 2;
  while (await prisma.tag.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter}`;
    counter += 1;
  }
  await prisma.tag.create({
    data: { name: validation.data, slug: finalSlug },
  });
  revalidatePath("/admin/tags");
}

async function updateTag(formData: FormData) {
  "use server";
  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString().trim() ?? "";
  if (!id || !name) {
    return;
  }

  const validation = nameSchema.safeParse(name);
  if (!validation.success) {
    const message = getFirstErrorMessage(validation);
    redirect(`/admin/tags?error=${encodeURIComponent(message)}`);
  }

  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) {
    return;
  }

  const baseSlug = slugify(validation.data) || "etiket";
  let finalSlug = baseSlug;
  let counter = 2;
  while (true) {
    const conflict = await prisma.tag.findUnique({
      where: { slug: finalSlug },
    });
    if (!conflict || conflict.id === id) {
      break;
    }
    finalSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  await prisma.tag.update({
    where: { id },
    data: { name: validation.data, slug: finalSlug },
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

export default async function TagsPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
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

      {searchParams?.error ? (
        <p className={styles.error}>{searchParams.error}</p>
      ) : null}

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
              <form className={styles.editForm} action={updateTag}>
                <input type="hidden" name="id" value={tag.id} />
                <input name="name" defaultValue={tag.name} />
                <button type="submit">Kaydet</button>
              </form>
              <span className={styles.meta}>{tag._count.posts} yazı</span>
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
