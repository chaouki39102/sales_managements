// ════════════════════════════════════════════════════════════════════════════
// components/pos/CategoryTabsEnhanced.tsx
//
// علامات فئات محسّنة توفر:
// ✅ عرض جميع الفئات (ليس فقط المتاحة في البحث)
// ✅ عدد المنتجات لكل فئة
// ✅ تمرير أفقي للفئات الكثيرة
// ✅ بحث سريع في الفئات
// ✅ تسليط الضوء على الفئة النشطة
// ════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState } from 'react';
import { useAllFamilies } from '@/lib/api/endpoints/productsEnhanced';
import { useActiveSlug } from '@/lib/store/appStore';
import type { Family } from '@/lib/api/core/types';

interface CategoryTabsEnhancedProps {
  /** المعرّف المختار الحالي */
  selected: number | null;
  /** عند اختيار فئة */
  onSelect: (id: number | null) => void;
  /** الفئات (اختياري — سيتم جلبها من الـ API إذا لم تُمرّر) */
  families?: Array<Family & { _count?: { products: number } }>;
  /** السماح باختيار "كل الفئات" */
  allowAll?: boolean;
  /** عدد الأعمدة للعرض (للاستجابة) */
  maxVisible?: number;
  className?: string;
}

export default function CategoryTabsEnhanced({
  selected,
  onSelect,
  families: providedFamilies,
  allowAll = true,
  maxVisible = 8,
  className = '',
}: CategoryTabsEnhancedProps) {
  const slug = useActiveSlug();
  const [searchFamilies, setSearchFamilies] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // جلب الفئات من الـ API إذا لم تُمرّ مباشرة
  const { data: fetchedFamilies, isLoading } = useAllFamilies();
  const families = providedFamilies || fetchedFamilies || [];

  // تصفية الفئات حسب البحث
  const filtered = families.filter(f =>
    f.name.toLowerCase().includes(searchFamilies.toLowerCase()),
  );

  // التمرير الأفقي
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const amount = 200;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const canScrollLeft = scrollContainerRef.current
    ? scrollContainerRef.current.scrollLeft > 0
    : false;
  const canScrollRight = scrollContainerRef.current
    ? scrollContainerRef.current.scrollLeft <
      scrollContainerRef.current.scrollWidth -
        scrollContainerRef.current.clientWidth -
      10
    : false;

  return (
    <div
      ref={containerRef}
      className={`pos-category-tabs-enhanced ${className}`}
    >
      {/* بحث الفئات (اختياري) */}
      {families.length > maxVisible && (
        <div className=\"pos-category-search\">
          <i className=\"ti ti-search\" />
          <input
            type=\"text\"
            placeholder=\"ابحث عن فئة...\"
            value={searchFamilies}
            onChange={e => setSearchFamilies(e.target.value)}
            className=\"pos-category-search-input\"
          />
          {searchFamilies && (
            <button
              className=\"pos-category-search-clear\"
              onClick={() => setSearchFamilies('')}
            >
              <i className=\"ti ti-x\" />
            </button>
          )}
        </div>
      )}

      {/* الفئات مع التمرير */}
      <div className=\"pos-category-tabs-wrapper\">
        {/* زر التمرير الأيسر */}
        {canScrollLeft && (
          <button
            className=\"pos-category-scroll pos-category-scroll-left\"\n            onClick={() => scroll('left')}\n            aria-label=\"scroll left\"\n          >\n            <i className=\"ti ti-chevron-left\" />\n          </button>\n        )}\n\n        {/* قائمة الفئات */}\n        <div\n          ref={scrollContainerRef}\n          className=\"pos-category-tabs\"\n        >\n          {/* خيار \"كل الفئات\" */}\n          {allowAll && (\n            <button\n              className={`pos-category-tab ${selected === null ? 'active' : ''}`}\n              onClick={() => onSelect(null)}\n              title=\"عرض جميع الفئات\"\n            >\n              <i className=\"ti ti-layout-grid\" />\n              <span>الكل</span>\n              {families.length > 0 && (\n                <span className=\"pos-category-count\">{families.length}</span>\n              )}\n            </button>\n          )}\n\n          {/* الفئات */}\n          {filtered.map(family => {\n            const productCount = family._count?.products || 0;\n            return (\n              <button\n                key={family.id}\n                className={`pos-category-tab ${selected === family.id ? 'active' : ''}`}\n                onClick={() => onSelect(family.id)}\n                title={family.description || family.name}\n              >\n                <span className=\"pos-category-icon\">\n                  <i className=\"ti ti-folder\" />\n                </span>\n                <span className=\"pos-category-name\">{family.name}</span>\n                {productCount > 0 && (\n                  <span className=\"pos-category-count\" title=\"عدد المنتجات\">\n                    {productCount}\n                  </span>\n                )}\n              </button>\n            );\n          })}\n        </div>\n\n        {/* زر التمرير الأيمن */}\n        {canScrollRight && (\n          <button\n            className=\"pos-category-scroll pos-category-scroll-right\"\n            onClick={() => scroll('right')}\n            aria-label=\"scroll right\"\n          >\n            <i className=\"ti ti-chevron-right\" />\n          </button>\n        )}\n      </div>\n\n      {/* حالة التحميل */}\n      {isLoading && (\n        <div className=\"pos-category-loading\">\n          <div className=\"spinner-small\" />\n          <span>جاري تحميل الفئات...</span>\n        </div>\n      )}\n\n      {/* حالة عدم توفر النتائج */}\n      {!isLoading && families.length === 0 && (\n        <div className=\"pos-category-empty\">\n          <i className=\"ti ti-inbox\" />\n          <p>لا توجد فئات</p>\n        </div>\n      )}\n\n      {/* رسالة إذا كان البحث فارغاً */}\n      {!isLoading && families.length > 0 && filtered.length === 0 && (\n        <div className=\"pos-category-no-results\">\n          <p>لم يتم العثور على فئات تطابق \"{searchFamilies}\"</p>\n        </div>\n      )}\n    </div>\n  );\n}\n