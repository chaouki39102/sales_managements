// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProRecentBar.tsx
//
// شريط "الأكثر مبيعاً هذا اليوم" — مصدره top_products من الجلسة الحالية
// (منحدر من الخادم في كل عملية بيع). كل عنصر يُضاف بضغطة واحدة مباشرة
// للسلة. يختفي تلقائياً عندما لا توجد مبيعات بعد.
// ════════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import type { ProductVariant } from '@/types';
import type { PosSessionProduct } from '@/lib/api/endpoints/posSession';

interface Props {
  top:       PosSessionProduct[];
  variants:  ProductVariant[];
  onAdd:     (variant: ProductVariant) => void;
}

export default function POSProRecentBar({ top, variants, onAdd }: Props) {
  const rows = useMemo(() => {
    if (!top?.length) return [];
    const byId = new Map<number, ProductVariant>();
    for (const v of variants) byId.set(v.product_id, v);
    return top
      .map(p => ({ p, v: byId.get(p.product_id) }))
      .filter((r): r is { p: PosSessionProduct; v: ProductVariant } => !!r.v)
      .slice(0, 12);
  }, [top, variants]);

  if (rows.length === 0) return null;

  return (
    <div className="pp-recent">
      <span className="pp-recent-label">
        <i className="ti ti-trending-up" />
        الأكثر مبيعاً
      </span>
      <div className="pp-recent-scroll">
        {rows.map(({ p, v }) => (
          <button
            key={p.product_id}
            type="button"
            className="pp-recent-item"
            onClick={() => onAdd(v)}
            title={`${p.product_name} — بيع ${p.quantity_sold}`}
          >
            <span className="pp-recent-name">{p.product_name}</span>
            <span className="pp-recent-meta">
              ×{p.quantity_sold} · <b dir="ltr">{formatDZD(p.total_ttc)}</b>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
