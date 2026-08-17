// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/StockTab.tsx
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiGet }        from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { useWarehouses } from '@/lib/api/endpoints/lookups';
import { useProductLots } from '@/lib/api/endpoints/inventory';
import { fmt }           from './inventoryTypes';
import { Th }            from './InventoryShared';
import Pagination        from '@/components/ui/Pagination';
import SimpleTable       from '@/components/ui/SimpleTable';
import type { StockAtRow } from '@/lib/api/endpoints/inventory';
import type { ProductLot } from '@/lib/api/core/types';
import type { Warehouse }  from '@/lib/api/core/types';
import type { BackendMeta } from '@/hooks/usePagination';

// ─── ثوابت ───────────────────────────────────────────────────────────────────

const STATUS = {
  out: { label: 'نافد',   color: 'var(--red)',  bg: 'var(--redb)'  },
  low: { label: 'منخفض', color: 'var(--gold)',  bg: 'var(--goldb)' },
  ok:  { label: 'جيد',   color: 'var(--green)', bg: 'var(--greenb)' },
} as const;

type StatusKey = keyof typeof STATUS;
type Filter    = 'all' | StatusKey;

const KPI_DEFS: { key: Filter; label: string; icon: string; color: string }[] = [
  { key: 'all', label: 'إجمالي المنتجات', icon: 'ti-cube',           color: 'var(--em)' },
  { key: 'out', label: 'نافد المخزون',    icon: 'ti-alert-circle',   color: 'var(--red)'  },
  { key: 'low', label: 'مخزون منخفض',    icon: 'ti-alert-triangle', color: 'var(--gold)' },
  { key: 'ok',  label: 'مخزون جيد',      icon: 'ti-circle-check',   color: 'var(--green)' },
];

function stockStatus(row: StockAtRow): StatusKey {
  if (row.current_stock <= 0)                   return 'out';
  if (row.current_stock <= row.min_stock_alert) return 'low';
  return 'ok';
}

// ─── صف الدفعات الفرعي ──────────────────────────────────────────────────────

function LotsSubRow({
  productId, warehouseId, colSpan,
}: { productId: number; warehouseId: number | ''; colSpan: number }) {
  const { data, isLoading } = useProductLots({
    'filter[product_id]': productId,
    ...(warehouseId ? { 'filter[warehouse_id]': warehouseId } : {}),
    include: 'warehouse',
    sort: '-purchase_date',
    per_page: 50,
  } as any);

  const lots = useMemo(() => {
    const raw = (data as unknown as { data?: ProductLot[] } | undefined)?.data
      ?? (Array.isArray(data) ? data : []) as ProductLot[];
    return raw;
  }, [data]);

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0, background: 'var(--bg1)' }}>
        <div style={{ padding: '10px 20px 14px 40px' }}>
          {isLoading ? (
            <div style={{ fontSize: 12, color: 'var(--t4)', padding: 10 }}>
              <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite', marginLeft: 6 }} />
              {"\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062f\u0641\u0639\u0627\u062a..."}
            </div>
          ) : lots.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--t4)', padding: 10 }}>{"\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0641\u0639\u0627\u062a \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062a\u062c"}</div>
          ) : (
            <SimpleTable
              columns={[
                { key: 'lot_number', label: "\u0627\u0644\u062f\u0641\u0639\u0629", render: (v) => (
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v as string}</span>
                )},
                { key: 'warehouse_name', label: "\u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639", render: (_v, row) => (
                  <span style={{ color: 'var(--t3)' }}>{((row as any).warehouse?.name) ?? '\u2014'}</span>
                )},
                { key: '_original', label: "\u0627\u0644\u0623\u0635\u0644\u064a\u0629", align: 'start', render: (_v, row) => {
                  const lt = row as ProductLot;
                  return Number(lt.original_quantity ?? 0);
                }},
                { key: '_remaining', label: "\u0627\u0644\u0645\u062a\u0628\u0642\u064a", align: 'start', render: (_v, row) => {
                  const lt = row as ProductLot;
                  const remaining = Number(lt.remaining_quantity ?? 0);
                  const original = Number(lt.original_quantity ?? 0);
                  const pct = original > 0 ? (remaining / original) * 100 : 0;
                  const depleted = remaining <= 0;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <span style={{ fontWeight: 700, color: depleted ? 'var(--t4)' : pct < 20 ? 'var(--red)' : 'var(--t1)' }}>{remaining}</span>
                      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--bg4)', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pct < 20 ? 'var(--red)' : pct < 50 ? 'var(--gold)' : 'var(--green)' }} />
                      </div>
                    </div>
                  );
                }},
                { key: 'expiration_date', label: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621", render: (_v, row) => {
                  const lt = row as ProductLot;
                  const remaining = Number(lt.remaining_quantity ?? 0);
                  const depleted = remaining <= 0;
                  const expired = !!lt.expiration_date && new Date(lt.expiration_date).getTime() < Date.now();
                  const expiring = !depleted && !expired && !!lt.expiration_date && (new Date(lt.expiration_date).getTime() - Date.now()) < 30 * 86400000;
                  return (
                    <span style={{ color: expired ? 'var(--red)' : expiring ? 'var(--gold)' : 'var(--t3)' }}>
                      {lt.expiration_date ? new Date(lt.expiration_date).toLocaleDateString('ar-DZ') : '\u2014'}
                    </span>
                  );
                }},
                { key: '_status', label: "\u0627\u0644\u062d\u0627\u0644\u0629", render: (_v, row) => {
                  const lt = row as ProductLot;
                  const remaining = Number(lt.remaining_quantity ?? 0);
                  const depleted = remaining <= 0;
                  const expired = !!lt.expiration_date && new Date(lt.expiration_date).getTime() < Date.now();
                  const expiring = !depleted && !expired && !!lt.expiration_date && (new Date(lt.expiration_date).getTime() - Date.now()) < 30 * 86400000;
                  return (
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      color:      depleted ? 'var(--t4)' : expired ? 'var(--red)' : expiring ? 'var(--gold)' : 'var(--green)',
                      background: depleted ? 'var(--bg3)' : expired ? 'var(--redb)' : expiring ? 'var(--goldb)' : 'var(--greenb)',
                    }}>
                      {depleted ? '\u0641\u0627\u0631\u063a\u0629' : expired ? '\u0645\u0646\u062a\u0647\u064a\u0629' : expiring ? '\u062a\u0646\u062a\u0647\u064a' : '\u0646\u0634\u0637\u0629'}
                    </span>
                  );
                }},
              ]}
              data={lots as unknown as Record<string, unknown>[]}
              rowKey="id"
            />
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StockTab() {
  const slug = useActiveSlug();
  const { selectedYear } = useFiscalYear();

  // ── فلاتر ──
  const [date,        setDate]        = useState(() => new Date().toISOString().slice(0, 10));
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState<Filter>('all');

  // ── Pagination ──
  const [page,    setPage]    = useState(1);
  const [perPage, setPerPage] = useState(25);

  // ── صفوف مفتوحة ──
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  useEffect(() => { setPage(1); }, [search, filter, warehouseId, date]);

  // ── المستودعات ──
  const { data: warehouses = [] } = useWarehouses();

  // ── جلب المخزون ──
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      slug, 'inventory', 'stock-at',
      { fiscal_year_id: selectedYear?.id, warehouse_id: warehouseId || null, date, search },
    ],
    queryFn: () => apiGet<StockAtRow[]>('/inventory/stock-at', {
      ...(selectedYear?.id ? { fiscal_year_id: selectedYear.id } : {}),
      ...(warehouseId ? { warehouse_id: warehouseId } : {}),
      ...(date        ? { date }                           : {}),
      ...(search      ? { search }                         : {}),
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

  // ── Pagination computed ──
  const lastPage = Math.max(1, Math.ceil(rows.length / perPage));

  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  const paginatedRows = useMemo(
    () => rows.slice((page - 1) * perPage, page * perPage),
    [rows, page, perPage],
  );

  const meta: BackendMeta = useMemo(() => ({
    current_page:   page,
    last_page:      lastPage,
    per_page:       perPage,
    total:          rows.length,
    from:           rows.length === 0 ? null : (page - 1) * perPage + 1,
    to:             Math.min(page * perPage, rows.length) || null,
    has_more_pages: page < lastPage,
    is_first_page:  page === 1,
    is_last_page:   page >= lastPage,
  }), [page, lastPage, perPage, rows.length]);

  const COL_COUNT = 11;

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

        {/* تاريخ المخزون */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-clock" style={{ color: 'var(--t3)', fontSize: 15 }} />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              padding: '6px 10px',
              background: 'var(--bg2)', border: '1px solid var(--b2)',
              borderRadius: 8, color: 'var(--t1)', fontSize: 13,
              fontFamily: 'Tajawal, sans-serif', outline: 'none', cursor: 'pointer',
            }}
          />
        </div>

        {/* السنة المالية */}
        {selectedYear && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-calendar" style={{ color: 'var(--t3)', fontSize: 15 }} />
            <span style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
              السنة المالية:
            </span>
            <span style={{
              padding: '4px 10px', background: 'var(--emb)',
              borderRadius: 6, color: 'var(--em)', fontWeight: 700, fontSize: 13,
            }}>
              {selectedYear.name}{selectedYear.is_closed ? ' 🔒' : ''}
            </span>
          </div>
        )}

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
          {rows.length > perPage && ` • صفحة ${page} من ${lastPage}`}
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
              <Th width="80px">الدفعات</Th>
            </tr>
          </thead>
          <tbody>

            {/* تحميل */}
            {isLoading ? (
              <tr>
                <td colSpan={COL_COUNT} style={{ padding: 60, textAlign: 'center', color: 'var(--t4)' }}>
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
                <td colSpan={COL_COUNT} style={{ padding: 60, textAlign: 'center', color: 'var(--t4)' }}>
                  <i className="ti ti-cube-off" style={{
                    fontSize: 36, display: 'block', marginBottom: 8,
                  }} />
                  لا توجد منتجات
                  {selectedYear && (
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      لا توجد حركات أو رصيد افتتاحي للسنة المالية {selectedYear.name}
                    </div>
                  )}
                </td>
              </tr>

            /* الصفوف */
            ) : paginatedRows.map((row, i) => {
              const st = stockStatus(row);
              const sm = STATUS[st];
              const expanded  = expandedIds.has(row.id);
              const lotsCount = row.lots_count ?? 0;
              return (
                <React.Fragment key={row.id}>
                  <tr
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
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                        +{fmt(row.total_in, 3)}
                      </span>
                    </td>

                    {/* المخرجات */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                        -{fmt(row.total_out, 3)}
                      </span>
                    </td>

                    {/* المخزون الحالي */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontWeight: 700, fontSize: 14,
                        color: st === 'out' ? 'var(--red)'
                             : st === 'low' ? 'var(--gold)'
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

                    {/* الدفعات */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {row.manages_stock && lotsCount > 0 ? (
                        <button
                          onClick={() => toggleExpand(row.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            border: '1px solid var(--b2)', cursor: 'pointer',
                            background: expanded ? 'var(--emb)' : 'var(--bg3)',
                            color: expanded ? 'var(--em)' : 'var(--t3)',
                            transition: 'all .15s',
                          }}
                        >
                          <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 11 }} />
                          {lotsCount}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--t4)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                  </tr>

                  {expanded && (
                    <LotsSubRow productId={row.id} warehouseId={warehouseId} colSpan={COL_COUNT} />
                  )}
                </React.Fragment>
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
                <td style={{ padding: '10px 12px', color: 'var(--green)' }}>
                  +{fmt(totals.in, 3)}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--red)' }}>
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
                <td />
              </tr>
            </tfoot>
          )}

        </table>
      </div>

      {/* ── Pagination ── */}
      {rows.length > perPage && (
        <Pagination
          meta={meta}
          onPageChange={setPage}
          onPerPageChange={v => { setPerPage(v); setPage(1); }}
          showPageSize
          showTotal
        />
      )}

    </div>
  );
}
