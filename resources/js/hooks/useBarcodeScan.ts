// hooks/useBarcodeScan.ts
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseBarcodeScanOptions<T> {
  /** تحويل الكود الممسوح إلى عنصر (يمكن أن يكون غير متزامن — بحث على الخادم). */
  resolve: (code: string) => Promise<T | null> | T | null;
  /** يُستدعى عند العثور على عنصر مطابق. */
  onFound: (item: T) => void;
  /** يُستدعى عندما لا يوجد تطابق (مثل: إظهار toast). */
  onNotFound?: (code: string) => void;
  /** الحد الأدنى لطول الكود قبل محاولة المطابقة (نفس POS — 4). */
  minLength?: number;
}

export function useBarcodeScan<T>({
  resolve,
  onFound,
  onNotFound,
  minLength = 4,
}: UseBarcodeScanOptions<T>) {
  const [open, setOpen] = useState(false);

  const resolveRef    = useRef(resolve);
  const onFoundRef    = useRef(onFound);
  const onNotFoundRef = useRef(onNotFound);

  resolveRef.current    = resolve;
  onFoundRef.current    = onFound;
  onNotFoundRef.current = onNotFound;

  const handleScan = useCallback(async (code: string) => {
    const clean = (code ?? '').trim();
    if (clean.length < minLength) return;
    const item = await resolveRef.current(clean);
    if (item) onFoundRef.current(item);
    else onNotFoundRef.current?.(clean);
  }, [minLength]);

  useEffect(() => {
    if (!open) return;
    // إغلاق المودال عند تفعيل التمرير بعيداً (سلوك دفاعي).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const openScanner  = useCallback(() => setOpen(true),  []);
  const closeScanner = useCallback(() => setOpen(false), []);

  return { open, openScanner, closeScanner, handleScan };
}
