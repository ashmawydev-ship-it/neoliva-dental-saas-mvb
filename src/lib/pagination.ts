export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 1000;

export interface PaginationParams {
  take?: number;
  skip?: number;
}

/**
 * Returns safe pagination values to prevent unbounded queries.
 * @param params The requested pagination parameters
 * @param defaultTake The default number of items to take if not specified (defaults to DEFAULT_PAGE_SIZE)
 * @param maxTake The absolute maximum number of items allowed to fetch (defaults to MAX_PAGE_SIZE)
 */
export function getPagination(
  params?: PaginationParams,
  defaultTake: number = DEFAULT_PAGE_SIZE,
  maxTake: number = MAX_PAGE_SIZE
): { take: number; skip: number } {
  const skip = params?.skip ? Math.max(0, params.skip) : 0;
  
  // If take is explicitly defined in params, use it (clamped to maxTake). 
  // Otherwise, fallback to the defaultTake.
  let take = defaultTake;
  if (params && params.take !== undefined && params.take !== null) {
    take = params.take;
  }
  
  // Enforce absolute maximum bound
  take = Math.min(Math.max(1, take), maxTake);

  return { take, skip };
}
