import { useState, useCallback, useEffect } from 'react';
import { posSessionApi } from '@/lib/api/endpoints/posSession';

const STORAGE_KEY = 'pos-device-name';

function generateFallback(): string {
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `جهاز-${suffix}`;
}

function load(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function save(name: string): void {
  try { localStorage.setItem(STORAGE_KEY, name); } catch {}
}

export function useDeviceName(): [string, (name: string) => void] {
  const [name, setName] = useState<string>(() => load() ?? '');

  useEffect(() => {
    if (name) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await posSessionApi.deviceName();
        if (!cancelled && res) {
          save(res);
          setName(res);
          return;
        }
      } catch {}
      if (!cancelled) {
        const fallback = generateFallback();
        save(fallback);
        setName(fallback);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const set = useCallback((v: string) => { save(v); setName(v); }, []);

  return [name, set];
}
