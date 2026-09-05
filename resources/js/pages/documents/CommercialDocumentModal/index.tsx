import React, { Suspense, useState, useEffect } from 'react';
import type { DocumentType } from '@/lib/api/core/types';
import { tenantKeys } from '@/lib/api/core/queryKeys';

const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));

import type { Tab } from '../components/DocumentUIPrimitives';
import { Tabs, AlertBanner } from '../components/DocumentUIPrimitives';
import {
  RETURNABLE_CODES, SHIPPING_CODES,
} from '../types/document.types';

import DocumentHeaderSection from './DocumentHeaderSection';
import DocumentInfoSection, { DocumentAdvancedFields, hasAdvancedFieldErrors } from './DocumentInfoSection';
import DocumentStickyTotalsBar from './DocumentStickyTotalsBar';
import DocumentLinesSection from './DocumentLinesSection';
import DocumentPaymentsSection from './DocumentPaymentsSection';
import DocumentTotalsSection from './DocumentTotalsSection';
import DocumentFooter from './DocumentFooter';

import { DocumentChainPanel } from '../components/DocumentChainPanel';
import { ReturnDocumentModal } from '../components/ReturnDocumentModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { ShippingInfoSection } from '../components/ShippingInfoSection';
import { PaymentTermsTable } from '../components/PaymentTermsTable';
import { DocPrefsTab } from '../components/DocPrefsTab';
import { DocEditorPrefsTab } from '../components/DocEditorPrefsTab';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

import { useCommercialDocumentController } from '../hooks/useCommercialDocumentController';
import { getDocPref } from '../utils/docPrefs';
import { isOfflineQueuedResponse } from '@/lib/offline/queueMath';

interface CommercialDocumentModalProps {
  open:               boolean;
  documentType:       DocumentType | null;
  existingDocument?:  Record<string, unknown>;
  onClose:            () => void;
  onSaved:            () => void;
}

export default function CommercialDocumentModal({
  open,
  documentType,
  existingDocument,
  onClose,
  onSaved,
}: CommercialDocumentModalProps) {

  const [alertsOpen, setAlertsOpen] = React.useState(true);
  const { confirm, confirmDialogProps } = useConfirm();

  const ctrl = useCommercialDocumentController({
    documentType,
    existingDocument,
    onClose,
    onSaved,
    active: open,
  });

  const {
    slug, qc, navigate, docCode, isPurchase, isEdit,
    lookups, lookupsReady,
    form, errors, lineErr, apiErr,
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
    stockData, warehouseIdNum,
    docNumber, docNumberErr, checkingDocNumber, handleDocNumberChange,
    partyChangeWarning, setPartyChangeWarning,
    showReturnModal, setShowReturnModal,
    showBulkImport, setShowBulkImport,
    chain, isLoadingChain, convertMutation, allowedTargets,
    creditCheck, isLoadingCredit,
    customerInsights, isLoadingInsights,
    advancePayments, isLoadingAdvances,
    successMsg, setSuccessMsg,
    companyInfo, printTemplates,
    selectedTemplateId, setSelectedTemplateId, selectedTemplate,
    printModalOpen, setPrintModalOpen, handlePrint,
    visibleCols, canViewCost, lineMode, setLineMode,
    deleteConfirm,
    handleSave, handleDelete, handleExport, handlePartyChangeWithWarning,
    handleQuickCreateParty, creatingParty,
    partyTypes,
    isPending,
    isPartyExempt, partyOptions, priceLevelOptions,
    paymentModeOptions, treasuryAccountMap, selectedParty,
    stockBadge, paymentsExceedWarning, balanceWarning,
    savedDraft, draftKey, restoreDraft, discardDraft,
  } = ctrl;

  // ── إنشاء منتج سريع من بحث المنتجات ──────────────────────────────────────
  const handleQuickCreateProduct = React.useCallback(async (payload: import('../components/ProductSearch').QuickCreatePayload) => {
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
      if (slug) {
        await qc.invalidateQueries({ queryKey: [slug, 'modal-products-v3'] });
        await qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
      }
      if (saved && (saved as any).id) {
        addLineWithProduct(String((saved as any).id), payload.purchase_price_ht);
      }
    } catch (err) {
      console.error('Quick create product failed:', err);
      throw err;
    }
  }, [slug, qc, addLineWithProduct]);

  // ✅ تذكّر آخر تبويب مُستخدَم لكل نوع مستند على حدة — يخدم سير العمل المتكرر
  const DOC_TAB_KEY = `doc-tab:${docCode}`;
  const [extraTab, setExtraTabState] = useState<string>(() => {
    try { return localStorage.getItem(DOC_TAB_KEY) || 'advanced'; }
    catch { return 'advanced'; }
  });
  const setExtraTab = (key: string) => {
    setExtraTabState(key);
    try { localStorage.setItem(DOC_TAB_KEY, key); } catch {}
  };
  // ✅ فتح تلقائي لتبويب "خيارات إضافية" لو ظهر خطأ تحقق بداخله
  useEffect(() => {
    if (hasAdvancedFieldErrors(errors) && extraTab !== 'advanced') {
      setExtraTab('advanced');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors.warehouse_id, errors.fiscal_year_id, errors.currency_id]);

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

        {/* ═══ INFO ALERTS — قابلة للطي ═══ */}
        {(() => {
          const infoAlerts: Array<{ type: 'warning' | 'error' | 'info'; message: string }> = [];
          if (priceLevelSwitchMsg) {
            infoAlerts.push({
              type: 'warning',
              message: `المنتج "${priceLevelSwitchMsg.productName}" ليس له سعر في فئة "${priceLevelSwitchMsg.from}"، تم التبديل إلى "${priceLevelSwitchMsg.to}".`,
            });
          }
          if (isCancelled) {
            infoAlerts.push({ type: 'error', message: 'هذا المستند ملغى — جميع الحقول معطلة.' });
          }
          if (isLocked && !isCancelled) {
            infoAlerts.push({ type: 'warning', message: 'هذا المستند مقفل. لا يمكن تعديله حتى يتم فك القفل من قِبل المسؤول.' });
          }
          if (pmMode === 'additive' && !isLocked) {
            infoAlerts.push({ type: 'info', message: 'المستند معتمد — الأسطر محمية من التعديل. يمكنك فقط إضافة دفعات جديدة.' });
          }
          if (infoAlerts.length === 0) return null;

          return (
            <div style={{
              flexShrink: 0, borderBottom: '1px solid var(--b1)',
              background: 'var(--bg2)',
            }}>
              <button
                onClick={() => setAlertsOpen(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'var(--t4)', fontSize: 11, fontWeight: 600,
                  fontFamily: 'inherit', textAlign: 'right',
                }}
              >
                <i className={`ti ti-chevron-${alertsOpen ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
                {alertsOpen ? 'إخفاء التنبيهات' : `${infoAlerts.length} تنبيه`}
              </button>
              {alertsOpen && (
                <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {infoAlerts.map((a, i) => (
                    <AlertBanner key={i} type={a.type} message={a.message} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ BODY ═══ */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>

          {/* Alerts عابرة — دائماً ظاهرة */}
          {successMsg         && <AlertBanner type="success" message={successMsg} />}
          {apiErr             && <AlertBanner type="error"   message={apiErr} />}

          {/* سلسلة المستندات */}
          {isEdit && (
            <DocumentChainPanel
              chain={chain}
              isLoading={isLoadingChain}
              currentId={Number(existingDocument?.id)}
              allowedTargets={allowedTargets}
              isReadOnly={isReadOnly}
              onConvert={async (targetCode) => {
                if (!await confirm(`تحويل هذا المستند إلى ${targetCode}؟`)) return;
                convertMutation.mutate(
                  { documentId: Number(existingDocument!.id), targetTypeCode: targetCode },
                  { onSuccess: () => { onSaved(); onClose(); } },
                );
              }}
              onNavigate={(node) => {
                onClose();
                navigate(`/documents/${node.document_type}/${node.id}/edit`);
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
              warehouses: lookups.warehouses as Array<{ id: number; name: string; is_default?: boolean }>,
              fiscalYears: lookups.fiscalYears as Array<{ id: number; name: string; is_current?: boolean; is_closed?: boolean }>,
              currencies: lookups.currencies as Array<{ id: number; code: string; name: string; is_base_currency?: boolean }>,
              priceLevels: lookups.priceLevels as Array<{ id: number; name: string }>,
            }}
            partyBalance={partyBalance}
            isLoadingBalance={isLoadingBalance}
            selectedParty={selectedParty}
            creditCheck={creditCheck ?? null}
            isLoadingCredit={isLoadingCredit}
            customerInsights={customerInsights ?? null}
            isLoadingInsights={isLoadingInsights}
            balanceWarning={balanceWarning}
            qc={qc}
            slug={slug}
            warehouseIdNum={warehouseIdNum}
            partyTypes={partyTypes}
            onQuickCreateParty={handleQuickCreateParty}
            creatingParty={creatingParty}
          />

          {/* ═══ خيارات إضافية + الشحن + شروط الدفع — شريط تبويب واحد،
               بدون أي إزاحة تخطيط (reflow) عند التبديل، ويتذكر آخر تبويب
               مُستخدَم لكل نوع مستند ═══ */}
          {(() => {
            const docTabs: Tab[] = [
              { key: 'advanced', label: 'خيارات إضافية', icon: 'ti-adjustments' },
              { key: 'line-entry', label: 'الإدخال السريع', icon: 'ti-zap' },
              { key: 'editor-prefs', label: 'المحرر', icon: 'ti-adjustments-horizontal' },
            ];
            if (SHIPPING_CODES.has(docCode)) {
              docTabs.push({ key: 'shipping', label: 'الشحن والتسليم', icon: 'ti-truck-delivery' });
            }
            docTabs.push({ key: 'payment-terms', label: 'شروط الدفع', icon: 'ti-coin' });

            return (
              <div style={{ marginBottom: 20 }}>
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
                  {extraTab === 'line-entry' && (
                    <DocPrefsTab />
                  )}
                  {extraTab === 'editor-prefs' && (
                    <DocEditorPrefsTab slug={slug} />
                  )}
                  {extraTab === 'payment-terms' && (
                    <PaymentTermsTable
                      terms={form.payment_terms}
                      netToPay={totals.netToPay ?? 0}
                      disabled={isReadOnly}
                      onChange={(terms) => set('payment_terms', terms)}
                    />
                  )}
                </Tabs>
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
            canViewCost={canViewCost}
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
            slug={slug}
            warehouses={lookups.warehouses as Array<{ id: number; name: string }>}
            onQuickCreate={handleQuickCreateProduct}
            productTypes={lookups.productTypes}
            tvas={lookups.tvas}
            units={lookups.units}
            bulkAddLines={bulkAddLines}
            fillFromLastDoc={isPurchase ? undefined : () => fillFromLastDoc()}
            fillLastLoading={fillLastLoading}
          />

          {/* ═══ SECTION 3: الدفعات ═══ */}
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

          {/* ═══ SECTION 4: الإجماليات ═══ */}
          <div id="doc-totals-anchor">
            <DocumentTotalsSection
              totals={totals}
              payments={payments}
              partyBalance={partyBalance}
              form={form}
              selectedParty={selectedParty as any}
              isPurchase={isPurchase}
              isEdit={isEdit}
              existingDocument={existingDocument}
            />
          </div>
        </div>

        {/* ═══ شريط الإجمالي الثابت — خارج منطقة التمرير أعلاه تماماً ═══ */}
        <DocumentStickyTotalsBar
          totals={totals}
          payments={payments}
          linesCount={form.lines.length}
        />

        {/* ═══ FOOTER ═══ */}
        <DocumentFooter
          form={form}
          totals={totals}
          payments={payments}
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
          onReturnClick={() => setShowReturnModal(true)}
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
            setSuccessMsg(
              isOfflineQueuedResponse(returnDoc)
                ? `أُضيف المرتجع إلى قائمة الانتظار — سيُحفظ عند توفر الاتصال (${num})`
                : `تم إنشاء المرتجع ${num} ✓`,
            );
            if (slug) {
              qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
            }
            setTimeout(() => { setSuccessMsg(''); onSaved(); onClose(); }, 1800);
          }}
          onClose={() => setShowReturnModal(false)}
        />
      )}

      {/* تأكيد الحذف */}

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
            prevBalance={partyBalance?.current_balance ?? 0}
            newBalance={partyBalance?.current_balance ?? 0}
            copies={getDocPref('printCopies', slug)}
          />
        </Suspense>
      )}

      <ConfirmDialog {...confirmDialogProps} />
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — حاوية دائمة في DOM مع تحكم CSS بالظهور
  // الجسد الثقيل (الحقول/الأسطر/الكاميرا) يُزال من DOM عند الإغلاق لتجنّب تكرار
  // عناصر مخفية في كل صفحة (مثل زر الكاميرا و BarcodeInput)؛ يُبقى 250ms فقط
  // بعد الإغلاق حتى تكتمل حركة الخروج، والحالة (form/lookups) محفوظة في الكنترولر
  // والمسودات في localStorage فلا نفقد شيئاً عند إعادة الفتح.
  // ════════════════════════════════════════════════════════════════════════════

  const [bodyMounted, setBodyMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setBodyMounted(true);
      return;
    }
    const t = setTimeout(() => setBodyMounted(false), 250);
    return () => clearTimeout(t);
  }, [open]);

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
      {bodyMounted ? modalContent : null}
    </div>
  );
}
