// pages/portal/orders-admin/hooks/useAdminOrdersList.ts
// List state for the admin orders page: filters, paging, server sort, KPI counters, Excel export.
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotification } from '@/hooks/useNotification';
import { usePortalOrders, usePortalOrdersSummary } from '@/lib/api/endpoints/portalOrders';
import type { PortalOrderStatus } from '@/lib/api/portal/portal';
import { exportToExcel } from '@/pages/reports/exportUtils';
import { fmtDate, STATUS_META, MAIN_PIPELINE, TERMINALS } from '../ordersAdminUtils';

export function useAdminOrdersList() {
  const qc = useQueryClient();
  const notify = useNotification();

  // ── قائمة ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<PortalOrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const perPage = 15;

  const { data, isLoading } = usePortalOrders({
    page, per_page: perPage, status, search: debouncedSearch,
    from_date: fromDate || undefined, to_date: toDate || undefined,
    sort_by: sortBy || undefined, sort_dir: sortBy ? sortDir : undefined,
  });
  const summaryQuery = usePortalOrdersSummary();

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const from = meta ? meta.per_page * (meta.current_page - 1) + 1 : 0;
  const to = meta ? Math.min(meta.per_page * meta.current_page, meta.total) : 0;
  const pageTtc = useMemo(() => orders.reduce((s, o) => s + (o.total_ttc ?? 0), 0), [orders]);
  const hasFilters = !!status || !!debouncedSearch || !!fromDate || !!toDate;

  // ── بحث مع إبطاء ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  // ── بطاقات KPI (من الملخص) ─────────────────────────────────────────────
  const kpis = useMemo(() => {
    const s = summaryQuery.data;
    const base: { key: PortalOrderStatus | ''; label: string; icon: string; color: string; count: number }[] = [
      { key: '', label: 'الكل', icon: 'ti-layout-grid', color: 'var(--em)', count: s?.total ?? 0 },
    ];
    MAIN_PIPELINE.forEach((st) => base.push({
      key: st, label: STATUS_META[st].label, icon: STATUS_META[st].icon,
      color: STATUS_META[st].color, count: s?.[st] ?? 0,
    }));
    TERMINALS.forEach((st) => base.push({
      key: st, label: STATUS_META[st].label, icon: STATUS_META[st].icon,
      color: STATUS_META[st].color, count: s?.[st] ?? 0,
    }));
    // legacy pending: طلبات قديمة غير مهاجَرة (تظهر فقط إن وُجدت)
    if ((s?.pending ?? 0) > 0) {
      base.push({
        key: 'pending', label: STATUS_META.pending.label, icon: STATUS_META.pending.icon,
        color: STATUS_META.pending.color, count: s?.pending ?? 0,
      });
    }
    return base;
  }, [summaryQuery.data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['portal-orders'] });

  const clearFilters = () => {
    setStatus('');
    setSearch('');
    setDebouncedSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  // ── فرز الخادم (عبر رؤوس الجدول القابلة للنقر) ───────────────────────────
  const handleSort = (key: string, dir: 'asc' | 'desc') => {
    setSortBy(key);
    setSortDir(dir);
    setPage(1);
  };

  const handleExport = () => {
    if (orders.length === 0) {
      notify.error('لا توجد طلبات للتصدير');
      return;
    }
    void exportToExcel(
      [
        {
          name: 'الطلبات',
          headers: ['المرجع', 'التاريخ', 'الزبون', 'المنتجات', 'المجموع HT', 'TVA', 'المجموع TTC', 'الحالة'],
          rows: orders.map((o) => [
            o.reference,
            fmtDate(o.requested_at),
            o.party?.name ?? '',
            o.items_count,
            o.total_ht,
            o.total_tva,
            o.total_ttc,
            o.status_label,
          ]),
        },
      ],
      `طلبات-البوابة-${new Date().toISOString().slice(0, 10)}`,
    );
    notify.success(`تم تصدير ${orders.length} طلب إلى Excel`);
  };

  return {
    status,
    setStatus,
    page,
    setPage,
    search,
    setSearch,
    debouncedSearch,
    setDebouncedSearch,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    perPage,
    data,
    isLoading,
    summaryQuery,
    orders,
    meta,
    from,
    to,
    pageTtc,
    hasFilters,
    kpis,
    refresh,
    clearFilters,
    handleSort,
    handleExport,
  };
}

export type AdminOrdersListState = ReturnType<typeof useAdminOrdersList>;
