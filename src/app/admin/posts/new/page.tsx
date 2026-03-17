import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { authOptions } from "@/lib/auth";
import { getFirstErrorMessage, postSchema, splitCommaList } from "@/lib/validation";
import styles from "../post-form.module.css";
import MarkdownField from "../MarkdownField";

async function generateUniquePostSlug(base: string) {
  let slug = base;
  let counter = 2;
  while (await prisma.post.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

async function createPost(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/posts/new");
  }

  const title = formData.get("title")?.toString() ?? "";
  const slugInput = formData.get("slug")?.toString() ?? "";
  const excerpt = formData.get("excerpt")?.toString() ?? "";
  const content = formData.get("content")?.toString() ?? "";
  const coverImageUrl = formData.get("coverImageUrl")?.toString() ?? "";
  const status = formData.get("status")?.toString() === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const categories = splitCommaList(formData.get("categories")?.toString() ?? "");
  const tags = splitCommaList(formData.get("tags")?.toString() ?? "");

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
    redirect(`/admin/posts/new?error=${encodeURIComponent(message)}`);
  }

  const baseSlug = slugify(slugInput || validation.data.title);
  const slug = await generateUniquePostSlug(baseSlug || "yazi");

  await prisma.post.create({
    data: {
      title: validation.data.title,
      slug,
      excerpt: validation.data.excerpt || null,
      content: validation.data.content,
      coverImageUrl: validation.data.coverImageUrl || null,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      authorId: session.user.id,
      categories: {
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
  redirect(`/admin/posts?success=${encodeURIComponent("Yazı oluşturuldu.")}`);
}

export default function NewPostPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Yeni Yazı</h1>
        <p>Başlık, içerik ve kategori bilgilerini girerek yeni yazı oluştur.</p>
      </header>

      {searchParams?.error ? (
        <p className={styles.error}>{searchParams.error}</p>
      ) : null}

      <form className={styles.form} action={createPost}>
        <div className={styles.field}>
          <label htmlFor="title">Başlık</label>
          <input id="title" name="title" required />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="slug">Slug</label>
            <input id="slug" name="slug" placeholder="otomatik-olusturulur" />
          </div>
          <div className={styles.field}>
            <label htmlFor="status">Durum</label>
            <select id="status" name="status" defaultValue="DRAFT">
              <option value="DRAFT">Taslak</option>
              <option value="PUBLISHED">Yayınla</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="excerpt">Özet</label>
          <textarea id="excerpt" name="excerpt" rows={3} />
        </div>

        <div className={styles.field}>
          <label htmlFor="content">İçerik</label>
          <MarkdownField name="content" required />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="categories">Kategoriler (virgülle)</label>
            <input id="categories" name="categories" placeholder="ör. ürün, yazılım" />
          </div>
          <div className={styles.field}>
            <label htmlFor="tags">Etiketler (virgülle)</label>
            <input id="tags" name="tags" placeholder="ör. nextjs, prisma" />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="coverImageUrl">Kapak Görseli URL</label>
          <input id="coverImageUrl" name="coverImageUrl" />
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} type="submit">
            Kaydet
          </button>
          <a className={styles.secondary} href="/admin/posts">
            Vazgeç
          </a>
        </div>
      </form>
    </div>
  );
}
