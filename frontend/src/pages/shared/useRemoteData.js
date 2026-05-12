import { useEffect, useState } from 'react';

export default function useRemoteData({ data, fetchData, loading, error }) {
  const [internalData, setInternalData] = useState(null);
  const [internalLoading, setInternalLoading] = useState(data === undefined);
  const [internalError, setInternalError] = useState(null);

  useEffect(() => {
    if (data !== undefined || typeof fetchData !== 'function') return undefined;

    let cancelled = false;

    const run = async () => {
      setInternalLoading(true);
      setInternalError(null);
      try {
        const next = await fetchData();
        if (!cancelled) setInternalData(next);
      } catch (err) {
        if (!cancelled) setInternalError(err);
      } finally {
        if (!cancelled) setInternalLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [data, fetchData]);

  return {
    source: data !== undefined ? data || {} : internalData || {},
    isLoading: loading !== undefined ? loading : data === undefined && internalLoading,
    error: error || (data === undefined ? internalError : null),
  };
}

