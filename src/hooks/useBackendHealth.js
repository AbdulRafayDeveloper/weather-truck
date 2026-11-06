import { useCallback, useEffect, useState } from 'react';

import { fetchHealth } from '../api';

// Returns 'checking' | 'connected' | 'unavailable' and a retry function.
export default function useBackendHealth() {
  const [status, setStatus] = useState('checking');

  const check = useCallback(async (signal) => {
    setStatus('checking');
    try {
      const data = await fetchHealth(signal);
      setStatus(data?.status === 'ok' ? 'connected' : 'unavailable');
    } catch (err) {
      if (err?.name !== 'AbortError') setStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    check(controller.signal);
    return () => controller.abort();
  }, [check]);

  return { status, retry: () => check() };
}
