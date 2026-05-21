// ════════════════════════════════════════════════════════════════════════════
// hooks/useTheme.ts
//
// ✅ مُصلَح ليتطابق مع tokens.css:
//    body.dark { ... }  ← الكلاس "dark" على <body> وليس <html>
//
// المشاكل القديمة:
//   1. كان يُضيف 'dark-mode' على <html>  → لا يوجد في tokens.css
//   2. كان يُضيف على document.documentElement (<html>) → tokens.css يستهدف body
//   3. كان يقرأ من localStorage مباشرة → تعارض مع appStore
// ════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/appStore';

type Theme = 'light' | 'dark' | 'auto';

// ── تطبيق الثيم على <body> ────────────────────────────────────────────────────
function applyTheme(theme: Theme): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark      = theme === 'dark' || (theme === 'auto' && prefersDark);

  // ✅ tokens.css يستخدم body.dark — وليس html أو data-theme
  document.body.classList.toggle('dark', isDark);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTheme() {
  const theme    = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // طبّق عند أي تغيير في theme
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // استمع لتغيير تفضيلات النظام عند وضع 'auto'
  useEffect(() => {
    if (theme !== 'auto') return;
    const mq      = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('auto');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const isDark =
    theme === 'dark' ||
    (theme === 'auto' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  // dark: isDark → للتوافق مع DashboardLayout الذي يستخدم { dark, toggle }
  return { theme, isDark, dark: isDark, setTheme, toggle };
}

// ── initTheme — استدعِه قبل React لمنع وميض الثيم الخاطئ (FOUC) ─────────────
export function initTheme(): void {
  try {
    const stored = sessionStorage.getItem('app-store');
    if (stored) {
      const parsed = JSON.parse(stored);
      const theme: Theme = parsed?.state?.theme ?? 'auto';
      applyTheme(theme);
    }
  } catch {
    // الثيم الافتراضي light — لا شيء
  }
}
