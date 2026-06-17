// ════════════════════════════════════════════════════════════════════════════
// pages/documents/CommercialDocumentModal.tsx — النسخة النهائية المُصلحة
//
// ✅ الإصلاحات النهائية:
// • تفريق منطق التعطيل:
//   - disableFields  : الحقول الأساسية (الزبون، التواريخ، المستودع، ...) — معطلة فقط للـ locked/cancelled
//   - disableLines   : الأسطر — معطلة للمعتمدة (validated) وكذلك locked/cancelled
//   - disableForm    : الملاحظات والطابع — معطلة فقط للـ locked/cancelled
//   - disablePayments: الدفعات — معطلة فقط للـ cancelled (والـ locked إن أردت)
// • زر إضافة سطر يعتمد على !disableLines
// • زر إضافة دفعة يعتمد على !isCancelled (أي غير ملغى)
// • حساب الخزينة يظهر اسم الحساب مع خيار الاختيار اليدوي عند عدم وجود حساب تلقائي
// • رسائل تحذير لتغيير الزبون عند وجود أسطر وتغيير فئة السعر
// • دعم كامل لـ useDocumentForm المُحسَّن
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiPost, apiPut, apiGet, apiDelete } from '@/lib/api/core/client';
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
  validateLineStock, toNum,
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

  // ─── Status flags ───────────────────────────────────────────────────────────
  //
  // منطق الحالات:
  //   1. is_locked      → مُجمَّد تماماً (لا تعديل على أي شيء)
  //   2. status=cancelled → ملغى (قراءة فقط)
  //   3. validated/paid/... → معتمد (يمكن تعديل الحقول الأساسية وإضافة دفعات، لكن الأسطر مجمَّدة)
  //   4. draft/pending  → حر التعديل

  const docStatusName = String(
    (existingDocument?.document_status as Record<string, unknown> | undefined)?.name
    ?? existingDocument?.status
    ?? '',
  ).toLowerCase();

  const isLocked    = !!(existingDocument?.is_locked);
  const isCancelled = docStatusName === 'cancelled' || docStatusName === 'returned';

  const VALIDATED_STATUSES = new Set(['validated', 'paid', 'partially_paid', 'overdue']);
  const isValidated = !isLocked && VALIDATED_STATUSES.has(docStatusName);

  // ✅ منطق التعطيل المُفصَّل:
  const disableForm           = isLocked || isCancelled;          // الملاحظات والطابع
  const disableFields         = isLocked || isCancelled;          // الحقول الأساسية (الزبون، التواريخ، المستودع، ...)
  const disableLines          = isLocked || isCancelled; // الأسطر (المعتمدة + المقفولة + الملغاة)
  const disablePayments       = isCancelled;                      // الدفعات (فقط الملغاة، أما المعتمدة فمسموح)

  const isDisabledCompletely  = isCancelled;                      // للتصميم (تلوين خافت)

  // ─── حالة تحذير تغيير الزبون ────────────────────────────────────────────────

  const [partyChangeWarning, setPartyChangeWarning] = useState('');

  // ─── Document number state ─────────────────────────────────────────────────

  const [docNumber, setDocNumber] = useState<string>('');
  const [docNumberErr, setDocNumberErr] = useState('');
  const [checkingDocNumber, setCheckingDocNumber] = useState(false);

  useEffect(() => {
    if (isEdit && existingDocument?.document_number) {
      setDocNumber(String(existingDocument.document_number));
    } else {
      setDocNumber('');
    }
  }, [isEdit, existingDocument?.document_number, open]);

  // ─── Column visibility ─────────────────────────────────────────────────────

  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    () => loadVisibleCols(slug ?? 'default'),
  );
  const handleColsChange = (cols: Set<ColKey>) => {
    setVisibleCols(cols);
    saveVisibleCols(slug ?? 'default', cols);
  };

  // ─── Lookups ───────────────────────────────────────────────────────────────

  const lookups = useDocumentLookups({
    open,
    isPurchase,
    needsParty: true,
    warehouseId:  null,
    fiscalYearId: selectedYear?.id ?? null,
  });

  const {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, priceLevelId,
    addLine, removeLine, duplicateLine, updateLine,
    addPayment, removePayment, updatePayment,
    totals, validate, buildPayload,
    updateStockData,
    needsParty, affectsStock, stockDir,
  } = useDocumentForm({
    documentType,
    existingDocument,
    defaultTvaRate:     lookups.defaultTvaRate,
    defaultWarehouseId: lookups.defaultWarehouseId,
    baseCurrencyId:     lookups.baseCurrencyId,
    selectedYearId:     selectedYear?.id ? String(selectedYear.id) : '',
    paymentModes:       lookups.paymentModes,
    parties:            lookups.parties,
    stockData:          {},
    isPurchase,
    open,
    existingPaymentsCount: ((existingDocument?.payments as unknown[]) ?? []).length,
  });

  // ─── Stock query ────────────────────────────────────────────────────────────

  const warehouseIdNum = form.warehouse_id ? parseInt(form.warehouse_id) : null;
  const { data: stockData = {} } = useQuery<Record<number, number>>({
    queryKey: [slug, 'warehouse-stock', warehouseIdNum, selectedYear?.id],
    queryFn:  () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   warehouseIdNum,
        fiscal_year_id: selectedYear?.id,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!warehouseIdNum && !isPurchase,
    staleTime: 2 * 60_000,
  });

  useEffect(() => { updateStockData(stockData); }, [stockData, updateStockData]);

  // ─── Success state ─────────────────────────────────────────────────────────

  const [successMsg, setSuccessMsg] = useState('');
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current); }, []);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const checkDocNumberMut = useMutation({
    mutationFn: async (number: string) => {
      if (!slug || !documentType?.id || !number) return { exists: false };
      const res = await apiGet<{ exists: boolean }>('/documents/check-number', {
        document_number:   number,
        document_type_id:  documentType.id,
        exclude_id:        isEdit ? existingDocument?.id : undefined,
      });
      return res;
    },
  });

  const handleDocNumberChange = async (newNum: string) => {
    setDocNumber(newNum);
    setDocNumberErr('');

    if (!newNum.trim()) {
      setDocNumberErr('رقم المستند إلزامي');
      return;
    }

    setCheckingDocNumber(true);
    try {
      const result = await checkDocNumberMut.mutateAsync(newNum);
      if (result.exists) {
        setDocNumberErr('رقم المستند موجود بالفعل');
      }
    } catch (e) {
      // ignore
    } finally {
      setCheckingDocNumber(false);
    }
  };

  // حفظ المستند
  const saveMut = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      const url     = isEdit ? `/documents/${existingDocument!.id}` : '/documents';
      if (isEdit && docNumber) {
        (payload as Record<string, unknown>).document_number = docNumber;
      }
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
      const docNum = String((savedDoc as Record<string, unknown>)?.document_number ?? '—');
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

  const deleteMut = useMutation({
    mutationFn: () => apiDelete(`/documents/${existingDocument!.id}`),
    onSuccess: () => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
      }
      setSuccessMsg('تم حذف المستند بنجاح');
      successTimer.current = setTimeout(() => {
        setSuccessMsg('');
        onSaved();
        onClose();
      }, 1500);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      setApiErr(String(err?.message ?? 'حدث خطأ أثناء الحذف'));
    },
  });

  const handleDelete = () => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستند؟')) {
      deleteMut.mutate();
    }
  };

  const handleSave = () => {
    setApiErr('');
    if (isEdit) {
      if (!docNumber.trim()) {
        setDocNumberErr('رقم المستند إلزامي');
        return;
      }
      if (docNumberErr) {
        setApiErr('رجاء التحقق من رقم المستند');
        return;
      }
    }
    if (validate()) saveMut.mutate();
  };

  // ✅ handlePartyChange المُحسَّن مع رسالة تحذير
  const handlePartyChangeWithWarning = (id: string) => {
    setPartyChangeWarning('');
    const result = handlePartyChange(id);
    if (result.blocked) {
      setPartyChangeWarning(result.reason ?? 'لا يمكن تغيير الزبون الآن');
    }
  };

  const isPending = saveMut.isPending || deleteMut.isPending || checkingDocNumber;

  // ─── Party options ─────────────────────────────────────────────────────────

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

  // ─── Payment mode options ───────────────────────────────────────────────────

  const paymentModeOptions = useMemo(() =>
    lookups.paymentModes.map((pm) => ({
      id:    pm.id,
      label: pm.name,
      code:  pm.code,
      icon:  pm.icon,
      treasury_account_id: pm.treasury_account_id,
    })),
    [lookups.paymentModes],
  );

  // ✅ خريطة حسابات الخزينة id → name
  const treasuryAccountMap = useMemo(
    () => new Map(lookups.treasuryAccounts.map((ta) => [ta.id, ta])),
    [lookups.treasuryAccounts],
  );

  // ─── Stock badge ────────────────────────────────────────────────────────────

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
        background: isDisabledCompletely ? 'var(--bg3)' : 'var(--bg1)',
        borderRadius: 'var(--r3)',
        boxShadow: '0 24px 60px rgba(0,0,0,.3)',
        overflow: 'hidden',
        opacity: isDisabledCompletely ? 0.75 : 1,
      }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--b1)',
          background: isDisabledCompletely ? 'var(--bg3)' : 'var(--bg2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: isCancelled
                ? 'var(--redb)'
                : `color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 12%, transparent)`,
              border: isCancelled
                ? '1px solid var(--red)'
                : `1px solid color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 25%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`ti ${isCancelled ? 'ti-ban' : isPurchase ? 'ti-truck' : 'ti-receipt'}`}
                style={{ fontSize: 18, color: isCancelled ? 'var(--red)' : isPurchase ? 'var(--blue)' : 'var(--green)' }} />
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
                    {docNumber || String(existingDocument.document_number)}
                  </span>
                )}
                {isCancelled && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)',
                    background: 'var(--redb)', border: '1px solid var(--red)',
                    fontSize: 11, fontWeight: 700, color: 'var(--red)',
                  }}>
                    ملغى
                  </span>
                )}
                {isValidated && !isCancelled && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)',
                    background: 'var(--blueb)', border: '1px solid var(--blue)',
                    fontSize: 11, fontWeight: 700, color: 'var(--blue)',
                  }}>
                    معتمد
                  </span>
                )}
                {isLocked && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)',
                    background: 'var(--bg3)', border: '1px solid var(--b2)',
                    fontSize: 11, fontWeight: 700, color: 'var(--t3)',
                  }}>
                    <i className="ti ti-lock" style={{ marginLeft: 4, fontSize: 10 }} />
                    مقفل
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
                {isCancelled && <span style={{ marginRight: 8, color: 'var(--red)' }}>· لا يمكن تعديل مستند ملغى</span>}
                {isLocked && !isCancelled && <span style={{ marginRight: 8, color: 'var(--t4)' }}>· المستند مقفل — فك القفل للتعديل</span>}
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

          {/* تحذير المستند الملغى */}
          {isCancelled && (
            <AlertBanner
              type="error"
              message="هذا المستند ملغى ولا يمكن تعديله. جميع الحقول معطلة."
            />
          )}

          {/* تحذير المستند المقفل */}
          {isLocked && !isCancelled && (
            <AlertBanner
              type="warning"
              message="هذا المستند مقفل. لا يمكن تعديله حتى يتم فك القفل من قِبل المسؤول."
            />
          )}

          {/* ✅ تحذير تغيير الزبون */}
          {partyChangeWarning && (
            <AlertBanner
              type="warning"
              message={partyChangeWarning}
              onDismiss={() => setPartyChangeWarning('')}
            />
          )}

          {/* SECTION 1: معلومات المستند */}
          <Section title="معلومات المستند" icon="ti-file-description">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 12,
              opacity: isDisabledCompletely ? 0.5 : 1,
            }}>
              {/* رقم المستند (عند التعديل) */}
              {isEdit && (
                <div>
                  <Label required>رقم المستند</Label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      style={{
                        width: '100%', padding: '7px 10px', paddingLeft: checkingDocNumber ? 28 : 10,
                        borderRadius: 'var(--r2)',
                        border: `1px solid ${docNumberErr ? 'var(--red)' : 'var(--b3)'}`,
                        background: isDisabledCompletely ? 'var(--bg3)' : 'var(--bg1)',
                        color: 'var(--t1)',
                        fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                      }}
                      value={docNumber}
                      disabled={isDisabledCompletely || isLocked}
                      onChange={(e) => handleDocNumberChange(e.target.value)}
                      placeholder="أدخل رقم المستند..."
                    />
                    {checkingDocNumber && (
                      <i className="ti ti-loader" style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 12, animation: 'spin 1s linear infinite',
                      }} />
                    )}
                  </div>
                  <FieldError msg={docNumberErr} />
                </div>
              )}

              {/* المتعامل */}
              {needsParty && (
                <div style={{ gridColumn: 'span 2' }}>
                  <Label required>{isPurchase ? 'المورد' : 'الزبون'}</Label>
                  <ComboBox
                    options={partyOptions}
                    value={form.party_id}
                    onChange={handlePartyChangeWithWarning}
                    placeholder={`— ابحث عن ${isPurchase ? 'مورد' : 'زبون'} —`}
                    disabled={disableFields}  // ✅ الحقول الأساسية معطلة فقط للـ locked/cancelled
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
                    background: disableFields ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                  }}
                  value={form.document_date}
                  disabled={disableFields}
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
                    background: disableFields ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                  }}
                  value={form.due_date}
                  min={form.document_date}
                  disabled={disableFields}
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
                    background: disableFields ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', cursor: 'pointer',
                  }}
                  value={form.warehouse_id}
                  disabled={disableFields}
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
                    background: disableFields ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', cursor: 'pointer',
                  }}
                  value={form.fiscal_year_id}
                  disabled={disableFields}
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
                    background: disableFields ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', cursor: 'pointer',
                  }}
                  value={form.currency_id}
                  disabled={disableFields}
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
                    disabled={disableFields}
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
                    border: '1px solid var(--b3)',
                    background: disableForm ? 'var(--bg3)' : 'var(--bg1)',
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
            ) : (
              <div style={{ overflowX: 'auto' }}>
                {form.lines.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg3)', borderBottom: '2px solid var(--b2)' }}>
                        {ALL_COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => (
                          <th key={col.key} style={{
                            padding: '6px 8px', textAlign: 'right', fontWeight: 700,
                            color: 'var(--t3)', fontSize: 11, whiteSpace: 'nowrap',
                            minWidth: col.w,
                          }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.lines.map((line, idx) => {
                        const stockResult = line._product
                          ? validateLineStock(line, line._product, isPurchase, stockData)
                          : { ok: true as const };
                        return (
                          <DocumentLineRow
                            key={idx}
                            line={line}
                            idx={idx}
                            visibleCols={visibleCols}
                            isPurchase={isPurchase}
                            disabled={disableLines}  // ✅ الأسطر معطلة للمعتمدة + المقفولة + الملغاة
                            products={lookups.products}
                            stockData={stockData}
                            stockValidation={stockResult}
                            onUpdate={updateLine}
                            onRemove={removeLine}
                            onDuplicate={duplicateLine}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ✅ زر إضافة سطر — يعتمد على !disableLines */}
            {!disableLines && (
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

          {/* SECTION 3: الدفعات — يظهر لجميع المستندات (بيع وشراء) */}
          <Section title="الدفعات" icon="ti-wallet" collapsible>
              {form.payments.length === 0 && (
                <div style={{ padding: 12, fontSize: 12, color: 'var(--t4)',
                  background: 'var(--bg3)', borderRadius: 'var(--r2)', marginBottom: 12 }}>
                  {isDisabledCompletely
                    ? 'المستند ملغى — لا يمكن إضافة دفعات.'
                    : 'لم تتم إضافة دفعات بعد. سيتم إنشاء فاتورة بدون تسديد.'}
                </div>
              )}

              {form.payments.map((pay, idx) => {
                const selectedMode = lookups.paymentModes.find(
                  (pm) => String(pm.id) === pay.payment_mode_id,
                );

                // ✅ حساب الخزينة: إما من التحديد التلقائي أو من الحقل اليدوي
                const treasuryAccountId = pay.treasury_account_id
                  ? parseInt(String(pay.treasury_account_id))
                  : selectedMode?.treasury_account_id ?? null;
                const treasuryAccount = treasuryAccountId
                  ? treasuryAccountMap.get(treasuryAccountId)
                  : null;

                const remainingAmount = totals.remaining;
                const isLastPayment = idx === form.payments.length - 1;

                return (
                  <div key={idx} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 130px 160px 120px 1fr 32px',
                    gap: 8, marginBottom: 12, alignItems: 'end',
                    padding: 12, borderRadius: 'var(--r2)',
                    background: 'var(--bg2)', border: '1px solid var(--b2)',
                  }}>
                    {/* طريقة الدفع */}
                    <div>
                      {idx === 0 && <Label>طريقة الدفع</Label>}
                      <select
                        style={{
                          width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                          border: '1px solid var(--b3)', background: 'var(--bg1)',
                          color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                          outline: 'none', cursor: isDisabledCompletely ? 'not-allowed' : 'pointer',
                        }}
                        value={pay.payment_mode_id}
                        disabled={isDisabledCompletely}
                        onChange={(e) => updatePayment(idx, { payment_mode_id: e.target.value })}
                      >
                        <option value="">— اختر —</option>
                        {paymentModeOptions.map((pm) => (
                          <option key={pm.id} value={String(pm.id)}>
                            {pm.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* المبلغ */}
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
                        disabled={isDisabledCompletely}
                        onChange={(e) => updatePayment(idx, { amount: e.target.value })}
                        placeholder="0.00"
                      />
                      {/* زر ملء المبلغ المتبقي */}
                      {isLastPayment && remainingAmount > 0 && !isDisabledCompletely && (
                        <button
                          type="button"
                          onClick={() => updatePayment(idx, {
                            amount: String(Math.max(0, remainingAmount)),
                          })}
                          style={{
                            fontSize: 10, fontWeight: 600, color: 'var(--em)',
                            marginTop: 4, padding: 0, background: 'none', border: 'none',
                            cursor: 'pointer', textDecoration: 'underline',
                          }}
                        >
                          ملء المتبقي ({fmtDZD(Math.max(0, remainingAmount))})
                        </button>
                      )}
                    </div>

                    {/* المرجع */}
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
                        disabled={isDisabledCompletely}
                        onChange={(e) => updatePayment(idx, { reference: e.target.value })}
                        placeholder={selectedMode?.requires_reference ? 'إلزامي' : 'اختياري...'}
                      />
                    </div>

                    {/* تاريخ الدفع */}
                    <div>
                      {idx === 0 && <Label>التاريخ</Label>}
                      <input
                        type="date"
                        style={{
                          width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                          border: '1px solid var(--b3)', background: 'var(--bg1)',
                          color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                          outline: 'none',
                        }}
                        value={pay.payment_date}
                        disabled={isDisabledCompletely}
                        onChange={(e) => updatePayment(idx, { payment_date: e.target.value })}
                      />
                    </div>

                    {/* ✅ حساب الخزينة — يعرض اسم الحساب أو يسمح بالاختيار */}
                    <div>
                      {idx === 0 && <Label>الحساب</Label>}
                      {(() => {
                        const autoAcctId   = selectedMode?.treasury_account_id ?? null;
                        const manualStr    = pay.treasury_account_id ? String(pay.treasury_account_id) : '';
                        const effectiveId  = autoAcctId ?? (manualStr ? parseInt(manualStr) : null);
                        const acct         = effectiveId ? treasuryAccountMap.get(effectiveId) : null;

                        if (autoAcctId) {
                          // حساب تلقائي — عرض فقط
                          return (
                            <div style={{
                              padding: '7px 10px', borderRadius: 'var(--r2)',
                              border: '1px solid var(--b3)', background: 'var(--bg3)',
                              fontSize: 12, height: 38, display: 'flex', alignItems: 'center',
                              gap: 6, overflow: 'hidden',
                            }}>
                              {acct ? (
                                <>
                                  <i className={`ti ${
                                    acct.type === 'bank' ? 'ti-building-bank' :
                                    acct.type === 'cash' ? 'ti-cash' : 'ti-credit-card'
                                  }`} style={{ fontSize: 12, color: 'var(--t4)', flexShrink: 0 }} />
                                  <span style={{
                                    color: 'var(--t2)', fontWeight: 600,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {acct.name}
                                  </span>
                                </>
                              ) : (
                                <span style={{ color: 'var(--t4)' }}>ح/ {autoAcctId}</span>
                              )}
                            </div>
                          );
                        }

                        // لا حساب تلقائي — قائمة اختيار يدوي
                        return (
                          <select
                            style={{
                              width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                              border: '1px solid var(--b3)',
                              background: isDisabledCompletely ? 'var(--bg3)' : 'var(--bg1)',
                              color: 'var(--t1)', fontSize: 12,
                              fontFamily: 'Tajawal, sans-serif', outline: 'none',
                              cursor: isDisabledCompletely ? 'not-allowed' : 'pointer',
                              height: 38,
                            }}
                            value={manualStr}
                            disabled={isDisabledCompletely}
                            onChange={(e) => updatePayment(idx, { treasury_account_id: e.target.value })}
                          >
                            <option value="">— اختر حساباً —</option>
                            {lookups.treasuryAccounts.map((ta) => (
                              <option key={ta.id} value={String(ta.id)}>
                                {ta.name} ({ta.type === 'bank' ? 'بنك' : ta.type === 'cash' ? 'نقدية' : 'شيك'})
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>

                    {/* حذف */}
                    <button
                      onClick={() => removePayment(idx)}
                      disabled={isDisabledCompletely}
                      style={{
                        width: 32, height: 32, borderRadius: 'var(--r1)',
                        border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
                        background: 'var(--redb)', color: 'var(--red)',
                        cursor: isDisabledCompletely ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        alignSelf: 'flex-end',
                      }}
                    >
                      <i className="ti ti-trash" style={{ fontSize: 13 }} />
                    </button>
                  </div>
                );
              })}

              {/* ✅ زر إضافة دفعة — يعتمد على !isDisabledCompletely (أي غير ملغى) */}
              {!isDisabledCompletely && (
                <button
                  onClick={addPayment}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 'var(--r2)',
                    border: '1px dashed var(--b3)', background: 'transparent',
                    color: 'var(--t3)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
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
                  إضافة دفعة
                </button>
              )}
            </Section>

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
              disabled={disableForm}  // ✅ الطابع معطل فقط للـ locked/cancelled
            />
          </Section>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--b1)',
          background: isDisabledCompletely ? 'var(--bg3)' : 'var(--bg2)',
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
            {/* زر الحذف */}
            {isEdit && !isDisabledCompletely && !isLocked && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                title="حذف المستند"
                style={{
                  padding: '8px 16px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--red)', background: 'var(--redb)',
                  color: 'var(--red)', cursor: isPending ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <i className="ti ti-trash" />
                حذف المستند
              </button>
            )}

            <button
              onClick={onClose}
              disabled={isPending || !!successMsg}
              style={{
                padding: '8px 18px', borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)', background: 'var(--bg1)',
                color: 'var(--t2)', cursor: isPending || !!successMsg ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600,
              }}
            >
              {isDisabledCompletely ? 'إغلاق' : 'إلغاء'}
            </button>

            {/* زر الحفظ — يُخفى فقط إذا كان cancelled أو locked */}
            {!isDisabledCompletely && !isLocked && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
