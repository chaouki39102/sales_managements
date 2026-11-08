// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/components/PPMSheet.tsx
// PPMSheet — لوحة سفلية عامة
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';

export default function PPMSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={`ppm-backdrop${open ? ' show' : ''}`} onClick={onClose} />
      <div className={`ppm-sheet${open ? ' show' : ''}`}>
        <div className="ppm-sheet-handle" />
        <div className="ppm-sheet-hd">
          <h2>{title}</h2>
          <button className="ppm-sheet-close" onClick={onClose} aria-label="إغلاق">
            <i className="ti ti-x" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
