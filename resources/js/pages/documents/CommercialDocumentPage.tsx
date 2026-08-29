import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { DocumentType } from '@/lib/api/core/types';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { documentsApi } from '@/lib/api/endpoints/documents';

const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));

import type { Tab } from './components/DocumentUIPrimitives';
import { Tabs, AlertBanner } from './components/DocumentUIPrimitives';
import { RETURNABLE_CODES, SHIPPING_CODES } from './types/document.types';

import DocumentTopbar from './CommercialDocumentModal/DocumentTopbar';
import DocumentInfoSection, { DocumentAdvancedFields, hasAdvancedFieldErrors } from './CommercialDocumentModal/DocumentInfoSection';
import DocumentLinesSection from './CommercialDocumentModal/DocumentLinesSection';
import DocumentPaymentsSection from './CommercialDocumentModal/DocumentPaymentsSection';
import DocumentTotalsSection from './CommercialDocumentModal/DocumentTotalsSection';

import { DocumentChainPanel } from './components/DocumentChainPanel';
import MiniPrintPreview from './components/MiniPrintPreview';
import DocumentAttachmentsPanel from './components/DocumentAttachmentsPanel';
import { ReturnDocumentModal } from './components/ReturnDocumentModal';
import { BulkImportModal } from './components/BulkImportModal';
import { InvoiceOcrModal } from './components/InvoiceOcrModal';
import CameraCaptureModal from '@/components/CameraCaptureModal';
import { ShippingInfoSection } from './components/ShippingInfoSection';
import { PaymentTermsTable } from './components/PaymentTermsTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

import { useCommercialDocumentController } from './hooks/useCommercialDocumentController';
import { focusDocLineCell } from './utils/focusDocLineCell';
import { isOfflineQueuedResponse } from '@/lib/offline/queueMath';

/** زر طي/فتح لوحة المعلومات الجانبية. */
const railBtnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
  border: '1px solid var(--b2)', background: 'var(--bg1)', color: 'var(--t3)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const formatMiniMoney = (v: unknown): string =>
  Number(v ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

export default function CommercialDocumentPage() {
  const { typeCode, id } = useParams<{ typeCode: string; id: string }>();
  const navigate = useNavigate();
  const slug = useActiveSlug();
  const qc = useQueryClient();

  const onClose = useCallback(() => navigate(-1), [navigate]);
  const onSaved = useCallback(() => navigate(`/documents/${typeCode}`), [navigate, typeCode]);
  const { confirm, confirmDialogProps } = useConfirm();

  const { data: docType } = useQuery({
    queryKey: [slug, 'document-type-by-code', typeCode],
    queryFn: async () => {
      const res = await apiGet('/document-types', { per_page: 500 });
      const list = Array.isArray(res) ? res : ((res as Record<string, unknown>)?.data as DocumentType[]) ?? [];
      return list.find((dt) => dt.code === typeCode) ?? null;
    },
    enabled: !!slug && !!typeCode,
    staleTime: 10 * 60_000,
  });

  const { data: existingDoc } = useQuery({
    queryKey: tenantKeys.documents.detail(slug ?? '', Number(id)),
    queryFn: () => apiGet(`/documents/${id}`),
    enabled: !!slug && !!id,
    staleTime: 0,
  });

  const ctrl = useCommercialDocumentController({
    documentType: docType ?? null,
    existingDocument: existingDoc as Record<string, unknown> | undefined,
    onClose,
    onSaved,
    active: true,
  });

  const {
    docCode, isPurchase, isEdit,
    lookups, lookupsReady,
    form, errors, lineErr, apiErr,
    set, handlePriceLevelChange,
    addLine, addLineWithProduct, removeLine, duplicateLine, moveLine, updateLine,
    pmMode, payments,
    bulkAddLines, addPayment, addPaymentWithValues, removePayment, updatePayment,
    fillFromLastDoc, fillLastLoading,
    partyBalance, isLoadingBalance,
    totals,
    needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg,
    isLocked, isCancelled, isValidated,
    stockData, warehouseIdNum, refetchStock,
    docNumber, docNumberErr, checkingDocNumber, handleDocNumberChange,
    partyChangeWarning, setPartyChangeWarning,
    showReturnModal, setShowReturnModal,
    showBulkImport, setShowBulkImport,
    chain, isLoadingChain, convertMutation, allowedTargets,
    creditCheck, isLoadingCredit,
    customerInsights, isLoadingInsights,
    productSuggestions, isLoadingSuggestions,
    advancePayments, isLoadingAdvances,
    successMsg, setSuccessMsg,
    companyInfo, printTemplates,
    selectedTemplateId, setSelectedTemplateId, selectedTemplate,
    printModalOpen, setPrintModalOpen, handlePrint,
    visibleCols, lineMode, handleColsChange, setLineMode,
    deleteConfirm,
    handleSave, handleDelete, handleExport, handlePartyChangeWithWarning,
    handleQuickCreateParty, creatingParty,
    partyTypes,
    isPending,
    isPartyExempt, partyOptions, priceLevelOptions,
    paymentModeOptions, treasuryAccountMap, selectedParty,
    stockBadge, paymentsExceedWarning, balanceWarning,
    savedDraft, draftKey, restoreDraft,
    draftSavedAt, discardDraft, saveDraftNow,
  } = ctrl;

  // نسخ المستند كنسخة جديدة مستقلة (Task 7)
  const cloneMutation = useMutation({
    mutationFn: (docId: number) => documentsApi.clone(docId),
    onSuccess: (res) => {
      const newId = res?.id;
      qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug ?? '') });
      if (newId) {
        navigate(`/documents/${typeCode}/${newId}/edit`);
      } else {
        navigate(`/documents/${typeCode}`);
      }
    },
  });

  const handleClone = useCallback(async () => {
    const ok = await confirm(
      `نسخ المستند ${docNumber || ''} كمستند جديد (بأسطره وتاريخ اليوم)؟`,
      { variant: 'info', confirmText: 'نسخ', title: 'نسخ كمستند جديد' },
    );
    if (ok && id) cloneMutation.mutate(Number(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirm, docNumber, id, cloneMutation]);

  const DOC_TAB_KEY = `doc-tab:${docCode}`;
  const [extraTab, setExtraTabState] = useState<string>(() => {
    try { return localStorage.getItem(DOC_TAB_KEY) || 'advanced'; }
    catch { return 'advanced'; }
  });
  const setExtraTab = (key: string) => {
    setExtraTabState(key);
    try { localStorage.setItem(DOC_TAB_KEY, key); } catch {}
  };
  useEffect(() => {
    if (hasAdvancedFieldErrors(errors) && extraTab !== 'advanced') {
      setExtraTab('advanced');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors.warehouse_id, errors.fiscal_year_id, errors.currency_id]);

  const [alertsOpen, setAlertsOpen] = useState(true);

  // ── B.4 — تصوير فاتورة المورد → OCR → تعبئة نموذج الشراء ──────────────────
  const [showOcrCamera, setShowOcrCamera] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const ocrImageInputRef = useRef<HTMLInputElement>(null);

  const handleOcrImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setOcrFile(file);
  };

  // ── إنشاء منتج سريع من بحث المنتجات ──────────────────────────────────────
  const handleQuickCreateProduct = useCallback(async (payload: import('./components/ProductSearch').QuickCreatePayload) => {
    const { productsApi } = await import('@/lib/api/endpoints/products');
    try {
      const saved = await productsApi.create({
        name:               payload.name,
        ref:                payload.ref,
        product_type_id:    payload.product_type_id,
        purchase_price_ht:  payload.purchase_price_ht,
        tva_id:             payload.tva_id,
        unit_id:            payload.unit_id,
      });
      // تحديث ذاكرة التخزين المؤقت للمنتجات
      if (slug) {
        await qc.invalidateQueries({ queryKey: [slug, 'modal-products-v3'] });
        await qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
      }
      // تحديد المنتج الجديد في السطر
      if (saved && (saved as any).id) {
        addLineWithProduct(String((saved as any).id), payload.purchase_price_ht);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Quick create product failed:', err);
      throw err;
    }
  }, [slug, qc, addLineWithProduct]);

  // ── وضع الحاسب المحمول (≤1500px): ضغط الأعمدة والأزرار تلقائياً ───────────
  const [compact, setCompact] = useState<boolean>(
    () => window.matchMedia('(max-width: 1500px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1500px)');
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ── طي لوحة المعلومات الجانبية (محفوظ لكل نوع مستند) ──────────────────────
  const [infoCollapsed, setInfoCollapsedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`doc_info_collapsed_${docCode}`);
      if (saved !== null) return saved === '1';
    } catch { /* ignore */ }
    return window.innerWidth <= 1400;
  });
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`doc_info_collapsed_${docCode}`);
      setInfoCollapsedState(saved !== null ? saved === '1' : window.innerWidth <= 1400);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docCode]);
  const setInfoCollapsed = useCallback((v: boolean) => {
    setInfoCollapsedState(v);
    try { localStorage.setItem(`doc_info_collapsed_${docCode}`, v ? '1' : '0'); } catch { /* ignore */ }
  }, [docCode]);

  // ── طي معاينة الطباعة (محفوظ لكل نوع مستند، مفتوحة افتراضياً) ──────────────
  const [previewCollapsed, setPreviewCollapsedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`doc_preview_collapsed_${docCode}`);
      if (saved !== null) return saved === '1';
    } catch { /* ignore */ }
    return false;
  });
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`doc_preview_collapsed_${docCode}`);
      setPreviewCollapsedState(saved !== null ? saved === '1' : false);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docCode]);
  const setPreviewCollapsed = useCallback((v: boolean) => {
    setPreviewCollapsedState(v);
    try { localStorage.setItem(`doc_preview_collapsed_${docCode}`, v ? '1' : '0'); } catch { /* ignore */ }
  }, [docCode]);

  // ── اختصارات لوحة المفاتيح العامة: F2 باركود · F4 متعامل · F9/Ctrl+S حفظ · Alt+N سطر ──
  const hotRef = useRef({ handleSave, isPending, successMsg, isReadOnly, addLine, lineCount: form.lines.length });
  hotRef.current = { handleSave, isPending, successMsg, isReadOnly, addLine, lineCount: form.lines.length };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // لا تسرق المفاتيح والنوافذ المنبثقة مفتوحة (Modal overlay / ماسح الكاميرا)
      if (t && (t.closest('.ov') || t.closest('[style*="99999"]'))) return;
      const h = hotRef.current;
      if (e.key === 'F2') {
        e.preventDefault();
        const el = document.getElementById('doc-barcode-input') as HTMLInputElement | null;
        if (el) { el.focus(); el.select(); }
      } else if (e.key === 'F4') {
        e.preventDefault();
        document.getElementById('doc-party-select')?.focus();
      } else if (
        (e.key === 'F9' || ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's'))
      ) {
        e.preventDefault();
        if (!h.isPending && !h.successMsg && !h.isReadOnly) h.handleSave();
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (!h.isReadOnly) {
          // أضف سطراً ثم ركّز منتقي المنتج فيه مباشرة (السطر الجديد بلا منتج).
          const newIdx = h.lineCount;
          h.addLine();
          focusDocLineCell(newIdx, ['product', 'qty', 'total_qty']);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!lookupsReady) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, height: '100vh', background: 'var(--bg1)',
      }}>
        <i className="ti ti-loader-2" style={{ fontSize: 32, color: 'var(--em)', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>{docType?.name ?? 'جاري التحميل'}...</span>
      </div>
    );
  }

  const docTabs: Tab[] = [
    { key: 'advanced', label: 'خيارات إضافية', icon: 'ti-adjustments' },
  ];
  if (SHIPPING_CODES.has(docCode)) {
    docTabs.push({ key: 'shipping', label: 'الشحن والتسليم', icon: 'ti-truck-delivery' });
  }
  docTabs.push({ key: 'payment-terms', label: 'شروط الدفع', icon: 'ti-coin' });

  const infoAlerts: Array<{ type: 'warning' | 'error' | 'info'; message: string }> = [];
  if (priceLevelSwitchMsg) {
    infoAlerts.push({
      type: 'warning',
      message: `المنتج "${priceLevelSwitchMsg.productName}" ليس له سعر في فئة "${priceLevelSwitchMsg.from}"، تم التبديل إلى "${priceLevelSwitchMsg.to}".`,
    });
  }
  if (isCancelled) infoAlerts.push({ type: 'error', message: 'هذا المستند ملغى — جميع الحقول معطلة.' });
  if (isLocked && !isCancelled) infoAlerts.push({ type: 'warning', message: 'هذا المستند مقفل. لا يمكن تعديله حتى يتم فك القفل من قِبل المسؤول.' });
  if (pmMode === 'additive' && !isLocked) infoAlerts.push({ type: 'info', message: 'المستند معتمد — الأسطر محمية من التعديل. يمكنك فقط إضافة دفعات جديدة.' });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: isCancelled ? 'var(--bg3)' : 'var(--bg1)',
      direction: 'rtl', overflow: 'hidden',
    }}>

      <DocumentTopbar
        documentType={docType ?? null}
        isEdit={isEdit}
        isCancelled={isCancelled}
        isLocked={isLocked}
        isValidated={isValidated}
        isPurchase={isPurchase}
        docCode={docCode}
        docNumber={docNumber}
        existingDocument={existingDoc as Record<string, unknown> | undefined}
        pmMode={pmMode}
        stockBadge={stockBadge}
        onBack={onClose}
        isPending={isPending}
        successMsg={successMsg}
        isReadOnly={isReadOnly}
        handleSave={handleSave}
        onPrint={isEdit ? handlePrint : undefined}
        templates={printTemplates}
        selectedTemplateId={selectedTemplateId}
        onTemplateChange={setSelectedTemplateId}
        handleExport={handleExport}
        handleDelete={handleDelete}
        onClone={isEdit ? handleClone : undefined}
        onReturnClick={() => setShowReturnModal(true)}
        RETURNABLE_CODES={RETURNABLE_CODES}
        compact={compact}
        draftSavedAt={draftSavedAt}
        onSaveDraft={saveDraftNow}
        onDiscardDraft={discardDraft}
      />

      {infoAlerts.length > 0 && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--b1)', background: 'var(--bg2)' }}>
          <button
            onClick={() => setAlertsOpen((v) => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 20px', border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--t4)', fontSize: 11, fontWeight: 600,
              fontFamily: 'inherit', textAlign: 'right',
            }}
          >
            <i className={`ti ti-chevron-${alertsOpen ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
            {alertsOpen ? 'إخفاء التنبيهات' : `${infoAlerts.length} تنبيه`}
          </button>
          {alertsOpen && (
            <div style={{ padding: '0 20px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {infoAlerts.map((a, i) => <AlertBanner key={i} type={a.type} message={a.message} />)}
            </div>
          )}
        </div>
      )}

      {(successMsg || apiErr) && (
        <div style={{ flexShrink: 0, padding: '8px 20px 0' }}>
          {successMsg && <AlertBanner type="success" message={successMsg} />}
          {apiErr && <AlertBanner type="error" message={apiErr} />}
        </div>
      )}

      {partyChangeWarning && (
        <div style={{ flexShrink: 0, padding: '10px 20px 0' }}>
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--r2)',
            background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
            border: '1px solid var(--orange)',
            fontSize: 12.5, color: 'var(--orange)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <i className="ti ti-alert-triangle" style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>
                {partyChangeWarning.blockType === 'existing_payments' && 'دفعات مُسجَّلة في المستند'}
                {partyChangeWarning.blockType === 'has_payments' && 'دفعات في النموذج'}
                {partyChangeWarning.blockType === 'price_level_change' && 'تعارض فئة السعر'}
                {!partyChangeWarning.blockType && 'لا يمكن تغيير المتعامل'}
              </div>
              <div>{partyChangeWarning.message}</div>
            </div>
            <button
              onClick={() => setPartyChangeWarning(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--orange)', padding: 0, fontSize: 13, flexShrink: 0 }}
            >
              <i className="ti ti-x" />
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>

        {infoCollapsed ? (
          <div style={{
            width: 44, flexShrink: 0, borderLeft: '1px solid var(--b1)',
            background: 'var(--bg2)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '8px 0', gap: 12,
          }}>
            <button onClick={() => setInfoCollapsed(false)} title="إظهار لوحة المعلومات" style={railBtnStyle}>
              <i className="ti ti-chevrons-left" style={{ fontSize: 15 }} />
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{
                writingMode: 'vertical-rl', fontSize: 11, fontWeight: 800,
                color: 'var(--em)', whiteSpace: 'nowrap',
              }}>
                TTC {formatMiniMoney(totals?.ttc)}
              </span>
            </div>
            <i className="ti ti-info-circle" style={{ fontSize: 14, color: 'var(--t4)' }} />
          </div>
        ) : (
        <div style={{
          width: compact ? 252 : 300, flexShrink: 0, borderLeft: '1px solid var(--b1)',
          background: 'var(--bg2)', display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: compact ? 10 : 16, display: 'flex', flexDirection: 'column', gap: compact ? 10 : 16 }}>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button onClick={() => setInfoCollapsed(true)} title="طي لوحة المعلومات" style={railBtnStyle}>
                <i className="ti ti-chevrons-right" style={{ fontSize: 14 }} />
              </button>
            </div>

            {isEdit && !!existingDoc && (
              <DocumentChainPanel
                chain={chain}
                isLoading={isLoadingChain}
                currentId={Number((existingDoc as Record<string, unknown>).id)}
                allowedTargets={allowedTargets}
                isReadOnly={isReadOnly}
                onConvert={async (targetCode) => {
                  if (!await confirm(`تحويل هذا المستند إلى ${targetCode}؟`)) return;
                  convertMutation.mutate(
                    { documentId: Number((existingDoc as Record<string, unknown>).id), targetTypeCode: targetCode },
                    // onSaved يُنقل للمستند الجديد — لا نستدعي onClose حتى لا يعيدنا لمحرر المستند المصدر القديم
                    { onSuccess: () => { onSaved(); } },
                  );
                }}
                onNavigate={(node) => navigate(`/documents/${node.document_type}/${node.id}/edit`)}
              />
            )}

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
                warehouses: lookups.warehouses as Array<{ id: number; name: string; is_default?: boolean }>,
                fiscalYears: lookups.fiscalYears as Array<{ id: number; name: string; is_current?: boolean; is_closed?: boolean }>,
                currencies: lookups.currencies as Array<{ id: number; code: string; name: string; is_base_currency?: boolean }>,
                priceLevels: lookups.priceLevels as Array<{ id: number; name: string }>,
              }}
              partyBalance={partyBalance}
              isLoadingBalance={isLoadingBalance}
              selectedParty={selectedParty}
              creditCheck={creditCheck as any}
              isLoadingCredit={isLoadingCredit}
              customerInsights={customerInsights as any}
              isLoadingInsights={isLoadingInsights}
              balanceWarning={balanceWarning}
              qc={qc}
              slug={slug}
              warehouseIdNum={warehouseIdNum}
              partyTypes={partyTypes}
              onQuickCreateParty={handleQuickCreateParty}
              creatingParty={creatingParty}
            />

            <Tabs tabs={docTabs} activeKey={extraTab} onChange={setExtraTab}>
              {extraTab === 'advanced' && (
                <DocumentAdvancedFields
                  form={form as unknown as Record<string, unknown>}
                  errors={errors}
                  set={set}
                  isReadOnly={isReadOnly}
                  isLinesReadOnly={isLinesReadOnly}
                  isPurchase={isPurchase}
                  priceLevelOptions={priceLevelOptions}
                  handlePriceLevelChange={handlePriceLevelChange}
                  lookups={{
                    warehouses: lookups.warehouses as Array<{ id: number; name: string; is_default?: boolean }>,
                    fiscalYears: lookups.fiscalYears as Array<{ id: number; name: string; is_current?: boolean; is_closed?: boolean }>,
                    currencies: lookups.currencies as Array<{ id: number; code: string; name: string; is_base_currency?: boolean }>,
                    priceLevels: lookups.priceLevels as Array<{ id: number; name: string }>,
                  }}
                  qc={qc}
                  slug={slug}
              warehouseIdNum={warehouseIdNum!}
                />
              )}
              {extraTab === 'shipping' && (
                <ShippingInfoSection
                  value={form.shipping_info}
                  deliveryDate={form.delivery_date}
                  disabled={isReadOnly}
                  onChange={(info) => set('shipping_info', info)}
                  onDeliveryDateChange={(date) => set('delivery_date', date)}
                />
              )}
              {extraTab === 'payment-terms' && (
                <PaymentTermsTable
                  terms={form.payment_terms}
                  netToPay={totals.netToPay!}
                  disabled={isReadOnly}
                  onChange={(terms) => set('payment_terms', terms)}
                />
              )}
            </Tabs>

            <DocumentPaymentsSection
              payments={payments}
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
              affectsAccounting={docType?.affects_accounting ?? false}
            />
          </div>

          <div style={{
            flexShrink: 0, borderTop: '1px solid var(--b1)', background: 'var(--bg2)',
            padding: compact ? '6px 10px' : '8px 16px',
          }}>
            <button
              onClick={() => setPreviewCollapsed(!previewCollapsed)}
              title={previewCollapsed ? 'إظهار معاينة الطباعة' : 'إخفاء معاينة الطباعة'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, color: 'var(--em)', padding: 0,
              }}
            >
              <i className={`ti ${previewCollapsed ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12 }} />
              <span>معاينة الطباعة</span>
            </button>
            {!previewCollapsed && (
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
                <MiniPrintPreview
                  company={companyInfo}
                  docTypeName={docType?.name ?? ''}
                  docNumber={docNumber}
                  date={form.document_date}
                  partyLabel={isPurchase ? 'المورد' : 'الزبون'}
                  partyName={selectedParty?.name ?? ''}
                  lines={form.lines}
                  totals={totals}
                  notes={form.notes}
                  availableWidth={(compact ? 252 : 300) - (compact ? 10 : 16) * 2}
                />
              </div>
            )}
          </div>

          {(() => {
            const docId = id ? Number(id) : NaN;
            return Number.isFinite(docId) && docId > 0 ? (
              <DocumentAttachmentsPanel docId={docId} readOnly={isReadOnly} />
            ) : null;
          })()}

          <div style={{
            flexShrink: 0, borderTop: '1px solid var(--b1)',
            background: 'var(--bg2)', maxHeight: compact ? '48vh' : '55vh', overflowY: 'auto',
          }}>
            <DocumentTotalsSection
              totals={totals}
              payments={payments}
              partyBalance={partyBalance}
              form={form}
              selectedParty={selectedParty!}
              isPurchase={isPurchase}
              isEdit={isEdit}
            />
          </div>
        </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: compact ? 10 : 16 }}>
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
            moveLine={moveLine}
            updateLine={updateLine as any}
            lineErr={lineErr}
            savedDraft={savedDraft}
            draftKey={draftKey}
            restoreDraft={restoreDraft}
            onDiscardDraft={discardDraft}
            set={set}
            needsParty={needsParty}
            productSuggestions={productSuggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            setShowBulkImport={setShowBulkImport}
            onOcrInvoice={isPurchase ? () => setShowOcrCamera(true) : undefined}
            onOcrImage={isPurchase ? () => ocrImageInputRef.current?.click() : undefined}
            slug={slug}
            affectsStock={affectsStock}
            stockDir={stockDir}
            warehouses={lookups.warehouses as Array<{ id: number; name: string }>}
            compact={compact}
            onRefreshStock={refetchStock}
            onQuickCreate={handleQuickCreateProduct}
            productTypes={lookups.productTypes}
            tvas={lookups.tvas}
            units={lookups.units}
            bulkAddLines={bulkAddLines}
            fillFromLastDoc={isPurchase ? undefined : () => fillFromLastDoc()}
            fillLastLoading={fillLastLoading}
          />
        </div>
      </div>

      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        products={lookups.products}
        onImport={(importedLines) => { bulkAddLines(importedLines); }}
      />

      <input
        ref={ocrImageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleOcrImagePicked}
      />

      <CameraCaptureModal
        open={showOcrCamera}
        onCapture={(file) => { setOcrFile(file); setShowOcrCamera(false); }}
        onClose={() => setShowOcrCamera(false)}
        title="تصوير فاتورة المورد"
        hint="صوّب الكاميرا على فاتورة المورد لقراءتها تلقائياً، أو ارفع صورة من الجهاز"
      />

      <InvoiceOcrModal
        open={!!ocrFile}
        file={ocrFile}
        suppliers={lookups.parties}
        products={lookups.products}
        needsParty={needsParty}
        onRequestCapture={() => setShowOcrCamera(true)}
        onClose={() => setOcrFile(null)}
        onApply={(payload) => {
          set('document_date', payload.documentDate);
          set('party_id', payload.partyId);
          bulkAddLines(payload.lines);
        }}
      />

      {showReturnModal && !!existingDoc && (
        <ReturnDocumentModal
          document={existingDoc as Record<string, unknown>}
          onCreated={(returnDoc) => {
            setShowReturnModal(false);
            const num = String((returnDoc as Record<string, unknown>).document_number ?? '');
            setSuccessMsg(
              isOfflineQueuedResponse(returnDoc)
                ? `أُضيف المرتجع إلى قائمة الانتظار — سيُحفظ عند توفر الاتصال (${num})`
                : `تم إنشاء المرتجع ${num} ✓`,
            );
            if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
            setTimeout(() => { setSuccessMsg(''); onSaved(); onClose(); }, 1800);
          }}
          onClose={() => setShowReturnModal(false)}
        />
      )}

      {printModalOpen && !!existingDoc && !!companyInfo && (
        <Suspense fallback={null}>
          <TemplatePrintModal
            open={printModalOpen}
            onClose={() => setPrintModalOpen(false)}
            document={existingDoc as Record<string, unknown>}
            company={companyInfo as any}
            template={selectedTemplate || undefined}
            templates={printTemplates}
            docTypeCode={docCode}
            prevBalance={partyBalance?.current_balance ?? 0}
            newBalance={partyBalance?.current_balance ?? 0}
          />
        </Suspense>
      )}

      <ConfirmDialog {...confirmDialogProps} />
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}
