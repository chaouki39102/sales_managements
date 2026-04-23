// pos/components/HeldCartsModal.tsx
import React from 'react';
import type { HeldCart } from '@/types';
import { formatDZD } from '../utils/calculations';
import Modal from '@/components/ui/Modal';

interface HeldCartsModalProps {
  open:     boolean;
  carts:    HeldCart[];
  onClose:  () => void;
  onRestore:(id: string) => void;
  onDelete: (id: string) => void;
}

export default function HeldCartsModal({
  open, carts, onClose, onRestore, onDelete,
}: HeldCartsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="الفواتير المعلقة"
      subtitle={`${carts.length} معلقة`}
      size="sm"
      footer={<button className="btn" onClick={onClose}>إغلاق</button>}
    >
      <div style={{ padding: 0, margin: -20 }}>
        {carts.length === 0 ? (
          <div className="cart-empty" style={{ padding: 30 }}>
            <div className="cart-empty-ic" style={{ fontSize: 36 }}>
              <i className="ti ti-clock-pause" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t3)' }}>
              لا توجد فواتير معلقة
            </div>
          </div>
        ) : (
          carts.map(cart => (
            <div
              key={cart.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 16px', borderBottom: '1px solid var(--b1)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                  {cart.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                  {cart.items.length} صنف
                  {cart.client ? ` — ${cart.client.name}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--em)', direction: 'ltr', flexShrink: 0 }}>
                {formatDZD(cart.totals.total_ttc)}
              </div>
              <button
                className="btn btn-xs btn-p"
                onClick={() => { onRestore(cart.id); onClose(); }}
              >
                استرجاع
              </button>
              <button
                className="btn btn-xs btn-r"
                onClick={() => onDelete(cart.id)}
                title="حذف"
              >
                <span className="ic ic-xs"><i className="ti ti-trash" /></span>
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
