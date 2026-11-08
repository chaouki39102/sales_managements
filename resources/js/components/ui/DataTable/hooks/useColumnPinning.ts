// DataTable/hooks/useColumnPinning.ts

import { useState, useCallback } from 'react';
import type { ColumnPinConfig } from '../types';

export function useColumnPinning(
  initial: ColumnPinConfig | undefined,
  onChange?: (config: ColumnPinConfig) => void,
) {
  const [pinConfig, setPinConfig] = useState<ColumnPinConfig>(initial ?? {});
  const pinColumn = useCallback((key: string, side: 'start' | 'end' | null) => {
    setPinConfig(prev => {
      const next: ColumnPinConfig = {
        start: (prev.start ?? []).filter(k => k !== key),
        end: (prev.end ?? []).filter(k => k !== key),
      };
      if (side === 'start') next.start = [...(next.start ?? []), key];
      if (side === 'end') next.end = [...(next.end ?? []), key];
      onChange?.(next);
      return next;
    });
  }, [onChange]);
  const isPinned = useCallback((key: string): 'start' | 'end' | null => {
    if (pinConfig.start?.includes(key)) return 'start';
    if (pinConfig.end?.includes(key)) return 'end';
    return null;
  }, [pinConfig]);
  const clearAllPins = useCallback(() => {
    setPinConfig({});
    onChange?.({});
  }, [onChange]);

  // batch update: يُستخدم من handleApplyView — setState واحد بدلاً من N
  const setPinConfigBatch = useCallback((config: ColumnPinConfig) => {
    const next: ColumnPinConfig = {
      start: config.start ?? [],
      end:   config.end   ?? [],
    };
    setPinConfig(next);
    onChange?.(next);
  }, [onChange]);

  // ✅ إصلاح: حساب offset تراكمي للأعمدة المثبتة
  // بدون هذا، كل عمودين مثبتَين على نفس الجانب يحصلان على left:0 ويتداخلان
  const getPinnedOffset = useCallback((
    key: string,
    side: 'start' | 'end',
    colWidths: Record<string, number>,
    defaultWidth = 120,
  ): number => {
    const pinned = (side === 'start' ? pinConfig.start : pinConfig.end) ?? [];
    const idx = pinned.indexOf(key);
    if (idx <= 0) return 0;
    // لـ 'end': الترتيب معكوس (العمود الأخير في القائمة هو الأقرب للحافة)
    const orderedKeys = side === 'end' ? [...pinned].reverse() : pinned;
    const keyIdx = orderedKeys.indexOf(key);
    return orderedKeys
      .slice(0, keyIdx)
      .reduce((sum, k) => sum + (colWidths[k] ?? defaultWidth), 0);
  }, [pinConfig]);

  return { pinConfig, pinColumn, isPinned, clearAllPins, getPinnedOffset, setPinConfigBatch };
}
