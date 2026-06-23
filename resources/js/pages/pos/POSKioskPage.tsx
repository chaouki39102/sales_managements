import React, { useState, useMemo } from 'react';
import { Toaster, toast }            from 'sonner';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usePOS }                     from '@/pos/hooks/usePOS';
import {
  usePaymentModes, useWarehouses, usePriceLevels,
  useCurrencies, useTreasuryAccounts, useDocumentTypes,
} from '@/lib/api/endpoints/lookups';
import { productsApi }   from '@/lib/api/endpoints/products';
import { partiesApi }    from '@/lib/api/endpoints/parties';
import { apiGet }        from '@/lib/api/core/client';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { documentsApi }  from '@/lib/api/endpoints/documents';
import { useActiveSlug } from '@/lib/store/appStore';
import {
  productToVariant, makeFakeVariant,
  type ViewMode, type GridSize, type SortMode,
} from '@/pos/utils/posHelpers';
import {
  calcFiscalStamp, formatDZD, htToTtc, ttcToHt,
} from '@/pos/utils/calculations';
import { printThermal, isWebUsbSupported, getThermalAutoPrint } from '@/pos/utils/printService';
import type { PaginatedResponse } from '@/lib/api/core/types';
import type {
  Product, ProductVariant, CartItem, CartTotals,
  PriceLevel, Party, PaymentMode, DocumentType,
} from '@/types';

import ProductSearchBar   from '@/pos/components/ProductSearchBar';
import CategoryTabs       from '@/pos/components/CategoryTabs';
import ProductGrid        from '@/pos/components/ProductGrid';
import ProfessionalPaymentModal from '@/pos/components/ProfessionalPaymentModal';
import ProfessionalReceipt      from '@/pos/components/ProfessionalReceipt';

const PER_PAGE = 60;

export default function POSKioskPage() {
  const pos        = usePOS();
  const slug       = useActiveSlug();
  const fiscalYear = useSelectedFiscalYear();

  const [searchQuery,      setSearchQuery]      = useState('');
  const [selectedCategory, setSelectedCategory]  = useState<number | null>(null);
  const [gridSize,         setGridSize]          = useState<GridSize>('md');
  const [view,             setView]              = useState<ViewMode>('grid');
  const [sortBy,           setSortBy]            = useState<SortMode>('name');
  const [modal,            setModal]             = useState<'none' | 'payment' | 'receipt' | 'confirm'>('none');
  const [lastDocNum,       setLastDocNum]        = useState<string | undefined>();
  const [receiptSnapshot,  setReceiptSnapshot]   = useState<{
    items: CartItem[]; totals: CartTotals; docNum?: string;
  } | null>(null);

  const { data: paymentModes     } = usePaymentModes();
  const { data: warehouses      } = useWarehouses();
  const { data: priceLevels     } = usePriceLevels();
  const { data: currencies      } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();
  const { data: documentTypes   } = useDocumentTypes();

  const defaultWarehouse = warehouses?.find(w => w.is_default) ?? null;
  const priceLevelsList  = priceLevels ?? [];

  const { data: productsRaw   } = useQuery({
    queryKey: ['pos-products-kiosk', slug, searchQuery, selectedCategory],
    queryFn: () => productsApi.list({
      per_page: PER_PAGE,
      search:   searchQuery || undefined,
      family_id: selectedCategory ?? undefined,
      with:     'variants,variants.quantity_discounts,category,family',
    }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const products = (productsRaw as PaginatedResponse<Product> | undefined)?.data ?? [];

  const allVariants = useMemo<ProductVariant[]>(() => {
    return products.flatMap(p => productToVariant(p, priceLevelsList, null));
  }, [products, priceLevelsList]);

  const families = useMemo(() => {
    const seen = new Set<string>();
    return products.flatMap(p => {
      if (!p.family || seen.has(p.family.name)) return [];
      seen.add(p.family.name);
      return [{ ...p.family, _count: { products: products.filter(x => x.family?.name === p.family?.name).length } }];
    });
  }, [products]);

  const [filteredVariants, setFilteredVariants] = useState<ProductVariant[]>([]);
  useMemo(() => setFilteredVariants(allVariants), [allVariants]);

  const handleCompleteSale = async (params: {
    paymentModeId: number; amount: number;
    payments?: Array<{ paymentModeId: number; amount: number; treasuryAccountId?: number | null }>;
  }) => {
    const invType     = documentTypes?.find(t => t.code === 'BL') ?? documentTypes?.[0];
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
        document_type_id:    invType.id,
        warehouse_id:        defaultWarehouse.id,
        fiscal_year_id:      fiscalYearId,
        client_id:           null,
        document_date:       new Date().toISOString().slice(0, 10),
        notes:               null,
        delivery_type:       undefined,
        lines: pos.items.map(i => ({
          product_id:          i.product_id,
          variant_id:          i.variant_id,
          quantity:            i.quantity,
          unit_price_ht:       i.unit_price_ht,
          discount_percentage: i.discount_percentage,
          tva_rate:            i.tva_rate,
        })),
        payments: apiPayments,
      });
      pos.incrementSession({
        amount: snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp,
        payments: params.payments,
        items: snapshot.items,
      });
      setReceiptSnapshot({ items: snapshot.items, totals: snapshot.totals, docNum: res.document_number });
      setLastDocNum(res.document_number);
      pos.clearCart();
      setModal('receipt');
      toast.success(`✅ تم حفظ الفاتورة ${res.document_number ?? ''}`);

      if (isWebUsbSupported() && getThermalAutoPrint()) {
        setTimeout(async () => {
          const r = await printThermal(snapshot.items, snapshot.totals, null, res.document_number);
          if (!r.ok) toast.error(r.message);
        }, 500);
      }
      return { ok: true, docNumber: res.document_number };
    } catch (err: any) {
      toast.error(err?.message ?? 'فشل حفظ الفاتورة');
      return { ok: false, message: String(err?.message ?? '') };
    }
  };

  const isEmpty = pos.items.length === 0;
  const totalTtcFinal = pos.totals.total_ttc + pos.totals.fiscal_stamp;

  return (
    <div className="pos-kiosk">
      <div className="pos-kiosk-hd">
        <div className="pos-kiosk-logo">نظام المبيعات — البيع الذاتي</div>
        <div className="pos-kiosk-summary">
          <span className="pos-kiosk-count">{pos.items.length} صنف</span>
          <span className="pos-kiosk-total">{formatDZD(totalTtcFinal)}</span>
          <button
            className="btn btn-p btn-lg"
            disabled={isEmpty}
            onClick={() => setModal('payment')}
          >
            <i className="ti ti-shopping-cart-check" /> دفع
          </button>
        </div>
      </div>

      <div className="pos-kiosk-body">
        <div className="pos-kiosk-search">
          <ProductSearchBar
            query={searchQuery} onQuery={setSearchQuery}
            view={view} gridSize={gridSize}
            onView={setView} onGridSize={setGridSize}
            onFilter={() => {}} filterActive={false}
            sortBy={sortBy} onSort={setSortBy}
            resultsCount={filteredVariants.length}
            onEnterFirst={() => { const first = filteredVariants[0]; if (first) pos.addItem(first); }}
          />
        </div>
        <CategoryTabs families={families} selected={selectedCategory} onSelect={setSelectedCategory} />
        <div className="pos-kiosk-grid">
          <ProductGrid
            variants={filteredVariants} view={view} gridSize={gridSize}
            loading={false} hasMore={false} onLoadMore={() => {}}
            onAdd={v => pos.addItem(v)} onAddManual={() => {}}
            onPin={() => {}} isPinned={() => false}
            priceLevels={priceLevelsList} selectedPriceLevelId={null}
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
            <button className="pos-kiosk-cb-remove" onClick={() => pos.removeItem(item.id)}>
              <i className="ti ti-x" />
            </button>
          </div>
        ))}
        {pos.items.length > 8 && (
          <div className="pos-kiosk-cb-more">+{pos.items.length - 8} أصناف أخرى</div>
        )}
      </div>

      {pos.items.length > 0 && (
        <div className="pos-kiosk-clear">
          <button className="btn btn-outline btn-sm" onClick={pos.clearCart}>
            <i className="ti ti-trash" /> إفراغ السلة
          </button>
        </div>
      )}

      {modal === 'payment' && (
        <ProfessionalPaymentModal
          totals={pos.totals} items={pos.items} client={null}
          paymentModes={paymentModes ?? []} documentTypes={documentTypes ?? []}
          currencies={currencies ?? []} treasuryAccounts={treasuryAccounts}
          totalTtcFinal={totalTtcFinal}
          onClose={() => setModal('none')} onConfirm={handleCompleteSale}
        />
      )}

      {modal === 'receipt' && receiptSnapshot && (
        <ProfessionalReceipt
          items={receiptSnapshot.items} totals={receiptSnapshot.totals}
          client={null} docNumber={receiptSnapshot.docNum ?? lastDocNum}
          onClose={() => { setModal('none'); setReceiptSnapshot(null); }}
          onPrint={() => window.print()}
          onNewSale={() => { setModal('none'); setReceiptSnapshot(null); pos.clearCart(); }}
        />
      )}

      <Toaster position="top-left" richColors closeButton
        toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif', fontSize: 14 } }}
      />
    </div>
  );
}
