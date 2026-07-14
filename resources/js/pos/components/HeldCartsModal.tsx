import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { HeldCart, CartItem } from '@/types';
import { formatDZD } from '../utils/calculations';

interface HeldCartsModalProps {
  carts: HeldCart[];
  onClose: () => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onRestoreAndPay?: (id: string) => void;
}

export default function HeldCartsModal({
  carts, onClose, onRestore, onDelete, onRestoreAndPay,
}: HeldCartsModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = carts.filter(c =>
    !search || c.items?.some((i: CartItem) => i.product_name?.includes(search)) || c.client?.name?.includes(search)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search, carts.length]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (filtered.length === 0) return;
      const selected = filtered[selectedIndex];
      if (!selected) return;
      e.preventDefault();
      onRestore(selected.id);
      return;
    }
    if (e.key === 'Delete' && !inInput) {
      if (filtered.length === 0) return;
      const selected = filtered[selectedIndex];
      if (!selected) return;
      e.preventDefault();
      onDelete(selected.id);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [filtered, selectedIndex, onRestore, onRestoreAndPay, onDelete, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as EventListener);
    return () => window.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [handleKeyDown]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-clock-pause" style={{ marginLeft: 6 }} /> الفواتير المعلقة ({carts.length})</div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body">
          {carts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t4)' }}>
              <i className="ti ti-clock-pause" style={{ fontSize: 40, display: 'block', marginBottom: 10, opacity: 0.3 }} />
              لا توجد فواتير معلقة
            </div>
          ) : (
            <>
              <div className="pos-inp" style={{ marginBottom: 12 }}>
                <i className="ti ti-search" style={{ fontSize: 13, color: 'var(--t4)' }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في المعلقة..." />
              </div>
              <div className="held-list" ref={listRef}>
                {filtered.map((c: HeldCart, i: number) => (
                  <div
                    key={c.id}
                    className={`held-card${i === selectedIndex ? ' held-sel' : ''}`}
                    onClick={() => onRestore(c.id)}
                    onDoubleClick={() => { if (onRestoreAndPay) onRestoreAndPay(c.id); else onRestore(c.id); }}
                  >
                    <div className="hc-info">
                      <div className="hc-client">{c.client?.name ?? 'زبون عابر'}</div>
                      <div className="hc-meta">
                        {c.items?.length ?? 0} صنف
                        · {formatDZD(c.total ?? 0)}
                      </div>
                      <div className="hc-time">{new Date(c.heldAt).toLocaleTimeString('ar-DZ')}</div>
                    </div>
                    <div className="hc-acts">
                      <button className="btn btn-sm btn-p" onClick={e => { e.stopPropagation(); onRestore(c.id); }}>
                        <i className="ti ti-restore" /> استرجاع
                      </button>
                      <button className="btn btn-sm btn-r" onClick={e => { e.stopPropagation(); onDelete(c.id); }}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
