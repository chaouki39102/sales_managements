import React, { Suspense } from 'react';
import type { DocumentType } from '@/lib/api/core/types';
import { tenantKeys } from '@/lib/api/core/queryKeys';

const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));

import type { Tab } from '../components/DocumentUIPrimitives';
import { AlertBanner, Section } from '../components/DocumentUIPrimitives';
import {
  RETURNABLE_CODES, SHIPPING_CODES,
} from '../types/document.types';

import DocumentHeaderSection from './DocumentHeaderSection';
import DocumentInfoSection from './DocumentInfoSection';
import DocumentLinesSection from './DocumentLinesSection';
import DocumentPaymentsSection from './DocumentPaymentsSection';
import DocumentTotalsSection from './DocumentTotalsSection';
import DocumentFooter from './DocumentFooter';

import { DocumentChainPanel } from '../components/DocumentChainPanel';
import { ReturnDocumentModal } from '../components/ReturnDocumentModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { ShippingInfoSection } from '../components/ShippingInfoSection';
import { PaymentTermsTable } from '../components/PaymentTermsTable';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';

import { useCommercialDocumentController } from '../hooks/useCommercialDocumentController';

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

  const ctrl = useCommercialDocumentController({
    documentType,
    existingDocument,
    onClose,
    onSaved,
    active: open,
  });

  const {
    slug, qc, navigate, docCode, isPurchase, isEdit,
    lookups, lookupsReady, settingsApplyStamp,
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePriceLevelChange,
    addLine, addLineWithProduct, removeLine, duplicateLine, updateLine,
    pmMode, payments,
    bulkAddLines, addPayment, addPaymentWithValues, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg, clearPriceLevelSwitchMsg,
    isLocked, isCancelled, isValidated,
    stockData, warehouseIdNum,
    docNumber, docNumberErr, checkingDocNumber, handleDocNumberChange,
    partyChangeWarning, setPartyChangeWarning,
    showReturnModal, setShowReturnModal,
    showBulkImport, setShowBulkImport,
    extraTab, setExtraTab,
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

          {/* ═══ EXTRA TABS: الشحن والتسليم + شروط الدفع — مطوية افتراضياً ═══ */}
          {(() => {
            const extraTabs: Tab[] = [
              { key: 'payment-terms', label: 'شروط الدفع', icon: 'ti-coin' },
            ];
            if (SHIPPING_CODES.has(docCode)) {
              extraTabs.unshift({ key: 'shipping', label: 'الشحن والتسليم', icon: 'ti-truck-delivery' });
            }
            const single = extraTabs.length === 1 ? extraTabs[0] : null;

            return (
              <Section
                title={single ? single.label : 'الشحن وشروط الدفع'}
                icon={single ? single.icon : 'ti-truck-delivery'}
                collapsible
                defaultOpen={false}
              >
                {!single && (
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
                )}
                {(single ? single.key : extraTab) === 'shipping' ? (
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
            payments={payments}
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
