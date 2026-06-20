

# =========================================
# 📘 Documents
# =========================================

## FILE: resources/js/pages/documents/CommercialDocumentModal.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/CommercialDocumentModal.tsx — إعادة هيكلة كاملة
//
// ══ سيناريوهات مُغطَّاة في هذا الملف ════════════════════════════════════════
//
// [حالة المستند]
//  draft/pending   → كامل الحرية (حقول + أسطر + دفعات)
//  validated/paid  → الأسطر للقراءة، الدفعات إضافية فقط، الحقول حرة
//  locked          → قراءة فقط كاملة (شارة مقفل)
//  cancelled       → قراءة فقط كاملة (شارة ملغى)
//
// [الدفعات — additive mode]
//  الدفعات القديمة → جدول للقراءة (لا حذف، لا تعديل)
//  الدفعات الجديدة → نموذج قابل للتعديل مع تحقق كامل
//  زر "إضافة دفعة" → ظاهر فقط في free/additive
//
// [تغيير المتعامل]
//  يُستدعى handlePartyChange → إذا blocked تُعرض AlertBanner واضحة
//  أنواع الحجب: existing_payments / has_payments / price_level_change
//
// [فئة السعر]
//  تغيير فئة السعر → handlePriceLevelChange → إعادة حساب أسعار كل الأسطر
//
// [رصيد المتعامل]
//  يُعرَض في Section "معلومات المستند" بعد اختيار الزبون
//  debit (مدين لنا): أخضر  |  credit (نحن مدينون): أحمر
//  تحذير إذا كان الرصيد > netToPay × 2
//
// [payload]
//  free mode   → lines + payments كاملة
//  additive    → لا lines، فقط new_payments
//  locked      → حفظ محجوب
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
import type { PartyChangeResult } from './hooks/useDocumentForm';
import { useDocumentChain, useConvertDocument } from './hooks/useDocumentChain';
import { useCreditCheck }      from './hooks/useCreditCheck';
import { useCustomerInsights } from './hooks/useCustomerInsights';
import { DocumentChainPanel }  from './components/DocumentChainPanel';
import { CreditCheckBar }      from './components/CreditCheckBar';
import { ReturnDocumentModal } from './components/ReturnDocumentModal';
import { CheckFormFields }     from './components/CheckFormFields';
import { ShippingInfoSection } from './components/ShippingInfoSection';
import { PaymentTermsTable }   from './components/PaymentTermsTable';
import { DocumentLineRow }     from './components/DocumentLineRow';
import { CustomerInsightPanel } from './components/CustomerInsightPanel';
import { useProductSuggestions } from './hooks/useProductSuggestions';
import { useAdvancePayments } from './hooks/useAdvancePayments';
import { SmartSuggestionsPanel } from './components/SmartSuggestionsPanel';
import { AdvancePaymentsPanel } from './components/AdvancePaymentsPanel';
import {
  Section, Label, FieldError, Toggle, TotalCard,
  ComboBox, ColumnManager, AlertBanner, Tabs,
} from './components/DocumentUIPrimitives';
import type { Tab } from './components/DocumentUIPrimitives';
import { ALL_COLUMNS, PURCHASE_CODES, CONVERSION_MAP, RETURNABLE_CODES, SHIPPING_CODES } from './types/document.types';
import type { ColKey, PaymentEntry } from './types/document.types';
import {
  fmtDZD, fmtDate, loadVisibleCols, saveVisibleCols,
  validateLineStock, toNum,
} from './utils/document.utils';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CommercialDocumentModalProps {
  open:               boolean;
  documentType:       DocumentType | null;
  existingDocument?:  Record<string, unknown>;
  onClose:            () => void;
  onSaved:            () => void;
}

// ─── PartyBalanceBadge ────────────────────────────────────────────────────────

function PartyBalanceBadge({
  balance,
  isLoading,
  partyLabel,
}: {
  balance:    import('./hooks/useDocumentForm').PartyBalanceInfo | null;
  isLoading:  boolean;
  partyLabel: string;
}) {
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        fontSize: 11, color: 'var(--t4)', marginTop: 6,
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 12 }} />
        جاري تحميل رصيد {partyLabel}...
      </div>
    );
  }

  if (!balance) return null;

  const isDebit    = balance.balance_type === 'debit';
  const color      = isDebit ? 'var(--green)' : 'var(--red)';
  const bg         = isDebit ? 'var(--greenb)' : 'var(--redb)';
  const icon       = isDebit ? 'ti-trending-up' : 'ti-trending-down';
  const typeLabel  = isDebit ? 'مدين لنا' : 'نحن مدينون';

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center',
    }}>
      {/* الرصيد الحالي */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 'var(--r2)',
        background: bg, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        fontSize: 12,
      }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 13 }} />
        <span style={{ color: 'var(--t3)' }}>رصيد {partyLabel}:</span>
        <span style={{ fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
          {fmtDZD(balance.current_balance)} دج
        </span>
        <span style={{
          padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 700,
          background: color, color: 'white',
        }}>
          {typeLabel}
        </span>
      </div>

      {/* تفاصيل */}
      <div style={{
        display: 'flex', gap: 8, fontSize: 10.5, color: 'var(--t4)', flexWrap: 'wrap',
      }}>
        <span>رصيد افتتاحي: <b>{fmtDZD(balance.opening_balance)}</b></span>
        <span>·</span>
        <span>مستندات: <b>{fmtDZD(balance.documents_balance)}</b></span>
        <span>·</span>
        <span>دفعات: <b>{fmtDZD(balance.payments_total)}</b></span>
      </div>
    </div>
  );
}

// ─── ExistingPaymentsTable ────────────────────────────────────────────────────
// عرض الدفعات القديمة للقراءة فقط في additive mode

function ExistingPaymentsTable({
  payments,
  paymentModes,
  treasuryAccountMap,
}: {
  payments:           PaymentEntry[];
  paymentModes:       Array<{ id: number; name: string }>;
  treasuryAccountMap: Map<number, { id: number; name: string; type: string }>;
}) {
  if (payments.length === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        padding: '6px 10px', fontSize: 10.5, fontWeight: 800,
        color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: 0.4,
        borderBottom: '1px solid var(--b1)', marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <i className="ti ti-lock" style={{ fontSize: 11 }} />
        دفعات مُسجَّلة (للقراءة)
        <span style={{
          padding: '1px 6px', borderRadius: 99, fontSize: 10,
          background: 'var(--bg3)', color: 'var(--t4)',
        }}>
          {payments.length}
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>
            {['طريقة الدفع', 'المبلغ', 'المرجع', 'التاريخ', 'الحساب'].map((h) => (
              <th key={h} style={{
                padding: '5px 8px', textAlign: 'right', fontSize: 10.5,
                fontWeight: 700, color: 'var(--t4)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((pay, idx) => {
            const mode = paymentModes.find((pm) => String(pm.id) === pay.payment_mode_id);
            const taId = pay.treasury_account_id ? parseInt(String(pay.treasury_account_id)) : null;
            const ta   = taId ? treasuryAccountMap.get(taId) : null;
            return (
              <tr key={idx} style={{ borderBottom: '1px solid var(--b1)' }}>
                <td style={{ padding: '6px 8px', color: 'var(--t2)' }}>
                  {mode?.name ?? `#${pay.payment_mode_id}`}
                </td>
                <td style={{
                  padding: '6px 8px', fontWeight: 700, color: 'var(--green)',
                  direction: 'ltr', textAlign: 'right',
                }}>
                  {fmtDZD(pay.amount)} دج
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--t4)', fontSize: 11 }}>
                  {pay.reference || '—'}
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--t3)', fontSize: 11 }}>
                  {fmtDate(pay.payment_date)}
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--t4)', fontSize: 11 }}>
                  {ta ? `${ta.name}` : pay.treasury_account_id ? `#${pay.treasury_account_id}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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

  // ─── Column visibility ────────────────────────────────────────────────────

  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    () => loadVisibleCols(slug ?? 'default'),
  );
  const handleColsChange = (cols: Set<ColKey>) => {
    setVisibleCols(cols);
    saveVisibleCols(slug ?? 'default', cols);
  };

  // ─── Lookups ──────────────────────────────────────────────────────────────

  const lookups = useDocumentLookups({
    open,
    isPurchase,
    needsParty:  true,
    warehouseId:  null,
    fiscalYearId: selectedYear?.id ?? null,
  });

  // ─── Form ─────────────────────────────────────────────────────────────────

  const {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, removeLine, duplicateLine, updateLine,
    paymentMode: pmMode,
    existingPayments,
    newPayments,
    addPayment, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    updateStockData,
    needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
  } = useDocumentForm({
    documentType,
    existingDocument,
    defaultTvaRate:     lookups.defaultTvaRate,
    defaultWarehouseId: lookups.defaultWarehouseId,
    baseCurrencyId:     lookups.baseCurrencyId,
    selectedYearId:     selectedYear?.id ? String(selectedYear.id) : '',
    paymentModes:       lookups.paymentModes,
    parties:            lookups.parties,
    products:           lookups.products,
    stockData:          {},
    isPurchase,
    open,
  });

  // ─── حالة المستند ─────────────────────────────────────────────────────────

  const docStatusName = String(
    (existingDocument?.document_status as Record<string, unknown> | undefined)?.name
    ?? existingDocument?.status
    ?? '',
  ).toLowerCase();

  const isLocked    = !!(existingDocument?.is_locked);
  const isCancelled = docStatusName === 'cancelled' || docStatusName === 'returned';
  const VALIDATED_STATUSES = new Set(['validated', 'paid', 'partially_paid', 'overdue']);
  const isValidated = !isLocked && !isCancelled && VALIDATED_STATUSES.has(docStatusName);

  // ─── Stock query ──────────────────────────────────────────────────────────

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

  // ─── Document number ──────────────────────────────────────────────────────

  const [docNumber,         setDocNumber]         = useState('');
  const [docNumberErr,      setDocNumberErr]       = useState('');
  const [checkingDocNumber, setCheckingDocNumber]  = useState(false);

  useEffect(() => {
    setDocNumber(isEdit && existingDocument?.document_number
      ? String(existingDocument.document_number)
      : '');
  }, [isEdit, existingDocument?.document_number, open]);

  const checkDocNumberMut = useMutation({
    mutationFn: async (number: string) => {
      if (!slug || !documentType?.id || !number) return { exists: false };
      return apiGet<{ exists: boolean }>('/documents/check-number', {
        document_number:  number,
        document_type_id: documentType.id,
        exclude_id:       isEdit ? existingDocument?.id : undefined,
      });
    },
  });

  const handleDocNumberChange = async (newNum: string) => {
    setDocNumber(newNum);
    setDocNumberErr('');
    if (!newNum.trim()) { setDocNumberErr('رقم المستند إلزامي'); return; }
    setCheckingDocNumber(true);
    try {
      const result = await checkDocNumberMut.mutateAsync(newNum);
      if (result.exists) setDocNumberErr('رقم المستند موجود بالفعل');
    } catch { /* ignore */ }
    finally { setCheckingDocNumber(false); }
  };

  // ─── تحذير تغيير المتعامل ─────────────────────────────────────────────────

  const [partyChangeWarning, setPartyChangeWarning] = useState<{
    message:   string;
    blockType: PartyChangeResult['blockType'];
  } | null>(null);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [extraTab, setExtraTab] = useState('shipping');

  // ─── Document chain ───────────────────────────────────────────────────────
  const { data: chain, isLoading: isLoadingChain } = useDocumentChain(
    isEdit ? Number(existingDocument?.id) : null,
  );
  const convertMutation = useConvertDocument();

  const { data: docTypes = [] } = useQuery({
    queryKey: [slug, 'document-types'],
    queryFn:  () => apiGet<DocumentType[]>('/document-types', { per_page: 500 })
      .then(r => (Array.isArray(r) ? r : (r as unknown as { data: DocumentType[] })?.data ?? [])),
    staleTime: 10 * 60_000,
    enabled:   !!slug,
  });

  const targetCodes  = CONVERSION_MAP[docCode] ?? [];
  const allowedTargets = useMemo(() =>
    targetCodes.map(code => {
      const dt = docTypes.find(d => d.code === code);
      return { code, name: dt?.name ?? code };
    }),
    [targetCodes, docTypes],
  );

  // ─── Credit check ─────────────────────────────────────────────────────────
  const { data: creditCheck, isLoading: isLoadingCredit } = useCreditCheck({
    partyId:    form.party_id ? parseInt(form.party_id) : null,
    amount:     totals.netToPay,
    date:       form.document_date,
    isPurchase,
    enabled:    open && needsParty && !isPurchase,
  });

  const { data: customerInsights, isLoading: isLoadingInsights } = useCustomerInsights(
    form.party_id ? parseInt(form.party_id) : null,
    !!open && needsParty && !!form.party_id,
  );

  const { data: productSuggestions, isLoading: isLoadingSuggestions } = useProductSuggestions(
    form.party_id ? parseInt(form.party_id) : null,
    isPurchase,
    !!open && needsParty && !!form.party_id && !isLinesReadOnly,
  );

  const { data: advancePayments, isLoading: isLoadingAdvances } = useAdvancePayments(
    form.party_id ? parseInt(form.party_id) : null,
    !!open && needsParty && !!form.party_id && (documentType?.affects_accounting ?? false) && !form.is_proforma,
  );

  const handlePartyChangeWithWarning = (id: string) => {
    setPartyChangeWarning(null);
    const result = handlePartyChange(id);
    if (result.blocked) {
      setPartyChangeWarning({
        message:   result.reason ?? 'لا يمكن تغيير المتعامل الآن',
        blockType: result.blockType,
      });
    }
  };

  // ─── Success state ────────────────────────────────────────────────────────

  const [successMsg, setSuccessMsg] = useState('');
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current); }, []);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = buildPayload();

      // ✅ وضع additive: فقط new_payments → endpoint مخصص
      if (pmMode === 'additive' && isEdit) {
        const newPaymentsPayload = (payload.new_payments ?? []) as Array<Record<string, unknown>>;
        if (newPaymentsPayload.length === 0) {
          // لا دفعات جديدة — حفظ الحقول الأخرى فقط (ملاحظات، تاريخ، ...)
          const basePayload = { ...payload };
          delete basePayload.new_payments;
          delete basePayload.lines;
          return apiPut<Record<string, unknown>>(`/documents/${existingDocument!.id}`, basePayload);
        }
        // إرسال الدفعات الجديدة عبر endpoint مخصص
        return apiPost<Record<string, unknown>>(
          `/documents/${existingDocument!.id}/payments`,
          { payments: newPaymentsPayload },
        );
      }

      // ✅ وضع free: إرسال كامل
      const url = isEdit ? `/documents/${existingDocument!.id}` : '/documents';
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
        // تحديث رصيد المتعامل
        if (form.party_id) {
          qc.invalidateQueries({ queryKey: [slug, 'party-balance', parseInt(form.party_id)] });
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
      const errMsg = err?.message ?? 'حدث خطأ أثناء الحفظ';
      // استخراج رسائل validation من Laravel
      const validationErrors = (err as Record<string, unknown>)?.errors as Record<string, string[]> | undefined;
      if (validationErrors) {
        const firstMsg = Object.values(validationErrors).flat()[0];
        setApiErr(firstMsg ?? String(errMsg));
      } else {
        setApiErr(String(errMsg));
      }
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => apiDelete(`/documents/${existingDocument!.id}`),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
      setSuccessMsg('تم حذف المستند بنجاح');
      successTimer.current = setTimeout(() => {
        setSuccessMsg(''); onSaved(); onClose();
      }, 1500);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      setApiErr(String(err?.message ?? 'لا يمكن حذف هذا المستند — استخدم الإلغاء بدلاً من الحذف'));
    },
  });

  const handleSave = () => {
    setApiErr('');
    if (isReadOnly) return;
    if (isEdit && !docNumber.trim()) {
      setDocNumberErr('رقم المستند إلزامي'); return;
    }
    if (docNumberErr) { setApiErr('رجاء التحقق من رقم المستند'); return; }
    if (validate()) saveMut.mutate();
  };

  const handleDelete = () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟\n\nملاحظة: الحذف غير مدعوم — استخدم الإلغاء.')) return;
    deleteMut.mutate();
  };

  const confirmProformaMut = useMutation({
    mutationFn: () => apiPut(`/documents/${existingDocument!.id}`, { is_proforma: false }),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
      setSuccessMsg('تم تحويل المستند إلى فاتورة حقيقية ✓');
      setTimeout(() => { setSuccessMsg(''); onSaved(); onClose(); }, 1800);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      setApiErr(String(err?.message ?? 'فشل التحويل'));
    },
  });

  const handleConfirmProforma = () => {
    if (!window.confirm('سيتم تحويل هذا المستند المبدئي إلى فاتورة حقيقية. سيتم إنشاء حركات المخزون والدفعات. هل تتابع؟')) return;
    confirmProformaMut.mutate();
  };

  const isPending = saveMut.isPending || deleteMut.isPending || confirmProformaMut.isPending || checkingDocNumber;

  // ─── Memos ────────────────────────────────────────────────────────────────

  const isPartyExempt = lookups.parties.find(
    (p) => String(p.id) === form.party_id,
  )?.is_tva_exempt ?? false;

  const partyOptions = useMemo(() =>
    lookups.parties.map((p) => ({
      id:    p.id,
      label: p.name,
      sub:   [(p as Record<string, unknown>).code, (p as Record<string, unknown>).phone].filter(Boolean).join(' · '),
      badge: (p as Record<string, unknown>).is_tva_exempt ? 'معفى' : p.price_level?.name,
    })),
    [lookups.parties],
  );

  const priceLevelOptions = useMemo(() =>
    lookups.priceLevels.map((pl) => ({
      id:    Number(pl.id),
      label: String(pl.name),
    })),
    [lookups.priceLevels],
  );

  const paymentModeOptions = useMemo(() =>
    lookups.paymentModes.map((pm) => ({
      id:                  pm.id,
      label:               pm.name,
      treasury_account_id: pm.treasury_account_id,
      requires_reference:  pm.requires_reference,
    })),
    [lookups.paymentModes],
  );

  const treasuryAccountMap = useMemo(
    () => new Map(lookups.treasuryAccounts.map((ta) => [ta.id, ta])),
    [lookups.treasuryAccounts],
  );

  const selectedParty = useMemo(
    () => lookups.parties.find((p) => String(p.id) === form.party_id),
    [lookups.parties, form.party_id],
  );

  const stockBadge = useMemo(() => {
    if (!affectsStock) return null;
    return stockDir > 0
      ? { text: 'يضيف مخزون', bg: 'var(--greenb)', color: 'var(--green)' }
      : { text: 'يخصم مخزون', bg: 'var(--redb)',   color: 'var(--red)'   };
  }, [affectsStock, stockDir]);

  // P8: تحذير مجموع الدفعات > netToPay
  const paymentsExceedWarning = useMemo(() => {
    const allPaid = [...existingPayments, ...newPayments]
      .reduce((acc, p) => acc + toNum(p.amount), 0);
    if (allPaid > totals.netToPay + 0.01 && totals.netToPay > 0) {
      return `مجموع الدفعات (${fmtDZD(allPaid)} دج) يتجاوز المبلغ المستحق (${fmtDZD(totals.netToPay)} دج)`;
    }
    return null;
  }, [existingPayments, newPayments, totals.netToPay]);

  // تحذير رصيد المتعامل الكبير
  const balanceWarning = useMemo(() => {
    if (!partyBalance || partyBalance.current_balance <= 0) return null;
    if (partyBalance.balance_type !== 'debit') return null; // نحن ندين → لا تحذير
    if (totals.netToPay <= 0) return null;
    if (partyBalance.current_balance > totals.netToPay * 2) {
      return `رصيد ${selectedParty?.name ?? 'المتعامل'} المتراكم (${fmtDZD(partyBalance.current_balance)} دج) كبير — تأكد من تسوية الحسابات`;
    }
    return null;
  }, [partyBalance, totals.netToPay, selectedParty]);

  // ─── Guard ────────────────────────────────────────────────────────────────

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
        background: isCancelled ? 'var(--bg3)' : 'var(--bg1)',
        borderRadius: 'var(--r3)',
        boxShadow: '0 24px 60px rgba(0,0,0,.3)',
        overflow: 'hidden',
        opacity: isCancelled ? 0.8 : 1,
      }}>

        {/* ════════════════════════════════════════════════════════════════
            HEADER
        ════════════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--b1)',
          background: isCancelled ? 'var(--bg3)' : 'var(--bg2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              <i
                className={`ti ${isCancelled ? 'ti-ban' : isPurchase ? 'ti-truck' : 'ti-receipt'}`}
                style={{
                  fontSize: 18,
                  color: isCancelled ? 'var(--red)' : isPurchase ? 'var(--blue)' : 'var(--green)',
                }}
              />
            </div>

            <div>
              <div style={{
                fontSize: 14, fontWeight: 800, color: 'var(--t1)',
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
              }}>
                {isEdit ? `تعديل ${documentType?.name}` : `${documentType?.name} جديد`}

                {/* رقم المستند */}
                {isEdit && existingDocument?.document_number && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)',
                    background: 'var(--bg1)', border: '1px solid var(--b2)',
                    fontSize: 12, fontWeight: 700, color: 'var(--em)',
                  }}>
                    {docNumber || String(existingDocument.document_number)}
                  </span>
                )}

                {/* شارات الحالة */}
                {isCancelled && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)',
                    background: 'var(--redb)', border: '1px solid var(--red)',
                    fontSize: 11, fontWeight: 700, color: 'var(--red)',
                  }}>ملغى</span>
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
                {isValidated && !isCancelled && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)',
                    background: 'var(--blueb)', border: '1px solid var(--blue)',
                    fontSize: 11, fontWeight: 700, color: 'var(--blue)',
                  }}>معتمد</span>
                )}
                {form.is_proforma && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)',
                    background: 'color-mix(in srgb, var(--orange) 12%, transparent)',
                    border: '1px solid var(--orange)',
                    fontSize: 11, fontWeight: 700, color: 'var(--orange)',
                  }}>
                    <i className="ti ti-file-description" style={{ marginLeft: 4, fontSize: 10 }} />
                    مبدئية
                  </span>
                )}
                {pmMode === 'additive' && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)',
                    background: 'color-mix(in srgb, var(--orange) 12%, transparent)',
                    border: '1px solid var(--orange)',
                    fontSize: 10, fontWeight: 700, color: 'var(--orange)',
                  }}>
                    <i className="ti ti-plus" style={{ marginLeft: 3, fontSize: 9 }} />
                    دفعات إضافية فقط
                  </span>
                )}
                {stockBadge && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--r1)',
                    fontSize: 11, fontWeight: 700,
                    background: stockBadge.bg, color: stockBadge.color,
                  }}>
                    {stockBadge.text}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                {documentType?.name} — {docCode}
                {!isEdit && <span style={{ marginRight: 8 }}>· رقم الوثيقة يُولَّد تلقائياً</span>}
                {isCancelled && <span style={{ marginRight: 8, color: 'var(--red)' }}>· لا يمكن تعديل مستند ملغى</span>}
                {isLocked && !isCancelled && <span style={{ marginRight: 8, color: 'var(--t4)' }}>· مقفل — فك القفل للتعديل</span>}
                {pmMode === 'additive' && !isLocked && (
                  <span style={{ marginRight: 8, color: 'var(--orange)' }}>
                    · الأسطر للقراءة — يمكن إضافة دفعات جديدة فقط
                  </span>
                )}
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

        {/* ════════════════════════════════════════════════════════════════
            BODY
        ════════════════════════════════════════════════════════════════ */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>

          {/* Alerts عامة */}
          {successMsg         && <AlertBanner type="success" message={successMsg} />}
          {apiErr             && <AlertBanner type="error"   message={apiErr} />}
          {isCancelled        && <AlertBanner type="error"   message="هذا المستند ملغى — جميع الحقول معطلة." />}
          {isLocked && !isCancelled && (
            <AlertBanner type="warning" message="هذا المستند مقفل. لا يمكن تعديله حتى يتم فك القفل من قِبل المسؤول." />
          )}
          {pmMode === 'additive' && !isLocked && (
            <AlertBanner
              type="info"
              message="المستند معتمد — الأسطر محمية من التعديل. يمكنك فقط إضافة دفعات جديدة."
            />
          )}

          {/* سلسلة المستندات */}
          {isEdit && (
            <DocumentChainPanel
              chain={chain}
              isLoading={isLoadingChain}
              currentId={Number(existingDocument?.id)}
              allowedTargets={allowedTargets}
              isReadOnly={isReadOnly}
              onConvert={(targetCode) => {
                if (!window.confirm(`تحويل هذا المستند إلى ${targetCode}؟`)) return;
                convertMutation.mutate(
                  { documentId: Number(existingDocument!.id), targetTypeCode: targetCode },
                  { onSuccess: () => { onSaved(); onClose(); } },
                );
              }}
              onNavigate={(docId) => {
                onClose();
                // navigate to document — تعديل حسب router الخاص بك
                window.location.href = `?document=${docId}`;
              }}
            />
          )}

          {/* تحذير تغيير المتعامل */}
          {partyChangeWarning && (
            <div style={{
              padding: '10px 14px', marginBottom: 14,
              borderRadius: 'var(--r2)',
              background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
              border: '1px solid var(--orange)',
              fontSize: 12.5, color: 'var(--orange)',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <i className="ti ti-alert-triangle" style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>
                  {partyChangeWarning.blockType === 'existing_payments' && 'دفعات مُسجَّلة في المستند'}
                  {partyChangeWarning.blockType === 'has_payments'      && 'دفعات في النموذج'}
                  {partyChangeWarning.blockType === 'price_level_change' && 'تعارض فئة السعر'}
                  {!partyChangeWarning.blockType                         && 'لا يمكن تغيير المتعامل'}
                </div>
                <div>{partyChangeWarning.message}</div>
              </div>
              <button
                onClick={() => setPartyChangeWarning(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--orange)', padding: 0, fontSize: 13, flexShrink: 0,
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SECTION 1: معلومات المستند
          ══════════════════════════════════════════════════════════════ */}
          <Section title="معلومات المستند" icon="ti-file-description">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 12,
            }}>

              {/* رقم المستند */}
              {isEdit && (
                <div>
                  <Label required>رقم المستند</Label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      style={{
                        width: '100%', padding: '7px 10px',
                        paddingLeft: checkingDocNumber ? 28 : 10,
                        borderRadius: 'var(--r2)',
                        border: `1px solid ${docNumberErr ? 'var(--red)' : 'var(--b3)'}`,
                        background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
                        color: 'var(--t1)', fontSize: 13,
                        fontFamily: 'Tajawal, sans-serif', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      value={docNumber}
                      disabled={isReadOnly}
                      onChange={(e) => handleDocNumberChange(e.target.value)}
                      placeholder="أدخل رقم المستند..."
                    />
                    {checkingDocNumber && (
                      <i className="ti ti-loader" style={{
                        position: 'absolute', left: 10, top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 12, animation: 'spin 1s linear infinite',
                        color: 'var(--t4)', pointerEvents: 'none',
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
                    disabled={isReadOnly}
                    error={!!errors.party_id}
                  />
                  <FieldError msg={errors.party_id} />

                  {/* رصيد المتعامل */}
                  <PartyBalanceBadge
                    balance={partyBalance}
                    isLoading={isLoadingBalance}
                    partyLabel={isPurchase ? 'المورد' : 'الزبون'}
                  />

                  {/* حد الائتمان والفواتير المتأخرة */}
                  {!isPurchase && (
                    <CreditCheckBar
                      creditCheck={creditCheck}
                      isLoading={isLoadingCredit}
                      partyName={selectedParty?.name}
                    />
                  )}

                  {/* تحليلات المتعامل */}
                  <CustomerInsightPanel
                    insights={customerInsights}
                    isLoading={isLoadingInsights}
                  />

                  {balanceWarning && (
                    <AlertBanner type="warning" message={balanceWarning} />
                  )}
                </div>
              )}

              {/* تاريخ المستند */}
              <div>
                <Label required>تاريخ المستند</Label>
                <input
                  type="date"
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: `1px solid ${errors.document_date ? 'var(--red)' : 'var(--b3)'}`,
                    background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)', fontSize: 13,
                    fontFamily: 'Tajawal, sans-serif', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  value={form.document_date}
                  disabled={isReadOnly}
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
                    background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)', fontSize: 13,
                    fontFamily: 'Tajawal, sans-serif', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  value={form.due_date}
                  min={form.document_date}
                  disabled={isReadOnly}
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
                    background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)', fontSize: 13,
                    fontFamily: 'Tajawal, sans-serif', outline: 'none',
                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                    boxSizing: 'border-box',
                  }}
                  value={form.warehouse_id}
                  disabled={isReadOnly}
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
                    background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)', fontSize: 13,
                    fontFamily: 'Tajawal, sans-serif', outline: 'none',
                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                    boxSizing: 'border-box',
                  }}
                  value={form.fiscal_year_id}
                  disabled={isReadOnly}
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
                    background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)', fontSize: 13,
                    fontFamily: 'Tajawal, sans-serif', outline: 'none',
                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                    boxSizing: 'border-box',
                  }}
                  value={form.currency_id}
                  disabled={isReadOnly}
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

              {/* فئة السعر (بيع فقط) */}
              {!isPurchase && lookups.priceLevels.length > 0 && (
                <div>
                  <Label>فئة السعر</Label>
                  <ComboBox
                    options={priceLevelOptions}
                    value={form.price_level_id}
                    onChange={(v) => handlePriceLevelChange(v)}
                    placeholder="— الافتراضي —"
                    disabled={isReadOnly || isLinesReadOnly}
                  />
                  {isLinesReadOnly && (
                    <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 3 }}>
                      فئة السعر محمية — الأسطر معتمدة
                    </div>
                  )}
                </div>
              )}

              {/* ملاحظات للعميل + داخلية */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                  {(['public', 'internal'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => {}}
                      style={{
                        padding: '3px 10px', borderRadius: 'var(--r1)',
                        border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        background: 'var(--bg3)', color: 'var(--t3)',
                      }}
                    >
                      {tab === 'public' ? 'ملاحظات للعميل' : 'ملاحظات داخلية'}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: '1px solid var(--b3)',
                    background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t1)', fontSize: 13,
                    fontFamily: 'Tajawal, sans-serif', outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                  value={form.notes}
                  disabled={isReadOnly}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="ملاحظات للعميل — تظهر في الطباعة"
                />
                <textarea
                  rows={1}
                  style={{
                    width: '100%', padding: '7px 10px', marginTop: 6, borderRadius: 'var(--r2)',
                    border: '1px dashed var(--b3)',
                    background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
                    color: 'var(--t3)', fontSize: 12,
                    fontFamily: 'Tajawal, sans-serif', outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                  value={form.internal_notes}
                  disabled={isReadOnly}
                  onChange={(e) => set('internal_notes', e.target.value)}
                  placeholder="ملاحظات داخلية — لا تظهر في الطباعة"
                />
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════
              EXTRA TABS: الشحن والتسليم + شروط الدفع
          ══════════════════════════════════════════════════════════════ */}
          {(() => {
            const extraTabs: Tab[] = [
              { key: 'payment-terms', label: 'شروط الدفع', icon: 'ti-coin' },
            ];
            if (SHIPPING_CODES.has(docCode)) {
              extraTabs.unshift({ key: 'shipping', label: 'الشحن والتسليم', icon: 'ti-truck-delivery' });
            }
            // if only one tab, render it directly without tab bar
            if (extraTabs.length === 1) {
              const tab = extraTabs[0];
              return (
                <Section title={tab.label} icon={tab.icon} collapsible>
                  {tab.key === 'shipping' ? (
                    <ShippingInfoSection
                      value={form.shipping_info}
                      deliveryDate={form.delivery_date}
                      disabled={isReadOnly}
                      onChange={(info) => set('shipping_info', info)}
                      onDeliveryDateChange={(date) => set('delivery_date', date)}
                    />
                  ) : (
                    <PaymentTermsTable
                      terms={form.payment_terms}
                      netToPay={totals.netToPay}
                      disabled={isReadOnly}
                      onChange={(terms) => set('payment_terms', terms)}
                    />
                  )}
                </Section>
              );
            }
            return (
              <Tabs tabs={extraTabs} activeKey={extraTab} onChange={setExtraTab} style={{ marginBottom: 20 }}>
                {extraTab === 'shipping' ? (
                  <ShippingInfoSection
                    value={form.shipping_info}
                    deliveryDate={form.delivery_date}
                    disabled={isReadOnly}
                    onChange={(info) => set('shipping_info', info)}
                    onDeliveryDateChange={(date) => set('delivery_date', date)}
                  />
                ) : (
                  <PaymentTermsTable
                    terms={form.payment_terms}
                    netToPay={totals.netToPay}
                    disabled={isReadOnly}
                    onChange={(terms) => set('payment_terms', terms)}
                  />
                )}
              </Tabs>
            );
          })()}

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2: الأسطر
          ══════════════════════════════════════════════════════════════ */}
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
                {isLinesReadOnly && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                    background: 'var(--bg3)', color: 'var(--t4)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <i className="ti ti-lock" style={{ fontSize: 10 }} />
                    محمية
                  </span>
                )}
                {!isLinesReadOnly && (
                  <ColumnManager visible={visibleCols} onChange={handleColsChange} />
                )}
              </div>
            }
          >
            {affectsStock && (
              <AlertBanner
                type={stockDir > 0 ? 'info' : 'warning'}
                message={stockDir > 0
                  ? 'هذا المستند سيضيف الكميات إلى المخزون عند الحفظ'
                  : 'هذا المستند سيخصم الكميات من المخزون عند الحفظ'}
              />
            )}

            {lineErr && <AlertBanner type="error" message={lineErr} />}

            {lookups.isLoadingProducts ? (
              <div style={{
                textAlign: 'center', padding: 24, color: 'var(--t4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                جاري تحميل المنتجات...
              </div>
            ) : (
              <>
                {form.lines.length === 0 ? (
                  <div style={{
                    padding: 16, textAlign: 'center', color: 'var(--t4)',
                    fontSize: 12, background: 'var(--bg3)', borderRadius: 'var(--r2)',
                  }}>
                    {isLinesReadOnly ? 'لا أسطر — المستند فارغ' : 'لا أسطر بعد — اضغط "إضافة سطر" أدناه'}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
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
                              disabled={isLinesReadOnly}
                              products={lookups.products}
                              stockData={stockData}
                              stockValidation={stockResult}
                              onUpdate={updateLine}
                              onRemove={removeLine}
                              onDuplicate={duplicateLine}
                              isTvaExempt={!isPurchase && isPartyExempt}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!isLinesReadOnly && needsParty && (
                  <SmartSuggestionsPanel
                    suggestions={productSuggestions}
                    isLoading={isLoadingSuggestions}
                    onAddProduct={(productId, suggestedPrice, suggestedTva) => {
                      addLine();
                      const lastIdx = form.lines.length;
                      const patch: Record<string, unknown> = { product_id: String(productId) };
                      if (suggestedPrice != null) patch.unit_price_ht = suggestedPrice;
                      if (suggestedTva != null)   patch.tva_rate     = suggestedTva;
                      updateLine(lastIdx, patch as Parameters<typeof updateLine>[1]);
                    }}
                    disabled={isReadOnly}
                  />
                )}

                {!isLinesReadOnly && (
                  <button
                    onClick={addLine}
                    style={{
                      marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 'var(--r2)',
                      border: '1px dashed var(--b3)', background: 'transparent',
                      color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget).style.borderColor = 'var(--em)';
                      (e.currentTarget).style.color = 'var(--em)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget).style.borderColor = 'var(--b3)';
                      (e.currentTarget).style.color = 'var(--t3)';
                    }}
                  >
                    <i className="ti ti-plus" />
                    إضافة سطر
                  </button>
                )}
              </>
            )}
          </Section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 3: الدفعات — تُخفى للمستندات غير المحاسبية أو المبدئية
          ══════════════════════════════════════════════════════════════ */}
          {(documentType?.affects_accounting ?? false) && !form.is_proforma && (
          <Section title="الدفعات" icon="ti-wallet" collapsible>

            {/* الدفعات القديمة (للقراءة في additive mode) */}
            <ExistingPaymentsTable
              payments={existingPayments}
              paymentModes={lookups.paymentModes}
              treasuryAccountMap={treasuryAccountMap}
            />

            {/* الدفعات المقدمة المتاحة للتطبيق */}
            <AdvancePaymentsPanel
              advances={advancePayments}
              isLoading={isLoadingAdvances}
              onApply={(adv) => {
                if (pmMode === 'locked') return;
                addPayment();
                setTimeout(() => {
                  const lastIdx = newPayments.length;
                  updatePayment(lastIdx, {
                    payment_mode_id: String(adv.payment_mode_id),
                    amount: String(adv.unapplied_amount),
                    reference: adv.reference ?? '',
                    payment_date: adv.payment_date,
                  });
                }, 0);
              }}
              disabled={pmMode === 'locked'}
            />

            {/* تحذير تجاوز المبلغ */}
            {paymentsExceedWarning && (
              <AlertBanner type="warning" message={paymentsExceedWarning} />
            )}

            {/* رسالة "لا دفعات" */}
            {existingPayments.length === 0 && newPayments.length === 0 && (
              <div style={{
                padding: 12, fontSize: 12, color: 'var(--t4)',
                background: 'var(--bg3)', borderRadius: 'var(--r2)', marginBottom: 12,
              }}>
                {pmMode === 'locked'
                  ? 'المستند محمي — لا يمكن إضافة دفعات.'
                  : 'لم تُضَف دفعات — سيتم إنشاء المستند دون تسديد.'}
              </div>
            )}

            {/* عنوان قسم الدفعات الجديدة (في additive mode) */}
            {pmMode === 'additive' && newPayments.length > 0 && (
              <div style={{
                padding: '6px 10px', fontSize: 10.5, fontWeight: 800,
                color: 'var(--em)', textTransform: 'uppercase', letterSpacing: 0.4,
                borderBottom: '1px solid var(--b1)', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="ti ti-plus" style={{ fontSize: 11 }} />
                دفعات جديدة تُضاف
              </div>
            )}

            {/* الدفعات الجديدة القابلة للتعديل */}
            {newPayments.map((pay, idx) => {
              const selectedMode = lookups.paymentModes.find(
                (pm) => String(pm.id) === pay.payment_mode_id,
              );
              const autoTreasuryId  = selectedMode?.treasury_account_id ?? null;
              const manualTreasuryStr = pay.treasury_account_id ? String(pay.treasury_account_id) : '';
              const effectiveTreasury = autoTreasuryId
                ? treasuryAccountMap.get(autoTreasuryId)
                : (manualTreasuryStr ? treasuryAccountMap.get(parseInt(manualTreasuryStr)) : null);

              const remainingForFill = totals.remaining;
              const isLast = idx === newPayments.length - 1;

              return (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 130px 160px 120px 1fr 32px',
                  gap: 8, marginBottom: 10, alignItems: 'end',
                  padding: 12, borderRadius: 'var(--r2)',
                  background: 'var(--bg2)', border: '1px solid var(--b2)',
                }}>

                  {/* طريقة الدفع */}
                  <div>
                    {idx === 0 && <Label>طريقة الدفع</Label>}
                    <select
                      style={{
                        width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                        border: `1px solid ${!pay.payment_mode_id ? 'var(--red)' : 'var(--b3)'}`,
                        background: 'var(--bg1)', color: 'var(--t1)',
                        fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                        outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
                      }}
                      value={pay.payment_mode_id}
                      onChange={(e) => updatePayment(idx, { payment_mode_id: e.target.value })}
                    >
                      <option value="">— اختر —</option>
                      {paymentModeOptions.map((pm) => (
                        <option key={pm.id} value={String(pm.id)}>{pm.label}</option>
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
                        border: '1px solid var(--b3)',
                        background: 'var(--bg1)', color: 'var(--t1)',
                        fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      value={pay.amount}
                      onChange={(e) => updatePayment(idx, { amount: e.target.value })}
                      placeholder="0.00"
                    />
                    {/* زر ملء المتبقي */}
                    {isLast && remainingForFill > 0.01 && (
                      <button
                        type="button"
                        onClick={() => updatePayment(idx, {
                          amount: String(Math.max(0, remainingForFill)),
                        })}
                        style={{
                          fontSize: 10, fontWeight: 600, color: 'var(--em)',
                          marginTop: 3, padding: 0, background: 'none',
                          border: 'none', cursor: 'pointer', textDecoration: 'underline',
                        }}
                      >
                        ملء المتبقي ({fmtDZD(remainingForFill)})
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
                        border: `1px solid ${
                          selectedMode?.requires_reference && !pay.reference?.trim()
                            ? 'var(--red)' : 'var(--b3)'
                        }`,
                        background: 'var(--bg1)', color: 'var(--t1)',
                        fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      value={pay.reference ?? ''}
                      onChange={(e) => updatePayment(idx, { reference: e.target.value })}
                      placeholder={selectedMode?.requires_reference ? 'إلزامي ★' : 'اختياري...'}
                    />
                  </div>

                  {/* التاريخ */}
                  <div>
                    {idx === 0 && <Label>التاريخ</Label>}
                    <input
                      type="date"
                      style={{
                        width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)',
                        background: 'var(--bg1)', color: 'var(--t1)',
                        fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      value={pay.payment_date}
                      onChange={(e) => updatePayment(idx, { payment_date: e.target.value })}
                    />
                  </div>

                  {/* حساب الخزينة */}
                  <div>
                    {idx === 0 && <Label>الحساب</Label>}
                    {autoTreasuryId ? (
                      // حساب تلقائي → عرض فقط
                      <div style={{
                        padding: '7px 10px', borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)', background: 'var(--bg3)',
                        fontSize: 12, height: 38, display: 'flex', alignItems: 'center', gap: 6,
                        overflow: 'hidden', boxSizing: 'border-box',
                      }}>
                        {effectiveTreasury ? (
                          <>
                            <i className={`ti ${
                              effectiveTreasury.type === 'bank' ? 'ti-building-bank' :
                              effectiveTreasury.type === 'cash' ? 'ti-cash' : 'ti-credit-card'
                            }`} style={{ fontSize: 12, color: 'var(--t4)', flexShrink: 0 }} />
                            <span style={{
                              color: 'var(--t2)', fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {effectiveTreasury.name}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--t4)' }}>ح/ {autoTreasuryId}</span>
                        )}
                      </div>
                    ) : (
                      // لا حساب تلقائي → اختيار يدوي
                      <select
                        style={{
                          width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                          border: `1px solid ${!manualTreasuryStr ? 'var(--red)' : 'var(--b3)'}`,
                          background: 'var(--bg1)', color: 'var(--t1)',
                          fontSize: 12, fontFamily: 'Tajawal, sans-serif',
                          outline: 'none', cursor: 'pointer',
                          height: 38, boxSizing: 'border-box',
                        }}
                        value={manualTreasuryStr}
                        onChange={(e) => updatePayment(idx, { treasury_account_id: e.target.value })}
                      >
                        <option value="">— اختر حساباً ★ —</option>
                        {lookups.treasuryAccounts.map((ta) => (
                          <option key={ta.id} value={String(ta.id)}>
                            {ta.name} ({ta.type === 'bank' ? 'بنك' : ta.type === 'cash' ? 'نقدية' : 'شيك'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* حذف */}
                  <button
                    onClick={() => removePayment(idx)}
                    style={{
                      width: 32, height: 32, borderRadius: 'var(--r1)',
                      border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
                      background: 'var(--redb)', color: 'var(--red)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      alignSelf: 'flex-end',
                    }}
                  >
                    <i className="ti ti-trash" style={{ fontSize: 13 }} />
                  </button>

                  {/* حقول الشيك — تظهر فقط إذا كان نوع حساب الخزينة هو "شيك" */}
                  {effectiveTreasury?.type === 'check' && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <CheckFormFields
                        checkNumber={pay.check_number}
                        checkBank={pay.check_bank}
                        checkDueDate={pay.check_due_date}
                        onChange={(fields) => updatePayment(idx, fields)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* زر إضافة دفعة */}
            {pmMode !== 'locked' && (
              <button
                onClick={addPayment}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 'var(--r2)',
                  border: '1px dashed var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget).style.borderColor = 'var(--em)';
                  (e.currentTarget).style.color = 'var(--em)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget).style.borderColor = 'var(--b3)';
                  (e.currentTarget).style.color = 'var(--t3)';
                }}
              >
                <i className="ti ti-plus" />
                {pmMode === 'additive' ? 'إضافة دفعة جديدة' : 'إضافة دفعة'}
              </button>
            )}
          </Section>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SECTION 4: الإجماليات
          ══════════════════════════════════════════════════════════════ */}
          <Section title="الإجماليات" icon="ti-calculator">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <TotalCard label="إجمالي HT"      value={`${fmtDZD(totals.ht)} دج`} />
              <TotalCard
                label="الخصم الإجمالي"
                value={`${fmtDZD(totals.discount)} دج`}
                color="var(--red)" muted={totals.discount === 0}
              />
              <TotalCard label="TVA"             value={`${fmtDZD(totals.tva)} دج`} />
              <TotalCard label="إجمالي TTC"      value={`${fmtDZD(totals.ttc)} دج`} bg="var(--bg3)" />
              {totals.stamp > 0 && (
                <TotalCard
                  label="الطابع الجبائي" value={`${fmtDZD(totals.stamp)} دج`}
                  bg="var(--goldb)" color="var(--gold)" labelColor="var(--gold)"
                />
              )}
              <TotalCard
                label="المبلغ المستحق" value={`${fmtDZD(totals.netToPay)} دج`}
                bg="var(--em)" color="white" labelColor="rgba(255,255,255,.75)" large
              />
              {(existingPayments.length > 0 || newPayments.length > 0) && (
                <>
                  <TotalCard
                    label="المدفوع" value={`${fmtDZD(totals.totalPaid)} دج`}
                    color="var(--green)" bg="var(--greenb)" labelColor="var(--green)"
                  />
                  <TotalCard
                    label="المتبقي" value={`${fmtDZD(totals.remaining)} دج`}
                    color={totals.remaining > 0.01 ? 'var(--red)' : 'var(--green)'}
                    bg={totals.remaining    > 0.01 ? 'var(--redb)' : 'var(--greenb)'}
                    labelColor={totals.remaining > 0.01 ? 'var(--red)' : 'var(--green)'}
                  />
                </>
              )}
            </div>

            {/* رصيد المتعامل المتوقع بعد هذا المستند */}
            {partyBalance && form.party_id && totals.netToPay > 0 && (
              <div style={{
                padding: '8px 12px', borderRadius: 'var(--r2)',
                background: 'var(--bg3)', border: '1px solid var(--b2)',
                fontSize: 11.5, color: 'var(--t3)', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <i className="ti ti-calculator" style={{ color: 'var(--t4)' }} />
                <span>رصيد {selectedParty?.name ?? 'المتعامل'} الحالي:</span>
                <b style={{ color: partyBalance.balance_type === 'debit' ? 'var(--green)' : 'var(--red)' }}>
                  {fmtDZD(partyBalance.current_balance)} دج
                  ({partyBalance.balance_type === 'debit' ? 'مدين لنا' : 'نحن مدينون'})
                </b>
                <span style={{ color: 'var(--t4)' }}>·</span>
                <span>بعد هذا المستند سيصبح:</span>
                <b style={{ color: 'var(--em)' }}>
                  {fmtDZD(
                    isPurchase
                      ? partyBalance.signed_balance - (totals.netToPay - totals.totalPaid)
                      : partyBalance.signed_balance + (totals.netToPay - totals.totalPaid),
                  )} دج
                </b>
              </div>
            )}

            {!isEdit && (
              <Toggle
                checked={form.is_proforma}
                onChange={(v) => set('is_proforma', v)}
                label="مستند مبدئي (Pro Forma)"
                subLabel="لا يُؤثر في المخزون ولا يُنشئ دفعات — يُستخدم للعروض والموافقات الأولية"
                disabled={isReadOnly}
              />
            )}
            <Toggle
              checked={form.apply_stamp}
              onChange={(v) => set('apply_stamp', v)}
              label="الطابع الجبائي"
              subLabel="1% من TTC — بحد أقصى 2,500 دج — للفواتير ≥ 30,000 دج"
              disabled={isReadOnly}
            />
          </Section>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--b1)',
          background: isCancelled ? 'var(--bg3)' : 'var(--bg2)',
          display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center',
          borderRadius: '0 0 var(--r3) var(--r3)',
        }}>

          {/* Summary */}
          <div style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {form.lines.length > 0 && (
              <>
                <span>{form.lines.length} سطر</span>
                <span>·</span>
                <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                  {fmtDZD(totals.netToPay)} دج
                </span>
              </>
            )}
            {totals.remaining > 0.01 && (existingPayments.length > 0 || newPayments.length > 0) && (
              <>
                <span>·</span>
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                  متبقي {fmtDZD(totals.remaining)} دج
                </span>
              </>
            )}
            {pmMode === 'additive' && newPayments.length > 0 && (
              <>
                <span>·</span>
                <span style={{ color: 'var(--orange)', fontWeight: 600 }}>
                  {newPayments.length} دفعة جديدة
                </span>
              </>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* زر المرتجع — للفواتير المعتمدة فقط */}
            {isEdit && !isReadOnly && RETURNABLE_CODES.has(docCode) && (
              <button
                onClick={() => setShowReturnModal(true)}
                disabled={isPending}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--purple)',
                  background: 'color-mix(in srgb, var(--purple) 10%, transparent)',
                  color: 'var(--purple)',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <i className="ti ti-receipt-refund" />
                إنشاء مرتجع
              </button>
            )}
            {/* تأكيد وتحويل المبدئي إلى فاتورة حقيقية */}
            {isEdit && form.is_proforma && !isReadOnly && (
              <button
                onClick={handleConfirmProforma}
                disabled={isPending}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--orange)',
                  background: 'color-mix(in srgb, var(--orange) 12%, transparent)',
                  color: 'var(--orange)',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <i className="ti ti-circle-check" />
                تأكيد وتحويل لفاتورة حقيقية
              </button>
            )}
            {/* حذف — فقط للتعديل + غير مقفل + غير ملغى */}
            {isEdit && !isReadOnly && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                title="حذف المستند"
                style={{
                  padding: '8px 16px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--red)', background: 'var(--redb)',
                  color: 'var(--red)',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <i className="ti ti-trash" />
                حذف
              </button>
            )}

            <button
              onClick={onClose}
              disabled={isPending || !!successMsg}
              style={{
                padding: '8px 18px', borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)', background: 'var(--bg1)',
                color: 'var(--t2)',
                cursor: isPending || !!successMsg ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600,
              }}
            >
              {isReadOnly ? 'إغلاق' : 'إلغاء'}
            </button>

            {/* حفظ — مخفي للـ locked/cancelled */}
            {!isReadOnly && (
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
                  <>
                    <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                    جاري الحفظ...
                  </>
                ) : successMsg ? (
                  <>
                    <i className="ti ti-check" />
                    تم الحفظ
                  </>
                ) : (
                  <>
                    <i className={`ti ${isEdit ? 'ti-device-floppy' : 'ti-plus'}`} />
                    {pmMode === 'additive'
                      ? 'حفظ الدفعات الجديدة'
                      : isEdit ? 'تحديث المستند' : 'حفظ المستند'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal المرتجع */}
      {showReturnModal && existingDocument && (
        <ReturnDocumentModal
          document={existingDocument}
          onCreated={(returnDoc) => {
            setShowReturnModal(false);
            const num = String((returnDoc as Record<string, unknown>).document_number ?? '');
            setSuccessMsg(`تم إنشاء المرتجع ${num} ✓`);
            if (slug) {
              qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
            }
            setTimeout(() => { setSuccessMsg(''); onSaved(); onClose(); }, 1800);
          }}
          onClose={() => setShowReturnModal(false)}
        />
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/documents/CommercialDocumentsPage.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/CommercialDocumentsPage.tsx  —  v10.4
//
// ✅ جديد في v10.4:
//   • إزالة validateMut و deleteMut (المستند معتمد فور الإنشاء)
//   • إضافة unlockMut — فتح القفل متاح للمستندات غير المُصدَّرة
//   • cancelMut يرسل cancellation_reason
//   • getRowPermissions() — helper خارجي لحساب الصلاحيات
//   • عمود is_locked مرئي افتراضياً + نقر مزدوج للتبديل
//   • contextMenuItems: كتلة "table" للقفل/فتح الجماعي
//   • STATUS_CFG مُبسَّط: validated + cancelled فقط
//   • isExpandable: كل المستندات قابلة للتوسع
//
// ✅ محفوظ من v10.3:
//   • useColumnStatePersistence — مفتاح localStorage واحد
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
import { apiGet, apiPost } from "@/lib/api/core/client";
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
import { useColumnStatePersistence } from "@/components/ui/DataTable";
import CommercialDocumentModal from "./CommercialDocumentModal";
import QuickSaleModal from "./QuickSaleModal";
import { DeliveryProgressBar } from "./components/DeliveryProgressBar";
import ConvertDocumentModal from "./components/ConvertDocumentModal";
import type { DocumentType, CommercialDocument } from "@/lib/api/core/types";

// أنماط SmartFilter الخاصة بالمشروع (مفصولة عن library)
import { ERP_FILTER_PATTERNS } from "@/lib/datatable-patterns";

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const SALE_CODES     = new Set(["FV", "BL", "DEV", "BCC", "AV"]);
const PURCHASE_CODES = new Set(["FA", "BR", "DDP", "BCF", "AA"]);

const STATUS_CFG = {
    draft:          { label: "مسودة",    color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
    pending:        { label: "قيد الانتظار", color: "#f59e0b", bg: "#fffbeb", dot: "#fbbf24" },
    validated:      { label: "معتمد",    color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6" },
    partially_paid: { label: "مدفوع جزئياً", color: "#8b5cf6", bg: "#f5f3ff", dot: "#a78bfa" },
    paid:           { label: "مدفوع",    color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
    overdue:        { label: "متأخر",    color: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" },
    cancelled:      { label: "ملغي",     color: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" },
    returned:       { label: "مرتجع",    color: "#8b5cf6", bg: "#f5f3ff", dot: "#a78bfa" },
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

/** تاريخ + وقت كامل (ساعة:دقيقة:ثانية) — لأعمدة created_at / updated_at / validated_at */
function fmtDateTime(d?: string | null): string {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    const date = dt.toLocaleDateString("ar-DZ", { year: "numeric", month: "2-digit", day: "2-digit" });
    const time = dt.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    return `${date} ${time}`;
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

/** Avatar بسيط + اسم — لعرض المستخدم في أعمدة created_by / validated_by */
function UserChip({ name, color = "var(--primary)" }: { name: string; color?: string }) {
    if (!name) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color, flexShrink: 0,
            }}>
                {name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "var(--t2)" }}>{name}</span>
        </div>
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
    const docCode = ((doc as unknown as Record<string, unknown>).documentType as Record<string, unknown> | undefined)?.code as string ?? '';

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

    const TRACKS_DELIVERY = docCode === 'BCC';

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                    <tr style={{ background: "var(--bg3)" }}>
                        {["#", "المنتج", "الكمية"].concat(
                            TRACKS_DELIVERY ? ["التسليم"] : [],
                            ["سعر HT", "خصم", "TVA%", "الإجمالي TTC"]
                        ).map(h => (
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
                        const qty = Number(line.quantity ?? 1);
                        const delivered = Number((line as Record<string, unknown>).delivered_quantity ?? 0);
                        const returned  = Number((line as Record<string, unknown>).returned_quantity ?? 0);
                        return (
                            <tr key={String(line.id ?? idx)} style={{ borderBottom: "1px solid var(--b1)" }}>
                                <td style={{ padding: "6px 12px", color: "var(--t4)" }}>{idx + 1}</td>
                                <td style={{ padding: "6px 12px", fontWeight: 600 }}>{name}</td>
                                <td style={{ padding: "6px 12px", textAlign: "left" }}>{String(line.quantity ?? "")}</td>
                                {TRACKS_DELIVERY && (
                                    <td style={{ padding: "6px 12px" }}>
                                        <DeliveryProgressBar
                                            quantity={qty}
                                            deliveredQuantity={delivered}
                                            returnedQuantity={returned}
                                        />
                                    </td>
                                )}
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
// ROW PERMISSIONS HELPER
// ════════════════════════════════════════════════════════════════════════════

function getRowPermissions(row: CommercialDocument, isReadOnly: boolean) {
    const isLocked    = !!row.is_locked;
    const isExported  = !!(row as unknown as Record<string, unknown>).is_exported_to_accounting;
    const status      = getDocStatus(row);
    const isCancelled = status === "cancelled";

    return {
        canEdit:   !isReadOnly && !isLocked && !isExported,
        canLock:   !isReadOnly && !isLocked && !isCancelled,
        canUnlock: !isReadOnly &&  isLocked && !isExported,
        canCancel: !isReadOnly && !isLocked && !isExported && !isCancelled,
        isLocked,
        isCancelled,
    };
}

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
                        {!isReadOnly && d && !(d as Record<string, unknown>).is_locked && (
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
    const [convertDocId, setConvertDocId]     = useState<number | null>(null);
    const [convertSourceCode, setConvertSourceCode] = useState('');
    const [convertSourceDate, setConvertSourceDate] = useState('');
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
        if (!multiSort.length) return "id";
        return multiSort.map(s => `${s.dir === "desc" ? "-" : ""}${s.key}`).join(",");
    }, [multiSort]);

    // ── Filter change ─────────────────────────────────────────────────────────
    const handleFilterChange = useCallback((filters: Record<string, string>) => {
        const converted: Record<string, string> = {};

        // حقول النطاق (تاريخ / رقم) — DataTable يُرسل "min|max" → Backend يتوقع "min,max"
        const rangeFields = new Set([
            "document_date","due_date","total_ht","total_tva","total_ttc",
            "net_to_pay","total_discount","total_stamp","remaining_amount",
            "validated_at","created_at","updated_at",
        ]);

        // حقول العلاقات (dynamic-multiselect CSV) — Backend يُقسّمها بنفسه
        const csvRelationFields = new Set(["party.name","warehouse.name"]);

        for (const [key, val] of Object.entries(filters)) {
            // تخطى القيم الفارغة
            if (!val || val === "|") continue;

            if (rangeFields.has(key) && val.includes("|")) {
                // "min|max" → "min,max"
                const rangeVal = val.replaceAll("|", ",");
                if (rangeVal !== "," && rangeVal !== "") {
                    converted[key] = rangeVal;
                }
            } else if (csvRelationFields.has(key) && val.includes(",")) {
                // CSV من multiselect — نُرسله كما هو
                converted[key] = val;
            } else {
                converted[key] = val;
            }
        }
        setServerFilters(converted);
        setPage(1);
        const toSave = Object.fromEntries(
            Object.entries(converted).filter(([, v]) => v != null && v !== "")
        );
        saveColState({ activeFilters: toSave });
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
            include: "party,documentStatus,warehouse,validatedBy,user",
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
            total_discount:           "filter[total_discount]",
            total_stamp:              "filter[total_stamp]",
            remaining_amount:         "filter[remaining_amount]",
            reference:                "filter[reference]",
            notes:                    "filter[notes]",
            payment_terms:            "filter[payment_terms]",
            validated_at:             "filter[validated_at]",
            created_at:               "filter[created_at]",
            updated_at:               "filter[updated_at]",
            // ✅ إضافة: فلتر باسم المستخدم الذي اعتمد / أنشأ المستند
            validated_by:             "filter[validated_by]",
            created_by:               "filter[created_by]",
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
    const lockMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/lock`),
        onSuccess: () => { showToast("تم قفل المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل القفل", "error"),
    });
    const unlockMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/unlock`),
        onSuccess: () => { showToast("تم فتح قفل المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل فتح القفل", "error"),
    });
    const cancelMut = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            apiPost(`/documents/${id}/cancel`, { cancellation_reason: reason }),
        onSuccess: () => { showToast("تم إلغاء المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل الإلغاء", "error"),
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
            key: "is_locked",
            header: "مقفل",
            exportHeader: "مقفل",
            width: 80,
            sortable: true,
            defaultHidden: false,
            filter: {
                type: "select" as const,
                options: [
                    { value: "1", label: "مقفل" },
                    { value: "0", label: "غير مقفل" },
                ],
            },
            accessor: (r: CommercialDocument) => r.is_locked ? "مقفل" : "—",
            render: (row: CommercialDocument) => {
                const locked     = !!row.is_locked;
                const isExported = !!(row as unknown as Record<string, unknown>).is_exported_to_accounting;
                return (
                    <span
                        title={
                            locked
                                ? isExported
                                    ? "مقفل ومُصدَّر — لا يمكن فتحه"
                                    : "مقفل — انقر مرتين لفتح القفل"
                                : "غير مقفل — انقر مرتين للقفل"
                        }
                        onDoubleClick={() => {
                            if (isReadOnly) return;
                            if (locked) {
                                if (isExported) { showToast("لا يمكن فتح قفل مستند مُصدَّر للمحاسبة", "error"); return; }
                                if (window.confirm("تأكيد فتح قفل هذا المستند؟")) unlockMut.mutate(row.id);
                            } else {
                                const status = getDocStatus(row);
                                if (status === "cancelled") { showToast("لا يمكن قفل مستند ملغى", "error"); return; }
                                if (window.confirm("تأكيد قفل هذا المستند؟ لن يمكن تعديله بعد القفل.")) lockMut.mutate(row.id);
                            }
                        }}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            cursor: isReadOnly ? "default" : "pointer",
                            padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                            color:      locked ? "var(--orange)" : "var(--t4)",
                            background: locked ? "color-mix(in srgb, var(--orange) 10%, transparent)" : "transparent",
                            border:     locked ? "1px solid color-mix(in srgb, var(--orange) 25%, transparent)" : "none",
                            userSelect: "none",
                        }}
                    >
                        <i className={`ti ${locked ? "ti-lock" : "ti-lock-open"}`} style={{ fontSize: 12 }} aria-hidden="true" />
                        {locked ? "مقفل" : "—"}
                    </span>
                );
            },
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
            key: "paid_amount",
            header: "المدفوع",
            exportHeader: "المبلغ المدفوع (دج)",
            width: 130,
            align: "end",
            sortable: true,
            filter: { type: "number" },
            accessor: r => Number((r as unknown as Record<string,unknown>).paid_amount ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => {
                const paid = Number((row as unknown as Record<string,unknown>).paid_amount ?? 0);
                return paid > 0
                    ? <MoneyCell value={paid} accent="var(--em)" />
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
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

        // ════════════════════════════════════════════════════════════════════
        // أعمدة إضافية — مخفية افتراضياً (defaultHidden: true)
        // يُظهرها المستخدم حسب الحاجة عبر قائمة الأعمدة
        // ════════════════════════════════════════════════════════════════════

        // ── مالية ────────────────────────────────────────────────────────────

        {
            key: "total_discount",
            header: "الخصم",
            exportHeader: "الخصم الإجمالي (دج)",
            width: 120,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number((r as unknown as Record<string,unknown>).total_discount ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => {
                const v = Number((row as unknown as Record<string,unknown>).total_discount ?? 0);
                if (!v) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
                return <MoneyCell value={v} accent="var(--red)" />;
            },
        },
        {
            key: "total_stamp",
            header: "الطابع",
            exportHeader: "الطابع الجبائي (دج)",
            width: 110,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number((r as unknown as Record<string,unknown>).total_stamp ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => <MoneyCell value={(row as unknown as Record<string,unknown>).total_stamp as number} />,
        },
        {
            key: "remaining_amount",
            header: "المتبقي",
            exportHeader: "المبلغ المتبقي (دج)",
            width: 130,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number((r as unknown as Record<string,unknown>).remaining_amount ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => {
                const rem = Number((row as unknown as Record<string,unknown>).remaining_amount ?? 0);
                if (rem <= 0.001) return <span style={{ color: "var(--em)", fontSize: 12, fontWeight: 700 }}>مسدد ✓</span>;
                return <MoneyCell value={rem} accent="var(--red)" bold />;
            },
        },

        // ── مرجعية ───────────────────────────────────────────────────────────

        {
            key: "reference",
            header: "المرجع",
            exportHeader: "رقم المرجع (BL/BC)",
            width: 130,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            searchable: true,
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).reference ?? ""),
            render: (row: CommercialDocument) => {
                const ref = String((row as unknown as Record<string,unknown>).reference ?? "");
                return ref
                    ? <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--t3)", background: "var(--bg3)", padding: "2px 6px", borderRadius: 4 }}>{ref}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "notes",
            header: "ملاحظات",
            exportHeader: "الملاحظات",
            width: 200,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            searchable: true,
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).notes ?? ""),
            render: (row: CommercialDocument) => {
                const notes = String((row as unknown as Record<string,unknown>).notes ?? "");
                return notes
                    ? <span style={{ fontSize: 12, color: "var(--t2)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }} title={notes}>{notes}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "payment_terms",
            header: "شروط الدفع",
            exportHeader: "شروط الدفع",
            width: 130,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).payment_terms ?? ""),
            render: (row: CommercialDocument) => {
                const pt = String((row as unknown as Record<string,unknown>).payment_terms ?? "");
                return pt
                    ? <span style={{ fontSize: 12, color: "var(--t3)" }}>{pt}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },

        // ── رقابة وتتبع ───────────────────────────────────────────────────────

        {
            key: "validated_at",
            header: "تاريخ الاعتماد",
            exportHeader: "تاريخ الاعتماد",
            width: 130,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).validated_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).validated_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--em)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "validated_by",
            header: "اعتمد بواسطة",
            exportHeader: "اعتمد بواسطة",
            width: 150,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            // validated_by في DB = integer FK — الـ Resource يُرسل العلاقة بـ camelCase
            accessor: (r: CommercialDocument) => {
                const vb = (r as unknown as Record<string,unknown>).validatedBy as Record<string,unknown> | null | undefined;
                return String(vb?.name ?? vb?.username ?? "");
            },
            render: (row: CommercialDocument) => {
                const vb = (row as unknown as Record<string,unknown>).validatedBy as Record<string,unknown> | null | undefined;
                const name = String(vb?.name ?? vb?.username ?? "");
                return name ? <UserChip name={name} color="var(--em)" /> : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "created_by",
            header: "أنشأه",
            exportHeader: "أنشأه",
            width: 150,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            // المنشئ = user_id في DB → العلاقة هي user() وليس created_by
            accessor: (r: CommercialDocument) => {
                const u = (r as unknown as Record<string,unknown>).user as Record<string,unknown> | null | undefined;
                return String(u?.name ?? u?.username ?? "");
            },
            render: (row: CommercialDocument) => {
                const u = (row as unknown as Record<string,unknown>).user as Record<string,unknown> | null | undefined;
                const name = String(u?.name ?? u?.username ?? "");
                return name ? <UserChip name={name} color="var(--blue)" /> : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "created_at",
            header: "تاريخ الإنشاء",
            exportHeader: "تاريخ الإنشاء",
            width: 160,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).created_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).created_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--t4)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "updated_at",
            header: "آخر تعديل",
            exportHeader: "آخر تعديل",
            width: 160,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).updated_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).updated_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--t4)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },

        // ── التسليم (لأوامر العميل BCC خاصة) ────────────────────────────────
        {
            key: "delivery_date",
            header: "تاريخ التسليم",
            exportHeader: "تاريخ التسليم",
            width: 120,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).delivery_date ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).delivery_date as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 12, color: "var(--t3)" }}>{fmtDate(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
    ], [isPurch, opColor]);

    // ── إدارة الأعمدة المخفية — مُفوَّضة بالكامل لـ DataTable الداخلي ──────────
    // DataTable يتولى: قائمة الأعمدة + toggle + عرض القائمة
    // هنا نحتفظ فقط بـ state للاستخدام في headerActions و contextMenu

    const initialHiddenKeys = useMemo(
        () => initialSnapshot?.hiddenColumns ?? allColumns.filter(c => c.defaultHidden).map(c => c.key),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [], // يُحسب مرة واحدة عند الـ mount فقط
    );

    const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>(initialHiddenKeys);

    // onHiddenColumnsChange الجديدة: تستقبل القائمة الكاملة دائماً (allHidden)
    // سواء كان toggle فردي أو batch (إخفاء الكل / تطبيق view)
    const handleHiddenColumnsChange = useCallback(
        (_key: string, _willBeHidden: boolean, allHidden: string[]) => {
            setHiddenColumnKeys(allHidden);
            saveColState({ hiddenColumns: allHidden });
        },
        [saveColState],
    );

    // Set سريع للبحث في contextMenu
    const hiddenColumnsSet = useMemo(() => new Set(hiddenColumnKeys), [hiddenColumnKeys]);

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
    // CONTEXT MENU ITEMS
    // ════════════════════════════════════════════════════════════════════════

    const contextMenuItems = useCallback((ctx: ContextMenuContext): ContextMenuItem[] => {
        const menuItems: ContextMenuItem[] = [];

        // ─── خلية ───────────────────────────────────────────────────────────
        if (ctx.type === "cell") {
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
                    onClick: () => { if (row) { setViewDocId(row.id); setModal("view"); } },
                },
                {
                    label: "تحويل",
                    icon: "arrows-exchange",
                    disabled: !row || getDocStatus(row) === 'cancelled',
                    onClick: () => {
                        if (!row) return;
                        const docType = (row as unknown as Record<string, unknown>).document_type as Record<string, unknown> | undefined;
                        const code = String(docType?.code ?? '');
                        setConvertSourceCode(code);
                        setConvertSourceDate(String(row.document_date ?? ''));
                        setConvertDocId(row.id);
                    },
                },
            );
        }

        // ─── صف ─────────────────────────────────────────────────────────────
        if (ctx.type === "row") {
            const row = ctx.row as CommercialDocument | undefined;
            const { canEdit, canLock, canUnlock, canCancel } = row
                ? getRowPermissions(row, !!isReadOnly)
                : { canEdit: false, canLock: false, canUnlock: false, canCancel: false };

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
                {
                    label: "تحويل",
                    icon: "arrows-exchange",
                    disabled: !row || getDocStatus(row) === 'cancelled',
                    onClick: () => {
                        if (!row) return;
                        const docType = (row as unknown as Record<string, unknown>).document_type as Record<string, unknown> | undefined;
                        const code = String(docType?.code ?? '');
                        setConvertSourceCode(code);
                        setConvertSourceDate(String(row.document_date ?? ''));
                        setConvertDocId(row.id);
                    },
                },
            );

            const editActions: ContextMenuItem[] = [];

            if (canEdit) {
                editActions.push({
                    label: "تعديل المستند",
                    icon: "pencil",
                    onClick: () => { if (row) openEditModal(row); },
                });
            }
            if (canLock) {
                editActions.push({
                    label: "قفل المستند",
                    icon: "lock",
                    onClick: () => {
                        if (row && window.confirm("تأكيد قفل هذا المستند؟")) lockMut.mutate(row.id);
                    },
                });
            }
            if (canUnlock) {
                editActions.push({
                    label: "فتح قفل المستند",
                    icon: "lock-open",
                    onClick: () => {
                        if (row && window.confirm("تأكيد فتح قفل هذا المستند؟")) unlockMut.mutate(row.id);
                    },
                });
            }
            if (canCancel) {
                editActions.push({
                    label: "إلغاء المستند",
                    icon: "ban",
                    onClick: () => {
                        if (!row) return;
                        const reason = window.prompt("سبب الإلغاء (إلزامي):");
                        if (!reason?.trim()) return;
                        if (window.confirm("تأكيد إلغاء المستند؟")) cancelMut.mutate({ id: row.id, reason: reason.trim() });
                    },
                });
            }

            if (editActions.length > 0) {
                menuItems.push({ label: "", divider: true, onClick: () => {} }, ...editActions);
            }
        }

        // ─── رأس العمود ─────────────────────────────────────────────────────
        if (ctx.type === "header") {
            const colKey   = ctx.colKey;
            const isHidden = colKey ? hiddenColumnsSet.has(colKey) : false;
            menuItems.push({
                label:    isHidden ? "إظهار العمود" : "إخفاء العمود",
                icon:     isHidden ? "eye" : "eye-off",
                disabled: !colKey,
                onClick: () => {
                    if (colKey) {
                        handleHiddenColumnsChange(colKey, !hiddenColumnsSet.has(colKey), hiddenColumnKeys);
                        showToast(isHidden ? "تم إظهار العمود" : "تم إخفاء العمود", "info");
                    }
                },
            });
        }

        // ─── جدول — قفل/فتح جماعي للصفحة الحالية ──────────────────────────
        if (ctx.type === "table" && !isReadOnly) {
            const lockable   = items.filter(r => getRowPermissions(r, false).canLock);
            const unlockable = items.filter(r => getRowPermissions(r, false).canUnlock);

            if (lockable.length > 0) {
                menuItems.push({
                    label: `قفل الكل (${lockable.length} مستند)`,
                    icon: "lock",
                    onClick: () => {
                        if (!window.confirm(`تأكيد قفل ${lockable.length} مستند في هذه الصفحة؟`)) return;
                        lockable.reduce(
                            (chain, doc) => chain.then(() => lockMut.mutateAsync(doc.id).catch(() => null)),
                            Promise.resolve(null as unknown),
                        ).then(() => showToast(`تم قفل ${lockable.length} مستند`, "success"));
                    },
                });
            }

            if (unlockable.length > 0) {
                menuItems.push({
                    label: `فتح قفل الكل (${unlockable.length} مستند)`,
                    icon: "lock-open",
                    onClick: () => {
                        if (!window.confirm(`تأكيد فتح قفل ${unlockable.length} مستند في هذه الصفحة؟`)) return;
                        unlockable.reduce(
                            (chain, doc) => chain.then(() => unlockMut.mutateAsync(doc.id).catch(() => null)),
                            Promise.resolve(null as unknown),
                        ).then(() => showToast(`تم فتح قفل ${unlockable.length} مستند`, "success"));
                    },
                });
            }
        }

        return menuItems;
    }, [hiddenColumnsSet, hiddenColumnKeys, handleHiddenColumnsChange, isReadOnly, openEditModal, lockMut, unlockMut, cancelMut, items, showToast]);

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
        const { canEdit, canLock, canUnlock, canCancel } = getRowPermissions(row, !!isReadOnly);

        const handleCancel = () => {
            const reason = window.prompt("سبب الإلغاء (إلزامي):");
            if (!reason?.trim()) return;
            if (window.confirm("تأكيد إلغاء المستند؟")) {
                cancelMut.mutate({ id: row.id, reason: reason.trim() });
            }
        };

        return (
            <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                {/* عرض — دائماً متاح */}
                <ActionBtn icon="ti-eye" title="عرض" onClick={() => { setViewDocId(row.id); setModal("view"); }} />

                {/* تعديل — !is_locked && !is_exported */}
                {canEdit && (
                    <ActionBtn
                        icon={loadingEdit ? "ti-loader-2" : "ti-pencil"}
                        title="تعديل" color="var(--blue)" disabled={loadingEdit}
                        onClick={() => openEditModal(row)}
                    />
                )}

                {/* قفل — غير مقفل + غير ملغى */}
                {canLock && (
                    <ActionBtn
                        icon="ti-lock" title="قفل المستند" color="var(--orange)"
                        disabled={lockMut.isPending}
                        onClick={() => {
                            if (window.confirm("تأكيد قفل هذا المستند؟ لن يمكن تعديله بعد القفل."))
                                lockMut.mutate(row.id);
                        }}
                    />
                )}

                {/* فتح القفل — مقفل + غير مُصدَّر */}
                {canUnlock && (
                    <ActionBtn
                        icon="ti-lock-open" title="فتح القفل" color="var(--blue)"
                        disabled={unlockMut.isPending}
                        onClick={() => {
                            if (window.confirm("تأكيد فتح قفل هذا المستند؟"))
                                unlockMut.mutate(row.id);
                        }}
                    />
                )}

                {/* إلغاء */}
                {canCancel && (
                    <ActionBtn
                        icon="ti-ban" title="إلغاء" color="var(--red)"
                        disabled={cancelMut.isPending}
                        onClick={handleCancel}
                    />
                )}
            </div>
        );
    }, [isReadOnly, loadingEdit, openEditModal, lockMut, unlockMut, cancelMut]);

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
            {hiddenColumnKeys.length > 0 && (
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-eye-off" style={{ fontSize: 10 }} aria-hidden="true" />
                    {hiddenColumnKeys.length} مخفي
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
    ), [isFetching, isLoading, isReadOnly, isSalable, opColor, hiddenColumnKeys.length, initialSnapshot, resetColState]);

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
    const isExpandable  = useCallback((_row: CommercialDocument) => true, []);
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
                        columns={allColumns}
                        columnDefs={allColumns}
                        hiddenColumnKeys={hiddenColumnKeys}         // الأعمدة المخفية الأولية
                        onHiddenColumnsChange={handleHiddenColumnsChange}  // callback لحفظ التغييرات
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

            {convertDocId != null && (
                <ConvertDocumentModal
                    isOpen
                    onClose={() => setConvertDocId(null)}
                    onDone={() => { invalidateDocs(); showToast('تم تحويل المستند بنجاح', 'success'); }}
                    documentId={convertDocId}
                    sourceCode={convertSourceCode}
                    sourceDate={convertSourceDate}
                />
            )}

            <ToastContainer />
        </>
    );
}
```

## FILE: resources/js/pages/documents/components/AdvancePaymentsPanel.tsx
```
import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { AdvancePayment } from '../hooks/useAdvancePayments';

interface AdvancePaymentsPanelProps {
  advances:    AdvancePayment[] | undefined;
  isLoading:   boolean;
  onApply:     (advance: AdvancePayment) => void;
  disabled?:   boolean;
}

export function AdvancePaymentsPanel({
  advances, isLoading, onApply, disabled,
}: AdvancePaymentsPanelProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  if (isLoading) {
    return (
      <div style={{
        marginTop: 10, padding: '10px 12px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} />
        جاري تحميل الدفعات المتاحة...
      </div>
    );
  }

  if (!advances || advances.length === 0) return null;

  const totalUnapplied = advances.reduce((s, a) => s + a.unapplied_amount, 0);

  return (
    <div style={{
      marginTop: 10, borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: '100%', padding: '8px 12px', display: 'flex',
          alignItems: 'center', gap: 6, cursor: 'pointer',
          background: 'var(--bg3)', border: 'none',
          color: 'var(--t2)', fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit', textAlign: 'right',
        }}
      >
        <i className="ti ti-coin" style={{ fontSize: 12, color: 'var(--green)' }} />
        <span style={{ flex: 1 }}>دفعات متاحة للتطبيق</span>
        <span style={{
          padding: '1px 6px', borderRadius: 99, fontSize: 10,
          background: 'var(--greenb)', color: 'var(--green)', fontWeight: 700,
        }}>
          {fmtDZD(totalUnapplied)} دج
        </span>
        <i className={`ti ti-chevron-${collapsed ? 'down' : 'up'}`} style={{ fontSize: 10, color: 'var(--t4)' }} />
      </button>
      {!collapsed && (
        <div style={{ padding: '6px 8px', background: 'var(--bg1)' }}>
          {advances.map((adv) => (
            <div key={adv.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 'var(--r1)',
              opacity: disabled ? 0.6 : 1,
            }}>
              <i className="ti ti-currency-dollar" style={{ fontSize: 11, color: 'var(--green)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--t2)',
                  display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                }}>
                  <span>{adv.payment_number ?? `دفعة #${adv.id}`}</span>
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--t4)' }}>
                    {adv.payment_mode_name}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>{adv.payment_date}</span>
                  {adv.reference && <span>مرجع: {adv.reference}</span>}
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    المبلغ الأصلي: {fmtDZD(adv.amount)} دج
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtDZD(adv.unapplied_amount)} دج
                </div>
                <button
                  onClick={() => { if (!disabled) onApply(adv); }}
                  disabled={disabled}
                  style={{
                    marginTop: 2, padding: '2px 8px', borderRadius: 'var(--r1)',
                    border: '1px solid var(--green)', background: 'transparent',
                    color: 'var(--green)', cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                    whiteSpace: 'nowrap', transition: 'all .12s',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.background = 'var(--green)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--green)';
                    }
                  }}
                >
                  <i className="ti ti-arrow-left" style={{ marginLeft: 3, fontSize: 9 }} />
                  تطبيق
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/documents/components/CheckFormFields.tsx
```
import React from 'react';

interface CheckFormFieldsProps {
  checkNumber?: string;
  checkBank?:   string;
  checkDueDate?: string;
  onChange:     (fields: { check_number?: string; check_bank?: string; check_due_date?: string }) => void;
}

export function CheckFormFields({
  checkNumber = '',
  checkBank = '',
  checkDueDate = '',
  onChange,
}: CheckFormFieldsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8,
      marginTop: 8,
      padding: '10px 12px',
      borderRadius: 'var(--r2)',
      background: 'color-mix(in srgb, var(--purple) 6%, var(--bg2))',
      border: '1px solid color-mix(in srgb, var(--purple) 20%, transparent)',
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple)', marginBottom: 4 }}>
          <i className="ti ti-numbers" style={{ marginLeft: 4, fontSize: 10 }} />
          رقم الشيك
        </div>
        <input
          type="text"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)',
            background: 'var(--bg1)', color: 'var(--t1)',
            fontSize: 12, fontFamily: 'Tajawal, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={checkNumber}
          onChange={(e) => onChange({ check_number: e.target.value })}
          placeholder="رقم الشيك"
        />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple)', marginBottom: 4 }}>
          <i className="ti ti-building-bank" style={{ marginLeft: 4, fontSize: 10 }} />
          البنك
        </div>
        <input
          type="text"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)',
            background: 'var(--bg1)', color: 'var(--t1)',
            fontSize: 12, fontFamily: 'Tajawal, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={checkBank}
          onChange={(e) => onChange({ check_bank: e.target.value })}
          placeholder="اسم البنك"
        />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple)', marginBottom: 4 }}>
          <i className="ti ti-calendar-due" style={{ marginLeft: 4, fontSize: 10 }} />
          تاريخ الاستحقاق
        </div>
        <input
          type="date"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)',
            background: 'var(--bg1)', color: 'var(--t1)',
            fontSize: 12, fontFamily: 'Tajawal, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={checkDueDate}
          onChange={(e) => onChange({ check_due_date: e.target.value })}
        />
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/documents/components/ConvertDocumentModal.tsx
```
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import Modal from '@/components/ui/Modal';
import { useConvertDocument } from '../hooks/useDocumentChain';
import type { DocumentType } from '@/lib/api/core/types';

const CONVERSION_MAP: Record<string, string[]> = {
  DEV: ['BCC', 'BL', 'FV'],
  BCC: ['BL', 'FV'],
  BL:  ['FV'],
  DDP: ['BCF'],
  BCF: ['BR', 'FA'],
  BR:  ['FA'],
};

interface ConvertDocumentModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onDone:    () => void;
  documentId: number;
  sourceCode: string;
  sourceDate: string;
}

export default function ConvertDocumentModal({
  isOpen, onClose, onDone,
  documentId, sourceCode, sourceDate,
}: ConvertDocumentModalProps) {
  const slug  = useActiveSlug();
  const convertMut = useConvertDocument();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [targetCode, setTargetCode]   = useState('');
  const [docDate, setDocDate]         = useState(todayStr);
  const [error, setError]             = useState('');

  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef  = useRef<HTMLButtonElement>(null);

  const { data: docTypes = [] } = useQuery({
    queryKey: [slug, 'document-types'],
    queryFn:  () => apiGet<{ data?: DocumentType[] }>('/document-types', { per_page: 500 })
      .then(r => (r as any)?.data ?? r ?? []),
    staleTime: 10 * 60_000,
  });

  const allowedCodes = CONVERSION_MAP[sourceCode] ?? [];

  const allowedTypes = useMemo(() =>
    docTypes
      .filter((dt: any) => allowedCodes.includes(dt.code))
      .map((dt: any) => ({ code: dt.code, name: dt.name })),
    [docTypes, allowedCodes],
  );

  useEffect(() => {
    if (isOpen) {
      setTargetCode(allowedTypes[0]?.code ?? '');
      setDocDate(todayStr);
      setError('');
    }
  }, [isOpen, todayStr, allowedTypes]);

  const handleConvert = useCallback(() => {
    if (!targetCode) { setError('اختر نوع المستند'); return; }
    if (!docDate)    { setError('اختر التاريخ'); return; }
    setError('');

    console.log('[ConvertModal] sending date:', docDate);

    convertMut.mutate(
      { documentId, targetTypeCode: targetCode, documentDate: docDate },
      {
        onSuccess: () => { onDone(); onClose(); },
        onError:   (e: unknown) => setError(String((e as Record<string, unknown>)?.message ?? 'فشل التحويل')),
      },
    );
  }, [targetCode, docDate, documentId, convertMut, onDone, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const focusable = document.querySelectorAll<HTMLElement>(
        '#convert-modal input, #convert-modal select, #convert-modal button:not([disabled])'
      );
      const arr = Array.from(focusable);
      const idx = arr.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        arr[(idx - 1 + arr.length) % arr.length]?.focus();
      } else {
        arr[(idx + 1) % arr.length]?.focus();
      }
    }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === confirmRef.current) {
      e.preventDefault();
      handleConvert();
    }
  }, [onClose, handleConvert]);

  const isLoading = convertMut.isPending;

  return (
    <Modal open={isOpen} onClose={onClose} title="تحويل المستند">
      <div id="convert-modal" style={{ padding: '0 4px' }} onKeyDown={handleKeyDown}>
        {error && (
          <div style={{
            padding: '8px 12px', borderRadius: 'var(--r2)', marginBottom: 12,
            background: 'var(--redb)', border: '1px solid var(--red)',
            color: 'var(--red)', fontSize: 12, fontWeight: 600,
          }}>{error}</div>
        )}

        {/* قائمة أنواع المستندات المسموح التحويل إليها */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 6 }}>
            تحويل إلى
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {allowedTypes.map(t => (
              <button
                key={t.code}
                type="button"
                onClick={() => setTargetCode(t.code)}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.outline = '2px solid var(--em)'; (e.currentTarget as HTMLElement).style.outlineOffset = '1px'; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none'; }}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--r2)', cursor: 'pointer',
                  border: targetCode === t.code ? '2px solid var(--em)' : '1px solid var(--b3)',
                  background: targetCode === t.code ? 'color-mix(in srgb, var(--em) 10%, transparent)' : 'var(--bg2)',
                  color: targetCode === t.code ? 'var(--em)' : 'var(--t2)',
                  fontSize: 13, fontWeight: targetCode === t.code ? 700 : 500,
                  transition: 'all .1s',
                }}
              >
                {t.code} · {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* حقل التاريخ */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4, display: 'block' }}>
            تاريخ المستند الجديد
          </label>
          <input
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)',
              fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
        </div>

        {/* الفوتر */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--b1)', paddingTop: 14 }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 18px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              color: 'var(--t2)', cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            إلغاء
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConvert}
            disabled={isLoading || !targetCode}
            style={{
              padding: '8px 24px', borderRadius: 'var(--r2)',
              border: 'none', background: 'var(--em)', color: '#fff',
              cursor: isLoading || !targetCode ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
              opacity: isLoading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isLoading ? (
              <>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                جاري التحويل…
              </>
            ) : 'تحويل'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pages/documents/components/CreditCheckBar.tsx
```
import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { CreditCheckResult } from '../hooks/useCreditCheck';

interface CreditCheckBarProps {
  creditCheck:  CreditCheckResult | null | undefined;
  isLoading:    boolean;
  partyName?:   string;
}

export function CreditCheckBar({ creditCheck, isLoading, partyName }: CreditCheckBarProps) {
  if (isLoading) return null;
  if (!creditCheck) return null;

  if (!creditCheck.credit_limit) {
    if (creditCheck.overdue_invoices.count === 0) return null;
  }

  const usagePercent = creditCheck.credit_limit > 0
    ? Math.min(100, (creditCheck.used_credit / creditCheck.credit_limit) * 100)
    : 0;

  const barColor = creditCheck.will_exceed
    ? 'var(--red)'
    : usagePercent > 80
      ? 'var(--orange)'
      : 'var(--green)';

  return (
    <div style={{
      marginTop: 8, padding: '8px 12px',
      borderRadius: 'var(--r2)',
      background: creditCheck.will_exceed
        ? 'color-mix(in srgb, var(--red) 8%, transparent)'
        : 'var(--bg3)',
      border: creditCheck.will_exceed
        ? '1px solid color-mix(in srgb, var(--red) 30%, transparent)'
        : '1px solid var(--b2)',
    }}>
      {creditCheck.credit_limit > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-credit-card" style={{ fontSize: 12 }} />
              حد الائتمان: <b style={{ color: 'var(--t1)' }}>{fmtDZD(creditCheck.credit_limit)} دج</b>
            </span>
            <span style={{
              color: barColor, fontWeight: 700, fontSize: 11,
            }}>
              {creditCheck.will_exceed
                ? `تجاوز بـ ${fmtDZD(creditCheck.exceed_by)} دج`
                : `متاح: ${fmtDZD(creditCheck.available_credit ?? 0)} دج`}
            </span>
          </div>

          <div style={{
            height: 5, borderRadius: 99, background: 'var(--b2)',
            overflow: 'hidden', marginBottom: 6,
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, usagePercent)}%`,
              background: barColor,
              borderRadius: 99,
              transition: 'width .3s',
            }} />
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--t4)' }}>
            <span>مستخدم: {fmtDZD(creditCheck.used_credit)} دج</span>
            {creditCheck.credit_days > 0 && (
              <span>مدة الائتمان: {creditCheck.credit_days} يوم</span>
            )}
            {creditCheck.suggested_due_date && (
              <span>الاستحقاق المقترح: {creditCheck.suggested_due_date}</span>
            )}
          </div>
        </>
      )}

      {creditCheck.overdue_invoices.count > 0 && (
        <div style={{
          marginTop: creditCheck.credit_limit > 0 ? 8 : 0,
          padding: '5px 8px', borderRadius: 'var(--r1)',
          background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
          border: '1px solid var(--orange)',
          fontSize: 11, color: 'var(--orange)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 12, flexShrink: 0 }} />
          {partyName ?? 'الزبون'} لديه{' '}
          <b>{creditCheck.overdue_invoices.count}</b> فاتورة متأخرة
          بقيمة <b>{fmtDZD(creditCheck.overdue_invoices.total_amount)} دج</b>
        </div>
      )}

      {creditCheck.will_exceed && (
        <div style={{
          marginTop: 6, fontSize: 11, color: 'var(--red)',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className="ti ti-ban" style={{ fontSize: 12 }} />
          هذا المستند سيتجاوز حد الائتمان — يتطلب موافقة المدير
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/documents/components/CustomerInsightPanel.tsx
```
import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { CustomerInsightsData } from '../hooks/useCustomerInsights';

interface CustomerInsightPanelProps {
  insights:  CustomerInsightsData | null | undefined;
  isLoading: boolean;
}

export function CustomerInsightPanel({ insights, isLoading }: CustomerInsightPanelProps) {
  if (isLoading) {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        marginTop: 8, display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} />
        جاري تحميل تحليلات المتعامل...
      </div>
    );
  }

  if (!insights || !insights.party_id) return null;

  const {
    last_documents, document_count,
    monthly_avg_invoice, avg_payment_days, top_products,
  } = insights;

  const docLen = last_documents?.length ?? 0;

  return (
    <CollapsiblePanel title="تحليلات المتعامل" icon="ti-chart-bar" defaultOpen={false}>
      {/* الإحصائيات */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <StatChip label="عدد المستندات" value={String(document_count)} icon="ti-file-description" />
        {monthly_avg_invoice !== null && (
          <StatChip label="متوسط شهري" value={`${fmtDZD(monthly_avg_invoice)} دج`} icon="ti-calculator" />
        )}
        {avg_payment_days !== null && (
          <StatChip
            label="متوسط السداد"
            value={`${avg_payment_days > 0 ? '+' : ''}${avg_payment_days} يوم`}
            icon="ti-clock"
            color={avg_payment_days > 0 ? 'var(--red)' : 'var(--green)'}
          />
        )}
      </div>

      {/* آخر المستندات */}
      {docLen > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: 'var(--t4)', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <i className="ti ti-history" style={{ fontSize: 10 }} />
            آخر المستندات
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {last_documents.map((doc) => {
              const isOverdue = doc.status === 'overdue';
              const isUnpaid  = doc.remaining_amount > 0.01 && !isOverdue;
              return (
                <div key={doc.id} style={{
                  padding: '6px 8px', borderRadius: 'var(--r1)',
                  background: 'var(--bg2)', border: '1px solid var(--b1)',
                  fontSize: 11, display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <i className="ti ti-file" style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.document_number}
                    </span>
                    <span style={{ color: 'var(--t4)', fontSize: 10 }}>{doc.type_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDZD(doc.net_to_pay)} دج
                    </span>
                    {isOverdue && (
                      <span style={{
                        padding: '1px 5px', borderRadius: 99, fontSize: 9,
                        background: 'var(--redb)', color: 'var(--red)', fontWeight: 700,
                      }}>
                        متأخر
                      </span>
                    )}
                    {isUnpaid && (
                      <span style={{
                        padding: '1px 5px', borderRadius: 99, fontSize: 9,
                        background: 'var(--orangeb)', color: 'var(--orange)', fontWeight: 700,
                      }}>
                        غير مسدد
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* المنتجات الأكثر شراء */}
      {top_products && top_products.length > 0 && (
        <div>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: 'var(--t4)', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <i className="ti ti-star" style={{ fontSize: 10 }} />
            المنتجات الأكثر شراءً
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {top_products.map((p, i) => (
              <div key={p.id} style={{
                padding: '5px 8px', borderRadius: 'var(--r1)',
                background: 'var(--bg2)', border: '1px solid var(--b1)',
                fontSize: 11, display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: i === 0 ? 'var(--gold)' : 'var(--bg3)',
                    color: i === 0 ? 'white' : 'var(--t4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  {p.ref && <span style={{ color: 'var(--t4)', fontSize: 10, flexShrink: 0 }}>({p.ref})</span>}
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, color: 'var(--t3)' }}>
                  {p.total_qty} وحدة · {fmtDZD(p.total_amount)} دج
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CollapsiblePanel>
  );
}

function StatChip({ label, value, icon, color }: {
  label: string; value: string; icon: string; color?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5, flex: '1 0 auto',
      padding: '5px 10px', borderRadius: 'var(--r1)',
      background: 'var(--bg3)', border: '1px solid var(--b2)',
      fontSize: 11,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 11, color: color ?? 'var(--t4)' }} />
      <span style={{ color: 'var(--t4)' }}>{label}:</span>
      <span style={{ fontWeight: 700, color: color ?? 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

function CollapsiblePanel({ title, icon, defaultOpen, children }: {
  title: string; icon: string; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div style={{
      marginTop: 8, borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', padding: '8px 12px', display: 'flex',
          alignItems: 'center', gap: 6, cursor: 'pointer',
          background: 'var(--bg3)', border: 'none',
          color: 'var(--t2)', fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit', textAlign: 'right',
        }}
      >
        <i className={`ti ${icon}`} style={{ fontSize: 12, color: 'var(--t4)' }} />
        <span style={{ flex: 1 }}>{title}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 10, color: 'var(--t4)' }} />
      </button>
      {open && (
        <div style={{ padding: '10px 12px', background: 'var(--bg1)' }}>
          {children}
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/documents/components/DeliveryProgressBar.tsx
```
import React from 'react';

interface DeliveryProgressBarProps {
  quantity:           number;
  deliveredQuantity:  number;
  returnedQuantity:   number;
}

export function DeliveryProgressBar({
  quantity,
  deliveredQuantity,
  returnedQuantity,
}: DeliveryProgressBarProps) {
  const remaining = quantity - deliveredQuantity - returnedQuantity;
  const deliveredPct = quantity > 0 ? Math.min(100, (deliveredQuantity / quantity) * 100) : 0;
  const returnedPct  = quantity > 0 ? Math.min(100, (returnedQuantity  / quantity) * 100) : 0;

  const isFullyDelivered = remaining <= 0;

  return (
    <div style={{ minWidth: 160 }}>
      <div style={{
        height: 6, borderRadius: 99, background: 'var(--b2)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${deliveredPct}%`,
          background: 'var(--em)',
          transition: 'width .3s',
          position: 'absolute', right: 0, top: 0,
        }} />
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${returnedPct}%`,
          background: 'var(--purple)',
          transition: 'width .3s',
          position: 'absolute', right: 0, top: 0,
          opacity: 0.6,
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--t4)', marginTop: 2,
      }}>
        <span>
          {deliveredQuantity > 0 && (
            <span style={{ color: 'var(--em)', fontWeight: 600 }}>
              {deliveredQuantity}
            </span>
          )}
          {returnedQuantity > 0 && (
            <span style={{ color: 'var(--purple)', fontWeight: 600, marginRight: 4 }}>
              (مرتجع {returnedQuantity})
            </span>
          )}
          <span style={{ marginRight: 4 }}>
            / {quantity}
          </span>
        </span>
        <span style={{
          fontWeight: 700,
          color: isFullyDelivered ? 'var(--green)' : 'var(--orange)',
        }}>
          {isFullyDelivered ? 'مُسلَّم كلياً' : `${Math.round(100 - (remaining / quantity) * 100)}%`}
        </span>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/documents/components/DocumentChainPanel.tsx
```
import React, { useState } from 'react';
import { fmtDZD, fmtDate } from '../utils/document.utils';
import { STATUS_CONFIG } from '../types/document.types';
import type { DocumentChain, ChainNode } from '../hooks/useDocumentChain';

interface TargetType {
  code: string;
  name: string;
}

interface DocumentChainPanelProps {
  chain:           DocumentChain | null | undefined;
  isLoading:       boolean;
  currentId:       number;
  allowedTargets:  TargetType[];
  onConvert:       (targetCode: string) => void;
  onNavigate:      (documentId: number) => void;
  isReadOnly:      boolean;
}

function ChainNodeCard({
  node, isCurrent, onNavigate,
}: { node: ChainNode; isCurrent: boolean; onNavigate: (id: number) => void }) {
  const statusCfg = STATUS_CONFIG[node.status] ?? { label: node.status_label, color: 'var(--t4)', bg: 'var(--bg3)' };

  return (
    <div
      onClick={() => !isCurrent && onNavigate(node.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 'var(--r2)',
        border: isCurrent
          ? '1px solid var(--em)'
          : '1px solid var(--b2)',
        background: isCurrent ? 'var(--emb)' : 'var(--bg2)',
        cursor: isCurrent ? 'default' : 'pointer',
        transition: 'all .15s',
        minWidth: 0,
        opacity: node.is_cancellation ? 0.65 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontWeight: 700, fontSize: 12,
            color: isCurrent ? 'var(--em)' : 'var(--t1)',
          }}>
            {node.document_number}
          </span>
          <span style={{
            padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 700,
            background: statusCfg.bg, color: statusCfg.color,
          }}>
            {node.status_label}
          </span>
          {node.is_cancellation && (
            <span style={{ fontSize: 9, color: 'var(--red)' }}>مرتجع</span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>
          {node.document_type} · {node.type_name} · {fmtDate(node.document_date)} · {fmtDZD(node.net_to_pay)} دج
        </div>
      </div>
      {!isCurrent && (
        <i className="ti ti-external-link" style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
      )}
    </div>
  );
}

function NodeWithChildren({
  node, isCurrent, onNavigate,
}: { node: ChainNode; isCurrent: boolean; onNavigate: (id: number) => void }) {
  return (
    <div>
      <ChainNodeCard node={node} isCurrent={isCurrent} onNavigate={onNavigate} />
      {node.children && node.children.length > 0 && (
        <div style={{ marginTop: 4, marginRight: 16, borderRight: '2px solid var(--b2)', paddingRight: 8 }}>
          {node.children.map(child => (
            <div key={child.id} style={{ marginTop: 4 }}>
              <NodeWithChildren node={child} isCurrent={isCurrent && child.id === -1} onNavigate={onNavigate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentChainPanel({
  chain, isLoading, currentId, allowedTargets, onConvert, onNavigate, isReadOnly,
}: DocumentChainPanelProps) {
  const [showConvert, setShowConvert] = useState(false);

  if (isLoading) {
    return (
      <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--t4)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        جاري تحميل سلسلة المستندات...
      </div>
    );
  }

  if (!chain) return null;

  const hasRelations = chain.ancestors.length > 0 || chain.descendants.length > 0;

  return (
    <div style={{
      marginBottom: 14, padding: '10px 14px',
      background: 'var(--bg2)', borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: hasRelations ? 10 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>
          <i className="ti ti-link" style={{ fontSize: 12 }} />
          سلسلة المستندات
          {hasRelations && (
            <span style={{
              padding: '1px 6px', borderRadius: 99, fontSize: 10,
              background: 'var(--bg3)', color: 'var(--t4)',
            }}>
              {chain.ancestors.length + chain.descendants.length} مستند مرتبط
            </span>
          )}
        </div>

        {!isReadOnly && allowedTargets.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowConvert(!showConvert)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 'var(--r2)',
                border: '1px solid var(--blue)', background: 'var(--blueb)',
                color: 'var(--blue)', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              }}
            >
              <i className="ti ti-arrows-exchange" style={{ fontSize: 12 }} />
              تحويل إلى...
              <i className={`ti ti-chevron-${showConvert ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
            </button>

            {showConvert && (
              <div style={{
                position: 'absolute', left: 0, top: '100%', marginTop: 4,
                background: 'var(--bg1)', border: '1px solid var(--b2)',
                borderRadius: 'var(--r2)', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
                zIndex: 100, minWidth: 160, overflow: 'hidden',
              }}>
                {allowedTargets.map(t => (
                  <button
                    key={t.code}
                    onClick={() => { setShowConvert(false); onConvert(t.code); }}
                    style={{
                      width: '100%', padding: '8px 12px', textAlign: 'right',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: 'var(--t1)',
                      borderBottom: '1px solid var(--b1)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {t.code} · {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {hasRelations && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {chain.ancestors.map((ancestor, i) => (
            <div key={ancestor.id}>
              <ChainNodeCard node={ancestor} isCurrent={false} onNavigate={onNavigate} />
              <div style={{ marginRight: 16, borderRight: '2px solid var(--b2)', height: 6 }} />
            </div>
          ))}

          <ChainNodeCard node={chain.current} isCurrent onNavigate={onNavigate} />

          {chain.descendants.length > 0 && (
            <div style={{ marginRight: 16, borderRight: '2px solid var(--b2)', paddingRight: 8, marginTop: 4 }}>
              {chain.descendants.map(desc => (
                <div key={desc.id} style={{ marginTop: 4 }}>
                  <NodeWithChildren node={desc} isCurrent={false} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasRelations && (
        <div style={{ fontSize: 11, color: 'var(--t4)' }}>
          لا توجد مستندات مرتبطة
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/documents/components/DocumentLineRow.tsx
```
import React, { memo } from 'react';
import { calcLineTotal, fmtDZD, toNum } from '../utils/document.utils';
import { ProductSearch } from './ProductSearch';
import { cellStyle } from './DocumentUIPrimitives';
import type { LineItem, Product, ColKey } from '../types/document.types';
import type { LineStockValidation } from '../utils/document.utils';

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
  isTvaExempt?:   boolean;
}

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

export const DocumentLineRow = memo(function DocumentLineRow({
  line, idx, visibleCols, isPurchase, disabled, products, stockData,
  stockValidation, onUpdate, onRemove, onDuplicate, isTvaExempt,
}: DocumentLineRowProps) {

  const { baseQty, gross, discountAmt, discPct, ht, tva: lineTva, ttc } = calcLineTotal(line);

  const prodFromList = products.find((p) => String(p.id) === line.product_id);
  const prod         = prodFromList ?? line._product;
  const packagings   = prod?.packagings ?? [];
  const lots         = prod?.has_lots
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
        {col('idx') && (
          <td style={{ padding: '4px 6px', textAlign: 'center',
            color: 'var(--t4)', fontSize: 11 }}>
            {idx + 1}
          </td>
        )}

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

        {col('lot') && (
          <td style={{ padding: '3px 4px' }}>
            {isPurchase ? (
              <CellInput
                type="text"
                value={line.lot_number_new ?? ''}
                onChange={(v) => onUpdate(idx, { lot_number_new: v })}
                disabled={disabled}
              />
            ) : (
              prod?.has_lots ? (
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
              ) : (
                <span style={{ fontSize: 11, color: 'var(--t4)', padding: '0 6px' }}>—</span>
              )
            )}
          </td>
        )}

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

        {col('unit') && (
          <td style={{ padding: '3px 6px', textAlign: 'center',
            fontSize: 11, color: 'var(--t4)' }}>
            {prod?.unit?.symbol ?? '—'}
          </td>
        )}

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

        {col('orig_price') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t4)' }}>
            {fmtDZD(gross)}
          </td>
        )}

        {col('discount') && (
          <td style={{ padding: '3px 4px' }}>
            <div style={{ display: 'flex', gap: 2 }}>
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

        {col('price_after') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: discountAmt > 0 ? 'var(--em)' : 'var(--t3)' }}>
            {fmtDZD(ht)}
          </td>
        )}

        {col('tva') && (
          <td style={{ padding: '3px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CellInput
                value={line.tva_rate}
                min={0}
                step={1}
                onChange={(v) => onUpdate(idx, { tva_rate: toNum(v) })}
                disabled={disabled || isTvaExempt}
                width={isTvaExempt ? 40 : 60}
              />
              {isTvaExempt && (
                <span style={{
                  padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 700,
                  background: 'color-mix(in srgb, var(--green) 12%, transparent)',
                  color: 'var(--green)', whiteSpace: 'nowrap',
                }}>
                  <i className="ti ti-circle-check" style={{ marginLeft: 2, fontSize: 8 }} />
                  معفى
                </span>
              )}
            </div>
          </td>
        )}

        {col('total_ht') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t2)' }}>
            {fmtDZD(ht)}
          </td>
        )}

        {col('total_ttc') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>
            {fmtDZD(ttc)}
          </td>
        )}

        {col('margin') && (
          <td style={{ padding: '3px 6px', textAlign: 'center', fontSize: 11 }}>
            {(() => {
              if (isPurchase || !prod) return <span style={{ color: 'var(--t4)' }}>—</span>;
              const cost = toNum(prod.current_cost_price ?? prod.purchase_price_ht);
              if (!cost || !line.unit_price_ht) return <span style={{ color: 'var(--t4)' }}>—</span>;
              const margin = ((line.unit_price_ht - cost) / line.unit_price_ht) * 100;
              const color  = margin < 0 ? 'var(--red)' : margin < 10 ? 'var(--orange)' : 'var(--green)';
              return (
                <span style={{ color, fontWeight: 700 }}>
                  {margin.toFixed(1)}%
                </span>
              );
            })()}
          </td>
        )}

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

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  options:       ComboOption[];
  value:         string;
  onChange:      (id: string) => void;
  placeholder:   string;
  disabled?:     boolean;
  error?:        boolean;
  maxH?:         number;
  onAfterSelect?: () => void;
}

export function ComboBox({
  options, value, onChange, placeholder, disabled, error, maxH = 260, onAfterSelect,
}: ComboBoxProps) {
  const [open,       setOpen]       = useState(false);
  const [query,      setQuery]      = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const ref          = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.id) === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 80);
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sub ?? '').toLowerCase().includes(q),
    ).slice(0, 80);
  }, [options, query]);

  // Reset highlight when filtered list changes or dropdown closes
  useEffect(() => {
    if (!open) setHighlightIdx(-1);
    else if (filtered.length > 0) setHighlightIdx(0);
  }, [open, filtered.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLDivElement>('[data-combo-item]');
    items[highlightIdx]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

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

  const selectItem = (idx: number) => {
    const item = filtered[idx];
    if (!item) return;
    onChange(String(item.id));
    setOpen(false);
    setQuery('');
    onAfterSelect?.();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length === 0) return;
      const next = Math.min(highlightIdx + 1, filtered.length - 1);
      setHighlightIdx(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (highlightIdx <= 0) {
        setHighlightIdx(-1);
      } else {
        setHighlightIdx(highlightIdx - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < filtered.length) {
        selectItem(highlightIdx);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

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
                onKeyDown={handleInputKeyDown}
                placeholder="ابحث..."
                style={{ ...inputStyle(), paddingRight: 28, fontSize: 12, background: 'var(--bg1)' }}
              />
            </div>
          </div>
          <div ref={listRef} style={{ maxHeight: maxH, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>لا توجد نتائج</div>
              : filtered.map((o, i) => (
                <div
                  key={o.id}
                  data-combo-item
                  onClick={() => { selectItem(i); }}
                  onMouseEnter={(e) => { if (String(o.id) !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
                  onMouseLeave={(e) => { if (String(o.id) !== value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  style={{
                    padding: '8px 12px', cursor: 'pointer',
                    background: highlightIdx === i
                      ? 'var(--emb)'
                      : String(o.id) === value ? 'var(--emb)' : 'transparent',
                    borderBottom: '1px solid var(--b1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    outline: highlightIdx === i ? '2px solid var(--em)' : undefined,
                    outlineOffset: -2,
                  }}
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

// ─── Tabs ──────────────────────────────────────────────────────────────────────

export interface Tab {
  key:   string;
  label: string;
  icon:  string;
  badge?: number;
}

export function Tabs({
  tabs, activeKey, onChange, children, style,
}: {
  tabs:     Tab[];
  activeKey: string;
  onChange:  (key: string) => void;
  children?: React.ReactNode;
  style?:    React.CSSProperties;
}) {
  return (
    <div style={style}>
      <div style={{
        display: 'flex', gap: 2, borderBottom: '1px solid var(--b2)',
        marginBottom: 14, overflowX: 'auto',
      }}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                borderRadius: 'var(--r1) var(--r1) 0 0',
                background: isActive ? 'var(--bg1)' : 'transparent',
                color: isActive ? 'var(--em)' : 'var(--t4)',
                borderBottom: isActive ? '2px solid var(--em)' : '2px solid transparent',
                transition: 'all .15s',
              }}
            >
              <i className={`ti ${tab.icon}`} style={{ fontSize: 13 }} />
              {tab.label}
              {tab.badge != null && (
                <span style={{
                  padding: '0 6px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: isActive ? 'var(--emb)' : 'var(--bg3)',
                  color: isActive ? 'var(--em)' : 'var(--t4)',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
```

## FILE: resources/js/pages/documents/components/PaymentTermsTable.tsx
```
import React from 'react';
import { inputStyle, labelStyle } from './DocumentUIPrimitives';
import { fmtDZD, toNum } from '../utils/document.utils';
import type { PaymentTerm } from '../types/document.types';

interface PaymentTermsTableProps {
  terms:    PaymentTerm[];
  netToPay: number;
  disabled?: boolean;
  onChange: (terms: PaymentTerm[]) => void;
}

export function PaymentTermsTable({
  terms,
  netToPay,
  disabled = false,
  onChange,
}: PaymentTermsTableProps) {
  const update = (idx: number, patch: Partial<PaymentTerm>) => {
    const next = terms.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    const entry = next[idx];
    if (patch.percentage !== undefined && netToPay > 0) {
      entry.amount = Math.round((patch.percentage / 100) * netToPay * 100) / 100;
    } else if (patch.amount !== undefined && netToPay > 0) {
      entry.percentage = Math.round((patch.amount / netToPay) * 10000) / 100;
    }
    onChange(next);
  };

  const add = () => {
    onChange([...terms, { due_date: '', percentage: 0, amount: 0, notes: '' }]);
  };

  const remove = (idx: number) => {
    onChange(terms.filter((_, i) => i !== idx));
  };

  const totalPct = terms.reduce((s, t) => s + t.percentage, 0);
  const totalAmt = terms.reduce((s, t) => s + t.amount, 0);
  const isValid  = Math.abs(totalPct - 100) < 0.01;

  return (
    <div>
      {terms.length === 0 ? (
        <div style={{
          padding: 12, fontSize: 12, color: 'var(--t4)',
          background: 'var(--bg3)', borderRadius: 'var(--r2)', marginBottom: 8,
        }}>
          لا توجد شروط دفع محددة.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
          <thead>
            <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                تاريخ الاستحقاق
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                النسبة %
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                المبلغ
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                ملاحظات
              </th>
              {!disabled && <th style={{ width: 32 }} />}
            </tr>
          </thead>
          <tbody>
            {terms.map((t, i) => {
              const isLast = i === terms.length - 1;
              const remainingPct = Math.max(0, Math.round((100 - totalPct) * 100) / 100);
              return (
              <tr key={i} style={{ borderBottom: '1px solid var(--b1)' }}>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    type="date"
                    style={{ ...inputStyle(), fontSize: 11, padding: '4px 6px' }}
                    value={t.due_date}
                    disabled={disabled}
                    onChange={(e) => update(i, { due_date: e.target.value })}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    type="number" min={0} max={100} step={0.01}
                    style={{ ...inputStyle(), fontSize: 11, padding: '4px 6px', textAlign: 'center' }}
                    value={t.percentage || ''}
                    disabled={disabled}
                    onChange={(e) => update(i, { percentage: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td style={{ padding: '4px 6px', direction: 'ltr', textAlign: 'right' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min={0} step={0.01}
                      style={{ ...inputStyle(), fontSize: 11, padding: '4px 20px 4px 6px', textAlign: 'center' }}
                      value={t.amount || ''}
                      disabled={disabled}
                      onChange={(e) => update(i, { amount: parseFloat(e.target.value) || 0 })}
                    />
                    <span style={{
                      position: 'absolute', left: 6, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 9, color: 'var(--t4)', fontWeight: 600,
                      pointerEvents: 'none',
                    }}>دج</span>
                  </div>
                  {isLast && !disabled && remainingPct > 0.01 && (
                    <button
                      onClick={() => update(i, { percentage: remainingPct })}
                      style={{
                        display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--em)',
                        marginTop: 2, padding: 0, background: 'none',
                        border: 'none', cursor: 'pointer', textDecoration: 'underline',
                      }}
                    >
                      المبلغ المتبقي {fmtDZD(Math.round((remainingPct / 100) * netToPay * 100) / 100)}
                    </button>
                  )}
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    type="text"
                    style={{ ...inputStyle(), fontSize: 11, padding: '4px 6px' }}
                    value={t.notes ?? ''}
                    disabled={disabled}
                    onChange={(e) => update(i, { notes: e.target.value })}
                    placeholder="ملاحظة..."
                  />
                </td>
                {!disabled && (
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <button
                      onClick={() => remove(i)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--red)', padding: 2, fontSize: 14,
                      }}
                      title="حذف"
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </td>
                )}
              </tr>
            );
            })}
            {/* صف الإجمالي */}
            <tr style={{ background: 'var(--bg3)', borderTop: '2px solid var(--b2)' }}>
              <td style={{ padding: '5px 8px', fontWeight: 700, color: 'var(--t3)' }}>الإجمالي</td>
              <td style={{
                padding: '5px 8px', fontWeight: 700, textAlign: 'center',
                color: isValid ? 'var(--green)' : 'var(--red)',
              }}>
                {totalPct.toFixed(2)}%
              </td>
              <td style={{
                padding: '5px 8px', fontWeight: 700, direction: 'ltr', textAlign: 'right',
                color: isValid ? 'var(--green)' : 'var(--red)',
              }}>
                {fmtDZD(totalAmt)} دج
              </td>
              <td colSpan={disabled ? 1 : 2} style={{ padding: '5px 8px' }}>
                {!isValid && (
                  <span style={{ color: 'var(--red)', fontSize: 11 }}>
                    <i className="ti ti-alert-triangle" style={{ marginLeft: 4, fontSize: 10 }} />
                    المجموع يجب أن يساوي 100% (حالياً {totalPct.toFixed(2)}%)
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {!disabled && (
        <button
          onClick={add}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 'var(--r2)',
            border: '1px dashed var(--b3)', background: 'transparent',
            color: 'var(--t3)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget).style.borderColor = 'var(--em)';
            (e.currentTarget).style.color = 'var(--em)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget).style.borderColor = 'var(--b3)';
            (e.currentTarget).style.color = 'var(--t3)';
          }}
        >
          <i className="ti ti-plus" />
          إضافة قسط
        </button>
      )}
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

## FILE: resources/js/pages/documents/components/ReturnDocumentModal.tsx
```
import React, { useState, useMemo } from 'react';
import { fmtDZD } from '../utils/document.utils';
import { useCreateReturn } from '../hooks/useDocumentChain';
import type { LineItem } from '../types/document.types';

interface ReturnLine {
  line_id:       number;
  product_name:  string;
  max_quantity:  number;
  return_qty:    number;
  unit_price_ht: number;
  tva_rate:      number;
  packaging_label?: string;
}

interface ReturnDocumentModalProps {
  document:   Record<string, unknown>;
  onCreated:  (returnDoc: Record<string, unknown>) => void;
  onClose:    () => void;
}

export function ReturnDocumentModal({ document, onCreated, onClose }: ReturnDocumentModalProps) {
  const createReturn = useCreateReturn();
  const [reason, setReason] = useState('');
  const [error, setError]   = useState('');

  const lines = useMemo<ReturnLine[]>(() => {
    const rawLines = (document.lines as Record<string, unknown>[]) ?? [];
    return rawLines
      .filter(l => {
        const qty      = Number(l.quantity ?? 0);
        const returned = Number(l.returned_quantity ?? 0);
        return qty > returned;
      })
      .map(l => ({
        line_id:      Number(l.id),
        product_name: String(
          (l.product as Record<string, unknown> | null)?.name ?? l.description ?? ''
        ),
        max_quantity: Number(l.quantity ?? 0) - Number(l.returned_quantity ?? 0),
        return_qty:   Number(l.quantity ?? 0) - Number(l.returned_quantity ?? 0),
        unit_price_ht: Number(l.unit_price_ht ?? 0),
        tva_rate:     Number(l.tva_rate ?? 0),
        packaging_label: (l.packaging as Record<string, unknown> | null)?.label as string | undefined,
      }));
  }, [document.lines]);

  const [returnLines, setReturnLines] = useState<ReturnLine[]>(lines);

  const updateQty = (lineId: number, qty: number) => {
    setReturnLines(prev => prev.map(l =>
      l.line_id === lineId
        ? { ...l, return_qty: Math.min(l.max_quantity, Math.max(0, qty)) }
        : l
    ));
  };

  const total = returnLines.reduce((acc, l) => {
    const ht  = l.return_qty * l.unit_price_ht;
    const tva = ht * (l.tva_rate / 100);
    return acc + ht + tva;
  }, 0);

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('سبب الإرجاع إلزامي'); return; }
    const validLines = returnLines.filter(l => l.return_qty > 0);
    if (validLines.length === 0) { setError('يجب تحديد كمية للإرجاع في سطر واحد على الأقل'); return; }

    try {
      const result = await createReturn.mutateAsync({
        documentId: Number(document.id),
        reason,
        lines: validLines.map(l => ({ line_id: l.line_id, quantity: l.return_qty })),
      });
      onCreated(result as Record<string, unknown>);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'حدث خطأ أثناء إنشاء المرتجع');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.5)', direction: 'rtl',
    }}>
      <div style={{
        width: '92vw', maxWidth: 680, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg1)', borderRadius: 'var(--r3)',
        boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--b1)',
          background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'color-mix(in srgb, var(--purple) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--purple) 30%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-receipt-refund" style={{ fontSize: 17, color: 'var(--purple)' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>
                إنشاء مرتجع
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                من {String(document.document_number)}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid var(--b2)', background: 'none',
            cursor: 'pointer', color: 'var(--t3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {error && (
            <div style={{
              padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--r2)',
              background: 'var(--redb)', border: '1px solid var(--red)',
              fontSize: 12, color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 5 }}>
              سبب الإرجاع <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => { setReason(e.target.value); setError(''); }}
              placeholder="اذكر سبب الإرجاع..."
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 'var(--r2)',
                border: `1px solid ${!reason && error ? 'var(--red)' : 'var(--b3)'}`,
                background: 'var(--bg1)', color: 'var(--t1)',
                fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>
            الكميات المُرجَعة
          </div>

          {returnLines.map(line => (
            <div key={line.line_id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', marginBottom: 8, borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg2)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {line.product_name}
                </div>
                {line.packaging_label && (
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>{line.packaging_label}</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                  متاح للإرجاع: <b style={{ color: 'var(--t2)' }}>{line.max_quantity}</b> وحدة
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => updateQty(line.line_id, line.return_qty - 1)}
                  disabled={line.return_qty <= 0}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid var(--b2)', background: 'var(--bg1)',
                    cursor: line.return_qty <= 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--t3)',
                  }}
                >
                  <i className="ti ti-minus" style={{ fontSize: 11 }} />
                </button>
                <input
                  type="number"
                  min={0}
                  max={line.max_quantity}
                  step={0.001}
                  value={line.return_qty}
                  onChange={e => updateQty(line.line_id, parseFloat(e.target.value) || 0)}
                  style={{
                    width: 70, textAlign: 'center', padding: '5px',
                    borderRadius: 'var(--r1)', border: '1px solid var(--b3)',
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                  }}
                />
                <button
                  onClick={() => updateQty(line.line_id, line.return_qty + 1)}
                  disabled={line.return_qty >= line.max_quantity}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid var(--b2)', background: 'var(--bg1)',
                    cursor: line.return_qty >= line.max_quantity ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--t3)',
                  }}
                >
                  <i className="ti ti-plus" style={{ fontSize: 11 }} />
                </button>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', minWidth: 80, textAlign: 'left', direction: 'ltr' }}>
                {fmtDZD(
                  line.return_qty * line.unit_price_ht * (1 + line.tva_rate / 100)
                )} دج
              </div>
            </div>
          ))}

          <div style={{
            padding: '10px 12px', borderRadius: 'var(--r2)',
            background: 'var(--bg3)', border: '1px solid var(--b2)',
            display: 'flex', justifyContent: 'space-between',
            fontSize: 13, fontWeight: 700, color: 'var(--t1)',
          }}>
            <span>إجمالي المرتجع (TTC):</span>
            <span style={{ color: 'var(--purple)', direction: 'ltr' }}>
              {fmtDZD(total)} دج
            </span>
          </div>
        </div>

        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--b1)',
          background: 'var(--bg2)', display: 'flex', gap: 8, justifyContent: 'flex-start',
        }}>
          <button
            onClick={handleSubmit}
            disabled={createReturn.isPending}
            style={{
              padding: '8px 20px', borderRadius: 'var(--r2)',
              border: 'none', background: 'var(--purple)', color: 'white',
              cursor: createReturn.isPending ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, opacity: createReturn.isPending ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {createReturn.isPending
              ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري الإنشاء...</>
              : <><i className="ti ti-receipt-refund" /> إنشاء المرتجع</>
            }
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              cursor: 'pointer', fontSize: 13, color: 'var(--t2)',
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/documents/components/ShippingInfoSection.tsx
```
import React from 'react';
import { inputStyle, labelStyle } from './DocumentUIPrimitives';
import type { ShippingInfo } from '../types/document.types';

interface ShippingInfoSectionProps {
  value:       ShippingInfo;
  deliveryDate: string;
  disabled?:   boolean;
  onChange:    (info: ShippingInfo) => void;
  onDeliveryDateChange: (date: string) => void;
}

export function ShippingInfoSection({
  value,
  deliveryDate,
  disabled = false,
  onChange,
  onDeliveryDateChange,
}: ShippingInfoSectionProps) {
  const set = (k: keyof ShippingInfo, v: string) => {
    onChange({ ...value, [k]: v || undefined });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      padding: '12px 14px',
      borderRadius: 'var(--r2)',
      background: 'color-mix(in srgb, var(--blue) 5%, var(--bg2))',
      border: '1px solid color-mix(in srgb, var(--blue) 18%, transparent)',
    }}>
      {/* صف العنوان */}
      <div style={{ gridColumn: 'span 2', fontSize: 11, fontWeight: 700, color: 'var(--blue)',
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <i className="ti ti-truck-delivery" style={{ fontSize: 13 }} />
        معلومات الشحن
      </div>

      {/* تاريخ التسليم */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>تاريخ التسليم</span>
        <input
          type="date"
          style={inputStyle()}
          value={deliveryDate}
          disabled={disabled}
          onChange={(e) => onDeliveryDateChange(e.target.value)}
        />
      </div>

      {/* العنوان */}
      <div style={{ gridColumn: 'span 2' }}>
        <span style={{ ...labelStyle, fontSize: 10 }}>عنوان التسليم</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.address ?? ''}
          disabled={disabled}
          onChange={(e) => set('address', e.target.value)}
          placeholder="العنوان الكامل للتسليم"
        />
      </div>

      {/* وسيلة النقل */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>وسيلة النقل</span>
        <select
          style={{ ...inputStyle(), cursor: disabled ? 'not-allowed' : 'pointer' }}
          value={value.transport_mode ?? ''}
          disabled={disabled}
          onChange={(e) => set('transport_mode', e.target.value)}
        >
          <option value="">— اختر —</option>
          <option value="company">سيارة الشركة</option>
          <option value="external">نقل خارجي</option>
          <option value="client">استلام من الزبون</option>
          <option value="courier">توصيل (كوريير)</option>
        </select>
      </div>

      {/* اسم السائق */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>اسم السائق</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.driver_name ?? ''}
          disabled={disabled}
          onChange={(e) => set('driver_name', e.target.value)}
          placeholder="اسم السائق"
        />
      </div>

      {/* لوحة المركبة */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>لوحة المركبة</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.vehicle_plate ?? ''}
          disabled={disabled}
          onChange={(e) => set('vehicle_plate', e.target.value)}
          placeholder="رقم اللوحة"
        />
      </div>

      {/* ملاحظات السائق */}
      <div style={{ gridColumn: 'span 2' }}>
        <span style={{ ...labelStyle, fontSize: 10 }}>ملاحظات السائق</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.driver_notes ?? ''}
          disabled={disabled}
          onChange={(e) => set('driver_notes', e.target.value)}
          placeholder="ملاحظات للتوصيل..."
        />
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/documents/components/SmartSuggestionsPanel.tsx
```
import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { ProductSuggestion } from '../hooks/useProductSuggestions';

interface SmartSuggestionsPanelProps {
  suggestions:  ProductSuggestion[] | undefined;
  isLoading:    boolean;
  onAddProduct: (productId: number, suggestedPrice?: number | null, suggestedTva?: number | null) => void;
  disabled?:    boolean;
}

export function SmartSuggestionsPanel({
  suggestions, isLoading, onAddProduct, disabled,
}: SmartSuggestionsPanelProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  if (isLoading) {
    return (
      <div style={{
        marginTop: 10, padding: '10px 12px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} />
        جاري تحميل الاقتراحات...
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div style={{
      marginTop: 10, borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: '100%', padding: '8px 12px', display: 'flex',
          alignItems: 'center', gap: 6, cursor: 'pointer',
          background: 'var(--bg3)', border: 'none',
          color: 'var(--t2)', fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit', textAlign: 'right',
        }}
      >
        <i className="ti ti-bulb" style={{ fontSize: 12, color: 'var(--em)' }} />
        <span style={{ flex: 1 }}>منتجات مقترحة</span>
        <span style={{
          padding: '1px 6px', borderRadius: 99, fontSize: 10,
          background: 'var(--em)', color: 'white', fontWeight: 700,
        }}>
          {suggestions.length}
        </span>
        <i className={`ti ti-chevron-${collapsed ? 'down' : 'up'}`} style={{ fontSize: 10, color: 'var(--t4)' }} />
      </button>
      {!collapsed && (
        <div style={{ padding: '6px 8px', background: 'var(--bg1)' }}>
          {suggestions.map((p) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 'var(--r1)',
              transition: 'background .15s',
              cursor: disabled ? 'not-allowed' : 'default',
              opacity: disabled ? 0.6 : 1,
            }}
              onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--bg2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <i className="ti ti-package" style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--t2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8 }}>
                  {p.ref && <span>({p.ref})</span>}
                  <span>×{p.order_count} فاتورة</span>
                  {p.suggested_price !== null && (
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDZD(p.suggested_price)} دج
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (disabled) return;
                  onAddProduct(p.id, p.suggested_price, p.suggested_tva);
                }}
                disabled={disabled}
                style={{
                  padding: '4px 10px', borderRadius: 'var(--r1)',
                  border: '1px solid var(--em)', background: 'var(--emb)',
                  color: 'var(--em)', cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all .12s',
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.background = 'var(--em)';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.background = 'var(--emb)';
                    e.currentTarget.style.color = 'var(--em)';
                  }
                }}
              >
                <i className="ti ti-plus" style={{ marginLeft: 3, fontSize: 10 }} />
                أضف
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/documents/hooks/useAdvancePayments.ts
```
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface AdvancePayment {
  id:                number;
  payment_number:    string | null;
  payment_date:      string;
  amount:            number;
  unapplied_amount:  number;
  payment_mode_id:   number;
  payment_mode_name: string | null;
  reference:         string | null;
}

export function useAdvancePayments(partyId: number | null, enabled: boolean) {
  const slug = useActiveSlug();
  return useQuery<AdvancePayment[]>({
    queryKey: [slug, 'advance-payments', partyId],
    queryFn: async () => {
      if (!partyId) return [];
      return apiGet<AdvancePayment[]>(`/parties/${partyId}/advances`);
    },
    enabled: !!slug && !!partyId && enabled,
    staleTime: 30_000,
    gcTime: 15_000,
  });
}
```

## FILE: resources/js/pages/documents/hooks/useComputeLine.ts
```
import {
  useCallback, useRef, useEffect, useState,
} from 'react';
import { useActiveSlug } from '@/lib/store/appStore';
import { apiPost } from '@/lib/api/core/client';
import type { LineItem } from '../types/document.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComputeLineInput {
  product_id:     number;
  quantity:       number;
  packaging_id?:  number | null;
  price_level_id?: number | null;
  warehouse_id?:  number | null;
  party_id?:      number | null;
  is_purchase?:   boolean;
  document_date?: string;
}

export interface ComputeLineWarning {
  type:    string;
  level:   'info' | 'warning' | 'error';
  message: string;
}

export interface ComputeLineResult {
  unit_price_ht:             number;
  price_per_pack:            number;
  pack_qty:                  number;
  packaging_id?:             number | null;
  packaging_label?:          string | null;
  discount_percentage:       number;
  discount_amount_per_unit:  number;
  discount_amount_per_pack:  number;
  is_quantity_blocked:       boolean;
  quantity_discount_tier?:   { min_qty: number; max_qty?: number | null; tier_order: number } | null;
  tva_rate:                  number;
  is_tva_exempt:             boolean;
  base_qty:                  number;
  total_ht:                  number;
  total_tva:                 number;
  total_ttc:                 number;
  stock_available:           number | null;
  lot_suggestions:           Array<{
    id:                  number;
    lot_number:          string;
    remaining_quantity:  number;
    expiration_date?:    string | null;
    legal_selling_price?: number | null;
    is_expiring_soon:    boolean;
    is_expired:          boolean;
  }>;
  cost_price:                number;
  margin_amount:             number;
  margin_percentage:         number;
  effective_price_level_id?: number | null;
  party_credit_info?:        {
    credit_limit:     number;
    used_credit:      number;
    available_credit: number;
    will_exceed:      boolean;
    exceed_by:        number;
    credit_days:      number;
  } | null;
  warnings: ComputeLineWarning[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseComputeLineOptions {
  enabled:     boolean;
  onSuccess?:  (result: ComputeLineResult, lineIdx: number) => void;
  onWarnings?: (warnings: ComputeLineWarning[], lineIdx: number) => void;
}

export function useComputeLine({ enabled, onSuccess, onWarnings }: UseComputeLineOptions) {
  const slug          = useActiveSlug();
  const abortRefs     = useRef<Map<number, AbortController>>(new Map());
  const debounceRefs  = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [loading, setLoading] = useState<Set<number>>(new Set());

  useEffect(() => () => {
    debounceRefs.current.forEach(clearTimeout);
    abortRefs.current.forEach(ctrl => ctrl.abort());
  }, []);

  const compute = useCallback((
    lineIdx:  number,
    input:    ComputeLineInput,
    delay:    number = 350,
  ) => {
    if (!enabled || !slug || !input.product_id) return;

    const prevDebounce = debounceRefs.current.get(lineIdx);
    if (prevDebounce) clearTimeout(prevDebounce);

    const timer = setTimeout(async () => {
      abortRefs.current.get(lineIdx)?.abort();
      const ctrl = new AbortController();
      abortRefs.current.set(lineIdx, ctrl);

      setLoading(prev => new Set([...prev, lineIdx]));

      try {
        const result = await apiPost<ComputeLineResult>(
          '/documents/compute-line',
          input,
          { signal: ctrl.signal },
        );

        onSuccess?.(result, lineIdx);

        const activeWarnings = result.warnings.filter(w => w.level !== 'info');
        if (activeWarnings.length > 0) {
          onWarnings?.(activeWarnings, lineIdx);
        }

      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        console.warn(`compute-line error (idx=${lineIdx}):`, err);
      } finally {
        setLoading(prev => {
          const next = new Set(prev);
          next.delete(lineIdx);
          return next;
        });
        abortRefs.current.delete(lineIdx);
      }
    }, delay);

    debounceRefs.current.set(lineIdx, timer);
  }, [enabled, slug, onSuccess, onWarnings]);

  /** استدعاء فوري بدون debounce (عند اختيار منتج جديد) */
  const computeImmediate = useCallback((lineIdx: number, input: ComputeLineInput) => {
    compute(lineIdx, input, 0);
  }, [compute]);

  return { compute, computeImmediate, loading };
}
```

## FILE: resources/js/pages/documents/hooks/useCreditCheck.ts
```
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { toNum } from '../utils/document.utils';

export interface CreditCheckResult {
  party_id:              number;
  party_name:            string;
  credit_limit:          number;
  credit_days:           number;
  used_credit:           number;
  available_credit:      number | null;
  new_amount:            number;
  total_after:           number;
  will_exceed:           boolean;
  exceed_by:             number;
  suggested_due_date:    string | null;
  overdue_invoices:      { count: number; total_amount: number };
  is_tva_exempt:         boolean;
  is_final_consumer:     boolean;
  default_price_level_id: number | null;
  alerts:                Array<{ type: string; level: string; message: string }>;
  can_proceed:           boolean;
}

export function useCreditCheck(options: {
  partyId:    number | null;
  amount:     number;
  date:       string;
  isPurchase: boolean;
  enabled:    boolean;
}) {
  const slug = useActiveSlug();

  return useQuery<CreditCheckResult | null>({
    queryKey: [slug, 'credit-check', options.partyId, Math.round(options.amount), options.date],
    queryFn: async () => {
      if (!options.partyId) return null;
      return apiGet<CreditCheckResult>(
        `/parties/${options.partyId}/credit-check`,
        { amount: options.amount, date: options.date },
      );
    },
    enabled: !!slug && !!options.partyId && !options.isPurchase && options.enabled,
    staleTime: 30_000,
    gcTime: 10_000,
  });
}
```

## FILE: resources/js/pages/documents/hooks/useCustomerInsights.ts
```
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface CustomerInsightsData {
  party_id:           number;
  party_name:         string;
  party_type:         string | null;
  document_count:     number;
  last_documents:     Array<{
    id:               number;
    document_number:  string;
    document_type:    string | null;
    type_name:        string | null;
    document_date:    string;
    net_to_pay:       number;
    remaining_amount: number;
    status:           string | null;
    status_label:     string | null;
  }>;
  monthly_avg_invoice: number | null;
  avg_payment_days:   number | null;
  top_products:       Array<{
    id:           number;
    name:         string;
    ref:          string | null;
    total_qty:    number;
    total_amount: number;
  }>;
}

export function useCustomerInsights(partyId: number | null, enabled: boolean) {
  const slug = useActiveSlug();
  return useQuery<CustomerInsightsData | null>({
    queryKey: [slug, 'customer-insights', partyId],
    queryFn: async () => {
      if (!partyId) return null;
      return apiGet<CustomerInsightsData>(`/parties/${partyId}/insights`);
    },
    enabled: !!slug && !!partyId && enabled,
    staleTime: 60_000,
    gcTime: 30_000,
  });
}
```

## FILE: resources/js/pages/documents/hooks/useDocumentChain.ts
```
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { tenantKeys } from '@/lib/api/core/queryKeys';

export interface ChainNode {
  id:               number;
  document_number:  string;
  document_type:    string;
  type_name:        string;
  status:           string;
  status_label:     string;
  document_date:    string;
  net_to_pay:       number;
  is_cancellation:  boolean;
  children?:        ChainNode[];
}

export interface DocumentChain {
  ancestors:   ChainNode[];
  current:     ChainNode;
  descendants: ChainNode[];
}

export function useDocumentChain(documentId: number | null | undefined) {
  const slug = useActiveSlug();

  return useQuery<DocumentChain | null>({
    queryKey: [slug, 'document-chain', documentId],
    queryFn: () =>
      documentId
        ? apiGet<DocumentChain>(`/documents/${documentId}/chain`)
        : null,
    enabled: !!slug && !!documentId,
    staleTime: 60_000,
  });
}

// ─── Conversion mutation ──────────────────────────────────────────────────────

export interface ConversionPayload {
  documentId:      number;
  targetTypeCode:  string;
  documentDate?:   string;
  includeLineIds?: number[];
}

export function useConvertDocument() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, targetTypeCode, documentDate, includeLineIds }: ConversionPayload) =>
      apiPost(`/documents/${documentId}/convert`, {
        target_type_code: targetTypeCode,
        document_date:    documentDate ?? null,
        include_line_ids: includeLineIds,
      }),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    },
  });
}

// ─── Return mutation ──────────────────────────────────────────────────────────

export interface ReturnPayload {
  documentId: number;
  reason:     string;
  lines:      Array<{ line_id: number; quantity: number }>;
}

export function useCreateReturn() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, reason, lines }: ReturnPayload) =>
      apiPost(`/documents/${documentId}/return`, { reason, lines }),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    },
  });
}
```

## FILE: resources/js/pages/documents/hooks/useDocumentForm.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocumentForm.ts — إصلاح كامل للحسابات
//
// ══ نموذج الكميات والتعبئة ════════════════════════════════════════════════
//
// الفرونتند يعمل بـ "عدد العبوات" (displayQty) — هذا ما يُدخله المستخدم.
// الباكاند يخزن "وحدات أساسية" (baseQty = displayQty × _packQty).
//
// مثال: المستخدم يدخل 2 كرتون × 12 قارورة = 24 قارورة تُرسَل للباكاند.
//
// ══ نموذج الخصم ══════════════════════════════════════════════════════════
//
// الباكاند يخزن:
//   discount_percentage = نسبة الخصم (تُستخدم في الحساب)
//   discount_amount     = مبلغ خصم الوحدة الواحدة = unit_price_ht × discPct/100
//                         (للمرجع فقط — الحساب يعتمد على discPct)
//
// الفرونتند (percent mode):
//   يُرسل: discount_percentage = L.discount_percentage
//           discount_amount = unit_price_ht × discPct/100  (خصم وحدة واحدة)
//
// الفرونتند (fixed mode):
//   المستخدم يدخل: discount_amount_fixed = خصم العبوة الواحدة
//   يُحوَّل: discPct = (discount_amount_fixed / price_per_pack) × 100
//   يُرسل: discount_percentage = discPct
//           discount_amount = unit_price_ht × discPct/100
//
// ══ الاستقبال من الباكاند (بناء السطر من API) ════════════════════════════
//
//   displayQty = db.quantity / _packQty
//   discount_amount_fixed = db.discount_amount × _packQty
//     (تحويل خصم الوحدة إلى خصم العبوة للعرض)
//
// ════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { DocumentType } from '@/lib/api/core/types';
import {
  today,
  resolvePrice,
  resolveQuantityDiscount,
  calcTotals,
  calcLineTotal,
  validateLineStock,
  toNum,
} from '../utils/document.utils';
import { useComputeLine } from './useComputeLine';
import type { ComputeLineWarning } from './useComputeLine';
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
  ShippingInfo,
  PaymentTerm,
} from '../types/document.types';
import type { LineStockValidation } from '../utils/document.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormErrors = Record<string, string>;

export interface PartyBalanceInfo {
  party_id:          number;
  current_balance:   number;
  signed_balance:    number;
  balance_type:      'debit' | 'credit';
  opening_balance:   number;
  documents_balance: number;
  payments_total:    number;
  fiscal_year_id:    number;
  date:              string;
}

export type PaymentMode = 'free' | 'additive' | 'locked';

export interface PartyChangeResult {
  blocked:    boolean;
  reason?:    string;
  blockType?: 'has_payments' | 'price_level_change' | 'existing_payments';
}

interface UseDocumentFormOptions {
  documentType:       DocumentType | null;
  existingDocument?:  Record<string, unknown>;
  defaultTvaRate:     number;
  defaultWarehouseId: string;
  baseCurrencyId:     string;
  selectedYearId:     string;
  paymentModes: Array<{
    id:                   number;
    name:                 string;
    code?:                string | null;
    icon?:                string | null;
    treasury_account_id?: number | null;
    requires_reference?:  boolean;
    is_cash?:             boolean;
  }>;
  parties: Array<{
    id:                       number;
    name:                     string;
    default_price_level_id?:  number | null;
    default_price_level?:     { id: number; name: string } | null;
  }>;
  products:   Product[];
  stockData:  Record<number, number>;
  isPurchase: boolean;
  open:       boolean;
}

export interface UseDocumentFormReturn {
  form:                   DocumentFormState;
  errors:                 FormErrors;
  lineErr:                string;
  apiErr:                 string;
  setApiErr:              (msg: string) => void;
  set:                    (k: keyof DocumentFormState, v: unknown) => void;
  handlePartyChange:      (id: string) => PartyChangeResult;
  handlePriceLevelChange: (priceLevelIdStr: string) => void;
  priceLevelId:           number | null;
  addLine:                () => void;
  removeLine:             (idx: number) => void;
  duplicateLine:          (idx: number) => void;
  updateLine:             (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  paymentMode:            PaymentMode;
  existingPayments:       PaymentEntry[];
  newPayments:            PaymentEntry[];
  addPayment:             () => void;
  removePayment:          (idx: number) => void;
  updatePayment:          (idx: number, patch: Partial<PaymentEntry>) => void;
  partyBalance:           PartyBalanceInfo | null;
  isLoadingBalance:       boolean;
  totals:                 DocumentTotals;
  validate:               () => boolean;
  buildPayload:           () => Record<string, unknown>;
  validateLineStock:      (line: LineItem, product: Product) => LineStockValidation;
  updateStockData:        (data: Record<number, number>) => void;
  docCode:                string;
  isEdit:                 boolean;
  needsParty:             boolean;
  affectsStock:           boolean;
  stockDir:               1 | -1 | 0;
  isReadOnly:             boolean;
  isLinesReadOnly:        boolean;
  lineWarnings:           Map<number, ComputeLineWarning[]>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALIDATED_STATUSES = new Set(['validated', 'paid', 'partially_paid', 'overdue']);
const LOCKED_STATUSES    = new Set(['cancelled', 'returned']);

// ─── makeLine ─────────────────────────────────────────────────────────────────

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

// ─── resolvePackQty ───────────────────────────────────────────────────────────

/**
 * يحدد كمية الوحدات في العبوة من مصادر متعددة:
 * 1. packaging relation مُحمَّلة مباشرة
 * 2. product.packagings من productRel
 * 3. products list (عند التعديل)
 */
function resolvePackQty(
  packagingId:  string,
  packagingRel: Record<string, unknown> | null,
  productRel:   Record<string, unknown> | null,
  products?:    Product[],
  productId?:   string,
): number {
  if (!packagingId) return 1;

  // 1. من العلاقة المباشرة
  if (packagingRel) {
    const q = Number(packagingRel.quantity);
    if (q > 0) return q;
  }

  // 2. من packagings المنتج في API response
  if (productRel) {
    const pkgs = (productRel as Record<string, unknown>).packagings;
    if (Array.isArray(pkgs)) {
      const found = pkgs.find((p: Record<string, unknown>) => String(p.id) === packagingId);
      if (found) {
        const q = Number((found as Record<string, unknown>).quantity);
        if (q > 0) return q;
      }
    }
  }

  // 3. من قائمة products الكاملة
  if (products && productId) {
    const prod = products.find((p) => String(p.id) === productId);
    const pkg  = prod?.packagings?.find((p) => String(p.id) === packagingId);
    if (pkg) {
      const q = Number(pkg.quantity);
      if (q > 0) return q;
    }
  }

  return 1;
}

// ─── buildLineFromApi ─────────────────────────────────────────────────────────

/**
 * بناء LineItem من بيانات الباكاند.
 *
 * الباكاند يخزن:
 *   quantity      = وحدات أساسية
 *   discount_amount = خصم الوحدة الواحدة = unit_price × discPct/100
 *
 * الفرونتند يعرض:
 *   quantity      = عدد العبوات = db.quantity / packQty
 *   discount_amount_fixed = خصم العبوة الواحدة = db.discount_amount × packQty
 */
function buildLineFromApi(
  l:              Record<string, unknown>,
  defaultTvaRate: number,
  products?:      Product[],
): LineItem {
  const productRel =
    (l.product        as Record<string, unknown> | null) ??
    (l.productVariant as Record<string, unknown> | null) ??
    null;

  const packagingRel = (l.packaging as Record<string, unknown> | null) ?? null;
  const packagingId  = packagingRel
    ? String(packagingRel.id)
    : l.packaging_id ? String(l.packaging_id) : '';

  const packQty = resolvePackQty(
    packagingId,
    packagingRel,
    productRel,
    products,
    String(l.product_id ?? ''),
  );

  const stockLotRel =
    (l.stockLot  as Record<string, unknown> | null) ??
    (l.stock_lot as Record<string, unknown> | null) ??
    null;
  const stockLotId = stockLotRel
    ? String(stockLotRel.id)
    : l.stock_lot_id ? String(l.stock_lot_id) : '';

  const unitPrice          = toNum(l.unit_price_ht ?? 0);
  const discountPercentage = toNum(l.discount_percentage ?? 0);

  // discount_amount في DB = خصم الوحدة الواحدة
  // discount_amount_fixed في الفرونتند = خصم العبوة الواحدة
  const dbDiscountAmount   = toNum(l.discount_amount ?? 0);
  const discountAmountFixed = packQty > 1
    ? Math.round(dbDiscountAmount * packQty * 10_000) / 10_000
    : dbDiscountAmount;

  const discountMode: 'percent' | 'fixed' =
    dbDiscountAmount > 0 && discountPercentage === 0 ? 'fixed' : 'percent';

  // TVA: 0 = معفى (قيمة صحيحة — لا تُستبدَل)
  let tvaRate = l.tva_rate != null ? toNum(l.tva_rate) : NaN;
  if (isNaN(tvaRate) && productRel) {
    tvaRate = toNum((productRel.tva as Record<string, unknown> | null)?.rate ?? NaN);
  }
  if (isNaN(tvaRate)) tvaRate = defaultTvaRate;

  // تحويل الكمية من وحدات أساسية إلى عدد عبوات
  const dbQty    = toNum(l.quantity ?? 1) || 1;
  const displayQty = packQty > 1
    ? Math.round((dbQty / packQty) * 1_000_000) / 1_000_000
    : dbQty;

  return {
    id:                    l.id as number | undefined,
    product_id:            String(l.product_id ?? ''),
    description:           String(l.description ?? ''),
    quantity:              displayQty,
    unit_price_ht:         unitPrice,
    price_per_pack:        Math.round(unitPrice * packQty * 10_000) / 10_000,
    discount_mode:         discountMode,
    discount_percentage:   discountPercentage,
    discount_amount_fixed: discountAmountFixed,
    tva_rate:              tvaRate,
    packaging_id:          packagingId,
    stock_lot_id:          stockLotId,
    lot_number_new:        String(
      stockLotRel?.lot_number ?? l.lot_number ?? l.lot_number_new ?? '',
    ),
    line_note:             String(l.notes ?? l.line_note ?? ''),
    _product:              productRel as Product | undefined,
    _packQty:              packQty,
  };
}

// ─── buildPaymentFromApi ──────────────────────────────────────────────────────

export function buildPaymentFromApi(p: Record<string, unknown>): PaymentEntry {
  const treasuryId = p.treasury_account_id
    ? String(p.treasury_account_id)
    : (p.treasuryAccount as Record<string, unknown> | null)?.id
      ? String((p.treasuryAccount as Record<string, unknown>).id)
      : '';

  const paymentModeId = String(
    p.payment_mode_id ??
    (p.paymentMode as Record<string, unknown> | null)?.id ??
    '',
  );

  return {
    payment_mode_id:     paymentModeId,
    amount:              String(p.amount ?? '0'),
    reference:           String(p.reference ?? ''),
    payment_date:        String(p.payment_date ?? today()).split('T')[0],
    treasury_account_id: treasuryId,
  };
}

// ─── buildDefaultForm ─────────────────────────────────────────────────────────

function buildDefaultForm(
  existingDocument: Record<string, unknown> | undefined,
  defaults: { warehouseId: string; currencyId: string; yearId: string },
  defaultTvaRate: number,
  products?: Product[],
): DocumentFormState {
  const defaultShipping: ShippingInfo = {};
  const defaultPaymentTerms: PaymentTerm[] = [];

  if (existingDocument) {
    const doc   = existingDocument;
    const lines = ((doc.lines as Record<string, unknown>[]) ?? [])
      .map((l) => buildLineFromApi(l, defaultTvaRate, products));

    const rawShipping = (doc as Record<string, unknown>).shipping_info;
    const rawTerms    = (doc as Record<string, unknown>).payment_terms;

    return {
      party_id:       String(doc.party_id       ?? ''),
      document_date:  String(doc.document_date  ?? today()).split('T')[0],
      due_date:       doc.due_date ? String(doc.due_date).split('T')[0] : '',
      delivery_date:  doc.delivery_date ? String(doc.delivery_date).split('T')[0] : '',
      notes:          String(doc.notes          ?? ''),
      internal_notes: String(doc.internal_notes ?? ''),
      warehouse_id:   String(doc.warehouse_id   ?? ''),
      fiscal_year_id: String(doc.fiscal_year_id ?? ''),
      currency_id:    String(doc.currency_id    ?? ''),
      exchange_rate:  String(doc.exchange_rate  ?? '1'),
      apply_stamp:    toNum(doc.total_stamp ?? doc.fiscal_stamp ?? 0) > 0,
      price_level_id: String(doc.price_level_id ?? ''),
      is_proforma:    !!(doc as Record<string, unknown>).is_proforma,
      lines,
      payments: [],
      shipping_info:  (typeof rawShipping === 'object' && rawShipping !== null)
        ? (rawShipping as ShippingInfo) : { ...defaultShipping },
      payment_terms:  Array.isArray(rawTerms)
        ? (rawTerms as PaymentTerm[]) : [...defaultPaymentTerms],
    };
  }

  return {
    party_id: '', document_date: today(), due_date: '', delivery_date: '',
    notes: '', internal_notes: '',
    warehouse_id:   defaults.warehouseId,
    fiscal_year_id: defaults.yearId,
    currency_id:    defaults.currencyId,
    exchange_rate:  '1',
    apply_stamp:    false,
    price_level_id: '',
    is_proforma:    false,
    lines: [], payments: [],
    shipping_info:  { ...defaultShipping },
    payment_terms:  [...defaultPaymentTerms],
  };
}

// ─── resolvePaymentMode ───────────────────────────────────────────────────────

function resolvePaymentMode(
  existingDocument: Record<string, unknown> | undefined,
  isLocked:    boolean,
  isCancelled: boolean,
): PaymentMode {
  if (!existingDocument) return 'free';
  if (isLocked || isCancelled) return 'locked';
  const statusName = String(
    (existingDocument.document_status as Record<string, unknown> | undefined)?.name
    ?? existingDocument.status ?? '',
  ).toLowerCase();
  if (VALIDATED_STATUSES.has(statusName)) return 'additive';
  return 'free';
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
  products,
  stockData,
  isPurchase,
  open,
}: UseDocumentFormOptions): UseDocumentFormReturn {

  const slug    = useActiveSlug();
  const docCode = documentType?.code ?? '';
  const isEdit  = !!existingDocument;

  const needsParty   = REQUIRES_PARTY.has(docCode);
  const affectsStock = STOCK_IN_CODES.has(docCode) || STOCK_OUT_CODES.has(docCode);
  const stockDir: 1 | -1 | 0 = STOCK_IN_CODES.has(docCode) ? 1
                              : STOCK_OUT_CODES.has(docCode) ? -1 : 0;

  // ── حالة المستند ──────────────────────────────────────────────────────────

  const docStatusName = String(
    (existingDocument?.document_status as Record<string, unknown> | undefined)?.name
    ?? existingDocument?.status ?? '',
  ).toLowerCase();

  const isLocked    = !!(existingDocument?.is_locked);
  const isCancelled = LOCKED_STATUSES.has(docStatusName);
  const isReadOnly  = isLocked || isCancelled;
  const isLinesReadOnly = isReadOnly;

  const pmMode = resolvePaymentMode(existingDocument, isLocked, isCancelled);

  // ── Refs ──────────────────────────────────────────────────────────────────

  const stockDataRef   = useRef(stockData);
  const paymentModsRef = useRef(paymentModes);
  const partiesRef     = useRef(parties);
  const productsRef    = useRef(products);
  const formRef        = useRef<DocumentFormState | null>(null);

  useEffect(() => { stockDataRef.current   = stockData;    }, [stockData]);
  useEffect(() => { paymentModsRef.current = paymentModes; }, [paymentModes]);
  useEffect(() => { partiesRef.current     = parties;      }, [parties]);
  useEffect(() => { productsRef.current    = products;     }, [products]);

  // ── State ─────────────────────────────────────────────────────────────────

  const [form, setForm]   = useState<DocumentFormState>(() =>
    buildDefaultForm(existingDocument, {
      warehouseId: defaultWarehouseId,
      currencyId:  baseCurrencyId,
      yearId:      selectedYearId,
    }, defaultTvaRate, products),
  );
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [lineErr, setLineErr] = useState('');
  const [apiErr,  setApiErr]  = useState('');

  const [existingPayments, setExistingPayments] = useState<PaymentEntry[]>([]);
  const [newPayments,      setNewPayments]      = useState<PaymentEntry[]>([]);
  const [lineWarnings, setLineWarnings] = useState<Map<number, ComputeLineWarning[]>>(new Map());

  useEffect(() => { formRef.current = form; }, [form]);

  // ── useComputeLine — تحديث السطر من الباكاند ──────────────────────────────
  const warehouseIdForCompute = form.warehouse_id ? parseInt(form.warehouse_id) : null;
  const partyIdForCompute     = form.party_id     ? parseInt(form.party_id)     : null;

  const { compute: triggerCompute } = useComputeLine({
    enabled: !!slug,
    onSuccess: (result, lineIdx) => {
      setForm(f => {
        const lines = [...f.lines];
        const L     = lines[lineIdx];
        if (!L || !L.product_id) return f;
        lines[lineIdx] = {
          ...L,
          unit_price_ht:         result.unit_price_ht,
          price_per_pack:        result.price_per_pack,
          _packQty:              result.pack_qty,
          discount_percentage:   result.discount_percentage,
          discount_amount_fixed: result.discount_amount_per_pack,
          discount_mode:         result.discount_percentage > 0 ? 'percent' : 'fixed',
          tva_rate:              result.tva_rate,
          // الكوم FEFO الأول إذا لم يكن محدداً
          stock_lot_id: L.stock_lot_id || (
            result.lot_suggestions[0] ? String(result.lot_suggestions[0].id) : ''
          ),
          _computing: false,
          _warnings:  result.warnings,
        };
        return { ...f, lines };
      });
    },
    onWarnings: (warnings, lineIdx) => {
      setLineWarnings(prev => {
        const next = new Map(prev);
        if (warnings.length > 0) next.set(lineIdx, warnings);
        else next.delete(lineIdx);
        return next;
      });
    },
  });

  // ── Reset عند فتح ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    setForm(buildDefaultForm(
      existingDocument,
      { warehouseId: defaultWarehouseId, currencyId: baseCurrencyId, yearId: selectedYearId },
      defaultTvaRate,
      productsRef.current,
    ));
    setErrors({});
    setLineErr('');
    setApiErr('');

    const rawPayments = ((existingDocument?.payments as Record<string, unknown>[]) ?? [])
      .map(buildPaymentFromApi);

    if (pmMode === 'additive') {
      setExistingPayments(rawPayments);
      setNewPayments([]);
    } else if (pmMode === 'free') {
      setExistingPayments([]);
      setNewPayments(rawPayments);
    } else {
      setExistingPayments(rawPayments);
      setNewPayments([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingDocument?.id]);

  useEffect(() => {
    if (isEdit || !open) return;
    setForm((f) => ({
      ...f,
      warehouse_id:   f.warehouse_id   || defaultWarehouseId,
      currency_id:    f.currency_id    || baseCurrencyId,
      fiscal_year_id: f.fiscal_year_id || selectedYearId,
    }));
  }, [defaultWarehouseId, baseCurrencyId, selectedYearId, isEdit, open]);

  // ── set ───────────────────────────────────────────────────────────────────

  const set = useCallback((k: keyof DocumentFormState, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => { const n = { ...prev }; delete n[k as string]; return n; });
  }, []);

  const priceLevelId = useMemo(
    () => (form.price_level_id ? parseInt(form.price_level_id) : null),
    [form.price_level_id],
  );

  // ── رصيد المتعامل ─────────────────────────────────────────────────────────

  const partyIdNum = form.party_id ? parseInt(form.party_id) : null;

  const { data: partyBalance = null, isLoading: isLoadingBalance } =
    useQuery<PartyBalanceInfo | null>({
      queryKey: [slug, 'party-balance', partyIdNum, form.fiscal_year_id, form.document_date],
      queryFn: async () => {
        if (!partyIdNum) return null;
        return apiGet<PartyBalanceInfo>(
          `/party-balances/${partyIdNum}`,
          { date: form.document_date || today() },
        );
      },
      enabled:   !!slug && !!partyIdNum && needsParty,
      staleTime: 60_000,
    });

  // ── handlePartyChange ─────────────────────────────────────────────────────

  const handlePartyChange = useCallback((id: string): PartyChangeResult => {
    if (isPurchase) {
      setForm((f) => ({ ...f, party_id: id }));
      setErrors((prev) => { const n = { ...prev }; delete n.party_id; return n; });
      return { blocked: false };
    }

    const curForm       = formRef.current!;
    const party         = partiesRef.current.find((p) => String(p.id) === id);
    const newPriceLevel = party?.default_price_level_id ?? null;
    const curPriceLvl   = curForm.price_level_id ? parseInt(curForm.price_level_id) : null;

    if (existingPayments.length > 0) {
      return {
        blocked: true, blockType: 'existing_payments',
        reason: 'لا يمكن تغيير الزبون: هناك دفعات مُسجَّلة. احذف الدفعات أولاً.',
      };
    }

    const validNew = newPayments.filter((p) => p.payment_mode_id && parseFloat(p.amount) > 0);
    if (validNew.length > 0) {
      return {
        blocked: true, blockType: 'has_payments',
        reason: `لا يمكن تغيير الزبون: هناك ${validNew.length} دفعة في النموذج. احذفها أولاً.`,
      };
    }

    const hasFilledLines  = curForm.lines.some((l) => l.product_id !== '');
    const priceWillChange = newPriceLevel !== curPriceLvl;

    if (hasFilledLines && priceWillChange) {
      return {
        blocked: true, blockType: 'price_level_change',
        reason: `فئة السعر ستتغير. احذف الأسطر أولاً ثم غيِّر الزبون.`,
      };
    }

    const newPriceLevelStr = newPriceLevel ? String(newPriceLevel) : '';

    // due_date تلقائي من credit_days
    const creditDays = (party as Record<string, unknown> | undefined)?.credit_days as number ?? 0;
    const curDate    = formRef.current?.document_date || today();
    let   newDueDate = formRef.current?.due_date || '';
    if (creditDays > 0) {
      const d = new Date(curDate);
      d.setDate(d.getDate() + creditDays);
      newDueDate = d.toISOString().split('T')[0];
    }

    setForm((f) => {
      const isTvaExempt = (party as Record<string, unknown> | undefined)?.is_tva_exempt as boolean ?? false;

      // إذا كان الزبون معفى من TVA → تصفير TVA في كل الأسطر
      const updatedLines = isTvaExempt
        ? f.lines.map(line => ({ ...line, tva_rate: 0 }))
        : f.lines;

      return {
        ...f,
        party_id:       id,
        price_level_id: newPriceLevelStr,
        lines:          updatedLines,
        ...(newDueDate ? { due_date: newDueDate } : {}),
      };
    });
    setErrors((prev) => { const n = { ...prev }; delete n.party_id; return n; });
    return { blocked: false };
  }, [isPurchase, existingPayments.length, newPayments]);

  // ── handlePriceLevelChange ────────────────────────────────────────────────

  const handlePriceLevelChange = useCallback((priceLevelIdStr: string) => {
    const newPriceLevelId = priceLevelIdStr ? parseInt(priceLevelIdStr) : null;

    setForm((f) => ({
      ...f,
      price_level_id: priceLevelIdStr,
      lines: f.lines.map((line) => {
        if (!line.product_id || !line._product) return line;
        const newPrice = resolvePrice(line._product, newPriceLevelId, isPurchase);
        return {
          ...line,
          unit_price_ht:  newPrice,
          price_per_pack: Math.round(newPrice * line._packQty * 10_000) / 10_000,
        };
      }),
    }));
  }, [isPurchase]);

  // ── updateLine ────────────────────────────────────────────────────────────

  const updateLine = useCallback((
    idx:      number,
    patch:    Partial<LineItem>,
    product?: Product | null,
  ) => {
    setForm((f) => {
      const lines           = [...f.lines];
      let   L               = { ...lines[idx], ...patch };
      const curPriceLevelId = f.price_level_id ? parseInt(f.price_level_id) : null;

      // ─ L1: اختيار منتج جديد ──────────────────────────────────────────────
      if (product !== undefined) {
        if (product) {
          L.description = product.name;

          // TVA — 0 معفى لا تُستبدَل
          L.tva_rate = product.tva?.rate != null
            ? toNum(product.tva.rate)
            : defaultTvaRate;

          // التعبئة الافتراضية
          const defPkg   = (product.packagings ?? []).find((pk) => pk.is_default);
          L.packaging_id = defPkg ? String(defPkg.id) : '';
          L._packQty     = defPkg ? (Number(defPkg.quantity) || 1) : 1;

          // السعر بوحدة أساسية
          const unitPrice  = resolvePrice(product, curPriceLevelId, isPurchase);
          L.unit_price_ht  = unitPrice;
          L.price_per_pack = Math.round(unitPrice * L._packQty * 10_000) / 10_000;

          // خصم الكميات — يحتاج baseQty
          const baseQty = Math.round(L.quantity * L._packQty * 1_000_000) / 1_000_000;
          const qd = resolveQuantityDiscount(product, baseQty, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode         = 'percent';
            L.discount_percentage   = qd.percentage;
            L.discount_amount_fixed = 0;
          } else if (qd.fixed > 0) {
            // qd.fixed = خصم الوحدة الأساسية → نحوّل لعبوة
            L.discount_mode         = 'fixed';
            L.discount_amount_fixed = Math.round(qd.fixed * L._packQty * 10_000) / 10_000;
            L.discount_percentage   = 0;
          } else {
            L.discount_mode         = 'percent';
            L.discount_percentage   = 0;
            L.discount_amount_fixed = 0;
          }

          // الحصة (lot) — أول متاحة للبيع
          if (!isPurchase && product.has_lots) {
            const firstLot = (product.lots ?? []).find((lt) => lt.remaining_quantity > 0);
            L.stock_lot_id = firstLot ? String(firstLot.id) : '';
          } else {
            L.stock_lot_id   = '';
            L.lot_number_new = '';
          }

          L._product = product;

          // ── استدعاء compute-line فوراً من الباكاند ──
          triggerCompute(idx, {
            product_id:     product.id,
            quantity:       L.quantity,
            packaging_id:   L.packaging_id ? parseInt(L.packaging_id) : null,
            price_level_id: curPriceLevelId,
            warehouse_id:   warehouseIdForCompute,
            party_id:       partyIdForCompute,
            is_purchase:    isPurchase,
            document_date:  formRef.current?.document_date,
          }, 0); // فوري بدون debounce عند اختيار منتج جديد

        } else {
          // تفريغ المنتج
          L._product = undefined;
          L.packaging_id = ''; L._packQty = 1;
          L.unit_price_ht = 0; L.price_per_pack = 0;
          L.stock_lot_id = '';
          L.discount_percentage = 0; L.discount_amount_fixed = 0;
        }
      }

      // ─ L3: تغيير التعبئة ──────────────────────────────────────────────────
      if (patch.packaging_id !== undefined && product === undefined) {
        const packId = patch.packaging_id;

        // ابحث في _product أولاً ثم في productsRef
        let pkg = (L._product?.packagings ?? []).find((pk) => String(pk.id) === packId);
        if (!pkg && productsRef.current) {
          const prod = productsRef.current.find((p) => String(p.id) === L.product_id);
          pkg = prod?.packagings?.find((pk) => String(pk.id) === packId);
        }

        const oldPackQty = L._packQty;
        L._packQty       = pkg ? (Number(pkg.quantity) || 1) : 1;

        // تحويل: unit_price_ht لا يتغير — فقط price_per_pack
        L.price_per_pack = Math.round(L.unit_price_ht * L._packQty * 10_000) / 10_000;

        // تحديث discount_amount_fixed (كان خصم العبوة القديمة → نحوّل للجديدة)
        if (L.discount_mode === 'fixed' && oldPackQty > 0) {
          const unitDisc = L.discount_amount_fixed / oldPackQty;
          L.discount_amount_fixed = Math.round(unitDisc * L._packQty * 10_000) / 10_000;
        }

        // تحديث خصم الكميات
        if (L._product) {
          const baseQty = Math.round(L.quantity * L._packQty * 1_000_000) / 1_000_000;
          const qd = resolveQuantityDiscount(L._product, baseQty, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode         = 'percent';
            L.discount_percentage   = qd.percentage;
            L.discount_amount_fixed = 0;
          }
        }
      }

      // ─ L4: تغيير سعر الوحدة يدوياً ───────────────────────────────────────
      if (patch.unit_price_ht !== undefined && product === undefined) {
        L.price_per_pack = Math.round(patch.unit_price_ht * L._packQty * 10_000) / 10_000;
      }

      // ─ L5: تغيير سعر التعبئة يدوياً ──────────────────────────────────────
      if (patch.price_per_pack !== undefined && product === undefined) {
        L.unit_price_ht = L._packQty > 1
          ? Math.round((patch.price_per_pack / L._packQty) * 10_000) / 10_000
          : patch.price_per_pack;
        // price_per_pack مُحدَّث بالفعل من patch
      }

      // ─ L6: تغيير الكمية → خصم الكميات + compute ────────────────────────
      if (patch.quantity !== undefined && L.product_id) {
        if (L._product && !isPurchase) {
          const baseQty = Math.round(patch.quantity * L._packQty * 1_000_000) / 1_000_000;
          const qd = resolveQuantityDiscount(L._product, baseQty, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode = 'percent'; L.discount_percentage = qd.percentage; L.discount_amount_fixed = 0;
          } else if (qd.fixed > 0) {
            L.discount_mode = 'fixed'; L.discount_amount_fixed = Math.round(qd.fixed * L._packQty * 10_000) / 10_000; L.discount_percentage = 0;
          }
        }
        // compute-line مع debounce 350ms عند تغيير الكمية
        if (L.product_id) {
          setTimeout(() => triggerCompute(idx, {
            product_id:     parseInt(L.product_id),
            quantity:       patch.quantity as number,
            packaging_id:   L.packaging_id ? parseInt(L.packaging_id) : null,
            price_level_id: curPriceLevelId,
            warehouse_id:   warehouseIdForCompute,
            party_id:       partyIdForCompute,
            is_purchase:    isPurchase,
            document_date:  formRef.current?.document_date,
          }, 350), 0);
        }
      }

      lines[idx] = L;
      return { ...f, lines };
    });
    setLineErr('');
  }, [defaultTvaRate, isPurchase]);

  // ── addLine / removeLine / duplicateLine ──────────────────────────────────

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

  // ── إدارة الدفعات ─────────────────────────────────────────────────────────

  const addPayment = useCallback(() => {
    if (pmMode === 'locked') return;
    const firstMode = paymentModsRef.current[0];
    setNewPayments((prev) => [...prev, {
      payment_mode_id:     firstMode ? String(firstMode.id) : '',
      amount:              '',
      reference:           '',
      payment_date:        today(),
      treasury_account_id: firstMode?.treasury_account_id
        ? String(firstMode.treasury_account_id) : '',
    }]);
  }, [pmMode]);

  const removePayment = useCallback((idx: number) => {
    if (pmMode === 'locked') return;
    setNewPayments((prev) => prev.filter((_, i) => i !== idx));
  }, [pmMode]);

  const updatePayment = useCallback((idx: number, patch: Partial<PaymentEntry>) => {
    if (pmMode === 'locked') return;
    setNewPayments((prev) => {
      const payments = [...prev];
      let   P        = { ...payments[idx], ...patch };
      if (patch.payment_mode_id !== undefined) {
        const selectedMode = paymentModsRef.current.find(
          (pm) => String(pm.id) === patch.payment_mode_id,
        );
        P.treasury_account_id = selectedMode?.treasury_account_id
          ? String(selectedMode.treasury_account_id) : '';
      }
      payments[idx] = P;
      return payments;
    });
  }, [pmMode]);

  // ── Totals ────────────────────────────────────────────────────────────────

  const allPaymentsForTotals = useMemo(
    () => [...existingPayments, ...newPayments],
    [existingPayments, newPayments],
  );

  const totals = useMemo(
    () => calcTotals(form.lines, form.apply_stamp, allPaymentsForTotals),
    [form.lines, form.apply_stamp, allPaymentsForTotals],
  );

  // ── validate ──────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    if (needsParty && !form.party_id)
      errs.party_id = isPurchase ? 'المورد إلزامي' : 'الزبون إلزامي';
    if (!form.document_date)  errs.document_date  = 'التاريخ إلزامي';
    if (!form.warehouse_id)   errs.warehouse_id   = 'المستودع إلزامي';
    if (!form.fiscal_year_id) errs.fiscal_year_id = 'السنة المالية إلزامية';
    if (!form.currency_id)    errs.currency_id    = 'العملة إلزامية';

    if (!isLinesReadOnly) {
      if (form.lines.length === 0) {
        setLineErr('يجب إضافة سطر واحد على الأقل');
        setErrors(errs); return false;
      }

      for (let i = 0; i < form.lines.length; i++) {
        const line = form.lines[i];
        if (!line.product_id) {
          setLineErr(`السطر ${i + 1}: المنتج إلزامي`);
          setErrors(errs); return false;
        }
        if (line.quantity <= 0) {
          setLineErr(`السطر ${i + 1}: الكمية يجب أن تكون > 0`);
          setErrors(errs); return false;
        }
        if (!isPurchase && line.unit_price_ht === 0) {
          setLineErr(`السطر ${i + 1}: السعر إلزامي`);
          setErrors(errs); return false;
        }
        if (line._product) {
          const sv = validateLineStock(line, line._product, isPurchase, stockDataRef.current);
          if (!sv.ok && sv.blocking) {
            setLineErr(`السطر ${i + 1}: ${sv.message}`);
            setErrors(errs); return false;
          }
        }
      }
    }

    for (let i = 0; i < newPayments.length; i++) {
      const pay    = newPayments[i];
      const amount = parseFloat(pay.amount);
      if (amount <= 0) continue;
      if (!pay.payment_mode_id) {
        setLineErr(`الدفعة ${i + 1}: يجب اختيار طريقة الدفع`);
        setErrors(errs); return false;
      }
      const mode = paymentModsRef.current.find((pm) => String(pm.id) === pay.payment_mode_id);
      if (mode?.requires_reference && !pay.reference?.trim()) {
        setLineErr(`الدفعة ${i + 1}: المرجع إلزامي لـ "${mode.name}"`);
        setErrors(errs); return false;
      }
      const autoTreasury = mode?.treasury_account_id ?? null;
      if (!autoTreasury && !pay.treasury_account_id) {
        setLineErr(`الدفعة ${i + 1}: يجب اختيار حساب خزينة`);
        setErrors(errs); return false;
      }
    }

    setLineErr('');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, needsParty, isPurchase, isLinesReadOnly, newPayments]);

  // ── buildPayload ──────────────────────────────────────────────────────────

  const buildPayload = useCallback((): Record<string, unknown> => {
    const f = formRef.current!;

    const validNewPayments = newPayments.filter(
      (p) => p.payment_mode_id && parseFloat(p.amount) > 0,
    );

    const paymentsPayload = validNewPayments.map((p) => {
      const mode = paymentModsRef.current.find((pm) => String(pm.id) === p.payment_mode_id);
      const treasuryId = mode?.treasury_account_id
        ? mode.treasury_account_id
        : (p.treasury_account_id ? parseInt(String(p.treasury_account_id)) : null);
      return {
        payment_mode_id:     parseInt(p.payment_mode_id),
        amount:              parseFloat(p.amount),
        reference:           p.reference?.trim() || null,
        payment_date:        p.payment_date,
        treasury_account_id: treasuryId,
      };
    });

    const linesPayload = f.lines.map((line) => {
      const calc = calcLineTotal(line);

      // تحويل الكمية للوحدات الأساسية
      const effectiveQty = calc.baseQty;

      // discount_percentage: نسبة الخصم الفعلية
      const discountPercentage = Math.round(calc.discPct * 10_000) / 10_000;

      // discount_amount للباكاند = خصم الوحدة الأساسية الواحدة
      const discountAmount = calc.unitDiscount;

      return {
        ...(line.id ? { id: line.id } : {}),
        product_id:          parseInt(line.product_id),
        description:         line.description || null,
        quantity:            effectiveQty,           // وحدات أساسية
        unit_price_ht:       line.unit_price_ht,     // سعر الوحدة الأساسية
        tva_rate:            line.tva_rate,
        discount_percentage: discountPercentage,
        discount_amount:     discountAmount,          // خصم الوحدة الواحدة
        ...(line.packaging_id ? { packaging_id: parseInt(line.packaging_id) } : {}),
        ...(line.stock_lot_id ? { stock_lot_id: parseInt(line.stock_lot_id) } : {}),
        ...(isPurchase && line.lot_number_new ? { lot_number: line.lot_number_new } : {}),
        notes: line.line_note || null,
      };
    });

    const base: Record<string, unknown> = {
      document_type_id: documentType?.id,
      party_id:         needsParty && f.party_id ? parseInt(f.party_id) : null,
      warehouse_id:     parseInt(f.warehouse_id),
      fiscal_year_id:   parseInt(f.fiscal_year_id),
      currency_id:      parseInt(f.currency_id),
      exchange_rate:    parseFloat(f.exchange_rate) || 1,
      document_date:    f.document_date,
      due_date:         f.due_date         || null,
      delivery_date:    f.delivery_date    || null,
      notes:            f.notes            || null,
      internal_notes:   f.internal_notes   || null,
      is_proforma:      f.is_proforma,
      shipping_info:    Object.keys(f.shipping_info).length > 0 ? f.shipping_info : null,
      payment_terms:    f.payment_terms.length > 0 ? f.payment_terms : null,
    };

    if (pmMode === 'additive') {
      if (paymentsPayload.length > 0) base.new_payments = paymentsPayload;
    } else {
      base.lines = linesPayload;
      if (paymentsPayload.length > 0) base.payments = paymentsPayload;
    }

    return base;
  }, [documentType?.id, needsParty, isPurchase, pmMode, newPayments]);

  // ── validateLineStockFn ───────────────────────────────────────────────────

  const validateLineStockFn = useCallback(
    (line: LineItem, product: Product) =>
      validateLineStock(line, product, isPurchase, stockDataRef.current),
    [isPurchase],
  );

  return {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, removeLine, duplicateLine, updateLine,
    paymentMode: pmMode,
    existingPayments, newPayments,
    addPayment, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    validateLineStock: validateLineStockFn,
    updateStockData: useCallback(
      (data: Record<number, number>) => { stockDataRef.current = data; }, [],
    ),
    docCode, isEdit, needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
  };
}
```

## FILE: resources/js/pages/documents/hooks/useDocumentLookups.ts
```
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { Product, Party, PaymentMode, TreasuryAccount } from '../types/document.types';

function extractList(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const d = (data as Record<string, unknown>).data;
    if (Array.isArray(d)) return d;
  }
  return [];
}

interface UseDocumentLookupsOptions {
  open:         boolean;
  isPurchase:   boolean;
  needsParty:   boolean;
  warehouseId?:  number | null;
  fiscalYearId?: number | null;
}

export function useDocumentLookups({
  open, isPurchase, needsParty, warehouseId, fiscalYearId,
}: UseDocumentLookupsOptions) {
  const slug = useActiveSlug();

  // ── Parties ───────────────────────────────────────────────────────────────
  const { data: partiesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-parties', isPurchase],
    queryFn:   () => apiGet<unknown>(
      isPurchase ? '/suppliers' : '/customers',
      { per_page: 1000, include: 'defaultPriceLevel' },
    ).then(extractList),
    enabled:   open && needsParty && !!slug,
    staleTime: 5 * 60_000,
  });
  const parties = partiesRaw as Party[];

  // ── Products ──────────────────────────────────────────────────────────────
  const { data: productsRaw = [], isLoading: isLoadingProducts } = useQuery({
    queryKey:  [slug, 'modal-products-v3'],
    queryFn:   () => apiGet<unknown>('/products', {
      per_page: 2000,
      include:  'unit,tva,packagings,prices,prices.priceLevel,quantityDiscounts,lots',
      active:   1,
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 3 * 60_000,
  });
  const products = productsRaw as Product[];

  // ── Warehouses ────────────────────────────────────────────────────────────
  const { data: warehousesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-warehouses'],
    queryFn:   () => apiGet<unknown>('/warehouses', { per_page: 100 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });
  const warehouses = warehousesRaw as Record<string, unknown>[];

  // ── Currencies ────────────────────────────────────────────────────────────
  const { data: currenciesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-currencies'],
    queryFn:   () => apiGet<unknown>('/currencies', { per_page: 50 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 30 * 60_000,
  });
  const currencies = currenciesRaw as Record<string, unknown>[];

  // ── Fiscal Years ──────────────────────────────────────────────────────────
  const { data: fiscalYearsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-fiscal-years'],
    queryFn:   () => apiGet<unknown>('/fiscal-years', {
      per_page: 20, 'filter[is_closed]': 0,
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 5 * 60_000,
  });
  const fiscalYears = fiscalYearsRaw as Record<string, unknown>[];

  // ── Payment Modes ─────────────────────────────────────────────────────────
  const { data: paymentModesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-payment-modes'],
    queryFn:   () => apiGet<unknown>('/payment-modes', { per_page: 50 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 30 * 60_000,
  });
  const paymentModes = paymentModesRaw as PaymentMode[];

  // ── Price Levels ──────────────────────────────────────────────────────────
  const { data: priceLevelsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-price-levels'],
    queryFn:   () => apiGet<unknown>('/price-levels', { per_page: 100 }).then(extractList),
    enabled:   open && !isPurchase && !!slug,
    staleTime: 30 * 60_000,
  });
  const priceLevels = priceLevelsRaw as Record<string, unknown>[];

  // ── Treasury Accounts ─────────────────────────────────────────────────────
  const { data: treasuryAccountsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-treasury-accounts-v2'],
    queryFn:   () => apiGet<unknown>('/treasury-accounts', { per_page: 100 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });
  const treasuryAccounts = (treasuryAccountsRaw as TreasuryAccount[])
    .filter(ta => ta.is_active);

  // ── Real-time Stock ───────────────────────────────────────────────────────
  const { data: stockData = {}, refetch: refetchStock } = useQuery<Record<number, number>>({
    queryKey: [slug, 'warehouse-stock', warehouseId, fiscalYearId],
    queryFn:  () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   warehouseId,
        fiscal_year_id: fiscalYearId,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!warehouseId,
    staleTime: 2 * 60_000,
  });

  // ── Derived Defaults ──────────────────────────────────────────────────────
  const defaultWarehouseId = useMemo(() => {
    const dw = warehouses.find(w => w.is_default) ?? warehouses[0];
    return dw ? String(dw.id) : '';
  }, [warehouses]);

  const baseCurrencyId = useMemo(() => {
    const base = currencies.find(c => c.is_base_currency) ?? currencies[0];
    return base ? String(base.id) : '';
  }, [currencies]);

  const defaultTvaRate = useMemo(() => {
    const p = products.find(pr => pr.tva?.is_default);
    return p?.tva?.rate ?? 19;
  }, [products]);

  return {
    parties, products, warehouses, currencies, fiscalYears,
    paymentModes, priceLevels, treasuryAccounts,
    stockData, refetchStock,
    isLoadingProducts,
    defaultWarehouseId, baseCurrencyId, defaultTvaRate,
  };
}
```

## FILE: resources/js/pages/documents/hooks/useProductSuggestions.ts
```
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface ProductSuggestion {
  id:              number;
  name:            string;
  ref:             string | null;
  order_count:     number;
  total_qty:       number;
  suggested_price: number | null;
  suggested_tva:   number | null;
}

export function useProductSuggestions(
  partyId:    number | null,
  isPurchase: boolean,
  enabled:    boolean,
) {
  const slug = useActiveSlug();
  return useQuery<ProductSuggestion[]>({
    queryKey: [slug, 'product-suggestions', partyId, isPurchase],
    queryFn: async () => {
      if (!partyId) return [];
      return apiGet<ProductSuggestion[]>(`/parties/${partyId}/product-suggestions`, {
        is_purchase: isPurchase,
        limit: 5,
      });
    },
    enabled: !!slug && !!partyId && enabled,
    staleTime: 120_000,
    gcTime: 60_000,
  });
}
```

## FILE: resources/js/pages/documents/problems.md
```
تحليل منهجي.

تحليل الخلفية (Laravel)
النماذج (Models)
CommercialDocument:

يحتوي على $fillable مع العديد من الحقول.

$casts مناسب.

$searchableFields, $filterable, $sortable, $allowedIncludes تستخدم لتكوين البحث والتصفية في المتحكم (ربما في BaseApiController).

علاقات: documentType, numberingSeries, user, party, warehouse, fiscalYear, currency, documentStatus, validatedBy, sourceDocument, cancellationOfDocument, lines, payments (BelongsToMany عبر pivot document_payment), stockMovements (HasManyThrough).

نطاقات: locked, unlocked, validated, unpaid, overdue.

دوال مساعدة: isFullyPaid, isOverdue, canBeModified.

ملاحظات:

stockMovements معرفة عبر HasManyThrough من CommercialDocumentLine إلى StockMovement، ولكن العلاقة تستخدم commercial_document_line_id في stock_movements. هذا صحيح.

payments هي BelongsToMany عبر pivot document_payment، ولكن في CommercialDocumentService يتم إنشاء Payment ثم ربطها عبر attach، وهذا صحيح.

validatedBy هو BelongsTo مع foreign_key validated_by.

sourceDocument و cancellationOfDocument تشير لنفس النموذج.

يوجد booted مع Global Scope ولكن التعليق يقول أنه لا يفعل شيئاً، فقط توضيح. هذا جيد، لأن SoftDeletes يطبق النطاق تلقائياً.

CommercialDocumentLine:

$fillable يحتوي على commercial_document_id, product_id, line_order, description, quantity, delivered_quantity, returned_quantity, unit_price_ht, discount_percentage, discount_amount, additional_costs, total_additional_cost, total_discount_amount, tva_rate, total_ht, total_tva, total_ttc, stock_lot_id, is_auto_split, parent_line_id, line_attributes, packaging_id.

$casts جيد.

علاقات: commercialDocument, product, stockLot, parentLine, childLines, stockMovements.

نطاقات parentLines, childLines.

دوال مساعدة: getRemainingQuantity, isFullyDelivered, hasDiscount.

ملاحظات:

لا يوجد packaging_id في $fillable؟ موجود بالفعل.

لا يوجد product_variant_id، فقط product_id. هذا مقبول إذا كان المنتج هو الـ variant نفسه.

stock_lot_id يشير إلى ProductLot.

المتحكمات (Controllers)
CommercialDocumentController:

يمتد من BaseApiController.

يقوم بحقن CommercialDocumentService و QRCodeService.

يقوم بتعريف getListConfig لتحديد الفلاتر والترتيب المسموح بها.

index ينفذ منطق التصفية والترتيب يدوياً (بدلاً من استخدام BaseApiController الافتراضي). هذا مكرر بعض الشيء، ولكنه يعمل.

دوال unpaid, overdue تستدعي الخدمة.

دوال validateDocument, lock, unlock, cancel, generateQRCode كلها تقبل Request, Company, CommercialDocument (مع ترتيب المعاملات كما هو موضح في التعليقات). هذا صحيح لأن المسارات في api.php تستخدم {company} ثم {commercialDocument}.

generateQRCode لا يستخدم $request، وهذا صحيح.

cancel يتحقق من cancellation_reason.

يستخدم authorizeAction للتحقق من الصلاحيات.

CommercialDocumentLineController:

يمتد من BaseApiController ويستخدم CommercialDocumentLineService.

الخدمات (Services)
CommercialDocumentService (موسع من BaseService):

يستخدم ValidatesTenantRelations trait.

beforeCreate:

يحدد company_id من السياق.

يجهز البيانات (prepareDocumentData) ويضبط user_id.

يتحقق من نوع الوثيقة ويتحقق من requires_party.

يحل numbering_series_id إذا لم يُعطى.

يولد رقم المستند عبر generateDocumentNumber (يستخدم معاملة لقفل الصف).

يحدد fiscal_year_id إذا لم يُعطى.

يضبط validated_at و validated_by و document_status_id إلى "validated" مباشرة.

يتحقق من العلاقات عبر validateTenantRelations.

afterCreate:

ينشئ الأسطر عبر createDocumentLines.

يعيد حساب الإجماليات recalculateTotals.

إذا كان نوع المستند يؤثر على المخزون (affects_stock_direction != 0)، ينشئ حركات المخزون createStockMovements.

يربط الدفعات إذا أرسلت payments.

beforeUpdate:

يتحقق من is_locked و is_exported_to_accounting ويمنع التحديث إذا كان أحدهما صحيحاً.

afterUpdate:

إذا أرسلت lines، يحذف الأسطر القديمة وينشئ جديدة (بدون معاملة؟ ملاحظة: حذف ثم إنشاء قد يسبب فقدان البيانات إذا فشل الإنشاء، ولكن داخل update في BaseService يكون في معاملة؟ يجب التحقق من BaseService، لكن من المفترض أن BaseService يقوم بمعاملة).

يعيد حساب الإجماليات.

beforeDelete: يرمي استثناء يمنع الحذف (يُستخدم الإلغاء بدلاً من ذلك).

دوال عامة: lockDocument, unlockDocument, cancelDocument, getUnpaid, getOverdue.

createDocumentLines: يحسب إجماليات السطر عبر computeLineTotals.

attachPayments: ينشئ Payment ويربطها عبر pivot، ويعيد حساب paid_amount و remaining_amount عبر recalculatePaymentAmounts.

recalculateTotals: يجمع من الأسطر، ويحسب الطابع الجبائي عبر FiscalStampCalculator، ويحديث الحقول.

createStockMovements:

يحدد اتجاه الحركة من document_type.affects_stock_direction.

يستخدم InventoryValuationService للحصول على سعر التكلفة للمبيعات.

ينشئ StockMovement مع is_validated = true.

دوال مساعدة: getStatusId, prepareDocumentData, resolveNumberingSeries, generateDocumentNumber, getCurrentFiscalYearId, getExchangeRate.

ملاحظات على الخدمة:

في beforeCreate، يتم تعيين validated_at و validated_by و document_status_id إلى "validated" مباشرة. هذا يتوافق مع منطق "لا مسودة، اعتماد فوري". لكن هذا يعني أن المستند يُنشأ معتمداً، ولا توجد حالة مسودة. هذا مقبول حسب المتطلبات.

generateDocumentNumber: يستخدم lockForUpdate() لضمان عدم تكرار الأرقام. ولكن يستخدم orderByDesc('id') بدلاً من orderByDesc('document_number')، وقد لا يكون دقيقاً إذا كانت الأرقام غير متتابعة حسب id. من الأفضل استخدام orderByDesc('document_number') أو max('document_number'). لكن بما أن التنسيق PREFIX-YEAR-XXXXXX، فاستخدام id قد لا يكون صحيحاً إذا كانت هناك فجوات. من الأفضل استخدام orderByDesc('document_number') مع like للحصول على آخر رقم.

resolveNumberingSeries: إذا لم يجد سلسلة، يقوم بإنشاء واحدة جديدة. هذا جيد.

createStockMovements: يستخدم $document->document_date كـ movement_date. هذا صحيح.

createStockMovements: يستخدم $valuationService->getCostPriceForSale للحصول على سعر التكلفة، ولكن إذا كان direction < 0 (بيع) يستخدم costPrice، وإلا يستخدم unit_price_ht كسعر التكلفة للمشتريات. هذا صحيح.

createStockMovements: لا يتحقق من وجود مخزون كافٍ قبل البيع. هذا قد يؤدي إلى مخزون سالب إذا لم يكن مسموحاً. لكن هناك دالة validateLineStock في الواجهة الأمامية تتحقق، لكن الخلفية لا تتحقق. قد يكون هناك حاجة لإضافة تحقق في beforeCreate أو afterCreate للتأكد من أن الكمية المطلوبة متاحة، وإلا رفض العملية. ولكن بما أن النظام يسمح بالمخزون السالب (إذا كان allow_negative_stock صحيحاً)، يمكن ترك الأمر.

recalculateTotals: يستخدم updateQuietly لتجنب تشغيل الـ Observers. هذا جيد لتجنب الحلقات.

attachPayments: ينشئ Payment بدون fiscal_year_id؟ لاحظ أن Payment model يتطلب fiscal_year_id، ولكن Payment في types.ts يحتوي على fiscal_year_id. في attachPayments، عند إنشاء Payment، لا يمرر fiscal_year_id، مما قد يسبب خطأ إذا كان الحقل مطلوباً في قاعدة البيانات. هذا خطأ. يجب إضافة fiscal_year_id من المستند.

attachPayments: payment_date يأخذ $document->document_date إذا لم يحدد. هذا جيد.

createStockMovements: يستخدم $stockMovementTypeId = match ولكن match في PHP 8.0+، جيد.

getExchangeRate: يبحث عن سعر الصرف من currency_id إلى العملة الأساسية (id=1). جيد.

CommercialDocumentLineService (موسع من BaseService):

يقوم بـ afterCreate, afterUpdate, afterDelete بإعادة حساب الوثيقة الأم عبر recalculateParentDocument.

recalculateParentDocument يحسب الإجماليات من الأسطر ويحدث الوثيقة باستخدام updateQuietly.

ملاحظات:

recalculateParentDocument يحسب الطابع الجبائي عبر FiscalStampCalculator، وهذا صحيح.

لا يوجد تحقق من is_locked عند تعديل سطر؟ ولكن beforeUpdate في CommercialDocumentService يمنع تحديث الوثيقة إذا كانت مقفلة، ولكن تحديث سطر منفرد قد لا يمر عبر CommercialDocumentService، بل عبر CommercialDocumentLineService مباشرة. يجب التأكد من أن CommercialDocumentLineService يتحقق من is_locked للوثيقة الأم قبل السماح بالتحديث. حالياً ليس هناك تحقق، مما قد يسمح بتعديل سطر في وثيقة مقفلة. هذا خطأ أمني ومنطقي.

الطلبات (Requests)
StoreCommercialDocumentRequest:

authorize يعيد true، ويتم التحقق من الصلاحيات في المتحكم.

rules:

party_id إلزامي أو اختياري حسب requires_party من نوع الوثيقة (يتم تحديده في resolvePartyRequired).

lines مطلوب مع min:1.

lines.*.product_id مطلوب، quantity مطلوب، unit_price_ht مطلوب.

packaging_id اختياري.

stock_lot_id اختياري.

due_date يجب أن يكون بعد أو يساوي document_date.

الرسائل جيدة.

UpdateCommercialDocumentRequest:

كل الحقول sometimes مع nullable، مما يسمح بتحديث جزئي.

lines.*.product_id و quantity و unit_price_ht مطلوبة فقط إذا تم إرسال lines (باستخدام required_with:lines).

لا يوجد تحقق من is_locked هنا، بل في الخدمة.

ملاحظات: كلا الطلبين لا يتحققان من وجود company_id، لكن الخدمة تتعامل مع ذلك.

السياسات (Policies)
CommercialDocumentPolicy: يستخدم can مع أسماء الأذونات القياسية (view_any_commercial_document, view_commercial_document, إلخ). هذا يعتمد على نظام الأذونات.

CommercialDocumentLinePolicy: مشابه.

المراقبون (Observers)
CommercialDocumentLineObserver:

saving: يحسب إجماليات السطر إذا تغيرت القيم الأساسية (كمية، سعر، خصم، ضريبة). يستخدم isDirty لتجنب إعادة الحساب غير الضرورية.

جيد.

CommercialDocumentObserver:

saving: إذا كانت علاقة lines محملة وليست فارغة، يحسب إجماليات الوثيقة باستخدام calculateDocumentTotals. هذا يعمل كطبقة احتياطية.

saved: إذا كان remaining_amount صغيراً (<= 0.001) و net_to_pay > 0، يغير الحالة إلى "paid" عبر saveQuietly. هذا يعمل تلقائياً عند تسديد كامل المبلغ.

ملاحظات:

saving في CommercialDocumentObserver يستخدم updateQuietly؟ لا، إنه يقوم بتعيين القيم على النموذج مباشرة، وهذا سيتم حفظه عند save() العادي. ولكن إذا تم استدعاء updateQuietly في الخدمة، فلن يُشغل الـ Observer. لكن في saving، يتم تعيين القيم، ولكن الـ saving لا ينفذ save، بل يُعدل النموذج قبل الحفظ. هذا جيد.

saved يستخدم saveQuietly لتجنب الحلقات.

يجب التأكد من أن paidStatus موجود، وإلا يتجاهل.

StockMovementObserver:

creating: يحسب cost_price للحركات الخارجة، ويضبط unit_price و total_price.

created: يقوم بـ:

تحديث PMP (لحركات الإدخال) عبر updateCostAfterPurchase.

إنشاء دفعة (lot) لحركات الإدخال.

تحديث أرصدة الدفعات لحركات الخروج (FIFO/LIFO).

تحديث stock_balance_after.

جيد.

السيدرز (Seeders)
DocumentBaseOperationSeeder, DocumentStatusSeeder, DocumentTypeSeeder, InventoryValuationMethodSeeder, StockMovementTypeSeeder كلها تدرج بيانات افتراضية للشركة الأولى. هذا جيد للاختبار.

المسارات (api.php)
تم تعريف المسارات بشكل جيد. تم استخدام middleware(['auth:sanctum', 'company']) لمجموعة {company}.

تم وضع المسارات المحددة (مثل unpaid, overdue) قبل apiResource لتجنب التعارض. هذا صحيح.

تم استخدام can:update_company لمجموعة معينة، و can:manage_fiscal_year، و can:create_sales_document، إلخ. هذه الأذونات مستخدمة في السياسات.

ملخص أخطاء الخلفية المحتملة:
عدم تمرير fiscal_year_id عند إنشاء الدفعات في attachPayments، مما قد يسبب فشل إنشاء Payment إذا كان الحقل مطلوباً.

إمكانية تعديل سطر منفرد (CommercialDocumentLine) في وثيقة مقفلة، لأن CommercialDocumentLineService لا يتحقق من is_locked للوثيقة الأم.

generateDocumentNumber يعتمد على id بدلاً من document_number، قد يؤدي إلى تكرار الأرقام في حال وجود فجوات.

عدم التحقق من كفاية المخزون عند البيع في الخلفية (قد يكون مقصوداً إذا كان allow_negative_stock).

استخدام updateQuietly في recalculateTotals يمنع تشغيل Observers، ولكن هذا مقصود لتجنب الحلقات. لكن قد يؤدي إلى عدم تحديث stock_balance_after في StockMovementObserver إذا تم تحديث الحركات مباشرة؟ لكن StockMovementObserver يعمل عند إنشاء الحركات، وليس عند تحديث المستند.

في afterUpdate من CommercialDocumentService، يتم حذف جميع الأسطر وإنشاؤها من جديد، دون التحقق من أن الأسطر الجديدة صالحة (مثل عدم وجود تعارض مع المخزون). هذا قد يؤدي إلى فقدان بيانات حركات المخزون المرتبطة بالأسطر القديمة إذا كانت قد أنشئت بالفعل. لكن بما أن المستند معتمد فوراً ويتم إنشاء حركات المخزون في afterCreate، فإن تحديث المستند بعد ذلك (إذا كان غير مقفل) سيؤدي إلى حذف الأسطر القديمة وحركات المخزون المرتبطة بها؟ في afterUpdate، لا يتم حذف حركات المخزون، بل فقط الأسطر. هذا يعني أن حركات المخزون القديمة ستبقى مرتبطة بأسطر محذوفة، مما يسبب مشاكل في سلامة البيانات. يجب إما حذف حركات المخزون القديمة مع الأسطر، أو منع تحديث الأسطر في المستندات المعتمدة (وهو ما يحدث بالفعل لأن beforeUpdate يمنع التحديث إذا كان is_locked أو is_exported_to_accounting، ولكن المستندات المعتمدة ليست مقفلة بالضرورة، لذا قد يسمح بتحديثها). لكن المستندات تُنشأ معتمدة (validated_at غير null)، وليست مقفلة (is_locked false). لذا يمكن تحديثها، وهذا سيؤدي إلى حذف الأسطر وحركات المخزون القديمة تبقى. هذا خطير. يجب إما منع تحديث المستندات المعتمدة (باستثناء بعض الحالات)، أو عند تحديث الأسطر، يجب حذف حركات المخزون المرتبطة وإعادة إنشائها. ولكن منطق "لا مسودة، اعتماد فوري" يتعارض مع إمكانية التعديل. يبدو أن النظام يسمح بتعديل المستندات المعتمدة (طالما ليست مقفلة)، ولكن هذا قد يسبب مشاكل في المخزون. يجب توضيح منطق التعديل. ربما يفترض أن المستندات المعتمدة تُقفل تلقائياً بعد فترة، أو أن التعديل مسموح فقط للحقول غير المؤثرة في المخزون. لكن afterUpdate يسمح بتعديل الأسطر، مما يؤثر على المخزون. هذا تناقض.

CommercialDocumentService::beforeUpdate يمنع التحديث فقط إذا كان is_locked أو is_exported_to_accounting، ولكن لا يمنع التحديث إذا كان validated_at موجوداً (أي معتمد). هذا يعني أنه يمكن تعديل مستند معتمد (غير مقفل) بحرية. لكن تعديل الأسطر في مستند معتمد سيؤدي إلى تغيير الإجماليات وربما حركات المخزون القديمة تصبح غير صحيحة. هذا مشكلة كبيرة.

في afterUpdate، يتم حذف الأسطر القديمة بدون معاملة؟ يجب أن يتم ذلك داخل معاملة لضمان التكامل. BaseService ربما يقوم بمعاملة، ولكن يجب التحقق.

**createStockMovements يستخدم $document->warehouse_id، ولكن إذا كان warehouse_id فارغاً، فإنه يسجل تحذيراً فقط ولا ينشئ الحركات. هذا قد يؤدي إلى عدم تحديث المخزون لبعض المستندات التي ليس لها مستودع (مثل الفواتير بدون مستودع). لكن النموذج يتطلب warehouse_id في fillable وهو مطلوب في الطلب، لذا قد لا يحدث.

**recalculatePaymentAmounts يتم استدعاؤها في attachPayments، ولكنها لا تُستدعى في أي مكان آخر عند تحديث المدفوعات عبر API آخر. إذا تم تحديث دفعة مباشرة عبر PaymentController، فقد لا يتم تحديث paid_amount و remaining_amount في المستند. هذا نقص في التكامل.

CommercialDocumentService::resolveNumberingSeries يقوم بإنشاء سلسلة جديدة إذا لم يجد، ولكن قد يؤدي ذلك إلى إنشاء عدة سلاسل لنفس نوع المستند إذا لم تكن هناك سلسلة افتراضية. قد يكون من الأفضل إنشاء سلسلة افتراضية واحدة لكل نوع.

getExchangeRate يعيد 1.0 إذا لم يجد سعر صرف، مما قد يؤدي إلى استخدام سعر غير صحيح.

تحليل الواجهة الأمامية (React)
CommercialDocumentModal.tsx
مكون رئيسي لإضافة/تعديل المستند.

يستخدم useDocumentForm لإدارة الحالة.

يستخدم useDocumentLookups لجلب البيانات المساعدة.

يستخدم useQuery للحصول على المخزون الفعلي (/inventory/stock-at).

يستخدم useMutation لحفظ المستند، والتحقق من رقم المستند.

يحتوي على تحذيرات لتغيير العميل (الزبون) عند وجود دفعات أو أسطر.

يتحكم في إظهار/إخفاء الأعمدة.

يعرض الإجماليات والدفعات.

ملاحظات:

disableLines يُحدد بـ isLocked || isCancelled، ولكن المطلوب هو تعطيل الأسطر للمعتمدة أيضاً (وفقاً لـ disableLines في التعليق: "الأسطر — معطلة للمعتمدة (validated) وكذلك locked/cancelled"). في الكود، disableLines يعتمد فقط على isLocked || isCancelled، وليس على isValidated. هذا قد يسمح بتعديل الأسطر في المستندات المعتمدة (غير المقفلة وغير الملغاة). يجب تعديل المنطق ليشمل isValidated. لكن لاحظ أن isValidated يُعرّف بأنه !isLocked && VALIDATED_STATUSES.has(docStatusName). لذا إذا كان المستند معتمداً وغير مقفل، فإن disableLines سيكون false (لأنه فقط isLocked || isCancelled). هذا يسمح بتعديل الأسطر. قد يكون هذا مقصوداً إذا كان التعديل مسموحاً للمعتمدين (طالما غير مقفلين). ولكن حسب التعليق، يجب تعطيل الأسطر للمعتمدة. لذا هناك تناقض بين التعليق والتنفيذ.

disableFields يعتمد على isLocked || isCancelled، وليس على isValidated. هذا يسمح بتعديل الحقول الأساسية (الزبون، التاريخ، إلخ) حتى للمعتمدين. قد يكون هذا مقصوداً، ولكن يجب التأكد من أن الخلفية تسمح بذلك (وهي تسمح طالما غير مقفلة). لكن تغيير الزبون في مستند معتمد قد يؤثر على الدفعات؟ هناك تحذير لمنع تغيير الزبون عند وجود دفعات، وهذا جيد.

handlePartyChangeWithWarning تستخدم handlePartyChange من useDocumentForm، والذي يمنع تغيير الزبون إذا كان هناك دفعات أو إذا تغيرت فئة السعر مع وجود أسطر. هذا جيد.

saveMut ترسل document_number إذا كان التعديل، ولكن الخدمة لا تسمح بتغيير document_number (لا يوجد تحقق في beforeUpdate من document_number، لكن StoreCommercialDocumentRequest لا يسمح بـ document_number في الإنشاء، ولكن في التعديل يمكن إرساله. الخدمة لا تمنعه، لذا قد يتم تغيير رقم المستند بعد الإنشاء. هذا قد يسبب مشاكل في الترقيم. يجب منع تغيير document_number في beforeUpdate.

saveMut ترسل payments كجزء من payload. الخدمة تقوم بإنشاء دفعات جديدة في afterCreate، ولكن في afterUpdate لا تتعامل مع payments (لا تحديث للدفعات). لذا إذا تم تعديل مستند وإرسال دفعات جديدة، فإن الخدمة لن تتعامل معها. يجب إما منع تحديث الدفعات عبر هذه الواجهة، أو معالجتها في afterUpdate. حالياً، afterUpdate لا يقرأ payments من الطلب، لذا سيتم تجاهلها. هذا خطأ.

deleteMut تستخدم apiDelete('/documents/...') ولكن الخدمة تمنع الحذف (ترمي استثناء). لذا زر الحذف سيفشل دائماً. يجب إما إزالة زر الحذف أو تعديل الخدمة للسماح بالحذف (لكن المنطق يقول استخدم الإلغاء بدلاً من الحذف). لذلك زر الحذف غير مفيد.

deleteMut لا تتعامل مع is_locked، ولكن الخدمة سترفض الحذف إذا كان مقفلاً.

handleSave يتحقق من docNumber في حالة التعديل، لكن الخدمة لا تطلب document_number في التعديل (ربما تقبله). ولكن docNumber يتم جلب من existingDocument?.document_number، ويمكن تغييره. لكن كما ذكرنا، يجب منع تغييره.

handlePartyChangeWithWarning يستخدم handlePartyChange الذي يعيد blocked، ويظهر تحذير. جيد.

useDocumentForm.ts
يدير حالة النموذج، ويحتوي على منطق حساب الأسعار، الخصومات، الضرائب، إلخ.

buildLineFromApi يقرأ packaging و stockLot من العلاقات.

handlePartyChange يمنع تغيير الزبون إذا كانت هناك دفعات مرتبطة (بما في ذلك الدفعات الموجودة في النموذج والدفعات الموجودة في المستند الأصلي). جيد.

updateLine يعيد حساب الأسعار عند تغيير المنتج، التعبئة، الكمية، إلخ.

buildPayload يبني الكائن المرسل إلى API.

ملاحظات:

في buildPayload، عند حساب discount_percentage من discount_amount_fixed، يتم حساب نسبة مكافئة لإرسالها للباكاند. ولكن الباكاند يقبل discount_percentage فقط (لا يوجد discount_amount في CommercialDocumentLine model). ولكن CommercialDocumentLine يحتوي على discount_amount، ولكن في fillable يوجد discount_amount؟ في النموذج، $fillable يحتوي على discount_amount بالفعل. لذا يمكن إرسال discount_amount مباشرة. لكن StoreCommercialDocumentRequest لا يحتوي على discount_amount، فقط discount_percentage. في updateLine، يتم إرسال discount_percentage أو discount_amount حسب الوضع. ولكن الخدمة createDocumentLines تستخدم $lineData['discount_percentage'] فقط لحساب الخصم (تحسب discount_amount منها). إذا أرسلنا discount_amount مباشرة، فلن يتم استخدامه. لذا يجب تعديل الخدمة لقبول discount_amount كقيمة مباشرة للخصم (لكل سطر) أو إرسال discount_percentage فقط. حالياً، buildPayload يحسب نسبة مكافئة ويرسلها كـ discount_percentage، ويتجاهل discount_amount (يرسل discount_amount: 0). هذا يعني أن الخصم الثابت يُحوَّل إلى نسبة، وقد لا يكون دقيقاً بسبب التقريب. الأفضل أن ترسل الخدمة discount_amount وتستخدمه مباشرة، أو أن تقبل كلاهما وتختار الأولوية. يجب تعديل الخدمة لدعم discount_amount كحقل منفصل.

buildPayload يرسل payments فقط إذا كان هناك دفعات. ولكن الخدمة في afterCreate تتعامل مع payments، ولكن في afterUpdate لا تتعامل معها. لذا عند التعديل، سيتم تجاهل الدفعات الجديدة أو المعدلة. يجب إما دعم تحديث الدفعات في الخدمة، أو منع إرسال الدفعات في التعديل.

buildPayload يرسل apply_fiscal_stamp، ولكن الخدمة لا تستخدم هذا الحقل (تحسب الطابع تلقائياً من الإجماليات). في StoreCommercialDocumentRequest لا يوجد apply_fiscal_stamp. لذا هذا الحقل غير مستخدم في الخلفية. يمكن إزالته أو استخدامه لتجاوز حساب الطابع.

buildPayload يرسل price_level_id، ولكن الخدمة لا تستخدمه (لا يوجد حقل price_level_id في CommercialDocument). هذا الحقل يستخدم فقط في الواجهة لحساب الأسعار، ولا يخزن في قاعدة البيانات. يجب إزالته من payload.

useDocumentLookups.ts
يجلب البيانات المساعدة باستخدام React Query.

يستخدم apiGet مع المسارات النسبية (بدون slug)، لأن client.ts يضيف slug تلقائياً.

جيد.

ProductSearch.tsx
يستخدم createPortal لعرض القائمة المنسدلة لتجنب مشاكل overflow.

يعرض المخزون المتاح.

جيد.

document.utils.ts
دوال مساعدة خالصة.

calcFiscalStamp: 1% من TTC بحد أقصى 2500، ولا تطبق إذا كان TTC < 30000. هذا يتوافق مع الخلفية (FiscalStampCalculator). جيد.

resolvePrice: يحسب السعر بناءً على فئة السعر ونوع العملية.

resolveQuantityDiscount: يحسب خصم الكميات.

validateLineStock: يتحقق من كفاية المخزون.

جيد.

documents.ts (نقاط نهاية API)
يحتوي على دوال API للقائمة، العرض، الإنشاء، التحديث، الحذف، والإجراءات.

show يطلب العديد من العلاقات، وهذا جيد.

checkNumber للتحقق من تكرار الرقم.

useDocumentMutations يعيد استخدام useMutation مع تحديث الكاش.

جيد.

types.ts (الأنواع العامة)
يحتوي على تعريفات لـ CommercialDocument, CommercialDocumentLine, Payment, إلخ.

ملاحظة: CommercialDocument في types.ts يحتوي على status: DocumentStatusCode و amount_paid, amount_remaining. ولكن في النموذج الخلفي، الحقول هي remaining_amount و paid_amount. يجب تطابق الأسماء. في types.ts، amount_paid و amount_remaining، بينما في النموذج paid_amount و remaining_amount. هذا قد يسبب عدم تطابق عند استخدام الأنواع. يجب تصحيح types.ts ليتطابق مع النموذج.

CommercialDocumentLine في types.ts يحتوي على product_variant_id، بينما النموذج الخلفي يستخدم product_id. يجب توحيد.

queryKeys.ts
يحتوي على مفاتيح للكاش، جيد.

client.ts
عميل HTTP مع دعم CSRF، إضافة slug تلقائياً، إدارة الأخطاء.

apiGet, apiPost, إلخ.

جيد.

التكامل بين الواجهة والخلفية
الواجهة ترسل payments في payload، لكن الخلفية تتعامل معها فقط في الإنشاء، وليس التحديث.

الواجهة ترسل price_level_id، لكن الخلفية لا تخزنه.

الواجهة ترسل apply_fiscal_stamp، لكن الخلفية لا تستخدمه (تحسب الطابع تلقائياً).

الواجهة ترسل document_number في التحديث، ولكن الخلفية قد تسمح بتغييره (لا تمنعه).

الواجهة ترسل discount_amount محولة إلى نسبة، ولكن الخلفية لا تقبل discount_amount مباشرة.

الواجهة تستخدم amount_paid و amount_remaining في الأنواع، بينما الخلفية تستخدم paid_amount و remaining_amount.

الواجهة تستخدم product_variant_id، بينما الخلفية تستخدم product_id.

الأخطاء الرئيسية المكتشفة
تحديث المستندات المعتمدة (غير المقفلة) يسمح بتعديل الأسطر، مما يؤدي إلى عدم اتساق حركات المخزون. يجب إما منع تعديل الأسطر في المستندات المعتمدة، أو عند تعديل الأسطر، يجب حذف حركات المخزون المرتبطة وإعادة إنشائها.

تحديث الدفعات غير مدعوم في الخدمة عند تحديث المستند. سيتم تجاهل الدفعات المرسلة في الطلب.

إمكانية تغيير رقم المستند في التحديث، مما قد يكسر الترقيم.

discount_amount غير مدعوم في الخدمة، يتم تحويله إلى نسبة، مما قد يؤدي إلى عدم دقة.

عدم تمرير fiscal_year_id عند إنشاء الدفعات في attachPayments.

إمكانية تعديل سطر منفرد في وثيقة مقفلة لأن CommercialDocumentLineService لا يتحقق من is_locked.

generateDocumentNumber يعتمد على id بدلاً من document_number، قد يؤدي إلى تكرار الأرقام.

عدم التحقق من كفاية المخزون في الخلفية (لكن قد يكون مقصوداً).

عدم تطابق الأنواع بين الواجهة والخلفية (amount_paid vs paid_amount, product_variant_id vs product_id).

زر الحذف في الواجهة (سيؤدي إلى فشل لأن الخدمة تمنع الحذف).

الـ Observer CommercialDocumentObserver يحول الحالة إلى "paid" تلقائياً إذا أصبح remaining_amount صفراً. هذا جيد، ولكن قد يتعارض مع تحديثات يدوية.

في CommercialDocumentService::afterCreate، يتم إنشاء حركات المخزون باستخدام is_validated = true. هذا جيد.

في afterUpdate، يتم حذف الأسطر القديمة ولكن لا يتم حذف حركات المخزون المرتبطة. قد تظل حركات المخزون مرتبطة بمعرفات أسطر محذوفة، مما يسبب مشاكل.

عدم وجود معاملة لإنشاء حركات المخزون والأسطر معاً، ولكن BaseService قد يوفر ذلك.

CommercialDocumentService::createStockMovements يستخدم $document->warehouse_id، ولكن إذا كان المستند من نوع نقل (BT) قد يكون له مستودع مصدر ومستودع وجهة، ولكن النموذج يحتوي على warehouse_id واحد فقط. هذا يعني أن حركات المخزون لنقل المخزون غير مدعومة بشكل صحيح (تحتاج إلى حركتين: خروج من مستودع ودخول إلى آخر). ولكن BT له affects_stock_direction = 0، لذا لن يتم إنشاء حركات، وهذا صحيح لأن النقل يتطلب معالجة خاصة.

توصيات الإصلاح
تعديل منطق التعديل: منع تعديل الأسطر في المستندات المعتمدة (ما لم تكن مقفلة). يمكن إضافة تحقق في beforeUpdate من CommercialDocumentService يمنع التحديث إذا كان validated_at موجوداً وتم تغيير الأسطر. أو على الأقل، إذا تم تحديث الأسطر، يجب حذف حركات المخزون المرتبطة وإعادة إنشائها.

دعم تحديث الدفعات: إما منع تحديث الدفعات في التعديل (بجعل حقل payments للقراءة فقط في الواجهة)، أو تنفيذ منطق لتحديث الدفعات (حذف الدفعات القديمة وإنشاء جديدة أو تحديثها). الأسهل هو منع تغيير الدفعات بعد إنشاء المستند (إلا عبر واجهة منفصلة).

منع تغيير document_number: في beforeUpdate، تحقق من أن document_number لم يتغير، أو تجاهل الحقل.

دعم discount_amount: تعديل createDocumentLines لقبول discount_amount مباشرة، وإذا وُجد استخدمه بدلاً من حساب الخصم من النسبة.

تمرير fiscal_year_id عند إنشاء الدفعات: إضافة fiscal_year_id من المستند إلى Payment عند الإنشاء.

التحقق من is_locked في CommercialDocumentLineService: قبل السماح بتحديث أو حذف سطر، تحقق من حالة الوثيقة الأم.

تحسين generateDocumentNumber: استخدام orderByDesc('document_number') مع like للحصول على آخر رقم بشكل صحيح.

تصحيح الأنواع في types.ts: تطابق أسماء الحقول مع النموذج الخلفي (paid_amount, remaining_amount, product_id).

إزالة زر الحذف من الواجهة أو تعديل الخدمة للسماح بالحذف (ولكن منطق الإلغاء أفضل).

معالجة حركات المخزون عند تحديث الأسطر: حذف الحركات القديمة وإنشاء جديدة بعد تحديث الأسطر.

تعديل buildPayload لإزالة price_level_id و apply_fiscal_stamp إذا لم تستخدم في الخلفية.

إضافة تحقق من allow_negative_stock في الخلفية: إذا كان false، ارفض البيع إذا كانت الكمية المطلوبة أكبر من المخزون.

خلاصة الأخطاء المكتشفة
سنقوم بتعداد الأخطاء بشكل واضح.

خطأ في CommercialDocumentService::attachPayments: لا يمرر fiscal_year_id عند إنشاء Payment.

خطأ في CommercialDocumentLineService: لا يتحقق من is_locked للوثيقة الأم، مما يسمح بتعديل سطر في وثيقة مقفلة.

خطأ في generateDocumentNumber: يعتمد على id وليس على document_number، مما قد يؤدي إلى تكرار الأرقام.

خطأ في CommercialDocumentService::afterUpdate: لا يحذف حركات المخزون المرتبطة بالأسطر القديمة، مما يسبب عدم اتساق.

خطأ في CommercialDocumentService::beforeUpdate: لا يمنع تعديل الأسطر في المستندات المعتمدة (غير المقفلة)، مما يسمح بتغيير الإجماليات والمخزون بعد الاعتماد.

خطأ في CommercialDocumentService::afterUpdate: يتجاهل payments المرسلة في الطلب، لذا لا يمكن تحديث الدفعات.

خطأ في CommercialDocumentService::beforeUpdate: لا يمنع تغيير document_number، مما قد يكسر الترقيم.

خطأ في createDocumentLines: لا يدعم discount_amount كقيمة مباشرة، بل يحسب من discount_percentage فقط، مما يضيع قيمة الخصم الثابت.

خطأ في CommercialDocumentModal.tsx: disableLines لا يشمل isValidated، مما يسمح بتعديل الأسطر في المستندات المعتمدة (وهو ما ذكرناه).

خطأ في types.ts: عدم تطابق أسماء الحقول (amount_paid vs paid_amount, amount_remaining vs remaining_amount, product_variant_id vs product_id).

خطأ في buildPayload: يرسل price_level_id و apply_fiscal_stamp وهما غير مستخدمين في الخلفية.

خطأ في CommercialDocumentModal.tsx: زر الحذف موجود ولكن الخدمة تمنع الحذف، مما سيؤدي إلى فشل دائم.

خطأ في CommercialDocumentService::createStockMovements: لا يتحقق من allow_negative_stock، مما قد يسمح ببيع كمية أكبر من المخزون.

خطأ في CommercialDocumentService::resolveNumberingSeries: قد ينشئ سلسلة جديدة لكل طلب إذا لم يجد، مما يؤدي إلى تكرار السلاسل.
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

function defaultDocDate(selectedYear?: { start_date?: string; end_date?: string }): string {
  const d = today();
  if (selectedYear?.start_date && selectedYear?.end_date) {
    const s = selectedYear.start_date.substring(0, 10);
    const e = selectedYear.end_date.substring(0, 10);
    if (d >= s && d <= e) return d;
    return e;
  }
  return d;
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
  const [docDate, setDocDate] = useState(defaultDocDate(selectedYear));
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
    payment_date: defaultDocDate(selectedYear),
  };

  // Effects for reset
  useEffect(() => {
    if (open) {
      setPartyId('');
      setDocDate(defaultDocDate(selectedYear));
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
  }, [open, defaultWarehouseId, selectedYear]);

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
    payment_date: defaultDocDate(selectedYear),
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

## FILE: resources/js/pages/documents/todo/rest.md
```
# المتبقي من STUDY_extended.md

> نسبة الإنجاز الكلية: ~38%
> ما طُبِّق: todo/ بالكامل (100% من ملفات التنفيذ) + فصول 1–9

---

## ✅ تم إنجازه

| البند | الملفات |
|---|---|
| أنواع document.types.ts | `document.types.ts` |
| هوك useDocumentForm | `hooks/useDocumentForm.ts` |
| هوك useDocumentLookups | `hooks/useDocumentLookups.ts` |
| هوك useComputeLine | `hooks/useComputeLine.ts` |
| هوك useCreditCheck | `hooks/useCreditCheck.ts` |
| هوك useDocumentChain | `hooks/useDocumentChain.ts` |
| مكون DocumentChainPanel | `components/DocumentChainPanel.tsx` |
| مكون CreditCheckBar | `components/CreditCheckBar.tsx` |
| مكون ReturnDocumentModal | `components/ReturnDocumentModal.tsx` |
| مكون DocumentLineRow | `components/DocumentLineRow.tsx` |
| المودال الرئيسي | `CommercialDocumentModal.tsx` |
| ComputeLineService | `app/Services/ComputeLineService.php` |
| DocumentConversionService | `app/Services/DocumentConversionService.php` |
| DocumentReturnService | `app/Services/DocumentReturnService.php` |
| CreditCheckService | `app/Services/CreditCheckService.php` |
| DocumentComputeController | `app/Http/Controllers/Api/V1/DocumentComputeController.php` |
| طلب التوثيق | `app/Http/Requests/StoreCommercialDocumentRequest.php` |
| validateDocument | `app/Services/CommercialDocumentService.php` |
| Routes | `routes/api.php` |
| اسم الطرف في الدفعات | `FinancePage.tsx` |
| **الفصل 5: نظام التسليم** | `DeliveryProgressBar.tsx`, تحويل BCC→BL delivery logic |
| **الفصل 6: معالجة الشيكات** | `CheckFormFields.tsx`, `ChecksPage.tsx`, route + nav |
| **الفصل 7: الفاتورة المبدئية** | `is_proforma` toggle/badge/logic + تحويل مبدئي→حقيقي |
| **الفصل 8: الشحن والتسليم** | `ShippingInfoSection.tsx` + `delivery_date`, `shipping_info` في النموذج |
| **الفصل 9: شروط الدفع** | `PaymentTermsTable.tsx` + `payment_terms` في النموذج |
| **تحسينات PaymentTermsTable** | حقل مبلغ قابل للكتابة + حساب عكسي (نسبة↔مبلغ) + زر المبلغ المتبقي + عملة `دج` |
| **Tabs للمساحة** | `Tabs` component في `DocumentUIPrimitives.tsx` + دمج الشحن/شروط الدفع في tabs |
| **مودال التحويل** | `ConvertDocumentModal.tsx` — تاريخ, اختيار نوع, لوحة مفاتيح |
| **تحسينات سلسلة المستندات** | عرض الكود + الاسم الكامل في chain panel و قائمة التحويل |

---

## ❌ المتبقي — فصول 10–24

### الفصل 10: الإعفاء الضريبي
**الملفات المطلوبة:**
- `services/TaxRuleService.php` — تحديد `effective_tva_rate` لكل (منتج × زبون)
- تحديث `ComboBox` أيقونة "معفى من TVA"
- تحديث `DocumentLineRow.tsx` — TVA = 0 تلقائياً وقراءة فقط للزبون المعفى

**المنطق:**
- `Party.is_tva_exempt` ← 0 TVA
- `Party.is_final_consumer` ← قواعد مختلفة
- `Product.tva_id` × `Party.tax_regime`

---

### الفصل 11: تحليلات مدمجة (CustomerInsightPanel)
**الملفات المطلوبة:**
- `components/CustomerInsightPanel.tsx`
- `hooks/useCustomerInsights.ts`

**المنطق:**
- آخر 5 مستندات للزبون
- متوسط قيمة الفاتورة الشهرية
- متوسط أيام السداد الفعلية
- المنتجات الأكثر شراءً (top 5)

---

### الفصل 12: محرك الاقتراحات الذكية
**الملفات المطلوبة:**
- `hooks/useProductSuggestions.ts`
- `components/SmartSuggestionsPanel.tsx`

**المنطق:**
- عند إضافة منتج: "اشتراه آخر مرة بسعر X"
- Cross-sell: "يُشترى عادةً مع Y, Z"
- Upsell: "خصم كمية عند ≥50 وحدة — أنت تطلب 30"

---

### الفصل 13: الدفع المسبق (Advance Payment)
**الملفات المطلوبة:**
- `hooks/useAdvancePayments.ts`
- تحديث `CommercialDocumentModal.tsx` — إشعار التسبيق غير المُستخدم

**المنطق:**
- `Payment.getUnappliedAmount()` موجود في الباكاند
- إشعار "لديه تسبيق X دج — هل تريد تطبيقه؟"
- ربط الدفعة بالفاتورة عبر `document_payment.amount_applied`

---

### الفصل 14: المطابقة البنكية
**الملفات المطلوبة:**
- `pages/reconciliation/BankReconciliationPage.tsx`
- `services/BankReconciliationService.php`

**المنطق:**
- `Payment.is_reconciled`, `reconciliation_date`, `bank_reference`
- واجهة 3 أعمدة: النظام ← المقترحات ← كشف البنك

---

### الفصل 15: تنبيهات ذكية
**الملفات المطلوبة:**
- `services/AlertEngine.php`
- `hooks/useAlerts.ts`
- `components/AlertBell.tsx`

**المنطق:**
- فواتير متأخرة، شيكات تستحق، مخزون منخفض — يومياً
- تنبيهات فورية بعد الحفظ

---

### الفصل 16: إحصاءات وتقارير مدمجة
**الملفات المطلوبة:**
- سرعة البيع (Velocity Report)
- تقرير الهامش (Margin Report)
- لوحة الديون (Aging Report — 0-30 / 31-60 / 61-90 / 90+ يوم)

---

### الفصل 17: المخزون متعدد المستودعات في السطر
**الملفات المطلوبة:**
- مigration لإضافة `warehouse_id` إلى `commercial_document_lines`
- تحديث `DocumentLineRow.tsx` — اختيار مستودع لكل سطر

**المنطق:**
- يُرث من header إذا لم يُحدَّد
- حركة المخزون من مستودع السطر

---

### الفصل 18: نظام الموافقات
**الملفات المطلوبة:**
- `models/ApprovalThreshold.php`
- `services/ApprovalWorkflowService.php`
- تحديث `CommercialDocumentModal.tsx` — تحذير "يتجاوز الحد — سيُرسَل للموافقة"

**المنطق:**
- `net_to_pay > threshold` ← حالة `pending_approval`
- إشعار للمدير ← موافقة أو رفض مع سبب

---

### الفصل 19: استيراد/تصدير
**الملفات المطلوبة:**
- استيراد أسطر من Excel
- تصدير PDF / Excel / JSON / XML

---

### الفصل 20: الذاكرة الذكية للمودال
**الملفات المطلوبة:**
- حفظ مسودة تلقائية في localStorage كل 30 ثانية
- اقتراحات ذكية (المستودع المفضل، فئة السعر المعتادة)

---

### الفصل 21: واجهة السطر — Card Mode
**الملفات المطلوبة:**
- `components/LineCard.tsx` — وضع البطاقة لكل سطر
- toggle Table/Card Mode

---

### الفصل 22: إدخال الباركود
**الملفات المطلوبة:**
- `components/BarcodeInput.tsx`
- البحث بـ `Product.barcode` + إضافة سطر / زيادة كمية

---

### الفصل 23: التواصل مع الزبون
**الملفات المطلوبة:**
- `services/DocumentMailService.php`
- زر "إرسال للزبون" في footer المودال
- إرفاق PDF تلقائياً

---

### الفصل 24: تكامل السنة المالية
**الملفات المطلوبة:**
- تحقق: تاريخ المستند ضمن نطاق السنة المالية
- تحقق: السنة المالية مفتوحة (`is_closed = false`)
- تحذير فوري عند عدم التطابق

---

## 🐛 مشاكل صغيرة متبقية

| المشكلة | الموقع | الحل |
|---|---|---|
| `lineWarnings` من useDocumentForm غير مستخدمة | `CommercialDocumentModal.tsx` و `DocumentLineRow.tsx` | تمرير `lineWarnings` للـ row وعرضها |
| `_warnings` في LineItem غير معروضة | `DocumentLineRow.tsx` | إضافة صف تحذير أسفل كل سطر من `line._warnings` |

---

**ملخص:** 24 فصلاً، أُنجز 9 فصول كاملة (~38%)، بقي 15 فصلاً (~62%) + تحسينات PaymentTermsTable + Tabs + مشكلتين صغيرتين في `lineWarnings` و `_warnings`.



```

## FILE: resources/js/pages/documents/todo/STUDY_extended.md
```
# الدراسة الموسعة والشاملة — وحدة المستندات التجارية
## ما يجب بناؤه من الصفر + ما هو موجود لكن غائب عن الواجهة

---

# أولاً — الاكتشافات من قراءة الكود الكامل

قبل الاقتراحات يجب فهم ما يمتلكه النظام فعلاً.
الباكاند مكتوب بعناية ويخزن بيانات ثمينة لا يعرفها الفرونتند أبداً:

**في CommercialDocument:**
`delivery_date` — تاريخ التسليم المتوقع، غير موجود في المودال
`issued_at` — تاريخ الإصدار الفعلي، غير مُعرَض
`payment_terms` — JSON يخزن شروط الدفع المفصلة (array)
`shipping_info` — JSON يخزن بيانات الشحن (array)
`legal_mentions` — JSON للبيانات القانونية في الطباعة (array)
`is_proforma` — فاتورة مبدئية/عرض سعر، لا يوجد تبديل في UI
`qr_code_data` — بيانات QR موجودة لكن لا تُعرَض
`fiscal_stamp_id` — ربط بالطابع الجبائي، لكن الفرونتند يحسبه بطريقته
`numbering_series_id` — المستخدم لا يرى أي سلسلة ترقيمية تُستخدَم

**في Party:**
`credit_limit` — حد الائتمان، لا أحد يتحقق منه
`credit_days` — أيام الائتمان، due_date لا يُحسَب منه تلقائياً
`is_tva_exempt` — إعفاء ضريبي، لا يُطبَّق على الأسطر
`is_final_consumer` — مستهلك نهائي، قواعد TVA مختلفة لكن لا أحد يطبقها
`is_vat_registered` — مسجل في الضريبة، يؤثر على الإشعارات والمستندات
`payment_terms` (array في additional_data) — شروط مفصلة مخزنة

**في Product:**
`min_stock_alert` — حد التنبيه لنقص المخزون، لا أحد يستخدمه
`max_stock_alert` — حد التخزين الأقصى، مجهول
`has_expiration_date` — المنتج له صلاحية، لكن FEFO غير مُطبَّق
`manages_quantity_discounts` — العلَم يُخبر إذا كان المنتج له خصومات كميات
`weight`, `volume`, `length`, `width`, `height` — أبعاد للشحن، لا تُستخدَم
`stockOnDate()` — دالة قوية تحسب المخزون في تاريخ معين، غير مستدعاة
`costPriceOnDate()` — سعر التكلفة في تاريخ معين، يُغني عن current_cost_price
`finalPrice()` — يحسب السعر النهائي بعد كل الخصومات، لا أحد يستدعيه

**في Payment:**
`check_id` — دفع بشيك مرتبط بنموذج Check، الفرونتند لا يعرف Checks
`amount_local` — المبلغ بالعملة المحلية، دائماً null لأن الفرونتند لا يُرسله
`is_reconciled` — للمطابقة البنكية، لا توجد واجهة مطلاقاً
`bank_reference` — مرجع البنك للتحويلات، غير موجود في نموذج الدفع

---

# ثانياً — ما يجب بناؤه من الصفر تماماً

## الفصل الأول: إعادة تصور محرك التسعير

الوضع الحالي كارثي من ناحية التصميم: الباكاند يمتلك دوال تسعير ناضجة ودقيقة
(`computedPrice`, `finalPrice`, `applicableDiscount`, `priceForPackaging`,
`calculateDiscountedPrice`) والفرونتند يعيد بناء كل هذا المنطق محلياً بشكل
مبسط وناقص. النتيجة: بيانات خاطئة دون أن يعرف أحد.

الحل الجذري ليس "إصلاح الحسابات المحلية" — الحل هو إلغاؤها واستبدالها بـ
**compute-line endpoint** واحد يُعيد كل شيء من الباكاند بناءً على القواعد الحقيقية.

هذا الـ endpoint يجب أن يُرجع:
- السعر الصحيح بناءً على فئة السعر وطريقة التسعير (fixed/rate/margin)
- السعر الصحيح للعبوة بناءً على packaging المختار
- الخصم الصحيح بناءً على الكمية بالوحدات الأساسية
- ما إذا كان النطاق محجوباً (is_blocked)
- TVA الصحيح (0 إذا كان الزبون معفى)
- المخزون المتاح في المستودع المحدد
- اقتراح الأكوام مرتبة بـ FEFO
- هامش الربح المحسوب

استخدامه في الفرونتند بـ debounce 300ms يعني أن أي تغيير في الكمية أو العبوة
أو الزبون أو المستودع يُطلق استدعاءً واحداً يُحدِّث كل شيء في السطر دفعة واحدة
بدلاً من منطق محلي متشعب في عشرة أماكن.

---

## الفصل الثاني: نظام حد الائتمان والمخاطر المالية

`Party.credit_limit` و`Party.credit_days` موجودان في كل زبون لكن لا أحد يسألهما.

هذا يعني أنك تبيع بضاعة لزبون جاوز حده الائتماني دون أي تحذير. في السياق
الجزائري حيث ثقافة الدين التجاري شائعة، هذا خطر مالي حقيقي.

ما يجب بناؤه هو طبقة فحص ائتماني تعمل في مكانين:

**على مستوى الباكاند:** قبل قبول أي مستند بيع جديد، يحسب مجموع
الرصيد الحالي للزبون + قيمة المستند الجديد ويقارنه بـ credit_limit.
إذا تجاوز يرفع استثناء من نوع `CreditLimitExceededException` يحمل
تفاصيل التجاوز. الـ Controller يُعيده كـ 422 مع تفاصيل واضحة.

**على مستوى الفرونتند:** عند اختيار الزبون وعند كل تغيير في الإجماليات،
يُستدعى endpoint خفيف يُرجع حالة الائتمان. المودال يعرض شريطاً ملوناً
يُظهر: الحد الائتماني، المستخدم منه، المتاح. إذا كان المستند الجديد سيتجاوز
الحد يظهر تحذير واضح. صلاحية `override_credit_limit` تسمح لمدير المبيعات
بتجاوز الحد مع تسجيل السبب.

إضافةً لذلك: فحص الفواتير المتأخرة. إذا كان للزبون فواتير تجاوزت `credit_days`
ولم تُسدَّد، يظهر تحذير منفصل "هذا الزبون لديه X فاتورة متأخرة بقيمة Y دج".
بعض الشركات تضع سياسة عدم البيع لزبائن متأخرين — هذا قرار قابل للضبط.

---

## الفصل الثالث: سلسلة المستندات الذكية

النظام يخزن `source_document_id` و`cancellation_of_document_id` لكن
لا يوجد أي منطق يستخدمهما في الواجهة.

**سلسلة البيع الكاملة:**
```
DEV (عرض سعر)
  ↓ تحويل
BCC (أمر عميل) — يتتبع الكميات المُسلَّمة
  ↓ تحويل جزئي ممكن
BL (بون تسليم) — يُسقط المخزون
  ↓ تحويل
FV (فاتورة بيع) — تؤثر محاسبياً
  ↓ عند الإرجاع
AV (أوار بيع) — يُعيد المخزون ويُعدِّل الرصيد
```

**ما يجب بناؤه:**

وظيفة تحويل مستند في الباكاند تنسخ المستند الأصلي بنوع مستند جديد وترتبط به
عبر `source_document_id`. تتتبع الكميات المُحوَّلة مقابل الكميات الأصلية.
مثلاً: BCC بـ 100 وحدة تحوّل إلى BL1 بـ 60 وحدة وBL2 بـ 40 وحدة.
الـ BCC يعرف أن 100/100 سُلِّمت وأن حالته يجب أن تتحول.

في الفرونتند: شريط "سلسلة المستند" يظهر في المودال عند التعديل يُظهر المسار
الكامل من المستند الأول حتى الآخر. كل مستند في السلسلة قابل للنقر للانتقال إليه.
زر "تحويل إلى" في footer المودال يفتح sub-modal يختار نوع المستند الهدف ويملأ
المودال الجديد بكل بيانات المستند الأصلي.

---

## الفصل الرابع: نظام الإرجاع والتصحيح

`cancellation_of_document_id` موجود لكن مجهول.

**ما يجب بناؤه — ReturnDocumentBuilder:**

عند النقر على "إنشاء مرتجع" من فاتورة بيع، يفتح modal مخصص يعرض أسطر
الفاتورة الأصلية مع إمكانية تحديد الكميات المُرجَعة لكل سطر (جزئية أو كاملة).
يُضيف حقلاً لسبب الإرجاع مطلوباً. عند التأكيد ينشئ AV مرتبطاً بالفاتورة
الأصلية عبر `cancellation_of_document_id` وحركات مخزون عكسية تلقائياً.
`remaining_amount` في الفاتورة الأصلية لا يتغير (الإرجاع مستند منفصل)
لكن `paid_amount` يتأثر إذا كان الإرجاع يترتب عليه استرداد مالي.

---

## الفصل الخامس: نظام التسليم والتتبع

`CommercialDocumentLine.delivered_quantity` و`returned_quantity` موجودان
لكن لا يُحدَّثان أبداً.

المشكلة: تُصدر BCC لزبون بـ 500 كرتون على دفعتين. تُسلِّم الدفعة الأولى 300
كرتون عبر BL1. النظام لا يعرف أن 200 كرتون لا تزال معلقة.

**ما يجب بناؤه:**

عند تحويل BCC إلى BL، الـ Service يُحدِّث `delivered_quantity` في أسطر BCC
بمقدار الكميات في BL. `CommercialDocumentLine::getRemainingQuantity()` موجودة
وتحسب الكمية المتبقية (quantity - delivered_quantity - returned_quantity).

في الفرونتند: أسطر BCC تُعرَض مع progress bar للتسليم:
"300 من 500 — 60% مُسلَّم". عندما تكتمل يظهر badge "مُسلَّم بالكامل"
وحالة BCC تتحول تلقائياً.

---

## الفصل السادس: نظام معالجة الشيكات

`Payment.check_id` يُشير لنموذج `Check` كامل في الباكاند.
لا يوجد في الكود أي دعم لهذا.

الشيك في السياق الجزائري له دورة حياة خاصة:
استلام الشيك ← تسجيله ← إيداعه في البنك ← تأكيد الصرف أو الرفض

**ما يجب بناؤه:**

نموذج إدخال خاص عند اختيار طريقة دفع "شيك" في المودال يطلب:
رقم الشيك، البنك المصدر، اسم صاحب الحساب، تاريخ الإصدار، تاريخ الاستحقاق.
يُنشئ كيان Check مرتبطاً بـ Payment. حالة الشيك: `received` → `deposited`
→ `cleared` أو `returned`. صفحة مستقلة لإدارة الشيكات تعرض:
الشيكات المُستلَمة غير المودعة، تلك التي حان موعد إيداعها، تلك التي قيل
إنها رُفضت. تنبيه تلقائي قبل أسبوع من تاريخ استحقاق الشيك.

---

## الفصل السابع: الفاتورة المبدئية (Pro Forma)

`CommercialDocument.is_proforma` موجود لكن لا يوجد أي toggle في المودال.

الفاتورة المبدئية هي فاتورة للعرض تُرسَل للزبون قبل التأكيد النهائي.
لا تُحرَّك مخزون ولا تُسجَّل محاسبياً.

**ما يجب بناؤه:**

في مودال FV: toggle "فاتورة مبدئية" — عند تفعيله:
- لا تُنشَأ حركات مخزون
- لا تؤثر على رصيد المتعامل
- badge "مبدئية" واضح في العرض
- زر "تأكيد وتحويل لفاتورة حقيقية" يُحوِّلها لـ FV حقيقية

في الباكاند: `beforeCreate` يفحص `is_proforma` ويتخطى `createStockMovements`
و`attachPayments` إذا كانت مبدئية.

---

## الفصل الثامن: بيانات الشحن والتسليم

`CommercialDocument.shipping_info` (JSON) و`delivery_date` موجودان.
لا يوجد أي قسم شحن في المودال.

**ما يجب بناؤه:**

Section اختياري "معلومات الشحن" في المودال يُظهر عند BL وBCC:
- تاريخ التسليم المتوقع (delivery_date)
- عنوان التسليم (افتراضي من عنوان الزبون، قابل للتعديل)
- وسيلة النقل (شاحنة/مندوب/استلام ذاتي)
- ملاحظات السائق
- رقم لوحة المركبة
- اسم المندوب

كل هذا يُخزَّن في `shipping_info` كـ JSON. يُطبَّع في الطباعة كحقول رسمية على BL.

---

## الفصل التاسع: شروط الدفع المفصلة

`CommercialDocument.payment_terms` (JSON array) موجود.
المودال الحالي يتجاهله تماماً.

**ما يجب بناؤه:**

بدل تاريخ استحقاق واحد، نظام شروط دفع مرن:
- 30% مقدماً عند الطلب
- 40% عند التسليم
- 30% بعد 60 يوم

يُخزَّن كـ JSON في `payment_terms`:
```json
[
  {"due_date": "2025-01-15", "percentage": 30, "amount": 45000, "notes": "دفعة مقدمة"},
  {"due_date": "2025-02-01", "percentage": 40, "amount": 60000, "notes": "عند التسليم"},
  {"due_date": "2025-04-01", "percentage": 30, "amount": 45000, "notes": "آجل 60 يوم"}
]
```

في الفرونتند: جدول شروط الدفع يُحسَب تلقائياً من credit_days الزبون
أو يُدخَل يدوياً. المجموع يجب أن يساوي net_to_pay.
عند استحقاق كل دفعة يُرسَل إشعار تلقائي.

---

## الفصل العاشر: الإعفاء الضريبي والتعقيد الجزائري

`Party.is_tva_exempt`, `Party.is_final_consumer`, `Party.is_vat_registered`
موجودة. `Party.tax_regime` موجود. لا أحد يستخدمها.

السياق الجزائري يُعقِّد هذا أكثر: زبون معفى من TVA (مثل الصيدليات لبعض المنتجات)
يجب أن تكون فواتيره بـ TVA = 0. زبون نظام forfaitaire قد لا يستحق TVA.

**ما يجب بناؤه:**

**على مستوى الباكاند:**
`TaxRuleService` يُحدِّد `effective_tva_rate` لكل زوج (منتج × زبون):
إذا `party.is_tva_exempt = true` → 0
إذا `product.tva_id` لمعدل معين والزبون معفى من هذا المعدل → 0
وإلا → `product.tva.rate`

يُستدعى هذا من `compute-line endpoint` ليُرجع `tva_rate` الصحيح مع كل حساب.

**على مستوى الفرونتند:**
عند اختيار زبون معفى → أيقونة "معفى من TVA" بجانب اسمه في ComboBox
عند إضافة سطر لزبون معفى → `tva_rate = 0` تلقائياً وقراءة فقط (لا يُعدَّل)
في الإجماليات → صف "TVA (معفى): 0.00 دج" بدل عدم إظهاره

---

## الفصل الحادي عشر: تحليلات مدمجة في لحظة البيع

الفرونتند الحالي يعرض رصيد الزبون — ممتاز. لكن المعلومات التجارية الأعمق غائبة.

**ما يجب بناؤه — CustomerInsightPanel:**

Panel جانبي (أو قابل للطي) يظهر عند اختيار الزبون:
- آخر 5 مستندات له مع تواريخها ومبالغها وحالتها
- متوسط قيمة فاتورته الشهرية
- متوسط أيام السداد الفعلية مقابل الـ credit_days
- المنتجات الأكثر شراءً منه (top 5)
- هل يشتري بانتظام أم موسمي؟

هذا يُساعد مندوب المبيعات على اقتراح منتجات ذات صلة وتحديد الزبائن ذوي الخطر.

---

## الفصل الثاني عشر: محرك الاقتراحات الذكية

عند إضافة منتج لسطر، يظهر panel صغير يقترح:
- "الزبون اشترى هذا المنتج آخر مرة بسعر X" (من التاريخ)
- "يُشترى عادةً مع هذا المنتج: Y, Z" (cross-sell)
- "المخزون يكفي X أيام فقط بمعدل البيع الحالي" (تحذير)
- "هذا المنتج له خصم كمية عند ≥50 وحدة — أنت تطلب 30" (upsell)

البيانات التاريخية موجودة في `commercial_documents` و`lines`.
الحسابات بسيطة لا تحتاج AI.

---

## الفصل الثالث عشر: الدفع المسبق (Advance Payment) وتسويته

سيناريو شائع: الزبون يدفع 100,000 دج مقدماً قبل أي فاتورة.
لاحقاً تُصدَر له فواتير تُخصَم من هذا الرصيد.

النظام الحالي لا يتعامل مع هذا. `Payment.getUnappliedAmount()` موجود
وهو مفتاح الحل.

**ما يجب بناؤه:**

نوع دفع جديد: "دفعة مسبقة / تسبيق". تُنشئ `Payment` بـ `party_id`
بدون `commercial_document_id`. تُظهر في رصيد الزبون كـ "رصيد دائن غير مُطبَّق".

عند إنشاء فاتورة جديدة لنفس الزبون: يظهر إشعار "لدى هذا الزبون تسبيق
غير مُستخدَم بقيمة X دج — هل تريد تطبيقه؟". موافقة تُربط الدفعة بالفاتورة
عبر جدول `document_payment` بـ `amount_applied`.

---

## الفصل الرابع عشر: المطابقة البنكية (Bank Reconciliation)

`Payment.is_reconciled`, `Payment.reconciliation_date`, `Payment.bank_reference`
موجودة في الموديل. لا توجد أي واجهة.

**ما يجب بناؤه:**

صفحة مستقلة `BankReconciliationPage` بثلاث أعمدة:
العمود الأول: حركات الخزينة في النظام (غير مطابَقة)
العمود الثاني: حركات كشف الحساب البنكي (مُستورَد كـ CSV أو مُدخَل يدوياً)
العمود الثالث: المتطابقات المقترحة (بناءً على المبلغ والتاريخ)

المستخدم يُؤكِّد التطابق → `is_reconciled = true` و`reconciliation_date = today`.
الفارق غير المُطابَق يُظهَر كـ "رصيد عائم" يحتاج تحقيقاً.

---

## الفصل الخامس عشر: تنبيهات ذكية وإشعارات استباقية

**ما يجب بناؤه — AlertEngine:**

نظام تنبيهات يُشغِّل checks دورية:

**يومياً:**
- فواتير تجاوزت `due_date` ولم تُسدَّد → إشعار "متأخرة"
- شيكات تستحق خلال أسبوع → إشعار "شيك يستحق"
- منتجات وصلت `min_stock_alert` بسبب مبيعات أمس → إشعار مخزون

**عند كل عملية:**
- بعد حفظ مستند يُطلب تحقق credit_limit → تنبيه تجاوز فوري
- بعد بيع من كوم قاربت الانتهاء → تنبيه "كوم X ستنتهي في Y يوم"

التنبيهات تظهر في notification bell في الـ header وكـ toast عند حدوثها
أثناء عمل المستخدم.

---

## الفصل السادس عشر: الإحصاءات والتقارير المدمجة

**ما يجب بناؤه — داخل صفحة CommercialDocumentsPage وليس المودال:**

**تقرير سرعة البيع (Velocity Report):**
لكل منتج: كم وحدة تُباع يومياً/أسبوعياً. يُحسَب من `stock_movements`.
يُظهر: "بالمعدل الحالي المخزون يكفي X يوم" → يُساعد على قرار إعادة الطلب.

**تقرير الهامش (Margin Report):**
لكل سطر في كل فاتورة: الهامش الفعلي = سعر_البيع - current_cost_price.
مجمَّع على مستوى الزبون / المنتج / الفترة. لا يوجد هذا التقرير أبداً.

**لوحة الديون القابلة للتحصيل (Aging Report):**
مدة المديونية مُجمَّعة:
0-30 يوم / 31-60 يوم / 61-90 يوم / أكثر من 90 يوم
لكل زبون وبالإجمالي. هذا ما يطلبه كل محاسب.

---

## الفصل السابع عشر: المخزون المتعدد المستودعات في السطر

النظام الحالي: المستند كله لمستودع واحد.
لكن warehouse_id في الـ header يُطبَّق على كل الأسطر.

**سيناريو حقيقي:** منتج A متوفر في مستودع الشمال، منتج B في مستودع الجنوب.
الزبون يريد الاثنين في فاتورة واحدة.

**ما يجب بناؤه:**

إضافة `warehouse_id` على مستوى السطر (اختياري — يُرث من header إذا لم يُحدَّد).
CommercialDocumentLine يُضاف إليه `warehouse_id` nullable.
حركات المخزون تُنشأ من المستودع المحدد في السطر وليس في الـ header.

---

## الفصل الثامن عشر: نظام الموافقات (Approval Workflow)

السياق الجزائري غالباً يتطلب موافقة مدير على فواتير فوق حد معين.

**ما يجب بناؤه:**

`ApprovalThreshold` كإعداد في النظام:
إذا `net_to_pay > threshold` → المستند يُنشأ بحالة `pending_approval`
يُرسَل إشعار لمدير المبيعات / المدير العام
المدير يُوافق → يتحول `validated`
المدير يرفض مع سبب → يتحول `rejected` ويُشعَر المُنشئ

في المودال: إذا كان `net_to_pay > threshold` يظهر تحذير
"هذا المستند يتجاوز الحد المسموح — سيُرسَل للموافقة".

---

## الفصل التاسع عشر: استيراد وتصدير

**استيراد الأسطر من Excel:**
جدول Excel بأعمدة: رمز المنتج، الكمية، السعر، الخصم.
عند رفع الملف: يُحاوَل ربط كل رمز بمنتج في قاعدة البيانات.
المنتجات غير الموجودة تُعلَّم باللون الأحمر.
المستخدم يُراجع ثم يُضيف للسطر.

**تصدير المستند لصيغ متعددة:**
- PDF (الطباعة الرسمية)
- Excel (للمراجعة الداخلية)
- JSON (للتكامل مع برامج محاسبة خارجية)
- XML (لبعض متطلبات التقارير الجزائرية)

---

## الفصل العشرون: الذاكرة الذكية للمودال

**ما يجب بناؤه — SmartDefaults:**

النظام يتعلم من عادات المستخدم:
- المستودع الذي يستخدمه عادةً هذا المستخدم → يُختار افتراضياً
- فئة السعر التي يختارها لهذا الزبون دائماً → تُطبَّق تلقائياً
- الكميات التي يطلبها الزبون عادةً لكل منتج → تُقترَح

هذا يُخزَّن في `user_preferences` أو `localStorage` حسب درجة الحساسية.

**حفظ مسودة تلقائية:**
كل 30 ثانية إذا كان المودال مفتوحاً مع أسطر → حفظ في localStorage.
عند فتح المودال: "لديك مسودة محفوظة من X دقيقة — هل تريد استعادتها؟"

---

## الفصل الحادي والعشرون: واجهة السطر المُعاد تصورها

السطر الحالي: جدول أفقي ضيق يُجبر المستخدم على التمرير.

**ما يجب بناؤه — LineCard Mode:**

وضعان للعرض قابلان للتبديل:
**Table Mode (الحالي):** مناسب للشاشات الكبيرة والمستخدمين المحترفين
**Card Mode (جديد):** كل سطر يُعرَض كبطاقة كاملة بمعلومات غنية
- صورة المنتج (إذا كان `images` ممتلئاً)
- الاسم الكامل والرمز والباركود
- السعر الأصلي مشطوباً ← السعر بعد الخصم
- الكمية مع زرَّي + و-
- الهامش بلون (أخضر/برتقالي/أحمر)
- المخزون المتاح

---

## الفصل الثاني والعشرون: الباركود في الإدخال

`Product.barcode` موجود. لا يوجد إدخال بالباركود.

**ما يجب بناؤه:**

حقل بحث بالباركود في أعلى جدول الأسطر.
المستخدم يُدخِّل باركود (أو يمرر Scanner USB → يبعث Enter تلقائياً):
- يبحث عن المنتج بالباركود أو رمز التعبئة
- إذا وُجد يُضيف سطراً جديداً بكمية 1
- إذا كان المنتج موجوداً بالفعل في أسطر يزيد كميته بـ 1

هذا يُحوِّل المودال لنقطة بيع خفيفة مناسبة لمن يستخدم قارئ باركود.

---

## الفصل الثالث والعشرون: الإشعارات والتواصل مع الزبون

عند حفظ فاتورة: زر "إرسال للزبون" يفتح modal صغير:
- البريد الإلكتروني مُعبَّأ من `party.email`
- رسالة افتراضية بالعربية
- إرفاق PDF تلقائياً
- تاريخ الاستحقاق مُذكَّر في نص الرسالة

في الباكاند: `DocumentMailService::sendToParty(document)` يُرسل البريد.
يُسجَّل في `document.internal_notes` تاريخ ووقت الإرسال.

---

## الفصل الرابع والعشرون: تكامل مع السنة المالية

حقل `fiscal_year_id` في المودال يُختار يدوياً.
لكن الباكاند ينشئ المستند في أي سنة يختارها المستخدم دون تحقق.

**ما يجب بناؤه:**

تحقق ثلاثي الاتجاه:
1. `document_date` يجب أن يكون ضمن نطاق السنة المالية المختارة
2. السنة المالية يجب أن تكون مفتوحة (`is_closed = false`)
3. تاريخ اليوم يجب أن يكون ضمن نطاق السنة (لا يمكن إنشاء مستند بتاريخ مستقبلي
   بعيد جداً)

إذا اختار المستخدم تاريخاً لا يتطابق مع السنة المالية → تحذير فوري.
إذا كانت السنة المختارة مغلقة → رسالة خطأ واضحة.

---

## ملخص خارطة التنفيذ حسب الأثر

**أثر مالي مباشر (الخطر الأكبر):**
نظام حد الائتمان ← يمنع خسائر مالية حقيقية
معالجة الإعفاء الضريبي ← تجنب غرامات ضريبية
نظام الشيكات ← شيكات منسية = خسائر

**أثر تشغيلي يومي:**
تحويل المستندات ← يوفر 70% من وقت إدخال البيانات
شروط الدفع المفصلة ← وضوح مالي أفضل
تتبع التسليم ← لا تضارب بين الطلبات والتسليمات

**أثر تحليلي استراتيجي:**
تقرير الهامش ← قرارات تسعير أفضل
Aging Report ← إدارة الديون
تحليل سرعة البيع ← إدارة المخزون

**تحسين تجربة المستخدم:**
إدخال بالباركود ← سرعة إدخال مضاعفة
اقتراحات ذكية ← cross-sell
حفظ المسودة ← لا ضياع بيانات


تم انجاز مختلف النقاط يوجد ملفات التي تم انجازها بجانب هذا الملف يمكنك التحقق منها
الآن لدي الصورة الدقيقة الكاملة. المتبقي هو:
مشاكل حقيقية تحتاج إكمال:

lineWarnings مُرجَع من useDocumentForm لكن لا يُستخدَم في CommercialDocumentModal ولا في DocumentLineRow
_warnings في LineItem لا تُعرَض في DocumentLineRow
hooks_frontend.ts يحتاج تقسيم لـ 3 ملفات منفصلة
components_new.tsx يحتاج تقسيم لـ 3 ملفات منفصلة
Services_backend.php فيه 3 namespaces منفصلة — يجب تقسيمه لـ 3 ملفات
 اكمل هاته النقاط ثم هات نسبة التقدم في انجاز كامل نقاط هذا الملف لتكمله```

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
export const SHIPPING_CODES  = new Set(['BL', 'BCC']);

/** خريطة التحويلات المسموح بها (من → إلى[]) */
export const CONVERSION_MAP: Record<string, string[]> = {
  DEV: ['BCC', 'BL', 'FV'],
  BCC: ['BL', 'FV'],
  BL:  ['FV'],
  DDP: ['BCF'],
  BCF: ['BR', 'FA'],
  BR:  ['FA'],
};

/** أنواع تدعم إنشاء مرتجع */
export const RETURNABLE_CODES = new Set(['FV', 'FA', 'BL', 'BR']);

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
  is_blocked?:          boolean;
  tier_order?:          number;
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
  manages_quantity_discounts?: boolean;
  has_lots?:                  boolean;
  has_expiration_date?:      boolean;
  active?:                    boolean;
  stock_quantity?:            number | null;
  allow_negative_stock?:      boolean;
  min_stock_alert?:          number | null;
}

// ─── Party ────────────────────────────────────────────────────────────────────

export interface Party {
  id:                      number;
  name:                    string;
  code?:                   string | null;
  phone?:                  string | null;
  email?:                  string | null;
  balance?:                number | null;
  default_price_level_id?: number | null;
  default_price_level?:    { id: number; name: string } | null;
  credit_limit?:           number | null;
  credit_days?:            number | null;
  is_tva_exempt?:          boolean;
  is_final_consumer?:      boolean;
  is_vat_registered?:      boolean;
}

// ─── Shipping Info ──────────────────────────────────────────────────────────────

export interface ShippingInfo {
  address?:       string;
  transport_mode?: string;
  driver_name?:   string;
  vehicle_plate?: string;
  driver_notes?:  string;
}

// ─── Payment Term ──────────────────────────────────────────────────────────────

export interface PaymentTerm {
  due_date:    string;
  percentage:  number;
  amount:      number;
  notes?:      string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface PaymentMode {
  id:                    number;
  name:                  string;
  code?:                 string | null;
  icon?:                 string | null;
  treasury_account_id?:  number | null;
  requires_reference?:   boolean;
  is_cash?:              boolean;
}

export interface PaymentEntry {
  payment_mode_id:      string;
  amount:               string;
  reference?:           string;
  payment_date:         string;
  treasury_account_id?: string | number;
  check_number?:        string;
  check_bank?:          string;
  check_due_date?:      string;
}

// ─── Treasury Account ─────────────────────────────────────────────────────────

export interface TreasuryAccount {
  id:              number;
  code:            string;
  name:            string;
  type:            'bank' | 'cash' | 'check';
  balance:         number;
  is_active:       boolean;
  bank_name?:      string | null;
  account_number?: string | null;
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
  _product?:              Product;
  _packQty:               number;
  _warnings?:             Array<{ type: string; level: string; message: string }>;
  _computing?:            boolean;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface DocumentFormState {
  party_id:       string;
  document_date:  string;
  due_date:       string;
  delivery_date:  string;
  notes:          string;
  internal_notes: string;
  warehouse_id:   string;
  fiscal_year_id: string;
  currency_id:    string;
  exchange_rate:  string;
  apply_stamp:    boolean;
  price_level_id: string;
  is_proforma:    boolean;
  lines:          LineItem[];
  payments:       PaymentEntry[];
  shipping_info:  ShippingInfo;
  payment_terms:  PaymentTerm[];
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

// ─── Document Status ──────────────────────────────────────────────────────────

export interface DocumentStatus {
  id:     number;
  name:   string;
  label:  string;
  color:  string;
  active: boolean;
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
  { key: 'margin',     label: 'الهامش',         w: 80,  fixed: false },
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
// pages/documents/utils/document.utils.ts — إصلاح كامل للحسابات
//
// ══ نموذج البيانات (مصدر الحقيقة) ══════════════════════════════════════════
//
// الباكاند (DB):
//   quantity         = وحدات أساسية دائماً (مثلاً: 24 قارورة)
//   unit_price_ht    = سعر الوحدة الأساسية HT
//   discount_percentage = نسبة الخصم %
//   discount_amount  = مبلغ خصم الوحدة الواحدة (= unit_price_ht × discPct/100)
//   total_ht         = quantity × unit_price_ht × (1 - discPct/100)
//
// الفرونتند (LineItem):
//   quantity         = عدد العبوات (مثلاً: 2 كرتون)
//   _packQty         = كمية الوحدات في العبوة (مثلاً: 12)
//   unit_price_ht    = سعر الوحدة الأساسية HT (نفس الباكاند)
//   price_per_pack   = سعر العبوة = unit_price_ht × _packQty
//   discount_mode    = 'percent' | 'fixed'
//   discount_percentage = نسبة الخصم % (عند percent)
//   discount_amount_fixed = مبلغ خصم العبوة الواحدة (عند fixed)
//
// ══ معادلات الإرسال للباكاند ════════════════════════════════════════════════
//
//   effectiveQty = quantity × _packQty    (تحويل للوحدات الأساسية)
//   unit_price_ht = unit_price_ht         (لا تغيير)
//   discount_percentage:
//     - percent mode:  discountPercentage (مباشر)
//     - fixed mode:    (discount_amount_fixed / price_per_pack) × 100
//       ملاحظة: discount_amount_fixed هو خصم العبوة الواحدة
//               الباكاند يريد discount_amount = خصم الوحدة الأساسية
//   discount_amount (للباكاند) = unit_price_ht × discPct / 100
//
// ══ معادلات الاستقبال من الباكاند ═══════════════════════════════════════════
//
//   displayQty = db.quantity / _packQty   (تحويل لعبوات)
//   discount_amount_fixed = db.discount_amount × _packQty
//
// ════════════════════════════════════════════════════════════════════════════

import type {
  LineItem,
  DocumentTotals,
  Product,
  ProductPrice,
  ColKey,
} from '../types/document.types';

// ─── Number helpers ───────────────────────────────────────────────────────────

export function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const p = parseFloat(String(v));
  return isNaN(p) ? 0 : p;
}

export function fmtDZD(v: number | string | null | undefined): string {
  const num = toNum(v);
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Fiscal stamp ─────────────────────────────────────────────────────────────

export function calcFiscalStamp(ttc: number): number {
  if (ttc < 30_000) return 0;
  return Math.min(Math.ceil(ttc * 0.01), 2_500);
}

// ─── Line calculations ────────────────────────────────────────────────────────

export interface LineCalcResult {
  /** الكمية بالوحدات الأساسية = quantity × _packQty */
  baseQty:      number;
  /** إجمالي قبل الخصم = unit_price_ht × baseQty */
  gross:        number;
  /** مبلغ الخصم الإجمالي */
  discountAmt:  number;
  /** نسبة الخصم الفعلية */
  discPct:      number;
  /** HT بعد الخصم */
  ht:           number;
  /** مبلغ TVA */
  tva:          number;
  /** TTC = ht + tva */
  ttc:          number;
  /** خصم الوحدة الأساسية الواحدة = unit_price_ht × discPct/100 */
  unitDiscount: number;
}

/**
 * حساب إجماليات سطر واحد.
 *
 * القاعدة الأساسية:
 *   baseQty  = quantity × _packQty
 *   gross    = unit_price_ht × baseQty
 *   discount = gross × discPct/100  (أو fixed × quantity لكل العبوات)
 *   ht       = gross - discount
 *   tva      = ht × tvaRate/100
 *   ttc      = ht + tva
 */
export function calcLineTotal(line: LineItem): LineCalcResult {
  const packQty = line._packQty > 1 ? line._packQty : 1;
  const baseQty = Math.round(line.quantity * packQty * 1_000_000) / 1_000_000;

  // الإجمالي قبل الخصم — دائماً unit_price_ht × الكميات الأساسية
  const gross = Math.round(line.unit_price_ht * baseQty * 10_000) / 10_000;

  let discountAmt: number;
  let discPct:     number;

  if (line.discount_mode === 'percent') {
    discPct     = line.discount_percentage;
    discountAmt = Math.round(gross * (discPct / 100) * 10_000) / 10_000;
  } else {
    // fixed: discount_amount_fixed = خصم العبوة الواحدة
    // إجمالي الخصم = discount_amount_fixed × عدد العبوات
    const totalFixedDiscount = Math.round(line.discount_amount_fixed * line.quantity * 10_000) / 10_000;
    discountAmt = Math.min(totalFixedDiscount, gross);
    discPct     = gross > 0 ? (discountAmt / gross) * 100 : 0;
  }

  const ht  = Math.round((gross - discountAmt) * 10_000) / 10_000;
  const tva = Math.round(ht * (line.tva_rate / 100) * 10_000) / 10_000;
  const ttc = Math.round((ht + tva) * 10_000) / 10_000;

  // خصم الوحدة الواحدة للإرسال للباكاند
  const unitDiscount = Math.round(line.unit_price_ht * (discPct / 100) * 10_000) / 10_000;

  return { baseQty, gross, discountAmt, discPct, ht, tva, ttc, unitDiscount };
}

export function calcTotals(
  lines:      LineItem[],
  applyStamp: boolean,
  payments:   Array<{ amount: string }>,
): DocumentTotals {
  let gross = 0, ht = 0, tva = 0, discount = 0;

  for (const line of lines) {
    const t = calcLineTotal(line);
    gross    += t.gross;
    ht       += t.ht;
    tva      += t.tva;
    discount += t.discountAmt;
  }

  // تقريب نهائي
  gross    = Math.round(gross    * 100) / 100;
  ht       = Math.round(ht       * 100) / 100;
  tva      = Math.round(tva      * 100) / 100;
  discount = Math.round(discount * 100) / 100;

  const ttc      = Math.round((ht + tva) * 100) / 100;
  const stamp    = applyStamp ? calcFiscalStamp(ttc) : 0;
  const netToPay = Math.round((ttc + stamp) * 100) / 100;
  const totalPaid = payments.reduce((acc, p) => acc + toNum(p.amount), 0);

  return { gross, ht, tva, ttc, discount, stamp, netToPay, totalPaid, remaining: netToPay - totalPaid };
}

// ─── Price resolution ─────────────────────────────────────────────────────────

function resolveProductPrice(product: Product, entry: ProductPrice): number {
  const cost = toNum(product.purchase_price_ht ?? product.current_cost_price ?? 0);
  const val  = entry.price ?? entry.rate ?? entry.margin ?? null;
  if (val === null) return 0;
  if (entry.pricing_method === 'fixed')  return val;
  if (entry.pricing_method === 'rate')   return cost * (1 + val / 100);
  if (entry.pricing_method === 'margin') return cost + val;
  return cost;
}

export function resolvePrice(
  product:      Product,
  priceLevelId: number | null,
  isPurchase:   boolean,
): number {
  if (isPurchase) {
    return toNum(product.purchase_price_ht ?? product.current_cost_price) || 0;
  }

  if (priceLevelId) {
    const entry = (product.prices ?? []).find(
      (p) => p.price_level_id === priceLevelId && p.active,
    );
    if (entry) {
      const v = resolveProductPrice(product, entry);
      if (v > 0) return v;
    }
  }

  const defaultPrice = toNum(product.default_selling_price_ht);
  if (defaultPrice > 0) return defaultPrice;

  const costPrice = toNum(product.purchase_price_ht ?? product.current_cost_price);
  if (costPrice > 0) return Math.round(costPrice * 1.3 * 100) / 100;

  return 0;
}

export function resolveQuantityDiscount(
  product:      Product,
  baseQty:      number,
  priceLevelId: number | null,
): { percentage: number; fixed: number } {
  // baseQty = الكميات الأساسية (بعد ضرب عدد العبوات)
  const matches = (product.quantityDiscounts ?? []).filter((d) => {
    if (!d.active)                                              return false;
    if (priceLevelId && d.price_level_id !== priceLevelId)     return false;
    if (baseQty < d.min_qty)                                    return false;
    if (d.max_qty != null && baseQty > d.max_qty)               return false;
    return true;
  });

  if (matches.length === 0) return { percentage: 0, fixed: 0 };

  const best = matches[matches.length - 1];
  return {
    percentage: toNum(best.discount_percentage),
    fixed:      toNum(best.discount_amount),
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

export function getProductStock(
  product:   Product,
  stockData: Record<number, number>,
): number {
  if (!product.manages_stock) return Infinity;
  const realtime = stockData[product.id];
  if (realtime !== undefined) return toNum(realtime);
  if (product.stock_quantity != null) return toNum(product.stock_quantity);
  return (product.lots ?? []).reduce((acc, l) => acc + (l.remaining_quantity ?? 0), 0);
}

export type LineStockValidation =
  | { ok: true }
  | { ok: false; blocking: true;  message: string }
  | { ok: false; blocking: false; message: string };

/**
 * التحقق من المخزون.
 * stockData يحتوي على الكميات بالوحدات الأساسية.
 * يجب مقارنتها بـ baseQty (= quantity × _packQty).
 */
export function validateLineStock(
  line:       LineItem,
  product:    Product,
  isPurchase: boolean,
  stockData:  Record<number, number>,
): LineStockValidation {
  if (isPurchase || !product.manages_stock) return { ok: true };

  const stock   = getProductStock(product, stockData);
  const baseQty = Math.round(line.quantity * (line._packQty > 1 ? line._packQty : 1) * 1000) / 1000;

  if (baseQty <= stock) return { ok: true };

  const packLabel = line._packQty > 1
    ? `${line.quantity} عبوة (${baseQty} وحدة)`
    : `${baseQty} وحدة`;

  if (!product.allow_negative_stock) {
    return {
      ok: false,
      blocking: false,
      message: `تنبيه: الكمية المطلوبة (${packLabel}) — المتاح (${stock} وحدة)`,
    };
  }

  return {
    ok: false,
    blocking: false,
    message: `تنبيه: البيع سيجعل المخزون سالباً (${Math.round((stock - baseQty) * 1000) / 1000} وحدة)`,
  };
}
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

