import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import styles from "./page.module.css";

async function addCategory(formData: FormData) {
  "use server";
  const name = formData.get("name")?.toString().trim() ?? "";
  if (!name) {
    return;
  }
  const slug = slugify(name) || "kategori";
  let finalSlug = slug;
  let counter = 2;
  while (await prisma.category.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter}`;
    counter += 1;
  }
  await prisma.category.create({
    data: { name, slug: finalSlug },
  });
  revalidatePath("/admin/categories");
}

async function updateCategory(formData: FormData) {
  "use server";
  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString().trim() ?? "";
  if (!id || !name) {
    return;
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return;
  }

  const baseSlug = slugify(name) || "kategori";
  let finalSlug = baseSlug;
  let counter = 2;
  while (true) {
    const conflict = await prisma.category.findUnique({
      where: { slug: finalSlug },
    });
    if (!conflict || conflict.id === id) {
      break;
    }
    finalSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  await prisma.category.update({
    where: { id },
    data: { name, slug: finalSlug },
  });
  revalidatePath("/admin/categories");
}

async function deleteCategory(formData: FormData) {
  "use server";
  const id = formData.get("id")?.toString();
  if (!id) {
    return;
  }
  await prisma.postCategory.deleteMany({ where: { categoryId: id } });
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
}

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Kategoriler</h1>
          <p>Yazıları gruplamak için kategorileri burada yönetebilirsin.</p>
        </div>
      </header>

      <form className={styles.form} action={addCategory}>
        <input name="name" placeholder="Yeni kategori" />
        <button type="submit">Ekle</button>
      </form>

      {categories.length === 0 ? (
        <div className={styles.empty}>
          <p>Henüz kategori eklenmemiş.</p>
        </div>
      ) : (
        <div className={styles.table}>
          {categories.map((category) => (
            <div key={category.id} className={styles.row}>
              <form className={styles.editForm} action={updateCategory}>
                <input type="hidden" name="id" value={category.id} />
                <input name="name" defaultValue={category.name} />
                <button type="submit">Kaydet</button>
              </form>
              <span className={styles.meta}>{category._count.posts} yazı</span>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={category.id} />
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
