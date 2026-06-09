// ─────────────────────────────────────────────────────────────
//  useOnClickOutside.ts  (hooks/useOnClickOutside.ts)
//  Hook مساعد — يُغلق الـ Dropdown عند الضغط خارجه
//  أضفه في resources/js/hooks/ إذا لم يكن موجوداً
// ─────────────────────────────────────────────────────────────
import { RefObject, useEffect } from 'react';

export const useOnClickOutside = <T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};
