

# =========================================
# 📘 Components
# =========================================

## FILE: resources/js/components/ui/Alert.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

type AlertVariant = 'em' | 'gold' | 'red' | 'blue'

const alertStyles: Record<AlertVariant, string> = {
  em:   'bg-[var(--emb)] border-[var(--embo)] text-[var(--em)]',
  gold: 'bg-[var(--goldb)] border-[var(--goldbo)] text-[var(--gold)]',
  red:  'bg-[var(--redb)] border-[var(--redbo)] text-[var(--red)]',
  blue: 'bg-[var(--blueb)] border-[var(--bluebo)] text-[var(--blue)]',
}

export function Alert({
  variant = 'em', icon, children, className,
}: {
  variant?: AlertVariant
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-[10px] px-[14px] py-[11px] rounded-[var(--r2)]',
        'text-[13px] leading-[1.5] mb-3 border',
        alertStyles[variant],
        className,
      )}
    >
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <div>{children}</div>
    </div>
  )
}
```

## FILE: resources/js/components/ui/AlertBar.tsx
```
// components/ui/AlertBar.tsx
import React, { useState } from 'react';

type AlertVariant = 'green' | 'gold' | 'red' | 'blue';

interface AlertBarProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  dismissible?: boolean;
}

const variantMap: Record<AlertVariant, string> = {
  green: 'al-g',
  gold:  'al-w',
  red:   'al-r',
  blue:  'al-b',
};

const iconMap: Record<AlertVariant, string> = {
  green: 'ti-alert-triangle',
  gold:  'ti-alert-circle',
  red:   'ti-alert-triangle',
  blue:  'ti-info-circle',
};

export default function AlertBar({ variant = 'green', children, dismissible = true }: AlertBarProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div
      className={`al ${variantMap[variant]}`}
      style={{ borderRadius: 'var(--r3)', marginBottom: 18 }}
    >
      <span className="ic ic-sm" style={{ flexShrink: 0, marginTop: 1 }}>
        <i className={`ti ${iconMap[variant]}`} />
      </span>
      <div style={{ flex: 1 }}>{children}</div>
      {dismissible && (
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: 0, color: 'inherit' }}
        >
          <i className="ti ti-x" />
        </button>
      )}
    </div>
  );
}
```

## FILE: resources/js/components/ui/App.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// App.tsx
//
// ترتيب Providers الصحيح:
//   QueryClientProvider
//     └── BrowserRouter
//           └── AuthProvider
//                 └── FiscalYearProvider
//                       └── AppRoutes
// ════════════════════════════════════════════════════════════════════════════
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient }               from '@/lib/api/core/queryClient';
import { connectSlugToInterceptor }  from '@/lib/api/core/client';
import { appActions }                from '@/lib/store/appStore';
import { AuthProvider }              from '@/context/AuthContext';
import { FiscalYearProvider }        from '@/context/FiscalYearContext';
import { AppRoutes }                 from '@/routes/index';

// CSS — ملف واحد فقط، يستورد theme.css تلقائياً
import '../css/app.css';

// ربط Zustand بالـ interceptor
connectSlugToInterceptor(() => appActions.getActiveSlug());

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <FiscalYearProvider>
            <AppRoutes />
          </FiscalYearProvider>
        </AuthProvider>
      </BrowserRouter>

      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
```

## FILE: resources/js/components/ui/Avatar.tsx
```
// components/ui/Avatar.tsx
import React from 'react';

type AvatarColor = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface AvatarProps {
  initials: string;
  color?: AvatarColor;
  size?: number;
  fontSize?: number;
}

export default function Avatar({ initials, color = 1, size = 36, fontSize }: AvatarProps) {
  const fs = fontSize ?? Math.round(size * 0.36);
  return (
    <div
      className={`avatar av av${color}`}
      style={{ width: size, height: size, fontSize: fs, minWidth: size }}
    >
      {initials}
    </div>
  );
}

```

## FILE: resources/js/components/ui/Badge.tsx
```
// components/ui/Badge.tsx
import React from 'react';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'teal' | 'orange' | 'gray' | 'indigo';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  noDot?: boolean;
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'be',
  danger:  'br',
  warning: 'bg',
  info:    'bb',
  purple:  'bp',
  teal:    'bt',
  orange:  'bo',
  gray:    'bz',
  indigo:  'bi',
};

export default function Badge({ children, variant = 'success', className = '', noDot = false }: BadgeProps) {
  return (
    <span className={`bx ${variantMap[variant]} ${noDot ? 'no-dot' : ''} ${className}`}>
      {children}
    </span>
  );
}
```

## FILE: resources/js/components/ui/Breadcrumb.tsx
```
import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <ChevronRight />,
  className = '',
}) => {
  return (
    <nav aria-label="breadcrumb" className={`breadcrumb ${className}`}>
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="breadcrumb__item">
              {index > 0 && (
                <span className="breadcrumb__separator" aria-hidden="true">
                  {separator}
                </span>
              )}
              {isLast ? (
                <span className="breadcrumb__current" aria-current="page">
                  {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                  {item.label}
                </span>
              ) : item.href ? (
                <a href={item.href} className="breadcrumb__link">
                  {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                  {item.label}
                </a>
              ) : (
                <button
                  type="button"
                  className="breadcrumb__link breadcrumb__button"
                  onClick={item.onClick}
                >
                  {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <style>{`
        .breadcrumb { display: inline-flex; }
        .breadcrumb__list {
          display: flex; align-items: center; flex-wrap: wrap;
          list-style: none; margin: 0; padding: 0; gap: 2px;
        }
        .breadcrumb__item { display: flex; align-items: center; gap: 2px; }
        .breadcrumb__separator {
          display: flex; align-items: center;
          color: var(--color-text-tertiary);
          margin: 0 2px;
        }
        .breadcrumb__link, .breadcrumb__button {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13px; color: var(--color-text-secondary);
          text-decoration: none; background: none; border: none;
          padding: 2px 4px; border-radius: 4px; cursor: pointer;
          transition: color 0.15s, background 0.15s;
        }
        .breadcrumb__link:hover, .breadcrumb__button:hover {
          color: var(--color-text-primary);
          background: var(--color-background-secondary);
        }
        .breadcrumb__current {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13px; font-weight: 500; color: var(--color-text-primary);
          padding: 2px 4px;
        }
        .breadcrumb__icon { display: flex; align-items: center; font-size: 14px; }
      `}</style>
    </nav>
  );
};

export default Breadcrumb;
```

## FILE: resources/js/components/ui/Button.tsx
```
// Note: The CSS classes like 'btn', 'btn-p', 'btn-r', etc., should be defined in your CSS files to style the button accordingly.
// components/ui/Button.tsx
import React from 'react';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'warning' | 'info';
type ButtonSize    = 'xs' | 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;           // 🆕 إضافة
  children?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
  default: '',
  primary: 'btn-p',
  danger:  'btn-r',
  warning: 'btn-g',
  info:    'btn-b',
};

const sizeMap: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
};

export default function Button({
  variant = 'default',
  size = 'md',
  icon,
  fullWidth = false,
  loading = false,            // 🆕
  children,
  className = '',
  disabled: externalDisabled,
  ...props
}: ButtonProps) {
  const isDisabled = externalDisabled || loading;   // يعطل الزر أثناء التحميل

  return (
    <button
      className={`btn ${variantMap[variant]} ${sizeMap[size]} ${fullWidth ? 'btn-w' : ''} ${className}`}
      disabled={isDisabled}
      {...props}    // لا نمرر loading هنا
    >
      {/* أيقونة التحميل أو الأيقونة العادية */}
      {loading ? (
        <span className="ic ic-xs" style={{ animation: 'spin 1s linear infinite' }}>
          <i className="ti ti-loader" />
        </span>
      ) : icon ? (
        <span className="ic ic-xs">{icon}</span>
      ) : null}
      {loading ? 'جارٍ التحميل...' : children}
    </button>
  );
}
```

## FILE: resources/js/components/ui/Card.tsx
```
// components/ui/Card.tsx
import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: string | number;
  noHeader?: boolean;
}

export default function Card({
  title, subtitle, actions, children, style, padding, noHeader = false,
}: CardProps) {
  const hasHeader = !noHeader && (title || subtitle || actions);
  return (
    <div className="card" style={{ ...(padding !== undefined ? { padding } : {}), ...style }}>
      {hasHeader && (
        <div className="card-hd">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-sub">{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
```

## FILE: resources/js/components/ui/ConfirmDeleteModal.tsx
```
// resources/js/components/ui/ConfirmDeleteModal.tsx
import React from 'react';
import Modal  from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface Props {
    /** هل المودال مفتوح */
    open: boolean;
    /** دالة الإغلاق */
    onClose: () => void;
    /** دالة تأكيد الحذف */
    onConfirm: () => void;
    /** هل الحذف جارٍ (من useMutation.isPending) */
    loading?: boolean;
    /** اسم العنصر المراد حذفه — يظهر في الرسالة */
    itemName?: string;
    /** رسالة تحذير مخصصة تحت الاسم (اختياري) */
    warning?: string;
}

/**
 * مودال تأكيد الحذف — مكوّن مشترك لكامل المشروع
 *
 * الاستخدام:
 * ```tsx
 * const deleteModal = useModal();
 * const [deletingId, setDeletingId] = useState<number | null>(null);
 *
 * const deleteMutation = useMutation({
 *   mutationFn: (id: number) => apiClient.delete(`/resource/${id}`),
 *   onSuccess: () => { qc.invalidateQueries(...); deleteModal.closeModal(); },
 * });
 *
 * // عند الضغط على أيقونة الحذف:
 * const handleDelete = (id: number) => {
 *   setDeletingId(id);
 *   deleteModal.openModal();
 * };
 *
 * <ConfirmDeleteModal
 *   open={deleteModal.open}
 *   onClose={deleteModal.closeModal}
 *   onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
 *   loading={deleteMutation.isPending}
 *   itemName="الصندوق الرئيسي"
 * />
 * ```
 */
export default function ConfirmDeleteModal({
    open,
    onClose,
    onConfirm,
    loading = false,
    itemName,
    warning,
}: Props) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            size="sm"
            title="تأكيد الحذف"
            footer={
                <>
                    <Button onClick={onClose} disabled={loading}>
                        إلغاء
                    </Button>
                    <Button
                        variant="danger"
                        icon={<i className="ti ti-trash" />}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'جاري الحذف...' : 'حذف'}
                    </Button>
                </>
            }
        >
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: '8px 0 4px',
                textAlign: 'center',
            }}>
                {/* أيقونة التحذير */}
                <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--red-bg, #fff1f0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <i className="ti ti-trash" style={{
                        fontSize: 24,
                        color: 'var(--red, #e03e3e)',
                    }} />
                </div>

                {/* النص الرئيسي */}
                <div>
                    <p style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--t1)',
                        lineHeight: 1.5,
                    }}>
                        {itemName
                            ? <>هل تريد حذف <span style={{ color: 'var(--red, #e03e3e)' }}>«{itemName}»</span>؟</>
                            : 'هل تريد حذف هذا العنصر؟'
                        }
                    </p>

                    <p style={{
                        margin: '6px 0 0',
                        fontSize: 13,
                        color: 'var(--t4)',
                        lineHeight: 1.6,
                    }}>
                        {warning ?? 'لا يمكن التراجع عن هذا الإجراء بعد التأكيد.'}
                    </p>
                </div>
            </div>
        </Modal>
    );
}
```

```
// DataTable/utils.ts  —  v10.0 (كامل مع جميع الدوال)

import type {
  Column, SortState, MultiSortState, FilterMap, AggregateType, RangeFilter,
  ConditionalFormat, ExcelExportOptions,
} from './types';

// ════════════════════════════════════════════════════════════════════════════
// دوال أساسية (موجودة سابقاً)
// ════════════════════════════════════════════════════════════════════════════

export function getRawValue<T>(row: T, col: Column<T>): unknown {
  if (col.accessor) return col.accessor(row);
  if (col.key.includes('.')) {
    const parts = col.key.split('.');
    let val: unknown = row;
    for (const part of parts) {
      if (val == null || typeof val !== 'object') return undefined;
      val = (val as Record<string, unknown>)[part];
    }
    return val;
  }
  return (row as Record<string, unknown>)[col.key];
}

export function getStringValue<T>(row: T, col: Column<T>): string {
  const v = getRawValue(row, col);
  return v == null ? '' : String(v).toLowerCase();
}

export function encodeRange(min: string, max: string): string {
  return `${min}|${max}`;
}

export function decodeRange(val: string): RangeFilter {
  const idx = val.indexOf('|');
  if (idx === -1) return { min: val, max: '' };
  return { min: val.slice(0, idx), max: val.slice(idx + 1) };
}

function compareDates(d1Str: string, d2Str: string, op: 'lt' | 'gt'): boolean {
  if (!d1Str || !d2Str) return true;
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return op === 'lt' ? d1 < d2 : d1 > d2;
}

// ─── تحليل قيمة فلتر SmartFilter (operator:value) ──────────────────────────
//
// SmartFilter يُنتج قيماً بصيغة "gt:30" أو "contains:أحمد" أو "30|60" (range)
// هذه الدالة تُحوّلها لمقارنة رقمية/نصية صحيحة.
// إذا لم تكن بصيغة operator:value → تُعامَل كفلتر نصي عادي.
//
function applySmartOperator(rv: string, rawVal: string): boolean {
  const colonIdx = rawVal.indexOf(':');
  if (colonIdx === -1) return rv.includes(rawVal.toLowerCase());

  const op  = rawVal.slice(0, colonIdx);
  const val = rawVal.slice(colonIdx + 1);

  switch (op) {
    case 'eq':       return rv === val.toLowerCase();
    case 'neq':      return rv !== val.toLowerCase();
    case 'contains': return rv.includes(val.toLowerCase());
    case 'starts':   return rv.startsWith(val.toLowerCase());
    case 'ends':     return rv.endsWith(val.toLowerCase());
    case 'gt':  { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n > v; }
    case 'gte': { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n >= v; }
    case 'lt':  { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n < v; }
    case 'lte': { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n <= v; }
    default:         return rv.includes(rawVal.toLowerCase());
  }
}

export function applyClientFilter<T>(data: T[], filters: FilterMap, columns: Column<T>[]): T[] {
  const active = Object.entries(filters).filter(([, v]) => v !== '');
  if (!active.length) return data;

  return data.filter(row =>
    active.every(([key, rawVal]) => {
      // ── فلاتر SmartFilter بدون عمود مطابق (مثل 'overdue_days', 'party.name')
      // نبحث عن العمود أولاً وإذا لم نجده نطبق البحث على الحقل المباشر
      const col = columns.find(c => c.key === key);

      // إذا لا يوجد عمود → محاولة dot-notation على الكائن مباشرة
      if (!col) {
        const parts = key.split('.');
        let val: unknown = row;
        for (const part of parts) {
          if (val == null || typeof val !== 'object') { val = undefined; break; }
          val = (val as Record<string, unknown>)[part];
        }
        const rv = val == null ? '' : String(val).toLowerCase();
        return applySmartOperator(rv, rawVal);
      }

      const { type } = col.filter ?? { type: 'text' };
      const rv = getStringValue(row, col);

      if (type === 'select') return rv === rawVal.toLowerCase();
      if (type === 'multiselect' || type === 'dynamic-multiselect') {
        const selected = rawVal.split(',').filter(Boolean);
        return !selected.length || selected.includes(rv);
      }
      if (type === 'number') {
        // range عادي (min|max)
        if (rawVal.includes('|') && !rawVal.includes(':')) {
          const { min, max } = decodeRange(rawVal);
          const numRv = parseFloat(rv);
          if (min && !isNaN(parseFloat(min)) && numRv < parseFloat(min)) return false;
          if (max && !isNaN(parseFloat(max)) && numRv > parseFloat(max)) return false;
          return true;
        }
        // SmartFilter operator
        return applySmartOperator(rv, rawVal);
      }
      if (type === 'date') {
        const { min, max } = decodeRange(rawVal);
        if (min && !compareDates(rv, min, 'lt')) return false;
        if (max && !compareDates(rv, max, 'gt')) return false;
        return true;
      }
      // text / fallback — يدعم SmartFilter operators أيضاً
      return applySmartOperator(rv, rawVal);
    }),
  );
}

export function applyGlobalSearch<T>(data: T[], query: string, columns: Column<T>[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return data;
  const cols = columns.filter(c => c.searchable !== false);
  return data.filter(row => cols.some(col => String(getRawValue(row, col) ?? '').toLowerCase().includes(q)));
}

export function applyClientSort<T>(data: T[], sort: SortState, columns: Column<T>[]): T[] {
  if (!sort.key || !sort.dir) return data;
  const col = columns.find(c => c.key === sort.key);
  if (!col) return data;
  return [...data].sort((a, b) => {
    const va = getRawValue(a, col);
    const vb = getRawValue(b, col);
    const cmp = typeof va === 'number' && typeof vb === 'number'
      ? va - vb
      : String(va ?? '').localeCompare(String(vb ?? ''), 'ar-DZ');
    return sort.dir === 'desc' ? -cmp : cmp;
  });
}

export function applyMultiSort<T>(data: T[], sorts: MultiSortState, columns: Column<T>[]): T[] {
  if (!sorts.length) return data;
  const colMap = new Map(columns.map(c => [c.key, c]));
  return [...data].sort((a, b) => {
    for (const { key, dir } of sorts) {
      const col = colMap.get(key);
      if (!col) continue;
      const va = getRawValue(a, col);
      const vb = getRawValue(b, col);
      let cmp: number;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'ar-DZ');
      if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}

export function applyConditionalFormat<T>(
  value: unknown,
  row: T,
  colKey: string,
  formats: ConditionalFormat<T>[],
): { style: React.CSSProperties; className: string } {
  let style: React.CSSProperties = {};
  const classes: string[] = [];
  for (const fmt of formats) {
    if (fmt.colKey !== '*' && fmt.colKey !== colKey) continue;
    if (fmt.condition(value, row)) {
      style = { ...style, ...fmt.style };
      if (fmt.className) classes.push(fmt.className);
    }
  }
  return { style, className: classes.join(' ') };
}

export function computeAggregate<T>(rows: T[], col: Column<T>, type: AggregateType): number | null {
  const nums = rows
    .map(r => { const v = getRawValue(r, col); return typeof v === 'number' ? v : parseFloat(String(v ?? '')); })
    .filter(n => !isNaN(n));
  if (!nums.length) return null;
  switch (type) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    case 'count': return nums.length;
  }
}

export function exportToCSV<T>(data: T[], columns: Column<T>[], name: string): void {
  const cols = columns.filter(c => typeof (c.exportHeader ?? c.header) === 'string');
  const hdr = cols.map(c => `"${(c.exportHeader ?? c.header as string)}"`).join(',');
  const rows = data.map(r =>
    cols.map(c => `"${String(getRawValue(r, c) ?? '').replace(/"/g, '""')}"`).join(','),
  );
  const blob = new Blob(['\ufeff' + [hdr, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function buildPageNumbers(cur: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  let s = Math.max(2, cur - 1);
  let e = Math.min(last - 1, cur + 1);
  if (cur <= 3) { s = 2; e = 4; }
  if (cur >= last - 2) { s = last - 3; e = last - 1; }
  if (s > 2) pages.push('…');
  for (let p = s; p <= e; p++) pages.push(p);
  if (e < last - 1) pages.push('…');
  if (last !== 1 && pages[pages.length - 1] !== last) pages.push(last);
  return pages;
}

export function getTextAlign(align?: Column['align']): React.CSSProperties['textAlign'] {
  if (align === 'center') return 'center';
  if (align === 'end') return 'left';
  return 'right';
}

// ════════════════════════════════════════════════════════════════════════════
// 🆕 دوال جديدة للميزات
// ════════════════════════════════════════════════════════════════════════════

// ─── Excel Export حقيقي (يتطلب xlsx) ─────────────────────────────────────────

export async function exportToExcel<T>(
  data: T[],
  columns: Column<T>[],
  options: ExcelExportOptions = {}
): Promise<void> {
  const { fileName = 'export', includeHiddenColumns = false, title } = options;

  try {
    const XLSX = await import('xlsx');

    const visibleCols = columns.filter(c => !c.defaultHidden || includeHiddenColumns);
    const headers = visibleCols.map(c => c.exportHeader ?? (typeof c.header === 'string' ? c.header : c.key));

    const rows = data.map(row =>
      visibleCols.map(col => {
        let value = getRawValue(row, col);
        if (col.render && typeof value !== 'string') {
          const rendered = col.render(row, 0);
          if (typeof rendered === 'string') value = rendered;
          else if (rendered && typeof rendered === 'object' && 'props' in rendered) {
            value = (rendered as any)?.props?.children ?? value;
          }
        }
        return value ?? '';
      })
    );

    const sheetData = [headers, ...rows];
    if (title) sheetData.unshift([title], []);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = headers.map(() => ({ wch: 15 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    // ── Fallback تلقائي لـ CSV مع رسالة واضحة ──────────────────────────────
    console.warn(
      'DataTable: مكتبة xlsx غير متوفرة — جارٍ التصدير بصيغة CSV بدلاً من ذلك.\n' +
      'لتفعيل تصدير Excel الحقيقي: npm install xlsx'
    );

    // إشعار المستخدم بأسلوب غير متطفل
    const msg = document.createElement('div');
    msg.setAttribute('role', 'alert');
    msg.style.cssText = [
      'position:fixed', 'bottom:20px', 'left:50%', 'transform:translateX(-50%)',
      'background:#1a1a2e', 'color:#fff', 'padding:10px 20px',
      'border-radius:8px', 'font-size:13px', 'z-index:99999',
      'box-shadow:0 4px 12px rgba(0,0,0,.3)', 'direction:rtl',
    ].join(';');
    msg.textContent = '⚠️ مكتبة xlsx غير مثبتة — تم التصدير بصيغة CSV';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);

    // التصدير كـ CSV
    exportToCSV(data, columns, fileName);
  }
}

// ─── Paste from Excel (TSV/CSV parsing) ──────────────────────────────────────

export function parseTSV(plainText: string): string[][] {
  const lines = plainText.split(/\r?\n/);
  const result: string[][] = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    let cells: string[] = [];
    if (line.includes('\t')) {
      cells = line.split('\t');
    } else {
      const regex = /(?:,|^)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        cells.push(match[1] ? match[1].replace(/""/g, '"') : (match[2] || ''));
      }
    }
    result.push(cells);
  }
  return result;
}
```

## FILE: resources/js/components/ui/DatePicker.tsx
```
import React, { useState, useRef, useEffect, useId } from 'react';

interface DatePickerProps {
  value?: string; // ISO date: YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

const DAYS = ['أح', 'إث', 'ث', 'أر', 'خ', 'ج', 'س'];
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d} ${MONTHS[parseInt(m) - 1]} ${y}`;
}
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'اختر تاريخاً',
  error,
  min,
  max,
  disabled = false,
  clearable = true,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(value ? parseInt(value.split('-')[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value ? parseInt(value.split('-')[1]) - 1 : today.getMonth());
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onChange(iso);
    setOpen(false);
  };

  const isDisabled = (iso: string) => {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const days = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: days}, (_, i) => i + 1)];

  return (
    <div className={`dp-wrapper ${className}`} ref={ref}>
      {label && <label className="dp-label" htmlFor={id}>{label}</label>}

      <button
        id={id}
        type="button"
        className={`dp-trigger ${open ? 'open' : ''} ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <svg className="dp-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1 7h14" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span className={!value ? 'dp-placeholder' : ''}>{value ? formatDisplay(value) : placeholder}</span>
        {clearable && value && !disabled && (
          <span className="dp-clear" onClick={e => { e.stopPropagation(); onChange(''); }}>✕</span>
        )}
      </button>

      {error && <span className="dp-error">{error}</span>}

      {open && (
        <div className="dp-calendar" role="dialog" aria-label="تقويم">
          {/* Navigation */}
          <div className="dp-nav">
            <button type="button" className="dp-nav-btn" onClick={prevMonth}>‹</button>
            <span className="dp-nav-title">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="dp-nav-btn" onClick={nextMonth}>›</button>
          </div>

          {/* Day headers */}
          <div className="dp-grid">
            {DAYS.map(d => <div key={d} className="dp-day-header">{d}</div>)}
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isSel = iso === value;
              const isToday = iso === todayISO();
              const isDis = isDisabled(iso);
              return (
                <button
                  key={day}
                  type="button"
                  className={`dp-day ${isSel ? 'selected' : ''} ${isToday && !isSel ? 'today' : ''} ${isDis ? 'disabled' : ''}`}
                  onClick={() => !isDis && selectDay(day)}
                  disabled={isDis}
                  aria-label={iso}
                  aria-pressed={isSel}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="dp-footer">
            <button type="button" className="dp-today-btn" onClick={() => {
              const t = todayISO();
              if (!isDisabled(t)) { onChange(t); setOpen(false); }
            }}>اليوم</button>
          </div>
        </div>
      )}

      <style>{`
        .dp-wrapper { position: relative; display: flex; flex-direction: column; gap: 4px; }
        .dp-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .dp-trigger {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; width: 100%;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; cursor: pointer;
          font-size: 14px; color: var(--color-text-primary);
          transition: border-color .15s, box-shadow .15s;
          text-align: start;
        }
        .dp-trigger:hover:not(.disabled) { border-color: var(--color-border-primary); }
        .dp-trigger.open { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent); }
        .dp-trigger.has-error { border-color: var(--color-text-danger, #ef4444); }
        .dp-trigger.disabled { opacity: .5; cursor: not-allowed; }
        .dp-icon { color: var(--color-text-secondary); flex-shrink: 0; }
        .dp-placeholder { color: var(--color-text-tertiary); flex: 1; }
        .dp-trigger span:not(.dp-placeholder):not(.dp-clear) { flex: 1; }
        .dp-clear { font-size: 11px; color: var(--color-text-secondary); padding: 2px 4px; border-radius: 4px; line-height: 1; margin-inline-start: auto; }
        .dp-clear:hover { color: var(--color-text-primary); background: var(--color-background-secondary); }
        .dp-error { font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .dp-calendar {
          position: absolute; top: calc(100% + 4px); left: 0; z-index: 1000;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 10px; padding: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          min-width: 260px;
          animation: dp-open .12s ease;
        }
        @keyframes dp-open { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
        .dp-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .dp-nav-btn { background: none; border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 18px; color: var(--color-text-secondary); line-height: 1; }
        .dp-nav-btn:hover { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .dp-nav-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
        .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dp-day-header { text-align: center; font-size: 11px; font-weight: 500; color: var(--color-text-tertiary); padding: 4px 0; }
        .dp-day {
          display: flex; align-items: center; justify-content: center;
          height: 32px; border-radius: 6px; border: none; background: none;
          font-size: 13px; cursor: pointer; color: var(--color-text-primary);
          transition: background .1s, color .1s;
        }
        .dp-day:hover:not(.disabled) { background: var(--color-background-secondary); }
        .dp-day.today { font-weight: 600; color: var(--color-text-info, #3b82f6); }
        .dp-day.today::after { content:''; display:block; width:4px; height:4px; background: currentColor; border-radius:50%; position:absolute; bottom:3px; }
        .dp-day.today { position: relative; }
        .dp-day.selected { background: var(--color-text-info, #3b82f6); color: #fff; font-weight: 500; }
        .dp-day.disabled { opacity: .3; cursor: not-allowed; }
        .dp-footer { margin-top: 8px; border-top: 1px solid var(--color-border-tertiary); padding-top: 8px; display: flex; justify-content: center; }
        .dp-today-btn { background: none; border: none; font-size: 13px; cursor: pointer; color: var(--color-text-info, #3b82f6); font-weight: 500; padding: 4px 8px; border-radius: 6px; }
        .dp-today-btn:hover { background: var(--color-background-secondary); }
      `}</style>
    </div>
  );
};

export default DatePicker;
```

## FILE: resources/js/components/ui/Drawer.tsx
```
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type DrawerPosition = 'right' | 'left';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: DrawerSize;
  position?: DrawerPosition;
  closeOnOverlay?: boolean;
  className?: string;
}

const sizeMap: Record<DrawerSize, string> = {
  sm: '360px',
  md: '480px',
  lg: '600px',
  xl: '760px',
  full: '100vw',
};

const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  position = 'right',
  closeOnOverlay = true,
  className = '',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const width = sizeMap[size];

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay ${open ? 'open' : ''}`}
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        className={`drawer drawer--${position} ${open ? 'open' : ''} ${className}`}
        style={{ '--drawer-width': width } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="drawer__header">
          <div className="drawer__header-text">
            {title && <h2 className="drawer__title">{title}</h2>}
            {description && <p className="drawer__description">{description}</p>}
          </div>
          <button className="drawer__close" onClick={onClose} aria-label="إغلاق">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="drawer__body">
          {children}
        </div>

        {/* Footer */}
        {footer && <div className="drawer__footer">{footer}</div>}
      </div>

      <style>{`
        .drawer-overlay {
          position: fixed; inset: 0; z-index: 1040;
          background: rgba(0,0,0,0.4);
          opacity: 0; pointer-events: none;
          transition: opacity 0.25s;
        }
        .drawer-overlay.open { opacity: 1; pointer-events: auto; }

        .drawer {
          position: fixed; top: 0; bottom: 0; z-index: 1050;
          width: min(var(--drawer-width), 100vw);
          background: var(--color-background-primary);
          border-inline-start: 1px solid var(--color-border-tertiary);
          display: flex; flex-direction: column;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          box-shadow: -4px 0 24px rgba(0,0,0,0.08);
        }
        .drawer--right { right: 0; transform: translateX(100%); }
        .drawer--left  { left:  0; transform: translateX(-100%); }
        .drawer--right.open,
        .drawer--left.open  { transform: translateX(0); }

        .drawer__header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; padding: 20px 20px 16px;
          border-bottom: 1px solid var(--color-border-tertiary);
          flex-shrink: 0;
        }
        .drawer__header-text { display: flex; flex-direction: column; gap: 2px; }
        .drawer__title { margin: 0; font-size: 16px; font-weight: 500; color: var(--color-text-primary); }
        .drawer__description { margin: 0; font-size: 13px; color: var(--color-text-secondary); }
        .drawer__close {
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border: none; background: transparent;
          border-radius: 6px; cursor: pointer; color: var(--color-text-secondary);
          transition: background 0.15s, color 0.15s;
        }
        .drawer__close:hover { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .drawer__body { flex: 1; overflow-y: auto; padding: 20px; }
        .drawer__footer {
          padding: 16px 20px;
          border-top: 1px solid var(--color-border-tertiary);
          flex-shrink: 0;
        }
      `}</style>
    </>,
    document.body
  );
};

export default Drawer;
```

## FILE: resources/js/components/ui/Dropdown.tsx
```
import React, { useState, useRef, useEffect, useId } from 'react';

export interface DropdownOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string | number | null;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  clearable?: boolean;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  disabled = false,
  label,
  error,
  clearable = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (opt: DropdownOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  return (
    <div className={`dropdown-wrapper ${className}`} ref={ref}>
      {label && <label className="dropdown-label" htmlFor={id}>{label}</label>}

      <button
        id={id}
        type="button"
        className={`dropdown-trigger ${open ? 'open' : ''} ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`dropdown-trigger__value ${!selected ? 'placeholder' : ''}`}>
          {selected?.icon && <span className="dropdown-trigger__icon">{selected.icon}</span>}
          {selected ? selected.label : placeholder}
        </span>
        <span className="dropdown-trigger__actions">
          {clearable && value && (
            <span className="dropdown-clear" onClick={handleClear} aria-label="مسح">✕</span>
          )}
          <span className={`dropdown-chevron ${open ? 'rotated' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </span>
      </button>

      {error && <span className="dropdown-error">{error}</span>}

      {open && (
        <ul className="dropdown-menu" role="listbox">
          {options.map(opt => (
            <li
              key={opt.value}
              className={`dropdown-item ${opt.value === value ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt)}
            >
              {opt.icon && <span className="dropdown-item__icon">{opt.icon}</span>}
              {opt.label}
              {opt.value === value && (
                <svg className="dropdown-item__check" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </li>
          ))}
          {options.length === 0 && (
            <li className="dropdown-empty">لا توجد خيارات</li>
          )}
        </ul>
      )}

      <style>{`
        .dropdown-wrapper { position: relative; display: flex; flex-direction: column; gap: 4px; }
        .dropdown-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .dropdown-trigger {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 8px 12px; gap: 8px;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; cursor: pointer;
          font-size: 14px; color: var(--color-text-primary);
          transition: border-color 0.15s, box-shadow 0.15s;
          text-align: start;
        }
        .dropdown-trigger:hover:not(.disabled) { border-color: var(--color-border-primary); }
        .dropdown-trigger.open { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent); }
        .dropdown-trigger.has-error { border-color: var(--color-text-danger, #ef4444); }
        .dropdown-trigger.disabled { opacity: 0.5; cursor: not-allowed; }
        .dropdown-trigger__value { display: flex; align-items: center; gap: 6px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dropdown-trigger__value.placeholder { color: var(--color-text-tertiary); }
        .dropdown-trigger__actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .dropdown-clear { font-size: 11px; color: var(--color-text-secondary); padding: 2px 4px; border-radius: 4px; line-height: 1; }
        .dropdown-clear:hover { color: var(--color-text-primary); background: var(--color-background-secondary); }
        .dropdown-chevron { display: flex; color: var(--color-text-secondary); transition: transform 0.2s; }
        .dropdown-chevron.rotated { transform: rotate(180deg); }
        .dropdown-error { font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .dropdown-menu {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 1000;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; list-style: none; margin: 0; padding: 4px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          max-height: 240px; overflow-y: auto;
          animation: dropdown-open 0.12s ease;
        }
        @keyframes dropdown-open {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dropdown-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 6px;
          font-size: 14px; cursor: pointer; color: var(--color-text-primary);
          transition: background 0.1s;
        }
        .dropdown-item:hover:not(.disabled) { background: var(--color-background-secondary); }
        .dropdown-item.selected { color: var(--color-text-info, #3b82f6); font-weight: 500; }
        .dropdown-item.disabled { opacity: 0.4; cursor: not-allowed; }
        .dropdown-item__icon { display: flex; flex-shrink: 0; }
        .dropdown-item__check { margin-inline-start: auto; color: var(--color-text-info, #3b82f6); }
        .dropdown-empty { padding: 12px 10px; text-align: center; color: var(--color-text-tertiary); font-size: 13px; }
      `}</style>
    </div>
  );
};

export default Dropdown;
```

## FILE: resources/js/components/ui/EmptyState.tsx
```
// components/ui/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  icon?: string;       // Tabler icon class e.g. "ti-package"
  text: string;
  sub?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = 'ti-mood-empty', text, sub, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-ic"><i className={`ti ${icon}`} /></div>
      <div className="empty-tx">{text}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
```

## FILE: resources/js/components/ui/FileUploader.tsx
```
import React, { useRef, useState, useId } from 'react';

interface FileUploaderProps {
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // bytes
  maxFiles?: number;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onChange,
  accept,
  multiple = false,
  maxSize,
  maxFiles = 10,
  label,
  hint,
  error,
  disabled = false,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const id = useId();

  const validate = (rawFiles: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];
    const combined = multiple ? [...files, ...rawFiles] : rawFiles;

    if (multiple && combined.length > maxFiles) {
      errors.push(`الحد الأقصى ${maxFiles} ملفات`);
      return { valid, errors };
    }

    for (const f of rawFiles) {
      if (maxSize && f.size > maxSize) {
        errors.push(`${f.name}: الحجم يتجاوز ${formatBytes(maxSize)}`);
        continue;
      }
      valid.push(f);
    }
    return { valid, errors };
  };

  const addFiles = (rawFiles: FileList | null) => {
    if (!rawFiles || disabled) return;
    const { valid, errors } = validate(Array.from(rawFiles));
    setLocalErrors(errors);
    if (!valid.length) return;
    const updated = multiple ? [...files, ...valid] : valid;
    setFiles(updated);
    onChange(updated);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onChange(updated);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className={`fu-wrapper ${className}`}>
      {label && <label className="fu-label" htmlFor={id}>{label}</label>}

      <div
        className={`fu-zone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${error || localErrors.length ? 'has-error' : ''}`}
        onDragOver={e => { e.preventDefault(); !disabled && setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="منطقة رفع الملفات"
        onKeyDown={e => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="fu-input"
          onChange={e => addFiles(e.target.files)}
          disabled={disabled}
        />

        <div className="fu-zone__content">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="fu-zone__icon">
            <path d="M16 4v16M9 11l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 24h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
            <path d="M4 28h24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3"/>
          </svg>
          <p className="fu-zone__text">
            {dragging ? 'أفلت الملف هنا' : 'اسحب وأفلت أو'}
            {!dragging && <span className="fu-zone__link"> انقر للاختيار</span>}
          </p>
          {hint && <p className="fu-zone__hint">{hint}</p>}
          {maxSize && <p className="fu-zone__hint">الحد الأقصى: {formatBytes(maxSize)}</p>}
        </div>
      </div>

      {/* Errors */}
      {(error || localErrors.length > 0) && (
        <div className="fu-errors">
          {error && <p className="fu-error">{error}</p>}
          {localErrors.map((e, i) => <p key={i} className="fu-error">{e}</p>)}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="fu-list">
          {files.map((file, i) => (
            <li key={i} className="fu-file">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="fu-file__icon">
                <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              <div className="fu-file__info">
                <span className="fu-file__name">{file.name}</span>
                <span className="fu-file__size">{formatBytes(file.size)}</span>
              </div>
              <button
                type="button"
                className="fu-file__remove"
                onClick={e => { e.stopPropagation(); removeFile(i); }}
                aria-label={`حذف ${file.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .fu-wrapper { display: flex; flex-direction: column; gap: 6px; }
        .fu-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .fu-input { display: none; }
        .fu-zone {
          border: 2px dashed var(--color-border-secondary);
          border-radius: 10px; padding: 28px 20px;
          cursor: pointer; transition: border-color .15s, background .15s;
          text-align: center; outline: none;
        }
        .fu-zone:hover:not(.disabled), .fu-zone:focus:not(.disabled) { border-color: var(--color-text-info, #3b82f6); background: color-mix(in srgb, var(--color-text-info, #3b82f6) 4%, transparent); }
        .fu-zone.dragging { border-color: var(--color-text-info, #3b82f6); background: color-mix(in srgb, var(--color-text-info, #3b82f6) 8%, transparent); }
        .fu-zone.has-error { border-color: var(--color-text-danger, #ef4444); }
        .fu-zone.disabled { opacity: .5; cursor: not-allowed; }
        .fu-zone__content { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .fu-zone__icon { color: var(--color-text-tertiary); margin-bottom: 4px; }
        .fu-zone__text { margin: 0; font-size: 14px; color: var(--color-text-secondary); }
        .fu-zone__link { color: var(--color-text-info, #3b82f6); font-weight: 500; }
        .fu-zone__hint { margin: 0; font-size: 12px; color: var(--color-text-tertiary); }
        .fu-errors { display: flex; flex-direction: column; gap: 2px; }
        .fu-error { margin: 0; font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .fu-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
        .fu-file {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: 8px;
          background: var(--color-background-secondary);
          border: 1px solid var(--color-border-tertiary);
        }
        .fu-file__icon { color: var(--color-text-secondary); flex-shrink: 0; }
        .fu-file__info { flex: 1; overflow: hidden; }
        .fu-file__name { display: block; font-size: 13px; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fu-file__size { font-size: 12px; color: var(--color-text-tertiary); }
        .fu-file__remove {
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border: none; background: none;
          border-radius: 4px; cursor: pointer; color: var(--color-text-secondary);
        }
        .fu-file__remove:hover { background: var(--color-background-primary); color: var(--color-text-danger, #ef4444); }
      `}</style>
    </div>
  );
};

export default FileUploader;
```

## FILE: resources/js/components/ui/FormField.tsx
```
// resources/js/components/ui/FormField.tsx
import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export default function FormField({ label, required = false, children, hint }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-5">
      <label className="form-label uppercase tracking-widest">
        {label}
        {required && <span className="text-red ml-2">*</span>}
      </label>
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function FormInput({ size = 'md', className = '', ...props }: FormInputProps) {
  const sizeClasses = {
    sm: 'px-8 py-6 text-sm',
    md: 'px-12 py-9 text-base',
    lg: 'px-14 py-10 text-lg',
  };

  return (
    <input
      className={`
        w-full rounded-md border border-b3 bg-3 text-t1
        font-tajawal text-base outline-none transition
        focus:border-em focus:bg-2 focus:shadow-md
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    />
  );
}
```

## FILE: resources/js/components/ui/FormInputs.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

const inputBase = [
  'bg-[var(--bg2)] border border-[var(--b3)] rounded-[var(--r2)]',
  'px-[11px] py-2 text-[13px] text-[var(--t1)] outline-none',
  'font-sans w-full transition-[border-color_.15s,box-shadow_.15s]',
  'placeholder:text-[var(--t4)]',
  'focus:border-[var(--em)] focus:shadow-[0_0_0_3px_var(--emb)]',
  'dark:bg-[var(--bg3)]',
].join(' ')

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputBase, 'resize-vertical min-h-[70px]', className)}
      {...props}
    />
  )
}

export function Label({ className, children, required, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn('text-[12px] font-bold text-[var(--t3)] tracking-[.3px]', className)}
      {...props}
    >
      {children}
      {required && <span className="text-[var(--red)] ms-0.5">*</span>}
    </label>
  )
}

export function FormField({ className, children, span, ...props }: React.HTMLAttributes<HTMLDivElement> & { span?: 2 | 3 }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-[5px]',
        span === 2 && 'col-span-2',
        span === 3 && 'col-span-3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function FormGrid({ cols = 2, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { cols?: 2 | 3 }) {
  return (
    <div
      className={cn(
        'grid gap-3',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-3',
        'max-sm:grid-cols-1',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Input with suffix (e.g. "دج")
export function InputRow({ suffix, prefix, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & {
  suffix?: string; prefix?: string
}) {
  return (
    <div
      className={cn(
        'flex items-stretch border border-[var(--b3)] rounded-[var(--r2)] overflow-hidden',
        'bg-[var(--bg2)] transition-[border-color_.15s,box-shadow_.15s]',
        'focus-within:border-[var(--em)] focus-within:shadow-[0_0_0_3px_var(--emb)]',
        className,
      )}
      {...props}
    >
      {prefix && (
        <span className="flex items-center px-3 text-[12px] font-bold text-[var(--t4)] bg-[var(--bg3)] border-l border-[var(--b3)] flex-shrink-0">
          {prefix}
        </span>
      )}
      {children}
      {suffix && (
        <span className="flex items-center px-3 text-[12px] font-bold text-[var(--t4)] bg-[var(--bg3)] border-r border-[var(--b3)] flex-shrink-0">
          {suffix}
        </span>
      )}
    </div>
  )
}
```

## FILE: resources/js/components/ui/ImageUploader.tsx
```
// resources/js/components/ui/ImageUploader.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { productService } from '@/services/productService';

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

export default function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUrls = [...value];
    for (const file of acceptedFiles) {
      try {
        const { url } = await productService.uploadImage(file);
        newUrls.push(url);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
    onChange(newUrls);
  }, [value, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  const removeImage = (index: number) => {
    const newUrls = [...value];
    newUrls.splice(index, 1);
    onChange(newUrls);
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>أفلت الصور هنا...</p>
        ) : (
          <p>اسحب وأفلت الصور هنا، أو انقر للاختيار</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {value.map((url, idx) => (
          <div key={idx} className="relative w-20 h-20">
            <img src={url} alt={`upload-${idx}`} className="w-full h-full object-cover rounded" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/ui/index.ts
```
/**
 * components/ui/index.ts
 * ══════════════════════════════════════════════════════════════
 * نقطة الاستيراد الوحيدة لكل مكونات الـ UI
 *
 * الاستخدام:
 *   import { Card, Button, Badge, Modal } from '@/components/ui'
 * ══════════════════════════════════════════════════════════════
 */

export { Card, CardHeader, CardTitle, CardSub }         from './Card'
export { Button }                                        from './Button'
export { Badge }                                         from './Badge'
export { KpiCard }                                       from './KpiCard'
export { Modal }                                         from './Modal'
export { TableWrapper, Table, Th, Tr, Td }               from './Table'
export { Alert }                                         from './Alert'
export { Avatar }                                        from './Avatar'
export {
  Input, Select, Textarea, Label,
  FormField, FormGrid, InputRow,
}                                                        from './FormInputs'
export {
  Switch, ProgressBar, EmptyState, PageHeader,
  Sep, DotSep, IconButton, Tabs, SummaryRow,
  Grid2, Grid3, Grid4, Grid65, KpiGrid,
}                                                        from './Misc'
```

## FILE: resources/js/components/ui/KpiCard.tsx
```
// components/ui/KpiCard.tsx
import React from 'react';

type KpiVariant = 'green' | 'gold' | 'blue' | 'red' | 'purple' | 'teal' | 'orange';
type TrendDir   = 'up' | 'down' | 'neutral';

interface KpiCardProps {
  variant?: KpiVariant;
  icon: string;            // Tabler icon e.g. "ti-cash"
  label: string;
  value: React.ReactNode;
  unit?: string;           // e.g. "دج"
  trend?: string;
  trendDir?: TrendDir;
  sub?: React.ReactNode;
  onClick?: () => void;
}

const varMap: Record<KpiVariant, string> = {
  green:  'ke',
  gold:   'kg',
  blue:   'kb',
  red:    'kr',
  purple: 'kp',
  teal:   'kt',
  orange: 'ko',
};

const trendClass: Record<TrendDir, string> = {
  up:      'up',
  down:    'dn',
  neutral: 'neu',
};

export default function KpiCard({
  variant = 'green', icon, label, value, unit,
  trend, trendDir = 'up', sub, onClick,
}: KpiCardProps) {
  return (
    <div className={`kpi ${varMap[variant]}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="kpi-top">
        <div className="kpi-ic ic">
          <i className={`ti ${icon}`} />
        </div>
        {trend && (
          <div className={`kpi-trend ${trendClass[trendDir]}`}>{trend}</div>
        )}
      </div>
      <div className="kpi-lbl">{label}</div>
      <div className="kpi-val">
        {unit && <span className="u">{unit}</span>}
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
```

## FILE: resources/js/components/ui/Misc.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

// ════════════════════════════════════════════════════════════
// SWITCH
// ════════════════════════════════════════════════════════════
export function Switch({ checked, onChange, className }: {
  checked: boolean
  onChange: (v: boolean) => void
  className?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'switch-thumb relative w-[38px] h-[22px] rounded-[11px]',
        'border transition-all duration-[180ms] flex-shrink-0 cursor-pointer',
        checked ? 'bg-[var(--em)] border-[var(--em)]' : 'bg-[var(--bg5)] border-[var(--b3)]',
        checked && 'switch-on',
        className,
      )}
    />
  )
}

// ════════════════════════════════════════════════════════════
// PROGRESS BAR
// ════════════════════════════════════════════════════════════
export function ProgressBar({ value, color = 'em', className }: {
  value: number
  color?: 'em' | 'gold' | 'red' | 'blue'
  className?: string
}) {
  const fillColor = {
    em: 'bg-[var(--em)]', gold: 'bg-[var(--gold)]',
    red: 'bg-[var(--red)]', blue: 'bg-[var(--blue)]',
  }[color]

  return (
    <div className={cn('h-[5px] bg-[var(--bg4)] rounded-[4px] overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-[4px] transition-[width_.4s_ease]', fillColor)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════════════════
export function EmptyState({ icon, title, sub, action }: {
  icon?: React.ReactNode
  title: string
  sub?: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-[50px] px-5">
      {icon && <div className="text-[42px] opacity-20 mb-3">{icon}</div>}
      <p className="text-[14px] text-[var(--t4)]">{title}</p>
      {sub    && <p className="text-[12px] text-[var(--t4)] mt-1.5">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PAGE HEADER
// ════════════════════════════════════════════════════════════
export function PageHeader({
  title, sub, actions, className,
}: {
  title: string
  sub?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between mb-5 gap-3 flex-wrap', className)}>
      <div>
        <h1 className="text-[20px] font-black text-[var(--t1)] mb-[3px]">{title}</h1>
        {sub && <p className="text-[12.5px] text-[var(--t4)]">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SEPARATOR
// ════════════════════════════════════════════════════════════
export function Sep({ className }: { className?: string }) {
  return <div className={cn('h-px bg-[var(--b1)] my-3', className)} />
}

export function DotSep() {
  return (
    <span className="inline-block w-[3px] h-[3px] rounded-full bg-[var(--t4)] mx-[5px] align-middle" />
  )
}

// ════════════════════════════════════════════════════════════
// ICON BUTTON (Topbar)
// ════════════════════════════════════════════════════════════
export function IconButton({
  badge, className, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { badge?: number }) {
  return (
    <button
      className={cn(
        'w-[34px] h-[34px] rounded-[var(--r2)] bg-[var(--bg3)] border border-[var(--b2)]',
        'flex items-center justify-center cursor-pointer',
        'text-[15px] text-[var(--t3)] transition-all duration-150 flex-shrink-0 relative',
        'hover:bg-[var(--bg4)] hover:text-[var(--t1)]',
        className,
      )}
      {...props}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'absolute -top-1 -right-1 w-4 h-4 rounded-full',
          'bg-[var(--red)] text-white text-[8.5px] font-extrabold',
          'flex items-center justify-center border-2 border-[var(--bg2)]',
        )}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}

// ════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════
interface TabDef {
  key: string
  label: string
  icon?: React.ReactNode
  count?: number
}

export function Tabs({ tabs, active, onChange }: {
  tabs: TabDef[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex border-b border-[var(--b2)] mb-4 overflow-x-auto scrollbar-none">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-4 py-[9px] cursor-pointer text-[13px] font-bold',
            'border-b-2 -mb-px transition-colors duration-150 whitespace-nowrap select-none',
            'flex items-center gap-[6px]',
            tab.key === active
              ? 'text-[var(--em)] border-[var(--em)]'
              : 'text-[var(--t4)] border-transparent hover:text-[var(--t2)]',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-[9px] font-extrabold px-[5px] py-px rounded-[20px]',
              tab.key === active
                ? 'bg-[var(--emb)] text-[var(--em)]'
                : 'bg-[var(--bg4)] text-[var(--t4)]',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SUMMARY ROW
// ════════════════════════════════════════════════════════════
export function SummaryRow({ label, value, className }: {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'flex items-center justify-between py-[9px] border-b border-[var(--b1)] gap-2 last:border-b-0',
      className,
    )}>
      <span className="text-[12.5px] text-[var(--t3)]">{label}</span>
      <span className="text-[13px] font-bold text-[var(--t1)]">{value}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// GRID LAYOUTS
// ════════════════════════════════════════════════════════════
export function Grid2({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-2 gap-4 max-sm:grid-cols-1', className)} {...props}>{children}</div>
}
export function Grid3({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-3 gap-[14px] max-sm:grid-cols-1', className)} {...props}>{children}</div>
}
export function Grid4({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-4 gap-[14px] max-sm:grid-cols-2', className)} {...props}>{children}</div>
}
export function Grid65({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-[1.8fr_1fr] gap-4 max-sm:grid-cols-1', className)} {...props}>{children}</div>
}
export function KpiGrid({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-4 gap-[14px] mb-[18px] max-sm:grid-cols-2', className)} {...props}>{children}</div>
}
```

## FILE: resources/js/components/ui/Modal.tsx
```
// components/ui/Modal.tsx
import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  footerLeft?: React.ReactNode;
  children: React.ReactNode;
}

const sizeMap = { sm: 'modal-sm', md: '', lg: 'modal-lg' };

export default function Modal({
  open, onClose, title, subtitle,
  size = 'md', footer, footerLeft, children,
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className={`ov ${open ? 'on' : ''}`} onClick={onClose}>
      <div
        className={`modal ${sizeMap[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="m-hd">
          <div>
            <div className="m-title">{title}</div>
            {subtitle && <div className="m-sub">{subtitle}</div>}
          </div>
          <div className="m-x" onClick={onClose}>
            <span className="ic ic-xs"><i className="ti ti-x" /></span>
          </div>
        </div>

        {/* Body */}
        <div className="m-body">{children}</div>

        {/* Footer */}
        {(footer || footerLeft) && (
          <div className="m-foot">
            {footerLeft && <div className="m-foot-l">{footerLeft}</div>}
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/ui/PageHeader.tsx
```
import React from 'react';
import Breadcrumb, { BreadcrumbItem } from './Breadcrumb';

interface PageHeaderBadge {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: PageHeaderBadge;
  tabs?: React.ReactNode;
  className?: string;
}

const badgeVars: Record<string, string> = {
  success: 'var(--color-background-success, #f0fdf4)',
  warning: 'var(--color-background-warning, #fffbeb)',
  danger:  'var(--color-background-danger,  #fef2f2)',
  info:    'var(--color-background-info,    #eff6ff)',
  default: 'var(--color-background-secondary)',
};
const badgeText: Record<string, string> = {
  success: 'var(--color-text-success, #16a34a)',
  warning: 'var(--color-text-warning, #d97706)',
  danger:  'var(--color-text-danger,  #dc2626)',
  info:    'var(--color-text-info,    #2563eb)',
  default: 'var(--color-text-secondary)',
};

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumb,
  actions,
  badge,
  tabs,
  className = '',
}) => {
  const variant = badge?.variant ?? 'default';

  return (
    <div className={`ph-wrapper ${className}`}>
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="ph-breadcrumb">
          <Breadcrumb items={breadcrumb} />
        </div>
      )}

      {/* Main row */}
      <div className="ph-main">
        <div className="ph-title-group">
          <div className="ph-title-row">
            <h1 className="ph-title">{title}</h1>
            {badge && (
              <span
                className="ph-badge"
                style={{
                  background: badgeVars[variant],
                  color: badgeText[variant],
                }}
              >
                {badge.label}
              </span>
            )}
          </div>
          {description && <p className="ph-description">{description}</p>}
        </div>

        {actions && <div className="ph-actions">{actions}</div>}
      </div>

      {/* Tabs slot */}
      {tabs && <div className="ph-tabs">{tabs}</div>}

      <style>{`
        .ph-wrapper { display: flex; flex-direction: column; gap: 6px; padding-bottom: 20px; }
        .ph-breadcrumb { margin-bottom: 2px; }
        .ph-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .ph-title-group { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .ph-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .ph-title { margin: 0; font-size: 22px; font-weight: 500; color: var(--color-text-primary); line-height: 1.2; }
        .ph-badge {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 20px;
          font-size: 12px; font-weight: 500; white-space: nowrap;
        }
        .ph-description { margin: 0; font-size: 14px; color: var(--color-text-secondary); }
        .ph-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
        .ph-tabs { margin-top: 8px; border-bottom: 1px solid var(--color-border-tertiary); }
      `}</style>
    </div>
  );
};

export default PageHeader;
```

## FILE: resources/js/components/ui/Pagination.tsx
```
import React from 'react';
import type { BackendMeta } from '../../hooks/usePagination';

interface PaginationProps {
  meta: BackendMeta;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  className?: string;
}

const PrevIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const NextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function buildPages(current: number, last: number): (number | '...')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) pages.push(i);
  if (current < last - 2) pages.push('...');
  pages.push(last);
  return pages;
}

const Pagination: React.FC<PaginationProps> = ({
  meta,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 15, 25, 50, 100],
  showPageSize = true,
  showTotal = true,
  className = '',
}) => {
  const { current_page, last_page, per_page, total, from, to, is_first_page, is_last_page } = meta;
  const pages = buildPages(current_page, last_page);

  return (
    <div className={`pg-bar ${className}`}>
      {/* Left: total info */}
      {showTotal && (
        <span className="pg-info">
          {from ?? 0}–{to ?? 0} من {total.toLocaleString('ar-DZ')}
        </span>
      )}

      {/* Center: page numbers */}
      <div className="pg-pages">
        <button
          className="pg-btn pg-nav"
          onClick={() => onPageChange(current_page - 1)}
          disabled={is_first_page}
          aria-label="الصفحة السابقة"
        >
          <PrevIcon />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="pg-dots">…</span>
          ) : (
            <button
              key={p}
              className={`pg-btn pg-page ${p === current_page ? 'active' : ''}`}
              onClick={() => onPageChange(p as number)}
              aria-label={`صفحة ${p}`}
              aria-current={p === current_page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className="pg-btn pg-nav"
          onClick={() => onPageChange(current_page + 1)}
          disabled={is_last_page}
          aria-label="الصفحة التالية"
        >
          <NextIcon />
        </button>
      </div>

      {/* Right: per page */}
      {showPageSize && onPerPageChange && (
        <div className="pg-size">
          <span className="pg-size-label">لكل صفحة:</span>
          <select
            className="pg-size-select"
            value={per_page}
            onChange={e => onPerPageChange(Number(e.target.value))}
            aria-label="عدد العناصر في الصفحة"
          >
            {perPageOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}

      <style>{`
        .pg-bar {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px; padding: 12px 0;
        }
        .pg-info { font-size: 13px; color: var(--color-text-secondary); }
        .pg-pages { display: flex; align-items: center; gap: 2px; }
        .pg-btn {
          display: flex; align-items: center; justify-content: center;
          min-width: 32px; height: 32px; padding: 0 6px;
          border: 1px solid transparent; border-radius: 6px; cursor: pointer;
          font-size: 13px; color: var(--color-text-secondary); background: none;
          transition: background .1s, border-color .1s, color .1s;
        }
        .pg-btn:hover:not(:disabled) { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .pg-btn:disabled { opacity: .35; cursor: not-allowed; }
        .pg-btn.pg-page.active {
          background: var(--color-text-info, #3b82f6);
          border-color: var(--color-text-info, #3b82f6);
          color: #fff; font-weight: 500; cursor: default;
        }
        .pg-nav { color: var(--color-text-secondary); }
        .pg-dots { padding: 0 4px; color: var(--color-text-tertiary); font-size: 14px; }
        .pg-size { display: flex; align-items: center; gap: 6px; }
        .pg-size-label { font-size: 13px; color: var(--color-text-secondary); }
        .pg-size-select {
          padding: 4px 8px; border: 1px solid var(--color-border-secondary);
          border-radius: 6px; font-size: 13px; background: var(--color-background-primary);
          color: var(--color-text-primary); outline: none; cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default Pagination;
```

## FILE: resources/js/components/ui/ProgressBar.tsx
```
// components/ui/ProgressBar.tsx
import React from 'react';

interface ProgressBarProps {
  value: number;       // 0–100
  color?: string;      // CSS color or var()
  height?: number;
}

export default function ProgressBar({ value, color = 'var(--em)', height = 6 }: ProgressBarProps) {
  return (
    <div className="pb" style={{ height }}>
      <div className="pb-f" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}
```

## FILE: resources/js/components/ui/SearchInput.tsx
```
// components/ui/SearchInput.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;   // fires after debounce
  placeholder?: string;
  debounce?: number;                     // ms, default 300
  loading?: boolean;
  clearable?: boolean;
  width?: string | number;
  autoFocus?: boolean;
  disabled?: boolean;
}

/* Minimal inline SVG icons to avoid Tabler dependency issues */
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconLoader = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: 'srchSpin .7s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default function SearchInput({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'بحث...',
  debounce = 300,
  loading = false,
  clearable = true,
  width = 220,
  autoFocus = false,
  disabled = false,
}: SearchInputProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState('');
  const value = isControlled ? controlledValue : internalValue;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* autoFocus */
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  /* Debounced search callback */
  const fireSearch = useCallback((v: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!onSearch) return;
    timerRef.current = setTimeout(() => onSearch(v), debounce);
  }, [onSearch, debounce]);

  /* Cleanup on unmount */
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (!isControlled) setInternalValue(v);
    onChange?.(v);
    fireSearch(v);
  }

  function handleClear() {
    if (!isControlled) setInternalValue('');
    onChange?.('');
    onSearch?.('');
    if (timerRef.current) clearTimeout(timerRef.current);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') handleClear();
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch?.(value);
    }
  }

  return (
    <>
      <style>{`
        @keyframes srchSpin { to { transform: rotate(360deg); } }
        .srch-clear {
          display: flex; align-items: center; justify-content: center;
          width: 18px; height: 18px; border-radius: 50%;
          border: none; background: var(--bg5); color: var(--t4);
          cursor: pointer; transition: .14s; flex-shrink: 0; padding: 0;
        }
        .srch-clear:hover { background: var(--redb); color: var(--red); }
      `}</style>

      <div
        className="srch"
        style={{ width, opacity: disabled ? 0.55 : 1, pointerEvents: disabled ? 'none' : undefined }}
      >
        {/* Leading icon: spinner when loading, search otherwise */}
        <span className="srch-ic" style={{ display: 'flex', flexShrink: 0, color: loading ? 'var(--em)' : undefined }}>
          {loading ? <IconLoader /> : <IconSearch />}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          style={{ width: '100%' }}
        />

        {/* Clear button */}
        {clearable && value.length > 0 && !loading && (
          <button className="srch-clear" onClick={handleClear} tabIndex={-1} aria-label="مسح">
            <IconX />
          </button>
        )}
      </div>
    </>
  );
}
```

## FILE: resources/js/components/ui/Skeleton.tsx
```
import React from 'react';

type SkeletonVariant = 'text' | 'rect' | 'circle' | 'card' | 'table' | 'kpi';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  rows?: number;
  className?: string;
}

const Pulse: React.FC<{ style?: React.CSSProperties; className?: string }> = ({ style, className = '' }) => (
  <div className={`skeleton-pulse ${className}`} style={style} />
);

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  rows = 3,
  className = '',
}) => {
  if (variant === 'text') {
    return (
      <div className={`skeleton-text-block ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <Pulse
            key={i}
            style={{
              width: i === rows - 1 ? '60%' : (width ?? '100%'),
              height: height ?? 14,
              borderRadius: 4,
            }}
          />
        ))}
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  if (variant === 'circle') {
    const size = width ?? height ?? 40;
    return (
      <>
        <Pulse style={{ width: size, height: size, borderRadius: '50%' }} className={className} />
        <style>{skeletonStyle}</style>
      </>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`skeleton-card ${className}`}>
        <Pulse style={{ height: 120, borderRadius: 8, marginBottom: 12 }} />
        <Pulse style={{ height: 14, width: '70%', borderRadius: 4, marginBottom: 8 }} />
        <Pulse style={{ height: 14, width: '40%', borderRadius: 4 }} />
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  if (variant === 'kpi') {
    return (
      <div className={`skeleton-kpi ${className}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Pulse style={{ height: 14, width: '50%', borderRadius: 4 }} />
          <Pulse style={{ width: 32, height: 32, borderRadius: 6 }} />
        </div>
        <Pulse style={{ height: 28, width: '60%', borderRadius: 4, marginBottom: 8 }} />
        <Pulse style={{ height: 12, width: '40%', borderRadius: 4 }} />
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`skeleton-table ${className}`}>
        {/* Header */}
        <div className="skeleton-table__row skeleton-table__header">
          {[30, 20, 20, 15, 15].map((w, i) => (
            <Pulse key={i} style={{ height: 13, width: `${w}%`, borderRadius: 4 }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-table__row">
            {[30, 20, 20, 15, 15].map((w, j) => (
              <Pulse key={j} style={{ height: 13, width: `${w - (i % 2) * 5}%`, borderRadius: 4 }} />
            ))}
          </div>
        ))}
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  // rect (default)
  return (
    <>
      <Pulse
        className={className}
        style={{
          width: width ?? '100%',
          height: height ?? 16,
          borderRadius: 6,
        }}
      />
      <style>{skeletonStyle}</style>
    </>
  );
};

const skeletonStyle = `
  @keyframes skeleton-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .skeleton-pulse {
    display: block;
    background: linear-gradient(
      90deg,
      var(--color-background-secondary, #f0f0f0) 25%,
      var(--color-background-tertiary,  #e0e0e0) 50%,
      var(--color-background-secondary, #f0f0f0) 75%
    );
    background-size: 800px 100%;
    animation: skeleton-shimmer 1.4s infinite linear;
  }
  .skeleton-text-block { display: flex; flex-direction: column; gap: 8px; }
  .skeleton-card { padding: 16px; }
  .skeleton-kpi  { padding: 16px; }
  .skeleton-table { display: flex; flex-direction: column; }
  .skeleton-table__row {
    display: flex; align-items: center; gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border-tertiary);
  }
  .skeleton-table__header { border-bottom: 2px solid var(--color-border-secondary); }
`;

export default Skeleton;
```

## FILE: resources/js/components/ui/Stepper.tsx
```
import React from 'react';

export interface StepperStep {
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

type StepStatus = 'complete' | 'current' | 'upcoming';

interface StepperProps {
  steps: StepperStep[];
  currentStep: number; // 0-indexed
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  orientation = 'horizontal',
  className = '',
}) => {
  const getStatus = (index: number): StepStatus => {
    if (index < currentStep) return 'complete';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <nav aria-label="الخطوات" className={`stepper stepper--${orientation} ${className}`}>
      <ol className="stepper__list">
        {steps.map((step, index) => {
          const status = getStatus(index);
          return (
            <li key={index} className={`stepper__item stepper__item--${status}`}>
              {/* Connector line before (not for first item) */}
              {index > 0 && <div className="stepper__connector" />}

              {/* Step indicator */}
              <div className="stepper__indicator-wrapper">
                <div className="stepper__indicator" aria-hidden="true">
                  {status === 'complete'
                    ? <CheckIcon />
                    : step.icon ?? <span className="stepper__number">{index + 1}</span>
                  }
                </div>
              </div>

              {/* Step content */}
              <div className="stepper__content">
                <span className="stepper__label">{step.label}</span>
                {step.description && (
                  <span className="stepper__description">{step.description}</span>
                )}
              </div>

              {/* Connector line after (horizontal only, not for last) */}
              {orientation === 'horizontal' && index < steps.length - 1 && (
                <div className={`stepper__line stepper__line--${status === 'complete' ? 'done' : 'pending'}`} />
              )}
            </li>
          );
        })}
      </ol>

      <style>{`
        .stepper__list { display: flex; list-style: none; margin: 0; padding: 0; }

        /* Horizontal */
        .stepper--horizontal .stepper__list { flex-direction: row; align-items: flex-start; }
        .stepper--horizontal .stepper__item { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; gap: 8px; }
        .stepper--horizontal .stepper__connector { display: none; }
        .stepper--horizontal .stepper__line {
          position: absolute; top: 16px; left: calc(50% + 20px); right: calc(-50% + 20px);
          height: 2px; z-index: 0;
        }
        .stepper--horizontal .stepper__line--done  { background: var(--color-text-info, #3b82f6); }
        .stepper--horizontal .stepper__line--pending { background: var(--color-border-secondary); }
        .stepper--horizontal .stepper__content { text-align: center; display: flex; flex-direction: column; gap: 2px; }

        /* Vertical */
        .stepper--vertical .stepper__list { flex-direction: column; gap: 0; }
        .stepper--vertical .stepper__item { display: flex; flex-direction: row; align-items: flex-start; gap: 12px; position: relative; padding-bottom: 24px; }
        .stepper--vertical .stepper__item:last-child { padding-bottom: 0; }
        .stepper--vertical .stepper__line { display: none; }
        .stepper--vertical .stepper__connector {
          position: absolute; left: 15px; top: -24px; height: 24px; width: 2px;
          background: var(--color-border-secondary);
        }
        .stepper--vertical .stepper__item--complete .stepper__connector { background: var(--color-text-info, #3b82f6); }
        .stepper--vertical .stepper__content { padding-top: 6px; display: flex; flex-direction: column; gap: 2px; }

        /* Indicator */
        .stepper__indicator-wrapper { position: relative; z-index: 1; flex-shrink: 0; }
        .stepper__indicator {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600;
          border: 2px solid;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .stepper__item--complete .stepper__indicator {
          background: var(--color-text-info, #3b82f6);
          border-color: var(--color-text-info, #3b82f6);
          color: #fff;
        }
        .stepper__item--current .stepper__indicator {
          background: var(--color-background-primary);
          border-color: var(--color-text-info, #3b82f6);
          color: var(--color-text-info, #3b82f6);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent);
        }
        .stepper__item--upcoming .stepper__indicator {
          background: var(--color-background-secondary);
          border-color: var(--color-border-secondary);
          color: var(--color-text-tertiary);
        }
        .stepper__number { font-size: 13px; font-weight: 500; }

        /* Labels */
        .stepper__label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); line-height: 1.3; }
        .stepper__item--current  .stepper__label { color: var(--color-text-primary); }
        .stepper__item--complete .stepper__label { color: var(--color-text-secondary); }
        .stepper__item--upcoming .stepper__label { color: var(--color-text-tertiary); }
        .stepper__description { font-size: 12px; color: var(--color-text-tertiary); }
      `}</style>
    </nav>
  );
};

export default Stepper;
```

## FILE: resources/js/components/ui/Switch.tsx
```
// components/ui/Switch.tsx
import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export default function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        className={`sw ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') onChange(!checked); }}
      />
      {label && <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>}
    </div>
  );
}
```

## FILE: resources/js/components/ui/Table.tsx
```
import React from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'start' | 'center' | 'end';
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string | number);
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  className?: string;
}

function SortIcon({ active, dir }: { active: boolean; dir?: 'asc' | 'desc' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: active ? 1 : 0.4 }}>
      <path d={dir === 'desc' || !active ? "M3 4.5l3-3 3 3" : "M3 7.5l3 3 3-3"} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      {!active && <path d="M3 7.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>}
    </svg>
  );
}

function TableSkeleton({ cols, rows }: { cols: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="tbl-row">
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="tbl-cell">
              <div className="tbl-skel" style={{ width: `${60 + Math.random() * 30}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Table<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  selectable = false,
  selectedKeys,
  onSelectionChange,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  stickyHeader = false,
  className = '',
}: TableProps<T>) {

  const getKey = (row: T): string | number =>
    typeof rowKey === 'function' ? rowKey(row) : row[rowKey] as string | number;

  const allKeys = data.map(getKey);
  const allSelected = allKeys.length > 0 && allKeys.every(k => selectedKeys?.has(k));
  const someSelected = !allSelected && allKeys.some(k => selectedKeys?.has(k));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) onSelectionChange(new Set());
    else onSelectionChange(new Set(allKeys));
  };

  const toggleRow = (key: string | number) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  const effectiveCols = selectable
    ? [{ key: '__select__', header: '', width: 44 } as TableColumn<T>, ...columns]
    : columns;

  return (
    <div className={`tbl-outer ${className}`}>
      <table className="tbl" role="grid">
        <thead className={`tbl-head ${stickyHeader ? 'sticky' : ''}`}>
          <tr>
            {effectiveCols.map(col => {
              if (col.key === '__select__') return (
                <th key="__select__" className="tbl-th tbl-th--select">
                  <input
                    type="checkbox"
                    className="tbl-checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    aria-label="تحديد الكل"
                  />
                </th>
              );
              const isSorted = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  className={`tbl-th ${col.sortable ? 'sortable' : ''} align-${col.align ?? 'start'}`}
                  style={{ width: col.width }}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                  aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="tbl-th__inner">
                    {col.header}
                    {col.sortable && <SortIcon active={isSorted} dir={isSorted ? sortDir : undefined} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <TableSkeleton cols={effectiveCols.length} rows={5} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={effectiveCols.length} className="tbl-empty">
                <div className="tbl-empty__inner">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="tbl-empty__icon">
                    <rect x="4" y="8" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 14h32" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 22h8M12 27h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const key = getKey(row);
              const isSelected = selectedKeys?.has(key);
              return (
                <tr
                  key={key}
                  className={`tbl-row ${isSelected ? 'selected' : ''} ${onRowClick ? 'clickable' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  aria-selected={selectable ? isSelected : undefined}
                >
                  {effectiveCols.map(col => {
                    if (col.key === '__select__') return (
                      <td key="__select__" className="tbl-cell tbl-cell--select" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="tbl-checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                          aria-label={`تحديد الصف ${i + 1}`}
                        />
                      </td>
                    );
                    return (
                      <td key={col.key} className={`tbl-cell align-${col.align ?? 'start'}`}>
                        {col.render ? col.render(row, i) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <style>{`
        .tbl-outer { width: 100%; overflow-x: auto; border-radius: 10px; border: 1px solid var(--color-border-tertiary); }
        .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
        .tbl-head { background: var(--color-background-secondary); }
        .tbl-head.sticky { position: sticky; top: 0; z-index: 2; }
        .tbl-th {
          padding: 10px 14px; font-size: 12px; font-weight: 500;
          color: var(--color-text-secondary); text-align: start;
          border-bottom: 1px solid var(--color-border-secondary);
          white-space: nowrap; user-select: none;
        }
        .tbl-th.sortable { cursor: pointer; }
        .tbl-th.sortable:hover { color: var(--color-text-primary); background: var(--color-background-tertiary); }
        .tbl-th.align-center { text-align: center; }
        .tbl-th.align-end    { text-align: end; }
        .tbl-th--select { width: 44px; padding: 10px 12px; }
        .tbl-th__inner { display: inline-flex; align-items: center; gap: 5px; }
        .tbl-row { border-bottom: 1px solid var(--color-border-tertiary); transition: background .1s; }
        .tbl-row:last-child { border-bottom: none; }
        .tbl-row:hover { background: var(--color-background-secondary); }
        .tbl-row.selected { background: color-mix(in srgb, var(--color-text-info, #3b82f6) 6%, transparent); }
        .tbl-row.clickable { cursor: pointer; }
        .tbl-cell { padding: 12px 14px; color: var(--color-text-primary); vertical-align: middle; }
        .tbl-cell.align-center { text-align: center; }
        .tbl-cell.align-end    { text-align: end; }
        .tbl-cell--select { padding: 12px 12px; width: 44px; }
        .tbl-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--color-text-info, #3b82f6); }
        .tbl-empty { padding: 48px 20px; text-align: center; color: var(--color-text-secondary); }
        .tbl-empty__inner { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .tbl-empty__icon { color: var(--color-text-tertiary); }
        .tbl-skel {
          height: 13px; border-radius: 4px;
          background: linear-gradient(90deg, var(--color-background-secondary) 25%, var(--color-background-tertiary) 50%, var(--color-background-secondary) 75%);
          background-size: 400px 100%;
          animation: tbl-shimmer 1.4s infinite linear;
        }
        @keyframes tbl-shimmer { from { background-position: -400px 0; } to { background-position: 400px 0; } }
      `}</style>
    </div>
  );
}

export default Table;
```

## FILE: resources/js/components/ui/tabs.tsx
```
// resources/js/components/ui/tabs.tsx
import React, { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error('useTabs must be used within Tabs');
  return context;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return <div className={`flex gap-2 border-b ${className}`}>{children}</div>;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabs();
  const isActive = selectedValue === value;
  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'
      } ${className}`}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { value: selectedValue } = useTabs();
  if (selectedValue !== value) return null;
  return <div className={className}>{children}</div>;
}
```

## FILE: resources/js/components/ui/Tooltip.tsx
```
import React, { useState, useRef, useEffect } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  position?: TooltipPosition;
  delay?: number;
  children: React.ReactNode;
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 200,
  children,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (disabled) return;
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const gap = 8;
    let top = 0, left = 0;

    switch (position) {
      case 'top':
        top = trigger.top - tooltip.height - gap + window.scrollY;
        left = trigger.left + trigger.width / 2 - tooltip.width / 2 + window.scrollX;
        break;
      case 'bottom':
        top = trigger.bottom + gap + window.scrollY;
        left = trigger.left + trigger.width / 2 - tooltip.width / 2 + window.scrollX;
        break;
      case 'left':
        top = trigger.top + trigger.height / 2 - tooltip.height / 2 + window.scrollY;
        left = trigger.left - tooltip.width - gap + window.scrollX;
        break;
      case 'right':
        top = trigger.top + trigger.height / 2 - tooltip.height / 2 + window.scrollY;
        left = trigger.right + gap + window.scrollX;
        break;
    }

    setCoords({ top, left });
  }, [visible, position]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <>
      <div
        ref={triggerRef}
        className="tooltip-trigger"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>

      {visible && (
        <div
          ref={tooltipRef}
          className={`tooltip tooltip--${position}`}
          style={{ top: coords.top, left: coords.left }}
          role="tooltip"
        >
          {content}
          <span className="tooltip__arrow" />
        </div>
      )}

      <style>{`
        .tooltip-trigger { display: inline-flex; }
        .tooltip {
          position: fixed;
          z-index: 9999;
          background: var(--color-text-primary, #1a1a1a);
          color: var(--color-background-primary, #fff);
          font-size: 12px;
          line-height: 1.4;
          padding: 6px 10px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          max-width: 240px;
          white-space: normal;
          animation: tooltip-in 0.12s ease;
        }
        @keyframes tooltip-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .tooltip__arrow {
          position: absolute;
          width: 0; height: 0;
          border: 5px solid transparent;
        }
        .tooltip--top    .tooltip__arrow { bottom: -10px; left: 50%; transform: translateX(-50%); border-top-color: var(--color-text-primary, #1a1a1a); }
        .tooltip--bottom .tooltip__arrow { top: -10px;    left: 50%; transform: translateX(-50%); border-bottom-color: var(--color-text-primary, #1a1a1a); }
        .tooltip--left   .tooltip__arrow { right: -10px;  top:  50%; transform: translateY(-50%); border-left-color: var(--color-text-primary, #1a1a1a); }
        .tooltip--right  .tooltip__arrow { left:  -10px;  top:  50%; transform: translateY(-50%); border-right-color: var(--color-text-primary, #1a1a1a); }
      `}</style>
    </>
  );
};

export default Tooltip;
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

