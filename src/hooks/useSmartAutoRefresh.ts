import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useSmartAutoRefresh(
  refresh: () => void | Promise<void>,
  intervalMs = 60000,
  enabled = true,
) {
  const refreshRef = useRef(refresh);
  const runningRef = useRef(false);

  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    let active = AppState.currentState === 'active';
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const run = async () => {
      if (disposed || !active || runningRef.current) return;
      runningRef.current = true;
      try { await refreshRef.current(); } catch { /* background refresh stays silent */ }
      finally { runningRef.current = false; }
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (disposed || !active) return;
      timer = setTimeout(async () => { await run(); schedule(); }, intervalMs);
    };

    const subscription = AppState.addEventListener('change', (state) => {
      active = state === 'active';
      if (active) { void run(); schedule(); }
      else if (timer) { clearTimeout(timer); timer = null; }
    });

    schedule();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [enabled, intervalMs]);
}
