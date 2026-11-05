import { useState, useEffect, useCallback, useRef } from "react";

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 1500,
  enabled: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const execute = async () => {
      try {
        const result = await fetcherRef.current();
        if (mounted) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(String(err));
          setLoading(false);
        }
      }
    };

    void execute();

    const timer = setInterval(() => {
      void execute();
    }, intervalMs);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [intervalMs, enabled]);

  return { data, loading, error, refresh };
}

