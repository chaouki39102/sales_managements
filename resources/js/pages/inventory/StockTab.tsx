// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/StockTab.tsx
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiGet }        from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { useWarehouses } from '@/lib/api/endpoints/lookups';
import { fmt }           from './inventoryTypes';
import { Th }            from './InventoryShared';
import type { StockAtRow } from '@/lib/api/endpoints/inventory';
import type { Warehouse }  from '@/lib/api/core/types';

// ─── ثوابت ───────────────────────────────────────────────────────────────────

const STATUS = {
  out: { label: 'نافد',   color: '#ef4444', bg: 'rgba(239,68,68,.12)'  },
  low: { label: 'منخفض', color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  ok:  { label: 'جيد',   color: '#10b981', bg: 'rgba(16,185,129,.12)' },
} as const;

type StatusKey = keyof typeof STATUS;
type Filter    = 'all' | StatusKey;

const KPI_DEFS: { key: Filter; label: string; icon: string; color: string }[] = [
  { key: 'all', label: 'إجمالي المنتجات', icon: 'ti-cube',           color: 'var(--em)' },
  { key: 'out', label: 'نافد المخزون',    icon: 'ti-alert-circle',   color: '#ef4444'   },
  { key: 'low', label: 'مخزون منخفض',    icon: 'ti-alert-triangle', color: '#f59e0b'   },
  { key: 'ok',  label: 'مخزون جيد',      icon: 'ti-circle-check',   color: '#10b981'   },
];

const today = (): string => new Date().toISOString().split('T')[0];

function stockStatus(row: StockAtRow): StatusKey {
  if (row.current_stock <= 0)                   return 'out';
  if (row.current_stock <= row.min_stock_alert) return 'low';
  return 'ok';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StockTab() {
  const slug = useActiveSlug();

  // ── فلاتر ──
  const [asOfDate,    setAsOfDate]    = useState<string>(today());
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState<Filter>('all');

  // ── المستودعات ──
  const { data: warehouses = [] } = useWarehouses();

  // ── جلب المخزون ──
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      slug, 'inventory', 'stock-at',
      { date: asOfDate, warehouse_id: warehouseId || null, search },
    ],
    queryFn: () => apiGet<StockAtRow[]>('/inventory/stock-at', {
      date:         asOfDate,
      ...(warehouseId ? { warehouse_id: warehouseId } : {}),
      ...(search      ? { search }                    : {}),
    }),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });

  const all: StockAtRow[] = data ?? [];

  // ── KPI counts ──
  const counts = useMemo(() => ({
    all: all.length,
    out: all.filter(r => stockStatus(r) === 'out').length,
    low: all.filter(r => stockStatus(r) === 'low').length,
    ok:  all.filter(r => stockStatus(r) === 'ok').length,
  }), [all]);

  // ── تطبيق فلتر الحالة ──
  const rows = filter === 'all' ? all : all.filter(r => stockStatus(r) === filter);

  // ── إجماليات الجدول ──
  const totals = useMemo(() => ({
    opening: rows.reduce((s, r) => s + r.opening_quantity, 0),
    in:      rows.reduce((s, r) => s + r.total_in,         0),
    out:     rows.reduce((s, r) => s + r.total_out,        0),
    stock:   rows.reduce((s, r) => s + r.current_stock,    0),
    value:   rows.reduce((s, r) => s + r.total_value,      0),
  }), [rows]);

  const isToday = asOfDate === today();

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {KPI_DEFS.map(k => (
          <button
            key={k.key}
            onClick={() => setFilter(k.key)}
            style={{
              flex: '1 1 140px',
              background:   filter === k.key ? 'var(--emb)' : 'var(--bg2)',
              border:       `1px solid ${filter === k.key ? 'var(--em)' : 'var(--b1)'}`,
              borderRadius: 12, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer', transition: 'all .15s',
              textAlign: 'right', fontFamily: 'Tajawal, sans-serif',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'var(--bg3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`ti ${k.icon}`} style={{ fontSize: 18, color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)' }}>
                {counts[k.key]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>{k.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── شريط الأدوات ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 14,
        alignItems: 'center', flexWrap: 'wrap',
      }}>

        {/* بحث */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <i className="ti ti-search" style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--t4)', fontSize: 15, pointerEvents: 'none',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم أو مرجع..."
            style={{
              width: '100%', padding: '8px 34px 8px 12px',
              background: 'var(--bg2)', border: '1px solid var(--b2)',
              borderRadius: 8, color: 'var(--t1)', fontSize: 13,
              fontFamily: 'Tajawal, sans-serif', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* التاريخ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-calendar-event" style={{ color: 'var(--t3)', fontSize: 15 }} />
          <span style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
            المخزون في:
          </span>
          <input
            type="date"
            value={asOfDate}
            max={today()}
            onChange={e => e.target.value && setAsOfDate(e.target.value)}
            style={{
              padding: '6px 10px',
              background: 'var(--bg2)', border: '1px solid var(--b2)',
              borderRadius: 8, color: 'var(--t1)', fontSize: 13,
              fontFamily: 'Tajawal, sans-serif', outline: 'none', cursor: 'pointer',
            }}
          />
          {!isToday && (
            <button
              onClick={() => setAsOfDate(today())}
              style={{
                padding: '5px 10px', borderRadius: 8,
                border: '1px solid var(--em)', background: 'var(--emb)',
                color: 'var(--em)', fontSize: 11,
                cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
              }}
            >
              اليوم
            </button>
          )}
        </div>

        {/* المستودع */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-building-warehouse" style={{ color: 'var(--t3)', fontSize: 15 }} />
          <select
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
            style={{
              padding: '6px 10px',
              background: 'var(--bg2)', border: '1px solid var(--b2)',
              borderRadius: 8, color: 'var(--t1)', fontSize: 13,
              fontFamily: 'Tajawal, sans-serif', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">كل المستودعات</option>
            {(warehouses as Warehouse[]).map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {/* badge فلتر الحالة */}
        {filter !== 'all' && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', background: 'var(--emb)',
            borderRadius: 20, fontSize: 11, color: 'var(--em)', fontWeight: 700,
          }}>
            {STATUS[filter as StatusKey].label}
            <i className="ti ti-x" style={{ fontSize: 12, cursor: 'pointer' }}
               onClick={() => setFilter('all')} />
          </span>
        )}

        {/* عداد + مؤشر تحديث */}
        <span style={{
          marginRight: 'auto', fontSize: 12, color: 'var(--t4)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {isFetching && !isLoading && (
            <i className="ti ti-loader-2" style={{
              fontSize: 13, animation: 'spin .8s linear infinite',
            }} />
          )}
          {rows.length} منتج
        </span>

      </div>

      {/* ── الجدول ── */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--b1)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg3)', borderBottom: '2px solid var(--b1)' }}>
              <Th>المنتج</Th>
              <Th>التصنيف</Th>
              <Th width="80px">الوحدة</Th>
              <Th width="120px">الافتتاحي</Th>
              <Th width="120px">المدخلات</Th>
              <Th width="120px">المخرجات</Th>
              <Th width="130px">المخزون الحالي</Th>
              <Th width="110px">الحد الأدنى</Th>
              <Th width="140px">القيمة الإجمالية</Th>
              <Th width="90px">الحالة</Th>
            </tr>
          </thead>
          <tbody>

            {/* تحميل */}
            {isLoading ? (
              <tr>
                <td colSpan={10} style={{ padding: 60, textAlign: 'center', color: 'var(--t4)' }}>
                  <i className="ti ti-loader-2" style={{
                    fontSize: 28, display: 'block', marginBottom: 8,
                    animation: 'spin .8s linear infinite',
                  }} />
                  جاري حساب المخزون...
                </td>
              </tr>

            /* لا نتائج */
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 60, textAlign: 'center', color: 'var(--t4)' }}>
                  <i className="ti ti-cube-off" style={{
                    fontSize: 36, display: 'block', marginBottom: 8,
                  }} />
                  لا توجد منتجات
                  {!isToday && (
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      لا توجد حركات أو رصيد افتتاحي حتى {asOfDate}
                    </div>
                  )}
                </td>
              </tr>

            /* الصفوف */
            ) : rows.map((row, i) => {
              const st = stockStatus(row);
              const sm = STATUS[st];
              return (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid var(--b1)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg1)',
                  }}
                >
                  {/* المنتج */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--t1)' }}>{row.name}</div>
                    {row.ref && (
                      <div style={{ fontSize: 11, color: 'var(--t4)' }}>{row.ref}</div>
                    )}
                  </td>

                  {/* التصنيف */}
                  <td style={{ padding: '10px 12px', color: 'var(--t3)', fontSize: 12 }}>
                    {row.family?.name ?? '—'}
                  </td>

                  {/* الوحدة */}
                  <td style={{ padding: '10px 12px', color: 'var(--t4)', fontSize: 12, textAlign: 'center' }}>
                    {row.unit?.symbol ?? '—'}
                  </td>

                  {/* الافتتاحي */}
                  <td style={{ padding: '10px 12px', color: 'var(--t3)' }}>
                    {fmt(row.opening_quantity, 3)}
                  </td>

                  {/* المدخلات */}
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      +{fmt(row.total_in, 3)}
                    </span>
                  </td>

                  {/* المخرجات */}
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                      -{fmt(row.total_out, 3)}
                    </span>
                  </td>

                  {/* المخزون الحالي */}
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontWeight: 700, fontSize: 14,
                      color: st === 'out' ? '#ef4444'
                           : st === 'low' ? '#f59e0b'
                           : 'var(--t1)',
                    }}>
                      {fmt(row.current_stock, 3)}
                    </span>
                  </td>

                  {/* الحد الأدنى */}
                  <td style={{ padding: '10px 12px', color: 'var(--t4)', fontSize: 12 }}>
                    {fmt(row.min_stock_alert, 3)}
                  </td>

                  {/* القيمة الإجمالية */}
                  <td style={{ padding: '10px 12px', color: 'var(--t1)' }}>
                    {fmt(row.total_value)}{' '}
                    <span style={{ fontSize: 11, color: 'var(--t4)' }}>دج</span>
                  </td>

                  {/* الحالة */}
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px',
                      borderRadius: 20, fontSize: 11, fontWeight: 700,
                      color: sm.color, background: sm.bg,
                    }}>
                      {sm.label}
                    </span>
                  </td>

                </tr>
              );
            })}

          </tbody>

          {/* صف الإجماليات */}
          {rows.length > 0 && (
            <tfoot>
              <tr style={{
                background: 'var(--bg3)',
                borderTop: '2px solid var(--b1)',
                fontWeight: 700,
              }}>
                <td colSpan={3} style={{ padding: '10px 12px', color: 'var(--t3)', fontSize: 12 }}>
                  الإجمالي ({rows.length} منتج)
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--t2)' }}>
                  {fmt(totals.opening, 3)}
                </td>
                <td style={{ padding: '10px 12px', color: '#10b981' }}>
                  +{fmt(totals.in, 3)}
                </td>
                <td style={{ padding: '10px 12px', color: '#ef4444' }}>
                  -{fmt(totals.out, 3)}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--t1)', fontSize: 14 }}>
                  {fmt(totals.stock, 3)}
                </td>
                <td />
                <td style={{ padding: '10px 12px', color: 'var(--t1)' }}>
                  {fmt(totals.value)}{' '}
                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>دج</span>
                </td>
                <td />
              </tr>
            </tfoot>
          )}

        </table>
      </div>

    </div>
  );
}
