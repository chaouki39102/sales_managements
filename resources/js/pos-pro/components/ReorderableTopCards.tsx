// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/ReorderableTopCards.tsx
//
// حاوية البطاقتين العلويتين (الزبون / الإجمالي) مع إمكانية تبديل مواضعهما
// بالسحب: اسحب أي بطاقة وأفلتها فوق الأخرى لتتبدل يميناً/يساراً.
// الترتيب محفوظ في localStorage (مفتاح `pos-pro-top-order`).
// السحب بالماوس/اللمس عبر Pointer Events + setPointerCapture، والتبديل يتم
// فقط عند تحريك > 6px فوق البطاقة الهدف (لا يخطف نقرة زر "تغيير الزبون").
// ════════════════════════════════════════════════════════════════════════════
import { useRef, useState } from 'react';
import type { ReactNode, PointerEvent } from 'react';

export type TopCardId = 'customer' | 'total';

interface ReorderableTopCardsProps {
  customer:   ReactNode;
  total:      ReactNode;
  storageKey?: string;
}

const DEFAULT_ORDER: TopCardId[] = ['customer', 'total'];

function readSavedOrder(storageKey: string): TopCardId[] {
  if (typeof window === 'undefined') return DEFAULT_ORDER;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'total|customer') return ['total', 'customer'];
  } catch { /* ignore */ }
  return DEFAULT_ORDER;
}

export function ReorderableTopCards({
  customer,
  total,
  storageKey = 'pos-pro-top-order',
}: ReorderableTopCardsProps) {
  const [order, setOrder] = useState<TopCardId[]>(() => readSavedOrder(storageKey));

  const [dragging, setDragging] = useState<TopCardId | null>(null);
  const [target,   setTarget]   = useState<TopCardId | null>(null);

  const dragRef = useRef<{ id: TopCardId; startX: number; startY: number; active: boolean } | null>(null);
  const slotRefs = useRef<Record<TopCardId, HTMLDivElement | null>>({ customer: null, total: null });

  const other = (id: TopCardId): TopCardId => (id === 'customer' ? 'total' : 'customer');

  const onSlotDown = (e: PointerEvent<HTMLDivElement>, id: TopCardId) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('button, a, input, select, textarea')) return;
    e.preventDefault();
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, active: false };
    setTarget(null);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onSlotMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;

    if (!d.active) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
      d.active = true;
      setDragging(d.id);
    }

    const targetId = other(d.id);
    const rect = slotRefs.current[targetId]?.getBoundingClientRect();
    const inside = !!rect && e.clientX >= rect.left && e.clientX <= rect.right
      && e.clientY >= rect.top && e.clientY <= rect.bottom;
    setTarget(inside ? targetId : null);
  };

  const endDrag = () => {
    const d = dragRef.current;
    if (!d) return;
    if (d.active && target === other(d.id)) {
      const newOrder: TopCardId[] = [other(d.id), d.id];
      setOrder(newOrder);
      try { window.localStorage.setItem(storageKey, newOrder.join('|')); } catch { /* ignore */ }
    }
    dragRef.current = null;
    setDragging(null);
    setTarget(null);
  };

  const slots: Record<TopCardId, ReactNode> = { customer, total };

  return (
    <div className="pos-pro-top">
      {order.map(id => (
        <div
          key={id}
          ref={el => { slotRefs.current[id] = el; }}
          className={[
            'pp-top-slot',
            `pp-top-slot--${id}`,
            dragging === id ? 'is-dragging-source' : '',
            target   === id ? 'is-drop-target'     : '',
          ].filter(Boolean).join(' ')}
          onPointerDown={e => onSlotDown(e, id)}
          onPointerMove={onSlotMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="pp-top-grip" aria-hidden="true"><i className="ti ti-grip-vertical" /></span>
          {slots[id]}
          {target === id && (
            <div className="pp-top-drop-hint">
              <i className="ti ti-swap-horizontal" />
              أفلت هنا للتبديل
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
