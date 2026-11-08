// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProModals.tsx
//
// Modals and drawers of POSProPage (customer search, payment, receipt,
// weight, session drawer, held carts, returns, keyboard help, manual product,
// session invoices, settings, manager PIN, camera scanner). Pure presentation:
// every value and handler comes from POSProPage.
// ════════════════════════════════════════════════════════════════════════════
import React, { Suspense } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { makeFakeVariant } from '@/pos/utils/posHelpers';
import { ttcToHt } from '@/pos/utils/calculations';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import type { PosAggregatedLookups } from '@/lib/api/endpoints/lookups';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { CompanyPreviewData } from '@/pages/settings/print-settings/types';
import type { PrintTemplate } from '@/pages/settings/print-settings/types/domain';
import type { CompleteSaleParams } from '@/pos/utils/posSaleHelpers';
import POSProWeightModal from '@/pos-pro/components/POSProWeightModal';
import POSProSessionDrawer from '@/pos-pro/components/POSProSessionDrawer';
import type { PosProState } from '@/pos-pro/hooks/usePosProDiscounts';
import type { PosProEditing } from '@/pos-pro/hooks/usePosProEditing';
import type { PosProUi } from '@/pos-pro/hooks/usePosProUiState';
import type { WeightTarget } from '@/pos-pro/hooks/usePosProCartActions';

const CustomerSearchModal = React.lazy(() => import('@/pos/components/CustomerSearchModal'));
const ProfessionalPaymentModal = React.lazy(() => import('@/pos/components/ProfessionalPaymentModal'));
const ProfessionalReceipt = React.lazy(() => import('@/pos/components/ProfessionalReceipt'));
const HeldCartsModal    = React.lazy(() => import('@/pos/components/HeldCartsModal'));
const ReturnsModal      = React.lazy(() => import('@/pos/components/ReturnsModal'));
const KeyboardHelpModal = React.lazy(() => import('@/pos/components/KeyboardHelpModal'));
const ManualProductModal   = React.lazy(() => import('@/pos/components/ManualProductModal'));
const SessionInvoicesModal = React.lazy(() => import('@/pos/components/SessionInvoicesModal'));
const POSSettingsModal     = React.lazy(() => import('@/pos/components/POSSettingsModal'));
const ManagerPinModal      = React.lazy(() => import('@/pos/components/ManagerPinModal'));
const BarcodeScannerModal  = React.lazy(() => import('@/components/BarcodeScannerModal'));

export interface POSProModalsProps {
  pos: PosProState;
  ui: PosProUi;
  editing: PosProEditing;
  settings: POSSettings;
  setSettings: (patch: Partial<POSSettings>) => void;
  resetSettings: () => void;
  safeToast: PosSafeToast;
  slug: string | null;
  queryClient: QueryClient;
  // lookups
  warehouses: PosAggregatedLookups['warehouses'];
  documentTypes: PosAggregatedLookups['documentTypes'];
  paymentModes: PosAggregatedLookups['paymentModes'];
  currencies: PosAggregatedLookups['currencies'];
  treasuryAccounts: PosAggregatedLookups['treasuryAccounts'];
  priceLevelsList: PosAggregatedLookups['priceLevels'];
  // payment / receipt
  adjustedTotalTtcFinal: number;
  clientCurrentBalance: number | undefined;
  handleCompleteSale: (params: CompleteSaleParams) => Promise<{ ok: boolean; message?: string; docNumber?: string }>;
  receiptSnapshotRef: React.MutableRefObject<POSSaleSnapshot | null>;
  posTemplate: PrintTemplate | null;
  companyData: CompanyPreviewData | null;
  handlePrintDirect: (snap: POSSaleSnapshot, opts?: { silent?: boolean }) => Promise<void>;
  // weight
  weightTarget: WeightTarget | null;
  setWeightTarget: (t: WeightTarget | null) => void;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>;
  // session
  currentSession: PosSession | null | undefined;
  /** id of the active warehouse (selected one, or the default) */
  drawerWarehouseId: number | null;
  setActiveWarehouseId: (id: number | null) => void;
  handleOpenInvoice: (docId: number) => Promise<void>;
  handlePrintDocument: (docId: number) => Promise<void>;
  restoreHeldIntoEditing: (id: string) => void;
  // settings
  systemFiscalStampEnabled: boolean;
  toggleFiscalStamp: (val: boolean) => Promise<void>;
  allowNegSetting: boolean;
  toggleAllowNegative: (val: boolean) => Promise<void>;
  dbDefaultPriceLevelId: number | null;
  saveDefaultPriceLevel: (id: number | null) => Promise<void>;
  handleCameraScan: (barcode: string) => void;
}

export default function POSProModals(props: POSProModalsProps) {
  const {
    pos, ui, editing, settings, setSettings, resetSettings, safeToast, slug, queryClient,
    warehouses, documentTypes, paymentModes, currencies, treasuryAccounts, priceLevelsList,
    adjustedTotalTtcFinal, clientCurrentBalance, handleCompleteSale,
    receiptSnapshotRef, posTemplate, companyData, handlePrintDirect,
    weightTarget, setWeightTarget, setSelectedItemId,
    currentSession, drawerWarehouseId, setActiveWarehouseId, handleOpenInvoice, handlePrintDocument,
    restoreHeldIntoEditing,
    systemFiscalStampEnabled, toggleFiscalStamp, allowNegSetting, toggleAllowNegative,
    dbDefaultPriceLevelId, saveDefaultPriceLevel, handleCameraScan,
  } = props;
  const { pinModal } = ui;
  const { editingDocumentId, editingDocumentDate, editingDocumentNumber, cartNote, editingPrevBalanceRef, editingDocMetaRef } = editing;

  return (
    <>
      {ui.customerModalOpen && (
        <Suspense fallback={null}>
          <CustomerSearchModal
            currentClient={pos.client}
            onSelect={(c) => {
              pos.setClient(c);
              // أعد فحص رصيد الزبون فوراً عند تغيير الزبون (يُكسر كاش الـ 30 ثانية)
              if (c?.id) {
                queryClient.invalidateQueries({ queryKey: tenantKeys.partyBalances.detail(slug ?? '', c.id) });
                queryClient.invalidateQueries({ queryKey: tenantKeys.parties.detail(slug ?? '', c.id) });
              }
              ui.setCustomerModalOpen(false);
            }}
            onClose={() => ui.setCustomerModalOpen(false)}
          />
        </Suspense>
      )}

      {ui.paymentOpen && (
        <Suspense fallback={null}>
          <ProfessionalPaymentModal
            totals={pos.totals}
            client={pos.client}
            paymentModes={paymentModes}
            documentTypes={documentTypes}
            currencies={currencies}
            treasuryAccounts={treasuryAccounts}
            totalTtcFinal={adjustedTotalTtcFinal}
            existingPayments={pos.payments}
            documentDate={editingDocumentDate ?? new Date().toISOString().slice(0, 10)}
            isEditing={!!editingDocumentId}
            prevBalance={editingDocumentId ? (editingPrevBalanceRef.current ?? undefined) : (clientCurrentBalance ?? undefined)}
            defaultPaymentCode={settings.defaultPaymentCode}
            defaultDocTypeCode={settings.defaultDocTypeCode}
            initialDueDate={editingDocMetaRef.current?.dueDate}
            initialTypeCode={editingDocMetaRef.current?.typeCode}
            initialCurrencyId={editingDocMetaRef.current?.currencyId}
            initialNote={cartNote}
            documentNumber={editingDocumentNumber}
            onClose={() => ui.setPaymentOpen(false)}
            onConfirm={handleCompleteSale}
          />
        </Suspense>
      )}

      {ui.receiptOpen && receiptSnapshotRef.current && posTemplate && (
        <Suspense fallback={null}>
          <ProfessionalReceipt
            template={posTemplate}
            company={companyData}
            source={{ type: 'pos-snapshot', snapshot: receiptSnapshotRef.current } as PipelineSource}
            docNumber={receiptSnapshotRef.current.docNumber}
            onClose={() => ui.setReceiptOpen(false)}
            onPrint={() => { const snap = receiptSnapshotRef.current; if (snap) handlePrintDirect(snap); }}
            onNewSale={() => { ui.setReceiptOpen(false); if (settings.openClientOnNewSale) ui.setCustomerModalOpen(true); }}
          />
        </Suspense>
      )}

      {weightTarget && (
        <POSProWeightModal
          open
          name={weightTarget.mode === 'add'
            ? weightTarget.variant.product?.name ?? ''
            : weightTarget.item.product_name}
          unitSymbol={weightTarget.mode === 'add'
            ? weightTarget.variant.unit?.symbol ?? weightTarget.variant.unit?.abbreviation ?? 'كغ'
            : weightTarget.item.unit_symbol}
          priceHtPerKg={weightTarget.mode === 'add'
            ? weightTarget.variant.default_selling_price_ht
            : weightTarget.item.unit_price_ht / (weightTarget.item.pack_qty ?? 1)}
          quantityDiscounts={weightTarget.mode === 'add'
            ? weightTarget.variant.quantity_discounts
            : weightTarget.item.quantity_discounts}
          initialKg={weightTarget.mode === 'edit' ? weightTarget.item.quantity : undefined}
          confirmLabel={weightTarget.mode === 'edit' ? 'تحديث الوزن' : 'إضافة بالسلة'}
          onConfirm={(kg) => {
            if (weightTarget.mode === 'add') {
              const addedId = pos.addItem(weightTarget.variant, kg);
              if (addedId) setSelectedItemId(addedId);
              safeToast.success(weightTarget.variant.product?.name ?? 'تمت الإضافة', { id: 'pos-pro-last-added', duration: 1500 });
            } else {
              pos.updateQty(weightTarget.item.id, kg);
            }
          }}
          onClose={() => setWeightTarget(null)}
        />
      )}

      {ui.sessionOpen && (
        <POSProSessionDrawer
          session={currentSession ?? null}
          warehouses={warehouses ?? []}
          warehouseId={drawerWarehouseId}
          onWarehouseChange={(id) => setActiveWarehouseId(id)}
          onClose={() => ui.setSessionOpen(false)}
          onClosed={() => { pos.clearCart(); pos.setInvoiceDiscountPct(0); }}
        />
      )}

      {ui.heldOpen && (
        <Suspense fallback={null}>
          <HeldCartsModal
            carts={pos.heldCarts}
            onClose={() => ui.setHeldOpen(false)}
            onRestore={(id) => {
              restoreHeldIntoEditing(id);
              ui.setHeldOpen(false);
            }}
            onDelete={pos.deleteHeldCart}
          />
        </Suspense>
      )}

      {ui.returnsOpen && (
        <Suspense fallback={null}>
          <ReturnsModal
            sessionId={currentSession?.id ?? null}
            onClose={() => ui.setReturnsOpen(false)}
            onDone={() => ui.setReturnsOpen(false)}
          />
        </Suspense>
      )}

      {ui.helpOpen && (
        <Suspense fallback={null}>
          <KeyboardHelpModal onClose={() => ui.setHelpOpen(false)} />
        </Suspense>
      )}

      {ui.manualOpen && (
        <Suspense fallback={null}>
          <ManualProductModal
            onClose={() => ui.setManualOpen(false)}
            onAdd={(name, priceTtc, qty, tvaRate) => {
              const addedId = pos.addItem(makeFakeVariant(name, ttcToHt(priceTtc, tvaRate), tvaRate), qty);
              if (addedId) setSelectedItemId(addedId);
              ui.setManualOpen(false);
            }}
          />
        </Suspense>
      )}

      {ui.showSessionInvoices && currentSession && (
        <Suspense fallback={null}>
          <SessionInvoicesModal
            session={currentSession}
            onClose={() => ui.setShowSessionInvoices(false)}
            onOpen={handleOpenInvoice}
            onPrint={handlePrintDocument}
          />
        </Suspense>
      )}

      {ui.showSettings && (
        <Suspense fallback={null}>
          <POSSettingsModal
            settings={settings}
            onSave={setSettings}
            onReset={resetSettings}
            onClose={() => ui.setShowSettings(false)}
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
            onSuccess={() => { pinModal.onSuccess(); ui.setPinModal(null); }}
            onCancel={() => ui.setPinModal(null)}
            verifyPin={(pin) => pin === settings.managerPin}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <BarcodeScannerModal
          open={ui.showScanner}
          onScan={handleCameraScan}
          onClose={() => ui.setShowScanner(false)}
        />
      </Suspense>
    </>
  );
}
