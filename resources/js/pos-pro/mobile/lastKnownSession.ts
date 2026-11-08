// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/lastKnownSession.ts
//
// آخر جلسة معروفة (C.5 — وضع عدم الاتصال)
// يُحفظ آخر PosSession حقيقي معروف لكل شركة. عندما تُقدَّم الجلسة من طبقة
// الـ offline (قيمة فارغة = لا بيانات مخزّنة مؤقتاً)، نعود إليها بدل قفل
// الشاشة، مع الإبقاء على معرف الجلسة في سلة المدفوعات/الفاتورة.
// ════════════════════════════════════════════════════════════════════════════
import type { PosSession } from '@/lib/api/endpoints/posSession';

const LAST_SESSION_KEY_PREFIX = 'pos-pro-mobile-last-session';

export function isRealSession(s: unknown): s is PosSession {
  return !!s && typeof s === 'object' && typeof (s as PosSession).id === 'number';
}

function lastSessionStorageKey(slug: string | null): string {
  return `${LAST_SESSION_KEY_PREFIX}:${slug ?? ''}`;
}

export function loadLastKnownSession(slug: string | null): PosSession | null {
  try {
    const raw = localStorage.getItem(lastSessionStorageKey(slug));
    return raw ? JSON.parse(raw) as PosSession : null;
  } catch {
    return null;
  }
}

export function saveLastKnownSession(slug: string | null, session: PosSession): void {
  try { localStorage.setItem(lastSessionStorageKey(slug), JSON.stringify(session)); } catch { /* best-effort */ }
}
