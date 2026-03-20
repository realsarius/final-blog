import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireAdminSession } from "@/lib/adminAuth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import { getFirstErrorMessage, postSchema, splitCommaList } from "@/lib/validation";
import { parsePostStatus, resolvePublishedAt } from "@/lib/postPublication";
import { resolveCategoryIds, resolveTagIds } from "@/lib/postTaxonomy";
import styles from "../post-form.module.css";
import EditorField from "../EditorField";
import TaxonomyPicker from "../TaxonomyPicker";
import CoverImageField from "../CoverImageField";

async function generateUniquePostSlug(base: string) {
  let slug = base;
  let counter = 2;
  while (await prisma.post.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

async function resolveAuthorId(userId?: string, userEmail?: string | null) {
  const conditions: Array<{ id?: string; email?: string }> = [];
  if (userId) {
    conditions.push({ id: userId });
  }
  if (userEmail) {
    conditions.push({ email: userEmail.toLowerCase() });
  }
  if (conditions.length === 0) {
    return null;
  }

  const author = await prisma.user.findFirst({
    where: {
      OR: conditions,
    },
    select: {
      id: true,
    },
  });

  return author?.id ?? null;
}

async function createPost(formData: FormData) {
  "use server";
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.posts;
  const session = await requireAdminSession("/admin/posts/new");
  const authorId = await resolveAuthorId(session.user.id, session.user.email);
  if (!authorId) {
    redirect(
      `/login?callbackUrl=/admin/posts/new&error=${encodeURIComponent(m.loginExpired)}`,
    );
  }

  const title = formData.get("title")?.toString() ?? "";
  const slugInput = formData.get("slug")?.toString() ?? "";
  const excerpt = formData.get("excerpt")?.toString() ?? "";
  const content = formData.get("content")?.toString() ?? "";
  const coverImageUrl = formData.get("coverImageUrl")?.toString() ?? "";
  const status = parsePostStatus(formData.get("status")?.toString());
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
    const message = getFirstErrorMessage(validation, locale);
    redirect(`/admin/posts/new?error=${encodeURIComponent(message)}`);
  }

  const baseSlug = slugify(slugInput || validation.data.title);
  const slug = await generateUniquePostSlug(baseSlug || (locale === "en" ? "post" : "yazi"));
  const [categoryIds, tagIds] = await Promise.all([
    resolveCategoryIds(validation.data.categories),
    resolveTagIds(validation.data.tags),
  ]);

  await prisma.post.create({
    data: {
      title: validation.data.title,
      slug,
      excerpt: validation.data.excerpt || null,
      content: validation.data.content,
      coverImageUrl: validation.data.coverImageUrl || null,
      status,
      publishedAt: resolvePublishedAt(status),
      authorId,
      categories: {
        create: categoryIds.map((categoryId) => ({
          category: {
            connect: { id: categoryId },
          },
        })),
      },
      tags: {
        create: tagIds.map((tagId) => ({
          tag: {
            connect: { id: tagId },
          },
        })),
      },
    },
  });

  revalidatePath("/admin/posts");
  redirect(`/admin/posts?success=${encodeURIComponent(m.successCreated)}`);
}

export default async function NewPostPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const error =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : undefined;
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.posts;
  const form = m.form;
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{form.newTitle}</h1>
        <p>{form.newSubtitle}</p>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <form className={styles.form} action={createPost}>
        <div className={styles.field}>
          <label htmlFor="title">{form.title}</label>
          <input id="title" name="title" required />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="slug">{form.slug}</label>
            <input id="slug" name="slug" placeholder={form.slugPlaceholder} />
          </div>
          <div className={styles.field}>
            <label htmlFor="status">{form.status}</label>
            <select id="status" name="status" defaultValue="DRAFT">
              <option value="DRAFT">{form.statusDraft}</option>
              <option value="PUBLISHED">{form.statusPublish}</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="excerpt">{form.excerpt}</label>
          <textarea id="excerpt" name="excerpt" rows={3} />
        </div>

        <div className={styles.field}>
          <label htmlFor="content">{form.content}</label>
          <EditorField name="content" messages={m.editor} locale={locale} />
        </div>

        <div className={styles.row}>
          <TaxonomyPicker
            label={form.categories}
            name="categories"
            options={categories.map((item) => item.name)}
            placeholder={form.categoriesPlaceholder}
            removeSuffix={m.taxonomy.removeSuffix}
            createTemplate={m.taxonomy.create}
            noMatchesLabel={m.taxonomy.noMatches}
          />
          <TaxonomyPicker
            label={form.tags}
            name="tags"
            options={tags.map((item) => item.name)}
            placeholder={form.tagsPlaceholder}
            removeSuffix={m.taxonomy.removeSuffix}
            createTemplate={m.taxonomy.create}
            noMatchesLabel={m.taxonomy.noMatches}
          />
        </div>

        <CoverImageField name="coverImageUrl" label={form.coverImageUrl} messages={m.cover} />

        <div className={styles.actions}>
          <button className={styles.primary} type="submit">
            {form.save}
          </button>
          <a className={styles.secondary} href="/admin/posts">
            {form.cancel}
          </a>
        </div>
      </form>
    </div>
  );
}
