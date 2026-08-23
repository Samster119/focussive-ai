'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, ApiError } from './api';

const intervals = new Map<string, { timer: NodeJS.Timeout; subscribers: Set<() => void> }>();
const cache = new Map<string, any>();

function subscribe(path: string, intervalMs: number, callback: () => void) {
  let entry = intervals.get(path);
  if (!entry) {
    entry = { timer: setInterval(() => { entry?.subscribers.forEach(cb => cb()); }, intervalMs), subscribers: new Set() };
    intervals.set(path, entry);
  }
  entry.subscribers.add(callback);
  return () => {
    entry?.subscribers.delete(callback);
    if (entry?.subscribers.size === 0) {
      clearInterval(entry.timer);
      intervals.delete(path);
    }
  };
}

export function useApi<T = unknown>(path: string | null, options?: { refetchIntervalMs?: number } & RequestInit) {
  const [data, setData] = useState<T | null>(() => (path ? cache.get(path) ?? null : null));
  const [loading, setLoading] = useState<boolean>(() => (path ? !cache.has(path) : false));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick(t => t + 1), []);
  const { refetchIntervalMs, ...fetchOptions } = options ?? {};

  // Stabilize fetchOptions reference to prevent infinite re-render loops.
  const fetchOptionsRef = useRef(fetchOptions);
  fetchOptionsRef.current = fetchOptions;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;

    // Only set loading true if we don't have cached data yet
    if (!cache.has(path)) {
      setLoading(true);
    }
    setError(null);

    apiFetch<T>(path, fetchOptionsRef.current).then(res => {
      if (!cancelled) {
        cache.set(path, res);
        setData(res);
        setLoading(false);
      }
    }).catch(e => {
      if (!cancelled) {
        setError(e instanceof ApiError ? e.message : 'Request failed');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick]);

  useEffect(() => {
    if (!refetchIntervalMs || !path) return;
    return subscribe(path, refetchIntervalMs, () => setTick(t => t + 1));
  }, [refetchIntervalMs, path]);

  // Live data sync listener across modules
  useEffect(() => {
    if (!path || typeof window === 'undefined') return;
    const handleSync = () => setTick(t => t + 1);
    window.addEventListener('focussive-sync', handleSync);
    return () => window.removeEventListener('focussive-sync', handleSync);
  }, [path]);

  return { data, loading, error, refetch };
}