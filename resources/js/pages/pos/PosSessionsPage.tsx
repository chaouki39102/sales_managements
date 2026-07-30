import { usePosSessions } from '@/pos/hooks/usePosSessions';
import { formatDZD }      from '@/pos/utils/calculations';

import OpenSessionModal  from '@/pos/components/OpenSessionModal';
import CloseSessionModal from '@/pos/components/CloseSessionModal';
import SessionStatsModal from '@/pos/components/SessionStatsModal';
import LiveSessionBanner from '@/pos/components/LiveSessionBanner';
import PosSessionsFilters from '@/pos/components/PosSessionsFilters';
import PosSessionsTable  from '@/pos/components/PosSessionsTable';
import PosSessionsCards  from '@/pos/components/PosSessionsCards';
import PosSessionsPagination from '@/pos/components/PosSessionsPagination';

import PageHeader from '@/components/ui/PageHeader';
import KpiCard    from '@/components/ui/KpiCard';
import Button     from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

export default function PosSessionsPage() {
  const {
    page, setPage,
    statusFilter, setStatusFilter,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    viewMode, setViewMode,
    search, setSearch,
    selectedId, setSelectedId,
    showOpenModal, setShowOpenModal,
    showCloseModal, setShowCloseModal,
    showStatsModal, setShowStatsModal,
    openError, closeError, setCloseError,

    isLoading, isFetching,
    currentSession, sessionLoading,
    selectedSession,
    warehouses,
    fiscalYears, defaultFiscalYearId, defaultWarehouseId,
    openMut, closeMut,

    meta,
    filtered,
    totalSales, totalInvoices, openCount, closedCount, avgSale, maxSale,
    hasFilters,

    handleOpenSession, handleCloseSession,
    openStats, openClose,
    resetFilters,
  } = usePosSessions();

  return (
    <div className="page on pss-page" id="p-pos-sessions">

      <PageHeader
        title="جلسات نقاط البيع"
        description={
          meta?.total != null
            ? `${meta.total} جلسة${currentSession ? ' · جلسة نشطة الآن' : ''}`
            : undefined
        }
        actions={
          <>
            <div className="pss-view-toggle">
              <button
                className={`pss-vt-btn ${viewMode === 'table' ? 'on' : ''}`}
                onClick={() => setViewMode('table')}
                title="جدول"
              >
                <i className="ti ti-layout-list" />
              </button>
              <button
                className={`pss-vt-btn ${viewMode === 'cards' ? 'on' : ''}`}
                onClick={() => setViewMode('cards')}
                title="بطاقات"
              >
                <i className="ti ti-layout-grid" />
              </button>
            </div>
            {currentSession ? (
              <Button variant="danger" icon={<i className="ti ti-door-exit" />} onClick={() => openClose(currentSession.id)}>
                إغلاق الجلسة الحالية
              </Button>
            ) : (
              <Button variant="primary" icon={<i className="ti ti-plus" />} onClick={() => setShowOpenModal(true)} disabled={sessionLoading}>
                فتح جلسة جديدة
              </Button>
            )}
          </>
        }
      />

      {currentSession && (
        <LiveSessionBanner
          session={currentSession}
          onStats={openStats}
          onClose={openClose}
        />
      )}

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        <KpiCard variant="green" icon="ti-cash" label="إجمالي المبيعات" value={formatDZD(totalSales)} sub={meta?.total ? `من ${meta.total} جلسة` : undefined} />
        <KpiCard variant="blue" icon="ti-receipt" label="الفواتير" value={totalInvoices.toLocaleString('fr-DZ')} sub={`متوسط: ${formatDZD(avgSale)}`} />
        <KpiCard variant="green" icon="ti-door-enter" label="جلسات مفتوحة" value={openCount} />
        <KpiCard variant="teal" icon="ti-door-exit" label="جلسات مغلقة" value={closedCount} />
        <KpiCard variant="purple" icon="ti-trending-up" label="أعلى مبيعات" value={formatDZD(maxSale)} />
      </div>

      <PosSessionsFilters
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        statusFilter={statusFilter}
        onStatusChange={v => { setStatusFilter(v); setPage(1); }}
        dateFrom={dateFrom}
        onDateFromChange={v => { setDateFrom(v); setPage(1); }}
        dateTo={dateTo}
        onDateToChange={v => { setDateTo(v); setPage(1); }}
        hasFilters={hasFilters}
        onReset={resetFilters}
        isSyncing={isFetching && !isLoading}
      />

      {isLoading ? (
        <div className="pss-loading">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="pss-skeleton" style={{ animationDelay: `${i * 0.07}s` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="ti-device-desktop-off"
          text="لا توجد جلسات"
          sub={hasFilters ? 'لا توجد جلسات تطابق معايير البحث الحالية' : 'ابدأ بفتح أول جلسة بيع'}
          action={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {hasFilters && (
                <Button icon={<i className="ti ti-refresh" />} onClick={resetFilters}>
                  إعادة ضبط الفلاتر
                </Button>
              )}
              {!currentSession && (
                <Button variant="primary" icon={<i className="ti ti-plus" />} onClick={() => setShowOpenModal(true)}>
                  فتح جلسة جديدة
                </Button>
              )}
            </div>
          }
        />
      ) : viewMode === 'table' ? (
        <PosSessionsTable
          sessions={filtered}
          isFetching={isFetching}
          selectedId={selectedId}
          maxSale={maxSale}
          onStats={openStats}
          onClose={openClose}
        />
      ) : (
        <PosSessionsCards
          sessions={filtered}
          isFetching={isFetching}
          selectedId={selectedId}
          onStats={openStats}
          onClose={openClose}
        />
      )}

      {meta && meta.last_page > 1 && (
        <PosSessionsPagination meta={meta} page={page} onPageChange={setPage} />
      )}

      {showStatsModal && selectedId && selectedSession && (
        <SessionStatsModal
          session={selectedSession}
          onClose={() => { setShowStatsModal(false); setSelectedId(null); }}
          onEndSession={() => {
            setShowStatsModal(false);
            setShowCloseModal(true);
          }}
        />
      )}

      {showOpenModal && (
        <OpenSessionModal
          warehouses={warehouses}
          fiscalYears={fiscalYears}
          defaultWarehouseId={defaultWarehouseId}
          defaultFiscalYearId={defaultFiscalYearId}
          isLoading={openMut.isPending}
          error={openError}
          onOpen={handleOpenSession}
          onClose={() => setShowOpenModal(false)}
        />
      )}

      {showCloseModal && selectedSession && (
        <CloseSessionModal
          session={selectedSession}
          isLoading={closeMut.isPending}
          error={closeError}
          onClose={() => { setShowCloseModal(false); setCloseError(null); }}
          onConfirm={handleCloseSession}
        />
      )}
    </div>
  );
}
