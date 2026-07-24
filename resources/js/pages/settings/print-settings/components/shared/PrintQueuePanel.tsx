import React from 'react';
import { usePrintJobQueue, statusColor, statusLabel } from '../../renderers/usePrintJobQueue';

const panelStyle: React.CSSProperties = {
  position: 'fixed', bottom: 16, right: 16, width: 360, maxHeight: 400,
  background: 'var(--bg2)', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  display: 'flex', flexDirection: 'column', zIndex: 999, overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 14px', borderBottom: '1px solid var(--b2)',
  fontSize: 13, fontWeight: 700,
};

const listStyle: React.CSSProperties = {
  flex: 1, overflow: 'auto', padding: '4px 0',
};

const itemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 14px', fontSize: 12, borderBottom: '1px solid var(--b1)',
};

const badgeStyle: (color: string) => React.CSSProperties = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
  color: 'var(--bg2)', background: color, whiteSpace: 'nowrap',
});

const btnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
  color: 'var(--red)', padding: '2px 6px', borderRadius: 4,
};

export default function PrintQueuePanel() {
  const {
    jobs, pending, completed, failed, isProcessing, cancel, cancelAll, clear,
  } = usePrintJobQueue();

  if (jobs.length === 0) return null;

  const now = Date.now();

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>
          <i className="ti ti-printer" style={{ marginLeft: 6 }} />
          مهام الطباعة ({jobs.length})
          {isProcessing && (
            <span style={{ fontSize: 11, fontWeight: 400, marginRight: 8, color: 'var(--blue)' }}>
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', marginLeft: 4 }} />
              جارٍ…
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {pending > 0 && (
            <button onClick={cancelAll} style={btnStyle} type="button">
              إلغاء الكل
            </button>
          )}
          {completed + failed > 0 && completed + failed === jobs.length && (
            <button onClick={clear} style={{ ...btnStyle, color: 'var(--t3)' }} type="button">
              مسح
            </button>
          )}
        </div>
      </div>

      <div style={listStyle}>
        {jobs.map(job => {
          const elapsed = job.completedAt
            ? Math.round((job.completedAt - job.createdAt) / 1000)
            : Math.round((now - job.createdAt) / 1000);
          return (
            <div key={job.id} style={itemStyle}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {job.name}
              </span>
              {job.status === 'failed' && job.error && (
                <span title={job.error} style={{ color: 'var(--red)', fontSize: 10, cursor: 'help' }}>
                  <i className="ti ti-alert-triangle" />
                </span>
              )}
              <span style={badgeStyle(statusColor(job.status))}>
                {job.status === 'printing' && <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />}
                {statusLabel(job.status)}
              </span>
              <span style={{ color: 'var(--t4)', fontSize: 10, minWidth: 30, textAlign: 'left' }}>
                {elapsed}s
              </span>
              {job.status === 'pending' && (
                <button onClick={() => cancel(job.id)} style={{ ...btnStyle, fontSize: 10 }} type="button">
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex', gap: 12, padding: '6px 14px', borderTop: '1px solid var(--b2)',
        fontSize: 11, color: 'var(--t4)',
      }}>
        <span>بانتظار: {pending}</span>
        <span style={{ color: 'var(--green)' }}>تم: {completed}</span>
        {failed > 0 && <span style={{ color: 'var(--red)' }}>فشل: {failed}</span>}
      </div>
    </div>
  );
}
