import { unstable_cache } from 'next/cache';

/**
 * Enterprise Cache Service
 * 
 * Provides a standardized abstraction over Next.js unstable_cache,
 * ensuring all cache keys and tags explicitly include the required
 * multi-tenant isolation context.
 * 
 * Future Redis Integration:
 * This service allows swapping unstable_cache for an ioredis client
 * without modifying any upstream Repository or Server Action.
 */
export class CacheService {
  /**
   * Fetches data with persistent caching.
   * 
   * @param keyParts The unique elements identifying this cache entry (e.g. ['dashboard', 'revenue', tenantId])
   * @param fetcher The async function to execute on a cache miss
   * @param tags Array of invalidation tags (MUST include 'tenant_${tenantId}' or 'user_${userId}')
   * @param ttl Seconds to keep the cache alive (default: 300)
   */
  static async get<T>(
    keyParts: string[],
    fetcher: () => Promise<T>,
    tags: string[],
    ttl: number = 300
  ): Promise<T> {
    
    // Security Guard: Prevent generic caching without strict isolation tags
    const hasTenantIsolation = tags.some(t => t.startsWith('tenant_'));
    const hasUserIsolation = tags.some(t => t.startsWith('user_'));
    
    if (!hasTenantIsolation && !hasUserIsolation) {
      console.warn(`[CACHE] SECURITY WARNING: Attempted to cache data without tenant or user isolation tags: [${tags.join(', ')}]`);
    }

    const cachedFn = unstable_cache(
      async () => fetcher(),
      keyParts,
      {
        tags,
        revalidate: ttl,
      }
    );

    return cachedFn();
  }
}
