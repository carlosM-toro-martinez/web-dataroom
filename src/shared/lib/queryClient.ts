import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000)
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15_000)
    }
  }
});

const QUERY_CACHE_KEY = "rq-cache-v1";

export function restoreQueryCacheFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(QUERY_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    hydrate(queryClient, parsed);
  } catch {
    // ignore corrupted cache and continue
  }
}

export function startPersistingQueryCache() {
  if (typeof window === "undefined") return () => {};
  let persistTimer: number | null = null;
  let isPersisting = false;
  const persistNow = () => {
    if (isPersisting) return;
    isPersisting = true;
    try {
      const dehydrated = dehydrate(queryClient, {
        shouldDehydrateQuery: (query) => {
          const topLevelKey = String(query.queryKey[0] ?? "");
          // Only persist reference/catalog data. Transactional data (compras, vales)
          // must NOT be persisted: stale localStorage state causes list pages to
          // appear empty or outdated on laptops that had an old cache hydrated
          // within the 60 s staleTime window, especially with refetchOnWindowFocus off.
          return ["productos", "proveedores", "contabilidad"].includes(topLevelKey);
        }
      });
      window.localStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(dehydrated));
    } catch {
      // best effort
    } finally {
      isPersisting = false;
    }
  };
  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    if (persistTimer !== null) {
      window.clearTimeout(persistTimer);
    }
    persistTimer = window.setTimeout(() => {
      persistNow();
      persistTimer = null;
    }, 1200);
  });
  return () => {
    if (persistTimer !== null) {
      window.clearTimeout(persistTimer);
      persistTimer = null;
    }
    unsubscribe();
  };
}
