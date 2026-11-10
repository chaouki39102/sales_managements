// ════════════════════════════════════════════════════════════════════════════
// pos-pro/POSProPage.tsx
//
// ══ POS PRO — نقطة بيع جديدة موازية لـ POS الكلاسيكي ════════════════════════
//
// الهدف: نسخة "برو" كاشير عالية السرعة دون أي تعديل على POS الموجود:
//   • السلة مستقلة تماماً (pos-pro-cart) — لا تشارك الحالة مع POS.
//   • اختيار المنتجات عبر Modal ببحث فوري + مسح باركود (يبقى مفتوحاً
//     لتعدد الإضافة السريعة).
//   • أعلى الشاشة: بطاقة زبون + بطاقة إجمالي بارزة.
//   • شريط إجراءات رأسي يمين الشاشة: منتجات / الدفع / دفع سريع (ذهبي).
//   • الدفع: مودال ProfessionalPaymentModal (مشترك) + دفع سريع نقدي
//     بضغطة واحدة.
//   • الطباعة: نفس خط الأنابيب الموحد (UniversalPrintPipeline /
//     ESCPOSRenderer للحراري / printReceiptDirect للمتصفح).
//
// البيانات تُقرأ بنفس hooks المشتركة (usePOSAggregatedLookups،
// useCurrentPosSession...) دون كتابة أي ملف خاص بـ POS الكلاسيكي.
//
// المنطق موزّع على pos-pro/hooks/* (الكتالوج، التعديل، الطباعة، الدفع،
// إجراءات السلة، الخصومات، حالة الواجهة) والمودالات في
// pos-pro/components/POSProModals.tsx.
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { usePOSAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { useCashClient } from '@/lib/api/endpoints/parties';
import { partyBalancesApi } from '@/lib/api/endpoints/partyBalances';
import {
  useCurrentPosSession,
  useOpenSession,
  useIncrementSession,
  useSessionHeartbeat,
} from '@/lib/api/endpoints/posSession';
import { usePosPro } from '@/pos-pro/hooks/usePosPro';
import { usePosProKeyboardShortcuts } from '@/pos-pro/hooks/usePosProKeyboardShortcuts';
import { usePosProCatalog } from '@/pos-pro/hooks/usePosProCatalog';
import { usePosProDiscounts } from '@/pos-pro/hooks/usePosProDiscounts';
import { usePosProEditingState, usePosProInvoiceLoader } from '@/pos-pro/hooks/usePosProEditing';
import { usePosProPrinting } from '@/pos-pro/hooks/usePosProPrinting';
import { usePosProCheckout } from '@/pos-pro/hooks/usePosProCheckout';
import { usePosProCartActions, type WeightTarget } from '@/pos-pro/hooks/usePosProCartActions';
import { usePosProUiState } from '@/pos-pro/hooks/usePosProUiState';
import { useKbOverrides } from '@/pos/hooks/useKeyboardMap';
import { usePOSSettings } from '@/pos/hooks/usePOSSettings';
import { usePosSafeToast } from '@/pos/hooks/usePosSafeToast';
import { usePosSystemSettingToggles } from '@/pos/hooks/usePosSystemSettingToggles';
import { openCashDrawerSmart } from '@/pos/utils/thermalPrint';
import { parseLookupBool } from '@/pos/utils/posSaleHelpers';
import { invalidatePosQueries, tenantKeys } from '@/lib/api/core/queryKeys';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui';

// ── مكوّنات POS PRO ───────────────────────────────────────────────────────────
import POSProRail from '@/pos-pro/components/POSProRail';
import POSProCart, { type POSProCartHandle } from '@/pos-pro/components/POSProCart';
import POSProProductDrawer from '@/pos-pro/components/POSProProductDrawer';
import POSProScanbar from '@/pos-pro/components/POSProScanbar';
import POSProModals from '@/pos-pro/components/POSProModals';
import { TotalCard, CustomerCard } from '@/pos-pro/components/POSProTopCards';
import { ReorderableTopCards } from '@/pos-pro/components/ReorderableTopCards';

// ── مودالات مشتركة (lazy — نفس النهج في POSPage) ────────────────────────────
const OpenSessionModal = React.lazy(() => import('@/pos/components/OpenSessionModal'));

export default function POSProPage() {
  const queryClient = useQueryClient();
  const slug = useActiveSlug();
  const company = useActiveCompany();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!slug) return;
    setRefreshing(true);
    try {
      await invalidatePosQueries(queryClient, slug);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: [slug, 'pos-pro', 'products'] }),
        queryClient.refetchQueries({ queryKey: [slug, 'pos-pro-stock'] }),
      ]);
    } finally { setRefreshing(false); }
  };

  // ── الإعدادات المشتركة (قراءة فقط — نفس قيم POS للاتساق) ────────────────
  const { settings, setSettings, resetSettings } = usePOSSettings(slug);
  const [searchParams, setSearchParams] = useSearchParams();
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Lookups مجمّعة ─────────────────────────────────────────────────────────
  const { data: posLookups } = usePOSAggregatedLookups();
  const systemFiscalStampEnabled = parseLookupBool(posLookups?.settings?.fiscal_stamp_enabled, true);
  const allowNegSetting = parseLookupBool(posLookups?.settings?.allow_negative_stock, false);

  const pos = usePosPro(systemFiscalStampEnabled);
  const posRef = useRef(pos);
  posRef.current = pos;

  // خريطة الكمية (بالوحدات الأساسية) الموجودة في السلة لكل صنف — تُطرح من المخزون المعروض
  const qtyInCartById = useMemo(() => {
    const m = new Map<number, number>();
    for (const i of pos.items) {
      m.set(i.variant_id, (m.get(i.variant_id) ?? 0) + i.quantity * (i.pack_qty ?? 1));
    }
    return m;
  }, [pos.items]);

  // ── تخصيصات الاختصارات المشتركة مع POS الكلاسيكي (تُقرأ مرة واحدة) ─────────
  const kbOverrides    = useKbOverrides(slug);
  const kbOverridesRef = useRef(kbOverrides);
  kbOverridesRef.current = kbOverrides;
  const scanRef = useRef<HTMLInputElement | null>(null);
  const fiscalYear = useSelectedFiscalYear();

  const warehouses       = posLookups?.warehouses ?? [];
  const documentTypes    = posLookups?.documentTypes ?? [];
  const currencies       = posLookups?.currencies ?? [];
  const treasuryAccounts = posLookups?.treasuryAccounts ?? [];
  const fiscalYears      = posLookups?.fiscalYears ?? [];
  const paymentModes     = posLookups?.paymentModes ?? [];
  const priceLevelsList  = useMemo(() => posLookups?.priceLevels ?? [], [posLookups]);

  const dbDefaultPriceLevelId = (() => {
    const v = posLookups?.settings?.default_price_level_id;
    return v != null && v !== '' && v !== 0 ? Number(v) : null;
  })();

  const defaultWarehouse = settings.defaultWarehouseId
    ? warehouses?.find(w => w.id === settings.defaultWarehouseId)
    : (warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null);
  const defaultCurrency  = currencies?.find(c => c.is_base_currency) ?? currencies?.[0];
  const defaultTreasury  = treasuryAccounts?.find(a => a.is_default) ?? treasuryAccounts?.[0];

  // ── المستودع النشط — قابل للتغيير من مودال الجلسة ────────────────────────
  const [activeWarehouseId, setActiveWarehouseId] = useState<number | null>(null);
  const activeWarehouse = useMemo(
    () => (activeWarehouseId ? (warehouses?.find(w => w.id === activeWarehouseId) ?? null) : defaultWarehouse),
    [activeWarehouseId, warehouses, defaultWarehouse],
  );
  // مزامنة: عند توفر المستودع الافتراضي، نعتمده افتراضياً
  useEffect(() => {
    if (!activeWarehouseId && defaultWarehouse) setActiveWarehouseId(defaultWarehouse.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultWarehouse?.id]);

  // ── الجلسة ─────────────────────────────────────────────────────────────────
  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
  useSessionHeartbeat(currentSession?.id ?? null);
  const openSessionMut  = useOpenSession();
  const incrementMut    = useIncrementSession(currentSession?.id ?? null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // مزامنة: عند فتح جلسة جديدة نعتمد مستودعها
  useEffect(() => {
    const whId = currentSession?.warehouse?.id;
    if (whId) setActiveWarehouseId(whId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id]);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string' && error.length > 0) return error;
    return fallback;
  };

  const handleOpenSession = async (data: {
    warehouse_id: number; fiscal_year_id: number; opening_cash: number; opening_note?: string;
  }) => {
    setSessionError(null);
    try { await openSessionMut.mutateAsync(data); }
    catch (e: unknown) { setSessionError(getErrorMessage(e, 'فشل فتح الجلسة')); }
  };

  // ── توست: no-op عند تعطيل الإشعارات ──────────────────────────────────────
  const safeToast = usePosSafeToast(settings.toastEnabled);
  const clearConfirm = useConfirm();

  // ── مسح السلة عند تبديل الشركة أو عميل قديم من شركة أخرى ────────────────
  const prevSlugRef = useRef(slug);
  useEffect(() => {
    const slugChanged = prevSlugRef.current && prevSlugRef.current !== slug;
    const client = posRef.current.client;
    const staleClient =
      !!company?.id &&
      !!client?.company_id &&
      client.company_id !== company.id;
    if (slugChanged || staleClient) {
      posRef.current.clearCart();
    }
    prevSlugRef.current = slug;
  }, [slug, company?.id]);

  // ── الزبون الافتراضي "Client Cash" ───────────────────────────────────────
  const { data: cashClient } = useCashClient();
  useEffect(() => {
    if (cashClient && !posRef.current.client) {
      posRef.current.setClient(cashClient);
    }
  }, [cashClient]);

  // ── المنتجات + المخزون (الفلترة محلية داخل المودال) ─────────────────────
  const { productsLoading, allVariants, visibleVariants: drawerVariants, families } = usePosProCatalog({
    slug, warehouseId: activeWarehouse?.id, fiscalYearId: fiscalYear?.id,
    hideOutOfStock: settings.hideOutOfStock, allowNegSetting,
  });

  // ── حالة الواجهة ──────────────────────────────────────────────────────────
  const ui = usePosProUiState();
  const [saleBusy, setSaleBusy] = useState(false);
  const cartWrapRef = useRef<HTMLDivElement>(null);
  const cartHandleRef = useRef<POSProCartHandle>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const receiptSnapshotRef = useRef<POSSaleSnapshot | null>(null);

  // ── تعديل فاتورة موجودة (من فواتير الجلسة أو رابط ?edit=) ───────────────
  const editing = usePosProEditingState();

  // ── قائمة الأسعار ────────────────────────────────────────────────────────
  const [selectedPriceLevelId, setSelectedPriceLevelId] = useState<number | null>(null);
  useEffect(() => {
    if (selectedPriceLevelId === null && dbDefaultPriceLevelId != null) {
      setSelectedPriceLevelId(dbDefaultPriceLevelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbDefaultPriceLevelId]);

  // ── رصيد الزبون (يُعرض قبل الدفع) ────────────────────────────────────────
  const clientId = pos.client?.id;
  const { data: clientBalance } = useQuery({
    queryKey: tenantKeys.partyBalances.detail(slug ?? '', clientId ?? 0),
    queryFn:  () => partyBalancesApi.getOne(clientId!),
    enabled:  !!slug && !!clientId,
    staleTime: 30_000,
  });

  const [weightTarget, setWeightTarget] = useState<WeightTarget | null>(null);

  // ── وسائل الدفع السريع: نقدي + بطاقة ─────────────────────────────────────
  const cashMode = useMemo(() => {
    const list = paymentModes ?? [];
    const code = settings.defaultPaymentCode;
    const byCode = code
      ? list.find(m =>
          new RegExp(code, 'i').test(m.name) ||
          new RegExp(code, 'i').test(m.code),
        )
      : undefined;
    return byCode ?? list.find(m => m.is_cash === true) ?? list.find(m => m.is_default) ?? list[0] ?? null;
  }, [paymentModes, settings.defaultPaymentCode]);

  // ── الإجمالي النهائي (TTC + طابع جبائي) ─────────────────────────────────
  const adjustedTotalTtcFinal = pos.totals.total_ttc + pos.totals.fiscal_stamp;

  // ── الطباعة ──────────────────────────────────────────────────────────────
  const printing = usePosProPrinting({ slug, company, settings, safeToast, pos, adjustedTotalTtcFinal, documentTypes });
  const { posTemplate, companyData, handlePrintDirect, handlePrintCart } = printing;

  // ── إجراءات السلة ────────────────────────────────────────────────────────
  const actions = usePosProCartActions({
    pos, posRef, settings, safeToast, clearConfirm, allVariants, allowNegSetting, priceLevelsList,
    selectedPriceLevelId, setSelectedPriceLevelId, selectedItemId, setSelectedItemId, setWeightTarget,
    setCustomerModalOpen: ui.setCustomerModalOpen, cartHandleRef, editing,
  });
  const { handleAddItem, handleNewSale, moveCartSelection } = actions;

  // ── إتمام البيع / الدفع السريع ───────────────────────────────────────────
  const { handleCompleteSale, handleQuickPay, handleOpenPayment } = usePosProCheckout({
    slug, queryClient, settings, safeToast, posRef, mountedRef, documentTypes, paymentModes,
    activeWarehouse, defaultCurrency, defaultTreasury, fiscalYear, sessionId: currentSession?.id, incrementMut,
    editingDocumentId: editing.editingDocumentId, editingDocumentDate: editing.editingDocumentDate,
    clearEditingState: editing.clearEditingState, receiptSnapshotRef,
    isPrintEnabled: printing.isPrintEnabled, template: printing.template, handlePrintDirect,
    setSaleBusy, setPaymentOpen: ui.setPaymentOpen, setReceiptOpen: ui.setReceiptOpen,
  });

  // ── إعدادات النظام (تُزامن مع قاعدة البيانات مثل POS الكلاسيكي) ─────────
  const { toggleFiscalStamp, toggleAllowNegative, saveDefaultPriceLevel } = usePosSystemSettingToggles(slug, queryClient);

  // ── فتح درج النقود ───────────────────────────────────────────────────────
  const handleOpenDrawer = useCallback(async () => {
    const res = await openCashDrawerSmart(slug);
    if (!res.ok) safeToast.error(res.message ?? 'تعذّر فتح الدرج');
  }, [safeToast]);

  // ── الخصومات مع بوابة المدير (PIN) ───────────────────────────────────────
  const { handleInvoiceDiscountChange, handleItemDiscount, handleItemDiscountAmount } = usePosProDiscounts({
    posRef, settings, safeToast, setPinModal: ui.setPinModal,
  });

  // ── فتح فاتورة موجودة للتعديل (فواتير الجلسة / ?edit= / إعادة التحميل) ──
  const { handleOpenInvoice } = usePosProInvoiceLoader({
    posRef, safeToast, editing, setShowSessionInvoices: ui.setShowSessionInvoices, searchParams, setSearchParams,
  });

  // ── اختصارات لوحة المفاتيح (نفس منظومة POS الكلاسيكي: نفس المفاتيح، نفس
  //    التخزين المخصص لكل شركة، نفس مودال إعادة التخصيص) ─────────────────────
  usePosProKeyboardShortcuts(
    { posRef: posRef as { readonly current: any }, overridesRef: kbOverridesRef, scanRef, cartRef: cartWrapRef },
    { isEmpty: pos.items.length === 0, hasSession: !!currentSession, anyModalOpen: ui.anyModalOpen, selectedItemId },
    {
      setDrawerOpen: ui.setDrawerOpen, setPaymentOpen: ui.setPaymentOpen, setHeldOpen: ui.setHeldOpen,
      setReturnsOpen: ui.setReturnsOpen, setHelpOpen: ui.setHelpOpen,
      setManualOpen: ui.setManualOpen, setShowSessionInvoices: ui.setShowSessionInvoices,
      setShowSettings: ui.setShowSettings, setSessionOpen: ui.setSessionOpen,
      setShowScanner: ui.setShowScanner, setCustomerModalOpen: ui.setCustomerModalOpen, setSelectedItemId,
    },
    {
      toggleFullscreen: ui.toggleFullscreen,
      handleClearCart: actions.handleClearCart,
      handleOpenDrawer: () => void handleOpenDrawer(),
      handleQuickCash: () => { void handleQuickPay(cashMode); },
      handlePrintCart,
      closeTopModal: ui.closeTopModal,
      handleNewSale,
      moveCartSelection,
    },
  );

  const canSell = pos.items.length > 0 && !saleBusy;

  return (
    <div className={`pos-pro${ui.fullscreen ? ' pos-fullscreen' : ''}`} dir="rtl" ref={ui.containerRef}>
      {!sessionLoading && !currentSession && (
        <Suspense fallback={null}>
          <OpenSessionModal
            warehouses={warehouses ?? []}
            fiscalYears={fiscalYears as any}
            defaultWarehouseId={defaultWarehouse?.id}
            defaultFiscalYearId={fiscalYear?.id}
            isLoading={openSessionMut.isPending}
            error={sessionError}
            onOpen={handleOpenSession}
          />
        </Suspense>
      )}

      <div className="pos-pro-body">
        <POSProRail
          canSell={canSell}
          isBusy={saleBusy}
          onNewSale={handleNewSale}
          onOpenProducts={() => ui.setDrawerOpen(true)}
          onPay={handleOpenPayment}
          onQuickPay={() => handleQuickPay(cashMode)}
          onSession={() => ui.setSessionOpen(true)}
          sessionAvailable={!!currentSession}
          onHold={() => pos.holdCart()}
          onHeld={() => ui.setHeldOpen(true)}
          heldCount={pos.heldCarts.length}
          onReturns={() => ui.setReturnsOpen(true)}
          onHelp={() => ui.setHelpOpen(true)}
          onScrollToCart={() => cartWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          onManual={() => ui.setManualOpen(true)}
          onSessionInvoices={() => ui.setShowSessionInvoices(true)}
          onFullscreen={ui.toggleFullscreen}
          onOpenDrawer={() => void handleOpenDrawer()}
          onSettings={() => ui.setShowSettings(true)}
        />

          <div className="pos-pro-main">
            <ReorderableTopCards
              customer={
                <CustomerCard
                  client={pos.client ?? cashClient ?? null}
                  onOpenCustomers={() => ui.setCustomerModalOpen(true)}
                />
              }
              total={
                <TotalCard
                  totals={pos.totals}
                  adjustedTotal={adjustedTotalTtcFinal}
                  invoiceDiscPct={pos.invoiceDiscountPct}
                />
              }
            />

          <div className="pos-pro-scan-row">
            <POSProScanbar
              variants={allVariants}
              onAdd={handleAddItem}
              focusRef={(el) => { scanRef.current = el; }}
              onQtyCommand={actions.handleQtyCommand}
              onCartNav={(dir) => moveCartSelection(dir)}
              onScanCamera={() => ui.setShowScanner(true)}
              keyboardNavEnabled={settings.keyboardNav}
              showStockOnCard={settings.showStockOnCard}
              qtyInCartById={qtyInCartById}
            />
            <button
              type="button"
              className="pp-print-btn"
              onClick={handlePrintCart}
              disabled={!canSell}
              title="طباعة إيصال السلة الحالية"
            >
              <i className="ti ti-printer" />
              <span>طباعة</span>
            </button>
            <button
              type="button"
              className="pp-refresh-btn"
              onClick={handleRefresh}
              disabled={refreshing}
              title="تحديث المنتجات والمخزون"
            >
              <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>

          <div className="pos-pro-cart-wrap" ref={cartWrapRef}>
            <POSProCart
              ref={cartHandleRef}
              items={pos.items}
              invoiceDiscountPct={pos.invoiceDiscountPct}
              totals={pos.totals}
              onQty={pos.updateQty}
              onDiscount={handleItemDiscount}
              onDiscountAmount={handleItemDiscountAmount}
              onPrice={pos.updatePrice}
              onPackaging={pos.updatePackaging}
              onWeight={(item) => setWeightTarget({ mode: 'edit', item })}
              onRemove={(id) => { pos.removeItem(id); setSelectedItemId(prev => prev === id ? null : prev); }}
              onClear={actions.handleClearCart}
              onInvoiceDiscountChange={handleInvoiceDiscountChange}
              onOpenProducts={() => ui.setDrawerOpen(true)}
              priceLevels={priceLevelsList}
              selectedPriceLevelId={selectedPriceLevelId}
              onPriceLevelChange={actions.applyPriceLevel}
              note={pos.notes}
              onNoteChange={(n) => pos.setNotes(n)}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              heldCarts={pos.heldCarts}
              saleNumber={pos.saleNumber}
              onNewSale={handleNewSale}
              onRestoreHeld={actions.handleRestoreHeld}
              onCloseHeld={actions.handleCloseHeld}
              onCloseCurrent={actions.handleCloseCurrent}
            />
          </div>

          {!productsLoading && (
            <div className="pos-pro-hint">
              <i className="ti ti-keyboard" />
              F1 تخصيص الاختصارات · F2 البحث · F3 دفع سريع · F4 الدفع · F5 تعليق · F6 صنف يدوي · F7 المعلقة · F8 الجلسة · F9 الطباعة · F10 مرتجع · F11 ملء الشاشة · F12 مسح السلة · *رقم+Enter لضبط كمية الصنف المحدد · الأسهم ↑↓ تتنقل في السلة عند فراغ البحث
            </div>
          )}
        </div>
      </div>

      {/* مودال المنتجات — يبقى مفتوحاً أثناء الإضافة */}
      <POSProProductDrawer
        open={ui.drawerOpen}
        variants={drawerVariants}
        families={families}
        cartCount={pos.items.length}
        cartItems={pos.items}
        onAdd={handleAddItem}
        onClose={() => ui.setDrawerOpen(false)}
        onQty={actions.handleCardQtyChange}
        priceLevels={priceLevelsList}
        selectedPriceLevelId={selectedPriceLevelId}
        priceDisplayMode={settings.priceDisplayMode}
        showStockOnCard={settings.showStockOnCard}
        gridSize={settings.defaultGridSize}
        defaultView={settings.defaultView}
        allowNegativeStock={allowNegSetting}
        clearSearchOnAdd={settings.clearSearchOnAdd}
        keyboardNavEnabled={settings.keyboardNav}
        advanceOnAdd={settings.advanceOnAdd}
        qtyInCartById={qtyInCartById}
      />

      <POSProModals
        pos={pos} ui={ui} editing={editing}
        settings={settings} setSettings={setSettings} resetSettings={resetSettings}
        safeToast={safeToast} slug={slug} queryClient={queryClient}
        warehouses={warehouses} documentTypes={documentTypes} paymentModes={paymentModes}
        currencies={currencies} treasuryAccounts={treasuryAccounts} priceLevelsList={priceLevelsList}
        adjustedTotalTtcFinal={adjustedTotalTtcFinal}
        clientCurrentBalance={clientBalance?.current_balance}
        handleCompleteSale={handleCompleteSale}
        receiptSnapshotRef={receiptSnapshotRef}
        posTemplate={posTemplate} companyData={companyData} handlePrintDirect={handlePrintDirect}
        weightTarget={weightTarget} setWeightTarget={setWeightTarget} setSelectedItemId={setSelectedItemId}
        currentSession={currentSession}
        drawerWarehouseId={activeWarehouse?.id ?? null} setActiveWarehouseId={setActiveWarehouseId}
        handleOpenInvoice={handleOpenInvoice} handlePrintDocument={printing.handlePrintDocument}
        restoreHeldIntoEditing={actions.restoreHeldIntoEditing}
        systemFiscalStampEnabled={systemFiscalStampEnabled} toggleFiscalStamp={toggleFiscalStamp}
        allowNegSetting={allowNegSetting} toggleAllowNegative={toggleAllowNegative}
        dbDefaultPriceLevelId={dbDefaultPriceLevelId} saveDefaultPriceLevel={saveDefaultPriceLevel}
        handleCameraScan={actions.handleCameraScan}
      />

      <ConfirmDialog {...clearConfirm.confirmDialogProps} />
    </div>
  );
}
