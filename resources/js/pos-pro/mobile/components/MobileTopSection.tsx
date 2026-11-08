// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/components/MobileTopSection.tsx
//
// Top of the mobile POS PRO screen: appbar, session strip, total card and
// the quick-actions strip.
// ════════════════════════════════════════════════════════════════════════════
import type { PosSession } from '@/lib/api/endpoints/posSession';
import type { CartTotals } from '@/types';
import { money } from '../mobileFormat';
import type { MobileSheet } from '../hooks/usePosProMobileCart';

export interface MobileTopSectionProps {
  currentSession: PosSession | null;
  online: boolean;
  offlineServed: boolean;
  syncing: boolean;
  sync: () => unknown;
  heldCount: number;
  totals: CartTotals;
  totalTtcFinal: number;
  invDisc: number;
  invDiscPct: number;
  onBack: () => void;
  setSheet: (sheet: MobileSheet) => void;
  onNewSale: () => void;
}

export default function MobileTopSection({
  currentSession, online, offlineServed, syncing, sync, heldCount, totals, totalTtcFinal,
  invDisc, invDiscPct, onBack, setSheet, onNewSale,
}: MobileTopSectionProps) {
  // ── ترتيب الإجماليات ─────────────────────────────────────────────────────
  const hasDiscount = invDisc > 0.004;
  const hasTva = totals.total_tva > 0.004;
  const hasStamp = totals.fiscal_stamp > 0.004;

  return (
    <>
      {/* ── Appbar ─────────────────────────────────────────────────────── */}
      <header className="ppm-appbar">
        <button className="ppm-appbar-btn" onClick={onBack} aria-label="رجوع">
          <i className="ti ti-arrow-right" />
        </button>
        <div className="ppm-appbar-title">
          <strong>نقطة البيع</strong>
          <span>جلسة {currentSession ? `#${currentSession.id}` : '—'}</span>
        </div>
        {(!online || offlineServed) && (
          <button
            className={`ppm-appbar-btn ppm-offline-btn${syncing ? ' ppm-offline-btn--sync' : ''}`}
            onClick={() => void sync()}
            aria-label="مزامنة العمليات المعلقة"
            title={syncing ? 'جارٍ المزامنة…' : 'وضع دون اتصال — اضغط للمزامنة'}
          >
            <i className={`ti ${syncing ? 'ti-cloud-upload' : 'ti-cloud-off'}`} />
          </button>
        )}
        <button className="ppm-appbar-btn" onClick={() => setSheet('held')} aria-label="سلال معلقة">
          <i className="ti ti-basket-pause" />
          {heldCount > 0 && <span className="ppm-badge">{heldCount}</span>}
        </button>
      </header>

      {/* ── شريط الجلسة ─────────────────────────────────────────────────── */}
      <div className="ppm-session-strip">
        <span className="ppm-dot" />
        <span>
          {currentSession?.warehouse?.name ?? 'المستودع'} — {currentSession?.opening_cash != null ? `رصيد افتتاح ${money(currentSession.opening_cash)}` : 'جلسة مفتوحة'}
        </span>
        {!online && <span className="ppm-session-offline">دون اتصال</span>}
      </div>

      {/* ── بطاقة الإجمالي ──────────────────────────────────────────────── */}
      <section className="ppm-total-card">
        <div className="ppm-total-top">
          <span className="ppm-l">الإجمالي</span>
          <span className="ppm-unit">دج</span>
          <span className="ppm-val ppm-mono">{money(totalTtcFinal)}</span>
        </div>
        <div className="ppm-total-chips">
          <span className="ppm-tchip">HT {money(totals.total_ht)}</span>
          {hasDiscount && <span className="ppm-tchip ppm-disc">خصم {money(invDisc)}</span>}
          {hasTva && <span className="ppm-tchip">TVA {money(totals.total_tva)}</span>}
          {hasStamp && <span className="ppm-tchip">طابع {money(totals.fiscal_stamp)}</span>}
        </div>
      </section>

      {/* ── إجراءات سريعة ───────────────────────────────────────────────── */}
      <div className="ppm-qa-strip">
        <button className="ppm-qa-btn" onClick={() => setSheet('products')}>
          <i className="ti ti-package" /><span>منتجات</span>
        </button>
        <button className="ppm-qa-btn" onClick={() => setSheet('customer')}>
          <i className="ti ti-user" /><span>زبون</span>
        </button>
        <button className="ppm-qa-btn" onClick={() => setSheet('discount')}>
          <i className="ti ti-percentage" /><span>{invDiscPct > 0 ? `${invDiscPct}%` : 'خصم'}</span>
        </button>
        <button className="ppm-qa-btn" onClick={onNewSale}>
          <i className="ti ti-file-plus" /><span>جديد</span>
        </button>
      </div>
    </>
  );
}
