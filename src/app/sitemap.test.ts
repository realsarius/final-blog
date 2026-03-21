import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/seo", () => ({
  getSiteUrl: vi.fn().mockResolvedValue("https://example.com"),
}));

vi.mock("@/lib/errorTracking", () => ({
  captureException: vi.fn(),
}));

const findManyMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: findManyMock,
    },
  },
}));

describe("sitemap", () => {
  it("returns static routes when post query fails", async () => {
    findManyMock.mockRejectedValueOnce(new Error("db down"));

    const { default: sitemap } = await import("@/app/sitemap");
    const result = await sitemap();

    expect(result.some((item) => item.url === "https://example.com/")).toBe(true);
    expect(result.some((item) => item.url === "https://example.com/blog")).toBe(true);
    expect(result.some((item) => item.url.includes("/blog/"))).toBe(false);
  });
});
