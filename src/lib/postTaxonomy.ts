import "server-only";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

type TaxonomyRecord = {
  id: string;
  name: string;
  slug: string;
};

type TaxonomyRepository = {
  findMany: (args: unknown) => Promise<TaxonomyRecord[]>;
  createMany: (args: unknown) => Promise<unknown>;
};

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function resolveIdByNameOrSlug(records: TaxonomyRecord[], name: string, slug: string): string | null {
  const byName = records.find((record) => record.name === name);
  if (byName) {
    return byName.id;
  }

  const bySlug = records.find((record) => record.slug === slug);
  if (bySlug) {
    return bySlug.id;
  }

  return null;
}

async function resolveTaxonomyIds(
  names: string[],
  repository: TaxonomyRepository,
  errorPrefix: string,
) {
  const uniqueNames = uniq(names);
  if (uniqueNames.length === 0) {
    return [] as string[];
  }

  const slugByName = new Map(uniqueNames.map((name) => [name, slugify(name)]));
  const uniqueSlugs = Array.from(new Set(Array.from(slugByName.values()).filter(Boolean)));

  const where = {
    OR: [
      { name: { in: uniqueNames } },
      { slug: { in: uniqueSlugs } },
    ],
  };

  let records = await repository.findMany({
    where,
    select: { id: true, name: true, slug: true },
  });

  const missingNames = uniqueNames.filter((name) => {
    const slug = slugByName.get(name) ?? "";
    return !resolveIdByNameOrSlug(records, name, slug);
  });

  if (missingNames.length > 0) {
    await repository.createMany({
      data: missingNames.map((name) => ({
        name,
        slug: slugByName.get(name) ?? slugify(name),
      })),
      skipDuplicates: true,
    });

    records = await repository.findMany({
      where,
      select: { id: true, name: true, slug: true },
    });
  }

  const ids: string[] = [];
  for (const name of uniqueNames) {
    const slug = slugByName.get(name) ?? "";
    const id = resolveIdByNameOrSlug(records, name, slug);
    if (!id) {
      throw new Error(`${errorPrefix}: ${name}`);
    }
    ids.push(id);
  }

  return ids;
}

function getCategoryRepository(): TaxonomyRepository {
  return {
    findMany: (args) => prisma.category.findMany(args as Parameters<typeof prisma.category.findMany>[0]),
    createMany: (args) => prisma.category.createMany(args as Parameters<typeof prisma.category.createMany>[0]),
  };
}

function getTagRepository(): TaxonomyRepository {
  return {
    findMany: (args) => prisma.tag.findMany(args as Parameters<typeof prisma.tag.findMany>[0]),
    createMany: (args) => prisma.tag.createMany(args as Parameters<typeof prisma.tag.createMany>[0]),
  };
}

export async function resolveCategoryIds(names: string[]) {
  return resolveTaxonomyIds(
    names,
    getCategoryRepository(),
    "Failed to resolve category id",
  );
}

export async function resolveTagIds(names: string[]) {
  return resolveTaxonomyIds(
    names,
    getTagRepository(),
    "Failed to resolve tag id",
  );
}

export const __private__ = {
  resolveTaxonomyIds,
  resolveIdByNameOrSlug,
};
