import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { PinnedList } from '@/components/ui/PinnedList';
import { FloatingTooltip } from '@/components/ui/FloatingTooltip';
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

  const filtered = carts.filter(c =>
    !search || c.items?.some((i: CartItem) => i.product_name?.includes(search)) || c.client?.name?.includes(search)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search, carts.length]);

  // ── Pinned carts (localStorage) ──────────────────────────────────────────
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pos-pinned-carts') ?? '[]')); } catch { return new Set(); }
  });
  const togglePin = useCallback((id: string | number) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem('pos-pinned-carts', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Escape closes + keyboard navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        if (filtered.length === 0) return;
        const selected = filtered[selectedIndex];
        if (!selected) return;
        e.preventDefault();
        onRestore(selected.id);
      } else if (e.key === 'Delete') {
        if (filtered.length === 0) return;
        const selected = filtered[selectedIndex];
        if (!selected) return;
        e.preventDefault();
        onDelete(selected.id);
      }
    };
    window.addEventListener('keydown', h as EventListener);
    return () => window.removeEventListener('keydown', h as EventListener);
  }, [filtered, selectedIndex, onRestore, onDelete, onClose]);

  return (
    <Modal
      open
      onClose={onClose}
      title={<><i className="ti ti-clock-pause" style={{ marginLeft: 6 }} /> الفواتير المعلقة ({carts.length})</>}
      size="md"
      footer={
        <button className="btn" onClick={onClose}>إغلاق</button>
      }
    >
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
          <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
            {filtered.length === 0 && search && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t4)' }}>
                لا توجد نتائج
              </div>
            )}

            <PinnedList
              items={filtered.map(c => ({
                id: c.id,
                name: c.client?.name ?? 'زبون الصندوق',
                subtitle: `${c.items?.length ?? 0} صنف · ${formatDZD(c.totals.total_ttc ?? 0)} · ${new Date(c.created_at).toLocaleTimeString('ar-DZ')}`,
              }))}
              pinnedIds={pinnedIds}
              onTogglePin={togglePin}
              selectedId={filtered[selectedIndex]?.id ?? null}
              onSelect={(item) => {
                const cart = filtered.find(c => c.id === item.id);
                if (cart) onRestore(cart.id);
              }}
              pinnedLabel="المُثبّتة"
              allLabel="الكل"
              renderItem={(item, pinned, onToggle) => {
                const c = filtered.find(cart => cart.id === item.id);
                if (!c) return null;
                return (
                  <div className="held-card" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="hc-info">
                        <div className="hc-client">{c.client?.name ?? 'زبون الصندوق'}</div>
                        <div className="hc-meta">
                          {c.items?.length ?? 0} صنف
                          · {formatDZD(c.totals.total_ttc ?? 0)}
                        </div>
                        <div className="hc-time">{new Date(c.created_at).toLocaleTimeString('ar-DZ')}</div>
                      </div>
                    </div>
                    <div className="hc-acts" style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                      <FloatingTooltip content={pinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}>
                        <i
                          className={`ti ti-pin cust-pin ${pinned ? 'pinned' : ''}`}
                          onClick={(e) => { e.stopPropagation(); onToggle(); }}
                          style={{ cursor: 'pointer', fontSize: 13, color: pinned ? 'var(--em)' : 'var(--t4)', transition: 'color .15s' }}
                        />
                      </FloatingTooltip>
                      <button className="btn btn-sm btn-p" onClick={(e) => { e.stopPropagation(); onRestore(c.id); }}>
                        <i className="ti ti-restore" /> استرجاع
                      </button>
                      <button className="btn btn-sm btn-r" onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </>
      )}
    </Modal>
  );
}
