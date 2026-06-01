// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/OpeningBalanceTab.tsx — تاب "الرصيد الافتتاحي"
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
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
  const { selectedYear, years } = useFiscalYear();

  const [fiscalYearId, setFiscalYearId] = useState<number | ''>(selectedYear?.id ?? '');
  const [drafts,       setDrafts]       = useState<DraftRow[]>([]);
  const [editingId,    setEditingId]    = useState<number | null>(null);
  const [editDraft,    setEditDraft]    = useState<DraftRow>(emptyDraft());
  const [deletingId,   setDeletingId]   = useState<number | null>(null);
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  // ── خيارات المنتجات والمستودعات ──────────────────────────────────────────

  const { data: productsData } = useQuery({
    queryKey:  tenantKeys.products.list(slug ?? ''),
    queryFn:   () => apiGet<ProductOption[]>('/products', {
      per_page: 500, manages_stock: 1,
    }),
    enabled:   !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: warehousesData } = useQuery({
    queryKey:  tenantKeys.lookups.warehouses(slug ?? ''),
    queryFn:   () => apiGet<WarehouseOption[]>('/warehouses', { per_page: 200 }),
    enabled:   !!slug,
    staleTime: 10 * 60_000,
  });

  // extractData يرجع المصفوفة مباشرة
  const products:   ProductOption[]   = productsData   ?? [];
  const warehouses: WarehouseOption[] = warehousesData ?? [];

  // ── جلب سطور الرصيد الافتتاحي ─────────────────────────────────────────

  const { data: obData, isLoading } = useQuery({
    queryKey:        obKeys.list(slug ?? '', fiscalYearId || undefined),
    queryFn:         async () => {
      if (!fiscalYearId) return [] as OpeningBalanceStock[];
      const result = await obApi.list(fiscalYearId as number);
      // extractData قد يرجع undefined في حالات edge — نضمن مصفوفة دائماً
      return (Array.isArray(result) ? result : []) as OpeningBalanceStock[];
    },
    enabled:         !!slug && !!fiscalYearId,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });

  const rows: OpeningBalanceStock[] = obData ?? [];

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
    if (!fiscalYearId)                                      errs['year']      = 'اختر سنة';
    if (!d.opening_quantity || isNaN(+d.opening_quantity))  errs[`q_${idx}`] = 'مطلوب';
    if (!d.opening_value    || isNaN(+d.opening_value))     errs[`v_${idx}`] = 'مطلوب';

    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    await createMut.mutateAsync({
      fiscal_year_id:     fiscalYearId as number,
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
        <i className="ti ti-calendar" style={{ color: 'var(--t4)', fontSize: 15 }} />
        <label style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>
          السنة المالية:
        </label>
        <select
          value={fiscalYearId}
          onChange={e => setFiscalYearId(e.target.value ? +e.target.value : '')}
          style={{
            padding: '6px 10px', background: 'var(--bg2)',
            border: `1px solid ${errors['year'] ? '#ef4444' : 'var(--b2)'}`,
            borderRadius: 8, color: 'var(--t1)', fontSize: 13,
            fontFamily: 'Tajawal, sans-serif', outline: 'none',
          }}
        >
          <option value="">— اختر سنة —</option>
          {years.map(y => (
            <option key={y.id} value={y.id}>
              {y.name}{y.is_current ? ' (الحالية)' : ''}{y.is_closed ? ' 🔒' : ''}
            </option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        {fiscalYearId && (
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
      {!fiscalYearId ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg2)', border: '1px solid var(--b1)',
          borderRadius: 12, color: 'var(--t4)',
        }}>
          <i className="ti ti-calendar-off" style={{
            fontSize: 40, display: 'block', marginBottom: 12,
          }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            اختر سنة مالية لعرض الرصيد الافتتاحي
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
                        اضغط "إضافة سطر" لتسجيل المخزون الافتتاحي
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
      {fiscalYearId && rows.length > 0 && (
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: 'rgba(16,185,129,.08)',
          border: '1px solid rgba(16,185,129,.25)',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: '#10b981',
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 15 }} />
          الرصيد الافتتاحي يُحتسب تلقائياً ضمن المخزون الفعلي للمنتجات
          عبر حركة مخزون من نوع "رصيد افتتاحي".
        </div>
      )}
    </div>
  );
}
