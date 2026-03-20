import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireAdminSession } from "@/lib/adminAuth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import { getFirstErrorMessage, nameSchema } from "@/lib/validation";
import ConfirmDeleteForm from "@/components/admin/ConfirmDeleteForm";
import styles from "./page.module.css";

async function addCategory(formData: FormData) {
  "use server";
  await requireAdminSession("/admin/categories");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.categories;
  const name = formData.get("name")?.toString().trim() ?? "";
  const validation = nameSchema.safeParse(name);
  if (!validation.success) {
    const message = getFirstErrorMessage(validation, locale);
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
      redirect(`/admin/categories?error=${encodeURIComponent(m.duplicateName)}`);
    }
    throw error;
  }
  revalidatePath("/admin/categories");
  redirect(`/admin/categories?success=${encodeURIComponent(m.successAdded)}`);
}

async function updateCategory(formData: FormData) {
  "use server";
  await requireAdminSession("/admin/categories");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.categories;
  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString().trim() ?? "";
  if (!id || !name) {
    return;
  }

  const validation = nameSchema.safeParse(name);
  if (!validation.success) {
    const message = getFirstErrorMessage(validation, locale);
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
      redirect(`/admin/categories?error=${encodeURIComponent(m.duplicateName)}`);
    }
    throw error;
  }
  revalidatePath("/admin/categories");
  redirect(`/admin/categories?success=${encodeURIComponent(m.successUpdated)}`);
}

async function deleteCategory(formData: FormData) {
  "use server";
  await requireAdminSession("/admin/categories");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.categories;
  const id = formData.get("id")?.toString();
  if (!id) {
    return;
  }
  await prisma.postCategory.deleteMany({ where: { categoryId: id } });
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  redirect(`/admin/categories?success=${encodeURIComponent(m.successDeleted)}`);
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession("/admin/categories");
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.categories;
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
          <h1>{m.title}</h1>
          <p>{m.subtitle}</p>
        </div>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <form className={styles.form} action={addCategory}>
        <input name="name" placeholder={m.newPlaceholder} />
        <button type="submit">{m.add}</button>
      </form>

      {categories.length === 0 ? (
        <div className={styles.empty}>
          <p>{m.empty}</p>
        </div>
      ) : (
        <div className={styles.table}>
          {categories.map((category) => (
            <div key={category.id} className={styles.row}>
              <form className={styles.editForm} action={updateCategory}>
                <input type="hidden" name="id" value={category.id} />
                <input name="name" defaultValue={category.name} />
                <button type="submit">{m.save}</button>
              </form>
              {category._count.posts > 0 ? (
                <Link
                  className={styles.metaLink}
                  href={`/admin/posts?date=all&category=${encodeURIComponent(category.id)}`}
                >
                  {category._count.posts} {m.postsCountSuffix}
                </Link>
              ) : (
                <span className={styles.meta}>0 {m.postsCountSuffix}</span>
              )}
              <ConfirmDeleteForm
                action={deleteCategory}
                idValue={category.id}
                className={styles.danger}
                confirmMessage={m.confirmDelete}
                buttonLabel={m.delete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
