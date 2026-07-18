// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/OpeningBalanceTab.tsx — تاب "الرصيد الافتتاحي"
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';
import {
  type OpeningBalanceStock,
  type ProductOption,
  type WarehouseOption,
  type DraftRow,
  type CreateOpeningBalanceInput,
  type UpdateOpeningBalanceInput,
  obKeys,
  obApi,
  emptyDraft,
  fmt,
  inputStyle,
} from './inventoryTypes';
import { ActionBtn, ExpiryCell, Th } from './InventoryShared';

// ════════════════════════════════════════════════════════════════════════════

export default function OpeningBalanceTab() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const { selectedYear } = useFiscalYear();
  const [drafts,            setDrafts]            = useState<DraftRow[]>([]);
  const [editingId,         setEditingId]         = useState<number | null>(null);
  const [editDraft,         setEditDraft]         = useState<DraftRow>(emptyDraft());
  const [deletingId,        setDeletingId]        = useState<number | null>(null);
  const [errors,            setErrors]            = useState<Record<string, string>>({});
  const [showAddAllModal,   setShowAddAllModal]   = useState(false);
  const [addAllWarehouseId, setAddAllWarehouseId] = useState<number | ''>('');
  const [addAllQty,         setAddAllQty]         = useState('');
  const [addAllUnitPrice,   setAddAllUnitPrice]   = useState('');
  const [addAllPriceSource, setAddAllPriceSource] = useState<'manual' | 'purchase_price'>('purchase_price');
  const [allowDuplicates,   setAllowDuplicates]   = useState(true);
  const [addAllLoading,     setAddAllLoading]     = useState(false);
  const [addAllResult,      setAddAllResult]      = useState<{
    added: number; skipped: number; errors: number; total: number; details: string[];
  } | null>(null);
  const [addAllCurrent,     setAddAllCurrent]     = useState<string | null>(null);
  const [liveDone,         setLiveDone]           = useState(0);
  const [liveAdded,        setLiveAdded]          = useState(0);
  const [liveSkipped,      setLiveSkipped]        = useState(0);
  const [liveErrors,       setLiveErrors]         = useState(0);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllLoading,   setDeleteAllLoading]   = useState(false);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const anyOpen = showAddAllModal || showDeleteAllModal;
    if (anyOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showAddAllModal, showDeleteAllModal]);

  // ── خيارات المنتجات والمستودعات ──────────────────────────────────────────

  const { data: productsData } = useQuery({
    queryKey:  tenantKeys.products.list(slug ?? ''),
    queryFn:   async () => {
      const all: ProductOption[] = [];
      let page = 1, lastPage = 1;
      while (page <= lastPage) {
        const r: any = await apiGet<any>('/products', {
          per_page: 100, page,
          manages_stock: 1,
        });
        const items = (Array.isArray(r) ? r : r?.data ?? []) as ProductOption[];
        all.push(...items);
        if (r?.meta?.last_page) lastPage = r.meta.last_page;
        page++;
      }
      return all;
    },
    enabled:   !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: warehousesData } = useQuery<WarehouseOption[]>({
    queryKey:  tenantKeys.lookups.warehouses(slug ?? ''),
    queryFn:   () => apiGet<any>('/warehouses', { per_page: 200 }).then(r => r?.data ?? []),
    enabled:   !!slug,
    staleTime: 10 * 60_000,
    select:    (d: unknown) => {
      if (Array.isArray(d)) return d;
      if (d && typeof d === 'object' && 'data' in (d as object) && Array.isArray((d as Record<'data', unknown>)['data'])) {
        return (d as Record<'data', WarehouseOption[]>)['data'];
      }
      return [];
    },
  });

  const products:   ProductOption[]   = Array.isArray(productsData)   ? productsData   : [];
  const warehouses: WarehouseOption[] = Array.isArray(warehousesData) ? warehousesData : [];

  // ── جلب سطور الرصيد الافتتاحي ─────────────────────────────────────────

  const { data: obData, isLoading, refetch } = useQuery({
    queryKey:        obKeys.list(slug ?? '', selectedYear?.id),
    queryFn:         async () => {
      if (!selectedYear?.id) return [] as OpeningBalanceStock[];
      const result = await obApi.list(selectedYear.id);
      return (Array.isArray(result) ? result : []) as OpeningBalanceStock[];
    },
    enabled:         !!slug && !!selectedYear?.id,
    staleTime:       30_000,
  });

  const rows: OpeningBalanceStock[] = Array.isArray(obData) ? obData : [];

  // ── إبطال الكاش ──────────────────────────────────────────────────────────

  const invalidate = useCallback(() => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: obKeys.all(slug) });
    qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
    // إبطال كل products queries (يشمل products.list الذي يستخدمه StockTab)
    qc.invalidateQueries({ queryKey: [slug, 'products'] });
  }, [qc, slug]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (d: CreateOpeningBalanceInput) => obApi.create(d),
    onSuccess:  () => { invalidate(); setErrors({}); },
    onError:    (e: Error) => setErrors({ _global: e.message ?? 'خطأ في الحفظ' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOpeningBalanceInput }) =>
      obApi.update(id, data),
    onSuccess:  () => { invalidate(); setEditingId(null); setErrors({}); },
    onError:    (e: Error) => setErrors({ _global: e.message ?? 'خطأ في التعديل' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => obApi.delete(id),
    onSuccess:  () => { invalidate(); setDeletingId(null); },
  });

  // ── Draft helpers ─────────────────────────────────────────────────────────

  const addDraftRow = () => setDrafts(prev => [...prev, emptyDraft()]);

  // FIX 5: حذف السطر المعين فقط بعد الحفظ الناجح (بالـ idx)
  const removeDraft = (idx: number) =>
    setDrafts(prev => prev.filter((_, i) => i !== idx));

  const updateDraft = (idx: number, field: keyof DraftRow, value: string | number) =>
    setDrafts(prev => prev.map((d, i) => {
      if (i !== idx) return d;
      const updated = { ...d, [field]: value };
      // حساب تلقائي للقيمة الإجمالية عند تغيير الكمية أو سعر الوحدة
      if (field === 'opening_quantity' || field === 'unit_price') {
        const qty   = parseFloat(field === 'opening_quantity' ? String(value) : updated.opening_quantity) || 0;
        const price = parseFloat(field === 'unit_price'       ? String(value) : updated.unit_price)       || 0;
        updated.opening_value = qty > 0 && price > 0 ? String(+(qty * price).toFixed(4)) : updated.opening_value;
      }
      return updated;
    }));

  // ── حفظ draft واحد ───────────────────────────────────────────────────────

  const saveDraft = async (idx: number) => {
    const d = drafts[idx];
    const errs: Record<string, string> = {};

    if (!d.product_id)                                      errs[`p_${idx}`] = 'مطلوب';
    if (!d.warehouse_id)                                    errs[`w_${idx}`] = 'مطلوب';
    if (!selectedYear?.id)                                 errs['year']      = 'اختر سنة';
    if (!d.opening_quantity || isNaN(+d.opening_quantity))  errs[`q_${idx}`] = 'مطلوب';
    if (!d.opening_value    || isNaN(+d.opening_value))     errs[`v_${idx}`] = 'مطلوب';

    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    await createMut.mutateAsync({
      fiscal_year_id:     selectedYear!.id,
      product_id:         d.product_id as number,
      warehouse_id:       d.warehouse_id as number,
      opening_quantity:   +d.opening_quantity,
      opening_value:      +d.opening_value,
      lot_number:         d.lot_number         || null,
      manufacturing_date: d.manufacturing_date || null,
      expiration_date:    d.expiration_date    || null,
    });

    // FIX 5: نمسح السطر المعين فقط
    removeDraft(idx);
  };

  // ── تعديل سطر موجود ──────────────────────────────────────────────────────

  const startEdit = (row: OpeningBalanceStock) => {
    setEditingId(row.id);
    setEditDraft({
      product_id:         row.product_id,
      warehouse_id:       row.warehouse_id,
      opening_quantity:   String(row.opening_quantity),
      unit_price:         Number(row.opening_quantity) > 0
                            ? String(+(Number(row.opening_value) / Number(row.opening_quantity)).toFixed(4))
                            : '',
      opening_value:      String(row.opening_value),
      lot_number:         row.lot_number         ?? '',
      manufacturing_date: row.manufacturing_date ?? '',
      expiration_date:    row.expiration_date    ?? '',
    });
  };

  const saveEdit = async (id: number) => {
    const errs: Record<string, string> = {};
    if (!editDraft.opening_quantity || isNaN(+editDraft.opening_quantity)) errs['eq'] = 'مطلوب';
    if (!editDraft.opening_value    || isNaN(+editDraft.opening_value))    errs['ev'] = 'مطلوب';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    await updateMut.mutateAsync({
      id,
      data: {
        opening_quantity:   +editDraft.opening_quantity,
        opening_value:      +editDraft.opening_value,
        lot_number:         editDraft.lot_number         || null,
        manufacturing_date: editDraft.manufacturing_date || null,
        expiration_date:    editDraft.expiration_date    || null,
      },
    });
  };

  // ── إضافة كل المنتجات ────────────────────────────────────────────────────

  const handleAddAll = useCallback(async () => {
    if (!slug || !selectedYear?.id || !addAllWarehouseId || !addAllQty) return;
    setAddAllLoading(true);
    setAddAllResult(null);
    setAddAllCurrent(null);
    setLiveDone(0);
    setLiveAdded(0);
    setLiveSkipped(0);
    setLiveErrors(0);

    const existingProductIds = new Set<number>([
      ...rows.map(r => r.product_id),
      ...drafts.map(d => d.product_id).filter((id): id is number => id !== ''),
    ]);

    let added = 0, skipped = 0, errCount = 0;
    const details: string[] = [];
    const qty = parseFloat(addAllQty) || 0;
    const manualPrice = parseFloat(addAllUnitPrice) || 0;

    let done = 0;
    for (const p of products) {
      const price = addAllPriceSource === 'purchase_price' ? (p.purchase_price_ht || 0) : manualPrice;
      flushSync(() => {
        setAddAllCurrent(p.name);
        setLiveDone(done);
        setLiveAdded(added);
        setLiveSkipped(skipped);
        setLiveErrors(errCount);
      });
      if (!allowDuplicates && existingProductIds.has(p.id)) {
        skipped++;
        details.push(`⏭️ ${p.name} — موجود مسبقاً`);
        done++;
        continue;
      }

      try {
        await obApi.create({
          fiscal_year_id:     selectedYear.id,
          product_id:         p.id,
          warehouse_id:       addAllWarehouseId as number,
          opening_quantity:   qty,
          opening_value:      +(qty * price).toFixed(4),
          lot_number:         null,
          manufacturing_date: null,
          expiration_date:    null,
        });
        added++;
        details.push(`✅ ${p.name} — تمت الإضافة`);
      } catch (e) {
        errCount++;
        const msg = e instanceof Error ? e.message : 'خطأ غير معروف';
        details.push(`❌ ${p.name} — ${msg}`);
      }
      done++;
    }

    setAddAllCurrent(null);
    setAddAllLoading(true);
    await refetch();
    invalidate();
    setAddAllResult({ added, skipped, errors: errCount, total: products.length, details });
    setAddAllLoading(false);
    setDrafts([]);
  }, [selectedYear, addAllWarehouseId, addAllQty, addAllUnitPrice, addAllPriceSource, allowDuplicates, products, rows, drafts, refetch, invalidate]);

  // ── حذف كل المنتجات ──────────────────────────────────────────────────────

  const handleDeleteAll = useCallback(async () => {
    if (!rows.length) return;
    setDeleteAllLoading(true);

    const ids = rows.map(r => r.id);
    const CONCURRENCY = 10;
    const total = ids.length;

    for (let i = 0; i < total; i += CONCURRENCY) {
      const batch = ids.slice(i, i + CONCURRENCY);
      await Promise.allSettled(batch.map(id => obApi.delete(id)));
    }

    setDeleteAllLoading(false);
    setShowDeleteAllModal(false);
    invalidate();
  }, [rows, invalidate]);

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalQty   = rows.reduce((s, r) => s + Number(r.opening_quantity), 0);
  const totalValue = rows.reduce((s, r) => s + Number(r.opening_value),    0);

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div>

      {/* ── شريط الأعلى ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        {selectedYear && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--t3)',
          }}>
            <i className="ti ti-calendar" style={{ color: 'var(--t4)', fontSize: 15 }} />
            <span style={{ fontWeight: 600 }}>السنة المالية:</span>
            <span style={{
              padding: '4px 10px', background: 'var(--emb)',
              borderRadius: 6, color: 'var(--em)', fontWeight: 700, fontSize: 13,
            }}>
              {selectedYear.name}{selectedYear.is_closed ? ' 🔒' : ''}
            </span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {selectedYear?.id && (
          <>
            <button
              onClick={() => setShowAddAllModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', background: '#0891b2',
                border: 'none', borderRadius: 8, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Tajawal, sans-serif',
              }}
            >
              <i className="ti ti-packages" style={{ fontSize: 15 }} />
              إضافة كل المنتجات
            </button>
            {rows.length > 0 && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', background: '#ef4444',
                  border: 'none', borderRadius: 8, color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif',
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 15 }} />
                حذف الكل ({rows.length})
              </button>
            )}
            <button
              onClick={addDraftRow}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', background: 'var(--em)',
                border: 'none', borderRadius: 8, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Tajawal, sans-serif',
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: 15 }} />
              إضافة سطر
            </button>
          </>
        )}
      </div>

      {/* ── رسالة خطأ عامة ── */}
      {errors._global && (
        <div style={{
          marginBottom: 12, padding: '10px 14px',
          background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
          borderRadius: 8, color: '#ef4444', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-alert-circle" />
          {errors._global}
        </div>
      )}

      {/* ── لا سنة مختارة ── */}
      {!selectedYear ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg2)', border: '1px solid var(--b1)',
          borderRadius: 12, color: 'var(--t4)',
        }}>
          <i className="ti ti-loader-2" style={{
            fontSize: 40, display: 'block', marginBottom: 12,
          }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            جاري التحميل...
          </div>
        </div>
      ) : (

        /* ── الجدول ── */
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--b1)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: 13, minWidth: 1000,
            }}>
              <thead>
                <tr style={{ background: 'var(--bg3)', borderBottom: '2px solid var(--b1)' }}>
                  <Th width="36px">#</Th>
                  <Th>المنتج</Th>
                  <Th width="130px">المستودع</Th>
                  <Th width="110px">سعر الوحدة</Th>
                  <Th width="120px">الكمية الافتتاحية</Th>
                  <Th width="120px">القيمة الإجمالية</Th>
                  <Th width="120px">رقم الدفعة</Th>
                  <Th width="115px">تاريخ الصنع</Th>
                  <Th width="115px">تاريخ الانتهاء</Th>
                  <Th width="75px" />
                </tr>
              </thead>
              <tbody>

                {/* ── تحميل ── */}
                {isLoading && (
                  <tr>
                    <td colSpan={10} style={{ padding: 50, textAlign: 'center', color: 'var(--t4)' }}>
                      <i className="ti ti-loader-2" style={{
                        fontSize: 24, animation: 'spin .8s linear infinite',
                      }} />
                    </td>
                  </tr>
                )}

                {/* ── سطور موجودة ── */}
                {!isLoading && rows.map((row, i) => {
                  const isEditing  = editingId  === row.id;
                  const isDeleting = deletingId === row.id;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--b1)',
                        background: isEditing
                          ? 'rgba(99,102,241,.06)'
                          : i % 2 === 0 ? 'transparent' : 'var(--bg1)',
                      }}
                    >
                      {/* # */}
                      <td style={{
                        padding: '8px 12px', color: 'var(--t4)',
                        fontSize: 11, textAlign: 'center',
                      }}>
                        {i + 1}
                      </td>

                      {/* المنتج */}
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--t1)' }}>
                          {row.product?.name ?? `#${row.product_id}`}
                        </div>
                        {row.product?.ref && (
                          <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                            {row.product.ref}
                          </div>
                        )}
                      </td>

                      {/* المستودع */}
                      <td style={{ padding: '8px 12px', color: 'var(--t3)', fontSize: 12 }}>
                        {row.warehouse?.name ?? `#${row.warehouse_id}`}
                      </td>

                      {/* سعر الوحدة */}
                      <td style={{ padding: '8px 12px' }}>
                        {isEditing ? (
                          <input
                            type="number" step="0.0001" min="0"
                            placeholder="0.00"
                            value={editDraft.unit_price}
                            onChange={e => {
                              const price = e.target.value;
                              const qty   = parseFloat(editDraft.opening_quantity) || 0;
                              const p     = parseFloat(price) || 0;
                              setEditDraft(d => ({
                                ...d,
                                unit_price:    price,
                                opening_value: qty > 0 && p > 0
                                  ? String(+(qty * p).toFixed(4))
                                  : d.opening_value,
                              }));
                            }}
                            style={inputStyle(false)}
                          />
                        ) : (
                          <span style={{ color: 'var(--t1)', fontSize: 12 }}>
                            {Number(row.opening_quantity) > 0
                              ? fmt(Number(row.opening_value) / Number(row.opening_quantity), 4)
                              : '—'
                            }{' '}
                            <span style={{ fontSize: 10, color: 'var(--t4)' }}>دج</span>
                          </span>
                        )}
                      </td>

                      {/* الكمية */}
                      <td style={{ padding: '8px 12px' }}>
                        {isEditing ? (
                          <input
                            type="number" step="0.001" min="0"
                            value={editDraft.opening_quantity}
                            onChange={e => {
                              const qty   = e.target.value;
                              const price = parseFloat(editDraft.unit_price) || 0;
                              const q     = parseFloat(qty) || 0;
                              setEditDraft(d => ({
                                ...d,
                                opening_quantity: qty,
                                opening_value: q > 0 && price > 0
                                  ? String(+(q * price).toFixed(4))
                                  : d.opening_value,
                              }));
                            }}
                            style={inputStyle(!!errors['eq'])}
                          />
                        ) : (
                          <span style={{ fontWeight: 600, color: 'var(--t1)' }}>
                            {fmt(Number(row.opening_quantity), 3)}{' '}
                            <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                              {row.product?.unit?.symbol ?? ''}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* القيمة */}
                      <td style={{ padding: '8px 12px' }}>
                        {isEditing ? (
                          <input
                            type="number" step="0.01" min="0"
                            value={editDraft.opening_value}
                            onChange={e => setEditDraft(d => ({
                              ...d, opening_value: e.target.value,
                            }))}
                            style={inputStyle(!!errors['ev'])}
                          />
                        ) : (
                          <span style={{ color: 'var(--t1)' }}>
                            {fmt(Number(row.opening_value))}{' '}
                            <span style={{ fontSize: 11, color: 'var(--t4)' }}>دج</span>
                          </span>
                        )}
                      </td>

                      {/* رقم الدفعة */}
                      <td style={{ padding: '8px 12px' }}>
                        {isEditing ? (
                          <input
                            type="text" placeholder="اختياري"
                            value={editDraft.lot_number}
                            onChange={e => setEditDraft(d => ({
                              ...d, lot_number: e.target.value,
                            }))}
                            style={inputStyle(false)}
                          />
                        ) : (
                          <span style={{
                            color: 'var(--t3)', fontFamily: 'monospace', fontSize: 12,
                          }}>
                            {row.lot_number ?? '—'}
                          </span>
                        )}
                      </td>

                      {/* تاريخ الصنع */}
                      <td style={{ padding: '8px 12px' }}>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDraft.manufacturing_date}
                            onChange={e => setEditDraft(d => ({
                              ...d, manufacturing_date: e.target.value,
                            }))}
                            style={inputStyle(false)}
                          />
                        ) : (
                          <span style={{ color: 'var(--t3)', fontSize: 12 }}>
                            {row.manufacturing_date ?? '—'}
                          </span>
                        )}
                      </td>

                      {/* تاريخ الانتهاء */}
                      <td style={{ padding: '8px 12px' }}>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDraft.expiration_date}
                            onChange={e => setEditDraft(d => ({
                              ...d, expiration_date: e.target.value,
                            }))}
                            style={inputStyle(false)}
                          />
                        ) : (
                          <ExpiryCell date={row.expiration_date ?? null} />
                        )}
                      </td>

                      {/* أزرار */}
                      <td style={{ padding: '8px 12px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <ActionBtn
                              icon="ti-check" color="#10b981" title="حفظ"
                              loading={updateMut.isPending}
                              onClick={() => saveEdit(row.id)}
                            />
                            <ActionBtn
                              icon="ti-x" color="var(--t4)" title="إلغاء"
                              onClick={() => { setEditingId(null); setErrors({}); }}
                            />
                          </div>
                        ) : isDeleting ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <span style={{
                              fontSize: 10, color: '#ef4444', whiteSpace: 'nowrap',
                            }}>
                              تأكيد؟
                            </span>
                            <ActionBtn
                              icon="ti-check" color="#ef4444" title="نعم"
                              loading={deleteMut.isPending}
                              onClick={() => deleteMut.mutate(row.id)}
                            />
                            <ActionBtn
                              icon="ti-x" color="var(--t4)" title="لا"
                              onClick={() => setDeletingId(null)}
                            />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <ActionBtn
                              icon="ti-pencil" color="var(--em)" title="تعديل"
                              onClick={() => startEdit(row)}
                            />
                            <ActionBtn
                              icon="ti-trash" color="#ef4444" title="حذف"
                              onClick={() => setDeletingId(row.id)}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* ── سطور Draft ── */}
                {drafts.map((d, idx) => (
                  <tr
                    key={`draft-${idx}`}
                    style={{
                      borderBottom: '1px solid var(--b1)',
                      background: 'rgba(99,102,241,.04)',
                      outline: '2px dashed var(--em)',
                      outlineOffset: -1,
                    }}
                  >
                    {/* # badge */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', width: 20, height: 20,
                        borderRadius: '50%', background: 'var(--em)',
                        color: '#fff', fontSize: 14,
                        alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                      }}>+</span>
                    </td>

                    {/* المنتج */}
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        value={d.product_id}
                        onChange={e => updateDraft(idx, 'product_id',
                          e.target.value ? +e.target.value : '')}
                        style={inputStyle(!!errors[`p_${idx}`])}
                      >
                        <option value="">— اختر منتجاً —</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.ref ? ` (${p.ref})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* المستودع */}
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        value={d.warehouse_id}
                        onChange={e => updateDraft(idx, 'warehouse_id',
                          e.target.value ? +e.target.value : '')}
                        style={inputStyle(!!errors[`w_${idx}`])}
                      >
                        <option value="">— اختر مستودعاً —</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* سعر الوحدة */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="number" step="0.0001" min="0" placeholder="0.00"
                        value={d.unit_price}
                        onChange={e => updateDraft(idx, 'unit_price', e.target.value)}
                        style={inputStyle(!!errors[`up_${idx}`])}
                      />
                    </td>

                    {/* الكمية */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="number" step="0.001" min="0" placeholder="0.000"
                        value={d.opening_quantity}
                        onChange={e => updateDraft(idx, 'opening_quantity', e.target.value)}
                        style={inputStyle(!!errors[`q_${idx}`])}
                      />
                    </td>

                    {/* القيمة — محسوبة تلقائياً */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="number" step="0.01" min="0" placeholder="تلقائي"
                        value={d.opening_value}
                        onChange={e => updateDraft(idx, 'opening_value', e.target.value)}
                        style={{
                          ...inputStyle(!!errors[`v_${idx}`]),
                          background: d.opening_value ? 'var(--emb)' : 'var(--bg1)',
                        }}
                      />
                    </td>

                    {/* رقم الدفعة */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text" placeholder="اختياري"
                        value={d.lot_number}
                        onChange={e => updateDraft(idx, 'lot_number', e.target.value)}
                        style={inputStyle(false)}
                      />
                    </td>

                    {/* تاريخ الصنع */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="date"
                        value={d.manufacturing_date}
                        onChange={e => updateDraft(idx, 'manufacturing_date', e.target.value)}
                        style={inputStyle(false)}
                      />
                    </td>

                    {/* تاريخ الانتهاء */}
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="date"
                        value={d.expiration_date}
                        onChange={e => updateDraft(idx, 'expiration_date', e.target.value)}
                        style={inputStyle(false)}
                      />
                    </td>

                    {/* أزرار */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <ActionBtn
                          icon="ti-check" color="#10b981" title="حفظ"
                          loading={createMut.isPending}
                          onClick={() => saveDraft(idx)}
                        />
                        <ActionBtn
                          icon="ti-trash" color="#ef4444" title="حذف"
                          onClick={() => removeDraft(idx)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}

                {/* ── سطر الإجماليات ── */}
                {rows.length > 0 && (
                  <tr style={{
                    background: 'var(--bg3)',
                    borderTop: '2px solid var(--b1)',
                    fontWeight: 800,
                  }}>
                    <td colSpan={3} style={{
                      padding: '10px 12px', color: 'var(--t3)', fontSize: 12,
                    }}>
                      الإجمالي — {rows.length} سطر
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--em)' }}>
                      {fmt(totalQty, 3)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--em)' }}>
                      {fmt(totalValue)}{' '}
                      <span style={{ fontSize: 11, fontWeight: 400 }}>دج</span>
                    </td>
                    <td colSpan={4} />
                  </tr>
                )}

                {/* ── فارغ ── */}
                {!isLoading && rows.length === 0 && drafts.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '50px 20px', textAlign: 'center' }}>
                      <i className="ti ti-flag-2" style={{
                        fontSize: 40, display: 'block',
                        marginBottom: 12, color: 'var(--t4)',
                      }} />
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        color: 'var(--t3)', marginBottom: 6,
                      }}>
                        لا يوجد رصيد افتتاحي لهذه السنة
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 16 }}>
                        اضغط &ldquo;إضافة سطر&rdquo; لتسجيل المخزون الافتتاحي
                      </div>
                      <button
                        onClick={addDraftRow}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 20px', background: 'var(--em)',
                          border: 'none', borderRadius: 8, color: '#fff',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'Tajawal, sans-serif',
                        }}
                      >
                        <i className="ti ti-plus" /> إضافة أول سطر
                      </button>
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>

          {/* ── شريط أسفل الجدول ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderTop: '1px solid var(--b1)', background: 'var(--bg3)',
          }}>
            <button
              onClick={addDraftRow}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', background: 'transparent',
                border: '1px dashed var(--b2)', borderRadius: 8,
                color: 'var(--t3)', fontSize: 12, cursor: 'pointer',
                fontFamily: 'Tajawal, sans-serif', transition: 'all .15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--em)';
                e.currentTarget.style.color = 'var(--em)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--b2)';
                e.currentTarget.style.color = 'var(--t3)';
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة سطر
            </button>

            {rows.length > 0 && (
              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--t3)' }}>
                <span>
                  <strong style={{ color: 'var(--t1)' }}>{rows.length}</strong> منتج
                </span>
                <span>
                  إجمالي القيمة:{' '}
                  <strong style={{ color: 'var(--em)' }}>{fmt(totalValue)} دج</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ملاحظة ── */}
      {selectedYear && rows.length > 0 && (
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: 'rgba(16,185,129,.08)',
          border: '1px solid rgba(16,185,129,.25)',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: '#10b981',
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 15 }} />
          الرصيد الافتتاحي يُحتسب تلقائياً ضمن المخزون الفعلي للمنتجات
          عبر حركة مخزون من نوع &ldquo;رصيد افتتاحي&rdquo;.
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          موديل إضافة كل المنتجات (Wizard)
          ════════════════════════════════════════════════════════════════════ */}
      {showAddAllModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { if (!addAllLoading) setShowAddAllModal(false); }}>
          <div style={{
            width: 520, maxWidth: '95vw', maxHeight: '90vh',
            background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
            display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>

            {/* ── Header ── */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
            }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-packages" style={{ color: '#0891b2' }} />
                {addAllResult ? 'نتيجة الإضافة' : 'إضافة كل المنتجات للرصيد الافتتاحي'}
              </h3>
              {!addAllLoading && (
                <button onClick={() => { setShowAddAllModal(false); setAddAllResult(null); }}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666', padding: 0, lineHeight: 1 }}>
                  ✕
                </button>
              )}
            </div>

            {/* ── Step 1: Config ── */}
            {!addAllResult && !addAllLoading && (
              <>
              <div style={{ padding: 20, flex: 1, overflowY: 'auto', minHeight: 0 }}>
                <div style={{
                  display: 'flex', gap: 16, marginBottom: 20,
                  padding: 16, background: '#f0f9ff', borderRadius: 10,
                  border: '1px solid #bae6fd',
                }}>
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <i className="ti ti-package" style={{ fontSize: 28, color: '#0891b2' }} />
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{products.length} منتج</div>
                  </div>
                  <i className="ti ti-arrow-left" style={{ fontSize: 20, color: '#0891b2', alignSelf: 'center' }} />
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <i className="ti ti-building-warehouse" style={{ fontSize: 28, color: '#0891b2' }} />
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>المستودع</div>
                  </div>
                  <i className="ti ti-arrow-left" style={{ fontSize: 20, color: '#0891b2', alignSelf: 'center' }} />
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <i className="ti ti-clipboard-list" style={{ fontSize: 28, color: '#0891b2' }} />
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>الرصيد الافتتاحي</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#333', marginBottom: 16, lineHeight: 1.6 }}>
                  سيتم إضافة جميع المنتجات ({products.length} منتج) إلى الرصيد الافتتاحي
                  للسنة المالية <strong>{selectedYear?.name}</strong>.
                </div>

                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#333' }}>
                  المستودع الافتراضي <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={addAllWarehouseId}
                  onChange={e => setAddAllWarehouseId(e.target.value ? +e.target.value : '')}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 6,
                    border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 14,
                    background: '#fff', fontFamily: 'Tajawal, sans-serif',
                  }}
                >
                  <option value="">— اختر المستودع —</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>

                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#333' }}>
                  الكمية الافتراضية <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number" step="0.001" min="0"
                  value={addAllQty}
                  onChange={e => setAddAllQty(e.target.value)}
                  placeholder="مثال: 1"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 6,
                    border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 14,
                    fontFamily: 'Tajawal, sans-serif',
                  }}
                />

                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#333' }}>
                  مصدر السعر
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', flex: 1, padding: '8px 12px', borderRadius: 6, border: `1px solid ${addAllPriceSource === 'purchase_price' ? '#0891b2' : '#e2e8f0'}`, background: addAllPriceSource === 'purchase_price' ? '#f0f9ff' : '#fff' }}>
                    <input type="radio" name="priceSource" value="purchase_price" checked={addAllPriceSource === 'purchase_price'} onChange={() => setAddAllPriceSource('purchase_price')} style={{ accentColor: '#0891b2' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>سعر الشراء للمنتج</div>
                      <div style={{ fontSize: 11, color: '#666' }}>كل منتج بسعر شرائه</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', flex: 1, padding: '8px 12px', borderRadius: 6, border: `1px solid ${addAllPriceSource === 'manual' ? '#0891b2' : '#e2e8f0'}`, background: addAllPriceSource === 'manual' ? '#f0f9ff' : '#fff' }}>
                    <input type="radio" name="priceSource" value="manual" checked={addAllPriceSource === 'manual'} onChange={() => setAddAllPriceSource('manual')} style={{ accentColor: '#0891b2' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>سعر يدوي</div>
                      <div style={{ fontSize: 11, color: '#666' }}>سعر واحد للكل</div>
                    </div>
                  </label>
                </div>

                {addAllPriceSource === 'purchase_price' ? (() => {
                  const qty = parseFloat(addAllQty) || 0;
                  const prices = products.map(p => p.purchase_price_ht || 0).filter(p => p > 0);
                  const total = prices.reduce((s, p) => s + p, 0);
                  const avg = prices.length ? total / prices.length : 0;
                  const withPrice = prices.length;
                  const withoutPrice = products.length - withPrice;
                  const grandTotal = qty * total;
                  return (
                    <div style={{ marginBottom: 14, padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 10 }}>
                        <i className="ti ti-check-circle" style={{ fontSize: 16 }} />
                        سيتم استخدام سعر الشراء لكل منتج على حدة
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#fff', borderRadius: 4 }}>
                          <span style={{ color: '#555' }}>منتجات بها سعر</span>
                          <strong>{withPrice}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#fff', borderRadius: 4 }}>
                          <span style={{ color: '#555' }}>بلا سعر (0 دج)</span>
                          <strong style={{ color: withoutPrice > 0 ? '#ef4444' : undefined }}>{withoutPrice}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#fff', borderRadius: 4 }}>
                          <span style={{ color: '#555' }}>متوسط السعر</span>
                          <strong>{fmt(avg)} دج</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#fff', borderRadius: 4 }}>
                          <span style={{ color: '#555' }}>إجمالي أسعار الشراء</span>
                          <strong>{fmt(total)} دج</strong>
                        </div>
                      </div>
                      {qty > 0 && (
                        <div style={{ marginTop: 8, padding: '6px 10px', background: '#dcfce7', borderRadius: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
                          <span>القيمة الإجمالية ({qty} × {fmt(total)} دج)</span>
                          <span>{fmt(grandTotal)} دج</span>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: '#333' }}>
                      سعر الوحدة الافتراضي
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      value={addAllUnitPrice}
                      onChange={e => setAddAllUnitPrice(e.target.value)}
                      placeholder="مثال: 100"
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 6,
                        border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 6,
                        fontFamily: 'Tajawal, sans-serif',
                      }}
                    />
                    <div style={{ fontSize: 11, color: '#999', marginBottom: 14 }}>
                      {addAllQty && addAllUnitPrice
                        ? `القيمة الإجمالية التقديرية: ${(+addAllQty * +addAllUnitPrice).toLocaleString('fr-DZ')} دج`
                        : 'اتركه فارغاً إذا أردت أن تكون القيمة الإجمالية 0'}
                    </div>
                  </>
                )}

                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, cursor: 'pointer', marginBottom: 16,
                }}>
                  <input
                    type="checkbox"
                    checked={allowDuplicates}
                    onChange={e => setAllowDuplicates(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span>السماح بالتكرار — إضافة المنتجات المضافة مسبقاً</span>
                </label>
                {!allowDuplicates && (
                  <div style={{
                    padding: '8px 12px', background: '#fef3c7', borderRadius: 6,
                    fontSize: 12, color: '#92400e', marginBottom: 16,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <i className="ti ti-alert-triangle" />
                    تم اكتشاف {rows.length + drafts.length} منتج موجود مسبقاً — سيتم تخطيها
                  </div>
                )}
              </div>
              <div style={{
                  display: 'flex', gap: 8, justifyContent: 'flex-end',
                  padding: '12px 20px', borderTop: '1px solid #e2e8f0', flexShrink: 0,
                  background: '#fff',
                }}>
                  <button onClick={() => { setShowAddAllModal(false); setAddAllResult(null); }}
                    style={{
                      padding: '8px 20px', border: '1px solid #e2e8f0', borderRadius: 6,
                      background: '#fff', color: '#333', fontSize: 13, cursor: 'pointer',
                      fontFamily: 'Tajawal, sans-serif',
                    }}>
                    إلغاء
                  </button>
                  <button
                    onClick={handleAddAll}
                    disabled={!addAllWarehouseId || !addAllQty || products.length === 0}
                    style={{
                      padding: '8px 20px', border: 'none', borderRadius: 6,
                      background: (!addAllWarehouseId || !addAllQty || products.length === 0) ? '#94a3b8' : '#0891b2',
                      color: '#fff', fontSize: 13, fontWeight: 600, cursor: (!addAllWarehouseId || !addAllQty || products.length === 0) ? 'not-allowed' : 'pointer',
                      fontFamily: 'Tajawal, sans-serif',
                    }}>
                    <i className="ti ti-check" style={{ marginLeft: 4 }} />
                    إضافة الكل ({products.length})
                  </button>
                </div>
              </>
            )}

            {/* ── Loading (جاري إضافة المنتجات…) ── */}
            {addAllLoading && (
              <div style={{ padding: 32, textAlign: 'center', flex: 1, overflowY: 'auto', minHeight: 0 }}>

                <style>{`
                  @keyframes floatY {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-6px); }
                  }
                  @keyframes shimmer {
                    0%   { background-position: 200% center; }
                    100% { background-position: -200% center; }
                  }
                `}</style>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 2, marginBottom: 22,
                }}>
                  {[
                    { icon: 'ti-package',        bg: '#0891b2', delay: '0s' },
                    { icon: 'ti-arrow-left',     bg: 'transparent', delay: '0s', nbox: true },
                    { icon: 'ti-building-warehouse', bg: '#2563eb', delay: '0.12s' },
                    { icon: 'ti-arrow-left',     bg: 'transparent', delay: '0s', nbox: true },
                    { icon: 'ti-clipboard-list', bg: '#16a34a', delay: '0.24s' },
                  ].map((item, i) =>
                    item.nbox ? (
                      <span key={i} style={{ color: '#94a3b8', fontSize: 16, margin: '0 4px' }}>
                        <i className={`ti ${item.icon}`} />
                      </span>
                    ) : (
                      <div key={i} style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: `linear-gradient(135deg, ${item.bg}, ${item.bg}dd)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 18,
                        animation: `floatY 1.4s ease-in-out infinite`,
                        animationDelay: item.delay,
                      }}>
                        <i className={`ti ${item.icon}`} />
                      </div>
                    )
                  )}
                </div>

                <div style={{
                  position: 'relative', width: 88, height: 88, margin: '0 auto 18px',
                }}>
                  <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: 88, height: 88 }}>
                    <defs>
                      <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0891b2" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#progressGrad)" strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - liveDone / Math.max(products.length, 1))}
                      strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s ease' }} />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#0891b2', lineHeight: 1 }}>
                      {liveDone}
                    </span>
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>
                      من {products.length}
                    </span>
                  </div>
                </div>

                <div style={{
                  fontSize: 15, fontWeight: 700, color: '#0f172a',
                  marginBottom: 4,
                }}>
                  جاري إضافة المنتجات…
                </div>
                <div style={{
                  fontSize: 12, color: '#94a3b8', marginBottom: 18,
                }}>
                  يرجى الانتظار حتى اكتمال العملية
                </div>

                {addAllCurrent && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 12,
                    padding: '12px 24px', marginBottom: 16,
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)',
                    backgroundSize: '200% 100%',
                    border: '1px solid #bae6fd', borderRadius: 12,
                    animation: 'shimmer 2s ease-in-out infinite',
                    boxShadow: '0 2px 12px rgba(8,145,178,.15)',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 20,
                      animation: 'floatY 1.4s ease-in-out infinite',
                    }}>
                      <i className="ti ti-package" />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#0891b2', fontWeight: 600, marginBottom: 2 }}>
                        جاري إضافة المنتجات…
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {addAllCurrent}
                      </div>
                    </div>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      border: '3px solid #e2e8f0',
                      borderTopColor: '#0891b2',
                      animation: 'spin .8s linear infinite',
                    }} />
                  </div>
                )}

                <div style={{
                  width: '80%', maxWidth: 320, margin: '0 auto 10px',
                  height: 6, background: '#f1f5f9', borderRadius: 3,
                  overflow: 'hidden', border: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #0891b2, #06b6d4, #22d3ee)',
                    backgroundSize: '200% 100%',
                    borderRadius: 3, transition: 'width .4s ease',
                    animation: 'shimmer 1.5s ease-in-out infinite',
                    width: `${products.length > 0 ? (liveDone / products.length) * 100 : 0}%`,
                  }} />
                </div>

                <div style={{
                  fontSize: 12, color: '#94a3b8',
                  display: 'flex', justifyContent: 'center', gap: 16,
                }}>
                  <span style={{ color: '#16a34a' }}>✓ {liveAdded} تمت</span>
                  <span style={{ color: '#d97706' }}>⏭ {liveSkipped} تخطي</span>
                  <span style={{ color: '#ef4444' }}>✕ {liveErrors} فشل</span>
                </div>
              </div>
            )}

            {/* ── Step 2: Results ── */}
            {addAllResult && !addAllLoading && (
              <>
              <div style={{ padding: 20, flex: 1, overflowY: 'auto', minHeight: 0 }}>
                <div style={{
                  display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap',
                }}>
                  <div style={{
                    flex: 1, minWidth: 100, textAlign: 'center', padding: 14,
                    background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{addAllResult.added}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>تمت الإضافة</div>
                  </div>
                  {addAllResult.skipped > 0 && (
                    <div style={{
                      flex: 1, minWidth: 100, textAlign: 'center', padding: 14,
                      background: '#fef3c7', borderRadius: 10, border: '1px solid #fde68a',
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#d97706' }}>{addAllResult.skipped}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>تم التخطي</div>
                    </div>
                  )}
                  {addAllResult.errors > 0 && (
                    <div style={{
                      flex: 1, minWidth: 100, textAlign: 'center', padding: 14,
                      background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca',
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{addAllResult.errors}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>فشل</div>
                    </div>
                  )}
                </div>

                <div style={{
                  padding: '10px 14px', background: '#f8fafc', borderRadius: 8,
                  fontSize: 13, color: '#333', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <i className={`ti ${addAllResult.errors > 0 ? 'ti-alert-circle' : 'ti-check-circle'}`}
                    style={{ color: addAllResult.errors > 0 ? '#dc2626' : '#16a34a' }} />
                  {addAllResult.errors > 0
                    ? `تمت الإضافة بنجاح مع ${addAllResult.errors} خطأ`
                    : `تمت إضافة ${addAllResult.added} منتج بنجاح`}
                </div>

                <div style={{
                  maxHeight: 200, overflow: 'auto', marginBottom: 12,
                  border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12,
                }}>
                  {addAllResult.details.map((d, i) => (
                    <div key={i} style={{
                      padding: '5px 10px',
                      borderBottom: i < addAllResult.details.length - 1 ? '1px solid #f0f1f3' : 'none',
                    }}>
                      {d}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{
                  display: 'flex', gap: 8, justifyContent: 'flex-end',
                  padding: '12px 20px', borderTop: '1px solid #e2e8f0', flexShrink: 0,
                  background: '#fff',
                }}>
                  <button onClick={() => { setShowAddAllModal(false); setAddAllResult(null); }}
                    style={{
                      padding: '8px 20px', border: 'none', borderRadius: 6,
                      background: '#0891b2', color: '#fff', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'Tajawal, sans-serif',
                    }}>
                    <i className="ti ti-check" style={{ marginLeft: 4 }} />
                    تم
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          موديل حذف الكل (تأكيد)
          ════════════════════════════════════════════════════════════════════ */}
      {showDeleteAllModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { if (!deleteAllLoading) setShowDeleteAllModal(false); }}>
          <div style={{
            width: 420, maxWidth: '95vw',
            background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
            padding: 24, textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>

            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#fef2f2', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 28, color: '#ef4444' }} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              حذف كل الرصيد الافتتاحي
            </h3>

            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              هل أنت متأكد من حذف جميع المنتجات ({rows.length} منتج) من الرصيد الافتتاحي؟
              <br />
              <strong style={{ color: '#ef4444' }}>هذا الإجراء لا يمكن التراجع عنه.</strong>
            </p>

            <div style={{
              display: 'flex', gap: 10, justifyContent: 'center',
            }}>
              <button
                onClick={() => setShowDeleteAllModal(false)}
                disabled={deleteAllLoading}
                style={{
                  padding: '9px 24px', border: '1px solid #e2e8f0', borderRadius: 8,
                  background: '#fff', color: '#333', fontSize: 13, cursor: deleteAllLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Tajawal, sans-serif', opacity: deleteAllLoading ? .6 : 1,
                }}>
                إلغاء
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteAllLoading}
                style={{
                  padding: '9px 24px', border: 'none', borderRadius: 8,
                  background: deleteAllLoading ? '#94a3b8' : '#ef4444',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: deleteAllLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Tajawal, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                {deleteAllLoading ? (
                  <>
                    <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
                    جاري الحذف…
                  </>
                ) : (
                  <>
                    <i className="ti ti-trash" />
                    نعم، حذف الكل
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
