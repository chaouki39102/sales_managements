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
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiPost, apiPut, apiGet, apiDelete } from '@/lib/api/core/client';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import { settingsApi } from '@/lib/api/endpoints/settings';
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
import { BarcodeInput } from './components/BarcodeInput';
import { LineCard } from './components/LineCard';
import { BulkImportModal } from './components/BulkImportModal';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
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
  const navigate       = useNavigate();
  const { selectedYear } = useFiscalYear() as { selectedYear?: { id: number; name: string } };

  const docCode    = documentType?.code ?? '';
  const isPurchase = PURCHASE_CODES.has(docCode);
  const isEdit     = !!existingDocument;

  // ─── Column visibility ────────────────────────────────────────────────────

  // ─── Settings defaults ───────────────────────────────────────────────────
  const { data: settingsDict } = useQuery({
    queryKey: [slug, 'settings-dict'],
    queryFn: () => settingsApi.list(),
    enabled: !!slug,
    staleTime: 10 * 60_000,
  });

  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    () => loadVisibleCols(slug ?? 'default'),
  );
  const handleColsChange = (cols: Set<ColKey>) => {
    setVisibleCols(cols);
    saveVisibleCols(slug ?? 'default', cols);
  };

  const [lineMode, setLineMode] = useState<'table' | 'card'>('table');

  // تطبيق الإعدادات الافتراضية من Settings عند تحميلها
  const initialDefaultsApplied = useRef(false);
  useEffect(() => {
    if (!settingsDict || initialDefaultsApplied.current) return;
    initialDefaultsApplied.current = true;

    const storedCols = (() => {
      try { return localStorage.getItem(`doc_visible_cols_${slug ?? 'default'}`); } catch {}
      return null;
    })();
    if (!storedCols) {
      const defaultCols = settingsDict.documents_default_visible_cols?.value as string[] | undefined;
      if (defaultCols?.length) {
        setVisibleCols(new Set(defaultCols as ColKey[]));
      }
    }

    const storedMode = (() => {
      try { return localStorage.getItem(`doc_line_mode_${slug ?? 'default'}`); } catch {}
      return null;
    })();
    if (!storedMode) {
      const defaultMode = settingsDict.documents_default_line_mode?.value as string | undefined;
      if (defaultMode === 'card' || defaultMode === 'table') {
        setLineMode(defaultMode);
      }
    }
  }, [settingsDict, slug]);

  // ─── Lookups ──────────────────────────────────────────────────────────────

  const lookups = useDocumentLookups({
    open,
    isPurchase,
    needsParty:  true,
    warehouseId:  null,
    fiscalYearId: selectedYear?.id ?? null,
  });

  // ── القيم الافتراضية من Settings (أولوية) مع الرجوع إلى اللوك أب ──────
  const settingsWarehouseId = useMemo(() => {
    const v = settingsDict?.default_warehouse_id?.value;
    if (v) {
      const found = lookups.warehouses.find((w: any) => w.id === Number(v));
      if (found) return String(found.id);
    }
    return lookups.defaultWarehouseId;
  }, [settingsDict, lookups.warehouses, lookups.defaultWarehouseId]);

  const settingsCurrencyId = useMemo(() => {
    const v = settingsDict?.default_currency_id?.value;
    if (v) {
      const found = lookups.currencies.find((c: any) => c.id === Number(v));
      if (found) return String(found.id);
    }
    return lookups.baseCurrencyId;
  }, [settingsDict, lookups.currencies, lookups.baseCurrencyId]);

  const settingsIsProforma = useMemo(() => {
    const v = settingsDict?.default_is_proforma?.value;
    return v === true || v === 'true';
  }, [settingsDict]);

  const settingsPriceLevelId = useMemo(() => {
    const v = settingsDict?.default_price_level_id?.value;
    return v ? String(v) : '';
  }, [settingsDict]);

  const settingsApplyStamp = useMemo(() => {
    const v = settingsDict?.default_apply_stamp?.value;
    return v === true || v === 'true';
  }, [settingsDict]);

  // ── جاهزية اللوك أب — لا نبني الـ form حتى تصل القيم الجوهرية ──────────
  // للمستند الجديد: ننتظر warehouse + currency (من settings أو lookups)
  // للمستند الموجود: يمكن البناء فوراً من existingDocument بدون انتظار
  const lookupsReady = isEdit
    ? true
    : (settingsWarehouseId !== '' && settingsCurrencyId !== '');

  // ─── Form ─────────────────────────────────────────────────────────────────

  const {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, addLineWithProduct, removeLine, duplicateLine, updateLine,
    paymentMode: pmMode,
    existingPayments,
    newPayments,
    addPayment, addPaymentWithValues, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    updateStockData,
    needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg,
    clearPriceLevelSwitchMsg,
  } = useDocumentForm({
    documentType,
    existingDocument,
    defaultTvaRate:     lookups.defaultTvaRate,
    defaultWarehouseId: settingsWarehouseId,
    baseCurrencyId:     settingsCurrencyId,
    defaultIsProforma:  settingsIsProforma,
    defaultPriceLevelId: settingsPriceLevelId,
    defaultApplyStamp:   settingsApplyStamp,
    selectedYearId:     selectedYear?.id ? String(selectedYear.id) : '',
    paymentModes:       lookups.paymentModes,
    parties:            lookups.parties,
    products:           lookups.products,
    stockData:          {},
    isPurchase,
    open,
    priceLevels:        lookups.priceLevels,
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
  const [showBulkImport, setShowBulkImport] = useState(false);
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

  // ─── Delete confirmation modal ────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Auto-dismiss price level switch notification ──────────────────────────
  useEffect(() => {
    if (!priceLevelSwitchMsg) return;
    const t = setTimeout(clearPriceLevelSwitchMsg, 6000);
    return () => clearTimeout(t);
  }, [priceLevelSwitchMsg, clearPriceLevelSwitchMsg]);

  // ─── Smart Memory — حفظ مسودة تلقائي ──────────────────────────────────────
  const draftKey = `doc-draft-${slug ?? 'default'}-${documentType?.code ?? 'new'}`;
  useEffect(() => {
    if (!open || !form.lines.length) return;
    const interval = setInterval(() => {
      try {
        const draft = { ...form, _savedAt: Date.now() };
        localStorage.setItem(draftKey, btoa(unescape(encodeURIComponent(JSON.stringify(draft)))));
      } catch { /* localStorage full */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, [open, form, draftKey]);

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const draft = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (!draft.lines?.length) return null;
      const elapsed = Date.now() - (draft._savedAt ?? 0);
      if (elapsed > 86_400_000) { localStorage.removeItem(draftKey); return null; }
      return draft;
    } catch { return null; }
  };

  const savedDraft = !isEdit && open && !form.lines.length ? restoreDraft() : null;

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
      navigator.clipboard?.writeText(docNum).catch(() => {});
      successTimer.current = setTimeout(() => {
        setSuccessMsg('');
        onSaved();
        onClose();
      }, 3000);
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
    // فحص حد الائتمان
    if (creditCheck?.will_exceed) {
      if (!creditCheck.can_proceed) {
        setApiErr('تجاوز حد الائتمان — يتطلب موافقة المدير');
        return;
      }
      if (!window.confirm(`تجاوز حد الائتمان بـ ${fmtDZD(creditCheck.exceed_by)} دج — هل تريد المتابعة؟`)) return;
    }
    if (validate()) saveMut.mutate();
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleExport = (format: 'excel' | 'pdf' | 'json' | 'xml') => {
    const formData = {
      documentNumber: docNumber,
      documentDate: form.document_date,
      dueDate: form.due_date,
      party: lookups.parties.find(p => String(p.id) === form.party_id)?.name ?? '',
      notes: form.notes,
      lines: form.lines.map((l, i) => ({
        line: i + 1,
        product: l.description || l._product?.name || '',
        quantity: l.quantity * (l._packQty || 1),
        unitPrice: l.unit_price_ht,
        total: l.quantity * (l._packQty || 1) * l.unit_price_ht,
        tva: l.tva_rate,
      })),
      totals: {
        ht: totals.ht,
        tva: totals.tva,
        ttc: totals.ttc,
        stamp: totals.stamp,
        netToPay: totals.netToPay,
      },
    };

    if (format === 'excel') {
      void import('exceljs').then((ExcelJS) => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Document');
        ws.addRow(['البيان', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'TVA']);
        formData.lines.forEach(l => ws.addRow([l.product, l.quantity, l.unitPrice, l.total, l.tva]));
        ws.addRow([]);
        ws.addRow(['Net HT', formData.totals.ht]);
        ws.addRow(['TVA', formData.totals.tva]);
        ws.addRow(['TTC', formData.totals.ttc]);
        wb.xlsx.writeBuffer().then(buf => {
          const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url;
          a.download = `${formData.documentNumber || 'document'}.xlsx`;
          a.click(); URL.revokeObjectURL(url);
        });
      });
    } else if (format === 'pdf') {
      window.print();
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${formData.documentNumber || 'document'}.json`;
      a.click(); URL.revokeObjectURL(url);
    } else if (format === 'xml') {
      const toXml = (obj: unknown, tag: string): string => {
        if (Array.isArray(obj)) return obj.map(v => toXml(v, tag)).join('\n');
        if (typeof obj === 'object' && obj !== null) {
          const children = Object.entries(obj as Record<string, unknown>)
            .map(([k, v]) => toXml(v, k)).join('\n');
          return `<${tag}>\n${children}\n</${tag}>`;
        }
        return `<${tag}>${String(obj)}</${tag}>`;
      };
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n${toXml(formData, 'data')}\n</document>`;
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${formData.documentNumber || 'document'}.xml`;
      a.click(); URL.revokeObjectURL(url);
    }
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

  // Skeleton — نعرضه ريثما تصل القيم الافتراضية (warehouse + currency)
  // لتجنب عرض الـ form مرتين: مرة بقيم فارغة ومرة بعد وصول اللوك أب
  if (!lookupsReady) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)',
        direction: 'rtl',
      }}>
        <div style={{
          width: '95vw', maxWidth: 1100, maxHeight: '93vh',
          background: 'var(--bg1)', borderRadius: 'var(--r3)',
          boxShadow: '0 24px 60px rgba(0,0,0,.3)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: 48,
        }}>
          <i className="ti ti-loader-2" style={{
            fontSize: 32, color: 'var(--em)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>
            {documentType?.name ?? 'جاري التحميل'}...
          </span>
        </div>
      </div>
    );
  }

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
          {priceLevelSwitchMsg && (
            <AlertBanner
              type="warning"
              message={`المنتج "${priceLevelSwitchMsg.productName}" ليس له سعر في فئة "${priceLevelSwitchMsg.from}"، تم التبديل إلى "${priceLevelSwitchMsg.to}".`}
            />
          )}
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
                navigate(`?document=${docId}`, { replace: true });
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
                  onChange={(e) => {
                    set('warehouse_id', e.target.value);
                    qc.invalidateQueries({ queryKey: [slug, 'warehouse-stock', warehouseIdNum] });
                  }}
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

            {!isLinesReadOnly && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <BarcodeInput
                  products={lookups.products}
                  onProductFound={(productId) => {
                    addLineWithProduct(String(productId));
                  }}
                  disabled={isLinesReadOnly}
                />
                <button
                  onClick={() => setLineMode((m) => {
                    const next = m === 'table' ? 'card' : 'table';
                    try { localStorage.setItem(`doc_line_mode_${slug ?? 'default'}`, next); } catch {}
                    return next;
                  })}
                  style={{
                    padding: '5px 10px', borderRadius: 'var(--r1)',
                    border: '1px solid var(--b3)', background: 'transparent',
                    color: 'var(--t3)', cursor: 'pointer', fontSize: 11,
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: 'inherit',
                  }}
                >
                  <i className={`ti ti-${lineMode === 'table' ? 'layout-cards' : 'table'}`} />
                  {lineMode === 'table' ? 'عرض البطاقات' : 'عرض الجدول'}
                </button>
              </div>
            )}

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
                  <div>
                    {savedDraft && (
                      <div style={{
                        padding: '10px 14px', marginBottom: 8, borderRadius: 'var(--r2)',
                        background: 'color-mix(in srgb, var(--blue) 8%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--blue) 20%, transparent)',
                        display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
                      }}>
                        <i className="ti ti-history" style={{ color: 'var(--blue)', fontSize: 16 }} />
                        <span style={{ flex: 1, color: 'var(--t2)' }}>
                          لديك مسودة محفوظة من قبل — هل تريد استعادتها؟
                        </span>
                        <button
                          onClick={() => {
                            const draft = restoreDraft();
                            if (draft) {
                              Object.keys(draft).forEach((k) => {
                                if (k !== '_savedAt' && k in form) {
                                  (set as (field: string, value: unknown) => void)(k, draft[k]);
                                }
                              });
                              localStorage.removeItem(draftKey);
                            }
                          }}
                          style={{
                            padding: '5px 12px', borderRadius: 'var(--r1)',
                            border: '1px solid var(--blue)', background: 'var(--emb)',
                            color: 'var(--blue)', cursor: 'pointer', fontSize: 11,
                            fontWeight: 700, fontFamily: 'inherit',
                          }}
                        >
                          استعادة
                        </button>
                        <button
                          onClick={() => localStorage.removeItem(draftKey)}
                          style={{
                            padding: '5px 10px', borderRadius: 'var(--r1)',
                            border: '1px solid var(--b3)', background: 'transparent',
                            color: 'var(--t3)', cursor: 'pointer', fontSize: 11,
                            fontFamily: 'inherit',
                          }}
                        >
                          تجاهل
                        </button>
                      </div>
                    )}
                    <div style={{
                      padding: 16, textAlign: 'center', color: 'var(--t4)',
                      fontSize: 12, background: 'var(--bg3)', borderRadius: 'var(--r2)',
                    }}>
                      {isLinesReadOnly ? 'لا أسطر — المستند فارغ' : 'لا أسطر بعد — اضغط "إضافة سطر" أدناه'}
                    </div>
                  </div>
                ) : lineMode === 'card' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.lines.map((line, idx) => {
                      const stockResult = line._product
                        ? validateLineStock(line, line._product, isPurchase, stockData)
                        : { ok: true as const };
                      return (
                        <LineCard
                          key={idx}
                          line={line}
                          idx={idx}
                          products={lookups.products}
                          isPurchase={isPurchase}
                          disabled={isLinesReadOnly}
                          stockData={stockData}
                          stockValidation={stockResult}
                          isTvaExempt={!isPurchase && isPartyExempt}
                          lineWarnings={lineWarnings.get(idx)}
                          warehouses={lookups.warehouses}
                          onUpdate={updateLine}
                          onRemove={removeLine}
                          onDuplicate={duplicateLine}
                        />
                      );
                    })}
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
                          const lineIdxWarnings = lineWarnings.get(idx);
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
                              lineWarnings={lineIdxWarnings}
                              warehouses={lookups.warehouses}
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
                      addLineWithProduct(String(productId), suggestedPrice ?? undefined, suggestedTva ?? undefined);
                    }}
                    disabled={isReadOnly}
                  />
                )}

                {!isLinesReadOnly && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button
                      onClick={addLine}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 'var(--r2)',
                        border: '1px dashed var(--b3)', background: 'transparent',
                        color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget).style.borderColor = 'var(--em)'; (e.currentTarget).style.color = 'var(--em)'; }}
                      onMouseLeave={(e) => { (e.currentTarget).style.borderColor = 'var(--b3)'; (e.currentTarget).style.color = 'var(--t3)'; }}
                    >
                      <i className="ti ti-plus" />
                      إضافة سطر
                    </button>
                    <button
                      onClick={() => setShowBulkImport(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 'var(--r2)',
                        border: '1px dashed var(--b3)', background: 'transparent',
                        color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget).style.borderColor = 'var(--purple)'; (e.currentTarget).style.color = 'var(--purple)'; }}
                      onMouseLeave={(e) => { (e.currentTarget).style.borderColor = 'var(--b3)'; (e.currentTarget).style.color = 'var(--t3)'; }}
                    >
                      <i className="ti ti-upload" />
                      استيراد من Excel
                    </button>
                  </div>
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
                addPaymentWithValues({
                  payment_mode_id: String(adv.payment_mode_id),
                  amount: String(adv.unapplied_amount),
                  reference: adv.reference ?? '',
                  payment_date: adv.payment_date,
                });
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

            {/* طباعة */}
            <button
              onClick={() => window.print()}
              style={{
                padding: '8px 14px', borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)', background: 'var(--bg1)',
                color: 'var(--t2)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <i className="ti ti-printer" />
              طباعة
            </button>

            {/* تصدير */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  const menu = document.getElementById('export-menu');
                  if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
                }}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--b2)', background: 'var(--bg1)',
                  color: 'var(--t2)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <i className="ti ti-download" />
                تصدير
                <i className="ti ti-chevron-down" style={{ fontSize: 11 }} />
              </button>
              <div id="export-menu" style={{
                display: 'none', position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                flexDirection: 'column', gap: 2,
                background: 'var(--bg1)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)',
                padding: 4, zIndex: 100, minWidth: 140,
              }}>
                {[
                  { label: 'Excel', icon: 'ti-file-spreadsheet', format: 'excel' },
                  { label: 'PDF', icon: 'ti-file-type-pdf', format: 'pdf' },
                  { label: 'JSON', icon: 'ti-file-code', format: 'json' },
                  { label: 'XML', icon: 'ti-file-code-2', format: 'xml' },
                ].map(opt => (
                  <button key={opt.format}
                    onClick={() => {
                      document.getElementById('export-menu')!.style.display = 'none';
                      handleExport(opt.format as 'excel' | 'pdf' | 'json' | 'xml');
                    }}
                    style={{
                      padding: '6px 12px', borderRadius: 'var(--r2)',
                      border: 'none', background: 'transparent',
                      color: 'var(--t2)', cursor: 'pointer',
                      fontSize: 12.5, fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--b1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <i className={`ti ${opt.icon}`} style={{ fontSize: 15 }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

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

      {/* Bulk import */}
      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        products={lookups.products}
        onImport={(importedLines) => {
          setForm((f) => ({
            ...f,
            lines: [
              ...f.lines,
              ...importedLines.map((line) => ({
                ...makeLine(defaultTvaRate),
                product_id: line.product_id ?? '',
                description: line.description ?? '',
                unit_price_ht: line.unit_price_ht ?? 0,
                quantity: line.quantity ?? 1,
                tva_rate: line.tva_rate ?? defaultTvaRate,
                line_note: line.line_note ?? '',
              })),
            ],
          }));
        }}
      />

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

      {/* تأكيد الحذف */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          deleteMut.mutate();
        }}
        loading={deleteMut.isPending}
        itemName={existingDocument?.document_number ? `#${existingDocument.document_number}` : undefined}
        warning="ملاحظة: الحذف غير مدعوم — استخدم الإلغاء."
      />
    </div>
  );
}
