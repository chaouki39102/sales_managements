// pages/portal/orders/components/CatalogSection.tsx
// Catalog header + search, ordering-blocked banner, product grid and pager.
import { Pager, PortalLoading, PortalError, PortalEmpty } from '../../portalUtils';
import type { PortalOrdersState } from '../hooks/usePortalOrdersState';
import CatalogProductCard from './CatalogProductCard';

export default function CatalogSection(props: PortalOrdersState) {
  const {
    search, setSearch, setCatalogPage, catalogQuery, cfg, canOrder, showSearch, visibleItems,
    catalogMeta, catalogFrom, catalogTo,
  } = props;

  return (
    <div className="portal-store">
      <div className="portal-store-hd">
        <div className="portal-store-hd-t">
          <h2><i className="ti ti-building-store" /> كتالوج المنتجات</h2>
          <p>{catalogQuery.data ? `${catalogQuery.data.meta.total} منتج متوفر` : 'تصفّح المنتجات واختر ما يناسبك'}</p>
        </div>
        {showSearch && (
          <div className="portal-search portal-search--lg">
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder="ابحث عن منتج بالاسم أو المرجع..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCatalogPage(1); }}
            />
            {search && (
              <button className="portal-search-x" onClick={() => { setSearch(''); setCatalogPage(1); }} type="button">
                <i className="ti ti-x" />
              </button>
            )}
          </div>
        )}
      </div>

      {cfg && !canOrder && (
        <div className="portal-blocked-banner">
          <i className={cfg.enabled ? 'ti ti-user-off' : 'ti ti-basket-off'} />
          <span>
            {cfg.enabled
              ? (cfg.authenticated
                  ? 'إرسال الطلبات معطل حالياً على حسابك — تواصل مع المؤسسة لتفعيله.'
                  : 'إرسال الطلبات من الزوار معطل حالياً.')
              : 'إرسال الطلبات معطل حالياً من طرف المؤسسة.'}
          </span>
        </div>
      )}

      {catalogQuery.isLoading ? (
        <PortalLoading text="جاري تحميل الكتالوج..." />
      ) : catalogQuery.isError || !catalogQuery.data ? (
        <PortalError message="تعذر تحميل كتالوج المنتجات" />
      ) : catalogQuery.data.data.length === 0 || visibleItems.length === 0 ? (
        <PortalEmpty icon="ti-package" text={search ? 'لا توجد منتجات مطابقة' : 'لا توجد منتجات'} />
      ) : (
        <>
          <div className="portal-catalog">
            {visibleItems.map((p) => (
              <CatalogProductCard key={p.id} {...props} p={p} />
            ))}
          </div>
          {catalogMeta && catalogMeta.last_page > 1 && (
            <div className="portal-mt-16">
              <Pager
                page={catalogMeta.current_page}
                lastPage={catalogMeta.last_page}
                total={catalogMeta.total}
                from={catalogFrom}
                to={catalogTo}
                onChange={setCatalogPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
