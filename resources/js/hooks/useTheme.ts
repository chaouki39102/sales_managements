// ════════════════════════════════════════════════════════════════════════════
// hooks/useTheme.ts
// Dark/Light mode — يقرأ من localStorage ويُطبق class على <html>
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark-mode', dark);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  try { localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light'); } catch {}
}

export function useTheme() {
  const [dark, setDark] = useState<boolean>(getInitialDark);

  // طبّق عند التحميل الأول
  useEffect(() => { applyTheme(dark); }, []);

  const toggle = () => {
    setDark(prev => {
      applyTheme(!prev);
      return !prev;
    });
  };

  return { dark, toggle };
}
