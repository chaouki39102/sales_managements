// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocPrefs.ts
//
// خطاف React لتفضيلات محرر المستندات (مستوحاة من خيارات CLASSIC POS) —
// يُعرض الحالة الحالية (من localStorage لكل شركة slug) ويوفّر دالة set
// تُحدّث التفضيل مع إعادة التصيير.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import {
  loadDocPrefs,
  saveDocPrefs,
  DocPrefs,
} from '../utils/docPrefs';

export function useDocPrefs(slug?: string): {
  prefs: DocPrefs;
  set: (partial: Partial<DocPrefs>) => void;
} {
  const [prefs, setPrefs] = useState<DocPrefs>(() => loadDocPrefs(slug));

  const set = useCallback((partial: Partial<DocPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      saveDocPrefs(next, slug);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return { prefs, set };
}
