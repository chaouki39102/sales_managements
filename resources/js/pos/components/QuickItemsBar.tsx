import React from 'react';
import type { ProductVariant } from '@/types';
import type { QuickItem } from '../utils/posHelpers';
import { formatDZD } from '../utils/calculations';

interface QuickItemsBarProps {
  quickItems: QuickItem[];
  allVariants: ProductVariant[];
  onAdd: (v: ProductVariant) => void;
  onRemove: (variantId: number) => void;
}

export default function QuickItemsBar({
  quickItems, allVariants, onAdd, onRemove,
}: QuickItemsBarProps) {
  return (
    <div className="pos-quickbar">
      <span className="pqb-label">
        <i className="ti ti-star" /> مفضلة
      </span>
      {quickItems.map(q => {
        const variant = allVariants.find(v => v.id === q.variantId);
        return (
          <div key={q.variantId} className="pqb-item" title={q.name}>
            <button
              className="pqb-add"
              onClick={() => variant && onAdd(variant)}
              disabled={!variant}
            >
              <span className="pqb-name">{q.name}</span>
              <span className="pqb-price">{formatDZD(q.priceHt * (1 + q.tvaRate / 100))}</span>
            </button>
            <button className="pqb-rm" onClick={() => onRemove(q.variantId)} title="إزالة من المفضلة">
              <i className="ti ti-x" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
