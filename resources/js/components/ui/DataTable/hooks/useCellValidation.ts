// DataTable/hooks/useCellValidation.ts

import { useState, useCallback } from 'react';
import type { CellValidationRule } from '../types';

export function useCellValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validate = useCallback((value: string, rule: CellValidationRule, row: Record<string, unknown>, cellId: string): boolean => {
    let msg: string | null = null;
    if (rule.required && !value.trim()) msg = rule.messages?.required ?? 'هذا الحقل مطلوب';
    else if (rule.minLength && value.length < rule.minLength) msg = rule.messages?.minLength ?? `الحد الأدنى ${rule.minLength} أحرف`;
    else if (rule.maxLength && value.length > rule.maxLength) msg = rule.messages?.maxLength ?? `الحد الأقصى ${rule.maxLength} أحرف`;
    else if (rule.min !== undefined && parseFloat(value) < rule.min) msg = rule.messages?.min ?? `القيمة لا تقل عن ${rule.min}`;
    else if (rule.max !== undefined && parseFloat(value) > rule.max) msg = rule.messages?.max ?? `القيمة لا تزيد عن ${rule.max}`;
    else if (rule.pattern && !rule.pattern.test(value)) msg = rule.messages?.pattern ?? 'القيمة غير صحيحة';
    else if (rule.custom) msg = rule.custom(value, row);
    if (msg) { setErrors(prev => ({ ...prev, [cellId]: msg as string })); return false; }
    setErrors(prev => { const n = { ...prev }; delete n[cellId]; return n; });
    return true;
  }, []);
  const clearError = useCallback((cellId: string) => {
    setErrors(prev => { const n = { ...prev }; delete n[cellId]; return n; });
  }, []);
  const getError = useCallback((cellId: string) => errors[cellId] ?? null, [errors]);
  return { errors, validate, clearError, getError };
}
