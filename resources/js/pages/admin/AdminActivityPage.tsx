// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminActivityPage.tsx — النسخة الخارقة
// ✅ سجل كامل مع فلاتر + تفاصيل JSON + بحث
// ════════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin';
import { adminKeys } from '@/lib/api/core/queryKeys';
import { useDebounce } from '@/hooks/useDebounce';
import PageHeader from '@/components/ui/PageHeader';
import type { ActivityLog } from '@/types/admin';

const EVENT_COLORS: Record<string, string> = {
  created: '#10b981', updated: '#6366f1', deleted: '#ef4444',
  restored: '#f59e0b', login: '#0ea5e9', logout: '#6b7280',
  suspended: '#ef4444', unsuspended: '#10b981', verified: '#10b981',
};
const eventColor = (e: string) => EVENT_COLORS[e] ?? '#6b7280';

const fmtDate = (d: string) => new Date(d).toLocaleString('ar-DZ', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

export default function AdminActivityPage() {
  const [search, setSearch] = useState('');
  const [event,  setEvent]  = useState('');
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');
  const [page,   setPage]   = useState(1);
  const [detail, setDetail] = useState<ActivityLog | null>(null);
  const dSearch = useDebounce(search, 400);

  const params = useMemo(() => ({
    search:    dSearch || undefined,
    event:     event   || undefined,
    date_from: from    || undefined,
    date_to:   to      || undefined,
    page, per_page: 25,
  }), [dSearch, event, from, to, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: adminKeys.activity(params as any),
    queryFn:  () => adminApi.getActivity(params as any),
    staleTime: 60_000,
    placeholderData: (prev: any) => prev,
  });

  const logs: ActivityLog[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <PageHeader
        title="سجل النشاطات"
        description={meta ? `${meta.total} حدث` : '—'}
        actions={
          <button className="btn" onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-refresh" /> تحديث
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--t4)', fontSize: 14, pointerEvents: 'none',
          }} />
          <input type="text" placeholder="بحث..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%', padding: '8px 34px 8px 11px', borderRadius: 9, boxSizing: 'border-box',
              border: '1.5px solid var(--b2)', background: 'var(--bg1)', color: 'var(--t1)',
              fontSize: 13, fontFamily: 'Tajawal,sans-serif', outline: 'none',
            }} />
        </div>
        <select value={event} onChange={e => { setEvent(e.target.value); setPage(1); }} style={{
          padding: '8px 12px', borderRadius: 9, border: '1.5px solid var(--b2)',
          background: 'var(--bg1)', color: 'var(--t1)', fontSize: 13,
          fontFamily: 'Tajawal,sans-serif', cursor: 'pointer', outline: 'none',
        }}>
          <option value="">كل الأحداث</option>
          {['created','updated','deleted','login','logout','suspended','verified'].map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} style={{
          padding: '8px 11px', borderRadius: 9, border: '1.5px solid var(--b2)',
          background: 'var(--bg1)', color: 'var(--t1)', fontSize: 13, outline: 'none',
          fontFamily: 'Tajawal,sans-serif',
        }} />
        <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} style={{
          padding: '8px 11px', borderRadius: 9, border: '1.5px solid var(--b2)',
          background: 'var(--bg1)', color: 'var(--t1)', fontSize: 13, outline: 'none',
          fontFamily: 'Tajawal,sans-serif',
        }} />
      </div>

      {/* List */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 14, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--t4)' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin .8s linear infinite', display: 'block', marginBottom: 8 }} />
            جارٍ التحميل...
          </div>
        ) : isError ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <button className="btn btn-p" onClick={() => refetch()}>إعادة المحاولة</button>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
            <i className="ti ti-activity" style={{ fontSize: 30, display: 'block', marginBottom: 8, opacity: .5 }} />
            لا توجد نشاطات
          </div>
        ) : logs.map((log, i) => (
          <div key={log.id}
            onClick={() => setDetail(detail?.id === log.id ? null : log)}
            style={{
              padding: '12px 16px', borderBottom: i < logs.length - 1 ? '1px solid var(--b1)' : 'none',
              cursor: 'pointer', transition: 'background .1s',
              background: detail?.id === log.id ? 'var(--bg3)' : 'transparent',
            }}
            onMouseEnter={e => { if (detail?.id !== log.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
            onMouseLeave={e => { if (detail?.id !== log.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: eventColor(log.event) + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: eventColor(log.event), fontSize: 13,
              }}>
                <i className={`ti ${
                  log.event === 'created'  ? 'ti-plus'        :
                  log.event === 'updated'  ? 'ti-pencil'      :
                  log.event === 'deleted'  ? 'ti-trash'       :
                  log.event === 'login'    ? 'ti-login'       :
                  log.event === 'logout'   ? 'ti-logout'      :
                  'ti-activity'
                }`} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: eventColor(log.event) + '20', color: eventColor(log.event),
                  }}>{log.event}</span>
                  <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 600 }}>
                    {log.description}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                  {log.causer && (
                    <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                      <i className="ti ti-user" style={{ marginLeft: 3 }} />
                      {log.causer.name}
                    </span>
                  )}
                  {log.company && (
                    <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                      <i className="ti ti-building" style={{ marginLeft: 3 }} />
                      {log.company.name}
                    </span>
                  )}
                  {log.ip_address && (
                    <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>
                      {log.ip_address}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 'auto' }}>
                    {fmtDate(log.created_at)}
                  </span>
                </div>
              </div>
              <i className={`ti ti-chevron-${detail?.id === log.id ? 'up' : 'down'}`}
                style={{ color: 'var(--t4)', fontSize: 13, marginTop: 4, flexShrink: 0 }} />
            </div>

            {/* Detail */}
            {detail?.id === log.id && (log.old_values || log.new_values) && (
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} onClick={e => e.stopPropagation()}>
                {log.old_values && Object.keys(log.old_values).length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>
                      <i className="ti ti-minus" style={{ marginLeft: 4 }} />القيم القديمة
                    </div>
                    <pre style={{
                      fontSize: 10.5, color: 'var(--t2)', background: 'var(--bg1)',
                      padding: '8px 10px', borderRadius: 8, overflow: 'auto',
                      border: '1px solid var(--b1)', maxHeight: 200,
                      fontFamily: 'monospace', lineHeight: 1.5,
                    }}>
                      {JSON.stringify(log.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                {log.new_values && Object.keys(log.new_values).length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>
                      <i className="ti ti-plus" style={{ marginLeft: 4 }} />القيم الجديدة
                    </div>
                    <pre style={{
                      fontSize: 10.5, color: 'var(--t2)', background: 'var(--bg1)',
                      padding: '8px 10px', borderRadius: 8, overflow: 'auto',
                      border: '1px solid var(--b1)', maxHeight: 200,
                      fontFamily: 'monospace', lineHeight: 1.5,
                    }}>
                      {JSON.stringify(log.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--b1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'var(--t4)' }}>
              {meta.from}–{meta.to} من {meta.total}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 1} onClick={() => setPage(1)} className="btn btn-xs">الأولى</button>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-xs">←</button>
              <span style={{ padding: '4px 10px', fontSize: 12, color: 'var(--t2)' }}>{page} / {meta.last_page}</span>
              <button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)} className="btn btn-xs">→</button>
              <button disabled={page === meta.last_page} onClick={() => setPage(meta.last_page)} className="btn btn-xs">الأخيرة</button>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}