import React, { Suspense, useState, useEffect } from 'react';
import type { DocumentType } from '@/lib/api/core/types';
import { tenantKeys } from '@/lib/api/core/queryKeys';

const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));

import type { Tab } from '../components/DocumentUIPrimitives';
import { Tabs, AlertBanner } from '../components/DocumentUIPrimitives';
import { RETURNABLE_CODES, SHIPPING_CODES } from '../types/document.types';

import DocumentTopbar from './DocumentTopbar';
import DocumentInfoSection, { DocumentAdvancedFields, hasAdvancedFieldErrors } from './DocumentInfoSection';
import DocumentLinesSection from './DocumentLinesSection';
import DocumentPaymentsSection from './DocumentPaymentsSection';
import DocumentTotalsSection from './DocumentTotalsSection';

import { DocumentChainPanel } from '../components/DocumentChainPanel';
import { ReturnDocumentModal } from '../components/ReturnDocumentModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { ShippingInfoSection } from '../components/ShippingInfoSection';
import { PaymentTermsTable } from '../components/PaymentTermsTable';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';

import { useCommercialDocumentController } from '../hooks/useCommercialDocumentController';

interface CommercialDocumentPageProps {
  documentType: DocumentType | null;
  existingDocument?: Record<string, unknown>;
  /** العودة لقائمة/شاشة المستندات (تصفح راجع بدل إغلاق Modal) */
  onClose: () => void;
  onSaved: () => void;
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 * CommercialDocumentPage — صفحة كاملة (route-based) تحل محل
 * CommercialDocumentModal (index.tsx القديم)، على غرار Odoo/SAP:
 *
 *   ┌─ Topbar ثابت: عنوان + حالة واحدة + إجراءات (حفظ/طباعة/تصدير/المزيد)
 *   ├──────────────┬──────────────────────────────────────────
 *   │ Sidebar      │  toolbar الأسطر (باركود/إضافة/استيراد/أعمدة)
 *   │ 300px        │  ──────────────────────────────────────
 *   │ تمرير مستقل  │  جدول/بطاقات الأسطر — flex:1، تمرير مستقل
 *   │ معلومات+رصيد │
 *   │ +حقول إضافية │
 *   │ +دفعات       │
 *   │ ──────────── │
 *   │ إجماليات     │  ← مثبّتة أسفل الشريط الجانبي دوماً (بديل شريط
 *   │ (sticky)     │    عائم منفصل كان يكرر نفس الأرقام مرتين)
 *   └──────────────┴──────────────────────────────────────────
 *
 * إصلاحات مدمجة من التدقيق:
 * 1. useState لم يعد داخل IIFE أثناء الـ render (مخالفة قواعد Hooks) —
 *    alertsOpen أصبح في أعلى المكوّن.
 * 2. لا حاجة لـ focus trap / منع تمرير الخلفية — الصفحة الكاملة تُلغي
 *    مشكلة الـ Modal المُركَّب دوماً في الـ DOM حتى وهو مغلق.
 * 3. Escape يُغلق الصفحة بنفس شرط تعطيل زر الإلغاء تماماً (canDismiss)،
 *    فلا تضارب بين سلوك لوحة المفاتيح وزر الفوتر كما كان سابقاً.
 * 4. الحقول الإلزامية (مستودع/سنة مالية/عملة) تبقى داخل التبويب كما كانت،
 *    لكنها الآن ظاهرة مباشرة في الشريط الجانبي (لا "تبويب مخفي" بعيد عن
 *    النظر) — التبديل التلقائي عند الخطأ (hasAdvancedFieldErrors) أُبقي
 *    كخط دفاع ثانٍ فقط، وليس الاعتماد الوحيد.
 * ═══════════════════════════════════════════════════════════════════════
 */
export default function CommercialDocumentPage({
  documentType,
  existingDocument,
  onClose,
  onSaved,
}: CommercialDocumentPageProps) {

  const ctrl = useCommercialDocumentController({
    documentType,
    existingDocument,
    onClose,
    onSaved,
    // الصفحة تُركَّب فقط عند التنقّل الفعلي إليها (route)، بعكس الـ Modal
    // القديم الذي كان يبقى في الـ DOM دوماً ويتحكم بالظهور عبر opacity.
    active: true,
  });

  const {
    slug, qc, navigate, docCode, isPurchase, isEdit,
    lookups, lookupsReady, settingsApplyStamp,
    form, errors, lineErr, apiErr,
    set, handlePriceLevelChange,
    addLine, addLineWithProduct, removeLine, duplicateLine, updateLine,
    pmMode, payments,
    bulkAddLines, addPayment, addPaymentWithValues, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals,
    needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg,
    isLocked, isCancelled, isValidated,
    stockData, warehouseIdNum,
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
    showDeleteModal, setShowDeleteModal,
    deleteMut,
    handleSave, handleDelete, handleExport, handlePartyChangeWithWarning,
    isPending,
    isPartyExempt, partyOptions, priceLevelOptions,
    paymentModeOptions, treasuryAccountMap, selectedParty,
    stockBadge, paymentsExceedWarning, balanceWarning,
    savedDraft, draftKey, restoreDraft,
  } = ctrl;

  // ✅ تذكّر آخر تبويب مُستخدَم لكل نوع مستند على حدة
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

  // 🔧 إصلاح: كان هذا useState سابقاً داخل IIFE منفّذة أثناء JSX render —
  // مخالفة صريحة لقواعد الـ Hooks. أصبح الآن على مستوى المكوّن مثل بقيته.
  const [alertsOpen, setAlertsOpen] = useState(true);

  // 🔧 إصلاح: شرط تعطيل واحد موحّد (canDismiss) يُستخدم في Topbar وفي
  // مستمع Escape هنا معاً — بدل تضارب isPending فقط (الهيدر القديم) مقابل
  // isPending || successMsg (الفوتر القديم).
  const canDismiss = !isPending && !successMsg;

  if (!lookupsReady) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, height: '100vh', background: 'var(--bg1)',
      }}>
        <i className="ti ti-loader-2" style={{ fontSize: 32, color: 'var(--em)', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 13, color: 'var(--t3)' }}>{documentType?.name ?? 'جاري التحميل'}...</span>
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
        handleDelete={() => setShowDeleteModal(true)}
        onReturnClick={() => setShowReturnModal(true)}
        RETURNABLE_CODES={RETURNABLE_CODES}
      />

      {/* ═══ تنبيهات الحالة — قابلة للطي ═══ */}
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

      {/* رسائل عابرة — نجاح/خطأ API */}
      {(successMsg || apiErr) && (
        <div style={{ flexShrink: 0, padding: '8px 20px 0' }}>
          {successMsg && <AlertBanner type="success" message={successMsg} />}
          {apiErr && <AlertBanner type="error" message={apiErr} />}
        </div>
      )}

      {/* تحذير تغيير المتعامل */}
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

      {/* ═══ الجسم: شريط جانبي 300px (تمرير مستقل) + منطقة الأسطر ═══ */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>

        {/* ─── Sidebar ─── */}
        <div style={{
          width: 300, flexShrink: 0, borderLeft: '1px solid var(--b1)',
          background: 'var(--bg2)', display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

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
                    warehouses: lookups.warehouses,
                    fiscalYears: lookups.fiscalYears,
                    currencies: lookups.currencies,
                    priceLevels: lookups.priceLevels,
                  }}
                  qc={qc}
                  slug={slug}
                  warehouseIdNum={warehouseIdNum}
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
                  netToPay={totals.netToPay}
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
              affectsAccounting={documentType?.affects_accounting ?? false}
            />
          </div>

          {/* ─── الإجماليات: مثبّتة أسفل الشريط الجانبي دوماً — نسخة واحدة
               فقط بدل التكرار السابق (قسم كامل + شريط عائم منفصل) ─── */}
          <div style={{
            flexShrink: 0, borderTop: '1px solid var(--b1)',
            background: 'var(--bg2)', maxHeight: '55vh', overflowY: 'auto',
          }}>
            <DocumentTotalsSection
              totals={totals}
              payments={payments}
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
        </div>

        {/* ─── المنطقة الرئيسية: الأسطر فقط — تمرير مستقل بالكامل عن الشريط الجانبي ─── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 16 }}>
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
        </div>
      </div>

      {/* Bulk import */}
      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        products={lookups.products}
        onImport={(importedLines) => { bulkAddLines(importedLines); }}
      />

      {/* Modal المرتجع */}
      {showReturnModal && existingDocument && (
        <ReturnDocumentModal
          document={existingDocument}
          onCreated={(returnDoc) => {
            setShowReturnModal(false);
            const num = String((returnDoc as Record<string, unknown>).document_number ?? '');
            setSuccessMsg(`تم إنشاء المرتجع ${num} ✓`);
            if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
            setTimeout(() => { setSuccessMsg(''); onSaved(); onClose(); }, 1800);
          }}
          onClose={() => setShowReturnModal(false)}
        />
      )}

      {/* تأكيد الحذف */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => { setShowDeleteModal(false); deleteMut.mutate(); }}
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
    </div>
  );
}
