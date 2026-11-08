// DataTable/parts/table/PinMenu.tsx — column pin menu

import { memo, useEffect, useRef } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// PinMenu — قائمة تثبيت العمود
// ════════════════════════════════════════════════════════════════════════════

const PinMenu = memo(function PinMenu({
  colKey: _colKey,
  current,
  onPin,
  onClose,
}: {
  colKey: string;
  current: 'start' | 'end' | null;
  onPin: (side: 'start' | 'end' | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [onClose]);

  return (
    <div className="dt-pin-menu" ref={ref} role="menu" aria-label="خيارات التثبيت">
      <button
        className={current === 'start' ? 'active' : ''}
        onClick={() => onPin(current === 'start' ? null : 'start')}
        type="button"
        role="menuitem"
      >
        <i className="ti ti-pin" />
        {current === 'start' ? 'إلغاء التثبيت يميناً' : 'تثبيت يميناً'}
      </button>
      <button
        className={current === 'end' ? 'active' : ''}
        onClick={() => onPin(current === 'end' ? null : 'end')}
        type="button"
        role="menuitem"
      >
        <i className="ti ti-pin-filled" />
        {current === 'end' ? 'إلغاء التثبيت يساراً' : 'تثبيت يساراً'}
      </button>
      {current && (
        <button onClick={() => onPin(null)} type="button" role="menuitem">
          <i className="ti ti-pinned-off" />
          إزالة التثبيت
        </button>
      )}
    </div>
  );
});

export default PinMenu;
