"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type HomeSearchPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  categories: Array<{ category: { name: string } }>;
};

type ResolvedHomeSearchPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  categories: Array<{ category: { name: string } }>;
  normalizedSearchText: string;
};

type SuggestionItem = {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
};

type HomeSearchContextValue = {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  clearQuery: () => void;
  hasQuery: boolean;
  posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    coverImageUrl: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    categories: Array<{ category: { name: string } }>;
  }>;
  suggestions: SuggestionItem[];
};

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface HomeSearchProviderProps {
  posts: HomeSearchPost[];
  children: ReactNode;
}

export default function HomeSearchProvider({ posts, children }: HomeSearchProviderProps) {
  const [query, setQuery] = useState("");

  const preparedPosts = useMemo<ResolvedHomeSearchPost[]>(
    () =>
      posts.map((post) => {
        const categoryText = post.categories.map((item) => item.category.name).join(" ");
        const searchText = `${post.title} ${post.excerpt ?? ""} ${categoryText} ${post.content}`;
        return {
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          coverImageUrl: post.coverImageUrl,
          publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
          createdAt: new Date(post.createdAt),
          categories: post.categories,
          normalizedSearchText: normalizeSearchText(searchText),
        };
      }),
    [posts],
  );

  const normalizedQuery = normalizeSearchText(query.trim());
  const hasQuery = normalizedQuery.length > 0;

  const filteredRaw = useMemo(
    () =>
      hasQuery
        ? preparedPosts.filter((post) => post.normalizedSearchText.includes(normalizedQuery))
        : preparedPosts,
    [hasQuery, normalizedQuery, preparedPosts],
  );

  const resolvedPosts = useMemo(
    () =>
      preparedPosts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImageUrl: post.coverImageUrl,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        categories: post.categories,
      })),
    [preparedPosts],
  );

  const suggestions = useMemo<SuggestionItem[]>(
    () =>
      filteredRaw.slice(0, 6).map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        categoryName: post.categories[0]?.category.name ?? "Kategori yok",
      })),
    [filteredRaw],
  );

  const value = useMemo<HomeSearchContextValue>(
    () => ({
      query,
      setQuery,
      clearQuery: () => setQuery(""),
      hasQuery,
      posts: resolvedPosts,
      suggestions,
    }),
    [hasQuery, query, resolvedPosts, suggestions],
  );

  return <HomeSearchContext.Provider value={value}>{children}</HomeSearchContext.Provider>;
}

export function useHomeSearch() {
  const context = useContext(HomeSearchContext);
  if (!context) {
    throw new Error("useHomeSearch must be used within HomeSearchProvider");
  }
  return context;
}
