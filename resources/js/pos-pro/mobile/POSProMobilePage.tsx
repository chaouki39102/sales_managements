// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/POSProMobilePage.tsx
//
// ══ POS PRO — واجهة الهاتف (معاينة الهاتف v5) ════════════════════════════════
//
// صفحة بيع كاملة بحجم الشاشة للهاتف، مُجمَّعة من نفس طبقة بيانات POS Pro:
//   • نفس السلة المستقلة (usePosProCart / pos-pro-cart) — تُشارك مع سطح المكتب.
//   • نفس الـ lookups (usePOSAggregatedLookups) + المخزون (stock-at).
//   • نفس إعدادات POS (usePOSSettings) — بما فيها بوابات الخصم / الأصوات / الطباعة.
//   • الدفع عبر ProfessionalPaymentModal (مشترك) + دفع سريع نقدي.
//   • الطباعة عبر نفس خط الأنابيب (UniversalPrintPipeline / ESCPOSRenderer).
//
// التصميم: شاشة dvh كاملة — appbar → شريط الجلسة → بطاقة الإجمالي → شريط
// إجراءات سريعة → قائمة السلة (سحب للحذف + undo) → FAB → شريط سفلي
// (جديد / دفع سريع / دفع) → Sheets (منتجات / زبائن / خصم / سلال معلقة) →
// overlay نجاح الدفع → أقفال الجلسة/الانقطاع.
//
// المنطق في mobile/hooks/* والأجزاء المرئية في mobile/components/*.
// ════════════════════════════════════════════════════════════════════════════
import React, {
  useState, useEffect, useRef, useCallback, useMemo, Suspense,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';


import { usePOSAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { useCashClient } from '@/lib/api/endpoints/parties';
import { partyBalancesApi } from '@/lib/api/endpoints/partyBalances';
import { usePosPro } from '@/pos-pro/hooks/usePosPro';
import { usePosProCatalog } from '@/pos-pro/hooks/usePosProCatalog';
import type { PosProPinRequest } from '@/pos-pro/hooks/usePosProDiscounts';
import { usePosProCart } from '@/pos-pro/store/usePosProCart';
import { usePOSSettings } from '@/pos/hooks/usePOSSettings';
import { usePrintSettings } from '@/pos/hooks/usePrintSettings';
import { usePosSafeToast } from '@/pos/hooks/usePosSafeToast';
import { parseLookupBool } from '@/pos/utils/posSaleHelpers';
import { mapCompany } from '@/pages/settings/print-settings/runtime/PrintRuntimeAdapter';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { CompanyPreviewData } from '@/pages/settings/print-settings/types';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui';
import type { Party } from '@/types';

import { money } from './mobileFormat';
import { usePosProMobileSession } from './hooks/usePosProMobileSession';
import { usePosProMobileCart, type MobileSheet } from './hooks/usePosProMobileCart';
import { usePosProMobileCheckout } from './hooks/usePosProMobileCheckout';
import MobileTopSection from './components/MobileTopSection';
import MobileCartList from './components/MobileCartList';
import MobileProductsSheet from './components/MobileProductsSheet';
import MobileCustomerSheet from './components/MobileCustomerSheet';
import MobileDiscountSheet from './components/MobileDiscountSheet';
import MobileHeldSheet from './components/MobileHeldSheet';


// ── مودالات مشتركة (lazy — نفس نهج POSPage / POSProPage) ───────────────────
const OpenSessionModal = React.lazy(() => import('@/pos/components/OpenSessionModal'));
const ProfessionalPaymentModal = React.lazy(() => import('@/pos/components/ProfessionalPaymentModal'));
const ProfessionalReceipt = React.lazy(() => import('@/pos/components/ProfessionalReceipt'));

export default function POSProMobilePage() {
  const queryClient = useQueryClient();
  const slug = useActiveSlug();
  const company = useActiveCompany();
  const navigate = useNavigate();

  // ── الإعدادات المشتركة ───────────────────────────────────────────────────
  const { settings } = usePOSSettings(slug);

  // ── Lookups مجمّعة ────────────────────────────────────────────────────────
  const { data: posLookups } = usePOSAggregatedLookups();
  const systemFiscalStampEnabled = parseLookupBool(posLookups?.settings?.fiscal_stamp_enabled, true);
  const allowNegSetting = parseLookupBool(posLookups?.settings?.allow_negative_stock, false);

  const pos = usePosPro(systemFiscalStampEnabled);
  const posRef = useRef(pos);
  posRef.current = pos;

  const fiscalYear = useSelectedFiscalYear();
  const warehouses = posLookups?.warehouses ?? [];
  const documentTypes = posLookups?.documentTypes ?? [];
  const currencies = posLookups?.currencies ?? [];
  const treasuryAccounts = posLookups?.treasuryAccounts ?? [];
  const fiscalYears = posLookups?.fiscalYears ?? [];
  const paymentModes = posLookups?.paymentModes ?? [];

  const defaultWarehouse = settings.defaultWarehouseId
    ? warehouses?.find(w => w.id === settings.defaultWarehouseId)
    : (warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null);
  const defaultCurrency = currencies?.find(c => c.is_base_currency) ?? currencies?.[0];
  const defaultTreasury = treasuryAccounts?.find(a => a.is_default) ?? treasuryAccounts?.[0];

  // ── المستودع النشط + الجلسة (مع fallback وضع عدم الاتصال) ──────────────
  const session = usePosProMobileSession({ slug, warehouses, defaultWarehouse });
  const { activeWarehouse, currentSession, online, offlineServed } = session;

  // ── توست آمن ─────────────────────────────────────────────────────────────
  const safeToast = usePosSafeToast(settings.toastEnabled);
  const clearConfirm = useConfirm();

  // ── المنتجات + المخزون (نفس مفاتيح سطح المكتب → كاش مشترك) ───────────────
  const { visibleVariants: variantsWithStock, families } = usePosProCatalog({
    slug, warehouseId: activeWarehouse?.id, fiscalYearId: fiscalYear?.id,
    hideOutOfStock: settings.hideOutOfStock, allowNegSetting,
  });

  // ── الزبون الافتراضي "Client Cash" ───────────────────────────────────────
  const { data: cashClient } = useCashClient();
  useEffect(() => {
    if (cashClient && !posRef.current.client) posRef.current.setClient(cashClient);
  }, [cashClient]);

  // ── رصيد الزبون (يُعرض في chip الزبون + الزبون داخل السلة) ───────────────
  const clientId = pos.client?.id;
  const { data: clientBalance } = useQuery({
    queryKey: tenantKeys.partyBalances.detail(slug ?? '', clientId ?? 0),
    queryFn: () => partyBalancesApi.getOne(clientId!),
    enabled: !!slug && !!clientId,
    staleTime: 30_000,
  });
  const clientBalanceVal = clientBalance?.current_balance ?? 0;

  // ── إعدادات الطباعة ──────────────────────────────────────────────────────
  const { template: posTemplate, enabled: isPrintEnabled, copies, paperWidth } = usePrintSettings('POS');
  const companyData = useMemo<CompanyPreviewData | null>(() => mapCompany(company), [company]);

  // ── حالة الواجهة ─────────────────────────────────────────────────────────
  const [sheet, setSheet] = useState<MobileSheet>('none');
  const [payOpen, setPayOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [saleBusy, setSaleBusy] = useState(false);
  const [successOverlay, setSuccessOverlay] = useState<{ docNumber: string; amount: number } | null>(null);
  const [prodSearch, setProdSearch] = useState('');
  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const [custSearch, setCustSearch] = useState('');
  const [pinModal, setPinModal] = useState<PosProPinRequest>(null);

  const prodSearchRef = useRef<HTMLInputElement>(null);
  const custSearchRef = useRef<HTMLInputElement>(null);

  // تركيز حقل البحث فقط عند فتح الـ Sheet (وليس عند التحميل): `autoFocus` على
  // عنصر داخل sheet مغلق يدفع المتصفح إلى تمرير حاوية .ppm-screen المخفية
  // (overflow:hidden) نحو العنصر → ينزاح التصميم كله للأعلى ويُقتطع.
  useEffect(() => {
    if (sheet === 'products') prodSearchRef.current?.focus();
    else if (sheet === 'customer') custSearchRef.current?.focus();
  }, [sheet]);

  const receiptSnapshotRef = useRef<POSSaleSnapshot | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // إغلاق أي Sheet عند تغيير الشركة أو عميل قديم من شركة أخرى
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
      setSheet('none');
      setPayOpen(false);
    }
    prevSlugRef.current = slug;
  }, [slug, company?.id]);

  // ── سلة: كمية في السلة (بالوحدات الأساسية) لكل صنف ───────────────────────
  const qtyInCartByVariant = useMemo(() => {
    const m = new Map<number, number>();
    for (const i of pos.items) {
      m.set(i.variant_id, (m.get(i.variant_id) ?? 0) + i.quantity * (i.pack_qty ?? 1));
    }
    return m;
  }, [pos.items]);

  // ── إضافة / حذف + تراجع / خصومات / بيع جديد ─────────────────────────────
  const cart = usePosProMobileCart({ posRef, settings, safeToast, clearConfirm, allowNegSetting, setPinModal, setSheet });
  const { handleNewSale, setRemovedItem, removedItem } = cart;

  // ── الطباعة + إتمام البيع + الدفع السريع ─────────────────────────────────
  const { handlePrintDirect, handleCompleteSale, handleQuickPay, handleOpenPayment } = usePosProMobileCheckout({
    slug, queryClient, settings, safeToast, posRef, mountedRef, documentTypes, paymentModes,
    activeWarehouse, defaultCurrency, defaultTreasury, fiscalYear, sessionId: currentSession?.id,
    incrementMut: session.incrementMut, posTemplate, companyData, isPrintEnabled, copies, paperWidth,
    receiptSnapshotRef, setSaleBusy, setPayOpen, setReceiptOpen, setSuccessOverlay,
  });

  // ── وسيلة الدفع النقدية ──────────────────────────────────────────────────
  const cashMode = useMemo(
    () => paymentModes.find((m) => /نقدا|نقداً|cash/i.test(m.name)) ?? paymentModes[0] ?? null,
    [paymentModes],
  );

  // ── المتغيرات المالية ────────────────────────────────────────────────────
  const totals = pos.totals;
  const totalTtcFinal = totals.total_ttc + totals.fiscal_stamp;
  const invDisc = totals.invoice_discount_amount ?? 0;
  const invDiscPct = pos.invoiceDiscountPct;

  // ── فلترة المنتجات في Sheet ──────────────────────────────────────────────
  const visibleVariants = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    return variantsWithStock.filter((v) => {
      if (activeCat !== 'all' && v.product?.family?.id !== activeCat) return false;
      if (!q) return true;
      const name = String(v.product?.name ?? '').toLowerCase();
      const ref = String(v.ref ?? '').toLowerCase();
      const barcode = String(v.barcode ?? '').toLowerCase();
      return name.includes(q) || ref.includes(q) || barcode.includes(q);
    });
  }, [variantsWithStock, prodSearch, activeCat]);

  // ── فلترة الزبائن في Sheet ───────────────────────────────────────────────
  const customers = posLookups?.customers ?? [];
  const visibleCustomers = useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      String(c.name).toLowerCase().includes(q)
      || String(c.code).toLowerCase().includes(q),
    );
  }, [customers, custSearch]);

  const selectCustomer = useCallback((c: { id: number; name: string }) => {
    posRef.current.setClient(c as unknown as Party);
    if (c.id) {
      queryClient.invalidateQueries({ queryKey: tenantKeys.partyBalances.detail(slug ?? '', c.id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.parties.detail(slug ?? '', c.id) });
    }
    setSheet('none');
  }, [queryClient, slug]);

  const canSell = pos.items.length > 0 && !saleBusy;

  return (
    <div className="ppm-screen" dir="rtl">
      {!session.sessionLoading && !currentSession && (
        <Suspense fallback={null}>
          <div className="ppm-session-lock show">
            <div className="ppm-lock-ic"><i className="ti ti-lock" /></div>
            <h3>لا توجد جلسة مفتوحة</h3>
            <p>افتح جلسة بيع لبدء العمل على هذا الجهاز.</p>
            <OpenSessionModal
              warehouses={warehouses}
              fiscalYears={fiscalYears as any}
              defaultWarehouseId={defaultWarehouse?.id}
              defaultFiscalYearId={fiscalYear?.id}
              isLoading={session.openSessionMut.isPending}
              error={session.sessionError}
              onOpen={session.handleOpenSession}
            />
          </div>
        </Suspense>
      )}

      <MobileTopSection
        currentSession={currentSession}
        online={online}
        offlineServed={offlineServed}
        syncing={session.syncing}
        sync={session.sync}
        heldCount={pos.heldCarts.length}
        totals={totals}
        totalTtcFinal={totalTtcFinal}
        invDisc={invDisc}
        invDiscPct={invDiscPct}
        onBack={() => navigate('/pos/pro')}
        setSheet={setSheet}
        onNewSale={handleNewSale}
      />

      {/* ── قائمة السلة ─────────────────────────────────────────────────── */}
      <MobileCartList
        items={pos.items}
        justAddedId={cart.justAddedId}
        onClear={() => {
          const doClear = () => { posRef.current.clearCart(); setRemovedItem(null); };
          if (settings.confirmOnClear) {
            clearConfirm.confirm('مسح السلة بالكامل؟').then((ok) => { if (ok) doClear(); });
          } else doClear();
        }}
        onRemove={cart.handleRemove}
        onUpdateQty={(id, qty) => posRef.current.updateQty(id, qty)}
        onDiscount={cart.handleItemDiscount}
        onDiscountAmount={cart.handleItemDiscountAmount}
      />

      {/* ── Snackbar تراجع عن الحذف ─────────────────────────────────────── */}
      <div className={`ppm-snackbar${removedItem ? ' show' : ''}`}>
        <span>{removedItem?.item.product_name ?? ''} — حُذف</span>
        <button onClick={cart.undoRemove}>تراجع</button>
      </div>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <button className="ppm-fab" onClick={() => setSheet('products')} aria-label="إضافة منتج">
        <i className="ti ti-plus" />
      </button>

      {/* ── الشريط السفلي ───────────────────────────────────────────────── */}
      <nav className="ppm-bottombar">
        <button className="ppm-bb-new" onClick={handleNewSale}>
          <i className="ti ti-file-plus" /><span>جديد</span>
        </button>
        <button className="ppm-bb-quick" onClick={() => handleQuickPay(cashMode)} disabled={!canSell}>
          <i className="ti ti-zap" /><span>نقدي</span>
        </button>
        <button className="ppm-bb-pay" onClick={handleOpenPayment} disabled={!canSell}>
          <i className="ti ti-credit-card" />
          <span className="ppm-amt ppm-mono">{money(totalTtcFinal)} دج</span>
        </button>
      </nav>

      {/* ── Sheet المنتجات ───────────────────────────────────────────────── */}
      <MobileProductsSheet
        open={sheet === 'products'}
        onClose={() => setSheet('none')}
        searchRef={prodSearchRef}
        search={prodSearch}
        setSearch={setProdSearch}
        activeCat={activeCat}
        setActiveCat={setActiveCat}
        families={families}
        visibleVariants={visibleVariants}
        qtyInCartByVariant={qtyInCartByVariant}
        allowNegSetting={allowNegSetting}
        onAdd={(v) => cart.handleAddItem(v)}
      />

      {/* ── Sheet الزبائن ───────────────────────────────────────────────── */}
      <MobileCustomerSheet
        open={sheet === 'customer'}
        onClose={() => setSheet('none')}
        searchRef={custSearchRef}
        search={custSearch}
        setSearch={setCustSearch}
        client={pos.client}
        clientBalanceVal={clientBalanceVal}
        visibleCustomers={visibleCustomers}
        onSelect={selectCustomer}
      />

      {/* ── Sheet الخصم ─────────────────────────────────────────────────── */}
      <MobileDiscountSheet
        open={sheet === 'discount'}
        onClose={() => setSheet('none')}
        discMode={cart.discMode}
        setDiscMode={cart.setDiscMode}
        discValue={cart.discValue}
        setDiscValue={cart.setDiscValue}
        invDiscPct={invDiscPct}
        invDisc={invDisc}
        onConfirm={cart.confirmDiscount}
        onRemove={() => { posRef.current.setInvoiceDiscountPct(0); setSheet('none'); cart.setDiscValue(''); }}
      />

      {/* ── Sheet السلال المعلقة ────────────────────────────────────────── */}
      <MobileHeldSheet
        open={sheet === 'held'}
        onClose={() => setSheet('none')}
        heldCarts={pos.heldCarts}
        onRestore={(id) => {
          const st = usePosProCart.getState();
          if (st.items.length > 0) posRef.current.holdCart();
          posRef.current.restoreCart(id);
          setSheet('none');
        }}
      />

      {/* ── الدفع ───────────────────────────────────────────────────────── */}
      {payOpen && (
        <Suspense fallback={null}>
          <ProfessionalPaymentModal
            totals={totals}
            client={pos.client}
            paymentModes={paymentModes}
            documentTypes={documentTypes}
            currencies={currencies}
            treasuryAccounts={treasuryAccounts}
            totalTtcFinal={totalTtcFinal}
            existingPayments={pos.payments}
            documentDate={new Date().toISOString().slice(0, 10)}
            isEditing={false}
            prevBalance={undefined}
            defaultPaymentCode={settings.defaultPaymentCode}
            defaultDocTypeCode={settings.defaultDocTypeCode}
            onClose={() => setPayOpen(false)}
            onConfirm={handleCompleteSale}
          />
        </Suspense>
      )}

      {/* ── الفاتورة (الاستلام) ─────────────────────────────────────────── */}
      {receiptOpen && receiptSnapshotRef.current && posTemplate && (
        <Suspense fallback={null}>
          <ProfessionalReceipt
            template={posTemplate}
            company={companyData}
            source={{ type: 'pos-snapshot', snapshot: receiptSnapshotRef.current } as PipelineSource}
            docNumber={receiptSnapshotRef.current.docNumber}
            onClose={() => setReceiptOpen(false)}
            onPrint={() => { const snap = receiptSnapshotRef.current; if (snap) handlePrintDirect(snap); }}
            onNewSale={() => { setReceiptOpen(false); if (settings.openClientOnNewSale) setSheet('customer'); }}
          />
        </Suspense>
      )}

      {/* ── ناجح ────────────────────────────────────────────────────────── */}
      {successOverlay && (
        <div className="ppm-pay-success show" onClick={() => setSuccessOverlay(null)}>
          <div className="ppm-ps-circle">
            <i className="ti ti-check" />
          </div>
          <div className="ppm-ps-title">تمت العملية بنجاح</div>
          <div className="ppm-ps-amt ppm-mono">{money(successOverlay.amount)} دج</div>
          <div className="ppm-ps-ref">فاتورة {successOverlay.docNumber}</div>
        </div>
      )}

      <ConfirmDialog {...clearConfirm.confirmDialogProps} />

      {pinModal && (
        <div className="ppm-backdrop show" onClick={() => setPinModal(null)}>
          <div className="ppm-pin-card" onClick={(e) => e.stopPropagation()}>
            <h3>إدخال رمز المدير</h3>
            <p>هذا الخصم يحتاج إذن المدير.</p>
            <input
              autoFocus
              type="password"
              placeholder="••••"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  setPinModal(null);
                  pinModal.onSuccess();
                }
              }}
            />
            <button onClick={() => setPinModal(null)}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}
