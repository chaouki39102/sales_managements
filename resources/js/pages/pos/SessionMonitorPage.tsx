import { useMemo, useState, useEffect } from 'react';

import {
  useSessionMonitorList,
  usePosSession,
  useCloseSession,
} from '@/lib/api/endpoints/posSession';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import { formatDZD } from '@/pos/utils/calculations';
import { STATUS_LABEL } from '@/pos/hooks/usePosSessions';

import SessionStatsModal from '@/pos/components/SessionStatsModal';
import CloseSessionModal  from '@/pos/components/CloseSessionModal';
import PageHeader          from '@/components/ui/PageHeader';
import KpiCard             from '@/components/ui/KpiCard';
import Button              from '@/components/ui/Button';
import EmptyState          from '@/components/ui/EmptyState';

type StatusFilter = '' | 'open' | 'closed';

function minsToLabel(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}س ${r}د` : `${r}د`;
}

function workMinutesOf(s: PosSession, now: number): number {
  if (s.status === 'closed' && s.closed_at) return s.work_minutes;
  return Math.max(0, Math.floor((now - new Date(s.opened_at).getTime()) / 60000));
}

function idleMinutesOf(s: PosSession, now: number): number {
  const end = s.status === 'closed' && s.closed_at
    ? new Date(s.closed_at).getTime()
    : now;
  const anchor = s.last_active_at
    ? new Date(s.last_active_at).getTime()
    : new Date(s.opened_at).getTime();
  return Math.max(0, Math.floor((end - anchor) / 60000));
}

function statusKind(s: PosSession): 'online' | 'away' | 'closed' {
  if (s.status !== 'open') return 'closed';
  return s.is_online ? 'online' : 'away';
}

function platformLabel(s: PosSession): string {
  const platform = s.device_browser_info?.platform;
  if (platform) return platform;
  const ua = s.device_user_agent ?? '';
  if (/Android/i.test(ua))  return 'Android';
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua))  return 'Windows';
  if (/Mac/i.test(ua))      return 'macOS';
  if (/Linux/i.test(ua))    return 'Linux';
  return 'جهاز';
}

function SessionScreenCard({
  s, now, onStats, onClose,
}: {
  s: PosSession;
  now: number;
  onStats: (id: number) => void;
  onClose: (id: number) => void;
}) {
  const kind = statusKind(s);
  const deviceName = s.device_name || s.user?.name || '—';

  return (
    <div className={`sm-card sm-card--${kind}`}>
      <div className="sm-screen">
        <div className="sm-screen-bar">
          <div className="sm-led-wrap">
            <span className="sm-led" />
          </div>
          <span className="sm-screen-title">{deviceName}</span>
          <span className={`sm-status sm-status--${kind}`}>
            {kind === 'online' ? 'متصلة الآن' : kind === 'away' ? 'غير نشطة' : 'مغلقة'}
          </span>
        </div>

        <div className="sm-screen-body">
          <div className="sm-row">
            <span className="sm-row-ic ti ti-user" />
            <span className="sm-row-val">{s.user?.name}</span>
          </div>
          <div className="sm-row">
            <span className="sm-row-ic ti ti-building-warehouse" />
            <span className="sm-row-val">{s.warehouse?.name}</span>
          </div>
          <div className="sm-row">
            <span className="sm-row-ic ti ti-device-desktop" />
            <span className="sm-row-val">{platformLabel(s)}</span>
            {s.device_ip && <span className="sm-ip" dir="ltr">{s.device_ip}</span>}
          </div>
          <div className="sm-row">
            <span className="sm-row-ic ti ti-clock" />
            <span className="sm-row-val">
              فُتح: {new Date(s.opened_at).toLocaleString('fr-DZ')}
            </span>
          </div>

          <div className="sm-metrics">
            <div className="sm-metric">
              <span className="sm-metric-lbl">مدة العمل</span>
              <span className="sm-metric-val sm-metric-val--work">
                {minsToLabel(workMinutesOf(s, now))}
              </span>
            </div>
            <div className="sm-metric">
              <span className="sm-metric-lbl">وقت الخمول</span>
              <span className="sm-metric-val sm-metric-val--idle">
                {minsToLabel(idleMinutesOf(s, now))}
              </span>
            </div>
            <div className="sm-metric">
              <span className="sm-metric-lbl">الفواتير</span>
              <span className="sm-metric-val">{s.invoices_count}</span>
            </div>
            <div className="sm-metric">
              <span className="sm-metric-lbl">المبيعات</span>
              <span className="sm-metric-val sm-metric-val--cash">
                {formatDZD(Number(s.net_sales ?? 0))}
              </span>
            </div>
          </div>

          {s.status === 'closed' && s.closed_at && (
            <div className="sm-closed-row">
              <i className="ti ti-door-exit" />
              <span>
                أُغلقت: {new Date(s.closed_at).toLocaleString('fr-DZ')}
                {' · '}
                {s.closing_cash_counted != null ? formatDZD(Number(s.closing_cash_counted)) : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="sm-card-foot">
        <button className="sm-action" onClick={() => onStats(s.id)}>
          <i className="ti ti-chart-bar" /> الإحصائيات
        </button>
        {s.status === 'open' && (
          <button className="sm-action sm-action--close" onClick={() => onClose(s.id)}>
            <i className="ti ti-door-exit" /> إغلاق
          </button>
        )}
      </div>
    </div>
  );
}

export default function SessionMonitorPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search,       setSearch]       = useState('');
  const [selectedId,   setSelectedId]   = useState<number | null>(null);
  const [showStats,    setShowStats]    = useState(false);
  const [showClose,    setShowClose]    = useState(false);
  const [closeError,   setCloseError]   = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const { data, isLoading, isFetching } = useSessionMonitorList();
  const sessions: PosSession[] = data?.data ?? [];

  const { data: selectedSession } = usePosSession(selectedId);

  const closeMut = useCloseSession(selectedId ?? null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter(s => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (!q) return true;
      return [
        s.device_name,
        s.user?.name,
        s.warehouse?.name,
        s.device_ip,
      ].some(v => v?.toLowerCase().includes(q));
    });
  }, [sessions, statusFilter, search]);

  const onlineNow = useMemo(
    () => sessions.filter(s => statusKind(s) === 'online').length,
    [sessions, now],
  );
  const openCount   = useMemo(() => sessions.filter(s => s.status === 'open').length, [sessions]);
  const closedToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return sessions.filter(s =>
      s.status === 'closed' && s.closed_at && new Date(s.closed_at) >= start,
    ).length;
  }, [sessions]);
  const totalWork  = useMemo(() => sessions.reduce((a, s) => a + workMinutesOf(s, now), 0), [sessions, now]);
  const totalIdle  = useMemo(() => sessions.reduce((a, s) => a + idleMinutesOf(s, now), 0), [sessions, now]);
  const liveSales  = useMemo(
    () => sessions.filter(s => s.status === 'open').reduce((a, s) => a + Number(s.net_sales ?? 0), 0),
    [sessions],
  );

  const openStats = (id: number) => { setSelectedId(id); setShowStats(true); };
  const openClose = (id: number) => { setSelectedId(id); setShowClose(true); setCloseError(null); };

  const handleClose = async (data: { closing_cash_counted: number; closing_note?: string }) => {
    setCloseError(null);
    try {
      await closeMut.mutateAsync(data);
      setShowClose(false);
      setSelectedId(null);
    } catch (e: any) {
      setCloseError(e?.response?.data?.message ?? e?.message ?? 'فشل إغلاق الجلسة');
    }
  };

  return (
    <div className="page on sm-page" id="p-session-monitor">

      <PageHeader
        title="مراقبة الجلسات"
        description="شاشة مباشرة لأجهزة نقاط البيع المتصلة — تُحدَّث تلقائياً كل 15 ثانية"
        actions={
          <div className="sm-filters">
            <span className="sm-live-hint">
              <span className={`sm-live-dot ${isFetching ? 'pulse' : ''}`} />
              {isFetching ? 'جارٍ التحديث…' : 'مباشر'}
            </span>
            <div className="sm-search">
              <i className="ti ti-search" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث بالجهاز أو المستخدم أو المخزن…"
              />
              {search && (
                <button className="sm-search-x" onClick={() => setSearch('')}>
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
            {(['', 'open', 'closed'] as StatusFilter[]).map(f => (
              <button
                key={f || 'all'}
                className={`sm-status-pill ${statusFilter === f ? 'on' : ''}`}
                onClick={() => setStatusFilter(f)}
              >
                {f === '' ? 'الكل' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        }
      />

      <div className="kpis sm-kpis">
        <KpiCard variant="green" icon="ti-device-desktop-analytics" label="متصلة الآن" value={onlineNow} sub="أجهزة تعمل حالياً" />
        <KpiCard variant="blue"  icon="ti-door-enter" label="جلسات مفتوحة" value={openCount} />
        <KpiCard variant="teal"  icon="ti-clock"      label="مدة عمل إجمالية" value={minsToLabel(totalWork)} />
        <KpiCard variant="orange" icon="ti-hourglass"  label="خمول إجمالي" value={minsToLabel(totalIdle)} />
        <KpiCard variant="purple" icon="ti-cash"      label="مبيعات مباشرة" value={formatDZD(liveSales)} />
        <KpiCard variant="gold"   icon="ti-door-exit"  label="مغلقة اليوم" value={closedToday} />
      </div>

      {isLoading ? (
        <div className="sm-loading">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="sm-skeleton" style={{ animationDelay: `${i * 0.06}s` }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="ti-device-desktop-off"
          text="لا توجد جلسات"
          sub={search || statusFilter ? 'لا توجد جلسات تطابق البحث الحالي' : 'لا توجد جلسات لعرضها'}
          action={
            (search || statusFilter) ? (
              <Button icon={<i className="ti ti-refresh" />} onClick={() => { setSearch(''); setStatusFilter(''); }}>
                إعادة ضبط
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="sm-grid">
          {filtered.map(s => (
            <SessionScreenCard
              key={s.id}
              s={s}
              now={now}
              onStats={openStats}
              onClose={openClose}
            />
          ))}
        </div>
      )}

      {showStats && selectedId && selectedSession && (
        <SessionStatsModal
          session={selectedSession}
          onClose={() => { setShowStats(false); setSelectedId(null); }}
          onEndSession={() => {
            setShowStats(false);
            setShowClose(true);
          }}
        />
      )}

      {showClose && selectedSession && (
        <CloseSessionModal
          session={selectedSession}
          isLoading={closeMut.isPending}
          error={closeError}
          onClose={() => { setShowClose(false); setCloseError(null); }}
          onConfirm={handleClose}
        />
      )}
    </div>
  );
}
