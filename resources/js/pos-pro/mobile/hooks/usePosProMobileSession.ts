// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/hooks/usePosProMobileSession.ts
//
// Active warehouse + POS session of the mobile POS PRO screen, including the
// offline fallback to the last known session (C.5) and the open-session
// handler.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react';
import {
  useCurrentPosSession,
  useOpenSession,
  useIncrementSession,
  useSessionHeartbeat,
  type PosSession,
} from '@/lib/api/endpoints/posSession';
import { useOnlineStatus, useOfflineServed, useSync } from '@/lib/offline/useOffline';
import type { PosAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { isRealSession, loadLastKnownSession, saveLastKnownSession } from '../lastKnownSession';

type Warehouse = PosAggregatedLookups['warehouses'][number];

export function usePosProMobileSession(params: {
  slug: string | null;
  warehouses: Warehouse[];
  defaultWarehouse: Warehouse | null | undefined;
}) {
  const { slug, warehouses, defaultWarehouse } = params;

  const [activeWarehouseId, setActiveWarehouseId] = useState<number | null>(null);
  const activeWarehouse = useMemo(
    () => (activeWarehouseId ? (warehouses?.find(w => w.id === activeWarehouseId) ?? null) : defaultWarehouse),
    [activeWarehouseId, warehouses, defaultWarehouse],
  );
  useEffect(() => {
    if (!activeWarehouseId && defaultWarehouse) setActiveWarehouseId(defaultWarehouse.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultWarehouse?.id]);

  // ── الجلسة ────────────────────────────────────────────────────────────────
  const { data: serverSession, isLoading: sessionLoading } = useCurrentPosSession();
  useSessionHeartbeat(serverSession?.id ?? null);
  const offlineServed = useOfflineServed();
  const online = useOnlineStatus();
  const { syncing, sync } = useSync();

  // آخر جلسة حقيقية معروفة: يُحفظ كل ما يصل من الخادم، ويُعاد استخدامه كـ fallback
  // عندما تكون الشاشة في وضع عدم الاتصال (تتجاوز الطبقة الخادم ولا تعيد بيانات).
  useEffect(() => {
    if (isRealSession(serverSession)) saveLastKnownSession(slug, serverSession);
  }, [serverSession, slug]);

  const currentSession = useMemo<PosSession | null>(() => {
    if (isRealSession(serverSession)) return serverSession;
    if (offlineServed || !online) return loadLastKnownSession(slug);
    return null;
  }, [serverSession, offlineServed, online, slug]);

  const openSessionMut = useOpenSession();
  const incrementMut = useIncrementSession(currentSession?.id ?? null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const whId = currentSession?.warehouse?.id;
    if (whId) setActiveWarehouseId(whId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id]);

  const handleOpenSession = async (data: {
    warehouse_id: number; fiscal_year_id: number; opening_cash: number; opening_note?: string;
  }) => {
    setSessionError(null);
    try { await openSessionMut.mutateAsync(data); }
    catch (e: unknown) {
      setSessionError(e instanceof Error && e.message ? e.message : 'فشل فتح الجلسة');
    }
  };

  return {
    activeWarehouse, sessionLoading, offlineServed, online, syncing, sync,
    currentSession, openSessionMut, incrementMut, sessionError, handleOpenSession,
  };
}
