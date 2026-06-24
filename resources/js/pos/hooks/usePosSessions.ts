import { useState, useMemo, useCallback } from 'react';
import {
  useCurrentPosSession,
  usePosSessionList,
  usePosSession,
  useOpenSession,
  useCloseSession,
} from '@/lib/api/endpoints/posSession';
import { useWarehouses } from '@/lib/api/endpoints/lookups';
import { useFiscalYears } from '@/lib/api/endpoints/fiscalYears';
import type { PosSession } from '@/lib/api/endpoints/posSession';

export type StatusFilter = '' | 'open' | 'closed' | 'suspended';
export type ViewMode = 'table' | 'cards';

export const STATUS_VARIANT: Record<string, 'success' | 'gray' | 'warning'> = {
  open:      'success',
  closed:    'gray',
  suspended: 'warning',
};

export const STATUS_LABEL: Record<string, string> = {
  open:      'مفتوحة',
  closed:    'مغلقة',
  suspended: 'معلقة',
};

export function usePosSessions() {

  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [viewMode,     setViewMode]     = useState<ViewMode>('table');
  const [search,       setSearch]       = useState('');

  const [selectedId,     setSelectedId]     = useState<number | null>(null);
  const [showOpenModal,  setShowOpenModal]   = useState(false);
  const [showCloseModal, setShowCloseModal]  = useState(false);
  const [showStatsModal, setShowStatsModal]  = useState(false);
  const [openError,      setOpenError]       = useState<string | null>(null);
  const [closeError,     setCloseError]      = useState<string | null>(null);

  const { data: paginated, isLoading, isFetching } = usePosSessionList({
    per_page: 25,
    page,
    ...(statusFilter && { status: statusFilter }),
    ...(dateFrom     && { date_from: dateFrom }),
    ...(dateTo       && { date_to:   dateTo   }),
  });

  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();

  const { data: selectedSession, isLoading: selectedLoading } = usePosSession(selectedId);

  const { data: warehouses = [] } = useWarehouses();
  const { data: fyData } = useFiscalYears();
  const fiscalYears = fyData?.open ?? fyData?.years ?? [];
  const defaultFiscalYearId = fyData?.current?.id ?? null;
  const defaultWarehouseId = (warehouses[0] as any)?.id ?? null;

  const openMut = useOpenSession();
  const closeSessionId = selectedId ?? currentSession?.id ?? null;
  const closeMut = useCloseSession(closeSessionId);

  const sessions: PosSession[] = paginated?.data ?? [];
  const meta = paginated?.meta;

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s =>
      s.user?.name?.toLowerCase().includes(q) ||
      s.warehouse?.name?.toLowerCase().includes(q),
    );
  }, [sessions, search]);

  const totalSales    = useMemo(() => sessions.reduce((acc, x) => acc + Number(x.net_sales   ?? 0), 0), [sessions]);
  const totalInvoices = useMemo(() => sessions.reduce((acc, x) => acc + Number(x.invoices_count ?? 0), 0), [sessions]);
  const openCount     = useMemo(() => sessions.filter(x => x.status === 'open').length,   [sessions]);
  const closedCount   = useMemo(() => sessions.filter(x => x.status === 'closed').length, [sessions]);
  const avgSale       = totalInvoices > 0 ? totalSales / totalInvoices : 0;
  const maxSale       = useMemo(() => Math.max(...sessions.map(s => Number(s.net_sales ?? 0)), 0), [sessions]);

  const hasFilters = !!(statusFilter || dateFrom || dateTo || search);

  const handleOpenSession = async (data: {
    warehouse_id:   number;
    fiscal_year_id: number;
    opening_cash:   number;
    opening_note?:  string;
  }) => {
    setOpenError(null);
    try {
      await openMut.mutateAsync(data);
      setShowOpenModal(false);
    } catch (e: any) {
      setOpenError(
        e?.response?.data?.message ??
        e?.message ??
        'فشل فتح الجلسة',
      );
    }
  };

  const handleCloseSession = async (data: {
    closing_cash_counted: number;
    closing_note?:        string;
  }) => {
    setCloseError(null);
    try {
      await closeMut.mutateAsync(data);
      setShowCloseModal(false);
      setSelectedId(null);
    } catch (e: any) {
      setCloseError(
        e?.response?.data?.message ??
        e?.message ??
        'فشل إغلاق الجلسة',
      );
    }
  };

  const openStats = useCallback((id: number) => {
    setSelectedId(id);
    setShowStatsModal(true);
  }, []);

  const openClose = useCallback((id: number) => {
    setSelectedId(id);
    setShowCloseModal(true);
  }, []);

  const resetFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  };

  return {
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
    openError, setOpenError,
    closeError, setCloseError,

    paginated, isLoading, isFetching,
    currentSession, sessionLoading,
    selectedSession, selectedLoading,
    warehouses,
    fiscalYears, defaultFiscalYearId, defaultWarehouseId,
    openMut, closeMut,

    sessions, meta,
    filtered,
    totalSales, totalInvoices, openCount, closedCount, avgSale, maxSale,
    hasFilters,

    handleOpenSession, handleCloseSession,
    openStats, openClose,
    resetFilters,
  };
}
