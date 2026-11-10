// ════════════════════════════════════════════════════════════════════════════
// pages/pos/POSPage.tsx
//
// Classic POS screen. The page wires the POS hooks together and lays out the
// screen; the logic lives in `pages/pos/hooks/*` (session, catalogue, filters,
// cart clear/undo, invoice reopen, discounts, printing, checkout, add item,
// barcode scanner, modal handlers) and the large JSX blocks in
// `pages/pos/components/*`.
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { usePOS }             from '@/pos/hooks/usePOS';
import { usePOSAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui';
import type { ActiveModal } from '@/pos/utils/posHelpers';
import type { ProductVariant } from '@/types';

import POSTopBar                from '@/pos/components/POSTopBar';
import QuickItemsBar            from '@/pos/components/QuickItemsBar';
import MobileTabs               from '@/pos/components/MobileTabs';
import ProfessionalCart, { type ProfessionalCartHandle } from '@/pos/components/ProfessionalCart';
import { usePOSSettings } from '@/pos/hooks/usePOSSettings';
import { useKbOverrides } from '@/pos/hooks/useKeyboardMap';
import { useKeyboardShortcuts } from '@/pos/hooks/useKeyboardShortcuts';
import { usePosSafeToast } from '@/pos/hooks/usePosSafeToast';
import { usePosSystemSettingToggles } from '@/pos/hooks/usePosSystemSettingToggles';
import { openCashDrawerSmart } from '@/pos/utils/thermalPrint';
import { parseLookupBool } from '@/pos/utils/posSaleHelpers';

import type { PinModalRequest } from './hooks/posPageTypes';
import { usePosSession }         from './hooks/usePosSession';
import { usePosCartGuards }      from './hooks/usePosCartGuards';
import { usePosLayout }          from './hooks/usePosLayout';
import { usePosEditingState, usePosReceiptState } from './hooks/usePosEditingState';
import { usePosQuickItems }      from './hooks/usePosQuickItems';
import { usePosFocusEffects }    from './hooks/usePosFocusEffects';
import { usePosSearchCommand }   from './hooks/usePosSearchCommand';
import { usePosReferenceData }   from './hooks/usePosReferenceData';
import { usePosCatalog }         from './hooks/usePosCatalog';
import { usePosFilterState, usePosFilteredVariants } from './hooks/usePosProductFilter';
import { usePosClearCart }       from './hooks/usePosClearCart';
import { usePosInvoiceLoader }   from './hooks/usePosInvoiceLoader';
import { usePosTotals }          from './hooks/usePosTotals';
import { usePosDiscounts }       from './hooks/usePosDiscounts';
import { usePosPrinting }        from './hooks/usePosPrinting';
import { usePosCheckout }        from './hooks/usePosCheckout';
import { usePosAddItem, usePosSearchNavigation } from './hooks/usePosAddItem';
import { usePosBarcodeScanner }  from './hooks/usePosBarcodeScanner';
import { usePosModalHandlers }   from './hooks/usePosModalHandlers';
import POSSessionModals          from './components/POSSessionModals';
import POSProductsPanel          from './components/POSProductsPanel';
import POSPageModals             from './components/POSPageModals';

function POSPage() {
  const queryClient = useQueryClient();
  const slug        = useActiveSlug();
  const { settings, setSettings, resetSettings } = usePOSSettings(slug);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Aggregated lookups — single HTTP for all lookup tables + settings ──
  const { data: posLookups } = usePOSAggregatedLookups();
  const systemFiscalStampEnabled = parseLookupBool(posLookups?.settings?.fiscal_stamp_enabled, true);
  const pos         = usePOS(systemFiscalStampEnabled);
  const posRef      = useRef(pos);
  posRef.current    = pos;
  const fiscalYear  = useSelectedFiscalYear();
  const company     = useActiveCompany();
  const navigate    = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Toast proxy: no-op when disabled ──────────────────────────────────
  const safeToast = usePosSafeToast(settings.toastEnabled);

  const session = usePosSession({ slug, queryClient, safeToast });
  const { currentSession, showCloseSession, setShowCloseSession, showSessionInvoices, setShowSessionInvoices } = session;

  const clearCartConfirm = useConfirm();
  const deleteConfirm    = useConfirm();

  // Read keyboard overrides ONCE (via useKbOverrides which caches + re-reads only on change),
  // then pass to useKeyboardShortcuts hook to avoid 25× localStorage.read per keypress.
  const kbOverrides    = useKbOverrides(slug);
  const kbOverridesRef = useRef(kbOverrides);
  kbOverridesRef.current = kbOverrides;

  usePosCartGuards({ slug, activeCompanyId: company?.id ?? null, pos, posRef });

  const layout = usePosLayout({ settings, setSettings });
  const { view, setView, gridSize, setGridSize, mobTab, setMobTab, fullscreen, toggleFullscreen } = layout;

  const [showFilter, setShowFilter] = useState(false);
  const [modal, setModal] = useState<ActiveModal>('none');
  const [showSettings, setShowSettings] = useState(false);
  const [pinModal, setPinModal] = useState<PinModalRequest>(null);
  const [cartNote,   setCartNote]   = useState('');
  const [selectedPriceLevelId, setSelectedPriceLevelId] = useState<number | null>(null);
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);

  // ── Initialize price level from DB setting (default_price_level_id) ──
  useEffect(() => {
    const dbVal = posLookups?.settings?.default_price_level_id;
    if (dbVal != null && dbVal !== '' && dbVal !== 0) {
      setSelectedPriceLevelId(Number(dbVal));
    }
  }, [posLookups?.settings?.default_price_level_id]);

  const editing = usePosEditingState();
  const { editingDocumentId, editingDocumentDate, editingDocumentNumber, editingPrevBalanceRef, editingDocMetaRef, clearEditingState } = editing;
  const receipt = usePosReceiptState();
  const { receiptSnapshot, setReceiptSnapshot, receiptSource } = receipt;

  const quick = usePosQuickItems({ slug, settings, setSettings });

  const filters = usePosFilterState();
  const [showScanner, setShowScanner] = useState(false);

  const searchRef    = useRef<HTMLInputElement>(null);
  const cartRef      = useRef<HTMLDivElement>(null);
  const cartApiRef   = useRef<ProfessionalCartHandle>(null) as React.RefObject<ProfessionalCartHandle | null>;
  const weightModalVariant = useRef<ProductVariant | null>(null);
  const weightEditItemId   = useRef<string | null>(null);

  usePosFocusEffects({ sessionId: currentSession?.id, modal, searchRef, setSelectedCartItemId });

  const search = usePosSearchCommand({ searchQuery: pos.searchQuery, posRef });
  const { isQtyCmd, rawQuery, handleSearchEscape } = search;
  const queryFamilyId   = pos.selectedCategory ?? undefined;

  const ref = usePosReferenceData({ slug, posLookups, settings, clientId: pos.client?.id });
  const { warehouses, documentTypes, priceLevelsList, currencies, treasuryAccounts, fiscalYears, paymentModes, allowNegSetting, dbDefaultPriceLevelId } = ref;
  const allowCreditSale = pos.client?.allow_credit_sale ?? true;
  const { toggleFiscalStamp, toggleAllowNegative, saveDefaultPriceLevel } = usePosSystemSettingToggles(slug, queryClient);

  const catalog = usePosCatalog({
    slug, selectedCategory: pos.selectedCategory, queryFamilyId, filterPerPage: filters.filterPerPage,
    effectiveWarehouseId: ref.effectiveWarehouseId, fiscalYearId: fiscalYear?.id,
  });
  const { allVariants, families, stockPending } = catalog;

  const { filteredVariants, highlightedIndex, setHighlightedIndex } = usePosFilteredVariants({
    allVariants, selectedCategory: pos.selectedCategory, searchQuery: pos.searchQuery,
    displaySearch: search.displaySearch, isQtyCmd, hideOutOfStock: settings.hideOutOfStock,
    allowNegSetting, filters, skipNextSearchResetRef: search.skipNextSearchResetRef,
  });

  const isEmpty = pos.items.length === 0;

  const { canUndoClear, undoClearSecondsLeft, handleClearCart, handleUndoClear } = usePosClearCart({
    isEmpty, confirmOnClear: settings.confirmOnClear, cartNote, setCartNote, clearCartConfirm, posRef, safeToast, editing,
  });

  const handleOpenDrawer = useCallback(async () => {
    const res = await openCashDrawerSmart(slug);
    if (!res.ok) safeToast.error(res.message ?? 'تعذّر فتح الدرج');
  }, [safeToast, slug]);

  const { handleOpenInvoice } = usePosInvoiceLoader({
    isEmpty, posRef, safeToast, editing, setCartNote, setShowSessionInvoices, setSelectedCartItemId,
    searchRef, searchParams, setSearchParams,
  });

  const { invoiceDiscountAmount, adjustedTotalTtcFinal, remainingToPay, avgMargin } = usePosTotals({
    pos, systemFiscalStampEnabled, allVariants,
  });

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────────
  const handleQuickCashRef = useRef<() => void>(() => {});
  useKeyboardShortcuts(
    { posRef: posRef as { readonly current: any }, overridesRef: kbOverridesRef, searchRef, cartRef, cartApiRef },
    { isEmpty, modal, showFilter, showSessionInvoices, showSettings, showCloseSession, pinModal, selectedCartItemId, families, openClientOnNewSale: settings.openClientOnNewSale },
    { setModal, setFilter: setShowFilter, setShowSessionInvoices, setShowSettings, setShowCloseSession, setPinModal, setSelectedCartItemId, setView, setGridSize, setReceiptSnapshot },
    { toggleFullscreen, handleClearCart, handleOpenDrawer, handleUndoClear, handleToggleQuickbar: quick.handleToggleQuickbar, handleSearchEscape, deleteConfirm, handleQuickCash: () => handleQuickCashRef.current() },
  );

  const { applyPriceLevel, handleItemDiscount, handleItemDiscountAmount, handleInvoiceDiscountChange } = usePosDiscounts({
    pos, settings, safeToast, allVariants, priceLevelsList, setSelectedPriceLevelId, setPinModal,
  });

  const printing = usePosPrinting({ slug, company, settings, safeToast });
  const { posTemplate, companyData, handlePrintDirect } = printing;

  const { handleCompleteSale, handleQuickCash } = usePosCheckout({
    slug, queryClient, settings, safeToast, pos, posRef, mountedRef,
    documentTypes, paymentModes,
    defaultWarehouse: ref.defaultWarehouse, defaultCurrency: ref.defaultCurrency, defaultTreasury: ref.defaultTreasury,
    fiscalYear, sessionId: currentSession?.id, incrementMut: session.incrementMut,
    cartNote, setCartNote, editingDocumentId, editingDocumentDate, editingPrevBalanceRef, clearEditingState,
    receipt, invoiceDiscountAmount, isPrintEnabled: printing.isPrintEnabled, template: printing.template,
    handlePrintDirect, setModal, setSelectedCartItemId, cartApiRef, searchRef, handleQuickCashRef,
  });

  const { handleAddItem, handleWeightEdit } = usePosAddItem({
    pos, posRef, settings, safeToast, allVariants, filteredVariants, priceLevelsList, selectedPriceLevelId,
    setHighlightedIndex, setSelectedCartItemId, setRecentProducts: quick.setRecentProducts, setModal,
    weightModalVariant, weightEditItemId, cartApiRef, searchRef,
  });

  const { scannedId, handleCameraScan } = usePosBarcodeScanner({ allVariants, allowNegSetting, safeToast, handleAddItem });

  const { handleQtyChange, handleArrowUp, handleArrowDown, handleEnter } = usePosSearchNavigation({
    pos, posRef, settings, safeToast, filteredVariants, highlightedIndex, setHighlightedIndex,
    selectedCartItemId, allowNegSetting, stockPending,
    prevSearchRef: search.prevSearchRef, skipNextSearchResetRef: search.skipNextSearchResetRef, handleAddItem,
  });

  const handlers = usePosModalHandlers({
    pos, posRef, settings, safeToast, isEmpty, allowCreditSale, selectedCartItemId, setSelectedCartItemId,
    setModal, setReceiptSnapshot, editing, weightModalVariant, weightEditItemId, cartApiRef, searchRef,
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={layout.containerRef}
      className={`pos-wrap on ${fullscreen ? 'pos-fullscreen' : ''}`}
      id="p-pos"
      dir="rtl"
    >
      <POSSessionModals
        sessionLoading={session.sessionLoading}
        currentSession={currentSession}
        warehouses={warehouses}
        fiscalYears={fiscalYears}
        defaultWarehouseId={ref.defaultWarehouse?.id}
        defaultFiscalYearId={fiscalYear?.id}
        openSessionPending={session.openSessionMut.isPending}
        sessionError={session.sessionError}
        onOpenSession={session.handleOpenSession}
        showCloseSession={showCloseSession}
        closeSessionPending={session.closeSessionMut.isPending}
        closeSessionError={session.closeSessionMut.error?.message ?? null}
        onCloseCloseSession={() => setShowCloseSession(false)}
        onConfirmCloseSession={session.handleCloseSession}
      />

      <POSTopBar
        session={currentSession}
        heldCount={pos.heldCarts.length}
        avgMargin={avgMargin}
        isEmpty={isEmpty}
        isFullscreen={fullscreen}
        showQuickbar={quick.showQuickbar}
        totals={pos.totals}
        totalTtcFinal={adjustedTotalTtcFinal}
        slug={slug}
        editingDocumentNumber={editingDocumentId ? editingDocumentNumber : null}
        priceLevels={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
        onPriceLevelChange={applyPriceLevel}
        onHeld={() => setModal('held')}
        onNewSale={handlers.handleTopBarNewSale}
        onManual={() => setModal('manual')}
        onReturn={() => setModal('returns')}
        onReceipt={handlers.handleTopBarReceipt}
        onSession={() => setModal(m => m === 'session' ? 'none' : 'session')}
        onSessionInvoices={() => setShowSessionInvoices(true)}
        onFullscreen={toggleFullscreen}
        onKbHelp={() => setModal('kbhelp')}
        onSettings={() => setShowSettings(true)}
        onToggleQuickbar={quick.handleToggleQuickbar}
        onKioskMode={() => navigate('/pos/kiosk')}
        onOpenDrawer={handleOpenDrawer}
        refreshing={session.refreshing}
        onRefresh={session.handleRefresh}
        toastEnabled={settings.toastEnabled}
        onToggleToast={() => setSettings({ toastEnabled: !settings.toastEnabled })}
        clearSearchOnAdd={settings.clearSearchOnAdd}
        onToggleClearSearch={() => setSettings({ clearSearchOnAdd: !settings.clearSearchOnAdd })}
      />


      {quick.showQuickbar && quick.quickItems.length > 0 && (
        <QuickItemsBar
          quickItems={quick.quickItems}
          allVariants={allVariants}
          onAdd={handleAddItem}
          onRemove={variantId => quick.setQuickItems(p => p.filter(q => q.variantId !== variantId))}
          allowNegativeStock={allowNegSetting}
        />
      )}

      <MobileTabs
        activeTab={mobTab} onTab={setMobTab}
        itemsCount={pos.totals.items_count}
        totalTtc={adjustedTotalTtcFinal}
        isEmpty={isEmpty} onSell={() => { if (allowCreditSale) setModal('payment'); }}
      />

      <div
        ref={layout.posLayoutRef}
        className={`pos-layout ${mobTab === 'cart' ? 'mob-show-cart' : ''}`}
      >
        <POSProductsPanel
          pos={pos} settings={settings} setSettings={setSettings} slug={slug}
          view={view} setView={setView} gridSize={gridSize} setGridSize={setGridSize}
          searchRef={searchRef} filters={filters} showFilter={showFilter} setShowFilter={setShowFilter}
          filteredVariants={filteredVariants} allVariants={allVariants}
          families={families} familyCounts={catalog.familyCounts} loadingAll={catalog.loadingAll}
          highlightedIndex={highlightedIndex} setHighlightedIndex={setHighlightedIndex}
          handleEnter={handleEnter} handleArrowUp={handleArrowUp} handleArrowDown={handleArrowDown}
          handleSearchEscape={handleSearchEscape}
          handleAddItem={handleAddItem} handleQtyChange={handleQtyChange}
          onAddManual={() => setModal('manual')} onBarcodeScan={() => setShowScanner(true)}
          toggleQuickItem={quick.toggleQuickItem} isQuickItem={quick.isQuickItem}
          priceLevelsList={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
          dbDefaultPriceLevelId={dbDefaultPriceLevelId} allowNegSetting={allowNegSetting}
          rawQuery={rawQuery} scannedId={scannedId}
          handleResizerMouseDown={layout.handleResizerMouseDown}
        />

        {/* ✅ ProfessionalCart مع onDiscountAmount */}
        <ProfessionalCart
          ref={cartApiRef as any}
          items={pos.items} totals={pos.totals} client={pos.client}
          note={cartNote} selectedItemId={selectedCartItemId}
          onSelectItem={setSelectedCartItemId}
          onQty={pos.updateQty}
          onDiscount={handleItemDiscount}
          onDiscountAmount={handleItemDiscountAmount}
          onPrice={pos.updatePrice}
          onRemove={id => { pos.removeItem(id); if (selectedCartItemId === id) setSelectedCartItemId(null); }}
          onUpdatePackaging={pos.updatePackaging}
          packagingsMap={catalog.packagingsMap}
          onSetClient={pos.setClient}
          onNoteChange={setCartNote} onHold={() => { pos.holdCart(); clearEditingState(); }}
          onSell={() => { if (allowCreditSale) setModal('payment'); }} onQuickSell={handleQuickCash} onClear={handleClearCart} onHeld={() => setModal('held')}
          totalTtcFinal={adjustedTotalTtcFinal}
          remainingToPay={remainingToPay}
          invoiceDiscountPct={pos.invoiceDiscountPct}
          onInvoiceDiscountChange={handleInvoiceDiscountChange}
          invoiceDiscountAmount={invoiceDiscountAmount}
          onUndoClear={handleUndoClear}
          canUndoClear={canUndoClear}
          undoClearSecondsLeft={undoClearSecondsLeft}
          clientBalance={editingDocumentId ? editingPrevBalanceRef.current : ref.clientBalance?.current_balance}
          slug={slug}
          cartRef={cartRef}
          onClientModalClose={() => { setTimeout(() => searchRef.current?.focus(), 100); }}
          allowCreditSale={allowCreditSale}
          onWeightEdit={handleWeightEdit}
        />
      </div>

      {/* ── Modals ── */}
      <POSPageModals
        pos={pos} settings={settings} setSettings={setSettings} resetSettings={resetSettings}
        modal={modal} setModal={setModal} handlers={handlers}
        warehouses={warehouses} documentTypes={documentTypes} paymentModes={paymentModes}
        currencies={currencies} treasuryAccounts={treasuryAccounts} priceLevelsList={priceLevelsList}
        adjustedTotalTtcFinal={adjustedTotalTtcFinal}
        editingDocumentId={editingDocumentId} editingDocumentDate={editingDocumentDate}
        editingDocumentNumber={editingDocumentNumber}
        editingPrevBalanceRef={editingPrevBalanceRef} editingDocMetaRef={editingDocMetaRef}
        clientCurrentBalance={ref.clientBalance?.current_balance}
        cartNote={cartNote} handleCompleteSale={handleCompleteSale}
        receiptSnapshot={receiptSnapshot} receiptSource={receiptSource}
        posTemplate={posTemplate} companyData={companyData} handlePrintDirect={handlePrintDirect}
        selectedCartItemId={selectedCartItemId}
        weightModalVariant={weightModalVariant} weightEditItemId={weightEditItemId}
        currentSession={currentSession}
        showSessionInvoices={showSessionInvoices} setShowSessionInvoices={setShowSessionInvoices}
        setShowCloseSession={setShowCloseSession}
        handleOpenInvoice={handleOpenInvoice} handlePrintDocument={printing.handlePrintDocument}
        showSettings={showSettings} setShowSettings={setShowSettings}
        systemFiscalStampEnabled={systemFiscalStampEnabled} toggleFiscalStamp={toggleFiscalStamp}
        allowNegSetting={allowNegSetting} toggleAllowNegative={toggleAllowNegative}
        dbDefaultPriceLevelId={dbDefaultPriceLevelId} saveDefaultPriceLevel={saveDefaultPriceLevel}
        pinModal={pinModal} setPinModal={setPinModal}
        showScanner={showScanner} setShowScanner={setShowScanner} handleCameraScan={handleCameraScan}
      />
      <Toaster key={settings.toastPosition} position={settings.toastPosition} richColors closeButton
        duration={settings.toastDuration || undefined}
        toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif', fontSize: 14 } }}
      />
      <ConfirmDialog {...clearCartConfirm.confirmDialogProps} />
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}

export default React.memo(POSPage);
