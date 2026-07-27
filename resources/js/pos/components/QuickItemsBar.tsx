import { useRef, useState, useEffect } from 'react';
import type { ProductVariant } from '@/types';
import type { QuickItem } from '../utils/posHelpers';
import { formatDZD } from '../utils/calculations';
import { isVariantOutOfStock } from '../utils/posHelpers';
import { FloatingTooltip } from '@/components/ui/FloatingTooltip';

interface QuickItemsBarProps {
  quickItems: QuickItem[];
  allVariants: ProductVariant[];
  onAdd: (v: ProductVariant) => void;
  onRemove: (variantId: number) => void;
  allowNegativeStock?: boolean;
}

export default function QuickItemsBar({
  quickItems, allVariants, onAdd, onRemove, allowNegativeStock,
}: QuickItemsBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [quickItems.length]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const itemW =
      (el.querySelector<HTMLElement>('.pqb-item')?.offsetWidth ?? 120) + 6;
    el.scrollBy({ left: dir === 'left' ? -itemW : itemW, behavior: 'smooth' });
  };

  return (
    <div className="pos-quickbar-wrapper">
      {canScrollLeft && (
        <button className="pqb-scroll pqb-scroll-l" onClick={() => scroll('left')} aria-label="السابق">
          <i className="ti ti-chevron-right" />
        </button>
      )}
      <div className="pos-quickbar" ref={scrollRef}>
        <span className="pqb-label">
          <i className="ti ti-star" /> مفضلة
        </span>
        {quickItems.map(q => {
          const variant = allVariants.find(v => v.id === q.variantId);
          const outStock = variant ? isVariantOutOfStock(variant, allowNegativeStock) : false;
          return (
            <div key={q.variantId} className="pqb-item">
              <button
                className="pqb-add"
                onClick={() => variant && !outStock && onAdd(variant)}
                disabled={!variant || outStock}
              >
                <span className="pqb-name">{q.name}</span>
                <span className="pqb-price">{formatDZD(q.priceHt * (1 + q.tvaRate / 100))}</span>
              </button>
              <FloatingTooltip content="إزالة من المفضلة">
                <button className="pqb-rm" onClick={() => onRemove(q.variantId)}>
                  <i className="ti ti-x" />
                </button>
              </FloatingTooltip>
            </div>
          );
        })}
      </div>
      {canScrollRight && (
        <button className="pqb-scroll pqb-scroll-r" onClick={() => scroll('right')} aria-label="التالي">
          <i className="ti ti-chevron-left" />
        </button>
      )}
    </div>
  );
}
