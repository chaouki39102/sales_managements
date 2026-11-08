// ════════════════════════════════════════════════════════════════════════════
// pages/pos/components/POSSessionModals.tsx
//
// Session gate of POSPage: the open-session modal when no session is open,
// and the close-session modal.
// ════════════════════════════════════════════════════════════════════════════
import React, { Suspense } from 'react';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import type { PosAggregatedLookups } from '@/lib/api/endpoints/lookups';

const OpenSessionModal  = React.lazy(() => import('@/pos/components/OpenSessionModal'));
const CloseSessionModal = React.lazy(() => import('@/pos/components/CloseSessionModal'));

export interface POSSessionModalsProps {
  sessionLoading: boolean;
  currentSession: PosSession | null | undefined;
  warehouses: PosAggregatedLookups['warehouses'];
  fiscalYears: PosAggregatedLookups['fiscalYears'];
  defaultWarehouseId: number | undefined;
  defaultFiscalYearId: number | undefined;
  openSessionPending: boolean;
  sessionError: string | null;
  onOpenSession: React.ComponentProps<typeof OpenSessionModal>['onOpen'];
  showCloseSession: boolean;
  closeSessionPending: boolean;
  closeSessionError: string | null;
  onCloseCloseSession: () => void;
  onConfirmCloseSession: React.ComponentProps<typeof CloseSessionModal>['onConfirm'];
}

export default function POSSessionModals(props: POSSessionModalsProps) {
  const {
    sessionLoading, currentSession, warehouses, fiscalYears, defaultWarehouseId, defaultFiscalYearId,
    openSessionPending, sessionError, onOpenSession,
    showCloseSession, closeSessionPending, closeSessionError, onCloseCloseSession, onConfirmCloseSession,
  } = props;

  return (
    <>
      {!sessionLoading && !currentSession && (
        <Suspense fallback={null}>
          <OpenSessionModal
            warehouses={warehouses ?? []}
            fiscalYears={fiscalYears as any}
            defaultWarehouseId={defaultWarehouseId}
            defaultFiscalYearId={defaultFiscalYearId}
            isLoading={openSessionPending}
            error={sessionError}
            onOpen={onOpenSession}
          />
        </Suspense>
      )}

      {showCloseSession && currentSession && (
        <Suspense fallback={null}>
          <CloseSessionModal
            session={currentSession}
            isLoading={closeSessionPending}
            error={closeSessionError}
            onClose={onCloseCloseSession}
            onConfirm={onConfirmCloseSession}
          />
        </Suspense>
      )}
    </>
  );
}
