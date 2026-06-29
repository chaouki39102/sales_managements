import React, { useState, useEffect } from 'react';

export function Accordion({ title, icon, id, children, defaultOpen = false, collapseVersion }: {
  title: string; icon: string; id?: string;
  children: React.ReactNode; defaultOpen?: boolean; collapseVersion?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { setOpen(defaultOpen); }, [collapseVersion, defaultOpen]);
  return (
    <div
      id={id}
      style={{
        marginBottom: 4, border: '1px solid var(--b2)',
        borderRadius: 'var(--r2)', overflow: 'visible',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)} type="button"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 11px', background: 'var(--bg3)',
          border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          borderBottom: open ? '1px solid var(--b2)' : 'none',
          position: 'sticky', top: 0, zIndex: 5,
        }}
      >
        <i className={`ti ${icon}`} style={{ color: 'var(--em)', fontSize: 13, flexShrink: 0 }} />
        <span style={{
          flex: 1, textAlign: 'right', fontSize: 12.5,
          fontWeight: 700, color: 'var(--t1)',
        }}>{title}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
          style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {children}
        </div>
      )}
    </div>
  );
}
