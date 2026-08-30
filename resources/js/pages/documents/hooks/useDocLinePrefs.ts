// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocLinePrefs.ts
//
// خطاف React لتفضيلات إدخال الأسطر — يعرض الحالة الحالية (من localStorage)
// ويوفّر دالة set تُحدّث التفضيل مع إعادة التصيير.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import {
  loadDocLinePrefs,
  saveDocLinePrefs,
  DocLinePrefs,
} from '../utils/docLinePrefs';

export function useDocLinePrefs(): {
  prefs: DocLinePrefs;
  set: (partial: Partial<DocLinePrefs>) => void;
} {
  const [prefs, setPrefs] = useState<DocLinePrefs>(loadDocLinePrefs);

  const set = useCallback((partial: Partial<DocLinePrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      saveDocLinePrefs(next);
      return next;
    });
  }, []);

  return { prefs, set };
}
