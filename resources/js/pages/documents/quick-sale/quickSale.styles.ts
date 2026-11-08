// pages/documents/quick-sale/quickSale.styles.ts
import type React from 'react';

export const lblStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--t3)',
  display: 'block',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

export function inpStyle(err?: boolean): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '7px 10px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg1)',
    color: 'var(--t1)',
    fontSize: 13,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
  };
}

export function cellStyle(): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '5px 6px',
    borderRadius: 'var(--r1)',
    border: '1px solid var(--b3)',
    background: 'var(--bg1)',
    color: 'var(--t1)',
    fontSize: 12,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    textAlign: 'center',
  };
}
