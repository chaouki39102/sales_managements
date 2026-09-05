import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiPost, apiPut, apiGet, apiDelete } from '@/lib/api/core/client';
import { invalidateStockQueries } from '@/lib/api/core/queryClient';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { settingsApi } from '@/lib/api/endpoints/settings';
import { partiesApi } from '@/lib/api/endpoints/parties';
import { useMyPermissions } from '@/lib/api/endpoints/roles';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import { buildLineFromApi, type BulkLineInput } from './useDocumentForm';
import type { DocumentType } from '@/lib/api/core/types';
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
import { resolveTemplateById } from '@/pages/settings/print-settings/runtime/TemplateResolver';
import { isOfflineQueuedResponse } from '@/lib/offline/queueMath';

import { useDocumentLookups }  from './useDocumentLookups';
import { useDocumentForm }     from './useDocumentForm';
import type { PartyQuickCreatePayload } from '../CommercialDocumentModal/DocumentInfoSection';
import type { PartyChangeResult } from './useDocumentForm';
import { useDocumentChain, useConvertDocument } from './useDocumentChain';
import { useCreditCheck }      from './useCreditCheck';
import { useCustomerInsights } from './useCustomerInsights';
import { useProductSuggestions } from './useProductSuggestions';
import { useAdvancePayments } from './useAdvancePayments';
import {
  PURCHASE_CODES, CONVERSION_MAP,
} from '../types/document.types';
import type { ColKey } from '../types/document.types';
import {
  fmtDZD, loadVisibleCols, saveVisibleCols,
  toNum,
} from '../utils/document.utils';

interface UseCommercialDocumentControllerOptions {
  documentType:       DocumentType | null;
  existingDocument?:  Record<string, unknown>;
  onClose:            () => void;
  onSaved:            () => void;
  active:             boolean;
}

export function useCommercialDocumentController({
  documentType,
  existingDocument,
  onClose: _onClose,
  onSaved,
  active,
}: UseCommercialDocumentControllerOptions) {

  const slug           = useActiveSlug();
  const qc             = useQueryClient();
  const navigate       = useNavigate();
  const { selectedYear } = useFiscalYear() as { selectedYear?: { id: number; name: string } };

  const docCode    = documentType?.code ?? '';
  const isPurchase = PURCHASE_CODES.has(docCode);
  const isEdit     = !!existingDocument;

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

  // ─── صلاحية إظهار التكلفة والهامش (view_cost_price) ─────────────────────
  const { data: myPermissions } = useMyPermissions();
  const canViewCost = !!myPermissions?.includes('view_cost_price');
  const effectiveVisibleCols = useMemo(() => {
    if (canViewCost) return visibleCols;
    const next = new Set(visibleCols);
    next.delete('cost');
    next.delete('margin');
    return next;
  }, [visibleCols, canViewCost]);

  // ─── صلاحية تعديل الأسعار/الخصومات (change_price/apply_discount) ───────
  // Company switch off (lock_prices_for_cashiers = false) → price/discount fields
  // stay editable here; the backend still 403s any save that RAISES a value for a
  // user lacking the perm. Switch on → lock the fields per permission.
  const lockPrices = !!settingsDict?.lock_prices_for_cashiers?.value;
  const canEditPrice     = !lockPrices || !!myPermissions?.includes('change_price_commercial_document');
  const canApplyDiscount = !lockPrices || !!myPermissions?.includes('apply_discount_commercial_document');

  // ─── صلاحية تجاوز المخزون (override_stock_commercial_document) ──────────
  // تُظهر تحذير «مخزون غير كافٍ» وزر «تجاوز المخزون» للمدير/المالك فقط.
  // (التجاوز الفعلي يتم تلقائياً في الباكند — الصلاحية تتحقق من ability،
  //  الزر هنا إقرار بصري مُزيل للتحذير من السطر.)
  const canOverrideStock = !!myPermissions?.includes('override_stock_commercial_document');

  const [nextAction, setNextAction] = useState<'list' | 'new' | 'close'>('list');

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
    open: active,
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

  const settingsPriceLevelId = useMemo(() => {
    const v = settingsDict?.default_price_level_id?.value;
    if (v !== null && v !== undefined && v !== '' && Number(v) > 0) {
      return String(Number(v));
    }
    const defaultPl = (lookups.priceLevels as any[])?.find((pl: any) => pl.is_default);
    if (defaultPl) return String(defaultPl.id);
    const firstPl = (lookups.priceLevels as any[])?.[0];
    if (firstPl) return String(firstPl.id);
    return '';
  }, [settingsDict, lookups.priceLevels]);

  const fiscalStampEnabled = useMemo(() => {
    const v = settingsDict?.fiscal_stamp_enabled?.value;
    return v === undefined || v === true || v === 'true' || v === 1 || v === '1';
  }, [settingsDict]);

  const lookupsReady = isEdit
    ? true
    : (settingsWarehouseId !== '' && settingsCurrencyId !== '' && settingsPriceLevelId !== '');

  // ─── Form ─────────────────────────────────────────────────────────────────

  const {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, addLineWithProduct, removeLine, duplicateLine, moveLine, updateLine,
    paymentMode: pmMode,
    payments,
    bulkAddLines,
    addPayment, addPaymentWithValues, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    updateStockData,
    needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg,
    clearPriceLevelSwitchMsg,
    resetToNew,
  } = useDocumentForm({
    documentType,
    existingDocument,
    defaultTvaRate:     lookups.defaultTvaRate,
    defaultWarehouseId: settingsWarehouseId,
    baseCurrencyId:     settingsCurrencyId,
    defaultPriceLevelId: settingsPriceLevelId,
    stampEnabled:        fiscalStampEnabled,
    selectedYearId:     selectedYear?.id ? String(selectedYear.id) : '',
    paymentModes:       lookups.paymentModes,
    parties:            lookups.parties,
    products:           lookups.products,
    stockData:          {},
    isPurchase,
    open: active,
    priceLevels:        lookups.priceLevels as Array<{ id: number; name: string }>,
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
  const { data: stockData = {}, refetch: refetchStock } = useQuery<Record<number, number>>({
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
  }, [isEdit, existingDocument?.document_number, active]);

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

  // ─── Document chain ───────────────────────────────────────────────────────
  const { data: chain, isLoading: isLoadingChain } = useDocumentChain(
    isEdit ? Number(existingDocument?.id) : null,
  );
  const convertMutation = useConvertDocument();

  const { data: docTypes = [] } = useQuery({
    queryKey: [slug, 'document-types'],
    queryFn:  () => apiGet<DocumentType[]>('/document-types', { per_page: 500 }),
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
    amount:     totals.netToPay!,
    date:       form.document_date,
    isPurchase,
    enabled:    active && needsParty && !isPurchase,
  });

  const { data: customerInsights, isLoading: isLoadingInsights } = useCustomerInsights(
    form.party_id ? parseInt(form.party_id) : null,
    !!active && needsParty && !!form.party_id,
  );

  const { data: productSuggestions, isLoading: isLoadingSuggestions } = useProductSuggestions(
    form.party_id ? parseInt(form.party_id) : null,
    isPurchase,
    !!active && needsParty && !!form.party_id && !isLinesReadOnly,
  );

  const { data: advancePayments, isLoading: isLoadingAdvances } = useAdvancePayments(
    form.party_id ? parseInt(form.party_id) : null,
    !!active && needsParty && !!form.party_id && (documentType?.affects_accounting ?? false),
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

  // ─── Quick-create a party (Task 9) ────────────────────────────────────────
  const [creatingParty, setCreatingParty] = useState(false);
  const handleQuickCreateParty = useCallback(async (payload: PartyQuickCreatePayload) => {
    if (!slug) return;
    setCreatingParty(true);
    try {
      const saved = await partiesApi.create({
        name:            payload.name,
        phone:           payload.phone,
        nif:             payload.nif,
        party_type_id:   payload.party_type_id,
      });
      // تحديث قائمة الأطراف في محرر المستندات ثم تحديد المتعامل الجديد.
      qc.invalidateQueries({ queryKey: [slug, 'modal-parties'], refetchType: 'active' });
      setPartyChangeWarning(null);
      handlePartyChangeWithWarning(String(saved.id));
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'تعذر إنشاء المتعامل';
      setApiErr(msg);
    } finally {
      setCreatingParty(false);
    }
  }, [slug, qc, handlePartyChangeWithWarning, setApiErr]);

  // ─── Success state ────────────────────────────────────────────────────────

  const [successMsg, setSuccessMsg] = useState('');
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current); }, []);

  // ─── Template-based printing ──────────────────────────────────────────────

  const companyInfo = mapCompany(useActiveCompany());

  const { data: printTemplates = [] } = usePrintTemplatesList(docCode as any);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const selectedTemplate = useMemo(() => {
    if (selectedTemplateId) return resolveTemplateById(printTemplates, selectedTemplateId);
    return printTemplates[0] || null;
  }, [selectedTemplateId, printTemplates]);

  const [printModalOpen, setPrintModalOpen] = useState(false);

  const handlePrint = useCallback(() => {
    if (!existingDocument || !companyInfo) return;
    setPrintModalOpen(true);
  }, [existingDocument, companyInfo]);

  // ─── Delete confirmation ────────────────────────────────────────────────
  const deleteConfirm = useConfirm();

  // تنظيف حالة الـ sub-modals عند الإغلاق — منع الوميض
  useEffect(() => {
    if (!active) {
      setShowReturnModal(false);
      setShowBulkImport(false);
    }
  }, [active]);

  // ── Auto-dismiss price level switch notification ──────────────────────────
  useEffect(() => {
    if (!priceLevelSwitchMsg) return;
    const t = setTimeout(clearPriceLevelSwitchMsg, 6000);
    return () => clearTimeout(t);
  }, [priceLevelSwitchMsg, clearPriceLevelSwitchMsg]);

  // ─── Smart Memory — حفظ مسودة تلقائي ──────────────────────────────────────
  const draftKey = `doc-draft-${slug ?? 'default'}-${documentType?.code ?? 'new'}`;
  /** آخر لحظة كُتبت فيها المسودة إلى التخزين المحلي (مؤشر مرئي). */
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [draftRevision, setDraftRevision] = useState(0);

  const writeDraft = useCallback(() => {
    if (!form.lines.length) return;
    try {
      const draft = { ...form, _savedAt: Date.now() };
      localStorage.setItem(draftKey, btoa(unescape(encodeURIComponent(JSON.stringify(draft)))));
      setDraftSavedAt(Date.now());
      setDraftRevision((r) => r + 1);
    } catch { /* localStorage full */ }
  }, [form, draftKey]);

  const discardDraft = useCallback(() => {
    try { localStorage.removeItem(draftKey); } catch {}
    setDraftSavedAt(null);
    setDraftRevision(0);
  }, [draftKey]);

  useEffect(() => {
    // التعديل لا يكتب مسودة: draftKey مشترك بين «جديد» و«تعديل»، وكتابة
    // المسودة أثناء تعديل مستند قائم تُتلف مسودة مستند جديد معلّق بنفس النوع.
    if (!active || isEdit || !form.lines.length) return;
    const interval = setInterval(writeDraft, 30_000);
    return () => clearInterval(interval);
  }, [active, form, draftKey, isEdit, writeDraft]);

  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const draft = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (!draft.lines?.length) return null;
      const elapsed = Date.now() - (draft._savedAt ?? 0);
      if (elapsed > 86_400_000) { localStorage.removeItem(draftKey); return null; }
      return draft;
    } catch { return null; }
  }, [draftKey]);

  const readDraftSavedAt = useCallback((): number | null => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const draft = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (!draft.lines?.length) return null;
      const saved = Number(draft._savedAt ?? 0);
      if (!saved || Date.now() - saved > 86_400_000) return null;
      return saved;
    } catch { return null; }
  }, [draftKey]);

  // إعادة قراءة تاريخ المسودة عند التغيير (حفظ/تجاهل) وعند بدء الجلسة.
  useEffect(() => {
    if (!active || isEdit) return;
    setDraftSavedAt(readDraftSavedAt());
  }, [active, isEdit, draftKey, draftRevision, readDraftSavedAt]);

  const savedDraft = !isEdit && active && !form.lines.length ? restoreDraft() : null;

  // ─── Mutations ────────────────────────────────────────────────────────────

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = buildPayload();

      const url = isEdit ? `/documents/${existingDocument!.id}` : '/documents';
      if (isEdit && docNumber) {
        (payload as Record<string, unknown>).document_number = docNumber;
      }
      return isEdit
        ? apiPut<Record<string, unknown>>(url, payload)
        : apiPost<Record<string, unknown>>(url, payload);
    },
    onSuccess: async (savedDoc) => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        qc.invalidateQueries({ queryKey: tenantKeys.parties.all(slug) });
        qc.invalidateQueries({ queryKey: tenantKeys.partyBalances.all(slug) });
        if (affectsStock) {
          await invalidateStockQueries(qc, slug);
        }
        if (form.party_id) {
          qc.invalidateQueries({ queryKey: [slug, 'party-balance', parseInt(form.party_id)] });
        }
      }
      const docNum = String((savedDoc as Record<string, unknown>)?.document_number ?? '');
      const queued = isOfflineQueuedResponse(savedDoc);
      if (!isEdit) discardDraft();
      setSuccessMsg(
        queued
          ? isEdit
            ? 'تمت إضافة التعديل إلى قائمة الانتظار — سيُحفظ عند توفر الاتصال'
            : `تمت إضافة المستند إلى قائمة الانتظار — سيُحفظ عند توفر الاتصال (${docNum})`
          : isEdit
            ? `تم تحديث المستند ${docNum}`
            : `تم إنشاء المستند ${docNum} ✓`,
      );
      navigator.clipboard?.writeText(docNum).catch(() => {});
      successTimer.current = setTimeout(() => {
        setSuccessMsg('');
        const action = nextAction;
        setNextAction('list');
        if (action === 'new') {
          resetToNew();
        } else if (action === 'close') {
          _onClose();
        } else {
          onSaved();
        }
      }, 3000);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      const errMsg = err?.message ?? 'حدث خطأ أثناء الحفظ';
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
    onSuccess: async () => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        await invalidateStockQueries(qc, slug);
      }
      setSuccessMsg('تم حذف المستند بنجاح');
      successTimer.current = setTimeout(() => {
        setSuccessMsg(''); onSaved();
      }, 1500);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      setApiErr(String(err?.message ?? 'لا يمكن حذف هذا المستند — استخدم الإلغاء بدلاً من الحذف'));
    },
  });

  const handleSave = async () => {
    setApiErr('');
    if (isReadOnly) return;
    if (isEdit && !docNumber.trim()) {
      setDocNumberErr('رقم المستند إلزامي'); return;
    }
    if (docNumberErr) { setApiErr('رجاء التحقق من رقم المستند'); return; }
    if (selectedParty && selectedParty.allow_credit_sale === false) {
      const totalPaid = payments.reduce((acc, p) => acc + toNum(p.amount), 0);
      if (totalPaid + 0.01 < (totals.netToPay ?? 0)) {
        setApiErr(`التعامل «${selectedParty.name}» لا يُسمح له بالبيع بالدين — يجب دفع المبلغ كاملاً (${fmtDZD(totals.netToPay ?? 0)} دج)`);
        return;
      }
    }
    if (creditCheck?.will_exceed) {
      if (!creditCheck.can_proceed) {
        setApiErr('تجاوز حد الائتمان — يتطلب موافقة المدير');
        return;
      }
      if (!await deleteConfirm.confirm(`تجاوز حد الائتمان بـ ${fmtDZD(creditCheck.exceed_by)} دج — هل تريد المتابعة؟`)) return;
    }
    if (validate()) saveMut.mutate();
  };

  const requestSaveAction = (action: 'list' | 'new' | 'close') => {
    setNextAction(action);
    handleSave();
  };

  const handleDelete = async () => {
    if (!await deleteConfirm.confirm('هل تريد حذف هذا المستند؟', { title: 'تأكيد الحذف', confirmText: 'حذف' })) return;
    deleteMut.mutate();
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

  const isPending = saveMut.isPending || deleteMut.isPending || checkingDocNumber;

  // ─── Memos ────────────────────────────────────────────────────────────────

  const isPartyExempt = lookups.parties.find(
    (p) => String(p.id) === form.party_id,
  )?.is_tva_exempt ?? false;

  const partyOptions = useMemo(() =>
    lookups.parties.map((p) => ({
      id:    p.id,
      label: p.name,
      sub:   [(p as unknown as Record<string, unknown>).code, (p as unknown as Record<string, unknown>).phone].filter(Boolean).join(' · '),
      badge: (p as unknown as Record<string, unknown>).is_tva_exempt ? 'معفى' : ((p as unknown as Record<string, unknown>).price_level as Record<string, unknown>)?.name as string,
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

  const paymentsExceedWarning = useMemo(() => {
    const allPaid = payments.reduce((acc, p) => acc + toNum(p.amount), 0);
    if (allPaid > (totals.netToPay ?? 0) + 0.01 && (totals.netToPay ?? 0) > 0) {
      return `مجموع الدفعات (${fmtDZD(allPaid)} دج) يتجاوز المبلغ المستحق (${fmtDZD(totals.netToPay ?? 0)} دج)`;
    }
    return null;
  }, [payments, totals.netToPay]);

  const balanceWarning = useMemo(() => {
    if (!partyBalance || partyBalance.current_balance <= 0) return null;
    if (partyBalance.balance_type !== 'debit') return null;
    if ((totals.netToPay ?? 0) <= 0) return null;
    if (partyBalance.current_balance > (totals.netToPay ?? 0) * 2) {
      return `رصيد ${selectedParty?.name ?? 'المتعامل'} المتراكم (${fmtDZD(partyBalance.current_balance)} دج) كبير — تأكد من تسوية الحسابات`;
    }
    return null;
  }, [partyBalance, totals.netToPay, selectedParty]);

  // ─── ملء من آخر فاتورة (Task 14) ──────────────────────────────────────────

  const [fillLastLoading, setFillLastLoading] = useState(false);
  const notify = useNotification();

  const fillFromLastDoc = useCallback(async (partyId?: string) => {
    const pid = String(partyId ?? form.party_id ?? '').trim();
    if (!pid) {
      notify.error('اختر المتعامل أولاً قبل ملء الأسطر من آخر فاتورة');
      return;
    }
    if (isLinesReadOnly || isReadOnly) {
      notify.error('لا يمكن تعديل أسطر هذا المستند');
      return;
    }
    if (!slug) {
      notify.error('لا تتوفر شركة نشطة');
      return;
    }
    setFillLastLoading(true);
    try {
      const doc = await apiGet<any>('/documents/last-for-party', {
        party_id:       pid,
        doc_type_code:  docCode || 'FV',
        fiscal_year_id: selectedYear?.id,
      });
      if (!doc) {
        notify.info('لا توجد فاتورة سابقة لهذا المتعامل');
        return;
      }
      const lines: BulkLineInput[] = (doc.lines ?? []).map((l: any) => {
        const line = buildLineFromApi(l, lookups.defaultTvaRate ?? 0, lookups.products);
        const out: BulkLineInput = {
          product_id:     line.product_id || undefined,
          description:    line.description || undefined,
          unit_price_ht:  line.unit_price_ht,
          quantity:       line.quantity,
          tva_rate:       line.tva_rate,
          line_note:      line.line_note || undefined,
        };
        if (line.packaging_id && line._packQty && line._packQty > 1) {
          out.packaging_id = line.packaging_id;
          out.packQty      = line._packQty;
        }
        return out;
      });
      if (lines.length === 0) {
        notify.info('لا توجد أسطر في آخر فاتورة لهذا المتعامل');
        return;
      }
      bulkAddLines(lines);
      notify.success(`أُضيف ${lines.length} سطراً من آخر فاتورة (${doc.document_number || ''})`);
    } catch (e: any) {
      notify.error(e?.message ?? 'تعذر جلب آخر فاتورة لهذا المتعامل');
    } finally {
      setFillLastLoading(false);
    }
  }, [form.party_id, isLinesReadOnly, isReadOnly, slug, docCode, selectedYear?.id,
      lookups.defaultTvaRate, lookups.products, bulkAddLines, notify]);

  return {
    // Basic
    slug, qc, navigate, docCode, isPurchase, isEdit,
    selectedYear,

    // Settings
    settingsDict,

    // Columns & line mode
    visibleCols: effectiveVisibleCols, canViewCost, lineMode, handleColsChange, setLineMode,
    canEditPrice, canApplyDiscount, canOverrideStock,

    // Lookups
    lookups,
    lookupsReady,
    partyTypes: lookups.partyTypes,
    creatingParty,
    handleQuickCreateParty,

    // Form
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, addLineWithProduct, removeLine, duplicateLine, moveLine, updateLine,
    pmMode, payments,
    bulkAddLines, addPayment, addPaymentWithValues, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    updateStockData, needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg, clearPriceLevelSwitchMsg,

    // Document status
    docStatusName, isLocked, isCancelled, isValidated,

    // Stock
    stockData, warehouseIdNum, refetchStock,

    // Document number
    docNumber, docNumberErr, checkingDocNumber, handleDocNumberChange,

    // Party change warning
    partyChangeWarning, setPartyChangeWarning,

    // Modals
    showReturnModal, setShowReturnModal,
    showBulkImport, setShowBulkImport,

    // Document chain
    chain, isLoadingChain, convertMutation, allowedTargets,
    docTypes,

    // Credit check
    creditCheck,
    isLoadingCredit,

    // Customer insights
    customerInsights,
    isLoadingInsights,

    // Product suggestions
    productSuggestions,
    isLoadingSuggestions,

    // Advance payments
    advancePayments,
    isLoadingAdvances,

    // Success
    successMsg, setSuccessMsg,

    // Print
    companyInfo, printTemplates,
    selectedTemplateId, setSelectedTemplateId, selectedTemplate,
    printModalOpen, setPrintModalOpen, handlePrint,

    // Delete
    deleteConfirm,
    deleteMut,

    // Actions
    handleSave, handleDelete, handleExport, handlePartyChangeWithWarning,
    fillFromLastDoc, fillLastLoading,
    requestSaveAction, nextAction, setNextAction,
    resetToNew,

    // State
    isPending,

    // Memos
    isPartyExempt, partyOptions, priceLevelOptions,
    paymentModeOptions, treasuryAccountMap, selectedParty,
    stockBadge, paymentsExceedWarning, balanceWarning,

    // Draft
    savedDraft, draftKey, restoreDraft,
    draftSavedAt, discardDraft, saveDraftNow: writeDraft,
  };
}

export type UseCommercialDocumentControllerReturn = ReturnType<typeof useCommercialDocumentController>;
