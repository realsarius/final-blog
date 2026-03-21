import {
  buildPublishedPostOptionsWhere,
  countPublishedPostOptions,
  findPublishedPostOptions,
} from "@/modules/posts/post-options.repository";
import { validatePostOptionsQuery } from "@/modules/posts/post-options.validator";

export async function getPublishedPostOptions(searchParams: URLSearchParams) {
  const { query, requestedPage, limit } = validatePostOptionsQuery(searchParams);
  const where = buildPublishedPostOptionsWhere(query);

  const totalCount = await countPublishedPostOptions(where);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * limit;
  const items = await findPublishedPostOptions({ where, skip, limit });

  return {
    items,
    page,
    limit,
    totalCount,
    totalPages,
    query,
  };
}
