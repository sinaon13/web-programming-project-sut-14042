import { useState, useEffect, useCallback } from 'react';
import { getDB, setDB } from '@/lib/mockData';

/**
 * Hook to fetch data from Django backend first, falling back to localStorage cache.
 * Returns { data, loading, backendOffline, refetch }.
 * 
 * When backend responds, the data is cached in localStorage under `cacheKey`.
 * When backend fails, cached data is loaded and `backendOffline` is set to true.
 */
export function useBackendData<T>(
  fetchFn: () => Promise<T>,
  cacheKey: string,
  fallbackDefault: T,
  /** optional transform for API response (e.g. extract .results) */
  transform?: (raw: any) => T,
) {
  const [data, setData] = useState<T>(fallbackDefault);
  const [loading, setLoading] = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchFn();
      const result = transform ? transform(raw) : raw;
      setData(result);
      setBackendOffline(false);
      // Cache to localStorage for offline fallback
      setDB(cacheKey, result);
    } catch {
      // Backend unreachable — load from localStorage cache
      setBackendOffline(true);
      const cached = getDB<T>(cacheKey, fallbackDefault);
      setData(cached);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, cacheKey, fallbackDefault, transform]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, backendOffline, refetch, setData };
}
