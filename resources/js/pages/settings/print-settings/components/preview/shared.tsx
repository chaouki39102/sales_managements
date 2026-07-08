import React from 'react';
import type { DocumentLine } from '../../types/data';
import type {
  PrintTemplate,
  ColumnKey,
  AlignOption,
  BorderStyle,
  FontFamily,
} from '../../types';

export function formatDate(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ─── Styling helpers ────────────────────────────────────────────────────────────

export function mm(v: number): number {
  return v * 3.78;
}

export function align(a: AlignOption): React.CSSProperties['textAlign'] {
  return a === 'right' ? 'right' : a === 'left' ? 'left' : 'center';
}

export function fontFamily(f: FontFamily): string {
  switch (f) {
    case 'monospace': return "'Courier New', monospace";
    case 'times':     return "'Times New Roman', serif";
    case 'arial':     return "Arial, sans-serif";
    default:          return "'Tajawal', sans-serif";
  }
}

import { COLUMN_DEFAULTS } from '../../services/SettingsRegistry';

export function colDefaultHeader(col: ColumnKey): string {
  return COLUMN_DEFAULTS[col]?.header ?? col;
}

export function borderStyle(s: BorderStyle): string {
  switch (s) {
    case 'solid':  return 'solid';
    case 'dashed': return 'dashed';
    case 'double': return 'double';
    default:       return 'none';
  }
}

const BORDER_MAP: Record<BorderStyle, string> = {
  solid:  'solid',
  dashed: 'dashed',
  double: 'double',
  none:   'none',
};

export function Separator({ style }: { style: BorderStyle }): JSX.Element {
  if (style === 'none') return <div />;
  const thickness = style === 'double' ? 3 : 1;
  return <div style={{ borderBottom: `${thickness}px ${BORDER_MAP[style]} #999`, margin: '4px 0' }} />;
}

export const MemoizedSeparator = React.memo(Separator);

// ─── Data extraction helpers ────────────────────────────────────────────────────

export function getVisibleCols(tpl: PrintTemplate): ColumnKey[] {
  return tpl.col_order.filter(k => tpl.col_show[k] !== false);
}

export function colWidth(
  tpl: PrintTemplate,
  col: ColumnKey,
  defaults?: Partial<Record<ColumnKey, number>>,
): number {
  return tpl.col_widths[col] ?? defaults?.[col] ?? COLUMN_DEFAULTS[col]?.width ?? 20;
}

export function colAlign(tpl: PrintTemplate, col: ColumnKey): AlignOption {
  return tpl.col_aligns[col] ?? COLUMN_DEFAULTS[col]?.align ?? 'right';
}

export interface CompanyData {
  name:    string;
  address: string;
  phone:   string;
  nif:     string;
  rc:      string;
  nis:     string;
  ice:     string;
  article: string;
  logoUrl?: string | null;
}

export function buildTvaByRate(
  lines: DocumentLine[],
): Array<{ rate: number; base: number; amount: number }> {
  const map = new Map<number, { base: number; amount: number }>();
  for (const line of lines) {
    const pct = line.tvaPct;
    const prev = map.get(pct) ?? { base: 0, amount: 0 };
    map.set(pct, {
      base:   prev.base   + line.totalHt,
      amount: prev.amount + line.totalTva,
    });
  }
  return Array.from(map.entries()).map(([rate, v]) => ({ rate, ...v }));
}

// ─── Simple presentational components ──────────────────────────────────────────

interface DocRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

function DocRowFn({ label, value, mono }: DocRowProps): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: mono ? "'Courier New', monospace" : undefined }}>{value}</span>
    </div>
  );
}

export const DocRow = React.memo(DocRowFn);

interface TotalRowProps {
  label: string;
  val: string;
  red?: boolean;
  bold?: boolean;
}

function TotalRowFn({ label, val, red, bold }: TotalRowProps): JSX.Element {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', marginBottom: 2,
      fontWeight: bold ? 800 : 'inherit',
      color: red ? '#c00' : 'inherit',
    }}>
      <span>{label}</span>
      <span dir="ltr">{Number(val).toFixed(2)}</span>
    </div>
  );
}

export const TotalRow = React.memo(TotalRowFn);

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRowFn({ label, value }: InfoRowProps): JSX.Element {
  return (
    <tr>
      <td style={{ color: '#555', padding: '2px 0', whiteSpace: 'nowrap', fontWeight: 600 }}>
        {label}:
      </td>
      <td style={{ padding: '2px 0', paddingRight: 12 }}>
        {value}
      </td>
    </tr>
  );
}

export const InfoRow = React.memo(InfoRowFn);

// ─── SectionWrap — applies highlight styling from rules ──────────────────────

export function SectionWrap({ highlight, children }: {
  highlight: Record<string, string> | null;
  children: React.ReactNode;
}) {
  if (!highlight) return <>{children}</>;
  return <div style={highlight}>{children}</div>;
}
