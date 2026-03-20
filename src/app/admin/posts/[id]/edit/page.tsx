import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireAdminSession } from "@/lib/adminAuth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import { getFirstErrorMessage, postSchema, splitCommaList } from "@/lib/validation";
import { parsePostStatus, resolvePublishedAt } from "@/lib/postPublication";
import styles from "../../post-form.module.css";
import EditorField from "../../EditorField";
import TaxonomyPicker from "../../TaxonomyPicker";
import CoverImageField from "../../CoverImageField";

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
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.posts;
  await requireAdminSession("/admin/posts");

  const id = formData.get("id")?.toString() ?? "";
  const title = formData.get("title")?.toString() ?? "";
  const slugInput = formData.get("slug")?.toString() ?? "";
  const excerpt = formData.get("excerpt")?.toString() ?? "";
  const content = formData.get("content")?.toString() ?? "";
  const coverImageUrl = formData.get("coverImageUrl")?.toString() ?? "";
  const status = parsePostStatus(formData.get("status")?.toString());
  const categories = splitCommaList(formData.get("categories")?.toString() ?? "");
  const tags = splitCommaList(formData.get("tags")?.toString() ?? "");

  if (!id || !title || !content) {
    redirect(`/admin/posts/${id}/edit?error=${encodeURIComponent(m.requiredTitleContent)}`);
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
    const message = getFirstErrorMessage(validation, locale);
    redirect(`/admin/posts/${id}/edit?error=${encodeURIComponent(message)}`);
  }

  const existingPost = await prisma.post.findUnique({ where: { id } });
  if (!existingPost) {
    return;
  }

  const baseSlug = slugify(slugInput || validation.data.title);
  const slug = await generateUniquePostSlug(baseSlug || (locale === "en" ? "post" : "yazi"), id);
  const publishedAt = resolvePublishedAt(status, existingPost.publishedAt);

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
  redirect(`/admin/posts?success=${encodeURIComponent(m.successUpdated)}`);
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EditPostPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const error =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : undefined;
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.posts;
  const form = m.form;
  const [post, categories, tags] = await Promise.all([
    prisma.post.findUnique({
      where: { id: resolvedParams.id },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!post) {
    notFound();
  }

  const categoryList = post.categories.map((item) => item.category.name);
  const tagList = post.tags.map((item) => item.tag.name);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{form.editTitle}</h1>
        <p>{form.editSubtitle}</p>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <form className={styles.form} action={updatePost}>
        <input type="hidden" name="id" value={post.id} />

        <div className={styles.field}>
          <label htmlFor="title">{form.title}</label>
          <input id="title" name="title" defaultValue={post.title} required />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="slug">{form.slug}</label>
            <input id="slug" name="slug" defaultValue={post.slug} />
          </div>
          <div className={styles.field}>
            <label htmlFor="status">{form.status}</label>
            <select id="status" name="status" defaultValue={post.status}>
              <option value="DRAFT">{form.statusDraft}</option>
              <option value="PUBLISHED">{form.statusPublish}</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="excerpt">{form.excerpt}</label>
          <textarea id="excerpt" name="excerpt" rows={3} defaultValue={post.excerpt ?? ""} />
        </div>

        <div className={styles.field}>
          <label htmlFor="content">{form.content}</label>
          <EditorField name="content" defaultValue={post.content} messages={m.editor} locale={locale} />
        </div>

        <div className={styles.row}>
          <TaxonomyPicker
            label={form.categories}
            name="categories"
            options={categories.map((item) => item.name)}
            defaultSelected={categoryList}
            placeholder={form.categoriesPlaceholder}
            removeSuffix={m.taxonomy.removeSuffix}
            createTemplate={m.taxonomy.create}
            noMatchesLabel={m.taxonomy.noMatches}
          />
          <TaxonomyPicker
            label={form.tags}
            name="tags"
            options={tags.map((item) => item.name)}
            defaultSelected={tagList}
            placeholder={form.tagsPlaceholder}
            removeSuffix={m.taxonomy.removeSuffix}
            createTemplate={m.taxonomy.create}
            noMatchesLabel={m.taxonomy.noMatches}
          />
        </div>

        <CoverImageField
          name="coverImageUrl"
          label={form.coverImageUrl}
          messages={m.cover}
          defaultValue={post.coverImageUrl ?? ""}
        />

        <div className={styles.actions}>
          <button className={styles.primary} type="submit">
            {form.update}
          </button>
          <a className={styles.secondary} href="/admin/posts">
            {form.cancel}
          </a>
        </div>
      </form>
    </div>
  );
}
