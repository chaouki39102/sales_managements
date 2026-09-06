import React, { Suspense, useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { DocumentType } from '@/lib/api/core/types';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { documentsApi, useDocumentsByType } from '@/lib/api/endpoints/documents';
import { useMyRolesAndPermissions } from '@/lib/api/endpoints/roles';
import { useSettingsByGroup } from '@/lib/api/endpoints/settings';
import { useIsSuperAdmin } from '@/context/AuthContext';

const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));

import type { Tab } from './components/DocumentUIPrimitives';
import { Tabs, AlertBanner } from './components/DocumentUIPrimitives';
import { RETURNABLE_CODES, SHIPPING_CODES } from './types/document.types';

import DocumentTopbar from './CommercialDocumentModal/DocumentTopbar';
import DocActionRail from './components/DocActionRail';
import { DocumentAdvancedFields } from './CommercialDocumentModal/DocumentInfoSection';
import DocumentLinesSection from './CommercialDocumentModal/DocumentLinesSection';
import DocumentPaymentsSection from './CommercialDocumentModal/DocumentPaymentsSection';

import DocumentHeaderBand from './components/DocumentHeaderBand';
import DocTotalsCard from './components/DocTotalsCard';
import DocSaveModal, { type DocSaveAction } from './components/DocSaveModal';
import DocScanbar from './components/DocScanbar';
import MiniPrintPreview from './components/MiniPrintPreview';
import { ReturnDocumentModal } from './components/ReturnDocumentModal';
import { BulkImportModal } from './components/BulkImportModal';
import { InvoiceOcrModal } from './components/InvoiceOcrModal';
import CameraCaptureModal from '@/components/CameraCaptureModal';
import { ShippingInfoSection } from './components/ShippingInfoSection';
import { PaymentTermsTable } from './components/PaymentTermsTable';
import { DocPrefsTab } from './components/DocPrefsTab';
import { DocEditorPrefsTab } from './components/DocEditorPrefsTab';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import { useConfirm } from '@/hooks/useConfirm';

import { useCommercialDocumentController } from './hooks/useCommercialDocumentController';
import { focusDocLineCell } from './utils/focusDocLineCell';
import { getDocPref } from './utils/docPrefs';
import { isOfflineQueuedResponse } from '@/lib/offline/queueMath';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useNotification } from '@/hooks/useNotification';

const BarcodeScannerModal = React.lazy(() => import('@/components/BarcodeScannerModal'));

export default function CommercialDocumentPage() {
  const { typeCode, id } = useParams<{ typeCode: string; id: string }>();
  const navigate = useNavigate();
  const slug = useActiveSlug();
  const qc = useQueryClient();
  const notify = useNotification();

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
    conflictVersion,
    set, handlePriceLevelChange,
    addLine, addLineWithProduct, removeLine, duplicateLine, moveLine, updateLine,
    pmMode, payments,
    bulkAddLines, addPayment, addPaymentWithValues, removePayment, updatePayment,
    fillFromLastDoc, fillLastLoading,
    partyBalance, isLoadingBalance,
    totals,
    needsParty,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg,
    isLocked, isCancelled, isValidated,
    stockData, warehouseIdNum, refetchStock,
    docNumber, docNumberErr, checkingDocNumber, handleDocNumberChange,
    partyChangeWarning, setPartyChangeWarning,
    showReturnModal, setShowReturnModal,
    showBulkImport, setShowBulkImport,
    advancePayments, isLoadingAdvances,
    creditCheck, customerInsights,
    successMsg, setSuccessMsg,
    companyInfo, printTemplates,
    selectedTemplateId, setSelectedTemplateId, selectedTemplate,
    printModalOpen, setPrintModalOpen, handlePrint,
    visibleCols, canViewCost, canEditPrice, canApplyDiscount, lineMode, setLineMode,
    deleteConfirm,
    handleSave, handleDelete, handleExport, handlePartyChangeWithWarning,
    requestSaveAction,
    handleQuickCreateParty, creatingParty,
    partyTypes,
    isPending,
    isPartyExempt, partyOptions, priceLevelOptions,
    paymentModeOptions, treasuryAccountMap, selectedParty,
    stockBadge, paymentsExceedWarning,
    savedDraft, draftKey, restoreDraft,
    draftSavedAt, discardDraft, saveDraftNow,
  } = ctrl;

  // سقف مبلغ الإنشاء حسب دور المستخدم (Task 11) — مرآة لحارس afterCreate
  // في CommercialDocumentService::assertDocumentAmountLimit: owner→admin،
  // manager→manager، أي دور آخر/بدون دور→member؛ super-admin بلا سقف.
  const { data: userRolesData } = useMyRolesAndPermissions();
  const { data: docSettings = [] } = useSettingsByGroup('documents');
  const isSuperAdmin = useIsSuperAdmin();
  const createLimit = useMemo(() => {
    if (isEdit || isSuperAdmin) return null;
    const roleName = userRolesData?.roles?.[0]?.name;
    const suffix = roleName === 'owner' ? 'admin' : roleName === 'manager' ? 'manager' : 'member';
    const raw = Number(docSettings.find((s) => s.key === `max_create_amount_${suffix}`)?.value ?? 0);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [isEdit, isSuperAdmin, userRolesData, docSettings]);

  // تثبيت ارتفاع بطاقة المتعامل على ارتفاع بطاقة الإجماليات عند فتح الصفحة
  // (لا تزيد مع اختيار الزبون — تُلتقط القيمة مرة واحدة فقط ثم تتوقف).
  // يجب أن يظهر بعد destructuring الـ controller حتى لا يكون `lookupsReady`
  // في المنطقة الميتة الزمنية (TDZ) عند تقييم مصفوفة الاعتماديات.
  const totalsColRef = useRef<HTMLDivElement | null>(null);
  const [partyMaxHeight, setPartyMaxHeight] = useState<number | undefined>(undefined);
  const partyHRef = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    const el = totalsColRef.current;
    if (!el) return;
    const capture = () => {
      if (partyHRef.current !== undefined) return;
      const h = el.offsetHeight;
      if (h > 0) {
        partyHRef.current = h;
        setPartyMaxHeight(h);
        return true;
      }
      return false;
    };
    capture();
    const ro = new ResizeObserver(() => { capture(); if (partyHRef.current !== undefined) ro.disconnect(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [lookupsReady]);

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
    if ((errors.fiscal_year_id || errors.currency_id) && extraTab !== 'advanced') {
      setExtraTab('advanced');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors.fiscal_year_id, errors.currency_id]);

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

  // ── شريط المسح/البحث (مثل POS Pro) ──────────────────────────────────────
  const handleScanProduct = useCallback((productId: string) => {
    if (!productId) return;
    addLineWithProduct(productId);
  }, [addLineWithProduct]);

  // ── مسح الباركود بالكاميرا في شريط المسح (مثل POS Pro) ──────────────────
  const scanCamera = useBarcodeScan<{ id: number; name: string; ref?: string | null; barcode?: string | null }>({
    resolve: (code) =>
      (lookups.products ?? []).find(
        (p) => p.barcode === code || p.ref === code || String(p.id) === code,
      ) ?? null,
    onFound: (p) => handleScanProduct(String(p.id)),
    onNotFound: () => notify.error('لم يتم العثور على منتج بهذا الباركود'),
  });

  // ── المستندات الحديثة (تبويبات مثل POS Pro) ─────────────────────────────
  const recentDocs = useDocumentsByType(docCode, { per_page: 8, sort: '-document_date' });
  const recentList = (recentDocs.data?.data ?? []).filter(d => String(d.id) !== id);
  const gotoDoc = useCallback((docId: number) => {
    navigate(`/documents/${docCode}/${docId}/edit`);
  }, [navigate, docCode]);

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

  // ── الوضع الضيق (≤1180px): تكديس عمودي — الأسطر أعلى ولوحة المعلومات أسفل ─
  const [narrow, setNarrow] = useState<boolean>(
    () => window.matchMedia('(max-width: 1180px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1180px)');
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ── معاينة الطباعة في مودال (تفتح بزر في أسفل الشريط الجانبي) ──────────────
  const [showPreview, setShowPreview] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showExtraOptions, setShowExtraOptions] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // ── اختصارات لوحة المفاتيح العامة: F2 باركود · F4 متعامل · F9/Ctrl+S حفظ · Alt+N سطر ──
  const openSaveModal = useCallback(() => {
    if (isPending || successMsg || isReadOnly) return;
    setShowSaveModal(true);
  }, [isPending, successMsg, isReadOnly]);

  const hotRef = useRef({ openSaveModal, addLine, lineCount: form.lines.length, isReadOnly });
  hotRef.current = { openSaveModal, addLine, lineCount: form.lines.length, isReadOnly };
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
        document.getElementById('doc-party-select')?.click();
      } else if (
        (e.key === 'F9' || ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's'))
      ) {
        e.preventDefault();
        h.openSaveModal();
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
      <div className="doc-loading">
        <i className="ti ti-loader-2 doc-loading-spin" />
        <span className="doc-loading-text">{docType?.name ?? 'جاري التحميل'}...</span>
      </div>
    );
  }

  const docTabs: Tab[] = [
    { key: 'advanced', label: 'خيارات إضافية', icon: 'ti-adjustments' },
    { key: 'line-entry', label: 'الإدخال السريع', icon: 'ti-zap' },
    { key: 'editor-prefs', label: 'المحرر', icon: 'ti-adjustments-horizontal' },
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
    <div className={isCancelled ? 'doc-page doc-page--cancelled' : 'doc-page'}>

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
        compact={compact}
        draftSavedAt={draftSavedAt}
        onSaveDraft={saveDraftNow}
        onDiscardDraft={discardDraft}
        handleSave={handleSave}
        hideSave
      />

      <div className="doc-body">

        <DocActionRail
          isEdit={isEdit}
          isReadOnly={isReadOnly}
          isPending={isPending}
          successMsg={successMsg}
          docCode={docCode}
          onBack={onClose}
          handleSave={openSaveModal}
          onPrint={isEdit ? handlePrint : undefined}
          onPayments={() => setShowPayments(true)}
          paymentsCount={payments.length}
          onExtraOptions={() => setShowExtraOptions(true)}
          onPreview={() => setShowPreview(true)}
          handleExport={handleExport}
          handleDelete={handleDelete}
          onClone={isEdit ? handleClone : undefined}
          onReturnClick={() => setShowReturnModal(true)}
          RETURNABLE_CODES={RETURNABLE_CODES}
          templates={printTemplates}
          selectedTemplateId={selectedTemplateId}
          onTemplateChange={setSelectedTemplateId}
        />

        <div className="doc-main">

      {infoAlerts.length > 0 && (
        <div className="doc-alerts">
          <button
            onClick={() => setAlertsOpen((v) => !v)}
            className="doc-alerts-toggle"
          >
            <i className={`ti ti-chevron-${alertsOpen ? 'up' : 'down'} doc-alerts-chevron`} />
            {alertsOpen ? 'إخفاء التنبيهات' : `${infoAlerts.length} تنبيه`}
          </button>
          {alertsOpen && (
            <div className="doc-alerts-list">
              {infoAlerts.map((a, i) => <AlertBanner key={i} type={a.type} message={a.message} />)}
            </div>
          )}
        </div>
      )}

      {(successMsg || apiErr || conflictVersion !== null) && (
        <div className="doc-msg-slot">
          {successMsg && <AlertBanner type="success" message={successMsg} />}
          {apiErr && <AlertBanner type="error" message={apiErr} />}
          {conflictVersion !== null && (
            <AlertBanner
              type="error"
              message={`تعارض: المستند تم تعديله من مستخدم آخر (نسخة ${conflictVersion}). أعد تحميل الصفحة لاستعادة آخر نسخة محفوظة.`}
              action={
                <button
                  type="button"
                  className="btn btn-sm btn-p"
                  onClick={() => window.location.reload()}
                >
                  <i className="ti ti-refresh" /> تحديث
                </button>
              }
            />
          )}
        </div>
      )}

      {partyChangeWarning && (
        <div className="doc-party-warn">
        <div className="doc-party-warn-box">
            <i className="ti ti-alert-triangle doc-party-warn-icon" />
            <div className="doc-party-warn-body">
              <div className="doc-party-warn-title">
                {partyChangeWarning.blockType === 'existing_payments' && 'دفعات مُسجَّلة في المستند'}
                {partyChangeWarning.blockType === 'has_payments' && 'دفعات في النموذج'}
                {partyChangeWarning.blockType === 'price_level_change' && 'تعارض فئة السعر'}
                {!partyChangeWarning.blockType && 'لا يمكن تغيير المتعامل'}
              </div>
              <div>{partyChangeWarning.message}</div>
            </div>
            <button
              onClick={() => setPartyChangeWarning(null)}
              className="doc-party-warn-close"
            >
              <i className="ti ti-x" />
            </button>
          </div>
        </div>
      )}

      <div className={compact ? 'doc-ed-top doc-ed-top--compact' : 'doc-ed-top'}>
        <div className={`doc-ed-top-row${compact ? ' doc-ed-top-row--compact' : ''}${narrow ? ' doc-ed-top-row--narrow' : ''}`}>
          <div
            className={narrow ? 'party-col party-col--narrow' : 'party-col'}
            style={narrow ? undefined : ({ '--party-col-h': `${partyMaxHeight ?? 320}px` } as React.CSSProperties)}
          >
            <DocumentHeaderBand
              variant="party-card"
              docCode={docCode}
              isEdit={isEdit}
              isReadOnly={isReadOnly}
              isLinesReadOnly={isLinesReadOnly}
              isPurchase={isPurchase}
              needsParty={needsParty}
              compact={compact}
              narrow={narrow}
              collapsed={false}
              onToggleCollapse={() => {}}
              maxHeight={narrow ? undefined : partyMaxHeight}
              form={form as unknown as Record<string, unknown>}
              errors={errors}
              set={set}
              docNumber={docNumber}
              docNumberErr={docNumberErr}
              checkingDocNumber={checkingDocNumber}
              handleDocNumberChange={handleDocNumberChange}
              handlePartyChangeWithWarning={handlePartyChangeWithWarning}
              partyOptions={partyOptions}
              selectedParty={selectedParty ?? null}
              priceLevelOptions={priceLevelOptions}
              handlePriceLevelChange={handlePriceLevelChange}
              warehouses={lookups.warehouses as Array<{ id: number; name: string; is_default?: boolean }>}
              warehouseIdNum={warehouseIdNum!}
              qc={qc}
              slug={slug}
              partyBalance={partyBalance}
              isLoadingBalance={isLoadingBalance}
              creditCheck={creditCheck}
              customerInsights={customerInsights}
              partyTypes={partyTypes}
              onQuickCreateParty={handleQuickCreateParty}
              creatingParty={creatingParty}
            />
          </div>
          <div ref={totalsColRef} className="totals-col">
            <DocTotalsCard
              totals={totals}
              isEdit={isEdit}
              createLimit={createLimit}
            />
          </div>
        </div>

      </div>

      <div className={`pos-pro-scan-row doc-scan-row${compact ? ' doc-scan-row--compact' : ''}`}>
        <div className="doc-scan-grow">
          <DocScanbar
            products={lookups.products}
            onAdd={(p) => handleScanProduct(String(p.id))}
            isPurchase={isPurchase}
            stockData={stockData}
            disabled={isLinesReadOnly}
            onScanCamera={() => scanCamera.openScanner()}
          />
        </div>
        <button
          type="button"
          className="pp-print-btn"
          onClick={isEdit ? handlePrint : undefined}
          disabled={!isEdit || isLinesReadOnly}
          title="طباعة المستند الحالي"
        >
          <i className="ti ti-printer" />
          <span>طباعة</span>
        </button>
        <button
          type="button"
          className="pp-refresh-btn"
          onClick={() => refetchStock()}
          title="تحديث الأسطر والمخزون"
        >
          <i className="ti ti-refresh" />
          <span>تحديث</span>
        </button>
      </div>

      <div className={compact ? 'doc-lines-card doc-lines-card--compact' : 'doc-lines-card'}>

        <div className="pp-cart">
        <div className="pp-cart-hd">
          <div className="pp-cart-tabs">
            <span className="pp-cart-tab pp-cart-tab--current" title={isEdit ? 'المستند الحالي' : 'مستند جديد'}>
              <i className="ti ti-file-text" />
              {isEdit
                ? (docNumber ?? `مستند ${id}`)
                : 'مسودة جديدة'}
            </span>
            {recentList.map(rd => (
              <span
                key={rd.id}
                role="button"
                tabIndex={0}
                className="pp-cart-tab pp-cart-tab--held"
                onClick={() => gotoDoc(rd.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gotoDoc(rd.id); } }}
                title={`فتح ${rd.document_number} · ${rd.status}`}
              >
                <i className="ti ti-history" />
                {rd.document_number}
              </span>
            ))}
          </div>
        </div>

        <div className="doc-lines-body">
          <DocumentLinesSection
            lines={form.lines}
            isLinesReadOnly={isLinesReadOnly}
            isReadOnly={isReadOnly}
            isPurchase={isPurchase}
            isPartyExempt={isPartyExempt}
            products={lookups.products}
            isLoadingProducts={lookups.isLoadingProducts}
            visibleCols={visibleCols}
            canViewCost={canViewCost}
            canEditPrice={canEditPrice}
            canApplyDiscount={canApplyDiscount}
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
            setShowBulkImport={setShowBulkImport}
            onOcrInvoice={isPurchase ? () => setShowOcrCamera(true) : undefined}
            onOcrImage={isPurchase ? () => ocrImageInputRef.current?.click() : undefined}
            slug={slug}
            warehouses={lookups.warehouses as Array<{ id: number; name: string }>}
            compact={compact}
            onRefreshStock={refetchStock}
            hideScanBar
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
      </div>

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
        className="doc-hidden-input"
        onChange={handleOcrImagePicked}
      />

      <CameraCaptureModal
        open={showOcrCamera}
        onCapture={(file) => { setOcrFile(file); setShowOcrCamera(false); }}
        onClose={() => setShowOcrCamera(false)}
        title="تصوير فاتورة المورد"
        hint="صوّب الكاميرا على فاتورة المورد لقراءتها تلقائياً، أو ارفع صورة من الجهاز"
      />

      {scanCamera.open && (
        <Suspense fallback={null}>
          <BarcodeScannerModal
            open={scanCamera.open}
            onScan={scanCamera.handleScan}
            onClose={scanCamera.closeScanner}
            title="مسح الباركود لإضافة منتج"
            hint="صوّب الكاميرا على باركود المنتج ليُضاف كسطر تلقائياً"
          />
        </Suspense>
      )}

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
            copies={getDocPref('printCopies', slug)}
          />
        </Suspense>
      )}

      <ConfirmDialog {...confirmDialogProps} />
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />

      {showPreview && (
        <Modal
          open
          onClose={() => setShowPreview(false)}
          title={<><i className="ti ti-eye doc-modal-title-ic" /> معاينة الطباعة</>}
          subtitle="معاينة حيّة للمستند كما سيُطبع"
          size="lg"
          storageKey="doc-modal-preview-size"
          bodyHeight={560}
        >
          <div className="doc-preview-wrap">
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
              availableWidth={520}
            />
          </div>
        </Modal>
      )}

      {showPayments && (
        <Modal
          open
          onClose={() => setShowPayments(false)}
          title={<><i className="ti ti-wallet doc-modal-title-ic" /> الدفعات</>}
          subtitle="تسجيل وإدارة دفعات هذا المستند"
          size="lg"
          storageKey="doc-modal-payments-size"
          bodyHeight={480}
        >
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
        </Modal>
      )}

      {showExtraOptions && (
        <Modal
          open
          onClose={() => setShowExtraOptions(false)}
          title={<><i className="ti ti-adjustments doc-modal-title-ic" /> خيارات إضافية</>}
          subtitle="إعدادات متقدمة، الشحن والتسليم، وشروط الدفع"
          size="lg"
          storageKey="doc-modal-extra-options-size"
          bodyHeight={480}
        >
          {docType && (
            <div className="doc-type-props" role="group" aria-label="خصائص المستند">
              <span className="doc-type-props-title">
                <i className="ti ti-file-info" /> خصائص المستند
              </span>
              <span className={`doc-type-prop ${docType.affects_accounting ? 'on' : 'off'}`}>
                <i className="ti ti-chart-bar" />
                {docType.affects_accounting ? 'يؤثر على المحاسبة' : 'لا يؤثر على المحاسبة'}
              </span>
              <span className={`doc-type-prop ${docType.affects_stock_direction === 1 ? 'on' : docType.affects_stock_direction === -1 ? 'warn' : 'off'}`}>
                <i className="ti ti-box" />
                {docType.affects_stock_direction === 1 ? 'يدخل المخزون' : docType.affects_stock_direction === -1 ? 'يُخرج من المخزون' : 'لا يحرّك المخزون'}
              </span>
              <span className={`doc-type-prop ${docType.requires_party ? 'on' : 'off'}`}>
                <i className="ti ti-user" />
                {docType.requires_party ? 'يتطلب متعامل' : 'بدون متعامل إلزامي'}
              </span>
              <span className={`doc-type-prop ${docType.is_printable ? 'on' : 'off'}`}>
                <i className="ti ti-printer" />
                {docType.is_printable ? 'قابل للطباعة' : 'غير قابل للطباعة'}
              </span>
            </div>
          )}
          <Tabs tabs={docTabs} activeKey={extraTab} onChange={setExtraTab}>
            {extraTab === 'advanced' && (
              <DocumentAdvancedFields
                slim
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
            {extraTab === 'line-entry' && (
              <DocPrefsTab />
            )}
            {extraTab === 'editor-prefs' && (
              <DocEditorPrefsTab slug={slug} />
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
        </Modal>
      )}

      <DocSaveModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        isEdit={isEdit}
        isPending={isPending}
        successMsg={successMsg}
        onConfirm={(action: DocSaveAction) => {
          setShowSaveModal(false);
          requestSaveAction(action);
        }}
      />
    </div>
  );
}
