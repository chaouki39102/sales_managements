// ════════════════════════════════════════════════════════════════════════════
// pages/pos/components/POSPageModals.tsx
//
// All lazily-loaded modals of POSPage (payment, held carts, receipt, manual
// product, qty, weight, session invoices / stats, returns, keyboard help,
// settings, manager PIN, camera scanner). Pure presentation — every handler
// and value comes from POSPage.
// ════════════════════════════════════════════════════════════════════════════
import React, { Suspense } from 'react';
import type { ActiveModal } from '@/pos/utils/posHelpers';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import type { PosAggregatedLookups } from '@/lib/api/endpoints/lookups';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { CompanyPreviewData } from '@/pages/settings/print-settings/types';
import type { PrintTemplate } from '@/pages/settings/print-settings/types/domain';
import type { ProductVariant } from '@/types';
import type { CompleteSaleParams, PinModalRequest, PosState } from '../hooks/posPageTypes';
import type { usePosModalHandlers } from '../hooks/usePosModalHandlers';
import type { EditingDocMeta } from '../hooks/usePosEditingState';

const BarcodeScannerModal = React.lazy(() => import('@/components/BarcodeScannerModal'));
const ProfessionalPaymentModal = React.lazy(() => import('@/pos/components/ProfessionalPaymentModal'));
const HeldCartsModal           = React.lazy(() => import('@/pos/components/HeldCartsModal'));
const ProfessionalReceipt      = React.lazy(() => import('@/pos/components/ProfessionalReceipt'));
const ManualProductModal       = React.lazy(() => import('@/pos/components/ManualProductModal'));
const QtySetModal              = React.lazy(() => import('@/pos/components/QtySetModal'));
const SessionStatsModal        = React.lazy(() => import('@/pos/components/SessionStatsModal'));
const ReturnsModal             = React.lazy(() => import('@/pos/components/ReturnsModal'));
const WeightEntryModal         = React.lazy(() => import('@/pos/components/WeightEntryModal'));
const SessionInvoicesModal     = React.lazy(() => import('@/pos/components/SessionInvoicesModal'));
const KeyboardHelpModal        = React.lazy(() => import('@/pos/components/KeyboardHelpModal'));
const POSSettingsModal          = React.lazy(() => import('@/pos/components/POSSettingsModal'));
const ManagerPinModal           = React.lazy(() => import('@/pos/components/ManagerPinModal'));

export interface POSPageModalsProps {
  pos: PosState;
  settings: POSSettings;
  setSettings: (patch: Partial<POSSettings>) => void;
  resetSettings: () => void;
  modal: ActiveModal;
  setModal: React.Dispatch<React.SetStateAction<ActiveModal>>;
  handlers: ReturnType<typeof usePosModalHandlers>;
  // lookups
  warehouses: PosAggregatedLookups['warehouses'];
  documentTypes: PosAggregatedLookups['documentTypes'];
  paymentModes: PosAggregatedLookups['paymentModes'];
  currencies: PosAggregatedLookups['currencies'];
  treasuryAccounts: PosAggregatedLookups['treasuryAccounts'];
  priceLevelsList: PosAggregatedLookups['priceLevels'];
  // payment
  adjustedTotalTtcFinal: number;
  editingDocumentId: number | null;
  editingDocumentDate: string | null;
  editingDocumentNumber: string | null;
  editingPrevBalanceRef: React.MutableRefObject<number | undefined>;
  editingDocMetaRef: React.MutableRefObject<EditingDocMeta | null>;
  clientCurrentBalance: number | undefined;
  cartNote: string;
  handleCompleteSale: (params: CompleteSaleParams) => Promise<{ ok: boolean; message?: string; docNumber?: string }>;
  // receipt
  receiptSnapshot: POSSaleSnapshot | null;
  receiptSource: PipelineSource | null;
  posTemplate: PrintTemplate | null;
  companyData: CompanyPreviewData | null;
  handlePrintDirect: (snap: POSSaleSnapshot, opts?: { silent?: boolean }) => Promise<void>;
  // qty / weight
  selectedCartItemId: string | null;
  weightModalVariant: React.MutableRefObject<ProductVariant | null>;
  weightEditItemId: React.MutableRefObject<string | null>;
  // session
  currentSession: PosSession | null | undefined;
  showSessionInvoices: boolean;
  setShowSessionInvoices: (open: boolean) => void;
  setShowCloseSession: (open: boolean) => void;
  handleOpenInvoice: (docId: number) => Promise<void>;
  handlePrintDocument: (docId: number) => Promise<void>;
  // settings
  showSettings: boolean;
  setShowSettings: (open: boolean) => void;
  systemFiscalStampEnabled: boolean;
  toggleFiscalStamp: (val: boolean) => Promise<void>;
  allowNegSetting: boolean;
  toggleAllowNegative: (val: boolean) => Promise<void>;
  dbDefaultPriceLevelId: number | null;
  saveDefaultPriceLevel: (id: number | null) => Promise<void>;
  // pin / scanner
  pinModal: PinModalRequest;
  setPinModal: (req: PinModalRequest) => void;
  showScanner: boolean;
  setShowScanner: (open: boolean) => void;
  handleCameraScan: (barcode: string) => void;
}

export default function POSPageModals(props: POSPageModalsProps) {
  const {
    pos, settings, setSettings, resetSettings, modal, setModal, handlers,
    warehouses, documentTypes, paymentModes, currencies, treasuryAccounts, priceLevelsList,
    adjustedTotalTtcFinal, editingDocumentId, editingDocumentDate, editingDocumentNumber,
    editingPrevBalanceRef, editingDocMetaRef, clientCurrentBalance, cartNote, handleCompleteSale,
    receiptSnapshot, receiptSource, posTemplate, companyData, handlePrintDirect,
    selectedCartItemId, weightModalVariant, weightEditItemId,
    currentSession, showSessionInvoices, setShowSessionInvoices, setShowCloseSession,
    handleOpenInvoice, handlePrintDocument,
    showSettings, setShowSettings, systemFiscalStampEnabled, toggleFiscalStamp, allowNegSetting,
    toggleAllowNegative, dbDefaultPriceLevelId, saveDefaultPriceLevel,
    pinModal, setPinModal, showScanner, setShowScanner, handleCameraScan,
  } = props;

  return (
    <>
      {modal === 'payment' && (
        <Suspense fallback={null}>
          <ProfessionalPaymentModal
            totals={pos.totals} client={pos.client}
            paymentModes={paymentModes ?? []}
            documentTypes={documentTypes ?? []}
            currencies={currencies ?? []}
            treasuryAccounts={treasuryAccounts ?? []}
            totalTtcFinal={adjustedTotalTtcFinal}
            existingPayments={pos.payments}
            isEditing={editingDocumentId !== null}
            documentDate={editingDocumentDate ?? new Date().toISOString().slice(0, 10)}
            prevBalance={editingDocumentId ? editingPrevBalanceRef.current : clientCurrentBalance}
            defaultPaymentCode={settings.defaultPaymentCode}
            defaultDocTypeCode={settings.defaultDocTypeCode}
            initialDueDate={editingDocMetaRef.current?.dueDate}
            initialTypeCode={editingDocMetaRef.current?.typeCode}
            initialCurrencyId={editingDocMetaRef.current?.currencyId}
            initialNote={cartNote}
            documentNumber={editingDocumentNumber}
            onClose={() => setModal('none')}
            onConfirm={handleCompleteSale}
          />
        </Suspense>
      )}

      {modal === 'held' && (
        <Suspense fallback={null}>
          <HeldCartsModal
            carts={pos.heldCarts} onClose={() => setModal('none')}
            onRestore={handlers.handleHeldRestore}
            onDelete={pos.deleteHeldCart}
            onRestoreAndPay={handlers.handleHeldRestoreAndPay}
          />
        </Suspense>
      )}

      {modal === 'receipt' && receiptSnapshot && receiptSource && posTemplate && (
        <Suspense fallback={null}>
          <ProfessionalReceipt
            template={posTemplate}
            company={companyData}
            source={receiptSource}
            docNumber={receiptSnapshot.docNumber}
            onClose={handlers.handleReceiptClose}
            onPrint={() => { handlePrintDirect(receiptSnapshot); }}
            onNewSale={handlers.handleReceiptNewSale}
          />
        </Suspense>
      )}

      {modal === 'manual' && (
        <Suspense fallback={null}>
          <ManualProductModal
            onClose={() => setModal('none')}
            onAdd={handlers.handleManualAdd}
          />
        </Suspense>
      )}

      {modal === 'qty' && selectedCartItemId && (
        <Suspense fallback={null}>
          <QtySetModal
            item={pos.items.find(i => i.id === selectedCartItemId)!}
            onClose={handlers.handleQtyClose}
            onConfirm={handlers.handleQtyConfirm}
          />
        </Suspense>
      )}

      {modal === 'weight' && weightModalVariant.current && (
        <Suspense fallback={null}>
          <WeightEntryModal
            productName={weightModalVariant.current.product?.name ?? weightModalVariant.current.variant_name ?? ''}
            unitSymbol={weightModalVariant.current.unit?.abbreviation ?? 'كغ'}
            unitPrice={weightModalVariant.current.default_selling_price_ht ?? 0}
            initialWeight={weightEditItemId.current ? (pos.items.find(i => i.id === weightEditItemId.current)?.quantity ?? undefined) : undefined}
            quantityDiscounts={weightModalVariant.current.quantity_discounts}
            onClose={handlers.handleWeightClose}
            onConfirm={handlers.handleWeightConfirm}
          />
        </Suspense>
      )}

      {showSessionInvoices && currentSession && (
        <Suspense fallback={null}>
          <SessionInvoicesModal
            session={currentSession}
            onClose={() => setShowSessionInvoices(false)}
            onOpen={handleOpenInvoice}
            onPrint={handlePrintDocument}
          />
        </Suspense>
      )}

      {modal === 'session' && currentSession && (
        <Suspense fallback={null}>
          <SessionStatsModal
            session={currentSession}
            onClose={() => setModal('none')}
            onEndSession={() => { setModal('none'); setShowCloseSession(true); }}
          />
        </Suspense>
      )}

      {modal === 'returns' && (
        <Suspense fallback={null}>
          <ReturnsModal
            sessionId={currentSession?.id ?? null}
            onClose={() => setModal('none')}
            onDone={() => setModal('none')}
          />
        </Suspense>
      )}

      {modal === 'kbhelp' && (
        <Suspense fallback={null}>
          <KeyboardHelpModal onClose={() => setModal('none')} />
        </Suspense>
      )}

      {showSettings && (
        <Suspense fallback={null}>
          <POSSettingsModal
            settings={settings}
            onSave={setSettings}
            onReset={resetSettings}
            onClose={() => setShowSettings(false)}
            warehouses={warehouses ?? []}
            documentTypes={documentTypes ?? []}
            paymentModes={paymentModes ?? []}
            priceLevels={priceLevelsList}
            systemFiscalStampEnabled={systemFiscalStampEnabled}
            onToggleFiscalStamp={toggleFiscalStamp}
            systemAllowNegativeStock={allowNegSetting}
            onToggleAllowNegative={toggleAllowNegative}
            defaultPriceLevelId={dbDefaultPriceLevelId}
            onSaveDefaultPriceLevel={saveDefaultPriceLevel}
          />
        </Suspense>
      )}

      {pinModal && (
        <Suspense fallback={null}>
          <ManagerPinModal
            requestedDiscount={pinModal.requestedDiscount}
            threshold={pinModal.reason === 'max_exceeded' ? settings.maxDiscountPct : settings.discountPinThreshold}
            reason={pinModal.reason}
            onSuccess={() => { pinModal.onSuccess(); setPinModal(null); }}
            onCancel={() => setPinModal(null)}
            verifyPin={pin => pin === settings.managerPin}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <BarcodeScannerModal
          open={showScanner}
          onScan={handleCameraScan}
          onClose={() => setShowScanner(false)}
        />
      </Suspense>
    </>
  );
}
