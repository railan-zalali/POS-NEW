import { useCallback, useRef } from 'react';

// Simple in-memory cache with TTL
class QueryCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  private DEFAULT_TTL = 5000; // 5 seconds

  set(key: string, data: unknown, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // Clear expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const queryCache = new QueryCache();

// Debounce hook
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );
}

// Memoize query results based on dependencies
export function useCachedQuery<T>(
  key: string,
  queryFn: () => T | Promise<T>,
  _deps: unknown[] = [],
  ttl: number = 5000,
): T | null {
  // Check cache first
  const cached = queryCache.get(key);
  if (cached !== null) {
    return cached as T;
  }

  // Execute query if not in cache
  const result = typeof queryFn === 'function' ? queryFn() : queryFn;

  // Cache the result
  if (result !== null && result !== undefined) {
    queryCache.set(key, result, ttl);
  }

  return result as T;
}

// Clear cache periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    queryCache.cleanup();
  }, 60000); // Clean up every minute
}
