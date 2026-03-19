import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireAdminSession } from "@/lib/adminAuth";
import { getFirstErrorMessage, nameSchema } from "@/lib/validation";
import ConfirmDeleteForm from "@/components/admin/ConfirmDeleteForm";
import styles from "./page.module.css";

async function addCategory(formData: FormData) {
  "use server";
  await requireAdminSession("/admin/categories");
  const name = formData.get("name")?.toString().trim() ?? "";
  const validation = nameSchema.safeParse(name);
  if (!validation.success) {
    const message = getFirstErrorMessage(validation);
    redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
  }
  const slug = slugify(name) || "kategori";
  let finalSlug = slug;
  let counter = 2;
  while (await prisma.category.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter}`;
    counter += 1;
  }
  try {
    await prisma.category.create({
      data: { name: validation.data, slug: finalSlug },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/admin/categories?error=${encodeURIComponent("Bu kategori adı zaten kayıtlı.")}`);
    }
    throw error;
  }
  revalidatePath("/admin/categories");
  redirect(`/admin/categories?success=${encodeURIComponent("Kategori eklendi.")}`);
}

async function updateCategory(formData: FormData) {
  "use server";
  await requireAdminSession("/admin/categories");
  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString().trim() ?? "";
  if (!id || !name) {
    return;
  }

  const validation = nameSchema.safeParse(name);
  if (!validation.success) {
    const message = getFirstErrorMessage(validation);
    redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return;
  }

  const baseSlug = slugify(validation.data) || "kategori";
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

  try {
    await prisma.category.update({
      where: { id },
      data: { name: validation.data, slug: finalSlug },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/admin/categories?error=${encodeURIComponent("Bu kategori adı zaten kayıtlı.")}`);
    }
    throw error;
  }
  revalidatePath("/admin/categories");
  redirect(`/admin/categories?success=${encodeURIComponent("Kategori güncellendi.")}`);
}

async function deleteCategory(formData: FormData) {
  "use server";
  await requireAdminSession("/admin/categories");
  const id = formData.get("id")?.toString();
  if (!id) {
    return;
  }
  await prisma.postCategory.deleteMany({ where: { categoryId: id } });
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  redirect(`/admin/categories?success=${encodeURIComponent("Kategori silindi.")}`);
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession("/admin/categories");
  const resolvedSearchParams = (await searchParams) ?? {};
  const error =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : undefined;
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

      {error ? <p className={styles.error}>{error}</p> : null}

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
              <ConfirmDeleteForm
                action={deleteCategory}
                idValue={category.id}
                className={styles.danger}
                confirmMessage="Bu kategoriyi silmek istediğine emin misin?"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
