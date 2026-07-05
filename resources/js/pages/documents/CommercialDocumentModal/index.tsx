import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiPost, apiPut, apiGet, apiDelete } from '@/lib/api/core/client';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { settingsApi } from '@/lib/api/endpoints/settings';
import { useFiscalYear } from '@/context/FiscalYearContext';
import type { DocumentType } from '@/lib/api/core/types';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
import { resolveTemplateById } from '@/pages/settings/print-settings/runtime/TemplateResolver';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';

const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));

import { useDocumentLookups }  from '../hooks/useDocumentLookups';
import { useDocumentForm }     from '../hooks/useDocumentForm';
import type { PartyChangeResult } from '../hooks/useDocumentForm';
import { useDocumentChain, useConvertDocument } from '../hooks/useDocumentChain';
import { useCreditCheck }      from '../hooks/useCreditCheck';
import { useCustomerInsights } from '../hooks/useCustomerInsights';
import { DocumentChainPanel }  from '../components/DocumentChainPanel';
import { ReturnDocumentModal } from '../components/ReturnDocumentModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { ShippingInfoSection } from '../components/ShippingInfoSection';
import { PaymentTermsTable }   from '../components/PaymentTermsTable';
import { useProductSuggestions } from '../hooks/useProductSuggestions';
import { useAdvancePayments } from '../hooks/useAdvancePayments';
import type { Tab } from '../components/DocumentUIPrimitives';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { AlertBanner } from '../components/DocumentUIPrimitives';
import {
  PURCHASE_CODES, CONVERSION_MAP, RETURNABLE_CODES, SHIPPING_CODES,
} from '../types/document.types';
import type { ColKey } from '../types/document.types';
import {
  fmtDZD, loadVisibleCols, saveVisibleCols,
  toNum,
} from '../utils/document.utils';

import DocumentHeaderSection from './DocumentHeaderSection';
import DocumentInfoSection from './DocumentInfoSection';
import DocumentLinesSection from './DocumentLinesSection';
import DocumentPaymentsSection from './DocumentPaymentsSection';
import DocumentTotalsSection from './DocumentTotalsSection';
import DocumentFooter from './DocumentFooter';

// ─── Props ─────────────────────────────────────────────────────────────────────

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

  const settingsApplyStamp = useMemo(() => {
    const v = settingsDict?.default_apply_stamp?.value;
    return v === true || v === 'true';
  }, [settingsDict]);

  const lookupsReady = isEdit
    ? true
    : (settingsWarehouseId !== '' && settingsCurrencyId !== '' && settingsPriceLevelId !== '');

  // ─── Form ─────────────────────────────────────────────────────────────────

  const {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, addLineWithProduct, removeLine, duplicateLine, updateLine,
    paymentMode: pmMode,
    existingPayments,
    newPayments,
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
  } = useDocumentForm({
    documentType,
    existingDocument,
    defaultTvaRate:     lookups.defaultTvaRate,
    defaultWarehouseId: settingsWarehouseId,
    baseCurrencyId:     settingsCurrencyId,
    defaultPriceLevelId: settingsPriceLevelId,
    defaultApplyStamp:   settingsApplyStamp,
    stampEnabled:        settingsApplyStamp,
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
    !!open && needsParty && !!form.party_id && (documentType?.affects_accounting ?? false),
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

  // ─── Template-based printing ──────────────────────────────────────────────

  const companyInfo = mapCompany(useActiveCompany());

  const { data: printTemplates = [] } = usePrintTemplatesList(docCode);
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

  // ─── Delete confirmation modal ────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // تنظيف حالة الـ sub-modals عند الإغلاق — منع الوميض
  useEffect(() => {
    if (!open) {
      setShowDeleteModal(false);
      setShowReturnModal(false);
      setShowBulkImport(false);
    }
  }, [open]);

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

      if (pmMode === 'additive' && isEdit) {
        const newPaymentsPayload = (payload.new_payments ?? []) as Array<Record<string, unknown>>;
        if (newPaymentsPayload.length === 0) {
          const basePayload = { ...payload };
          delete basePayload.new_payments;
          delete basePayload.lines;
          return apiPut<Record<string, unknown>>(`/documents/${existingDocument!.id}`, basePayload);
        }
        return apiPost<Record<string, unknown>>(
          `/documents/${existingDocument!.id}/payments`,
          { payments: newPaymentsPayload },
        );
      }

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

  const isPending = saveMut.isPending || deleteMut.isPending || checkingDocNumber;

  // ─── Memos ────────────────────────────────────────────────────────────────

  const isPartyExempt = lookups.parties.find(
    (p) => String(p.id) === form.party_id,
  )?.is_tva_exempt ?? false;

  const partyOptions = useMemo(() =>
    lookups.parties.map((p) => ({
      id:    p.id,
      label: p.name,
      sub:   [(p as Record<string, unknown>).code, (p as Record<string, unknown>).phone].filter(Boolean).join(' · '),
      badge: (p as Record<string, unknown>).is_tva_exempt ? 'معفى' : (p as Record<string, unknown>).price_level?.name,
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
    const allPaid = [...existingPayments, ...newPayments]
      .reduce((acc, p) => acc + toNum(p.amount), 0);
    if (allPaid > totals.netToPay + 0.01 && totals.netToPay > 0) {
      return `مجموع الدفعات (${fmtDZD(allPaid)} دج) يتجاوز المبلغ المستحق (${fmtDZD(totals.netToPay)} دج)`;
    }
    return null;
  }, [existingPayments, newPayments, totals.netToPay]);

  const balanceWarning = useMemo(() => {
    if (!partyBalance || partyBalance.current_balance <= 0) return null;
    if (partyBalance.balance_type !== 'debit') return null;
    if (totals.netToPay <= 0) return null;
    if (partyBalance.current_balance > totals.netToPay * 2) {
      return `رصيد ${selectedParty?.name ?? 'المتعامل'} المتراكم (${fmtDZD(partyBalance.current_balance)} دج) كبير — تأكد من تسوية الحسابات`;
    }
    return null;
  }, [partyBalance, totals.netToPay, selectedParty]);

  // ─── Guard ────────────────────────────────────────────────────────────────

  const modalContent = !lookupsReady ? (
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
  ) : (<>
      <div style={{
        width: '95vw', maxWidth: 1100, maxHeight: '93vh',
        display: 'flex', flexDirection: 'column',
        background: isCancelled ? 'var(--bg3)' : 'var(--bg1)',
        borderRadius: 'var(--r3)',
        boxShadow: '0 24px 60px rgba(0,0,0,.3)',
        overflow: 'hidden',
        opacity: isCancelled ? 0.8 : 1,
      }}>

        {/* ═══ HEADER ═══ */}
        <DocumentHeaderSection
          documentType={documentType}
          isEdit={isEdit}
          isCancelled={isCancelled}
          isLocked={isLocked}
          isValidated={isValidated}
          isPurchase={isPurchase}
          docCode={docCode}
          docNumber={docNumber}
          existingDocument={existingDocument}
          pmMode={pmMode}
          stockBadge={stockBadge}
          onClose={onClose}
          isPending={isPending}
        />

        {/* ═══ BODY ═══ */}
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

          {/* ═══ SECTION 1: معلومات المستند ═══ */}
          <DocumentInfoSection
            form={form as unknown as Record<string, unknown>}
            errors={errors}
            set={set}
            isEdit={isEdit}
            isReadOnly={isReadOnly}
            isLinesReadOnly={isLinesReadOnly}
            isPurchase={isPurchase}
            needsParty={needsParty}
            docCode={docCode}
            docNumber={docNumber}
            docNumberErr={docNumberErr}
            checkingDocNumber={checkingDocNumber}
            handleDocNumberChange={handleDocNumberChange}
            handlePartyChangeWithWarning={handlePartyChangeWithWarning}
            partyOptions={partyOptions}
            priceLevelOptions={priceLevelOptions}
            handlePriceLevelChange={handlePriceLevelChange}
            lookups={{
              warehouses: lookups.warehouses,
              fiscalYears: lookups.fiscalYears,
              currencies: lookups.currencies,
              priceLevels: lookups.priceLevels,
            }}
            partyBalance={partyBalance}
            isLoadingBalance={isLoadingBalance}
            selectedParty={selectedParty}
            creditCheck={creditCheck as Record<string, unknown> | null}
            isLoadingCredit={isLoadingCredit}
            customerInsights={customerInsights as Record<string, unknown> | null}
            isLoadingInsights={isLoadingInsights}
            balanceWarning={balanceWarning}
            qc={qc}
            slug={slug}
            warehouseIdNum={warehouseIdNum}
          />

          {/* ═══ EXTRA TABS: الشحن والتسليم + شروط الدفع ═══ */}
          {(() => {
            const extraTabs: Tab[] = [
              { key: 'payment-terms', label: 'شروط الدفع', icon: 'ti-coin' },
            ];
            if (SHIPPING_CODES.has(docCode)) {
              extraTabs.unshift({ key: 'shipping', label: 'الشحن والتسليم', icon: 'ti-truck-delivery' });
            }
            if (extraTabs.length === 1) {
              const tab = extraTabs[0];
              return (
                <div style={{ marginBottom: 20 }}>
                  {/* We use a simple section wrapper instead of Section component */}
                  <div style={{
                    padding: '0 0 14px', marginBottom: 18,
                    borderBottom: '1px solid var(--b1)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <i className={`ti ${tab.icon}`} style={{ fontSize: 14, color: 'var(--t3)' }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--t2)' }}>
                      {tab.label}
                    </span>
                  </div>
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
                </div>
              );
            }
            return (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex', gap: 4, marginBottom: 14,
                  borderBottom: '1px solid var(--b1)',
                }}>
                  {extraTabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setExtraTab(tab.key)}
                      style={{
                        padding: '6px 14px', borderRadius: 'var(--r1) var(--r1) 0 0',
                        border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: extraTab === tab.key ? 'var(--bg1)' : 'transparent',
                        color: extraTab === tab.key ? 'var(--em)' : 'var(--t3)',
                        borderBottom: extraTab === tab.key ? '2px solid var(--em)' : '2px solid transparent',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <i className={`ti ${tab.icon}`} style={{ fontSize: 13 }} />
                      {tab.label}
                    </button>
                  ))}
                </div>
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
              </div>
            );
          })()}

          {/* ═══ SECTION 2: الأسطر ═══ */}
          <DocumentLinesSection
            lines={form.lines}
            isLinesReadOnly={isLinesReadOnly}
            isReadOnly={isReadOnly}
            isPurchase={isPurchase}
            isPartyExempt={isPartyExempt}
            products={lookups.products}
            isLoadingProducts={lookups.isLoadingProducts}
            visibleCols={visibleCols}
            handleColsChange={handleColsChange}
            lineMode={lineMode}
            setLineMode={setLineMode}
            lineWarnings={lineWarnings}
            stockData={stockData}
            addLine={addLine}
            addLineWithProduct={addLineWithProduct}
            removeLine={removeLine}
            duplicateLine={duplicateLine}
            updateLine={updateLine}
            lineErr={lineErr}
            savedDraft={savedDraft}
            draftKey={draftKey}
            restoreDraft={restoreDraft}
            set={set}
            needsParty={needsParty}
            productSuggestions={productSuggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            setShowBulkImport={setShowBulkImport}
            slug={slug}
            affectsStock={affectsStock}
            stockDir={stockDir}
            warehouses={lookups.warehouses}
          />

          {/* ═══ SECTION 3: الدفعات ═══ */}
          <DocumentPaymentsSection
            existingPayments={existingPayments}
            newPayments={newPayments}
            paymentModes={lookups.paymentModes}
            paymentModeOptions={paymentModeOptions}
            treasuryAccountMap={treasuryAccountMap}
            treasuryAccounts={lookups.treasuryAccounts}
            addPayment={addPayment}
            addPaymentWithValues={addPaymentWithValues}
            removePayment={removePayment}
            updatePayment={updatePayment}
            paymentsExceedWarning={paymentsExceedWarning}
            advancePayments={advancePayments}
            isLoadingAdvances={isLoadingAdvances}
            pmMode={pmMode}
            totals={totals}
            affectsAccounting={documentType?.affects_accounting ?? false}
        />

          {/* ═══ SECTION 4: الإجماليات ═══ */}
          <DocumentTotalsSection
            totals={totals}
            existingPayments={existingPayments}
            newPayments={newPayments}
            partyBalance={partyBalance}
            form={form}
            selectedParty={selectedParty}
            isPurchase={isPurchase}
            isEdit={isEdit}
            isReadOnly={isReadOnly}
            set={set}
            stampEnabled={settingsApplyStamp}
          />
        </div>

        {/* ═══ FOOTER ═══ */}
        <DocumentFooter
          form={form}
          totals={totals}
          existingPayments={existingPayments}
          newPayments={newPayments}
          pmMode={pmMode}
          isEdit={isEdit}
          isReadOnly={isReadOnly}
          isCancelled={isCancelled}
          isPending={isPending}
          successMsg={successMsg}
          docCode={docCode}
          RETURNABLE_CODES={RETURNABLE_CODES}
          handleDelete={handleDelete}
          handleExport={handleExport}
          onClose={onClose}
          handleSave={handleSave}
          onPrint={isEdit ? handlePrint : undefined}
          templates={printTemplates}
          selectedTemplateId={selectedTemplateId}
          onTemplateChange={setSelectedTemplateId}
        />
      </div>
      {/* Bulk import */}
      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        products={lookups.products}
        onImport={(importedLines) => {
          bulkAddLines(importedLines);
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

      {/* طباعة حسب القالب */}
      {printModalOpen && existingDocument && companyInfo && (
        <Suspense fallback={null}>
          <TemplatePrintModal
            open={printModalOpen}
            onClose={() => setPrintModalOpen(false)}
            document={existingDocument as Record<string, unknown>}
            company={companyInfo as any}
            template={selectedTemplate || undefined}
            templates={printTemplates}
            docTypeCode={docCode}
          />
        </Suspense>
      )}
    </>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — حاوية دائمة في DOM مع تحكم CSS بالظهور
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      direction: 'rtl',
      pointerEvents: open ? 'auto' : 'none' as any,
      opacity: open ? 1 : 0,
      background: open ? 'rgba(0,0,0,.45)' : 'transparent',
      backdropFilter: open ? 'blur(3px)' : 'none',
      transition: 'opacity .25s, background .25s',
    }}>
      {modalContent}
    </div>
  );
}
