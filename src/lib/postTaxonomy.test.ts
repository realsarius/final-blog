import { describe, expect, it, vi } from "vitest";
import { __private__ } from "@/lib/postTaxonomy";

describe("resolveTaxonomyIds", () => {
  it("returns ids from existing records without createMany", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: "cat_1", name: "Node", slug: "node" },
      { id: "cat_2", name: "Prisma", slug: "prisma" },
    ]);
    const createMany = vi.fn();

    const ids = await __private__.resolveTaxonomyIds(
      [" Node ", "Prisma", "Node"],
      { findMany, createMany },
      "error",
    );

    expect(ids).toEqual(["cat_1", "cat_2"]);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("creates missing records in batch and resolves ids after re-fetch", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([{ id: "cat_1", name: "Node", slug: "node" }])
      .mockResolvedValueOnce([
        { id: "cat_1", name: "Node", slug: "node" },
        { id: "cat_2", name: "Yeni", slug: "yeni" },
      ]);
    const createMany = vi.fn().mockResolvedValue({ count: 1 });

    const ids = await __private__.resolveTaxonomyIds(
      ["Node", "Yeni"],
      { findMany, createMany },
      "error",
    );

    expect(ids).toEqual(["cat_1", "cat_2"]);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledWith({
      data: [{ name: "Yeni", slug: "yeni" }],
      skipDuplicates: true,
    });
    expect(findMany).toHaveBeenCalledTimes(2);
  });
});
