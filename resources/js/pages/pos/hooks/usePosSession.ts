// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosSession.ts
//
// POS session for POSPage: current session + heartbeat, open/close/increment
// mutations, refresh of the catalogue, and the open/close handlers.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import {
  useCurrentPosSession,
  useOpenSession,
  useCloseSession,
  useIncrementSession,
  useSessionHeartbeat,
} from '@/lib/api/endpoints/posSession';
import { invalidatePosQueries } from '@/lib/api/core/queryKeys';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return fallback;
}

export function usePosSession(params: {
  slug: string | null;
  queryClient: QueryClient;
  safeToast: PosSafeToast;
}) {
  const { slug, queryClient, safeToast } = params;

  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
  useSessionHeartbeat(currentSession?.id ?? null);
  const openSessionMut   = useOpenSession();
  const closeSessionMut  = useCloseSession(currentSession?.id ?? null);
  const incrementMut     = useIncrementSession(currentSession?.id ?? null);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [showSessionInvoices, setShowSessionInvoices] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!slug) return;
    setRefreshing(true);
    try {
      await invalidatePosQueries(queryClient, slug);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: [slug, 'products', 'pos'] }),
        queryClient.refetchQueries({ queryKey: [slug, 'pos-stock'] }),
      ]);
    } finally { setRefreshing(false); }
  };

  const handleOpenSession = async (data: {
    warehouse_id: number; fiscal_year_id: number; opening_cash: number; opening_note?: string;
  }) => {
    setSessionError(null);
    try { await openSessionMut.mutateAsync(data); }
    catch (e: unknown) { setSessionError(getErrorMessage(e, 'فشل فتح الجلسة')); }
  };

  const handleCloseSession = async (data: {
    closing_cash_counted: number; closing_note?: string;
  }) => {
    try {
      await closeSessionMut.mutateAsync(data);
      setShowCloseSession(false);
      safeToast.success('تم إغلاق الجلسة بنجاح');
    } catch (e: unknown) {
      safeToast.error(getErrorMessage(e, 'فشل إغلاق الجلسة'));
    }
  };

  return {
    currentSession, sessionLoading,
    openSessionMut, closeSessionMut, incrementMut,
    showCloseSession, setShowCloseSession,
    showSessionInvoices, setShowSessionInvoices,
    sessionError, refreshing,
    handleRefresh, handleOpenSession, handleCloseSession,
  };
}
