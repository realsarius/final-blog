import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { authOptions } from "@/lib/auth";
import { getFirstErrorMessage, postSchema, splitCommaList } from "@/lib/validation";
import styles from "../../post-form.module.css";

async function generateUniquePostSlug(base: string, currentId: string) {
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing || existing.id === currentId) {
      return slug;
    }
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

async function updatePost(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/posts");
  }

  const id = formData.get("id")?.toString() ?? "";
  const title = formData.get("title")?.toString() ?? "";
  const slugInput = formData.get("slug")?.toString() ?? "";
  const excerpt = formData.get("excerpt")?.toString() ?? "";
  const content = formData.get("content")?.toString() ?? "";
  const coverImageUrl = formData.get("coverImageUrl")?.toString() ?? "";
  const status = formData.get("status")?.toString() === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const categories = splitCommaList(formData.get("categories")?.toString() ?? "");
  const tags = splitCommaList(formData.get("tags")?.toString() ?? "");

  if (!id || !title || !content) {
    redirect(`/admin/posts/${id}/edit?error=${encodeURIComponent("Başlık ve içerik zorunlu.")}`);
  }

  const validation = postSchema.safeParse({
    title,
    slug: slugInput,
    excerpt,
    content,
    coverImageUrl,
    status,
    categories,
    tags,
  });

  if (!validation.success) {
    const message = getFirstErrorMessage(validation);
    redirect(`/admin/posts/${id}/edit?error=${encodeURIComponent(message)}`);
  }

  const existingPost = await prisma.post.findUnique({ where: { id } });
  if (!existingPost) {
    return;
  }

  const baseSlug = slugify(slugInput || validation.data.title);
  const slug = await generateUniquePostSlug(baseSlug || "yazi", id);
  const publishedAt =
    status === "PUBLISHED"
      ? existingPost.publishedAt ?? new Date()
      : null;

  await prisma.post.update({
    where: { id },
    data: {
      title: validation.data.title,
      slug,
      excerpt: validation.data.excerpt || null,
      content: validation.data.content,
      coverImageUrl: validation.data.coverImageUrl || null,
      status,
      publishedAt,
      categories: {
        deleteMany: {},
        create: validation.data.categories.map((name) => ({
          category: {
            connectOrCreate: {
              where: { slug: slugify(name) },
              create: { name, slug: slugify(name) },
            },
          },
        })),
      },
      tags: {
        deleteMany: {},
        create: validation.data.tags.map((name) => ({
          tag: {
            connectOrCreate: {
              where: { slug: slugify(name) },
              create: { name, slug: slugify(name) },
            },
          },
        })),
      },
    },
  });

  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

interface PageProps {
  params: { id: string };
  searchParams?: { error?: string };
}

export default async function EditPostPage({ params, searchParams }: PageProps) {
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!post) {
    notFound();
  }

  const categoryList = post.categories.map((item) => item.category.name).join(", ");
  const tagList = post.tags.map((item) => item.tag.name).join(", ");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Yazıyı Düzenle</h1>
        <p>Mevcut içeriği güncelle ve değişiklikleri kaydet.</p>
      </header>

      {searchParams?.error ? (
        <p className={styles.error}>{searchParams.error}</p>
      ) : null}

      <form className={styles.form} action={updatePost}>
        <input type="hidden" name="id" value={post.id} />

        <div className={styles.field}>
          <label htmlFor="title">Başlık</label>
          <input id="title" name="title" defaultValue={post.title} required />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="slug">Slug</label>
            <input id="slug" name="slug" defaultValue={post.slug} />
          </div>
          <div className={styles.field}>
            <label htmlFor="status">Durum</label>
            <select id="status" name="status" defaultValue={post.status}>
              <option value="DRAFT">Taslak</option>
              <option value="PUBLISHED">Yayınla</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="excerpt">Özet</label>
          <textarea id="excerpt" name="excerpt" rows={3} defaultValue={post.excerpt ?? ""} />
        </div>

        <div className={styles.field}>
          <label htmlFor="content">İçerik</label>
          <textarea id="content" name="content" required defaultValue={post.content} />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="categories">Kategoriler (virgülle)</label>
            <input id="categories" name="categories" defaultValue={categoryList} />
          </div>
          <div className={styles.field}>
            <label htmlFor="tags">Etiketler (virgülle)</label>
            <input id="tags" name="tags" defaultValue={tagList} />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="coverImageUrl">Kapak Görseli URL</label>
          <input id="coverImageUrl" name="coverImageUrl" defaultValue={post.coverImageUrl ?? ""} />
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} type="submit">
            Güncelle
          </button>
          <a className={styles.secondary} href="/admin/posts">
            Vazgeç
          </a>
        </div>
      </form>
    </div>
  );
}
