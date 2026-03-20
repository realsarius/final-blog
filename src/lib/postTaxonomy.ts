import "server-only";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

async function resolveCategoryId(name: string) {
  const slug = slugify(name);
  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ name }, { slug }],
    },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  try {
    const created = await prisma.category.create({
      data: { name, slug },
      select: { id: true },
    });
    return created.id;
  } catch {
    const raceResolved = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
      select: { id: true },
    });
    if (raceResolved) {
      return raceResolved.id;
    }
    throw new Error("Failed to resolve category id.");
  }
}

async function resolveTagId(name: string) {
  const slug = slugify(name);
  const existing = await prisma.tag.findFirst({
    where: {
      OR: [{ name }, { slug }],
    },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  try {
    const created = await prisma.tag.create({
      data: { name, slug },
      select: { id: true },
    });
    return created.id;
  } catch {
    const raceResolved = await prisma.tag.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
      select: { id: true },
    });
    if (raceResolved) {
      return raceResolved.id;
    }
    throw new Error("Failed to resolve tag id.");
  }
}

export async function resolveCategoryIds(names: string[]) {
  const uniqueNames = uniq(names);
  return Promise.all(uniqueNames.map((name) => resolveCategoryId(name)));
}

export async function resolveTagIds(names: string[]) {
  const uniqueNames = uniq(names);
  return Promise.all(uniqueNames.map((name) => resolveTagId(name)));
}
