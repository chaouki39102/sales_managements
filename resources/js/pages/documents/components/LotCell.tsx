import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cellStyle } from './DocumentUIPrimitives';
import type { LineItem, Product } from '../types/document.types';

interface LotCellProps {
  line:       LineItem;
  idx:        number;
  prod?:      Product;
  disabled:   boolean;
  onUpdate:   (idx: number, patch: Partial<LineItem>) => void;
}

export function LotCell({ line, idx, prod, disabled, onUpdate }: LotCellProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const measure = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const hasExtraInfo = !!(line.manufacturing_date || line.expiration_date || line.supplier_lot_number);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        type="text"
        placeholder="توليد تلقائي"
        value={line.lot_number_new ?? ''}
        disabled={disabled}
        onChange={(e) => onUpdate(idx, { lot_number_new: e.target.value })}
        style={{ ...cellStyle(), width: 'calc(100% - 26px)' }}
      />

      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="تفاصيل الدفعة (تاريخ الصنع/الانتهاء)"
        style={{
          width: 22, height: 22, flexShrink: 0, borderRadius: 6,
          border: '1px solid var(--b2)',
          background: hasExtraInfo ? 'var(--em)' : 'var(--bg2)',
          color: hasExtraInfo ? '#fff' : 'var(--t3)',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 11,
        }}
      >
        <i className="ti ti-calendar-time" />
      </button>

      {open && createPortal(
        <div ref={popRef} style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
          background: 'var(--bg1)', border: '1px solid var(--b2)',
          borderRadius: 'var(--r2)', boxShadow: 'var(--shadow2)',
          padding: 10, width: 220, display: 'flex', flexDirection: 'column', gap: 8,
          direction: 'rtl',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>تفاصيل الدفعة</div>

          <label style={{ fontSize: 11, color: 'var(--t3)' }}>
            تاريخ الصنع
            <input
              type="date" disabled={disabled}
              value={line.manufacturing_date ?? ''}
              onChange={(e) => onUpdate(idx, { manufacturing_date: e.target.value || undefined })}
              style={{ ...cellStyle(), width: '100%', marginTop: 2 }}
            />
          </label>

          <label style={{ fontSize: 11, color: 'var(--t3)' }}>
            تاريخ الانتهاء
            <input
              type="date" disabled={disabled}
              value={line.expiration_date ?? ''}
              onChange={(e) => onUpdate(idx, { expiration_date: e.target.value || undefined })}
              style={{ ...cellStyle(), width: '100%', marginTop: 2 }}
            />
          </label>

          <label style={{ fontSize: 11, color: 'var(--t3)' }}>
            رقم دفعة المورد (اختياري)
            <input
              type="text" disabled={disabled}
              value={line.supplier_lot_number ?? ''}
              onChange={(e) => onUpdate(idx, { supplier_lot_number: e.target.value || undefined })}
              style={{ ...cellStyle(), width: '100%', marginTop: 2 }}
            />
          </label>

          <div style={{ fontSize: 10, color: 'var(--t4)' }}>
            اترك رقم الدفعة فارغاً ليتولد تلقائياً
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
