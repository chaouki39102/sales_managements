// Shared inline style tokens for ProductModal
import type React from 'react';

export const s = {
  field:   { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  label:   { fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.03em', textTransform: 'uppercase' as const },
  inp: (err?: boolean): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13,
    outline: 'none', fontFamily: 'Tajawal, inherit',
    transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box' as const, width: '100%',
  }),
  sel: (err?: boolean): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13,
    outline: 'none', fontFamily: 'Tajawal, inherit',
    boxSizing: 'border-box' as const, width: '100%', cursor: 'pointer',
  }),
  row2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  row3:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  row4:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 },
  section: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  divider: { height: 1, background: 'var(--b2)', margin: '4px 0' },
  hint:    { fontSize: 11, color: 'var(--t4)', marginTop: 2, lineHeight: 1.5 },
  errText: { fontSize: 11, color: 'var(--red)', marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: 800, color: 'var(--t2)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 },
  card: { padding: '14px 16px', borderRadius: 'var(--r3)', border: '1px solid var(--b2)', background: 'var(--bg3)' },
};
