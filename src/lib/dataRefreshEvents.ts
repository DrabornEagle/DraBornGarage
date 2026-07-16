import { useEffect, useRef } from 'react';

export type DataRefreshScope =
  | 'all'
  | 'appointments'
  | 'customers'
  | 'motorcycles'
  | 'work_orders'
  | 'customer_claims'
  | 'reports';

type RefreshListener = (scopes: ReadonlySet<DataRefreshScope>) => void;

const listeners = new Set<RefreshListener>();

export function emitDataRefresh(scopes: DataRefreshScope | DataRefreshScope[]) {
  const normalized = new Set(Array.isArray(scopes) ? scopes : [scopes]);
  for (const listener of listeners) listener(normalized);
}

export function subscribeDataRefresh(listener: RefreshListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDataRefresh(scopes: DataRefreshScope[], refresh: () => void | Promise<void>) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => subscribeDataRefresh((changed) => {
    if (!changed.has('all') && !scopes.some((scope) => changed.has(scope))) return;
    Promise.resolve(refreshRef.current()).catch(() => undefined);
  }), [scopes.join('|')]);
}
