// ════════════════════════════════════════════════════════════════════════════
// lib/store/rememberMe.ts
//
// "تذكر اختياري" — حفظ آخر اختيار (الشركة + السنة المالية) لكل مستخدم في
// localStorage حتى لا يضطر لاختيار الشركة والسنة المالية في كل مرة يدخل فيها.
//
// آمن بالتصميم:
//   - لا نُخزِّن أي بيانات حساسة (لا كلمة مرور ولا token) — فقط
//     { company, yearId } الذي يخبر الواجهة بأي شركة/سنة تفتح.
//   - الحفظ مُقسَّم حسب المستخدم (userId) حتى لا تتسرب اختيارات مستخدم لآخر
//     على نفس المتصفح.
//   - في وقت الاستعادة يتم التحقق عبر POST /companies/switch — إذا فشل
//     (شركة محذوفة/معلقة/لا عضوية) نعود لتجربة الاختيار العادية.
// ════════════════════════════════════════════════════════════════════════════

import type { ActiveCompany } from '../api/core/types';

// ─── Keys ─────────────────────────────────────────────────────────────────────

const SESSION_NS = 'pos-remembered-session';

export interface RememberedSession {
  company: ActiveCompany;
  yearId:  number;
}

interface RememberMeData {
  on:      boolean;                       // هل فعّل "تذكر اختياري"؟
  session: RememberedSession | null;      // آخر { شركة + سنة } ناجحة
}

// ─── Helpers (محمية ضد رفض localStorage) ─────────────────────────────────────

const readLS = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const writeLS = (key: string, val: string): void => {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
};

const sessionKey = (userId: number): string => `${SESSION_NS}:${userId}`;

const readData = (userId: number): RememberMeData => {
  const raw = readLS(sessionKey(userId));
  if (!raw) return { on: false, session: null };
  try {
    const parsed = JSON.parse(raw) as RememberMeData;
    return {
      on:      !!parsed?.on,
      session: parsed?.session ?? null,
    };
  } catch { /* ignore */ }
  return { on: false, session: null };
};

const writeData = (userId: number, data: RememberMeData): void => {
  writeLS(sessionKey(userId), JSON.stringify(data));
};

// ─── Public API ───────────────────────────────────────────────────────────────

// هل فعّل هذا المستخدم "تذكر اختياري"؟
export const getRememberPref = (userId: number): boolean => readData(userId).on;
export const setRememberPref = (userId: number, on: boolean): void =>
  writeData(userId, { ...readData(userId), on });

// آخر اختيار { شركة + سنة } محفوظ لهذا المستخدم.
export const getSavedSession = (userId: number): RememberedSession | null =>
  readData(userId).session;

export const setSavedSession = (userId: number, session: RememberedSession): void =>
  writeData(userId, { ...readData(userId), session });

// مسح اختيار مستخدم (عندما يغيّر الشركة عمداً ويطفئ تذكرني — اختياري).
export const clearSavedSession = (userId: number): void =>
  writeData(userId, { ...readData(userId), session: null });
