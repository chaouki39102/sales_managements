import React, { useRef, useState, useEffect, useCallback } from 'react';
import { familyIcon } from '../utils/posHelpers';

interface CategoryTabsProps {
  families: { id: number; name: string }[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

const SCROLL_AMOUNT = 200;

export default function CategoryTabs({
  families, selected, onSelect,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    if (maxScroll === 0) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    // RTL: scrollLeft ∈ [-maxScroll, 0],  LTR: scrollLeft ∈ [0, maxScroll]
    if (scrollLeft < 0) {
      // RTL: -maxScroll = at start (right edge), 0 = at end (left edge)
      setCanScrollLeft(scrollLeft < -1);              // not at end → hidden on left
      setCanScrollRight(scrollLeft > -maxScroll + 1); // not at start → hidden on right
    } else {
      // LTR: 0 = at start (left edge), maxScroll = at end (right edge)
      setCanScrollLeft(scrollLeft > 1);
      setCanScrollRight(scrollLeft < maxScroll - 1);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, families.length]);

  // Auto-scroll to selected category
  useEffect(() => {
    if (selected === null || !scrollRef.current) return;
    const btn = scrollRef.current.querySelector<HTMLButtonElement>(`[data-cat-id="${selected}"]`);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [selected]);

  const scrollByAmount = useCallback((dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? SCROLL_AMOUNT : -SCROLL_AMOUNT, behavior: 'smooth' });
  }, []);

  if (!families.length) return null;

  return (
    <div className="pos-cats-wrapper">
      <button
        className={`pos-cats-btn pos-cats-btn-left ${canScrollLeft ? 'show' : ''}`}
        onClick={() => scrollByAmount('left')}
        aria-label="التصنيفات السابقة"
      >
        <i className="ti ti-chevron-right" />
      </button>
      <div className="pos-cats" ref={scrollRef}>
        <button
          className={`pos-cat ${selected === null ? 'on' : ''}`}
          onClick={() => onSelect(null)}
          title="الكل — Alt+0"
        >
          <i className="ti ti-layout-2" />
          <span>الكل</span>
        </button>
        {families.map((f, idx) => (
          <button
            key={f.id}
            data-cat-id={f.id}
            className={`pos-cat ${selected === f.id ? 'on' : ''}`}
            onClick={() => onSelect(f.id)}
            title={`${f.name} — Alt+${idx + 1}`}
          >
            <i className={`ti ${familyIcon(f.name)}`} />
            <span>{f.name}</span>
            {idx < 9 && <kbd className="cat-kb">Alt+{idx + 1}</kbd>}
          </button>
        ))}
      </div>
      <button
        className={`pos-cats-btn pos-cats-btn-right ${canScrollRight ? 'show' : ''}`}
        onClick={() => scrollByAmount('right')}
        aria-label="التصنيفات التالية"
      >
        <i className="ti ti-chevron-left" />
      </button>
    </div>
  );
}
