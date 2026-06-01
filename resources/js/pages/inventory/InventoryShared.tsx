// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/InventoryShared.tsx — مكوّنات مشتركة
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';

// ─── زر إجراء مصغّر ──────────────────────────────────────────────────────────

export function ActionBtn({
  icon, color, onClick, title, loading = false,
}: {
  icon: string; color: string; onClick?: () => void; title: string; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={loading}
      style={{
        width: 28, height: 28, borderRadius: 6,
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? .6 : 1,
        transition: 'all .1s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background    = 'var(--bg1)';
        (e.currentTarget as HTMLElement).style.borderColor  = color;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background   = 'var(--bg3)';
        (e.currentTarget as HTMLElement).style.borderColor  = 'var(--b2)';
      }}
    >
      <i
        className={`ti ${loading ? 'ti-loader-2' : icon}`}
        style={{ fontSize: 13, color, animation: loading ? 'spin .8s linear infinite' : 'none' }}
      />
    </button>
  );
}

// ─── تاريخ الانتهاء مع تلوين ─────────────────────────────────────────────────

export function ExpiryCell({ date }: { date: string | null }) {
  if (!date) return <span style={{ color: 'var(--t4)', fontSize: 12 }}>—</span>;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  const color = days < 0 ? '#ef4444' : days < 30 ? '#f59e0b' : 'var(--t3)';
  return (
    <div>
      <span style={{ color, fontSize: 12 }}>{date}</span>
      {days < 30 && (
        <div style={{ fontSize: 10, color }}>
          {days < 0 ? `منتهي منذ ${-days} يوم` : `ينتهي بعد ${days} يوم`}
        </div>
      )}
    </div>
  );
}

// ─── Th موحّد ─────────────────────────────────────────────────────────────────

export function Th({ children, width }: { children?: React.ReactNode; width?: string }) {
  return (
    <th style={{
      padding: '10px 12px', textAlign: 'right',
      fontWeight: 700, fontSize: 11, color: 'var(--t3)',
      whiteSpace: 'nowrap', width,
    }}>
      {children}
    </th>
  );
}
