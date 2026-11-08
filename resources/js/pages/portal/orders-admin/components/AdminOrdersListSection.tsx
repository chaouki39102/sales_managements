// pages/portal/orders-admin/components/AdminOrdersListSection.tsx
// KPI cards, pipeline summary, toolbar, orders table and pagination.
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';
import type { PortalAdminOrder } from '@/lib/api/endpoints/portalOrders';
import type { PortalOrderStatus } from '@/lib/api/portal/portal';
import OrderPipeline from '../../OrderPipeline';
import { fmt, fmtDate, STATUS_META, stMeta, MAIN_PIPELINE, TERMINALS, initialsOf } from '../ordersAdminUtils';
import type { AdminOrdersListState } from '../hooks/useAdminOrdersList';

export default function AdminOrdersListSection(props: AdminOrdersListState & { openDetail: (o: PortalAdminOrder) => void }) {
  const {
    status,
    setStatus,
    setPage,
    search,
    setSearch,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    sortBy,
    sortDir,
    perPage,
    isLoading,
    summaryQuery,
    orders,
    meta,
    from,
    to,
    pageTtc,
    hasFilters,
    kpis,
    clearFilters,
    handleSort,
    handleExport,
    openDetail,
  } = props;

  return (
    <div className="poa">
      {/* ── شريط بطاقات KPI ─────────────────────────────────────────── */}
      <div className="poa-kpis">
        {kpis.map((k) => (
          <button
            key={k.key}
            className={`poa-kpi${status === k.key ? ' on' : ''}`}
            style={{ ['--ac' as string]: k.color }}
            onClick={() => { setStatus(k.key); setPage(1); }}
            aria-pressed={status === k.key}
          >
            <span className="poa-kpi-ic"><i className={`ti ${k.icon}`} /></span>
            <span className="poa-kpi-meta">
              <span className="poa-kpi-num">{k.count}</span>
              <span className="poa-kpi-lbl">{k.label}</span>
            </span>
            <span className="poa-kpi-glow" />
          </button>
        ))}
      </div>

      {/* ── شريط خط الأنابيب (ملخص) ─────────────────────────────────── */}
      <div className="poa-sec poa-sec--tight">
        <OrderPipeline
          status={status === '' ? 'preparing' : status}
          counts={summaryQuery.data}
          summary
          onStepClick={(st) => { setStatus(st); setPage(1); }}
        />
      </div>

      {/* ── شريط الأدوات ─────────────────────────────────────────────── */}
      <div className="poa-bar">
        <div className="poa-bar-filters">
          <div className="poa-select">
            <i className="ti ti-tag" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as PortalOrderStatus | ''); setPage(1); }}
              aria-label="فلترة حسب الحالة"
            >
              <option value="">كل الحالات</option>
              {[...MAIN_PIPELINE, ...TERMINALS].map((st) => (
                <option key={st} value={st}>{STATUS_META[st].label}</option>
              ))}
            </select>
          </div>
          <div className="poa-date">
            <i className="ti ti-calendar-plus" />
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} aria-label="من تاريخ" />
          </div>
          <div className="poa-date">
            <i className="ti ti-calendar-minus" />
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} aria-label="إلى تاريخ" />
          </div>
          <div className="poa-search">
            <i className="ti ti-search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالمرجع أو اسم الزبون..."
            />
            {search && (
              <button className="poa-search-clear" onClick={() => setSearch('')} aria-label="مسح البحث">
                <i className="ti ti-x" />
              </button>
            )}
          </div>
          {hasFilters && (
            <button className="poa-filters-clear" onClick={clearFilters} aria-label="إلغاء الفلاتر">
              <i className="ti ti-filter-off" /> إلغاء الفلاتر
            </button>
          )}
        </div>
        <div className="poa-bar-side">
          <span className="poa-sort-hint">
            <i className="ti ti-arrows-sort" />
            انقر على رأس العمود للترتيب
          </span>
          <span className="poa-hint">
            <i className="ti ti-clipboard-list" />
            {meta?.total ?? 0} طلب · يعرض {from}–{to}
            {pageTtc > 0 && <b className="poa-hint-ttc">المجموع {fmt(pageTtc)} دج</b>}
          </span>
          <Button variant="outline" size="sm" icon={<i className="ti ti-file-spreadsheet" />} onClick={handleExport}>
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* ── الجدول ───────────────────────────────────────────────────── */}
      <SimpleTable
        className="poa-table"
        isLoading={isLoading}
        emptyText="لا توجد طلبات مطابقة"
        rowKey="id"
        onRowClick={(row) => openDetail(row as PortalAdminOrder)}
        rowClassName={(row) => (!!(row as PortalAdminOrder).customer_name ? 'poa-tr-guest' : '')}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        columns={[
          {
            key: 'reference', label: 'المرجع', align: 'center', sortable: true,
            render: (v) => <b className="poa-mono">{v as string}</b>,
          },
          {
            key: 'requested_at', label: 'التاريخ', align: 'center', sortable: true,
            render: (v) => <span className="poa-cell-date">{fmtDate(v as string)}</span>,
          },
          {
            key: 'party', label: 'الزبون',
            render: (_v, row) => {
              const o = row as PortalAdminOrder;
              const p = o.party;
              const guest = !!o.customer_name;
              const name = guest ? o.customer_name : (p?.name ?? '—');
              const sub = guest
                ? (o.customer_phone || 'بدون هاتف')
                : (p?.code ?? '');
              return (
                <div className={`poa-cust ${guest ? 'poa-cust--guest' : ''}`}>
                  <span className="poa-avatar">{initialsOf(name)}</span>
                  <span className="poa-cust-meta">
                    <span className="poa-cust-name">{name}</span>
                    <span className="poa-cust-sub">{sub}</span>
                  </span>
                  {guest && (
                    <span className="poa-guest-chip" title="طلب عام — زائر غير مسجّل في البوابة">
                      <i className="ti ti-user-off" /> زائر
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            key: 'items_count', label: 'المنتجات', align: 'center', sortable: true,
            render: (v) => <span className="poa-cell-num">{v as number}</span>,
          },
          {
            key: 'total_ttc', label: 'المجموع TTC', align: 'end', sortable: true,
            render: (v) => <b>{fmt(Number(v))} <span className="poa-ttc-unit">دج</span></b>,
          },
          {
            key: 'status', label: 'الحالة', align: 'center', sortable: true,
            render: (_v, row) => {
              const st = (row as PortalAdminOrder).status;
              return <Badge variant={stMeta(st).badge} noDot>{stMeta(st).label}</Badge>;
            },
          },
          {
            key: '__actions__', label: '',
            render: (_v, row) => (
              <Button
                variant="outline"
                size="xs"
                icon={<i className="ti ti-arrow-left" />}
                onClick={(e) => { e.stopPropagation(); openDetail(row as PortalAdminOrder); }}
              >
                فتح
              </Button>
            ),
          },
        ]}
        data={orders}
      />

      {/* ── ترقيم الصفحات ────────────────────────────────────────────── */}
      {meta && meta.total > perPage && (
        <div className="poa-bar poa-bar--mt6">
          <span className="poa-hint">صفحة {meta.current_page} من {meta.last_page}</span>
          <div className="poa-flex-gap6">
            <Button
              variant="outline" size="sm" aria-label="السابق"
              icon={<i className="ti ti-chevron-right" />}
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => p - 1)}
            />
            <Button
              variant="outline" size="sm" aria-label="التالي"
              icon={<i className="ti ti-chevron-left" />}
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
