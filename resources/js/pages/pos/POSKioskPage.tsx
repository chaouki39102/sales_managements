import React, { useState, useMemo, useRef } from 'react';
import { Toaster, toast }             from 'sonner';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { usePOS }                     from '@/pos/hooks/usePOS';
import {
  usePaymentModes, useWarehouses,
  useCurrencies, useTreasuryAccounts, useDocumentTypes,
} from '@/lib/api/endpoints/lookups';
import { productsApi }                from '@/lib/api/endpoints/products';
import { useSelectedFiscalYear, useFiscalYears } from '@/lib/api/endpoints/fiscalYears';
import { documentsApi }               from '@/lib/api/endpoints/documents';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import {
  useCurrentPosSession,
  useOpenSession,
  useIncrementSession,
  buildIncrementInput,
} from '@/lib/api/endpoints/posSession';
import {
  productToVariant, makeFakeVariant,
  type ViewMode, type GridSize, type SortMode,
} from '@/pos/utils/posHelpers';
import { formatDZD, ttcToHt }         from '@/pos/utils/calculations';
import { isWebUsbSupported, getThermalAutoPrint, printThermalViaWebUSBFromTemplate } from '@/pos/utils/printService';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
import { usePrintSettings }           from '@/pos/hooks/usePrintSettings';
import { defaultTemplate }            from '@/pages/settings/print-settings/types';
import type { PaginatedResponse }      from '@/lib/api/core/types';
import type { Product, ProductVariant, CartItem, CartTotals } from '@/types';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { CompanyPreviewData } from '@/pages/settings/print-settings/types';

import ProductSearchBar         from '@/pos/components/ProductSearchBar';
import CategoryTabs             from '@/pos/components/CategoryTabs';
import ProductGrid              from '@/pos/components/ProductGrid';
import ProfessionalPaymentModal from '@/pos/components/ProfessionalPaymentModal';
import ProfessionalReceipt      from '@/pos/components/ProfessionalReceipt';
import OpenSessionModal         from '@/pos/components/OpenSessionModal';

const PER_PAGE = 60;

export default function POSKioskPage() {
  const pos        = usePOS();
  const slug       = useActiveSlug();
  const company    = useActiveCompany();
  const fiscalYear = useSelectedFiscalYear();
  const qc         = useQueryClient();

  const [searchQuery,      setSearchQuery]     = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [gridSize,         setGridSize]         = useState<GridSize>('md');
  const [view,             setView]             = useState<ViewMode>('grid');
  const [sortBy,           setSortBy]           = useState<SortMode>('name');
  const [modal,            setModal]            = useState<'none' | 'payment' | 'receipt'>('none');
  const [lastDocNum,       setLastDocNum]       = useState<string | undefined>();
  const [sessionError,     setSessionError]     = useState<string | null>(null);
  const [receiptSnapshot,  setReceiptSnapshot]  = useState<{
    items: CartItem[]; totals: CartTotals; docNum?: string;
  } | null>(null);

  const posSaleSnapshot = useMemo((): POSSaleSnapshot | null => {
    if (!receiptSnapshot) return null;
    const snap = receiptSnapshot;
    const totalTtc = snap.totals.total_ttc + snap.totals.fiscal_stamp;
    return {
      docNumber: snap.docNum ?? lastDocNum,
      docDate:   new Date().toISOString().slice(0, 10),
      client: null,
      items: snap.items.map(i => ({
        name: i.product_name,
        ref: i.ref,
        qty: i.quantity,
        unit_price_ht: i.unit_price_ht,
        unit: i.unit_symbol,
        tva_rate: i.tva_rate / 100,
        discount_percentage: i.discount_percentage,
        total_ht: i.total_ht,
      })),
      totals: {
        total_ht:       snap.totals.total_ht,
        total_tva:      snap.totals.total_tva,
        total_ttc:      snap.totals.total_ttc,
        fiscal_stamp:   snap.totals.fiscal_stamp,
        total_discount: snap.totals.total_discount,
        paid:   totalTtc,
        change: 0,
        remaining: 0,
      },
      payments: [],
      cashierName: undefined,
    };
  }, [receiptSnapshot, lastDocNum]);

  const receiptSource = useMemo((): PipelineSource | null => {
    if (!posSaleSnapshot) return null;
    return { type: 'pos-snapshot', snapshot: posSaleSnapshot };
  }, [posSaleSnapshot]);

  const posSaleSnapshotRef = useRef(posSaleSnapshot);
  posSaleSnapshotRef.current = posSaleSnapshot;

  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
  const { data: fyData }  = useFiscalYears();
  const fiscalYearsList   = fyData?.years ?? [];
  const openSessionMut    = useOpenSession();
  const incrementMut      = useIncrementSession(currentSession?.id ?? null);

  const handleOpenSession = async (data: {
    warehouse_id: number; fiscal_year_id: number;
    opening_cash: number; opening_note?: string;
  }) => {
    setSessionError(null);
    try { await openSessionMut.mutateAsync(data); }
    catch (e: any) { setSessionError(e?.message ?? 'فشل فتح الجلسة'); }
  };

  const { data: paymentModes     } = usePaymentModes();
  const { data: warehouses       } = useWarehouses();
  const { data: currencies       } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();
  const { data: documentTypes    } = useDocumentTypes();

  const defaultWarehouse = warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null;

  const { template } = usePrintSettings('FV');

  const companyData: CompanyPreviewData | null = useMemo(() => {
    if (!company) return null;
    return {
      name:    company.name    ?? '',
      address: company.address ?? '',
      phone:   company.phone   ?? '',
      nif:     company.nif     ?? '',
      rc:      company.rc      ?? '',
      nis:     company.nis     ?? '',
      ice:     '',
      article: company.ai      ?? '',
      logoUrl: company.avatar  ?? null,
    };
  }, [company]);

  const { data: productsRaw } = useQuery({
    queryKey: ['pos-products-kiosk', slug, searchQuery, selectedCategory],
    queryFn:  () => productsApi.list({
      per_page:  PER_PAGE,
      include:   'tva,unit,family,prices.priceLevel',
      search:    searchQuery || undefined,
      family_id: selectedCategory ?? undefined,
      active:    true,
    }),
    placeholderData: keepPreviousData,
    staleTime:       60_000,
  });

  const products    = (productsRaw as PaginatedResponse<Product> | undefined)?.data ?? [];
  const allVariants = useMemo<ProductVariant[]>(
    () => products.map(p => productToVariant(p)),
    [products],
  );

  const families = useMemo(() => Array.from(
    new Map(
      allVariants
        .filter(v => v.product?.family)
        .map(v => [v.product!.family!.id, v.product!.family!]),
    ).values(),
  ), [allVariants]);

  const handleCompleteSale = async (params: {
    paymentModeId: number;
    amount:        number;
    payments?:     Array<{ paymentModeId: number; amount: number; treasuryAccountId?: number | null }>;
  }) => {
    const invType     = documentTypes?.find(t => t.code === 'BL')
                     ?? documentTypes?.find(t => t.code === 'FV')
                     ?? documentTypes?.[0];
    const fiscalYearId = fiscalYear?.id;

    if (!invType || !defaultWarehouse || !fiscalYearId) {
      toast.error('بيانات الفاتورة غير مكتملة');
      return { ok: false, message: 'بيانات الفاتورة غير مكتملة' };
    }

    try {
      const snapshot = { items: [...pos.items], totals: { ...pos.totals } };

      const apiPayments = (params.payments ?? [])
        .filter(p => p.amount > 0)
        .map(p => ({
          payment_mode_id:     p.paymentModeId,
          amount:              p.amount,
          payment_date:        new Date().toISOString().slice(0, 10),
          treasury_account_id: p.treasuryAccountId ?? null,
        }));

      const res = await documentsApi.create({
        document_type_id: invType.id,
        party_id:         pos.client?.id ?? null,
        warehouse_id:     defaultWarehouse.id,
        fiscal_year_id:   fiscalYearId,
        document_date:    new Date().toISOString().slice(0, 10),
        notes:            null,
        lines: pos.items.map(i => ({
          product_id:          i.product_id,
          quantity:            i.quantity,
          unit_price_ht:       i.unit_price_ht,
          discount_percentage: i.discount_percentage,
          tva_rate:            i.tva_rate,
        })),
        payments: apiPayments,
      });

      const grandTotal = snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp;
      if (currentSession?.id) {
        incrementMut.mutate(
          buildIncrementInput({
            items:            snapshot.items,
            totalHt:          snapshot.totals.total_ht,
            totalTva:         snapshot.totals.total_tva,
            totalFiscalStamp: snapshot.totals.fiscal_stamp,
            totalDiscount:    snapshot.totals.total_discount,
            grandTotal,
            payments: apiPayments.map(p => ({
              payment_mode_id: p.payment_mode_id,
              amount:          p.amount,
            })),
          }),
        );
      }

      if (slug) qc.invalidateQueries({ queryKey: [slug, 'pos-stock'] });

      setReceiptSnapshot({
        items:  snapshot.items,
        totals: snapshot.totals,
        docNum: res.document_number,
      });
      setLastDocNum(res.document_number);
      pos.clearCart();
      setModal('receipt');

      if (isWebUsbSupported() && getThermalAutoPrint()) {
        setTimeout(async () => {
          const snap = posSaleSnapshotRef.current;
          if (!snap) return;
          const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? {} as any);
          const r = await printThermalViaWebUSBFromTemplate(template, data, res.document_number);
          if (!r.ok) toast.error(r.message);
        }, 500);
      }

      return { ok: true, docNumber: res.document_number };

    } catch (err: any) {
      toast.error(err?.message ?? 'فشل حفظ الفاتورة');
      return { ok: false, message: String(err?.message ?? '') };
    }
  };

  const isEmpty       = pos.items.length === 0;
  const totalTtcFinal = pos.totals.total_ttc + pos.totals.fiscal_stamp;

  return (
    <div className="pos-kiosk">
      {!sessionLoading && !currentSession && (
        <OpenSessionModal
          warehouses={warehouses ?? []}
          fiscalYears={fiscalYearsList}
          defaultWarehouseId={defaultWarehouse?.id}
          defaultFiscalYearId={fiscalYear?.id}
          isLoading={openSessionMut.isPending}
          error={sessionError}
          onOpen={handleOpenSession}
        />
      )}

      <div className="pos-kiosk-hd">
        <div className="pos-kiosk-logo">
          {company?.name ?? 'نقطة البيع الذاتي'}
        </div>
        <div className="pos-kiosk-summary">
          <span className="pos-kiosk-count">{pos.items.length} صنف</span>
          <span className="pos-kiosk-total">{formatDZD(totalTtcFinal)}</span>
          <button
            className="btn btn-p btn-lg"
            disabled={isEmpty}
            onClick={() => setModal('payment')}
            type="button"
          >
            <i className="ti ti-shopping-cart-check" /> دفع
          </button>
        </div>
      </div>

      <div className="pos-kiosk-body">
        <div className="pos-kiosk-search">
          <ProductSearchBar
            query={searchQuery}
            onQuery={setSearchQuery}
            view={view}
            gridSize={gridSize}
            onView={setView}
            onGridSize={setGridSize}
            onFilter={() => {}}
            filterActive={false}
            sortBy={sortBy}
            onSort={setSortBy}
            resultsCount={allVariants.length}
            onEnterFirst={() => {
              const first = allVariants[0];
              if (first) pos.addItem(first);
            }}
          />
        </div>
        <CategoryTabs
          families={families}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <div className="pos-kiosk-grid">
          <ProductGrid
            variants={allVariants}
            view={view}
            gridSize={gridSize}
            loading={false}
            hasMore={false}
            onLoadMore={() => {}}
            onAdd={v => pos.addItem(v)}
            onAddManual={() => {}}
            onPin={() => {}}
            isPinned={() => false}
            priceLevels={[]}
            selectedPriceLevelId={null}
            cartItems={pos.items}
          />
        </div>
      </div>

      <div className="pos-kiosk-cartbar">
        {pos.items.slice(0, 8).map(item => (
          <div key={item.id} className="pos-kiosk-cb-item">
            <span className="pos-kiosk-cb-name">{item.product_name}</span>
            <span className="pos-kiosk-cb-qty">×{item.quantity}</span>
            <span className="pos-kiosk-cb-price">{formatDZD(item.total_ttc)}</span>
            <button
              className="pos-kiosk-cb-remove"
              onClick={() => pos.removeItem(item.id)}
              type="button"
            >
              <i className="ti ti-x" />
            </button>
          </div>
        ))}
        {pos.items.length > 8 && (
          <div className="pos-kiosk-cb-more">
            +{pos.items.length - 8} أصناف أخرى
          </div>
        )}
      </div>

      {pos.items.length > 0 && (
        <div className="pos-kiosk-clear">
          <button
            className="btn btn-outline btn-sm"
            onClick={pos.clearCart}
            type="button"
          >
            <i className="ti ti-trash" /> إفراغ السلة
          </button>
        </div>
      )}

      {modal === 'payment' && (
        <ProfessionalPaymentModal
          totals={pos.totals}
          items={pos.items}
          client={null}
          paymentModes={paymentModes ?? []}
          documentTypes={documentTypes ?? []}
          currencies={currencies ?? []}
          treasuryAccounts={treasuryAccounts ?? []}
          totalTtcFinal={totalTtcFinal}
          onClose={() => setModal('none')}
          onConfirm={handleCompleteSale}
        />
      )}

      {modal === 'receipt' && receiptSnapshot && receiptSource && (
        <ProfessionalReceipt
          template={template ?? defaultTemplate()}
          company={companyData}
          source={receiptSource}
          docNumber={receiptSnapshot.docNum}
          onClose={() => { setModal('none'); setReceiptSnapshot(null); }}
          onPrint={() => window.print()}
          onNewSale={() => { setModal('none'); setReceiptSnapshot(null); pos.clearCart(); }}
        />
      )}

      <Toaster
        position="top-center"
        richColors
        toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif', fontSize: 16 } }}
      />
    </div>
  );
}
