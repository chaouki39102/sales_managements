

# =========================================
# 📘 ducuments
# =========================================

## FILE: resources/js/pages/documents/CommercialDocumentModal.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/CommercialDocumentModal.tsx — النسخة المُعاد هيكلتها
//
// المكون الرئيسي هو orchestrator فقط:
//   ✅ يستدعي useDocumentForm     → كل الـ form state والمنطق  (أولاً)
//   ✅ يستدعي useDocumentLookups  → كل الـ queries             (ثانياً)
//   ✅ يُفوّض العرض لمكونات متخصصة
//   ✅ يتولى الـ mutation والـ cache invalidation
//
// 🔧 BUGFIX: كان useDocumentLookups يُستدعى قبل useDocumentForm مما يُسبّب
//    "Cannot access 'form' before initialization" (Temporal Dead Zone).
//    الحل: عكس الترتيب — useDocumentForm أولاً، ثم useDocumentLookups.
//
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPut } from '@/lib/api/core/client';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';
import type { DocumentType } from '@/lib/api/core/types';

import { useDocumentLookups }  from './hooks/useDocumentLookups';
import { useDocumentForm }     from './hooks/useDocumentForm';
import { DocumentLineRow }     from './components/DocumentLineRow';
import {
  Section, Label, FieldError, Toggle, TotalCard,
  ComboBox, ColumnManager, AlertBanner,
} from './components/DocumentUIPrimitives';
import {
  ALL_COLUMNS, PURCHASE_CODES,
} from './types/document.types';
import type { ColKey } from './types/document.types';
import {
  fmtDZD, loadVisibleCols, saveVisibleCols,
  validateLineStock,
} from './utils/document.utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CommercialDocumentModalProps {
  open:               boolean;
  documentType:       DocumentType | null;
  existingDocument?:  Record<string, unknown>;
  onClose:            () => void;
  onSaved:            () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommercialDocumentModal({
  open,
  documentType,
  existingDocument,
  onClose,
  onSaved,
}: CommercialDocumentModalProps) {

  const slug           = useActiveSlug();
  const qc             = useQueryClient();
  const { selectedYear } = useFiscalYear() as { selectedYear?: { id: number; name: string } };

  const docCode    = documentType?.code ?? '';
  const isPurchase = PURCHASE_CODES.has(docCode);
  const isEdit     = !!existingDocument;

  // ─── Column visibility (per-company) ───────────────────────────────────────

  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    () => loadVisibleCols(slug ?? 'default'),
  );
  const handleColsChange = (cols: Set<ColKey>) => {
    setVisibleCols(cols);
    saveVisibleCols(slug ?? 'default', cols);
  };

  // ─── Form ─────────────────────────────────────────────────────────────────
  // 🔧 يجب أن يأتي useDocumentForm قبل useDocumentLookups لأن الـ lookups
  //    تحتاج form.warehouse_id و form.fiscal_year_id — وهذه القيم لا تتوفر
  //    إلا بعد استدعاء هذا الـ hook.
  //    القيم الافتراضية (warehouse, currency, …) تُطبَّق لاحقاً عبر useEffect
  //    داخل useDocumentForm عندما تصل lookups.

  const {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, priceLevelId,
    addLine, removeLine, duplicateLine, updateLine,
    addPayment, removePayment, updatePayment,
    totals, validate, buildPayload,
    needsParty, affectsStock, stockDir,
  } = useDocumentForm({
    documentType,
    existingDocument,
    defaultTvaRate:     19,   // قيمة أولية آمنة — ستُحدَّث بمجرد تحميل المنتجات
    defaultWarehouseId: '',   // ستُملأ بعد تحميل lookups عبر useEffect الداخلي
    baseCurrencyId:     '',
    selectedYearId:     selectedYear?.id ? String(selectedYear.id) : '',
    paymentModes:       [],   // ستُملأ بعد تحميل lookups
    parties:            [],
    stockData:          {},
    isPurchase,
    open,
  });

  // ─── Lookups ────────────────────────────────────────────────────────────────
  // الآن form متاح — نمرر warehouse_id و fiscal_year_id للـ stock query.

  const lookups = useDocumentLookups({
    open,
    isPurchase,
    needsParty: true,
    warehouseId:  form.warehouse_id   ? parseInt(form.warehouse_id)   : null,
    fiscalYearId: form.fiscal_year_id ? parseInt(form.fiscal_year_id) : null,
  });

  // ─── Success state ──────────────────────────────────────────────────────────

  const [successMsg, setSuccessMsg] = useState('');
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current); }, []);

  const disableForm = !!(form as Record<string, unknown>).is_locked
    || !!(form as Record<string, unknown>).validated_at;

  // ─── Mutation ───────────────────────────────────────────────────────────────

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      const url     = isEdit ? `/documents/${existingDocument!.id}` : '/documents';
      return isEdit
        ? apiPut<Record<string, unknown>>(url, payload)
        : apiPost<Record<string, unknown>>(url, payload);
    },
    onSuccess: (savedDoc) => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        if (affectsStock) {
          qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        }
      }
      const docNum = String(
        (savedDoc as Record<string, unknown>)?.document_number ?? '—',
      );
      setSuccessMsg(isEdit ? `تم تحديث المستند ${docNum}` : `تم إنشاء المستند ${docNum} ✓`);
      successTimer.current = setTimeout(() => {
        setSuccessMsg('');
        onSaved();
        onClose();
      }, 1500);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      setApiErr(String(err?.message ?? 'حدث خطأ أثناء الحفظ'));
    },
  });

  const handleSave = () => {
    setApiErr('');
    if (validate()) saveMut.mutate();
  };

  const isPending = saveMut.isPending;

  // ─── Party options for ComboBox ─────────────────────────────────────────────

  const partyOptions = useMemo(() =>
    lookups.parties.map((p) => ({
      id:    p.id,
      label: p.name,
      sub:   [p.code, p.phone].filter(Boolean).join(' · '),
      badge: p.price_level?.name,
    })),
    [lookups.parties],
  );

  // ─── Price level options ────────────────────────────────────────────────────

  const priceLevelOptions = useMemo(() =>
    lookups.priceLevels.map((pl) => ({
      id:    Number(pl.id),
      label: String(pl.name),
    })),
    [lookups.priceLevels],
  );

  // ─── Stock badge for header ─────────────────────────────────────────────────

  const stockBadge = useMemo(() => {
    if (!affectsStock) return null;
    return stockDir > 0
      ? { text: 'يضيف مخزون',   bg: 'var(--greenb)', color: 'var(--green)' }
      : { text: 'يخصم مخزون',   bg: 'var(--redb)',   color: 'var(--red)'   };
  }, [affectsStock, stockDir]);

  // ─── Modal guard ────────────────────────────────────────────────────────────

  if (!open) return null;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)',
      direction: 'rtl',
    }}>
      <div style={{
        width: '95vw', maxWidth: 1100, maxHeight: '93vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg1)',
        borderRadius: 'var(--r3)',
        boxShadow: '0 24px 60px rgba(0,0,0,.3)',
        overflow: 'hidden',
      }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--b1)',
          background: 'var(--bg2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: `color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 25%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`ti ${isPurchase ? 'ti-truck' : 'ti-receipt'}`}
                style={{ fontSize: 18, color: isPurchase ? 'var(--blue)' : 'var(--green)' }} />
            </div>

            {/* Title */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)',
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {isEdit ? `تعديل ${documentType?.name}` : `${documentType?.name} جديد`}
                {isEdit && existingDocument?.document_number && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)',
                    background: 'var(--bg1)', border: '1px solid var(--b2)',
                    fontSize: 12, fontWeight: 700, color: 'var(--em)',
                  }}>
                    {String(existingDocument.document_number)}
                  </span>
                )}
                {stockBadge && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)', fontSize: 11, fontWeight: 700,
                    background: stockBadge.bg, color: stockBadge.color,
                  }}>
                    {stockBadge.text}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                {documentType?.name} — {docCode}
                {!isEdit && <span style={{ marginRight: 8 }}>· رقم الوثيقة يُولَّد تلقائياً</span>}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isPending}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isPending ? 'not-allowed' : 'pointer', color: 'var(--t3)',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>

          {successMsg && <AlertBanner type="success" message={successMsg} />}
          {apiErr     && <AlertBanner type="error"   message={apiErr}     />}

          {/* SECTION 1: معلومات المستند */}
          <Section title="معلومات المستند" icon="ti-file-description">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 12,
            }}>
              {/* المتعامل */}
              {needsParty && (
                <div style={{ gridColumn: 'span 2' }}>
                  <Label required>{isPurchase ? 'المورد' : 'الزبون'}</Label>
                  <ComboBox
                    options={partyOptions}
                    value={form.party_id}
                    onChange={handlePartyChange}
                    placeholder={`— ابحث عن ${isPurchase ? 'مورد' : 'زبون'} —`}
                    disabled={disableForm}
                    error={!!errors.party_id}
                  />
                  <FieldError msg={errors.party_id} />
                </div>
              )}

              {/* التاريخ */}
              <div>
                <Label required>تاريخ المستند</Label>
                <input
                  type="date"
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: `1px solid ${errors.document_date ? 'var(--red)' : 'var(--b3)'}`,
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                  }}
                  value={form.document_date}
                  disabled={disableForm}
                  onChange={(e) => set('document_date', e.target.value)}
                />
                <FieldError msg={errors.document_date} />
              </div>

              {/* تاريخ الاستحقاق */}
              <div>
                <Label>تاريخ الاستحقاق</Label>
                <input
                  type="date"
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: '1px solid var(--b3)',
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                  }}
                  value={form.due_date}
                  min={form.document_date}
                  disabled={disableForm}
                  onChange={(e) => set('due_date', e.target.value)}
                />
              </div>

              {/* المستودع */}
              <div>
                <Label required>المستودع</Label>
                <select
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: `1px solid ${errors.warehouse_id ? 'var(--red)' : 'var(--b3)'}`,
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', cursor: 'pointer',
                  }}
                  value={form.warehouse_id}
                  disabled={disableForm}
                  onChange={(e) => set('warehouse_id', e.target.value)}
                >
                  <option value="">— اختر —</option>
                  {lookups.warehouses.map((w) => (
                    <option key={String(w.id)} value={String(w.id)}>
                      {String(w.name)}{w.is_default ? ' ★' : ''}
                    </option>
                  ))}
                </select>
                <FieldError msg={errors.warehouse_id} />
              </div>

              {/* السنة المالية */}
              <div>
                <Label required>السنة المالية</Label>
                <select
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: `1px solid ${errors.fiscal_year_id ? 'var(--red)' : 'var(--b3)'}`,
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', cursor: 'pointer',
                  }}
                  value={form.fiscal_year_id}
                  disabled={disableForm}
                  onChange={(e) => set('fiscal_year_id', e.target.value)}
                >
                  <option value="">— اختر —</option>
                  {lookups.fiscalYears.map((fy) => (
                    <option key={String(fy.id)} value={String(fy.id)}>
                      {String(fy.name)}
                      {fy.is_current ? ' ★' : ''}
                      {fy.is_closed  ? ' (مقفلة)' : ''}
                    </option>
                  ))}
                </select>
                <FieldError msg={errors.fiscal_year_id} />
              </div>

              {/* العملة */}
              <div>
                <Label required>العملة</Label>
                <select
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: `1px solid ${errors.currency_id ? 'var(--red)' : 'var(--b3)'}`,
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', cursor: 'pointer',
                  }}
                  value={form.currency_id}
                  disabled={disableForm}
                  onChange={(e) => set('currency_id', e.target.value)}
                >
                  <option value="">— اختر —</option>
                  {lookups.currencies.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.code)} — {String(c.name)}{c.is_base_currency ? ' ★' : ''}
                    </option>
                  ))}
                </select>
                <FieldError msg={errors.currency_id} />
              </div>

              {/* الفئة السعرية (بيع فقط) */}
              {!isPurchase && lookups.priceLevels.length > 0 && (
                <div>
                  <Label>فئة السعر</Label>
                  <ComboBox
                    options={priceLevelOptions}
                    value={form.price_level_id}
                    onChange={(v) => set('price_level_id', v)}
                    placeholder="— الافتراضي —"
                    disabled={disableForm}
                  />
                </div>
              )}

              {/* ملاحظات */}
              <div style={{ gridColumn: 'span 2' }}>
                <Label>ملاحظات</Label>
                <textarea
                  rows={2}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: '1px solid var(--b3)', background: 'var(--bg1)',
                    color: 'var(--t1)', fontSize: 13,
                    fontFamily: 'Tajawal, sans-serif', outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                  value={form.notes}
                  disabled={disableForm}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>
            </div>
          </Section>

          {/* SECTION 2: الأسطر */}
          <Section
            title="أسطر المستند"
            icon="ti-list-details"
            badge={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {form.lines.length > 0 && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    background: 'var(--emb)', color: 'var(--em)',
                  }}>
                    {form.lines.length} سطر
                  </span>
                )}
                <ColumnManager visible={visibleCols} onChange={handleColsChange} />
              </div>
            }
          >
            {/* تنبيه المخزون */}
            {affectsStock && (
              <AlertBanner
                type={stockDir > 0 ? 'info' : 'warning'}
                message={stockDir > 0
                  ? 'هذا المستند سيُضيف الكميات إلى المخزون عند الحفظ'
                  : 'هذا المستند سيخصم الكميات من المخزون عند الحفظ'}
              />
            )}

            {lineErr && <AlertBanner type="error" message={lineErr} />}

            {lookups.isLoadingProducts ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--t4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                جاري تحميل المنتجات...
              </div>
            ) : lookups.products.length === 0 ? (
              <AlertBanner type="warning" message="لا توجد منتجات نشطة." />
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 'var(--r2)',
                border: '1px solid var(--b1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse',
                  fontSize: 12, direction: 'rtl' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg2)' }}>
                      {ALL_COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => (
                        <th key={col.key} style={{
                          padding: '7px 5px', textAlign: 'center',
                          fontWeight: 700, color: 'var(--t3)', fontSize: 10.5,
                          letterSpacing: 0.3, width: col.w, whiteSpace: 'nowrap',
                          borderBottom: '1px solid var(--b2)',
                        }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, idx) => {
                      const stockResult = line._product
                        ? validateLineStock(line, line._product, isPurchase, lookups.stockData)
                        : { ok: true as const };
                      return (
                        <DocumentLineRow
                          key={idx}
                          line={line}
                          idx={idx}
                          visibleCols={visibleCols}
                          isPurchase={isPurchase}
                          disabled={disableForm}
                          products={lookups.products}
                          stockData={lookups.stockData}
                          stockValidation={stockResult}
                          onUpdate={updateLine}
                          onRemove={removeLine}
                          onDuplicate={duplicateLine}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* زر إضافة سطر */}
            {!disableForm && (
              <button
                onClick={addLine}
                style={{
                  marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--r2)',
                  border: '1px dashed var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  transition: 'all .15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--em)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--em)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--b3)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--t3)';
                }}
              >
                <i className="ti ti-plus" />
                إضافة سطر
              </button>
            )}
          </Section>

          {/* SECTION 3: الدفعات */}
          {!isPurchase && (
            <Section title="الدفعات" icon="ti-wallet" collapsible>
              {form.payments.map((pay, idx) => (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 160px 120px 32px',
                  gap: 8, marginBottom: 8, alignItems: 'end',
                }}>
                  <div>
                    {idx === 0 && <Label>طريقة الدفع</Label>}
                    <select
                      style={{
                        width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)', background: 'var(--bg1)',
                        color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                        outline: 'none', cursor: 'pointer',
                      }}
                      value={pay.payment_mode_id}
                      disabled={disableForm}
                      onChange={(e) => updatePayment(idx, { payment_mode_id: e.target.value })}
                    >
                      <option value="">— اختر —</option>
                      {lookups.paymentModes.map((pm) => (
                        <option key={pm.id} value={String(pm.id)}>{pm.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    {idx === 0 && <Label>المبلغ</Label>}
                    <input
                      type="number" min={0} step={0.01}
                      style={{
                        width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)', background: 'var(--bg1)',
                        color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                        outline: 'none',
                      }}
                      value={pay.amount}
                      disabled={disableForm}
                      onChange={(e) => updatePayment(idx, { amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    {idx === 0 && <Label>المرجع</Label>}
                    <input
                      type="text"
                      style={{
                        width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)', background: 'var(--bg1)',
                        color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                        outline: 'none',
                      }}
                      value={pay.reference ?? ''}
                      disabled={disableForm}
                      onChange={(e) => updatePayment(idx, { reference: e.target.value })}
                      placeholder="رقم الشيك..."
                    />
                  </div>

                  <div>
                    {idx === 0 && <Label>تاريخ الدفع</Label>}
                    <input
                      type="date"
                      style={{
                        width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)', background: 'var(--bg1)',
                        color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                        outline: 'none',
                      }}
                      value={pay.payment_date}
                      disabled={disableForm}
                      onChange={(e) => updatePayment(idx, { payment_date: e.target.value })}
                    />
                  </div>

                  <button
                    onClick={() => removePayment(idx)}
                    disabled={disableForm}
                    style={{
                      width: 32, height: 32, borderRadius: 'var(--r1)',
                      border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
                      background: 'var(--redb)', color: 'var(--red)',
                      cursor: disableForm ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      alignSelf: 'flex-end',
                    }}
                  >
                    <i className="ti ti-trash" style={{ fontSize: 13 }} />
                  </button>
                </div>
              ))}

              {!disableForm && (
                <button
                  onClick={addPayment}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 'var(--r2)',
                    border: '1px dashed var(--b3)', background: 'transparent',
                    color: 'var(--t3)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}
                >
                  <i className="ti ti-plus" />
                  إضافة دفعة
                </button>
              )}
            </Section>
          )}

          {/* SECTION 4: الإجماليات */}
          <Section title="الإجماليات" icon="ti-calculator">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <TotalCard label="إجمالي HT"     value={`${fmtDZD(totals.ht)} دج`} />
              <TotalCard label="الخصم الإجمالي" value={`${fmtDZD(totals.discount)} دج`}
                color="var(--red)" muted={totals.discount === 0} />
              <TotalCard label="TVA"            value={`${fmtDZD(totals.tva)} دج`} />
              <TotalCard label="إجمالي TTC"     value={`${fmtDZD(totals.ttc)} دج`}
                bg="var(--bg3)" color="var(--t1)" />
              {totals.stamp > 0 && (
                <TotalCard label="الطابع الجبائي" value={`${fmtDZD(totals.stamp)} دج`}
                  bg="var(--goldb)" color="var(--gold)" labelColor="var(--gold)" />
              )}
              <TotalCard label="المبلغ المستحق" value={`${fmtDZD(totals.netToPay)} دج`}
                bg="var(--em)" color="white" labelColor="rgba(255,255,255,.75)" large />
              {form.payments.length > 0 && (
                <>
                  <TotalCard label="المدفوع"  value={`${fmtDZD(totals.totalPaid)} دج`}
                    color="var(--green)"  bg="var(--greenb)" labelColor="var(--green)" />
                  <TotalCard label="المتبقي"  value={`${fmtDZD(totals.remaining)} دج`}
                    color={totals.remaining > 0 ? 'var(--red)' : 'var(--green)'}
                    bg={totals.remaining    > 0 ? 'var(--redb)' : 'var(--greenb)'}
                    labelColor={totals.remaining > 0 ? 'var(--red)' : 'var(--green)'} />
                </>
              )}
            </div>

            <Toggle
              checked={form.apply_stamp}
              onChange={(v) => set('apply_stamp', v)}
              label="الطابع الجبائي"
              subLabel="1% من TTC — بحد أقصى 2,500 دج"
              disabled={disableForm}
            />
          </Section>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--b1)',
          background: 'var(--bg2)',
          display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center',
          borderRadius: '0 0 var(--r3) var(--r3)',
        }}>
          {/* Summary */}
          <div style={{ fontSize: 12, color: 'var(--t4)' }}>
            {form.lines.length > 0 && (
              <>
                <span>{form.lines.length} سطر</span>
                <span style={{ margin: '0 6px' }}>·</span>
                <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                  {fmtDZD(totals.netToPay)} دج
                </span>
                {form.payments.length > 0 && totals.remaining > 0 && (
                  <>
                    <span style={{ margin: '0 6px' }}>·</span>
                    <span style={{ color: 'var(--red)' }}>
                      متبقي {fmtDZD(totals.remaining)} دج
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              disabled={isPending}
              style={{
                padding: '8px 18px', borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)', background: 'var(--bg1)',
                color: 'var(--t2)', cursor: isPending ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600,
              }}
            >
              إلغاء
            </button>

            <button
              onClick={handleSave}
              disabled={isPending || !!successMsg}
              style={{
                padding: '8px 24px', borderRadius: 'var(--r2)',
                border: 'none',
                background: successMsg ? 'var(--green)' : 'var(--em)',
                color: 'white',
                cursor: isPending || !!successMsg ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 7,
                opacity: isPending ? 0.7 : 1, transition: 'background .2s',
              }}
            >
              {isPending ? (
                <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>
              ) : successMsg ? (
                <><i className="ti ti-check" /> تم الحفظ</>
              ) : (
                <><i className={`ti ${isEdit ? 'ti-device-floppy' : 'ti-plus'}`} />
                  {isEdit ? 'تحديث المستند' : 'حفظ المستند'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/documents/CommercialDocumentsPage.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/CommercialDocumentsPage.tsx  —  v10.3
//
// ✅ جديد في v10.3:
//   • useColumnStatePersistence — مفتاح localStorage واحد لكل typeCode يحفظ:
//     columnOrder + hiddenColumns + activeFilters (pinnedColumns جاهز للإضافة)
//   • زر إعادة ضبط Layout يظهر عند وجود snapshot محفوظ
//   • إزالة المفاتيح المتفرقة: cdp-column-order-* و cdp-cols-*
//
// ✅ محفوظ من v10.2:
//   • smartFilterPatterns={ERP_FILTER_PATTERNS} مُفعَّل
//   • DataTableErrorBoundary يلف الجدول
// ════════════════════════════════════════════════════════════════════════════

import React, {
    useState,
    useCallback,
    useMemo,
    useEffect,
    useRef,
} from "react";
import { useParams } from "react-router-dom";
import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api/core/client";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug } from "@/lib/store/appStore";
import { useFiscalYear } from "@/context/FiscalYearContext";
import { DataTable, DataTableErrorBoundary } from "@/components/ui/DataTable";
import type {
    Column,
    MultiSortState,
    ConditionalFormat,
    ContextMenuItem,
    ContextMenuContext,
} from "@/components/ui/DataTable";
import { useColumnVisibility, useColumnStatePersistence } from "@/components/ui/DataTable";
import CommercialDocumentModal from "./CommercialDocumentModal";
import QuickSaleModal from "./QuickSaleModal";
import type { DocumentType, CommercialDocument } from "@/lib/api/core/types";

// أنماط SmartFilter الخاصة بالمشروع (مفصولة عن library)
import { ERP_FILTER_PATTERNS } from "@/lib/datatable-patterns";

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const SALE_CODES     = new Set(["FV", "BL", "DEV", "BCC", "AV"]);
const PURCHASE_CODES = new Set(["FA", "BR", "DDP", "BCF", "AA"]);

const STATUS_CFG = {
    draft:          { label: "مسودة",          color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
    pending:        { label: "قيد الانتظار",   color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
    validated:      { label: "معتمد",          color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6" },
    partially_paid: { label: "مدفوع جزئياً",   color: "#7c3aed", bg: "#f5f3ff", dot: "#8b5cf6" },
    paid:           { label: "مدفوع",          color: "#059669", bg: "#ecfdf5", dot: "#10b981" },
    overdue:        { label: "متأخر",          color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
    cancelled:      { label: "ملغي",           color: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" },
    returned:       { label: "مرتجع",          color: "#7c3aed", bg: "#f5f3ff", dot: "#a78bfa" },
} as const;

type StatusKey = keyof typeof STATUS_CFG;

// ════════════════════════════════════════════════════════════════════════════
// PURE HELPERS
// ════════════════════════════════════════════════════════════════════════════

function fmtDate(d?: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ar-DZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
    });
}

function fmtMoney(n?: number | string | null): string {
    const v = parseFloat(String(n ?? 0));
    if (isNaN(v)) return "—";
    return v.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDocStatus(doc: CommercialDocument): string {
    return (
        ((doc.document_status as Record<string, unknown> | undefined)?.name as string) ??
        ((doc as unknown as Record<string, unknown>).status as string) ??
        "draft"
    );
}

function getPartyName(doc: CommercialDocument): string {
    return ((doc.party as Record<string, unknown> | undefined)?.name as string) ?? "";
}

function getWarehouseName(doc: CommercialDocument): string {
    return ((doc.warehouse as Record<string, unknown> | undefined)?.name as string) ?? "";
}

// ════════════════════════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status as StatusKey] ?? STATUS_CFG.draft;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            color: cfg.color, background: cfg.bg,
            border: `1px solid color-mix(in srgb, ${cfg.color} 22%, transparent)`,
            whiteSpace: "nowrap",
        }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
            {cfg.label}
        </span>
    );
}

function MoneyCell({ value, bold, accent }: { value?: number | string | null; bold?: boolean; accent?: string }) {
    const v = parseFloat(String(value ?? 0));
    if (isNaN(v) || v === 0) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
    return (
        <span style={{
            direction: "ltr", display: "inline-block",
            fontVariantNumeric: "tabular-nums",
            fontWeight: bold ? 800 : 400, color: accent ?? "var(--t2)",
        }}>
            {fmtMoney(v)}
            <span style={{ fontSize: 10, marginRight: 3, color: "var(--t4)" }}>دج</span>
        </span>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY CARDS
// ════════════════════════════════════════════════════════════════════════════

function SummaryCards({ items = [], opColor }: { items: CommercialDocument[]; opColor: string }) {
    const stats = useMemo(() => ({
        count:    items.length,
        totalHt:  items.reduce((s, d) => s + (Number(d.total_ht) || 0), 0),
        totalTtc: items.reduce((s, d) => s + (Number(d.total_ttc) || 0), 0),
        unpaid:   items.filter(d => {
            const rem = Number((d as unknown as Record<string, unknown>).remaining_amount ?? 0);
            return rem > 0.001;
        }).length,
    }), [items]);

    const cards = [
        { icon: "ti-file-text",         label: "عدد المستندات", value: stats.count.toLocaleString("ar-DZ"),       accent: opColor },
        { icon: "ti-currency-dinar",     label: "HT (الصفحة)",   value: fmtMoney(stats.totalHt) + " دج",           accent: "var(--blue)", ltr: true },
        { icon: "ti-receipt",            label: "TTC (الصفحة)",  value: fmtMoney(stats.totalTtc) + " دج",          accent: opColor, ltr: true },
        { icon: "ti-clock-exclamation",  label: "غير مسدد",      value: stats.unpaid.toLocaleString("ar-DZ"),       accent: stats.unpaid > 0 ? "var(--red)" : "var(--t4)" },
    ] as const;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {cards.map(c => (
                <div key={c.label} style={{
                    padding: "12px 16px", background: "var(--bg1)",
                    border: "1px solid var(--b1)", borderRadius: "var(--r2)",
                    borderTop: `3px solid ${c.accent}`,
                    display: "flex", alignItems: "center", gap: 12,
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `color-mix(in srgb, ${c.accent} 12%, transparent)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <i className={`ti ${c.icon}`} style={{ fontSize: 17, color: c.accent }} aria-hidden="true" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: "var(--t4)", fontWeight: 700, marginBottom: 2, whiteSpace: "nowrap" }}>
                            {c.label}
                        </div>
                        <div style={{
                            fontSize: 14, fontWeight: 800, color: "var(--t1)",
                            direction: (c as { ltr?: boolean }).ltr ? "ltr" : "rtl",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                            {c.value}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// EXPANDED LINES
// ════════════════════════════════════════════════════════════════════════════

function ExpandedLines({ doc }: { doc: CommercialDocument }) {
    const slug = useActiveSlug();

    const { data: full, isLoading } = useQuery({
        queryKey: [slug, "doc-lines", doc.id],
        queryFn: () =>
            apiGet<CommercialDocument>(`/documents/${doc.id}`, {
                include: "lines.product,lines.productVariant",
            }).then(r => ((r as unknown as Record<string, unknown>).data as CommercialDocument) ?? r),
        staleTime: 5 * 60_000,
        enabled: !!doc.id,
    });

    if (isLoading) return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--t4)", fontSize: 12, padding: "4px 0" }}>
            <i className="ti ti-loader-2" style={{ animation: "cdp-spin .8s linear infinite", fontSize: 14 }} aria-hidden="true" />
            جارٍ تحميل الأسطر…
        </div>
    );

    const lines = ((full as unknown as Record<string, unknown>)?.lines as Record<string, unknown>[] | undefined) ?? [];
    if (lines.length === 0) return <div style={{ color: "var(--t4)", fontSize: 12 }}>لا توجد أسطر</div>;

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                    <tr style={{ background: "var(--bg3)" }}>
                        {["#", "المنتج", "الكمية", "سعر HT", "خصم", "TVA%", "الإجمالي TTC"].map(h => (
                            <th key={h} style={{ padding: "5px 12px", textAlign: "right", fontWeight: 700, color: "var(--t4)", fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {lines.map((line, idx) => {
                        const name =
                            ((line.product as Record<string, unknown> | undefined)?.name as string) ??
                            (line.description as string) ?? "—";
                        const disc = parseFloat(String(line.discount_percentage ?? 0));
                        return (
                            <tr key={String(line.id ?? idx)} style={{ borderBottom: "1px solid var(--b1)" }}>
                                <td style={{ padding: "6px 12px", color: "var(--t4)" }}>{idx + 1}</td>
                                <td style={{ padding: "6px 12px", fontWeight: 600 }}>{name}</td>
                                <td style={{ padding: "6px 12px", textAlign: "left" }}>{String(line.quantity ?? "")}</td>
                                <td style={{ padding: "6px 12px", direction: "ltr", textAlign: "left" }}>
                                    <MoneyCell value={line.unit_price_ht as number} />
                                </td>
                                <td style={{ padding: "6px 12px", textAlign: "left" }}>
                                    {disc > 0 ? <span style={{ color: "var(--red)", fontWeight: 700 }}>-{disc}%</span> : <span style={{ color: "var(--t4)" }}>—</span>}
                                </td>
                                <td style={{ padding: "6px 12px", color: "var(--t4)", textAlign: "left" }}>{line.tva_rate}%</td>
                                <td style={{ padding: "6px 12px", direction: "ltr", textAlign: "left" }}>
                                    <MoneyCell value={line.total_ttc as number} bold accent="var(--em)" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════════════════

interface ToastItem { id: number; msg: string; type: "success" | "error" | "info" }

function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const counterRef = useRef(0);

    const show = useCallback((msg: string, type: "success" | "error" | "info" = "success") => {
        const id = ++counterRef.current;
        setToasts(p => [...p, { id, msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    }, []);

    const ToastContainer = useCallback(() => (
        <div style={{ position: "fixed", bottom: 24, left: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 16px", borderRadius: 10,
                    background: t.type === "error" ? "color-mix(in srgb, var(--red) 15%, var(--bg1))" : t.type === "info" ? "color-mix(in srgb, var(--blue) 12%, var(--bg1))" : "color-mix(in srgb, var(--em) 12%, var(--bg1))",
                    border: `1px solid ${t.type === "error" ? "var(--red)" : t.type === "info" ? "var(--blue)" : "var(--em)"}`,
                    boxShadow: "0 8px 24px rgba(0,0,0,.14)", fontSize: 13, fontWeight: 600, color: "var(--t1)",
                    animation: "cdp-toast-in .2s ease",
                }}>
                    <i className={`ti ${t.type === "error" ? "ti-alert-circle" : t.type === "info" ? "ti-info-circle" : "ti-circle-check"}`}
                       style={{ color: t.type === "error" ? "var(--red)" : t.type === "info" ? "var(--blue)" : "var(--em)" }} aria-hidden="true" />
                    {t.msg}
                </div>
            ))}
        </div>
    ), [toasts]);

    return { show, ToastContainer };
}

// ════════════════════════════════════════════════════════════════════════════
// ROW ACTION BUTTON
// ════════════════════════════════════════════════════════════════════════════

const ActionBtn = React.memo(function ActionBtn({
    icon, title, onClick, color, disabled,
}: { icon: string; title: string; onClick: () => void; color?: string; disabled?: boolean }) {
    return (
        <button title={title} aria-label={title} disabled={disabled} onClick={onClick} style={{
            width: 28, height: 28, borderRadius: 6, border: "1px solid var(--b1)",
            background: "var(--bg2)", color: color ?? "var(--t3)", fontSize: 13,
            cursor: "pointer", display: "inline-flex", alignItems: "center",
            justifyContent: "center", transition: "all .15s", opacity: disabled ? 0.4 : 1,
        }}>
            <i className={`ti ${icon}`} aria-hidden="true" />
        </button>
    );
});

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT VIEW MODAL (مختصر — يبقى كما هو تقريباً)
// ════════════════════════════════════════════════════════════════════════════

function DocumentViewModal({
    docId, docType, onClose, onEdit, isReadOnly,
}: { docId: number; docType: DocumentType | null; onClose: () => void; onEdit: () => void; isReadOnly: boolean }) {
    const slug    = useActiveSlug();
    const isPurch = PURCHASE_CODES.has(docType?.code ?? "");

    const { data, isLoading } = useQuery({
        queryKey: [slug, "doc-detail-full", docId],
        queryFn: () =>
            apiGet<CommercialDocument>(`/documents/${docId}`, {
                include: ["party","documentStatus","warehouse","fiscalYear","currency","documentType","lines.product","lines.productVariant","validatedBy","payments.paymentMode"].join(","),
            }).then(r => ((r as unknown as Record<string, unknown>).data as CommercialDocument) ?? r),
        staleTime: 2 * 60_000,
    });

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", h);
        return () => document.removeEventListener("keydown", h);
    }, [onClose]);

    const d      = data as unknown as Record<string, unknown> | undefined;
    const status = d ? getDocStatus(data as CommercialDocument) : "draft";

    return (
        <div role="dialog" aria-modal="true" aria-label={`تفاصيل ${docType?.name ?? "المستند"}`}
             style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, direction: "rtl" }}
             onClick={onClose}>
            <div style={{ width: "100%", maxWidth: 920, maxHeight: "94vh", overflowY: "auto", overflowX: "hidden", background: "var(--bg1)", borderRadius: "var(--r3)", boxShadow: "0 24px 64px rgba(0,0,0,.22)", display: "flex", flexDirection: "column" }}
                 onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--b1)", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in srgb, ${isPurch ? "var(--purple)" : "var(--em)"} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <i className={`ti ${isPurch ? "ti-shopping-cart" : "ti-file-invoice"}`} style={{ fontSize: 18, color: isPurch ? "var(--purple)" : "var(--em)" }} aria-hidden="true" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--t1)" }}>
                                {docType?.name}
                                {d && <span style={{ marginRight: 8, color: isPurch ? "var(--purple)" : "var(--em)", fontFamily: "monospace" }}>{String(d.document_number ?? `#${d.id}`)}</span>}
                            </div>
                            {d && (
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                                    <StatusBadge status={status} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {!isReadOnly && d && status === "draft" && (
                            <button onClick={onEdit} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid color-mix(in srgb, var(--blue) 30%, transparent)`, background: "color-mix(in srgb, var(--blue) 8%, transparent)", color: "var(--blue)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                                <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden="true" />
                                تعديل
                            </button>
                        )}
                        <button onClick={onClose} aria-label="إغلاق" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--b1)", background: "var(--bg2)", color: "var(--t3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: "20px 24px", flex: 1 }}>
                    {isLoading ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, color: "var(--t4)" }}>
                            <i className="ti ti-loader-2" style={{ animation: "cdp-spin .8s linear infinite", fontSize: 20 }} aria-hidden="true" />
                            جارٍ تحميل التفاصيل…
                        </div>
                    ) : !d ? (
                        <div style={{ textAlign: "center", padding: 60, color: "var(--t4)" }}>المستند غير موجود</div>
                    ) : (
                        <>
                            {/* Meta Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                                {[
                                    { label: "التاريخ",     value: fmtDate(d.document_date as string) },
                                    { label: "الاستحقاق",   value: fmtDate(d.due_date as string) },
                                    { label: isPurch ? "المورد" : "الزبون", value: getPartyName(data as CommercialDocument) || "—" },
                                    { label: "المستودع",    value: getWarehouseName(data as CommercialDocument) || "—" },
                                ].map(f => (
                                    <div key={f.label} style={{ background: "var(--bg2)", borderRadius: "var(--r2)", padding: "10px 14px" }}>
                                        <div style={{ fontSize: 10, color: "var(--t4)", fontWeight: 700, marginBottom: 4 }}>{f.label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{f.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Lines */}
                            <ExpandedLines doc={data as CommercialDocument} />

                            {/* Totals */}
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                                <div style={{ width: 310, border: "1px solid var(--b1)", borderRadius: "var(--r2)", overflow: "hidden" }}>
                                    {([
                                        { label: "إجمالي HT",  value: d.total_ht,  dim: true },
                                        { label: "TVA",         value: d.total_tva, dim: true },
                                        parseFloat(String(d.total_discount ?? 0)) > 0 ? { label: "الخصم الإجمالي", value: d.total_discount, dim: false, red: true } : null,
                                        parseFloat(String(d.total_stamp ?? 0)) > 0 ? { label: "الطابع الجبائي", value: d.total_stamp, dim: true } : null,
                                    ] as ({ label: string; value: unknown; dim: boolean; red?: boolean } | null)[])
                                        .filter(Boolean)
                                        .map(row => {
                                            const r = row!;
                                            return (
                                                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid var(--b1)", fontSize: 12, color: r.dim ? "var(--t4)" : "var(--t2)" }}>
                                                    <span>{r.label}</span>
                                                    <span style={{ fontWeight: 600, direction: "ltr", color: r.red ? "var(--red)" : "inherit" }}>
                                                        {fmtMoney(r.value as number)} دج
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    {/* Total TTC */}
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg2)", fontSize: 14, fontWeight: 800 }}>
                                        <span style={{ color: "var(--t1)" }}>الإجمالي TTC</span>
                                        <span style={{ direction: "ltr", color: "var(--em)" }}>{fmtMoney(d.total_ttc as number)} دج</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — DataTable v10.1
// ════════════════════════════════════════════════════════════════════════════

export default function CommercialDocumentsPage() {
    const { typeCode }                       = useParams<{ typeCode: string }>();
    const qc                                 = useQueryClient();
    const slug                               = useActiveSlug();
    const { selectedYear, isReadOnly }       = useFiscalYear() as { selectedYear?: { id: number; name: string }; isReadOnly?: boolean };
    const { show: showToast, ToastContainer } = useToast();

    // ── Modal state ───────────────────────────────────────────────────────────
    type ModalMode = "add" | "edit" | "view" | "quick" | null;
    const [modal, setModal]           = useState<ModalMode>(null);
    const [viewDocId, setViewDocId]   = useState<number | null>(null);
    const [editDocFull, setEditDocFull] = useState<CommercialDocument | null>(null);
    const [loadingEdit, setLoadingEdit] = useState(false);

    // ── Server-side state ─────────────────────────────────────────────────────
    const [page, setPage]               = useState(1);
    const [perPage, setPerPage]         = useState(15);
    const [serverFilters, setServerFilters] = useState<Record<string, string>>({});
    const [multiSort, setMultiSort]     = useState<MultiSortState>([]);

    const isPurch   = PURCHASE_CODES.has(typeCode ?? "");
    const isSalable = SALE_CODES.has(typeCode ?? "");
    const opColor   = isPurch ? "var(--purple)" : "var(--em)";

    // ── Column State Persistence — مفتاح واحد يحفظ: ترتيب + عرض + مخفي + مثبت + فلاتر ──
    const COL_STATE_KEY = `cdp-cols-state-${typeCode}-${slug ?? "default"}`;
    const { save: saveColState, reset: resetColState, initialSnapshot } = useColumnStatePersistence(COL_STATE_KEY);

    // columnOrder: يُقرأ من الـ snapshot المحفوظة
    const [columnOrder, setColumnOrder] = useState<string[] | undefined>(
        () => initialSnapshot?.columnOrder,
    );

    const handleColumnOrderChange = useCallback((order: string[]) => {
        setColumnOrder(order);
        saveColState({ columnOrder: order });
    }, [saveColState]);

    // ── Sort → server param ───────────────────────────────────────────────────
    const sortParam = useMemo(() => {
        if (!multiSort.length) return "-document_date";
        return multiSort.map(s => `${s.dir === "desc" ? "-" : ""}${s.key}`).join(",");
    }, [multiSort]);

    // ── Filter change ─────────────────────────────────────────────────────────
    const handleFilterChange = useCallback((filters: Record<string, string>) => {
        const converted: Record<string, string> = {};
        const rangeFields = new Set(["document_date","due_date","total_ht","total_tva","total_ttc","net_to_pay"]);
        for (const [key, val] of Object.entries(filters)) {
            if (!val || val === "|") continue;
            converted[key] = rangeFields.has(key) && val.includes("|") ? val.replace("|", ",") : val;
        }
        setServerFilters(converted);
        setPage(1);
        // حفظ الفلاتر في snapshot الموحد
        saveColState({ activeFilters: converted });
    }, [saveColState]);

    const invalidateDocs = useCallback(() => {
        if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }, [qc, slug]);

    // ── Fetch document type ───────────────────────────────────────────────────
    const { data: docType } = useQuery<DocumentType | null>({
        queryKey: [slug, "document-type-by-code", typeCode],
        queryFn: () =>
            apiGet<{ data?: DocumentType[] }>("/document-types", { per_page: 500 }).then(res => {
                const list = Array.isArray(res) ? (res as DocumentType[]) : (((res as Record<string,unknown>).data as DocumentType[]) ?? []);
                return list.find(dt => dt.code === typeCode) ?? null;
            }),
        enabled: !!slug && !!typeCode,
        staleTime: 10 * 60_000,
    });

    // ── Fetch documents ───────────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        // نبني الـ params بدون أي مفتاح قيمته undefined أو null
        // لأن بعض HTTP clients تُرسلها كـ "undefined" string → Backend يُرجع []
        const params: Record<string, unknown> = {
            include: "party,documentStatus,warehouse",
            sort: sortParam,
            per_page: perPage,
            page,
        };

        // نُضيف filter[document_type_id] فقط إذا كانت القيمة موجودة
        if (docType?.id != null)       params["filter[document_type_id]"] = docType.id;
        if (selectedYear?.id != null)  params["filter[fiscal_year_id]"]   = selectedYear.id;

        const filterMap: Record<string, string> = {
            search:                   "filter[search]",
            "party.name":             "filter[party.name]",
            "warehouse.name":         "filter[warehouse.name]",
            "document_status.name":   "filter[document_status.name]",
            document_date:            "filter[document_date]",
            due_date:                 "filter[due_date]",
            total_ht:                 "filter[total_ht]",
            total_tva:                "filter[total_tva]",
            total_ttc:                "filter[total_ttc]",
            net_to_pay:               "filter[net_to_pay]",
        };
        for (const [fk, pk] of Object.entries(filterMap)) {
            if (serverFilters[fk]) params[pk] = serverFilters[fk];
        }
        return params;
    }, [docType?.id, selectedYear?.id, serverFilters, sortParam, perPage, page]);

    const { data: docsRaw, isLoading, isFetching } = useQuery({
        queryKey: tenantKeys.documents.byType(slug ?? "", typeCode ?? "", queryParams),
        queryFn: () => {
            // TODO: احذف هذا الـ log بعد حل المشكلة
            if (process.env.NODE_ENV === "development") {
                console.debug("[CommercialDocumentsPage] sending params:", queryParams);
            }
            return apiGet<{ data: CommercialDocument[]; meta: Record<string, number> }>("/documents", queryParams);
        },
        enabled: !!slug && !!typeCode && !!selectedYear?.id && !!docType?.id,
        placeholderData: keepPreviousData,
        staleTime: 2 * 60_000,
    });

    const items = useMemo((): CommercialDocument[] => {
        if (!docsRaw) return [];
        if (Array.isArray(docsRaw)) return docsRaw as CommercialDocument[];
        const raw = docsRaw as unknown as Record<string, unknown>;
        // بنية مباشرة: { data: [...], meta: {...} }
        if (Array.isArray(raw.data)) return raw.data as CommercialDocument[];
        // بنية مُغلَّفة: { data: { data: [...], meta: {...} } }
        const nested = raw.data as Record<string, unknown> | undefined;
        if (nested && Array.isArray(nested.data)) return nested.data as CommercialDocument[];
        return [];
    }, [docsRaw]);

    // ── استخراج meta مع دعم كل بنى Laravel ──────────────────────────────────
    // Laravel يُرجع pagination في:
    //   • { data: [...], meta: { current_page, last_page, total, per_page } }  ← JsonResource::collection
    //   • { data: { data: [...], meta: {...} } }                                ← لو apiGet يُغلّف
    //   • { data: [...], current_page, last_page, total }                       ← paginator مباشر
    const meta = useMemo(() => {
        if (!docsRaw || Array.isArray(docsRaw)) return { total: 0, last_page: 1, current_page: 1, per_page: perPage };

        const raw    = docsRaw as unknown as Record<string, unknown>;
        // الأكثر شيوعاً: meta object على المستوى الأول
        const m      = (raw.meta ?? (raw.data as Record<string, unknown> | undefined)?.meta) as Record<string, number> | undefined;

        if (m && (m.total != null || m.last_page != null)) {
            return {
                total:        Number(m.total        ?? 0),
                last_page:    Number(m.last_page    ?? 1),
                current_page: Number(m.current_page ?? 1),
                per_page:     Number(m.per_page     ?? perPage),
            };
        }

        // fallback: pagination مباشرة على الـ root object (بعض الإعدادات)
        if (raw.total != null || raw.last_page != null) {
            return {
                total:        Number(raw.total        ?? 0),
                last_page:    Number(raw.last_page    ?? 1),
                current_page: Number(raw.current_page ?? 1),
                per_page:     Number(raw.per_page     ?? perPage),
            };
        }

        return { total: 0, last_page: 1, current_page: 1, per_page: perPage };
    }, [docsRaw, perPage]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const validateMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/validate`),
        onSuccess: () => { showToast("تم الاعتماد بنجاح"); invalidateDocs(); },
        onError:   () => showToast("فشل الاعتماد", "error"),
    });
    const lockMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/lock`),
        onSuccess: () => { showToast("تم قفل المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل القفل", "error"),
    });
    const cancelMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/cancel`),
        onSuccess: () => { showToast("تم إلغاء المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل الإلغاء", "error"),
    });
    const deleteMut = useMutation({
        mutationFn: (id: number) => apiDelete(`/documents/${id}`),
        onSuccess: () => { showToast("تم الحذف بنجاح"); invalidateDocs(); },
        onError:   () => showToast("فشل الحذف", "error"),
    });

    // ── Edit modal ────────────────────────────────────────────────────────────
    const openEditModal = useCallback(async (doc: CommercialDocument) => {
        setLoadingEdit(true);
        try {
            const res  = await apiGet<CommercialDocument>(`/documents/${doc.id}`, {
                include: ["party","warehouse","documentType","fiscalYear","lines.product","lines.productVariant","payments.paymentMode"].join(","),
            });
            const full = ((res as unknown as Record<string,unknown>).data as CommercialDocument) ?? res;
            setEditDocFull(full);
            setModal("edit");
        } catch {
            showToast("فشل تحميل بيانات المستند", "error");
        } finally {
            setLoadingEdit(false);
        }
    }, [showToast]);

    const closeModal = useCallback(() => { setModal(null); setViewDocId(null); setEditDocFull(null); }, []);

    const handleMultiSortChange = useCallback((sorts: MultiSortState) => {
        setMultiSort(sorts);
        setPage(1);
    }, []);

    // ════════════════════════════════════════════════════════════════════════
    // COLUMN DEFINITIONS
    // ════════════════════════════════════════════════════════════════════════

    const allColumns = useMemo((): Column<CommercialDocument>[] => [
        {
            key: "document_number",
            header: "رقم المستند",
            exportHeader: "رقم المستند",
            sticky: "start",
            width: 145,
            sortable: true,
            filter: { type: "text" },
            searchable: true,
            disablePin: true,          // لا نسمح بـ pin مرة ثانية — هو sticky بالفعل
            accessor: r => String(r.document_number ?? r.id),
            render: row => (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {row.is_locked && <i className="ti ti-lock" style={{ fontSize: 10, color: "var(--t4)" }} aria-label="مقفل" />}
                    <span style={{ fontWeight: 800, color: opColor, fontSize: 12, fontFamily: "monospace", letterSpacing: "-.3px" }}>
                        {String(row.document_number ?? `#${row.id}`)}
                    </span>
                </div>
            ),
        },
        {
            key: "document_date",
            header: "التاريخ",
            exportHeader: "التاريخ",
            width: 110,
            sortable: true,
            filter: { type: "date" },
            accessor: r => r.document_date,
            render: row => <span style={{ fontSize: 12, color: "var(--t3)" }}>{fmtDate(row.document_date)}</span>,
        },
        {
            key: "party.name",
            header: isPurch ? "المورد" : "الزبون",
            exportHeader: isPurch ? "المورد" : "الزبون",
            sortable: true,
            searchable: true,
            filter: { type: "dynamic-multiselect" },
            accessor: r => getPartyName(r),
            render: row => {
                const name = getPartyName(row);
                return name ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: `color-mix(in srgb, ${opColor} 14%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: opColor }}>
                            {name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--t1)", fontSize: 13 }}>{name}</span>
                    </div>
                ) : (
                    <span style={{ color: "var(--t4)", fontStyle: "italic", fontSize: 12 }}>نقدي</span>
                );
            },
        },
        {
            key: "warehouse.name",
            header: "المستودع",
            exportHeader: "المستودع",
            sortable: false,
            hideOnMobile: true,
            filter: { type: "dynamic-multiselect" },
            accessor: r => getWarehouseName(r),
            render: row => <span style={{ fontSize: 12, color: "var(--t3)" }}>{getWarehouseName(row) || "—"}</span>,
        },
        {
            key: "document_status.name",
            header: "الحالة",
            exportHeader: "الحالة",
            width: 135,
            sortable: true,
            filter: {
                type: "select",
                options: Object.entries(STATUS_CFG).map(([v, c]) => ({ value: v, label: c.label })),
            },
            accessor: r => getDocStatus(r),
            render: row => <StatusBadge status={getDocStatus(row)} />,
        },
        {
            key: "total_ht",
            header: "إجمالي HT",
            exportHeader: "إجمالي HT (دج)",
            width: 130,
            align: "end",
            sortable: true,
            hideOnMobile: true,
            filter: { type: "number" },
            accessor: r => Number(r.total_ht ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => <MoneyCell value={row.total_ht} />,
        },
        {
            key: "total_tva",
            header: "TVA",
            exportHeader: "TVA (دج)",
            width: 110,
            align: "end",
            sortable: true,
            defaultHidden: true,          // مخفي افتراضياً
            filter: { type: "number" },
            accessor: r => Number(r.total_tva ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => <MoneyCell value={row.total_tva} />,
        },
        {
            key: "total_ttc",
            header: "الإجمالي TTC",
            exportHeader: "الإجمالي TTC (دج)",
            width: 145,
            align: "end",
            sortable: true,
            filter: { type: "number" },
            accessor: r => Number(r.total_ttc ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => <MoneyCell value={row.total_ttc} bold />,
        },
        {
            key: "net_to_pay",
            header: "المستحق",
            exportHeader: "المستحق (دج)",
            width: 145,
            align: "end",
            sortable: true,
            hideOnMobile: true,
            filter: { type: "number" },
            accessor: r => Number((r as unknown as Record<string,unknown>).net_to_pay ?? r.total_ttc ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => {
                const ntp = Number((row as unknown as Record<string,unknown>).net_to_pay ?? row.total_ttc ?? 0);
                const rem = Number((row as unknown as Record<string,unknown>).remaining_amount ?? 0);
                const paid = ntp > 0 && rem <= 0.001;
                return <MoneyCell value={ntp} bold accent={paid ? "var(--em)" : rem > 0 ? "var(--red)" : "var(--t2)"} />;
            },
        },
        {
            key: "due_date",
            header: "الاستحقاق",
            exportHeader: "تاريخ الاستحقاق",
            width: 110,
            sortable: true,
            defaultHidden: true,          // مخفي افتراضياً
            filter: { type: "date" },
            accessor: r => r.due_date ?? "",
            render: row => {
                if (!row.due_date) return <span style={{ color: "var(--t4)" }}>—</span>;
                const overdue = new Date(row.due_date) < new Date();
                const status  = getDocStatus(row);
                const isLate  = overdue && status !== "paid" && status !== "cancelled";
                return (
                    <span style={{ fontSize: 12, fontWeight: isLate ? 700 : 400, color: isLate ? "var(--red)" : "var(--t3)", display: "flex", alignItems: "center", gap: 4 }}>
                        {isLate && <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} aria-label="متأخر" />}
                        {fmtDate(row.due_date)}
                    </span>
                );
            },
        },
    ], [isPurch, opColor]);

    // ✅ useColumnVisibility:
    //    — يدمج defaultHidden (من تعريف الأعمدة) مع hiddenColumns المحفوظة في snapshot
    //    — إذا لا يوجد snapshot → يُطبق defaultHidden فقط
    //    — إذا يوجد snapshot → يستخدمه كاملاً (يشمل ما حفظه المستخدم بما في ذلك
    //      الأعمدة ذات defaultHidden التي أظهرها أو أخفاها يدوياً)
    const defaultHiddenKeys = useMemo(
        () => allColumns.filter(c => c.defaultHidden).map(c => c.key),
        [allColumns],
    );
    const initialHiddenKeys = initialSnapshot?.hiddenColumns ?? defaultHiddenKeys;

    const {
        visibleColumns: columns,
        hiddenColumns,
        toggleColumn: toggleColumnBase,
    } = useColumnVisibility(
        allColumns,
        initialHiddenKeys,
        null,   // لا مفتاح localStorage مستقل — الحفظ عبر useColumnStatePersistence
    );

    // نُغلّف toggleColumn لنحفظ التغيير في snapshot الموحد
    const toggleColumn = useCallback((key: string) => {
        toggleColumnBase(key);
        setTimeout(() => {
            const newHidden = allColumns
                .filter(c => hiddenColumns.has(c.key) ? c.key !== key : c.key === key)
                .map(c => c.key);
            saveColState({ hiddenColumns: newHidden });
        }, 0);
    }, [toggleColumnBase, hiddenColumns, allColumns, saveColState]);

    // ════════════════════════════════════════════════════════════════════════
    // CONDITIONAL FORMATTING
    // ════════════════════════════════════════════════════════════════════════

    const conditionalFormatting = useMemo<ConditionalFormat<CommercialDocument>[]>(() => [
        {
            colKey: "*",
            condition: (_value, row) => {
                const status  = getDocStatus(row);
                const dueDate = row.due_date;
                return !!(dueDate && new Date(dueDate) < new Date() && status !== "paid" && status !== "cancelled");
            },
            className: "cdp-row-overdue",
            style: { background: "color-mix(in srgb, var(--red) 6%, var(--bg1))" },
        },
        {
            colKey: "net_to_pay",
            condition: (_value, row) => {
                const rem = Number((row as unknown as Record<string, unknown>).remaining_amount ?? 0);
                return rem > 0 && rem < (row.total_ttc ?? 0);
            },
            style: { fontWeight: 700 },
        },
        {
            // تلوين خفيف للمستندات المسودة
            colKey: "*",
            condition: (_value, row) => getDocStatus(row) === "draft",
            style: { opacity: 0.85 },
        },
    ], []);

    // ════════════════════════════════════════════════════════════════════════
    // CONTEXT MENU ITEMS — يستخدم ctx.row المُصلح في v10.1
    // ════════════════════════════════════════════════════════════════════════

    const contextMenuItems = useCallback((ctx: ContextMenuContext): ContextMenuItem[] => {
        const menuItems: ContextMenuItem[] = [];

        if (ctx.type === "cell") {
            // ✅ ctx.row مُملوء الآن بـ useContextMenu v10.1
            const row    = ctx.row as CommercialDocument | undefined;
            const colKey = ctx.colKey;
            const value  = row && colKey ? (row as unknown as Record<string, unknown>)[colKey] : undefined;

            menuItems.push(
                {
                    label: "نسخ القيمة",
                    icon: "copy",
                    onClick: () => {
                        const cellEl = document.querySelector(`[data-row-index="${ctx.rowIndex}"][data-col-key="${colKey}"]`);
                        const text   = cellEl?.textContent?.trim() ?? String(value ?? "");
                        if (text) { navigator.clipboard.writeText(text); showToast("تم نسخ القيمة", "info"); }
                    },
                },
                { label: "", divider: true, onClick: () => {} },
                {
                    label: "فلتر بنفس القيمة",
                    icon: "filter",
                    disabled: !colKey || value === undefined,
                    onClick: () => {
                        if (colKey && value !== undefined) {
                            setServerFilters(prev => ({ ...prev, [colKey]: String(value) }));
                            setPage(1);
                            showToast(`تم تطبيق فلتر على: ${colKey}`, "info");
                        }
                    },
                },
                {
                    label: "عرض التفاصيل",
                    icon: "eye",
                    disabled: !row,
                    onClick: () => {
                        if (row) { setViewDocId(row.id); setModal("view"); }
                    },
                },
            );
        }

        if (ctx.type === "row") {
            // ✅ ctx.row مُملوء
            const row = ctx.row as CommercialDocument | undefined;
            const status = row ? getDocStatus(row) : "";

            menuItems.push(
                {
                    label: "نسخ رقم المستند",
                    icon: "copy",
                    disabled: !row?.document_number,
                    onClick: () => {
                        if (row?.document_number) {
                            navigator.clipboard.writeText(String(row.document_number));
                            showToast("تم نسخ رقم المستند", "info");
                        }
                    },
                },
                {
                    label: "عرض التفاصيل",
                    icon: "eye",
                    disabled: !row,
                    onClick: () => { if (row) { setViewDocId(row.id); setModal("view"); } },
                },
            );

            if (!isReadOnly && row && status === "draft") {
                menuItems.push(
                    { label: "", divider: true, onClick: () => {} },
                    {
                        label: "تعديل المستند",
                        icon: "pencil",
                        onClick: () => { if (row) openEditModal(row); },
                    },
                    {
                        label: "اعتماد المستند",
                        icon: "check",
                        onClick: () => {
                            if (row && window.confirm("تأكيد اعتماد هذا المستند؟")) {
                                validateMut.mutate(row.id);
                            }
                        },
                    },
                    {
                        label: "حذف المستند",
                        icon: "trash",
                        onClick: () => {
                            if (row && !row.is_locked && window.confirm("تأكيد حذف هذا المستند؟")) {
                                deleteMut.mutate(row.id);
                            }
                        },
                    },
                );
            }

            if (!isReadOnly && row && !["cancelled","returned","draft"].includes(status)) {
                menuItems.push(
                    { label: "", divider: true, onClick: () => {} },
                    {
                        label: "إلغاء المستند",
                        icon: "ban",
                        onClick: () => {
                            if (row && window.confirm("تأكيد إلغاء هذا المستند؟")) {
                                cancelMut.mutate(row.id);
                            }
                        },
                    },
                );
            }
        }

        if (ctx.type === "header") {
            const colKey = ctx.colKey;
            const isHidden = colKey ? hiddenColumns.has(colKey) : false;
            menuItems.push(
                {
                    label: isHidden ? "إظهار العمود" : "إخفاء العمود",
                    icon: isHidden ? "eye" : "eye-off",
                    disabled: !colKey,
                    onClick: () => {
                        if (colKey) {
                            toggleColumn(colKey);
                            showToast(isHidden ? `تم إظهار العمود` : `تم إخفاء العمود`, "info");
                        }
                    },
                },
            );
        }

        return menuItems;
    }, [hiddenColumns, toggleColumn, isReadOnly, openEditModal, validateMut, deleteMut, cancelMut, showToast]);

    // ════════════════════════════════════════════════════════════════════════
    // SMART FILTER CALLBACK
    // ════════════════════════════════════════════════════════════════════════

    const handleSmartFilterApply = useCallback((query: string, result: { success: boolean; filters: Record<string, string> }) => {
        if (result.success && Object.keys(result.filters).length > 0) {
            setServerFilters(prev => ({ ...prev, ...result.filters }));
            setPage(1);
            const count = Object.keys(result.filters).length;
            showToast(`✓ ${count} فلتر من: "${query}"`, "success");
        } else if (result.success) {
            // تطابق نمط بدون فلاتر (مثل sort فقط)
            showToast(`✓ فُرِّز حسب: "${query}"`, "info");
        } else {
            showToast(`لم يُتعرف على: "${query}"`, "info");
        }
    }, [showToast]);

    // ════════════════════════════════════════════════════════════════════════
    // ROW ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    const rowActions = useCallback((row: CommercialDocument) => {
        const status   = getDocStatus(row);
        const canEdit  = !isReadOnly && !row.is_locked && status === "draft";
        const canValid = !isReadOnly && !row.is_locked && status === "draft";
        const canLock  = !isReadOnly && !row.is_locked && !!( row as unknown as Record<string,unknown>).validated_at;
        const canCancel = !isReadOnly && !["cancelled","returned"].includes(status);
        const canDelete = !isReadOnly && !row.is_locked && status === "draft";

        return (
            <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                <ActionBtn icon="ti-eye"   title="عرض"    onClick={() => { setViewDocId(row.id); setModal("view"); }} />
                {canEdit  && <ActionBtn icon={loadingEdit ? "ti-loader-2" : "ti-pencil"} title="تعديل"  color="var(--blue)"   disabled={loadingEdit}         onClick={() => openEditModal(row)} />}
                {canValid && <ActionBtn icon="ti-check"  title="اعتماد" color="var(--em)"    disabled={validateMut.isPending} onClick={() => { if (window.confirm("تأكيد اعتماد هذا المستند؟")) validateMut.mutate(row.id); }} />}
                {canLock  && <ActionBtn icon="ti-lock"   title="قفل"    color="var(--orange)" disabled={lockMut.isPending}    onClick={() => { if (window.confirm("تأكيد قفل هذا المستند؟")) lockMut.mutate(row.id); }} />}
                {canDelete ? (
                    <ActionBtn icon="ti-trash" title="حذف"   color="var(--red)"   disabled={deleteMut.isPending}  onClick={() => { if (window.confirm("تأكيد حذف هذا المستند؟")) deleteMut.mutate(row.id); }} />
                ) : canCancel ? (
                    <ActionBtn icon="ti-ban"   title="إلغاء" color="var(--red)"   disabled={cancelMut.isPending}  onClick={() => { if (window.confirm("تأكيد إلغاء هذا المستند؟")) cancelMut.mutate(row.id); }} />
                ) : null}
            </div>
        );
    }, [isReadOnly, loadingEdit, openEditModal, validateMut, lockMut, deleteMut, cancelMut]);

    // ════════════════════════════════════════════════════════════════════════
    // HEADER ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    const headerActions = useMemo(() => (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {isFetching && !isLoading && (
                <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: 15, color: "var(--t4)", animation: "cdp-spin .8s linear infinite" }} />
            )}
            {isReadOnly && (
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--orange) 12%, transparent)", color: "var(--orange)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-lock" style={{ fontSize: 10 }} aria-hidden="true" />
                    للقراءة فقط
                </span>
            )}
            {/* مؤشر الأعمدة المخفية */}
            {hiddenColumns.size > 0 && (
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-eye-off" style={{ fontSize: 10 }} aria-hidden="true" />
                    {hiddenColumns.size} مخفي
                </span>
            )}
            {/* زر إعادة ضبط layout — يظهر فقط عند وجود snapshot محفوظ */}
            {initialSnapshot && (
                <button
                    title="إعادة ضبط تخطيط الأعمدة (الترتيب، العرض، المخفي، الفلاتر)"
                    onClick={() => {
                        if (window.confirm("إعادة ضبط تخطيط الجدول للإعدادات الافتراضية؟")) {
                            resetColState();
                            window.location.reload();
                        }
                    }}
                    style={{ height: 28, width: 28, borderRadius: 7, border: "1px solid var(--b2)", background: "var(--bg2)", color: "var(--t4)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
                    aria-label="إعادة ضبط تخطيط الجدول"
                >
                    <i className="ti ti-layout-columns" aria-hidden="true" />
                </button>
            )}
            {isSalable && !isReadOnly && (
                <button onClick={() => setModal("quick")} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid color-mix(in srgb, ${opColor} 35%, transparent)`, background: `color-mix(in srgb, ${opColor} 8%, transparent)`, color: opColor, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                    <i className="ti ti-bolt" style={{ fontSize: 14 }} aria-hidden="true" />
                    بيع سريع
                </button>
            )}
            {!isReadOnly && (
                <button onClick={() => setModal("add")} style={{ height: 32, padding: "0 16px", borderRadius: 8, border: "none", background: opColor, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px color-mix(in srgb, ${opColor} 30%, transparent)`, fontFamily: "inherit" }}>
                    <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
                    مستند جديد
                </button>
            )}
        </div>
    ), [isFetching, isLoading, isReadOnly, isSalable, opColor, hiddenColumns.size, initialSnapshot, resetColState]);

    // ── Page title ────────────────────────────────────────────────────────────
    const tableTitle = useMemo(() => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `color-mix(in srgb, ${opColor} 14%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${isPurch ? "ti-shopping-cart" : "ti-file-invoice"}`} style={{ fontSize: 16, color: opColor }} aria-hidden="true" />
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--t1)", lineHeight: 1.2 }}>{docType?.name ?? typeCode}</div>
                {selectedYear && <div style={{ fontSize: 10, color: "var(--t4)", marginTop: 1 }}>{selectedYear.name}</div>}
            </div>
        </div>
    ), [docType?.name, typeCode, isPurch, opColor, selectedYear]);

    // ── Callbacks ─────────────────────────────────────────────────────────────
    const isExpandable  = useCallback((row: CommercialDocument) => { const s = getDocStatus(row); return s !== "draft" && s !== "cancelled"; }, []);
    const renderExpanded = useCallback((row: CommercialDocument) => <ExpandedLines doc={row} />, []);
    const rowClassName = useCallback((row: CommercialDocument): string | undefined => {
        const status = getDocStatus(row);
        // cdp-row-overdue يُطبَّق عبر conditionalFormatting فقط (لا ازدواج)
        if (status === "cancelled") return "cdp-row-cancelled";
        return undefined;
    }, []);

    // ════════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════════

    return (
        <>
            <style>{`
                @keyframes cdp-spin    { to { transform: rotate(360deg); } }
                @keyframes cdp-toast-in {
                    from { transform: translateY(10px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                .cdp-row-cancelled td { opacity: .55; }
                .cdp-row-overdue td:first-child { border-right: 3px solid var(--red) !important; }
            `}</style>

            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0, flex: 1, direction: "rtl", fontFamily: "Tajawal, sans-serif" }}>

                {/* Summary cards */}
                {items.length > 0 && <SummaryCards items={items} opColor={opColor} />}

                {/* DataTable v10.2 — محاطة بـ ErrorBoundary لمنع أي خطأ من إسقاط الصفحة */}
                <div style={{ background: "var(--bg1)", border: "1px solid var(--b1)", borderRadius: "var(--r3)", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)", flex: 1 }}>
                    <DataTableErrorBoundary>
                    <DataTable<CommercialDocument>
                        data={items}
                        columns={columns}                           // ← visibleColumns من useColumnVisibility
                        rowKey={r => r.id}
                        loading={isLoading}

                        // ── Reorder + Sort + URL ────────────────────────
                        columnReorder={true}
                        initialColumnOrder={columnOrder}
                        onColumnOrderChange={handleColumnOrderChange}
                        multiSort={true}
                        onMultiSortChange={handleMultiSortChange}
                        urlState={{
                            enabled: true,
                            prefix: `commercial_${typeCode}`,
                            filters: true, sort: true, page: true, search: true,
                        }}

                        // ── Virtual scroll: فقط عند تعطيل pagination وتحميل كمية كبيرة ──
                        virtual={items.length > 100 ? { rowHeight: 40, containerHeight: 600, overscan: 8 } : undefined}

                        // ── تنسيق شرطي ─────────────────────────────────
                        conditionalFormatting={conditionalFormatting}

                        // ── لوحة المفاتيح ✅ مُفعَّل الآن مع RTL fix ──
                        keyboardNav={true}

                        // ── Batch edit: معطل (no-server-side mutations) ─
                        batchEdit={false}

                        // ── Column pinning ─────────────────────────────
                        pinnedColumns={{ start: ["document_number"] }}

                        // ── Pagination server-side ─────────────────────
                        pagination={{
                            page: Number(meta.current_page ?? 1),
                            perPage,
                            total:    Number(meta.total    ?? 0),
                            lastPage: Number(meta.last_page ?? 1),
                            onPage:    setPage,
                            onPerPage: n => { setPerPage(n); setPage(1); },
                        }}
                        onFilterChange={handleFilterChange}
                        onSearchChange={q => {
                            setServerFilters(prev => { const n = { ...prev }; q ? (n.search = q) : delete n.search; return n; });
                            setPage(1);
                        }}
                        allData={items as unknown as Record<string, unknown>[]}

                        // ── الميزات الأساسية ────────────────────────────
                        searchable
                        searchPlaceholder="بحث برقم المستند أو اسم المتعامل…"
                        showAggregates
                        aggregateLabel="إجمالي الصفحة"
                        expandable
                        renderExpanded={renderExpanded}
                        isExpandable={isExpandable}
                        rowActions={rowActions}
                        headerActions={headerActions}
                        title={tableTitle}
                        exportable
                        exportName={`${typeCode}_${selectedYear?.name ?? ""}`}
                        onRowClick={row => { setViewDocId(row.id); setModal("view"); }}
                        rowClassName={rowClassName}
                        emptyText={
                            !selectedYear  ? "الرجاء اختيار سنة مالية" :
                            !docType       ? "جارٍ تحميل نوع المستند…" :
                                            "لا توجد مستندات"
                        }

                        // ── 🆕 Excel Export ─────────────────────────────
                        enableExcelExport={true}
                        excelExportOptions={{
                            fileName: `${typeCode}_${selectedYear?.name ?? ""}_export`,
                            includeAggregates:    true,
                            includeHiddenColumns: false,
                            title: docType?.name ?? typeCode,
                        }}

                        // ── 🆕 Smart Filter عربي — مع أنماط ERP الجزائري ──
                        enableSmartFilter={true}
                        smartFilterPatterns={ERP_FILTER_PATTERNS}
                        onSmartFilterApply={handleSmartFilterApply}

                        // ── 🆕 Saved Views ──────────────────────────────
                        enableSavedViews={true}
                        savedViewsConfig={{
                            tableKey: `commercial_${typeCode}_${slug ?? "default"}`,
                            maxViews: 10,
                        }}

                        // ── 🆕 Context Menu — يستخدم ctx.row المُصلح ────
                        enableContextMenu={true}
                        contextMenuItems={contextMenuItems}
                    />
                    </DataTableErrorBoundary>
                </div>
            </div>

            {/* ── Modals ───────────────────────────────────────────────────── */}
            {(modal === "add" || modal === "edit") && (
                <CommercialDocumentModal
                    open
                    documentType={docType ?? null}
                    existingDocument={modal === "edit" ? (editDocFull ?? undefined) : undefined}
                    onClose={closeModal}
                    onSaved={() => {
                        closeModal();
                        invalidateDocs();
                        showToast(modal === "add" ? "تم إنشاء المستند بنجاح" : "تم تحديث المستند بنجاح");
                    }}
                />
            )}

            {modal === "quick" && (
                <QuickSaleModal
                    open
                    onClose={closeModal}
                    onSaved={(state: Record<string, unknown>) => {
                        closeModal();
                        invalidateDocs();
                        showToast(`تم إنشاء ${String(state.document_number ?? "المستند")} بنجاح`);
                    }}
                />
            )}

            {modal === "view" && viewDocId != null && (
                <DocumentViewModal
                    docId={viewDocId}
                    docType={docType ?? null}
                    onClose={closeModal}
                    onEdit={() => {
                        const doc = items.find(d => d.id === viewDocId);
                        if (doc) { closeModal(); openEditModal(doc); }
                    }}
                    isReadOnly={!!isReadOnly}
                />
            )}

            <ToastContainer />
        </>
    );
}
```

## FILE: resources/js/pages/documents/components/DocumentLineRow.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/DocumentLineRow.tsx
//
// صف واحد من جدول الأسطر.
// يستقبل البيانات ويستدعي callbacks — لا يمتلك حالة إلا ما يخص UI فقط.
// ════════════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { calcLineTotal, fmtDZD, toNum } from '../utils/document.utils';
import { ProductSearch } from './ProductSearch';
import { cellStyle } from './DocumentUIPrimitives';
import type { LineItem, Product, ColKey, LineStockValidation } from '../types/document.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentLineRowProps {
  line:           LineItem;
  idx:            number;
  visibleCols:    Set<ColKey>;
  isPurchase:     boolean;
  disabled:       boolean;
  products:       Product[];
  stockData:      Record<number, number>;
  stockValidation: LineStockValidation;
  onUpdate:       (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  onRemove:       (idx: number) => void;
  onDuplicate:    (idx: number) => void;
}

// ─── Shared cell input style ──────────────────────────────────────────────────

function CellInput({
  value, onChange, type = 'number', min, step, disabled, highlight, width,
}: {
  value:      number | string;
  onChange:   (v: string) => void;
  type?:      string;
  min?:       number;
  step?:      number;
  disabled?:  boolean;
  highlight?: boolean;
  width?:     number;
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...cellStyle(highlight), width: width ?? '100%' }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DocumentLineRow = memo(function DocumentLineRow({
  line, idx, visibleCols, isPurchase, disabled, products, stockData,
  stockValidation, onUpdate, onRemove, onDuplicate,
}: DocumentLineRowProps) {

  const { gross, discountAmt, discPct, ht, tva: lineTva, ttc } = calcLineTotal(line);

  const prod      = line._product;
  const packagings = prod?.packagings ?? [];
  const lots      = prod?.has_lots
    ? (prod?.lots ?? []).filter((lt) => lt.remaining_quantity > 0)
    : [];

  const hasStockWarning = !stockValidation.ok;
  const rowBg = hasStockWarning
    ? `color-mix(in srgb, ${stockValidation.blocking ? 'var(--red)' : 'var(--orange)'} 5%, transparent)`
    : undefined;

  const col = (key: ColKey) => visibleCols.has(key);

  return (
    <>
      <tr style={{
        borderBottom: '1px solid var(--b1)',
        background:   rowBg,
        transition:   'background .15s',
      }}>
        {/* # */}
        {col('idx') && (
          <td style={{ padding: '4px 6px', textAlign: 'center',
            color: 'var(--t4)', fontSize: 11 }}>
            {idx + 1}
          </td>
        )}

        {/* المنتج */}
        {col('product') && (
          <td style={{ padding: '3px 4px' }}>
            <ProductSearch
              products={products}
              value={line.product_id}
              onChange={(id, p) => onUpdate(idx, { product_id: id }, p)}
              disabled={disabled}
              error={!line.product_id}
              isPurchase={isPurchase}
              stockData={stockData}
            />
          </td>
        )}

        {/* التعبئة */}
        {col('packaging') && (
          <td style={{ padding: '3px 4px' }}>
            {packagings.length > 0 ? (
              <select
                style={{ ...cellStyle(), cursor: 'pointer' }}
                value={line.packaging_id}
                disabled={disabled}
                onChange={(e) => onUpdate(idx, { packaging_id: e.target.value })}
              >
                <option value="">— —</option>
                {packagings.map((pk) => (
                  <option key={pk.id} value={String(pk.id)}>
                    {pk.label} ({pk.quantity})
                    {pk.is_default ? ' ★' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--t4)', padding: '0 6px' }}>—</span>
            )}
          </td>
        )}

        {/* الكثير */}
        {col('lot') && (
          <td style={{ padding: '3px 4px' }}>
            {prod?.has_lots ? (
              isPurchase ? (
                <CellInput
                  type="text"
                  value={line.lot_number_new ?? ''}
                  onChange={(v) => onUpdate(idx, { lot_number_new: v })}
                  disabled={disabled}
                />
              ) : (
                <select
                  style={{ ...cellStyle(), cursor: 'pointer' }}
                  value={line.stock_lot_id}
                  disabled={disabled}
                  onChange={(e) => onUpdate(idx, { stock_lot_id: e.target.value })}
                >
                  <option value="">— اختر —</option>
                  {lots.map((lt) => (
                    <option key={lt.id} value={String(lt.id)}>
                      {lt.lot_number} ({lt.remaining_quantity})
                      {lt.expiration_date ? ` exp:${lt.expiration_date.slice(0, 7)}` : ''}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <span style={{ fontSize: 11, color: 'var(--t4)', padding: '0 6px' }}>—</span>
            )}
          </td>
        )}

        {/* الكمية */}
        {col('quantity') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.quantity}
              min={0.001}
              step={1}
              onChange={(v) => onUpdate(idx, { quantity: toNum(v) })}
              disabled={disabled}
              highlight={hasStockWarning && !stockValidation.blocking}
            />
          </td>
        )}

        {/* الوحدة */}
        {col('unit') && (
          <td style={{ padding: '3px 6px', textAlign: 'center',
            fontSize: 11, color: 'var(--t4)' }}>
            {prod?.unit?.symbol ?? '—'}
          </td>
        )}

        {/* سعر الوحدة HT */}
        {col('unit_price') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.unit_price_ht}
              min={0}
              step={0.01}
              onChange={(v) => onUpdate(idx, { unit_price_ht: toNum(v) })}
              disabled={disabled}
            />
          </td>
        )}

        {/* سعر التعبئة */}
        {col('pack_price') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.price_per_pack}
              min={0}
              step={0.01}
              onChange={(v) => onUpdate(idx, { price_per_pack: toNum(v) })}
              disabled={disabled || line._packQty <= 1}
            />
          </td>
        )}

        {/* السعر الأصلي */}
        {col('orig_price') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t4)' }}>
            {fmtDZD(gross)}
          </td>
        )}

        {/* الخصم */}
        {col('discount') && (
          <td style={{ padding: '3px 4px' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {/* نوع الخصم */}
              <select
                style={{ ...cellStyle(), width: 40, padding: '5px 2px', fontSize: 10 }}
                value={line.discount_mode}
                disabled={disabled}
                onChange={(e) => onUpdate(idx, {
                  discount_mode: e.target.value as 'percent' | 'fixed',
                })}
              >
                <option value="percent">%</option>
                <option value="fixed">دج</option>
              </select>
              {/* قيمة الخصم */}
              <CellInput
                value={line.discount_mode === 'percent'
                  ? line.discount_percentage
                  : line.discount_amount_fixed}
                min={0}
                step={0.01}
                onChange={(v) => onUpdate(idx, line.discount_mode === 'percent'
                  ? { discount_percentage: toNum(v) }
                  : { discount_amount_fixed: toNum(v) })}
                disabled={disabled}
              />
            </div>
          </td>
        )}

        {/* بعد الخصم HT */}
        {col('price_after') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: discountAmt > 0 ? 'var(--em)' : 'var(--t3)' }}>
            {fmtDZD(ht)}
          </td>
        )}

        {/* TVA % */}
        {col('tva') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.tva_rate}
              min={0}
              step={1}
              onChange={(v) => onUpdate(idx, { tva_rate: toNum(v) })}
              disabled={disabled}
              width={60}
            />
          </td>
        )}

        {/* إجمالي HT */}
        {col('total_ht') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t2)' }}>
            {fmtDZD(ht)}
          </td>
        )}

        {/* إجمالي TTC */}
        {col('total_ttc') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>
            {fmtDZD(ttc)}
          </td>
        )}

        {/* ملاحظة السطر */}
        {col('line_note') && (
          <td style={{ padding: '3px 4px' }}>
            <input
              type="text"
              value={line.line_note ?? ''}
              placeholder="ملاحظة..."
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { line_note: e.target.value })}
              style={{ ...cellStyle(), fontSize: 11 }}
            />
          </td>
        )}

        {/* الإجراءات */}
        {col('actions') && (
          <td style={{ padding: '3px 4px', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <button
                onClick={() => onDuplicate(idx)}
                disabled={disabled}
                title="تكرار السطر"
                style={{
                  width: 24, height: 24, borderRadius: 'var(--r1)',
                  border: '1px solid var(--b2)', background: 'var(--bg2)',
                  color: 'var(--t3)', cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="ti ti-copy" style={{ fontSize: 11 }} />
              </button>
              <button
                onClick={() => onRemove(idx)}
                disabled={disabled}
                title="حذف السطر"
                style={{
                  width: 24, height: 24, borderRadius: 'var(--r1)',
                  border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
                  background: 'var(--redb)', color: 'var(--red)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 11 }} />
              </button>
            </div>
          </td>
        )}
      </tr>

      {/* تحذير المخزون — صف فرعي */}
      {hasStockWarning && (
        <tr style={{ background: rowBg }}>
          <td
            colSpan={visibleCols.size}
            style={{ padding: '3px 10px 6px', fontSize: 11,
              color: stockValidation.blocking ? 'var(--red)' : 'var(--orange)' }}
          >
            <i className={`ti ${stockValidation.blocking ? 'ti-alert-circle' : 'ti-alert-triangle'}`}
              style={{ marginLeft: 4 }} />
            {stockValidation.message}
          </td>
        </tr>
      )}
    </>
  );
});
```

## FILE: resources/js/pages/documents/components/DocumentUIPrimitives.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/DocumentUIPrimitives.tsx
//
// مكونات UI بسيطة خالصة — لا حالة تجارية، لا API.
// قابلة للتصدير واستخدامها في أي مكان آخر.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ALL_COLUMNS, STATUS_CONFIG } from '../types/document.types';
import type { ColKey } from '../types/document.types';

// ─── Shared styles ────────────────────────────────────────────────────────────

export const inputStyle = (err?: boolean): React.CSSProperties => ({
  width:           '100%',
  boxSizing:       'border-box',
  padding:         '7px 10px',
  borderRadius:    'var(--r2)',
  border:          `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
  background:      'var(--bg1)',
  color:           'var(--t1)',
  fontSize:        13,
  fontFamily:      'Tajawal, sans-serif',
  outline:         'none',
  transition:      'border-color .15s',
});

export const cellStyle = (highlight?: boolean): React.CSSProperties => ({
  width:        '100%',
  padding:      '5px 6px',
  borderRadius: 'var(--r1)',
  border:       `1px solid ${highlight ? 'var(--em)' : 'var(--b3)'}`,
  background:   highlight ? 'color-mix(in srgb, var(--em) 6%, var(--bg1))' : 'var(--bg1)',
  color:        'var(--t1)',
  fontSize:     12,
  fontFamily:   'Tajawal, sans-serif',
  outline:      'none',
  textAlign:    'center',
});

export const labelStyle: React.CSSProperties = {
  fontSize:        11,
  fontWeight:      700,
  color:           'var(--t3)',
  display:         'block',
  marginBottom:    4,
  textTransform:   'uppercase',
  letterSpacing:   0.4,
};

// ─── Label ────────────────────────────────────────────────────────────────────

export function Label({
  children,
  required,
}: {
  children:  React.ReactNode;
  required?: boolean;
}) {
  return (
    <label style={labelStyle}>
      {children}
      {required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
    </label>
  );
}

// ─── FieldError ───────────────────────────────────────────────────────────────

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>
      {msg}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function Section({
  title, icon, badge, children, collapsible = false,
}: {
  title:        string;
  icon:         string;
  badge?:       React.ReactNode;
  children:     React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           8,
          marginBottom:  open ? 12 : 0,
          paddingBottom: 8,
          borderBottom:  '1px solid var(--b1)',
          cursor:        collapsible ? 'pointer' : 'default',
        }}
        onClick={() => collapsible && setOpen((v) => !v)}
      >
        <i className={`ti ${icon}`} style={{ color: 'var(--em)', fontSize: 15 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--t2)',
          textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
          {title}
        </span>
        {badge}
        {collapsible && (
          <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
            style={{ fontSize: 12, color: 'var(--t4)' }} />
        )}
      </div>
      {open && children}
    </div>
  );
}

// ─── TotalCard ────────────────────────────────────────────────────────────────

export function TotalCard({
  label, value, bg, color, labelColor, large, muted,
}: {
  label:        string;
  value:        string;
  bg?:          string;
  color?:       string;
  labelColor?:  string;
  large?:       boolean;
  muted?:       boolean;
}) {
  return (
    <div style={{ padding: '10px 12px', background: bg ?? 'var(--bg2)',
      borderRadius: 'var(--r2)', opacity: muted ? 0.55 : 1 }}>
      <div style={{ fontSize: 11, color: labelColor ?? 'var(--t3)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: large ? 18 : 14, fontWeight: 700, color: color ?? 'var(--t1)',
        fontVariantNumeric: 'tabular-nums', direction: 'ltr', textAlign: 'right',
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export function Toggle({
  checked, onChange, label, subLabel, disabled,
}: {
  checked:   boolean;
  onChange:  (v: boolean) => void;
  label:     string;
  subLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        10,
        cursor:     disabled ? 'not-allowed' : 'pointer',
        padding:    '8px 12px',
        borderRadius: 'var(--r2)',
        background: checked ? 'color-mix(in srgb, var(--em) 10%, transparent)' : 'var(--bg3)',
        border:     `1px solid ${checked ? 'var(--em)' : 'var(--b2)'}`,
        transition: 'all .18s',
        userSelect: 'none',
        opacity:    disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 36, height: 20, borderRadius: 20, flexShrink: 0,
        background: checked ? 'var(--em)' : 'var(--b3)',
        position: 'relative', transition: 'background .18s',
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3,
          right: checked ? 3 : 'auto',
          left:  checked ? 'auto' : 3,
          transition: 'all .18s',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600,
          color: checked ? 'var(--em)' : 'var(--t2)' }}>
          {label}
        </div>
        {subLabel && (
          <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{subLabel}</div>
        )}
      </div>
    </div>
  );
}

// ─── ComboBox ─────────────────────────────────────────────────────────────────

export interface ComboOption {
  id:          number;
  label:       string;
  sub?:        string;
  badge?:      string;
  badgeColor?: string;
}

interface ComboBoxProps {
  options:      ComboOption[];
  value:        string;
  onChange:     (id: string) => void;
  placeholder:  string;
  disabled?:    boolean;
  error?:       boolean;
  maxH?:        number;
}

export function ComboBox({
  options, value, onChange, placeholder, disabled, error, maxH = 260,
}: ComboBoxProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => String(o.id) === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 80);
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sub ?? '').toLowerCase().includes(q),
    ).slice(0, 80);
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (disabled) return; setOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          ...inputStyle(error),
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer', gap: 6, textAlign: 'right',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', color: selected ? 'var(--t1)' : 'var(--t4)' }}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && !disabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            style={{ color: 'var(--t4)', cursor: 'pointer', flexShrink: 0, fontSize: 11 }}
            title="مسح"
          >✕</span>
        )}
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
          style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          zIndex: 9999, background: 'var(--bg2)', border: '1px solid var(--b2)',
          borderRadius: 'var(--r2)', boxShadow: '0 8px 32px rgba(0,0,0,.22)',
          direction: 'rtl', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid var(--b1)',
            background: 'var(--bg3)' }}>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--t4)', fontSize: 13, pointerEvents: 'none',
              }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث..."
                style={{ ...inputStyle(), paddingRight: 28, fontSize: 12, background: 'var(--bg1)' }}
              />
            </div>
          </div>
          <div style={{ maxHeight: maxH, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>لا توجد نتائج</div>
              : filtered.map((o) => (
                <div
                  key={o.id}
                  onClick={() => { onChange(String(o.id)); setOpen(false); setQuery(''); }}
                  style={{
                    padding: '8px 12px', cursor: 'pointer',
                    background: String(o.id) === value ? 'var(--emb)' : 'transparent',
                    borderBottom: '1px solid var(--b1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}
                  onMouseEnter={(e) => { if (String(o.id) !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
                  onMouseLeave={(e) => { if (String(o.id) !== value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--t1)',
                      fontWeight: String(o.id) === value ? 700 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.label}
                    </div>
                    {o.sub && (
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                        {o.sub}
                      </div>
                    )}
                  </div>
                  {o.badge && (
                    <span style={{
                      padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                      flexShrink: 0, background: o.badgeColor ?? 'var(--bg3)', color: 'var(--t3)',
                    }}>
                      {o.badge}
                    </span>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ColumnManager ────────────────────────────────────────────────────────────

export function ColumnManager({
  visible,
  onChange,
}: {
  visible:  Set<ColKey>;
  onChange: (c: Set<ColKey>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const toggle = (key: ColKey) => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.fixed) return;
    const next = new Set(visible);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange(next);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="إدارة الأعمدة"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 'var(--r2)',
          border: '1px solid var(--b2)', background: 'var(--bg2)',
          color: 'var(--t3)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
        }}
      >
        <i className="ti ti-layout-columns" style={{ fontSize: 13 }} />
        الأعمدة
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          width: 220, background: 'var(--bg2)', border: '1px solid var(--b2)',
          borderRadius: 'var(--r2)', boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          zIndex: 9999, direction: 'rtl', overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px', fontSize: 10.5, fontWeight: 800,
            color: 'var(--t4)', textTransform: 'uppercase',
            borderBottom: '1px solid var(--b1)', background: 'var(--bg3)',
          }}>
            أظهر / أخفِ الأعمدة
          </div>
          {ALL_COLUMNS.filter((c) => !c.fixed).map((col) => (
            <div
              key={col.key}
              onClick={() => toggle(col.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', cursor: 'pointer',
                background: visible.has(col.key) ? 'var(--emb)' : 'transparent',
                borderBottom: '1px solid var(--b1)', transition: 'background .1s',
              }}
              onMouseEnter={(e) => { if (!visible.has(col.key)) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
              onMouseLeave={(e) => { if (!visible.has(col.key)) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <i className={`ti ti-${visible.has(col.key) ? 'eye' : 'eye-off'}`}
                style={{ fontSize: 13, color: visible.has(col.key) ? 'var(--em)' : 'var(--t4)' }} />
              <span style={{ fontSize: 12.5, color: visible.has(col.key) ? 'var(--t1)' : 'var(--t3)' }}>
                {col.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'var(--t4)', bg: 'var(--bg3)' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ─── AlertBanner ──────────────────────────────────────────────────────────────

export function AlertBanner({
  type, message,
}: {
  type:    'error' | 'success' | 'warning' | 'info';
  message: string;
}) {
  const colors = {
    error:   { bg: 'var(--redb)',   border: 'var(--red)',   color: 'var(--red)',   icon: 'ti-alert-circle'    },
    success: { bg: 'var(--greenb)', border: 'var(--green)', color: 'var(--green)', icon: 'ti-check-circle'    },
    warning: { bg: 'var(--goldb)',  border: 'var(--gold)',  color: 'var(--gold)',  icon: 'ti-alert-triangle'  },
    info:    { bg: 'var(--bg3)',    border: 'var(--b2)',    color: 'var(--t3)',    icon: 'ti-info-circle'     },
  };
  const c = colors[type];
  return (
    <div style={{
      padding: '9px 14px', marginBottom: 14,
      borderRadius: 'var(--r2)',
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      fontSize: 12.5, display: 'flex', gap: 7, alignItems: 'flex-start',
    }}>
      <i className={`ti ${c.icon}`} style={{ marginTop: 1 }} />
      <span>{message}</span>
    </div>
  );
}
```

## FILE: resources/js/pages/documents/components/ProductSearch.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/ProductSearch.tsx
//
// ComboBox متخصص للمنتجات: يعرض المخزون، التحذيرات، المرجع، الوحدة.
//
// 🔧 BUGFIX: القائمة المنسدلة كانت تُقطع داخل الجدول بسبب overflow:hidden
//    على عناصر الـ table/tbody/td. الحل: نستخدم ReactDOM.createPortal
//    لتصيير الـ dropdown مباشرةً في document.body، مع position:fixed
//    وحساب الإحداثيات بـ getBoundingClientRect().
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getProductStock } from '../utils/document.utils';
import { cellStyle } from './DocumentUIPrimitives';
import type { Product } from '../types/document.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductSearchProps {
  products:    Product[];
  value:       string;
  onChange:    (productId: string, product: Product | null) => void;
  disabled?:   boolean;
  error?:      boolean;
  isPurchase?: boolean;
  stockData?:  Record<number, number>;
}

// ─── Dropdown position ────────────────────────────────────────────────────────

interface DropdownPos {
  top:   number;
  right: number;   // RTL: نستخدم right بدل left حتى تمتد القائمة من يمين الزر
  width: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductSearch({
  products,
  value,
  onChange,
  disabled,
  error,
  isPurchase  = false,
  stockData   = {},
}: ProductSearchProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [pos,   setPos]   = useState<DropdownPos>({ top: 0, right: 0, width: 320 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const selected = products.find((p) => String(p.id) === value);

  // ─── حساب موضع الـ dropdown بناءً على موضع الزر في الشاشة ─────────────────

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect  = triggerRef.current.getBoundingClientRect();
    const dropW = Math.max(rect.width, 320);

    // حساب المساحة المتاحة — نُقيّد بالـ viewport مع هامش 8px
    const viewportH    = window.innerHeight;
    const spaceBelow   = viewportH - rect.bottom - 8;
    const spaceAbove   = rect.top - 8;
    const maxDropH     = 320;
    const openUpward   = spaceBelow < Math.min(maxDropH, 200) && spaceAbove > spaceBelow;

    // RTL: right = المسافة من يمين الـ viewport إلى يمين الزر
    const rightFromViewport = window.innerWidth - rect.right;

    const top = openUpward
      ? rect.top  - Math.min(maxDropH, spaceAbove) - 3
      : rect.bottom + 3;

    setPos({
      top:   Math.max(top, 8),
      right: Math.max(rightFromViewport, 4),
      width: Math.min(dropW, rect.right - 8),
    });
  }, []);

  // ─── فتح / إغلاق ──────────────────────────────────────────────────────────

  const handleOpen = () => {
    if (disabled) return;
    if (!open) {
      calcPos();
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setOpen(false);
      setQuery('');
    }
  };

  // ─── إغلاق عند النقر خارجاً أو Escape ────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    const handleMouse = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropRef.current    && !dropRef.current.contains(target)
      ) {
        setOpen(false);
        setQuery('');
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };

    // إعادة حساب الموضع عند التمرير أو تغيير الحجم
    const handleReposition = () => calcPos();

    document.addEventListener('mousedown', handleMouse);
    document.addEventListener('keydown',   handleKey);
    window.addEventListener('scroll',  handleReposition, true);
    window.addEventListener('resize',  handleReposition);

    return () => {
      document.removeEventListener('mousedown', handleMouse);
      document.removeEventListener('keydown',   handleKey);
      window.removeEventListener('scroll',  handleReposition, true);
      window.removeEventListener('resize',  handleReposition);
    };
  }, [open, calcPos]);

  // ─── فلترة المنتجات ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const base = query.trim()
      ? products.filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.ref     ?? '').toLowerCase().includes(query.toLowerCase()) ||
          (p.barcode ?? '').toLowerCase().includes(query.toLowerCase()),
        )
      : products;
    return base.slice(0, 60);
  }, [products, query]);

  // ─── اختيار منتج ─────────────────────────────────────────────────────────

  const choose = (p: Product) => {
    onChange(String(p.id), p);
    setOpen(false);
    setQuery('');
  };

  // ─── Badge المخزون ────────────────────────────────────────────────────────

  const stockBadge = (p: Product): { label: string; color: string } | null => {
    if (isPurchase || !p.manages_stock) return null;
    const qty = getProductStock(p, stockData);
    if (qty === Infinity) return null;
    if (qty <= 0)         return { label: 'نفد',          color: 'var(--red)'    };
    if (qty < 5)          return { label: `متاح: ${qty}`, color: 'var(--orange)' };
    return                       { label: `متاح: ${qty}`, color: 'var(--green)'  };
  };

  // ─── Dropdown markup (يُصيَّر في portal) ─────────────────────────────────

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{
        position:     'fixed',
        top:          pos.top,
        right:        pos.right,
        width:        pos.width,
        maxWidth:     420,
        zIndex:       99999,
        background:   'var(--bg2)',
        border:       '1px solid var(--b2)',
        borderRadius: 'var(--r2)',
        boxShadow:    '0 8px 32px rgba(0,0,0,.28)',
        direction:    'rtl',
        overflow:     'hidden',
      }}
    >
      {/* حقل البحث */}
      <div style={{
        padding: '6px 6px 5px', borderBottom: '1px solid var(--b1)',
        background: 'var(--bg3)',
      }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{
            position: 'absolute', right: 7, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--t4)', fontSize: 12,
            pointerEvents: 'none',
          }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الرمز..."
            style={{
              width: '100%', padding: '5px 28px 5px 8px',
              borderRadius: 'var(--r1)', border: '1px solid var(--b2)',
              background: 'var(--bg1)', color: 'var(--t1)',
              fontSize: 12, fontFamily: 'Tajawal, sans-serif',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* النتائج */}
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {filtered.length === 0
          ? (
            <div style={{
              padding: 16, textAlign: 'center',
              color: 'var(--t4)', fontSize: 12,
            }}>
              لا توجد نتائج
            </div>
          )
          : filtered.map((p) => {
              const badge      = stockBadge(p);
              const isSelected = String(p.id) === value;
              return (
                <div
                  key={p.id}
                  onMouseDown={(e) => {
                    // نستخدم onMouseDown بدل onClick لنمنع blur على input البحث
                    e.preventDefault();
                    choose(p);
                  }}
                  style={{
                    padding:      '8px 10px',
                    cursor:       'pointer',
                    background:   isSelected ? 'var(--emb)' : 'transparent',
                    borderBottom: '1px solid var(--b1)',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg3)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {/* معلومات المنتج */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: isSelected ? 700 : 500,
                      color: 'var(--t1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.name}
                    </div>
                    <div style={{
                      fontSize: 10.5, color: 'var(--t4)', marginTop: 1,
                      display: 'flex', gap: 6,
                    }}>
                      {p.ref    && <span>{p.ref}</span>}
                      {p.unit   && <span>{p.unit.symbol}</span>}
                      {p.family && <span>{p.family.name}</span>}
                    </div>
                  </div>

                  {/* Badge المخزون */}
                  {badge && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                      padding: '2px 6px', borderRadius: 99,
                      background: `color-mix(in srgb, ${badge.color} 12%, transparent)`,
                      color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                  )}
                </div>
              );
            })
        }
      </div>
    </div>,
    document.body,
  ) : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* زر الفتح */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        style={{
          ...cellStyle(!!value && !error),
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          cursor:         disabled ? 'not-allowed' : 'pointer',
          gap:            4,
          textAlign:      'right',
          border:         error ? '1px solid var(--red)' : undefined,
          maxWidth:       '100%',
        }}
      >
        <span style={{
          flex:         1,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          color:        selected ? 'var(--t1)' : 'var(--t4)',
          textAlign:    'right',
        }}>
          {selected ? selected.name : '— اختر منتجاً —'}
        </span>
        <i
          className={`ti ti-chevron-${open ? 'up' : 'down'}`}
          style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}
        />
      </button>

      {/* القائمة المنسدلة — مُصيَّرة في document.body عبر portal */}
      {dropdown}
    </div>
  );
}
```

## FILE: resources/js/pages/documents/hooks/useDocumentForm.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocumentForm.ts
//
// Hook مركزي: يحتوي على كل حالة النموذج ومنطق الأعمال.
// المكونات البصرية لا تعرف شيئاً عن الحسابات — تقرأ فقط ما تحتاجه.
//
// 🔧 BUGFIX: أُزيل require() الديناميكي من buildPayload (كان يسبب مشاكل مع
//    bundlers) واستُبدل باستيراد مباشر لـ calcLineTotal من أعلى الملف.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { DocumentType } from '@/lib/api/core/types';
import {
  today,
  resolvePrice,
  resolveQuantityDiscount,
  calcTotals,
  calcLineTotal,
  validateLineStock,
} from '../utils/document.utils';
import {
  PURCHASE_CODES,
  REQUIRES_PARTY,
  STOCK_IN_CODES,
  STOCK_OUT_CODES,
} from '../types/document.types';
import type {
  LineItem,
  DocumentFormState,
  DocumentTotals,
  PaymentEntry,
  Product,
  Packaging,
  LineStockValidation,
} from '../types/document.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormErrors = Record<keyof DocumentFormState | string, string>;

interface UseDocumentFormOptions {
  documentType:       DocumentType | null;
  existingDocument?:  Record<string, unknown>;
  defaultTvaRate:     number;
  defaultWarehouseId: string;
  baseCurrencyId:     string;
  selectedYearId:     string;
  paymentModes:       Array<{ id: number; name: string }>;
  parties:            Array<{ id: number; price_level_id?: number | null }>;
  stockData:          Record<number, number>;
  isPurchase:         boolean;
  open:               boolean;
}

interface UseDocumentFormReturn {
  form:               DocumentFormState;
  errors:             FormErrors;
  lineErr:            string;
  apiErr:             string;
  setApiErr:          (msg: string) => void;
  set:                (k: keyof DocumentFormState, v: unknown) => void;
  handlePartyChange:  (id: string) => void;
  priceLevelId:       number | null;
  // Lines
  addLine:            () => void;
  removeLine:         (idx: number) => void;
  duplicateLine:      (idx: number) => void;
  updateLine:         (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  // Payments
  addPayment:         () => void;
  removePayment:      (idx: number) => void;
  updatePayment:      (idx: number, patch: Partial<PaymentEntry>) => void;
  // Computed
  totals:             DocumentTotals;
  validate:           () => boolean;
  buildPayload:       () => Record<string, unknown>;
  validateLineStock:  (line: LineItem, product: Product) => LineStockValidation;
  // Meta
  docCode:            string;
  isEdit:             boolean;
  needsParty:         boolean;
  affectsStock:       boolean;
  stockDir:           1 | -1 | 0;
}

// ─── Line factory ─────────────────────────────────────────────────────────────

function makeLine(defaultTvaRate: number): LineItem {
  return {
    product_id:            '',
    description:           '',
    quantity:              1,
    unit_price_ht:         0,
    price_per_pack:        0,
    discount_mode:         'percent',
    discount_percentage:   0,
    discount_amount_fixed: 0,
    tva_rate:              defaultTvaRate,
    packaging_id:          '',
    stock_lot_id:          '',
    lot_number_new:        '',
    line_note:             '',
    _packQty:              1,
  };
}

function buildLineFromApi(
  l:              Record<string, unknown>,
  defaultTvaRate: number,
): LineItem {
  const packaging  = (l.packaging as Packaging | null) ?? null;
  const packQty    = packaging ? Number(packaging.quantity) : 1;
  const unitPrice  = parseFloat(String(l.unit_price_ht ?? 0)) || 0;

  return {
    id:                    l.id as number | undefined,
    product_id:            String(l.product_id ?? ''),
    description:           String(l.description ?? ''),
    quantity:              parseFloat(String(l.quantity ?? 1)) || 1,
    unit_price_ht:         unitPrice,
    price_per_pack:        unitPrice * packQty,
    discount_mode:         'percent',
    discount_percentage:   parseFloat(String(l.discount_percentage ?? 0)) || 0,
    discount_amount_fixed: 0,
    tva_rate:              parseFloat(String(l.tva_rate ?? defaultTvaRate)) || defaultTvaRate,
    packaging_id:          packaging ? String(packaging.id) : '',
    stock_lot_id:          l.stock_lot_id ? String(l.stock_lot_id) : '',
    lot_number_new:        '',
    line_note:             String(l.notes ?? ''),
    _product:              l.product as Product | undefined,
    _packQty:              packQty,
  };
}

function buildDefaultForm(
  existingDocument: Record<string, unknown> | undefined,
  defaults:         { warehouseId: string; currencyId: string; yearId: string },
  defaultTvaRate:   number,
): DocumentFormState {
  if (existingDocument) {
    const doc = existingDocument;
    return {
      party_id:       String(doc.party_id       ?? ''),
      document_date:  String(doc.document_date  ?? today()).split('T')[0],
      due_date:       String(doc.due_date        ?? '').split('T')[0],
      notes:          String(doc.notes           ?? ''),
      warehouse_id:   String(doc.warehouse_id   ?? ''),
      fiscal_year_id: String(doc.fiscal_year_id ?? ''),
      currency_id:    String(doc.currency_id    ?? ''),
      exchange_rate:  String(doc.exchange_rate   ?? '1'),
      apply_stamp:    parseFloat(String(doc.total_stamp ?? 0)) > 0,
      price_level_id: String(doc.price_level_id ?? ''),
      lines:          ((doc.lines as Record<string, unknown>[]) ?? []).map(
        (l) => buildLineFromApi(l, defaultTvaRate),
      ),
      payments: [],
    };
  }

  return {
    party_id:       '',
    document_date:  today(),
    due_date:       '',
    notes:          '',
    warehouse_id:   defaults.warehouseId,
    fiscal_year_id: defaults.yearId,
    currency_id:    defaults.currencyId,
    exchange_rate:  '1',
    apply_stamp:    false,
    price_level_id: '',
    lines:          [],
    payments:       [],
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocumentForm({
  documentType,
  existingDocument,
  defaultTvaRate,
  defaultWarehouseId,
  baseCurrencyId,
  selectedYearId,
  paymentModes,
  parties,
  stockData,
  isPurchase,
  open,
}: UseDocumentFormOptions): UseDocumentFormReturn {

  const docCode      = documentType?.code ?? '';
  const isEdit       = !!existingDocument;
  const needsParty   = REQUIRES_PARTY.has(docCode);
  const affectsStock = STOCK_IN_CODES.has(docCode) || STOCK_OUT_CODES.has(docCode);
  const stockDir: 1 | -1 | 0 = STOCK_IN_CODES.has(docCode) ? 1 : STOCK_OUT_CODES.has(docCode) ? -1 : 0;

  // ─── State ─────────────────────────────────────────────────────────────────

  const [form,    setForm]    = useState<DocumentFormState>(() =>
    buildDefaultForm(existingDocument, {
      warehouseId: defaultWarehouseId,
      currencyId:  baseCurrencyId,
      yearId:      selectedYearId,
    }, defaultTvaRate),
  );
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [lineErr, setLineErr] = useState('');
  const [apiErr,  setApiErr]  = useState('');

  // مرجع للـ payload داخل mutationFn (تجنب stale closure)
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // ─── Reset عند الفتح ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setForm(buildDefaultForm(
      existingDocument,
      { warehouseId: defaultWarehouseId, currencyId: baseCurrencyId, yearId: selectedYearId },
      defaultTvaRate,
    ));
    setErrors({});
    setLineErr('');
    setApiErr('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingDocument?.id]);

  // تطبيق القيم الافتراضية بعد تحميل lookups (للإنشاء فقط)
  // هذا الـ effect يعمل عندما تصل البيانات من useDocumentLookups
  // (defaultWarehouseId, baseCurrencyId) بعد تحميل الـ queries.
  useEffect(() => {
    if (isEdit || !open) return;
    setForm((f) => ({
      ...f,
      warehouse_id:   f.warehouse_id   || defaultWarehouseId,
      currency_id:    f.currency_id    || baseCurrencyId,
      fiscal_year_id: f.fiscal_year_id || selectedYearId,
    }));
  }, [defaultWarehouseId, baseCurrencyId, selectedYearId, isEdit, open]);

  // ─── Form field setter ──────────────────────────────────────────────────────

  const set = useCallback((k: keyof DocumentFormState, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }, []);

  const priceLevelId = useMemo(
    () => (form.price_level_id ? parseInt(form.price_level_id) : null),
    [form.price_level_id],
  );

  const handlePartyChange = useCallback((id: string) => {
    set('party_id', id);
    const party = parties.find((p) => String(p.id) === id);
    if (party?.price_level_id) {
      set('price_level_id', String(party.price_level_id));
    }
  }, [parties, set]);

  // ─── Line management ────────────────────────────────────────────────────────

  const updateLine = useCallback((
    idx:      number,
    patch:    Partial<LineItem>,
    product?: Product | null,
  ) => {
    setForm((f) => {
      const lines = [...f.lines];
      let L = { ...lines[idx], ...patch };

      // تغيير المنتج: تحديث السعر، TVA، التعبئة، الكثير
      if (product !== undefined) {
        if (product) {
          L.description = product.name;
          L.tva_rate    = product.tva?.rate ?? defaultTvaRate;

          const defPkg = (product.packagings ?? []).find((pk) => pk.is_default);
          L.packaging_id = defPkg ? String(defPkg.id) : '';
          L._packQty     = defPkg ? Number(defPkg.quantity) : 1;

          const price       = resolvePrice(product, priceLevelId, isPurchase);
          L.unit_price_ht   = price;
          L.price_per_pack  = price * L._packQty;

          // خصم الكميات التلقائي
          const qd = resolveQuantityDiscount(product, L.quantity, priceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode         = 'percent';
            L.discount_percentage   = qd.percentage;
            L.discount_amount_fixed = 0;
          } else if (qd.fixed > 0) {
            L.discount_mode         = 'fixed';
            L.discount_amount_fixed = qd.fixed;
            L.discount_percentage   = 0;
          }

          // الكثير: للبيع نأخذ أول متاح
          if (!isPurchase && product.has_lots) {
            const firstLot = (product.lots ?? []).find((lt) => lt.remaining_quantity > 0);
            L.stock_lot_id = firstLot ? String(firstLot.id) : '';
          } else {
            L.stock_lot_id   = '';
            L.lot_number_new = '';
          }

          L._product = product;
        } else {
          // مسح المنتج
          L._product       = undefined;
          L.packaging_id   = '';
          L._packQty       = 1;
          L.unit_price_ht  = 0;
          L.price_per_pack = 0;
          L.stock_lot_id   = '';
        }
      }

      // تغيير التعبئة: حساب سعر التعبئة
      if (patch.packaging_id !== undefined && product === undefined) {
        const pkg = (L._product?.packagings ?? []).find(
          (pk) => String(pk.id) === patch.packaging_id,
        );
        L._packQty       = pkg ? Number(pkg.quantity) : 1;
        L.price_per_pack = L.unit_price_ht * L._packQty;
      }

      // تغيير سعر الوحدة: تحديث سعر التعبئة
      if (patch.unit_price_ht !== undefined && product === undefined) {
        L.price_per_pack = patch.unit_price_ht * L._packQty;
      }

      // تغيير سعر التعبئة: اشتقاق سعر الوحدة
      if (patch.price_per_pack !== undefined && product === undefined) {
        L.unit_price_ht = L._packQty > 0
          ? patch.price_per_pack / L._packQty
          : patch.price_per_pack;
      }

      // تغيير الكمية: إعادة حساب خصم الكميات (للبيع)
      if (patch.quantity !== undefined && L._product && !isPurchase) {
        const qd = resolveQuantityDiscount(L._product, patch.quantity, priceLevelId);
        if (qd.percentage > 0) {
          L.discount_mode         = 'percent';
          L.discount_percentage   = qd.percentage;
          L.discount_amount_fixed = 0;
        } else if (qd.fixed > 0) {
          L.discount_mode         = 'fixed';
          L.discount_amount_fixed = qd.fixed;
          L.discount_percentage   = 0;
        }
      }

      lines[idx] = L;
      return { ...f, lines };
    });
    setLineErr('');
  }, [defaultTvaRate, isPurchase, priceLevelId]);

  const addLine = useCallback(() => {
    setForm((f) => ({ ...f, lines: [...f.lines, makeLine(defaultTvaRate)] }));
    setLineErr('');
  }, [defaultTvaRate]);

  const removeLine = useCallback((idx: number) => {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }, []);

  const duplicateLine = useCallback((idx: number) => {
    setForm((f) => {
      const lines = [...f.lines];
      lines.splice(idx + 1, 0, { ...lines[idx], id: undefined });
      return { ...f, lines };
    });
  }, []);

  // ─── Payment management ─────────────────────────────────────────────────────

  const addPayment = useCallback(() => {
    setForm((f) => ({
      ...f,
      payments: [
        ...f.payments,
        {
          payment_mode_id: paymentModes[0] ? String(paymentModes[0].id) : '',
          amount:          '',
          reference:       '',
          payment_date:    today(),
        },
      ],
    }));
  }, [paymentModes]);

  const removePayment = useCallback((idx: number) => {
    setForm((f) => ({ ...f, payments: f.payments.filter((_, i) => i !== idx) }));
  }, []);

  const updatePayment = useCallback((idx: number, patch: Partial<PaymentEntry>) => {
    setForm((f) => {
      const payments = [...f.payments];
      payments[idx] = { ...payments[idx], ...patch };
      return { ...f, payments };
    });
  }, []);

  // ─── Totals ─────────────────────────────────────────────────────────────────

  const totals = useMemo(
    () => calcTotals(form.lines, form.apply_stamp, form.payments),
    [form.lines, form.apply_stamp, form.payments],
  );

  // ─── Validation ─────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    if (needsParty && !form.party_id)
      errs.party_id = isPurchase ? 'المورد إلزامي' : 'الزبون إلزامي';
    if (!form.document_date)  errs.document_date  = 'التاريخ إلزامي';
    if (!form.warehouse_id)   errs.warehouse_id   = 'المستودع إلزامي';
    if (!form.fiscal_year_id) errs.fiscal_year_id = 'السنة المالية إلزامية';
    if (!form.currency_id)    errs.currency_id    = 'العملة إلزامية';

    if (form.lines.length === 0) {
      setLineErr('يجب إضافة سطر واحد على الأقل');
      setErrors(errs);
      return false;
    }

    for (let i = 0; i < form.lines.length; i++) {
      const line = form.lines[i];

      if (!line.product_id) {
        setLineErr(`السطر ${i + 1}: المنتج إلزامي`);
        setErrors(errs);
        return false;
      }
      if (line.quantity <= 0) {
        setLineErr(`السطر ${i + 1}: الكمية يجب أن تكون > 0`);
        setErrors(errs);
        return false;
      }
      if (!isPurchase && line.unit_price_ht === 0) {
        setLineErr(`السطر ${i + 1}: السعر إلزامي`);
        setErrors(errs);
        return false;
      }

      if (line._product) {
        const stockResult = validateLineStock(line, line._product, isPurchase, stockData);
        if (!stockResult.ok && stockResult.blocking) {
          setLineErr(`السطر ${i + 1}: ${stockResult.message}`);
          setErrors(errs);
          return false;
        }
      }
    }

    setLineErr('');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, needsParty, isPurchase, stockData]);

  // ─── Payload builder ────────────────────────────────────────────────────────
  // 🔧 calcLineTotal مستورد مباشرة من أعلى الملف — لا حاجة لـ require() الديناميكي.

  const buildPayload = useCallback((): Record<string, unknown> => {
    const f = formRef.current;

    return {
      document_type_id: documentType?.id,
      party_id:         needsParty && f.party_id ? parseInt(f.party_id) : null,
      warehouse_id:     parseInt(f.warehouse_id),
      fiscal_year_id:   parseInt(f.fiscal_year_id),
      currency_id:      parseInt(f.currency_id),
      exchange_rate:    parseFloat(f.exchange_rate) || 1,
      document_date:    f.document_date,
      due_date:         f.due_date || null,
      notes:            f.notes    || null,
      price_level_id:   f.price_level_id ? parseInt(f.price_level_id) : null,
      lines: f.lines.map((line) => {
        const { gross, discountAmt } = calcLineTotal(line);
        const discPct = gross > 0 ? (discountAmt / gross) * 100 : 0;
        return {
          ...(line.id         ? { id: line.id }                               : {}),
          product_id:           parseInt(line.product_id),
          description:          line.description || null,
          quantity:             line.quantity,
          unit_price_ht:        line.unit_price_ht,
          tva_rate:             line.tva_rate,
          discount_percentage:  Math.round(discPct * 10000) / 10000,
          ...(line.packaging_id   ? { packaging_id:   parseInt(line.packaging_id)   } : {}),
          ...(line.stock_lot_id   ? { stock_lot_id:   parseInt(line.stock_lot_id)   } : {}),
          ...(isPurchase && line.lot_number_new ? { lot_number: line.lot_number_new } : {}),
          notes: line.line_note || null,
        };
      }),
      ...(f.payments.length > 0 ? {
        payments: f.payments
          .filter((p) => p.payment_mode_id && parseFloat(p.amount) > 0)
          .map((p) => ({
            payment_mode_id: parseInt(p.payment_mode_id),
            amount:          parseFloat(p.amount),
            reference:       p.reference || null,
            payment_date:    p.payment_date,
          })),
      } : {}),
    };
  }, [documentType?.id, needsParty, isPurchase]);

  // ─── Line stock wrapper ─────────────────────────────────────────────────────

  const validateLineStockFn = useCallback(
    (line: LineItem, product: Product) =>
      validateLineStock(line, product, isPurchase, stockData),
    [isPurchase, stockData],
  );

  return {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, priceLevelId,
    addLine, removeLine, duplicateLine, updateLine,
    addPayment, removePayment, updatePayment,
    totals, validate, buildPayload, validateLineStock: validateLineStockFn,
    docCode, isEdit, needsParty, affectsStock, stockDir,
  };
}
```

## FILE: resources/js/pages/documents/hooks/useDocumentLookups.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocumentLookups.ts
//
// يجمع كل useQuery الخاصة بـ Modal في مكان واحد.
// المكون الرئيسي يستدعيه مرة واحدة ويحصل على كل ما يحتاجه.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { Product, Party, PaymentMode } from '../types/document.types';

// ─── Generic extractor ───────────────────────────────────────────────────────

function extractList(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const d = (data as Record<string, unknown>).data;
    if (Array.isArray(d)) return d;
  }
  return [];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseDocumentLookupsOptions {
  open:       boolean;
  isPurchase: boolean;
  needsParty: boolean;
  warehouseId?: number | null;
  fiscalYearId?: number | null;
}

export function useDocumentLookups({
  open,
  isPurchase,
  needsParty,
  warehouseId,
  fiscalYearId,
}: UseDocumentLookupsOptions) {

  const slug = useActiveSlug();

  // ── Parties ──────────────────────────────────────────────────────────────────
  const { data: partiesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-parties', isPurchase],
    queryFn:   () => apiGet<unknown>(
      isPurchase ? '/suppliers' : '/customers',
      { per_page: 1000, include: 'priceLevel' },
    ).then(extractList),
    enabled:   open && needsParty && !!slug,
    staleTime: 5 * 60_000,
  });
  const parties = partiesRaw as Party[];

  // ── Products ─────────────────────────────────────────────────────────────────
  const { data: productsRaw = [], isLoading: isLoadingProducts } = useQuery({
    queryKey:  [slug, 'modal-products-v2'],
    queryFn:   () => apiGet<unknown>('/products', {
      per_page: 2000,
      include:  'unit,tva,packagings,prices,prices.priceLevel,quantityDiscounts,lots',
      active:   1,
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 3 * 60_000,
  });
  const products = productsRaw as Product[];

  // ── Warehouses ───────────────────────────────────────────────────────────────
  const { data: warehousesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-warehouses'],
    queryFn:   () => apiGet<unknown>('/warehouses', { per_page: 100 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });
  const warehouses = warehousesRaw as Record<string, unknown>[];

  // ── Currencies ───────────────────────────────────────────────────────────────
  const { data: currenciesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-currencies'],
    queryFn:   () => apiGet<unknown>('/currencies', { per_page: 50 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 30 * 60_000,
  });
  const currencies = currenciesRaw as Record<string, unknown>[];

  // ── Fiscal Years ─────────────────────────────────────────────────────────────
  const { data: fiscalYearsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-fiscal-years'],
    queryFn:   () => apiGet<unknown>('/fiscal-years', {
      per_page:           20,
      'filter[is_closed]': 0,
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 5 * 60_000,
  });
  const fiscalYears = fiscalYearsRaw as Record<string, unknown>[];

  // ── Payment modes ────────────────────────────────────────────────────────────
  const { data: paymentModesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-payment-modes'],
    queryFn:   () => apiGet<unknown>('/payment-modes', { per_page: 50 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 30 * 60_000,
  });
  const paymentModes = paymentModesRaw as PaymentMode[];

  // ── Price levels ─────────────────────────────────────────────────────────────
  const { data: priceLevelsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-price-levels'],
    queryFn:   () => apiGet<unknown>('/price-levels', { per_page: 100 }).then(extractList),
    enabled:   open && !isPurchase && !!slug,
    staleTime: 30 * 60_000,
  });
  const priceLevels = priceLevelsRaw as Record<string, unknown>[];

  // ── Real-time stock ──────────────────────────────────────────────────────────
  const { data: stockData = {} } = useQuery<Record<number, number>>({
    queryKey: [slug, 'warehouse-stock', warehouseId, fiscalYearId],
    queryFn:  () => apiGet<Record<number, number>>('/inventory/stock-at', {
      warehouse_id:   warehouseId,
      fiscal_year_id: fiscalYearId,
    }),
    enabled:   !!slug && !!warehouseId && !!fiscalYearId,
    staleTime: 2 * 60_000,
  });

  // ── Derived defaults ─────────────────────────────────────────────────────────

  const defaultWarehouseId = useMemo(() => {
    const dw = warehouses.find((w) => w.is_default) ?? warehouses[0];
    return dw ? String(dw.id) : '';
  }, [warehouses]);

  const baseCurrencyId = useMemo(() => {
    const base = currencies.find((c) => c.is_base_currency) ?? currencies[0];
    return base ? String(base.id) : '';
  }, [currencies]);

  const defaultTvaRate = useMemo(() => {
    const p = products.find((pr) => pr.tva?.is_default);
    return p?.tva?.rate ?? 19;
  }, [products]);

  return {
    parties, products, warehouses, currencies,
    fiscalYears, paymentModes, priceLevels, stockData,
    isLoadingProducts,
    defaultWarehouseId,
    baseCurrencyId,
    defaultTvaRate,
  };
}
```

## FILE: resources/js/pages/documents/QuickSaleModal.tsx
```
// resources/js/pages/documents/QuickSaleModal.tsx
// QuickSaleModal — مودل البيع السريع مع التحسينات:
// - تحميل حساب الخزينة بشكل صحيح
// - زر "تعبئة المبلغ المستحق"
// - التنقل بالـ Enter: منتج ← كمية ← سطر جديد
// - اختصار F8 للحفظ
// - الدفع فوري ونقدي بشكل افتراضي

import React, {
  useState, useEffect, useMemo, useCallback, useRef,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  ref?: string | null;
  default_selling_price_ht?: number | null;
  tva?: { id: number; rate: number } | null;
  unit?: { id: number; symbol: string } | null;
  manages_stock?: boolean;
  current_stock?: number | null;
}

interface PaymentMode {
  id: number;
  name: string;
  code: string;
}

interface TreasuryAccount {
  id: number;
  name: string;
  code: string;
  is_default: boolean;
}

interface QuickLine {
  product_id: string;
  quantity: number;
  price: number;
  tva_rate: number;
  _product?: Product;
}

interface SuccessState {
  document_number: string;
  net_to_pay: number;
  paid: number;
  remaining: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function fmtDZD(n: number | string | null | undefined): string {
  const v = parseFloat(String(n ?? 0));
  if (isNaN(v)) return '—';
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function extractList(d: unknown): unknown[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (typeof d === 'object' && d !== null) {
    const arr = (d as Record<string, unknown>).data;
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

// ─── SearchSelect ────────────────────────────────────────────────────────────

interface SearchSelectProps<T extends Record<string, unknown>> {
  items: T[];
  value: string;
  onChange: (id: string, item?: T) => void;
  getLabel: (item: T) => string;
  getSub?: (item: T) => string | null;
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  onEnter?: () => void;
}

function SearchSelect<T extends Record<string, unknown>>({
  items,
  value,
  onChange,
  getLabel,
  getSub,
  placeholder,
  disabled,
  error,
  inputRef,
  onEnter,
}: SearchSelectProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const finalInputRef = inputRef || internalInputRef;

  const selected = items.find(i => String(i.id) === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(i => getLabel(i).toLowerCase().includes(q));
  }, [items, query, getLabel]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: T) => {
    onChange(String(item.id), item);
    setOpen(false);
    setQuery('');
    // بعد اختيار المنتج، ننتقل إلى حقل الكمية (يتم التعامل معه من خلال المكون الأب)
    setTimeout(() => {
      if (finalInputRef.current) {
        const quantityInput = finalInputRef.current.closest('tr')?.querySelector('input[type="number"]') as HTMLInputElement;
        quantityInput?.focus();
      }
    }, 50);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length > 0 && query.trim()) {
      e.preventDefault();
      handleSelect(filtered[0]);
    } else if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          ...inpStyle(error),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            color: selected ? 'var(--t1)' : 'var(--t4)',
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selected ? getLabel(selected) : placeholder}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {selected && (
            <button
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--t4)',
                padding: '0 2px',
                fontSize: 12,
              }}
            >
              <i className="ti ti-x" />
            </button>
          )}
          <i
            className={`ti ti-chevron-${open ? 'up' : 'down'}`}
            style={{ color: 'var(--t4)', fontSize: 12 }}
          />
        </div>
      </div>

      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            left: 0,
            zIndex: 900,
            background: 'var(--bg1)',
            border: '1px solid var(--b3)',
            borderRadius: 'var(--r2)',
            boxShadow: 'var(--shadow2)',
            marginTop: 2,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>
            <input
              ref={finalInputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="بحث..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '5px 8px',
                borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)',
                background: 'var(--bg2)',
                color: 'var(--t1)',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'Tajawal, sans-serif',
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '10px 12px',
                  color: 'var(--t4)',
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                لا توجد نتائج
              </div>
            ) : (
              filtered.slice(0, 60).map(item => {
                const sub = getSub?.(item);
                return (
                  <div
                    key={String(item.id)}
                    onClick={() => handleSelect(item)}
                    style={{
                      padding: '7px 12px',
                      cursor: 'pointer',
                      background: String(item.id) === value ? 'var(--emb)' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--b1)',
                    }}
                    onMouseEnter={e => {
                      if (String(item.id) !== value)
                        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg2)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        String(item.id) === value ? 'var(--emb)' : 'transparent';
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--t1)' }}>{getLabel(item)}</span>
                    {sub && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--t4)',
                          flexShrink: 0,
                          marginRight: 8,
                        }}
                      >
                        {sub}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface QuickSaleModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (doc: SuccessState) => void;
}

export default function QuickSaleModal({ open, onClose, onSaved }: QuickSaleModalProps) {
  // ========== HOOKS (all at top) ==========
  const slug = useActiveSlug();
  const qc = useQueryClient();
  const { selectedYear } = (useFiscalYear() as { selectedYear?: { id: number; name: string } }) ?? {};
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  const productInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Queries
  const { data: rawProducts = [], isLoading: loadingProds } = useQuery({
    queryKey: [slug, 'quick-sale-products'],
    queryFn: () =>
      apiGet<unknown>('/products', { per_page: 500, include: 'unit,tva' }).then(extractList),
    enabled: open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: rawParties = [] } = useQuery({
    queryKey: [slug, 'quick-sale-customers'],
    queryFn: () => apiGet<unknown>('/customers', { per_page: 500 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: rawPaymentModes = [] } = useQuery({
    queryKey: [slug, 'quick-sale-payment-modes'],
    queryFn: () => apiGet<unknown>('/payment-modes', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: rawTreasuryAccounts = [] } = useQuery({
    queryKey: [slug, 'quick-sale-treasury'],
    queryFn: () => apiGet<unknown>('/treasury-accounts', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: rawWarehouses = [] } = useQuery({
    queryKey: [slug, 'quick-sale-warehouses'],
    queryFn: () => apiGet<unknown>('/warehouses', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const products = rawProducts as Product[];
  const parties = rawParties as Record<string, unknown>[];
  const paymentModes = rawPaymentModes as PaymentMode[];
  const treasuryAccounts = rawTreasuryAccounts as TreasuryAccount[];
  const warehouses = rawWarehouses as Record<string, unknown>[];

  // Defaults
  const defaultWarehouseId = useMemo(() => {
    const dw = warehouses.find(w => w.is_default);
    return dw ? String(dw.id) : warehouses[0] ? String(warehouses[0].id) : '';
  }, [warehouses]);

  // الدائم: طريقة الدفع نقدي (cash) وحساب الخزينة الأول
  const defaultPaymentModeId = useMemo(() => {
    const cash = paymentModes.find(
      pm => pm.name.toLowerCase().includes('نقد') || pm.code?.toLowerCase() === 'cash'
    );
    return cash ? String(cash.id) : paymentModes[0] ? String(paymentModes[0].id) : '';
  }, [paymentModes]);

  const defaultTreasuryId = useMemo(() => {
    const def = treasuryAccounts.find(t => t.is_default);
    return def ? String(def.id) : treasuryAccounts[0] ? String(treasuryAccounts[0].id) : '';
  }, [treasuryAccounts]);

  // State
  const [partyId, setPartyId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [docDate, setDocDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<QuickLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiErr, setApiErr] = useState('');
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // الدفع ثابت: فوري ونقدي
  const payment = {
    enabled: true,
    payment_mode_id: defaultPaymentModeId,
    treasury_account_id: defaultTreasuryId,
    amount: 0, // 0 يعني كامل المبلغ
    reference: '',
    payment_date: today(),
  };

  // Effects for reset
  useEffect(() => {
    if (open) {
      setPartyId('');
      setDocDate(today());
      setNotes('');
      setLines([]);
      setErrors({});
      setApiErr('');
      setSuccess(null);
      setWarehouseId(defaultWarehouseId);
    }
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [open, defaultWarehouseId]);

  // Line helpers
  const addLine = useCallback(() => {
    setLines(prev => [...prev, { product_id: '', quantity: 1, price: 0, tva_rate: 19 }]);
    // بعد إضافة السطر، نركز على حقل البحث في السطر الجديد
    setTimeout(() => {
      const lastIndex = lines.length;
      const input = productInputRefs.current[lastIndex];
      input?.focus();
    }, 50);
  }, [lines.length]);

  const removeLine = useCallback((idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateLine = useCallback(
    (idx: number, field: keyof QuickLine, value: unknown) => {
      setLines(prev => {
        const next = [...prev];
        const L = { ...next[idx] };
        if (field === 'product_id') {
          L.product_id = String(value);
          const p = products.find(pr => String(pr.id) === String(value));
          if (p) {
            L._product = p;
            L.price = parseFloat(String(p.default_selling_price_ht ?? 0)) || 0;
            L.tva_rate = p.tva?.rate ?? 19;
          } else {
            L._product = undefined;
            L.price = 0;
          }
        } else if (field === 'quantity') {
          L.quantity = parseFloat(String(value)) || 1;
        } else if (field === 'price') {
          L.price = parseFloat(String(value)) || 0;
        } else if (field === 'tva_rate') {
          L.tva_rate = parseFloat(String(value)) || 0;
        }
        next[idx] = L;
        return next;
      });
    },
    [products]
  );

  // Totals
  const totals = useMemo(() => {
    let ht = 0,
      tva = 0;
    lines.forEach(l => {
      const lineHt = l.price * l.quantity;
      const lineTva = lineHt * (l.tva_rate / 100);
      ht += lineHt;
      tva += lineTva;
    });
    const ttc = ht + tva;
    const stamp = ttc >= 30_000 ? Math.min(Math.ceil(ttc * 0.01), 2_500) : 0;
    const netPay = ttc + stamp;
    return { ht, tva, ttc, stamp, netPay };
  }, [lines]);

  const payAmount = useMemo(() => {
    // إذا كان المبلغ 0 أو أكبر من المستحق، نستخدم المستحق
    const amt = payment.amount;
    if (amt <= 0 || amt >= totals.netPay) return totals.netPay;
    return amt;
  }, [payment.amount, totals.netPay]);

  // Validation
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!warehouseId) errs.warehouse_id = 'المستودع إلزامي';
    if (lines.length === 0) errs.lines = 'أضف سطراً واحداً على الأقل';

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.product_id) {
        errs.lines = `السطر ${i + 1}: المنتج إلزامي`;
        break;
      }
      if (l.quantity <= 0) {
        errs.lines = `السطر ${i + 1}: الكمية يجب أن تكون > 0`;
        break;
      }
      const prod = products.find(p => String(p.id) === l.product_id);
      if (prod?.manages_stock && prod.current_stock != null && l.quantity > prod.current_stock) {
        errs.lines = `السطر ${i + 1}: الكمية (${l.quantity}) تتجاوز المخزون المتاح (${prod.current_stock})`;
        break;
      }
    }

    // التحقق من وجود حساب خزينة (تم تعبئته افتراضياً)
    if (!payment.treasury_account_id) {
      errs.treasury = 'حساب الخزينة إلزامي';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [warehouseId, lines, products, payment.treasury_account_id]);

  // Save mutation
  const saveMut = useMutation({
    mutationFn: async () => {
      const docPayload = {
        document_type_code: 'FV',
        party_id: partyId ? parseInt(partyId) : null,
        warehouse_id: parseInt(warehouseId),
        fiscal_year_id: selectedYear?.id ?? null,
        document_date: docDate,
        notes: notes || null,
        lines: lines.map(l => ({
          product_id: parseInt(l.product_id),
          quantity: l.quantity,
          unit_price_ht: l.price,
          tva_rate: l.tva_rate,
          discount_percentage: 0,
        })),
      };
      const docRes = await apiPost<Record<string, unknown>>('/documents', docPayload);
      const docId = Number((docRes as any).id ?? (docRes as any).data?.id);
      const docNum = String(
        (docRes as any).document_number ?? (docRes as any).data?.document_number ?? '—'
      );

      // إنشاء دفعة بقيمة payAmount
      if (docId && payAmount > 0) {
        await apiPost('/payments', {
          commercial_document_id: docId,
          payment_mode_id: parseInt(payment.payment_mode_id),
          treasury_account_id: parseInt(payment.treasury_account_id),
          amount: payAmount,
          payment_date: payment.payment_date || docDate,
          reference: payment.reference || null,
          notes: null,
        });
      }

      return {
        document_number: docNum,
        net_to_pay: totals.netPay,
        paid: payAmount,
        remaining: Math.max(0, totals.netPay - payAmount),
      };
    },
    onSuccess: state => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        qc.invalidateQueries({ queryKey: [slug, 'payments'] });
      }
      setSuccess(state);
      successTimer.current = setTimeout(() => onSaved(state), 2_500);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      const errs = err?.errors as Record<string, string[]> | undefined;
      setApiErr(
        errs ? Object.values(errs).flat().join(' | ') : String(err?.message ?? 'فشل الحفظ')
      );
    },
  });

  // Getters for SearchSelect
  const getProductLabel = useCallback(
    (p: Product) => `${p.name}${p.ref ? ` (${p.ref})` : ''}`,
    []
  );
  const getProductSub = useCallback((p: Product): string | null => {
    if (!p.manages_stock || p.current_stock == null) return null;
    const color = p.current_stock <= 0 ? '🔴' : p.current_stock <= 5 ? '🟡' : '🟢';
    return `${color} ${p.current_stock} ${p.unit?.symbol ?? ''}`;
  }, []);
  const getPartyLabel = useCallback((p: Record<string, unknown>) => String(p.name), []);

  const handleSave = useCallback(() => {
    setApiErr('');
    if (validate()) saveMut.mutate();
  }, [validate, saveMut]);

  // معالجة Enter في حقل الكمية: إضافة سطر جديد
  const handleQuantityEnter = useCallback(
    (idx: number) => {
      if (idx === lines.length - 1) {
        addLine();
      } else {
        // إذا لم يكن آخر سطر، ننتقل إلى السطر التالي
        const nextInput = productInputRefs.current[idx + 1];
        nextInput?.focus();
      }
    },
    [lines.length, addLine]
  );

  // تعبئة المبلغ المستحق تلقائياً
  const fillFullAmount = useCallback(() => {
    // لا نحتاج state لأن payment.amount ثابت، لكننا نستطيع إعادة حساب payAmount
    // لاحظ أننا لا نستخدم state للدفع، المبلغ يظل 0 وهذا يعني كامل المبلغ.
    // لكن إذا أردنا تغيير قيمة الدفع نضيف useState للدفع. لكن حسب الطلب "اجعل الدفع دائما فوري ونقدا" ربما يعني إخفاء الخيارات. سنكتفي بأن المبلغ المدفوع = كامل المستحق.
    // ولكن لتطبيق زر "تعبئة المبلغ"، سنضيف useState محلي للدفع.
    setPaymentLocal(prev => ({ ...prev, amount: totals.netPay }));
  }, [totals.netPay]);

  // لإضافة حالة محلية للدفع (لأن payment الآن ثابت، لكننا نحتاج لتعديل amount)
  const [paymentLocal, setPaymentLocal] = useState({
    enabled: true,
    payment_mode_id: defaultPaymentModeId,
    treasury_account_id: defaultTreasuryId,
    amount: 0,
    reference: '',
    payment_date: today(),
  });

  // تحديث paymentLocal عند تحميل البيانات
  useEffect(() => {
    if (defaultPaymentModeId && defaultTreasuryId) {
      setPaymentLocal(prev => ({
        ...prev,
        payment_mode_id: defaultPaymentModeId,
        treasury_account_id: defaultTreasuryId,
      }));
    }
  }, [defaultPaymentModeId, defaultTreasuryId]);

  // إعادة حساب payAmount باستخدام paymentLocal
  const finalPayAmount = useMemo(() => {
    const amt = paymentLocal.amount;
    if (amt <= 0 || amt >= totals.netPay) return totals.netPay;
    return amt;
  }, [paymentLocal.amount, totals.netPay]);

  // تعديل دوال الحفظ لاستخدام paymentLocal
  const finalSaveMut = useMutation({
    mutationFn: async () => {
      const docPayload = {
        document_type_code: 'FV',
        party_id: partyId ? parseInt(partyId) : null,
        warehouse_id: parseInt(warehouseId),
        fiscal_year_id: selectedYear?.id ?? null,
        document_date: docDate,
        notes: notes || null,
        lines: lines.map(l => ({
          product_id: parseInt(l.product_id),
          quantity: l.quantity,
          unit_price_ht: l.price,
          tva_rate: l.tva_rate,
          discount_percentage: 0,
        })),
      };
      const docRes = await apiPost<Record<string, unknown>>('/documents', docPayload);
      const docId = Number((docRes as any).id ?? (docRes as any).data?.id);
      const docNum = String(
        (docRes as any).document_number ?? (docRes as any).data?.document_number ?? '—'
      );

      if (docId && finalPayAmount > 0) {
        await apiPost('/payments', {
          commercial_document_id: docId,
          payment_mode_id: parseInt(paymentLocal.payment_mode_id),
          treasury_account_id: parseInt(paymentLocal.treasury_account_id),
          amount: finalPayAmount,
          payment_date: paymentLocal.payment_date || docDate,
          reference: paymentLocal.reference || null,
          notes: null,
        });
      }

      return {
        document_number: docNum,
        net_to_pay: totals.netPay,
        paid: finalPayAmount,
        remaining: Math.max(0, totals.netPay - finalPayAmount),
      };
    },
    onSuccess: state => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        qc.invalidateQueries({ queryKey: [slug, 'payments'] });
      }
      setSuccess(state);
      successTimer.current = setTimeout(() => onSaved(state), 2_500);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      const errs = err?.errors as Record<string, string[]> | undefined;
      setApiErr(
        errs ? Object.values(errs).flat().join(' | ') : String(err?.message ?? 'فشل الحفظ')
      );
    },
  });

  const handleFinalSave = useCallback(() => {
    setApiErr('');
    if (validate()) finalSaveMut.mutate();
  }, [validate, finalSaveMut]);

  // اختصار F8
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8' && open && !finalSaveMut.isPending && !success) {
        e.preventDefault();
        handleFinalSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, finalSaveMut.isPending, success, handleFinalSave]);

  // ========== EARLY RETURN ==========
  if (!open) return null;

  const isPending = finalSaveMut.isPending;

  // ========== JSX ==========
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        background: 'rgba(0,0,0,.6)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={!isPending ? onClose : undefined}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          background: 'var(--bg1)',
          borderRadius: 'var(--r3)',
          boxShadow: '0 32px 80px rgba(0,0,0,.35)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '95vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--b1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              'linear-gradient(135deg, var(--em) 0%, color-mix(in srgb, var(--em) 70%, var(--blue)) 100%)',
            borderRadius: 'var(--r3) var(--r3) 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--r2)',
                background: 'rgba(255,255,255,.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="ti ti-bolt" style={{ fontSize: 18, color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>بيع سريع</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>
                فاتورة بيع (FV) — رقم الوثيقة يُولَّد تلقائياً — <kbd>F8</kbd> للحفظ
              </div>
            </div>
          </div>
          <button
            onClick={!isPending ? onClose : undefined}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,.3)',
              background: 'rgba(255,255,255,.15)',
              color: 'white',
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Success */}
          {success && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--r2)',
                background: 'var(--greenb)',
                border: '1px solid var(--green)',
                color: 'var(--green)',
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <i className="ti ti-check-circle" />
                تم إنشاء الفاتورة {success.document_number}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                <span>
                  المستحق: <b>{fmtDZD(success.net_to_pay)} دج</b>
                </span>
                {success.paid > 0 && (
                  <span>
                    المدفوع: <b>{fmtDZD(success.paid)} دج</b>
                  </span>
                )}
                {success.remaining > 0 && (
                  <span>
                    المتبقي: <b style={{ color: 'var(--red)' }}>{fmtDZD(success.remaining)} دج</b>
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>سيُغلق تلقائياً...</div>
            </div>
          )}

          {/* API Error */}
          {apiErr && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--r2)',
                background: 'var(--redb)',
                border: '1px solid var(--red)',
                color: 'var(--red)',
                fontSize: 13,
                display: 'flex',
                gap: 8,
              }}
            >
              <i className="ti ti-alert-circle" style={{ marginTop: 1 }} />
              <span>{apiErr}</span>
            </div>
          )}

          {/* Row 1: Customer + Date + Warehouse */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={lblStyle}>الزبون</div>
              <SearchSelect
                items={parties as any}
                value={partyId}
                onChange={setPartyId}
                getLabel={getPartyLabel as any}
                placeholder="— بيع نقدي —"
                disabled={isPending}
              />
            </div>
            <div>
              <div style={lblStyle}>التاريخ</div>
              <input
                type="date"
                value={docDate}
                onChange={e => setDocDate(e.target.value)}
                style={inpStyle()}
                disabled={isPending}
              />
            </div>
            <div>
              <div style={lblStyle}>
                المستودع <span style={{ color: 'var(--red)' }}>*</span>
              </div>
              <select
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                style={inpStyle(!!errors.warehouse_id)}
                disabled={isPending}
              >
                <option value="">— اختر —</option>
                {warehouses.map(w => (
                  <option key={String(w.id)} value={String(w.id)}>
                    {String(w.name)}
                    {w.is_default ? ' ★' : ''}
                  </option>
                ))}
              </select>
              {errors.warehouse_id && <ErrMsg msg={errors.warehouse_id} />}
            </div>
          </div>

          {/* Lines */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--t3)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                المنتجات
                {lines.length > 0 && (
                  <span
                    style={{
                      marginRight: 6,
                      padding: '1px 7px',
                      borderRadius: 99,
                      background: 'var(--em)',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {lines.length}
                  </span>
                )}
              </div>
              {errors.lines && <ErrMsg msg={errors.lines} />}
            </div>

            {loadingProds ? (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--t4)', fontSize: 13 }}>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري
                تحميل المنتجات...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {lines.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 70px 100px 60px 90px 32px',
                      gap: 6,
                      padding: '4px 10px',
                    }}
                  >
                    {['المنتج', 'الكمية', 'سعر HT', 'TVA%', 'TTC', ''].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--t4)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.3,
                          textAlign: 'center',
                        }}
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                )}

                {lines.map((line, idx) => {
                  const { ttc } = calcLine(line);
                  const prod = products.find(p => String(p.id) === line.product_id);
                  const overStock =
                    prod?.manages_stock && prod.current_stock != null && line.quantity > prod.current_stock;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 70px 100px 60px 90px 32px',
                        gap: 6,
                        alignItems: 'center',
                        padding: '8px 10px',
                        background: overStock
                          ? 'color-mix(in srgb, var(--red) 5%, var(--bg2))'
                          : 'var(--bg2)',
                        borderRadius: 'var(--r2)',
                        border: `1px solid ${overStock ? 'var(--redbo)' : 'var(--b1)'}`,
                      }}
                    >
                      <SearchSelect
                        items={products as any}
                        value={line.product_id}
                        onChange={(id, item) => updateLine(idx, 'product_id', id)}
                        getLabel={getProductLabel as any}
                        getSub={getProductSub as any}
                        placeholder="— اختر منتجاً —"
                        disabled={isPending}
                        error={!line.product_id}
                        inputRef={el => (productInputRefs.current[idx] = el)}
                        onEnter={() => {
                          // عند الضغط Enter في حقل البحث بعد اختيار منتج (أو بدون اختيار)
                          // ننتقل إلى حقل الكمية
                          const quantityInput = quantityInputRefs.current[idx];
                          quantityInput?.focus();
                        }}
                      />
                      <input
                        ref={el => (quantityInputRefs.current[idx] = el)}
                        type="number"
                        min="0.001"
                        step="1"
                        value={line.quantity}
                        onChange={e => updateLine(idx, 'quantity', e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuantityEnter(idx);
                          }
                        }}
                        style={{
                          ...cellStyle(),
                          border: `1px solid ${
                            overStock
                              ? 'var(--red)'
                              : line.quantity <= 0
                              ? 'var(--red)'
                              : 'var(--b3)'
                          }`,
                        }}
                        disabled={isPending}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.price}
                        onChange={e => updateLine(idx, 'price', e.target.value)}
                        style={cellStyle()}
                        disabled={isPending}
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={line.tva_rate}
                        onChange={e => updateLine(idx, 'tva_rate', e.target.value)}
                        style={cellStyle()}
                        disabled={isPending}
                      />
                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--em)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmtDZD(ttc)}
                      </div>
                      <button
                        onClick={() => removeLine(idx)}
                        disabled={isPending}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: '1px solid var(--b3)',
                          background: 'var(--bg1)',
                          color: 'var(--red)',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={addLine}
                  disabled={isPending}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--r2)',
                    border: '1px dashed var(--em)',
                    background: 'transparent',
                    color: 'var(--em)',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-plus" /> إضافة منتج
                </button>
              </div>
            )}
          </div>

          {/* Totals */}
          {lines.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  width: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  padding: '12px 14px',
                  borderRadius: 'var(--r2)',
                  background: 'var(--bg2)',
                  border: '1px solid var(--b1)',
                }}
              >
                <TotRow label="إجمالي HT" value={fmtDZD(totals.ht)} />
                <TotRow label="TVA" value={fmtDZD(totals.tva)} />
                {totals.stamp > 0 && (
                  <TotRow label="الطابع الجبائي" value={fmtDZD(totals.stamp)} color="var(--gold)" />
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    marginTop: 4,
                    borderTop: '2px solid var(--b2)',
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  <span style={{ color: 'var(--t1)' }}>المستحق</span>
                  <span
                    style={{
                      color: 'var(--em)',
                      direction: 'ltr',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtDZD(totals.netPay)} دج
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment section (friendly UI) */}
          <div
            style={{
              borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--greenb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: 'var(--green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="ti ti-check" style={{ fontSize: 12, color: 'white' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                  دفع فوري (نقدي)
                </span>
                {totals.netPay > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '1px 8px',
                      borderRadius: 99,
                      background: 'var(--green)',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    {fmtDZD(finalPayAmount)} دج
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={lblStyle}>
                    طريقة الدفع <span style={{ color: 'var(--red)' }}>*</span>
                  </div>
                  <select
                    value={paymentLocal.payment_mode_id}
                    onChange={e =>
                      setPaymentLocal(p => ({ ...p, payment_mode_id: e.target.value }))
                    }
                    style={inpStyle()}
                    disabled={isPending}
                  >
                    <option value="">— اختر —</option>
                    {paymentModes.map(pm => (
                      <option key={pm.id} value={String(pm.id)}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={lblStyle}>
                    حساب الخزينة <span style={{ color: 'var(--red)' }}>*</span>
                  </div>
                  <select
                    value={paymentLocal.treasury_account_id}
                    onChange={e =>
                      setPaymentLocal(p => ({ ...p, treasury_account_id: e.target.value }))
                    }
                    style={inpStyle(!!errors.treasury)}
                    disabled={isPending}
                  >
                    <option value="">— اختر —</option>
                    {treasuryAccounts.map(ta => (
                      <option key={ta.id} value={String(ta.id)}>
                        {ta.name}
                        {ta.is_default ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.treasury && <ErrMsg msg={errors.treasury} />}
                </div>
                <div>
                  <div style={lblStyle}>
                    المبلغ المدفوع
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 4 }}>
                      (0 = كامل المبلغ)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentLocal.amount || ''}
                      placeholder={`${fmtDZD(totals.netPay)} (كامل)`}
                      onChange={e =>
                        setPaymentLocal(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))
                      }
                      style={{ ...inpStyle(), flex: 1 }}
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={fillFullAmount}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)',
                        background: 'var(--bg2)',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--em)',
                      }}
                    >
                      الكل
                    </button>
                  </div>
                </div>
                <div>
                  <div style={lblStyle}>تاريخ الدفع</div>
                  <input
                    type="date"
                    value={paymentLocal.payment_date}
                    onChange={e => setPaymentLocal(p => ({ ...p, payment_date: e.target.value }))}
                    style={inpStyle()}
                    disabled={isPending}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={lblStyle}>المرجع / رقم الشيك</div>
                  <input
                    type="text"
                    value={paymentLocal.reference}
                    placeholder="اختياري..."
                    onChange={e => setPaymentLocal(p => ({ ...p, reference: e.target.value }))}
                    style={inpStyle()}
                    disabled={isPending}
                  />
                </div>
              </div>

              {totals.netPay > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '8px 12px',
                    borderRadius: 'var(--r2)',
                    background: 'var(--bg2)',
                    fontSize: 12,
                  }}
                >
                  <span>
                    المستحق: <b>{fmtDZD(totals.netPay)} دج</b>
                  </span>
                  <span style={{ color: 'var(--green)' }}>
                    المدفوع: <b>{fmtDZD(finalPayAmount)} دج</b>
                  </span>
                  {finalPayAmount < totals.netPay && (
                    <span style={{ color: 'var(--red)' }}>
                      المتبقي: <b>{fmtDZD(totals.netPay - finalPayAmount)} دج</b>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={lblStyle}>ملاحظات</div>
            <textarea
              rows={2}
              value={notes}
              placeholder="ملاحظات اختيارية..."
              onChange={e => setNotes(e.target.value)}
              style={{ ...inpStyle(), resize: 'vertical' }}
              disabled={isPending}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--b1)',
            background: 'var(--bg2)',
            display: 'flex',
            gap: 8,
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '0 0 var(--r3) var(--r3)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--t4)' }}>
            {lines.length > 0 && (
              <span>
                {lines.length} منتج ·{' '}
                <span style={{ fontWeight: 700, color: 'var(--em)' }}>
                  {fmtDZD(totals.netPay)} دج
                </span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              disabled={isPending}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)',
                background: 'var(--bg1)',
                color: 'var(--t2)',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              إلغاء
            </button>
            <button
              onClick={handleFinalSave}
              disabled={isPending || !!success}
              style={{
                padding: '8px 22px',
                borderRadius: 'var(--r2)',
                border: 'none',
                background: success
                  ? 'var(--green)'
                  : 'linear-gradient(135deg, var(--em), color-mix(in srgb, var(--em) 70%, var(--blue)))',
                color: 'white',
                cursor: isPending || !!success ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? (
                <>
                  <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري
                  الحفظ...
                </>
              ) : success ? (
                <>
                  <i className="ti ti-check" /> تم الحفظ
                </>
              ) : (
                <>
                  <i className="ti ti-bolt" /> تأكيد البيع (F8)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mini helpers ─────────────────────────────────────────────────────────────

function calcLine(l: QuickLine) {
  const ht = l.price * l.quantity;
  const tva = ht * (l.tva_rate / 100);
  return { ht, tva, ttc: ht + tva };
}

function TotRow({ label, value, color = 'var(--t3)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>{msg}</div>;
}

const lblStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--t3)',
  display: 'block',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

function inpStyle(err?: boolean): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '7px 10px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg1)',
    color: 'var(--t1)',
    fontSize: 13,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
  };
}

function cellStyle(): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '5px 6px',
    borderRadius: 'var(--r1)',
    border: '1px solid var(--b3)',
    background: 'var(--bg1)',
    color: 'var(--t1)',
    fontSize: 12,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    textAlign: 'center',
  };
}

function selectStyle(disabled: boolean, hasValue: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 12px 8px 34px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${disabled ? 'var(--b2)' : 'var(--b3)'}`,
    background: disabled ? 'var(--bg3)' : 'var(--bg1)',
    color: hasValue && !disabled ? 'var(--t1)' : 'var(--t4)',
    fontSize: 13,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    appearance: 'none' as any,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color .15s, box-shadow .15s',
  };
}

function inpNumStyle(err?: boolean): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '7px 10px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg1)',
    color: 'var(--t1)',
    fontSize: 13,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    textAlign: 'center',
  };
}

function selectNumStyle(disabled: boolean, hasValue: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 12px 8px 34px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${disabled ? 'var(--b2)' : 'var(--b3)'}`,
    background: disabled ? 'var(--bg3)' : 'var(--bg1)',
    color: hasValue && !disabled ? 'var(--t1)' : 'var(--t4)',
    fontSize: 13,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    appearance: 'none' as any,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color .15s, box-shadow .15s',
    textAlign: 'center',
  };
}
```

## FILE: resources/js/pages/documents/types/document.types.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/types/document.types.ts
//
// مصدر الحقيقة الوحيد لأنواع بيانات وحدة المستندات التجارية.
// ════════════════════════════════════════════════════════════════════════════

// ─── Document operation constants ────────────────────────────────────────────

export const PURCHASE_CODES  = new Set(['DDP', 'BCF', 'BR', 'FA', 'AA']);
export const STOCK_IN_CODES  = new Set(['FA', 'BR', 'AV']);
export const STOCK_OUT_CODES = new Set(['FV', 'BL', 'AA']);
export const REQUIRES_PARTY  = new Set(['DEV', 'BCC', 'BL', 'FV', 'AV', 'DDP', 'BCF', 'BR', 'FA', 'AA']);
export const SALE_CODES      = new Set(['FV', 'BL', 'DEV', 'BCC', 'AV']);

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Packaging {
  id:          number;
  code:        string;
  label:       string;
  quantity:    number;
  is_default:  boolean;
  barcode?:    string | null;
}

export interface ProductLot {
  id:                   number;
  lot_number:           string;
  expiration_date?:     string | null;
  remaining_quantity:   number;
  purchase_price?:      number | null;
  legal_selling_price?: number | null;
}

export interface ProductPrice {
  id:               number;
  price_level_id:   number;
  price_level?:     { id: number; name: string };
  pricing_method:   'fixed' | 'rate' | 'margin';
  price?:           number;
  rate?:            number;
  margin?:          number;
  active:           boolean;
}

export interface QuantityDiscount {
  id:                   number;
  price_level_id:       number;
  min_qty:              number;
  max_qty?:             number | null;
  discount_amount?:     number | null;
  discount_percentage?: number | null;
  active:               boolean;
}

export interface Product {
  id:                         number;
  name:                       string;
  ref?:                       string | null;
  barcode?:                   string | null;
  purchase_price_ht?:         number | string | null;
  current_cost_price?:        number | string | null;
  default_selling_price_ht?:  number | string | null;
  family?:                    { id: number; name: string } | null;
  brand?:                     { id: number; name: string } | null;
  tva?:                       { id: number; rate: number; is_default?: boolean } | null;
  unit?:                      { id: number; symbol: string; name: string } | null;
  packagings?:                Packaging[];
  prices?:                    ProductPrice[];
  quantityDiscounts?:         QuantityDiscount[];
  lots?:                      ProductLot[];
  manages_stock?:             boolean;
  has_lots?:                  boolean;
  active?:                    boolean;
  stock_quantity?:            number | null;
  allow_negative_stock?:      boolean;
}

// ─── Party ────────────────────────────────────────────────────────────────────

export interface Party {
  id:              number;
  name:            string;
  code?:           string | null;
  phone?:          string | null;
  email?:          string | null;
  balance?:        number | null;
  price_level_id?: number | null;
  price_level?:    { id: number; name: string } | null;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface PaymentMode {
  id:     number;
  name:   string;
  code?:  string | null;
  icon?:  string | null;
}

export interface PaymentEntry {
  payment_mode_id: string;
  amount:          string;
  reference?:      string;
  payment_date:    string;
}

// ─── Line ─────────────────────────────────────────────────────────────────────

export type DiscountMode = 'percent' | 'fixed';

export interface LineItem {
  id?:                    number;
  product_id:             string;
  description:            string;
  quantity:               number;
  unit_price_ht:          number;
  /** سعر التعبئة = unit_price_ht × packQty */
  price_per_pack:         number;
  discount_mode:          DiscountMode;
  discount_percentage:    number;
  discount_amount_fixed:  number;
  tva_rate:               number;
  packaging_id:           string;
  stock_lot_id:           string;
  lot_number_new?:        string;
  line_note?:             string;
  /** مرجع داخلي: كائن المنتج الكامل (لا يُرسَل للـ API) */
  _product?:              Product;
  /** كمية الوحدات في التعبئة المختارة */
  _packQty:               number;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface DocumentFormState {
  party_id:       string;
  document_date:  string;
  due_date:       string;
  notes:          string;
  warehouse_id:   string;
  fiscal_year_id: string;
  currency_id:    string;
  exchange_rate:  string;
  apply_stamp:    boolean;
  price_level_id: string;
  lines:          LineItem[];
  payments:       PaymentEntry[];
}

// ─── Totals ───────────────────────────────────────────────────────────────────

export interface DocumentTotals {
  gross:       number;
  ht:          number;
  tva:         number;
  ttc:         number;
  discount:    number;
  stamp:       number;
  netToPay:    number;
  totalPaid:   number;
  remaining:   number;
}

// ─── Column config ────────────────────────────────────────────────────────────

export const ALL_COLUMNS = [
  { key: 'idx',        label: '#',              w: 34,  fixed: true  },
  { key: 'product',    label: 'المنتج',          w: 220, fixed: true  },
  { key: 'packaging',  label: 'التعبئة',         w: 110, fixed: false },
  { key: 'lot',        label: 'الحصة',             w: 120, fixed: false },
  { key: 'quantity',   label: 'الكمية',          w: 75,  fixed: true  },
  { key: 'unit',       label: 'الوحدة',          w: 60,  fixed: false },
  { key: 'unit_price', label: 'سعر الوحدة HT',  w: 110, fixed: false },
  { key: 'pack_price', label: 'سعر التعبئة',    w: 100, fixed: false },
  { key: 'orig_price', label: 'السعر الأصلي',   w: 100, fixed: false },
  { key: 'discount',   label: 'الخصم',           w: 110, fixed: false },
  { key: 'price_after',label: 'بعد الخصم HT',   w: 100, fixed: false },
  { key: 'tva',        label: 'TVA %',           w: 68,  fixed: false },
  { key: 'total_ht',   label: 'إجمالي HT',      w: 100, fixed: false },
  { key: 'total_ttc',  label: 'إجمالي TTC',     w: 110, fixed: true  },
  { key: 'line_note',  label: 'ملاحظة',          w: 100, fixed: false },
  { key: 'actions',    label: '',                w: 36,  fixed: true  },
] as const;

export type ColKey = (typeof ALL_COLUMNS)[number]['key'];

// ─── Status config ────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: 'مسودة',        color: 'var(--t4)',     bg: 'var(--bg3)' },
  pending:        { label: 'قيد الانتظار', color: 'var(--orange)', bg: 'color-mix(in srgb, var(--orange) 12%, transparent)' },
  validated:      { label: 'معتمد',         color: 'var(--blue)',   bg: 'color-mix(in srgb, var(--blue) 12%, transparent)'   },
  partially_paid: { label: 'مدفوع جزئياً', color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 12%, transparent)' },
  paid:           { label: 'مدفوع',         color: 'var(--em)',     bg: 'color-mix(in srgb, var(--em) 12%, transparent)'     },
  overdue:        { label: 'متأخر',         color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 12%, transparent)'    },
  cancelled:      { label: 'ملغي',          color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 8%, transparent)'     },
  returned:       { label: 'مرتجع',         color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 10%, transparent)' },
};
```

## FILE: resources/js/pages/documents/utils/document.utils.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/utils/document.utils.ts
//
// دوال مساعدة خالصة (pure) — لا React، لا API، لا side effects.
// قابلة للاختبار بشكل مستقل.
// ════════════════════════════════════════════════════════════════════════════

import type {
  LineItem,
  DocumentTotals,
  Product,
  ProductPrice,
  ColKey,
} from '../types/document.types';

// ─── Number helpers ───────────────────────────────────────────────────────────

/** تحويل أي قيمة إلى رقم آمن */
export function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const p = parseFloat(String(v));
  return isNaN(p) ? 0 : p;
}

/** تنسيق رقم بالدينار الجزائري */
export function fmtDZD(v: number | string | null | undefined): string {
  const num = toNum(v);
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** تنسيق تاريخ بالصيغة الجزائرية */
export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

/** تاريخ اليوم بصيغة YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Fiscal stamp ─────────────────────────────────────────────────────────────

/**
 * حساب الطابع الجبائي: 1% من TTC بحد أقصى 2500 دج.
 * لا طابع إذا كان TTC < 30,000 دج.
 */
export function calcFiscalStamp(ttc: number): number {
  if (ttc < 30_000) return 0;
  return Math.min(Math.ceil(ttc * 0.01), 2_500);
}

// ─── Line calculations ────────────────────────────────────────────────────────

export interface LineCalcResult {
  gross:       number;   // السعر × الكمية قبل الخصم
  discountAmt: number;   // مبلغ الخصم
  discPct:     number;   // نسبة الخصم المحسوبة
  ht:          number;   // HT = gross - discount
  tva:         number;   // مبلغ TVA
  ttc:         number;   // TTC = ht + tva
}

export function calcLineTotal(line: LineItem): LineCalcResult {
  // السعر الفعّال: سعر التعبئة إذا كانت التعبئة > 1 وحدة
  const basePrice = line._packQty > 1 ? line.price_per_pack : line.unit_price_ht;
  const gross     = basePrice * line.quantity;

  let discountAmt: number;
  if (line.discount_mode === 'percent') {
    discountAmt = gross * (line.discount_percentage / 100);
  } else {
    discountAmt = line.discount_amount_fixed * line.quantity;
  }
  discountAmt = Math.min(discountAmt, gross);

  const ht     = gross - discountAmt;
  const tva    = ht * (line.tva_rate / 100);
  const ttc    = ht + tva;
  const discPct = gross > 0 ? (discountAmt / gross) * 100 : 0;

  return { gross, discountAmt, discPct, ht, tva, ttc };
}

export function calcTotals(
  lines:        LineItem[],
  applyStamp:   boolean,
  payments:     Array<{ amount: string }>,
): DocumentTotals {
  let gross = 0, ht = 0, tva = 0, discount = 0;

  for (const line of lines) {
    const t = calcLineTotal(line);
    gross    += t.gross;
    ht       += t.ht;
    tva      += t.tva;
    discount += t.discountAmt;
  }

  const ttc        = ht + tva;
  const stamp      = applyStamp ? calcFiscalStamp(ttc) : 0;
  const netToPay   = ttc + stamp;
  const totalPaid  = payments.reduce((acc, p) => acc + toNum(p.amount), 0);

  return { gross, ht, tva, ttc, discount, stamp, netToPay, totalPaid, remaining: netToPay - totalPaid };
}

// ─── Price resolution ─────────────────────────────────────────────────────────

function resolveProductPrice(
  product:  Product,
  entry:    ProductPrice,
): number {
  const cost = toNum(product.purchase_price_ht ?? product.current_cost_price ?? 0);
  const val  = entry.price ?? entry.rate ?? entry.margin ?? null;
  if (val === null) return 0;
  if (entry.pricing_method === 'fixed')  return val;
  if (entry.pricing_method === 'rate')   return cost * (1 + val / 100);
  if (entry.pricing_method === 'margin') return cost + val;
  return cost;
}

/**
 * يحدد السعر الصحيح للمنتج بناءً على:
 * - نوع العملية (شراء / بيع)
 * - فئة السعر (price level) إن وُجدت
 * - السعر الافتراضي
 * - fallback: سعر الشراء + هامش 30%
 */
export function resolvePrice(
  product:       Product,
  priceLevelId:  number | null,
  isPurchase:    boolean,
): number {
  if (isPurchase) {
    return toNum(product.purchase_price_ht ?? product.current_cost_price) || 0;
  }

  // بيع بفئة سعرية محددة
  if (priceLevelId) {
    const entry = (product.prices ?? []).find(
      (p) => p.price_level_id === priceLevelId && p.active,
    );
    if (entry) {
      const v = resolveProductPrice(product, entry);
      if (v > 0) return v;
    }
  }

  // السعر الافتراضي
  const defaultPrice = toNum(product.default_selling_price_ht);
  if (defaultPrice > 0) return defaultPrice;

  // fallback: سعر الشراء + 30%
  const costPrice = toNum(product.purchase_price_ht ?? product.current_cost_price);
  if (costPrice > 0) return Math.round(costPrice * 1.3 * 100) / 100;

  return 0;
}

/**
 * خصم الكميات المناسب لمنتج وكمية وفئة سعر معينة
 */
export function resolveQuantityDiscount(
  product:       Product,
  qty:           number,
  priceLevelId:  number | null,
): { percentage: number; fixed: number } {
  const matches = (product.quantityDiscounts ?? []).filter((d) => {
    if (!d.active)                              return false;
    if (priceLevelId && d.price_level_id !== priceLevelId) return false;
    if (qty < d.min_qty)                        return false;
    if (d.max_qty && qty > d.max_qty)           return false;
    return true;
  });

  if (matches.length === 0) return { percentage: 0, fixed: 0 };

  const best = matches[matches.length - 1];
  return {
    percentage: best.discount_percentage ?? 0,
    fixed:      best.discount_amount     ?? 0,
  };
}

// ─── Columns persistence ──────────────────────────────────────────────────────

const COLS_STORAGE_KEY = 'cdm_visible_cols_v3';

const DEFAULT_VISIBLE_COLS: ColKey[] = [
  'idx', 'product', 'packaging', 'lot',
  'quantity', 'unit_price', 'pack_price',
  'discount', 'tva', 'total_ttc', 'actions',
];

export function loadVisibleCols(slug: string): Set<ColKey> {
  try {
    const raw = localStorage.getItem(`${COLS_STORAGE_KEY}_${slug}`);
    if (raw) return new Set(JSON.parse(raw) as ColKey[]);
  } catch {}
  return new Set<ColKey>(DEFAULT_VISIBLE_COLS);
}

export function saveVisibleCols(slug: string, cols: Set<ColKey>): void {
  try {
    localStorage.setItem(`${COLS_STORAGE_KEY}_${slug}`, JSON.stringify([...cols]));
  } catch {}
}

// ─── Stock helpers ────────────────────────────────────────────────────────────

/** المخزون الفعلي للمنتج (يفضّل البيانات الآنية من API) */
export function getProductStock(
  product:   Product,
  stockData: Record<number, number>,
): number {
  if (!product.manages_stock) return Infinity;

  const realtime = stockData[product.id];
  if (realtime !== undefined) return toNum(realtime);
  if (product.stock_quantity != null) return toNum(product.stock_quantity);

  // fallback: مجموع الأكوام
  return (product.lots ?? []).reduce((acc, l) => acc + (l.remaining_quantity ?? 0), 0);
}

/** نتيجة التحقق من كمية سطر واحد */
export type LineStockValidation =
  | { ok: true }
  | { ok: false; blocking: true;  message: string }
  | { ok: false; blocking: false; message: string }; // تحذير غير محجوب

export function validateLineStock(
  line:       LineItem,
  product:    Product,
  isPurchase: boolean,
  stockData:  Record<number, number>,
): LineStockValidation {
  if (isPurchase || !product.manages_stock) return { ok: true };

  const stock = getProductStock(product, stockData);
  const qty   = toNum(line.quantity);

  if (qty <= stock) return { ok: true };

  if (!product.allow_negative_stock) {
    return {
      ok: false,
      blocking: true,
      message: `الكمية المطلوبة (${qty}) أكبر من المتاح (${stock})`,
    };
  }

  return {
    ok: false,
    blocking: false,
    message: `تنبيه: البيع سيجعل المخزون سالباً (${stock - qty})`,
  };
}
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

