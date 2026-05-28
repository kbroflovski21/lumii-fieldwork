import { useState, useEffect, useCallback, useRef } from "react";
import { authFetch } from "../../features/siteOperations/api";

export function useFetch<T>(
  url: string | null,
  deps: unknown[] = [],
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(url !== null);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);

  const doFetch = useCallback(() => {
    if (!url) { setLoading(false); return; }
    const version = ++versionRef.current;
    setLoading(true);
    setError(null);
    authFetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (version === versionRef.current) {
          setData(json as T);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (version === versionRef.current) {
          setError(err instanceof Error ? err.message : String(err));
          setData(null);
          setLoading(false);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => { doFetch(); }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}
