// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosProductFilter.ts
//
// Product-grid filters for POSPage: filter/sort state (usePosFilterState) and
// the filtered + sorted variant list with the keyboard highlight index
// (usePosFilteredVariants).
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import type { SortMode } from '@/pos/utils/posHelpers';
import type { Barcode, ProductVariant } from '@/types';

export function usePosFilterState() {
  const [sortBy, setSortBy] = useState<SortMode>('name');
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterPerPage, setFilterPerPage] = useState(2000);

  const filterActive = filterInStock || filterLowStock || !!filterMinPrice || !!filterMaxPrice;

  return {
    sortBy, setSortBy,
    filterInStock, setFilterInStock,
    filterLowStock, setFilterLowStock,
    filterMinPrice, setFilterMinPrice,
    filterMaxPrice, setFilterMaxPrice,
    filterPerPage, setFilterPerPage,
    filterActive,
  };
}

export type PosFilterState = ReturnType<typeof usePosFilterState>;

export function usePosFilteredVariants(params: {
  allVariants: ProductVariant[];
  selectedCategory: number | null;
  searchQuery: string;
  displaySearch: string;
  isQtyCmd: boolean;
  hideOutOfStock: boolean;
  allowNegSetting: boolean;
  filters: PosFilterState;
  skipNextSearchResetRef: React.MutableRefObject<boolean>;
}) {
  const {
    allVariants, selectedCategory, searchQuery, displaySearch, isQtyCmd,
    hideOutOfStock, allowNegSetting, skipNextSearchResetRef,
  } = params;
  const { sortBy, filterInStock, filterLowStock, filterMinPrice, filterMaxPrice } = params.filters;

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // مفصولة عن الفرز عمداً: تغيير sortBy لحاله (بدون تغيير أي فلتر) كان
  // يعيد تنفيذ كل سلسلة الفلترة (تصنيف + بحث + مخزون + سعر) من الصفر رغم
  // إنها ما تغيّرت أصلاً — الآن فقط الفرز يُعاد حسابه بهذي الحالة.
  const filteredOnly = useMemo(() => {
    let list = allVariants;
    if (selectedCategory !== null) list = list.filter(v => v.product?.family?.id === selectedCategory);
    // فلترة البحث النصي محلياً — فورية، بدون أي انتظار شبكة (راجع التعليق
    // فوق استعلام المنتجات لسبب نقل البحث بالكامل للعميل). نطابق الاسم
    // والباركود والرمز (ref)، وهو نفس نطاق الحقول اللي كان السيرفر يبحث
    // فيها سابقاً — يستاهل تأكيد إن هذا يطابق منطق البحث الخلفي بالضبط.
    if (!isQtyCmd && displaySearch.length >= 1) {
      const q = displaySearch.toLowerCase();
      list = list.filter(v =>
        (v.product?.name ?? '').toLowerCase().includes(q) ||
        (v.barcode ?? '').toLowerCase().includes(q) ||
        (v.ref ?? '').toLowerCase().includes(q) ||
        (v.product?.ref ?? '').toLowerCase().includes(q) ||
        v.barcodes?.some((bc: Barcode) => bc.barcode.toLowerCase().includes(q)),
      );
    }
    if (hideOutOfStock && !allowNegSetting) list = list.filter(v => !v.manages_stock || v.current_stock === undefined || v.current_stock > 0);
    if (filterInStock)  list = list.filter(v => !v.manages_stock || v.current_stock === undefined || v.current_stock > 0);
    if (filterLowStock) list = list.filter(v => v.manages_stock && (v.current_stock ?? 0) <= (v.min_stock_alert ?? 0) && (v.current_stock ?? 0) > 0);
    if (filterMinPrice) list = list.filter(v => v.default_selling_price_ht >= parseFloat(filterMinPrice));
    if (filterMaxPrice) list = list.filter(v => v.default_selling_price_ht <= parseFloat(filterMaxPrice));
    return list;
  }, [allVariants, selectedCategory, displaySearch, isQtyCmd, hideOutOfStock, filterInStock, filterLowStock, filterMinPrice, filterMaxPrice, allowNegSetting]);

  const filteredVariants = useMemo(() => {
    return [...filteredOnly].sort((a, b) => {
      if (sortBy === 'price_asc')  return a.default_selling_price_ht - b.default_selling_price_ht;
      if (sortBy === 'price_desc') return b.default_selling_price_ht - a.default_selling_price_ht;
      if (sortBy === 'stock')      return (b.current_stock ?? 0) - (a.current_stock ?? 0);
      if (sortBy === 'family')     return (a.product?.family?.name ?? '').localeCompare(b.product?.family?.name ?? '', 'ar');
      return (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'ar');
    });
  }, [filteredOnly, sortBy]);

  useEffect(() => {
    if (isQtyCmd) return;
    if (skipNextSearchResetRef.current) {
      // هذا التغيير بـ pos.searchQuery جا من استرجاع النص بعد أمر كمية
      // (*NN)، مو من كتابة بحث جديد — نحافظ على موضع التحديد الحالي
      // (clamp فقط)، ما نصفّره لـ 0.
      skipNextSearchResetRef.current = false;
      setHighlightedIndex(prev => Math.min(prev, filteredVariants.length - 1));
      return;
    }
    if (searchQuery) { setHighlightedIndex(0); return; }
    setHighlightedIndex(prev => Math.min(prev, filteredVariants.length - 1));
  }, [filteredVariants.length, searchQuery, sortBy, isQtyCmd, skipNextSearchResetRef]);

  return { filteredVariants, highlightedIndex, setHighlightedIndex };
}
