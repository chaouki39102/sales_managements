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
