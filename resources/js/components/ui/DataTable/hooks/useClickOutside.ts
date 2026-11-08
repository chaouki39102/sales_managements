// DataTable/hooks/useClickOutside.ts

import { useEffect, useRef } from 'react';

export function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  anchorRef: React.RefObject<HTMLElement>,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onCloseRef.current();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, anchorRef]);
}
