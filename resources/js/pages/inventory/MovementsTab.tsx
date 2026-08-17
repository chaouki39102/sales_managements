// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/MovementsTab.tsx — جميع حركات المخزون
// ════════════════════════════════════════════════════════════════════════════
import { useState, useMemo, useCallback } from 'react';
import { useStockMovements, useInventoryMutations } from '@/lib/api/endpoints/inventory';
import { useWarehouses } from '@/lib/api/endpoints/lookups';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Th } from './InventoryShared';
import Pagination from '@/components/ui/Pagination';
import { MONEY } from '../reports/helpers';
import { exportToExcel } from '../reports/exportUtils';
import type { Warehouse } from '@/lib/api/core/types';

// ─── أنواع محلية ────────────────────────────────────────────────────────────

interface MovementRow {
  id: number;
  movement_date: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_price: number;
  stock_balance_after: number;
  price_source: string | null;
  reason: string | null;
  notes: string | null;
  is_validated: boolean;
  created_at: string;
  product?: { id: number; name: string; ref?: string | null } | null;
  warehouse?: { id: number; name: string } | null;
  stock_movement_type?: { id: number; label: string; direction: number } | null;
  deleted_at?: string | null;
}

interface MovementsData {
  data: MovementRow[];
  meta?: { current_page: number; last_page: number; per_page: number; total: number };
}

type DirectionFilter = 'all' | 'in' | 'out' | 'adjustment';

const DIR_CONFIG: Record<DirectionFilter, { label: string; color: string; bg: string }> = {
  all:        { label: 'الكل',       color: 'var(--em)',  bg: 'var(--emb)'  },
  in:         { label: 'وارد',       color: 'var(--green)', bg: 'var(--greenb)' },
  out:        { label: 'صادر',       color: 'var(--red)',   bg: 'var(--redb)'   },
  adjustment: { label: 'تسوية',      color: 'var(--gold)',  bg: 'var(--goldb)'  },
};

function directionOf(m: MovementRow): DirectionFilter {
  const d = m.stock_movement_type?.direction;
  if (d === 1) return 'in';
  if (d === -1) return 'out';
  return 'adjustment';
}

function fmt(n: number, decimals = 4): string {
  return Number(n ?? 0).toLocaleString('ar-DZ', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MovementsTab() {
  const { data: warehouses = [] } = useWarehouses();
  const { confirm, confirmDialogProps } = useConfirm();
  const { deleteMovement } = useInventoryMutations();

  // ── فلاتر ──
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [dirFilter, setDirFilter] = useState<DirectionFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const params = useMemo(() => ({
    ...(warehouseId ? { 'filter[warehouse_id]': warehouseId } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
    ...(search ? { search } : {}),
    sort: '-movement_date,-id',
    per_page: perPage,
    page,
  } as Record<string, unknown>), [warehouseId, dateFrom, dateTo, search, page, perPage]);

  const { data, isLoading, isFetching } = useStockMovements(params as any);

  const movements = useMemo(() => {
    const raw = (data as unknown as MovementsData | undefined)?.data;
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const meta = useMemo(() => {
    const m = (data as unknown as MovementsData | undefined)?.meta;
    return m ? {
      current_page: m.current_page, last_page: m.last_page,
      per_page: m.per_page, total: m.total,
      from: m.total === 0 ? null : (m.current_page - 1) * m.per_page + 1,
      to: Math.min(m.current_page * m.per_page, m.total) || null,
      has_more_pages: m.current_page < m.last_page,
      is_first_page: m.current_page === 1,
      is_last_page: m.current_page >= m.last_page,
    } : null;
  }, [data]);

  // ── فلتر الاتجاه (client-side) ──
  const filtered = useMemo(() => {
    if (dirFilter === 'all') return movements;
    return movements.filter(m => directionOf(m) === dirFilter);
  }, [movements, dirFilter]);

  // ── KPIs ──
  const counts = useMemo(() => ({
    in:  movements.filter(m => directionOf(m) === 'in').length,
    out: movements.filter(m => directionOf(m) === 'out').length,
    adj: movements.filter(m => directionOf(m) === 'adjustment').length,
    total: movements.length,
  }), [movements]);

  // ── حذف حركة ──
  const handleDelete = useCallback(async (m: MovementRow) => {
    const ok = await confirm(`هل تريد حذف الحركة #${m.id} — ${m.product?.name ?? ''}؟`);
    if (!ok) return;
    await deleteMovement.mutateAsync(m.id);
  }, [confirm, deleteMovement]);

  // ── تصدير ──
  const handleExport = async () => {
    if (filtered.length === 0) return;
    await exportToExcel([{
      name: 'حركات المخزون',
      headers: ['#', 'التاريخ', 'المنتج', 'المستودع', 'النوع', 'الاتجاه', 'الكمية', 'سعر الوحدة', 'التكلفة', 'الإجمالي', 'الرصيد بعد', 'ملاحظات'],
      rows: filtered.map((m, i) => [
        i + 1,
        m.movement_date?.slice(0, 10) ?? '',
        m.product?.name ?? '—',
        m.warehouse?.name ?? '—',
        m.stock_movement_type?.label ?? '—',
        directionOf(m) === 'in' ? 'وارد' : directionOf(m) === 'out' ? 'صادر' : 'تسوية',
        m.quantity,
        m.cost_price,
        m.total_price,
        m.stock_balance_after,
        m.reason ?? '',
      ] as (string | number)[]),
    }], `حركات المخزون`);
  };

  return (
    <div>
      {/* ── KPI cards ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { key: 'all' as const, label: 'إجمالي الحركات', icon: 'ti-arrows-exchange', color: 'var(--em)', count: counts.total },
          { key: 'in' as const, label: 'وارد', icon: 'ti-arrow-down', color: 'var(--green)', count: counts.in },
          { key: 'out' as const, label: 'صادر', icon: 'ti-arrow-up', color: 'var(--red)', count: counts.out },
          { key: 'adjustment' as const, label: 'تسويات', icon: 'ti-adjustments', color: 'var(--gold)', count: counts.adj },
        ]).map(k => (
          <button
            key={k.key}
            onClick={() => setDirFilter(k.key)}
            style={{
              flex: '1 1 140px',
              background: dirFilter === k.key ? 'var(--emb)' : 'var(--bg2)',
              border: `1px solid ${dirFilter === k.key ? 'var(--em)' : 'var(--b1)'}`,
              borderRadius: 12, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer', transition: 'all .15s', textAlign: 'right',
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`ti ${k.icon}`} style={{ fontSize: 18, color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)' }}>{k.count}</div>
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>{k.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── شريط الأدوات ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* بحث */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <i className="ti ti-search" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', fontSize: 15, pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث باسم المنتج..."
            style={{ width: '100%', padding: '8px 34px 8px 12px', background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* من تاريخ */}
        <input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          style={{ padding: '6px 10px', background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none' }}
        />

        {/* إلى تاريخ */}
        <input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1); }}
          style={{ padding: '6px 10px', background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none' }}
        />

        {/* المستودع */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-building-warehouse" style={{ color: 'var(--t3)', fontSize: 15 }} />
          <select
            value={warehouseId}
            onChange={e => { setWarehouseId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
            style={{ padding: '6px 10px', background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">كل المستودعات</option>
            {(warehouses as Warehouse[]).map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {/* زر تصدير */}
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'var(--bg3)', border: '1px solid var(--b2)',
            color: filtered.length === 0 ? 'var(--t4)' : 'var(--em)',
            cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="ti ti-file-spreadsheet" style={{ fontSize: 14 }} />
          تصدير Excel
        </button>

        {/* عداد */}
        <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {isFetching && !isLoading && <i className="ti ti-loader-2" style={{ fontSize: 13, animation: 'spin .8s linear infinite' }} />}
          {meta?.total ?? filtered.length} حركة
        </span>
      </div>

      {/* ── الجدول ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '2px solid var(--b1)' }}>
                <Th width="50px">#</Th>
                <Th width="100px">التاريخ</Th>
                <Th>المنتج</Th>
                <Th width="110px">المستودع</Th>
                <Th width="90px">النوع</Th>
                <Th width="70px">الاتجاه</Th>
                <Th width="80px">الكمية</Th>
                <Th width="100px">التكلفة</Th>
                <Th width="120px">الإجمالي</Th>
                <Th width="100px">الرصيد بعد</Th>
                <Th>السبب</Th>
                <Th width="40px" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} style={{ padding: 60, textAlign: 'center', color: 'var(--t4)' }}>
                    <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8, animation: 'spin .8s linear infinite' }} />
                    جاري تحميل الحركات...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: 60, textAlign: 'center', color: 'var(--t4)' }}>
                    <i className="ti ti-arrows-exchange" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
                    لا توجد حركات مخزون
                  </td>
                </tr>
              ) : (
                filtered.map((m, i) => {
                  const dir = directionOf(m);
                  const cfg = DIR_CONFIG[dir];
                  return (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: '1px solid var(--b1)',
                        background: i % 2 === 0 ? 'transparent' : 'var(--bg1)',
                      }}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--t4)', fontSize: 11 }}>{m.id}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--t3)', fontSize: 12 }}>
                        {m.movement_date?.slice(0, 10) ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{m.product?.name ?? '—'}</span>
                        {m.product?.ref && (
                          <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 6 }}>{m.product.ref}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--t3)', fontSize: 12 }}>
                        {m.warehouse?.name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--t3)', fontSize: 12 }}>
                        {m.stock_movement_type?.label ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg,
                        }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>
                        <span style={{ color: dir === 'in' ? 'var(--green)' : dir === 'out' ? 'var(--red)' : 'var(--gold)' }}>
                          {dir === 'in' ? '+' : dir === 'out' ? '−' : ''}
                          {fmt(m.quantity)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--t3)' }}>
                        {MONEY(m.cost_price)}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--t1)' }}>
                        {MONEY(m.total_price)}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--t2)' }}>
                        {fmt(m.stock_balance_after)}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--t4)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.reason ?? m.notes ?? '—'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(m)}
                          title="حذف الحركة"
                          style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: 'transparent', border: '1px solid transparent',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--t4)',
                            transition: 'all .1s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--red)'; (e.currentTarget as HTMLElement).style.background = 'var(--redb)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 13 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {meta && meta.last_page > 1 && (
        <Pagination
          meta={meta}
          onPageChange={setPage}
          onPerPageChange={v => { setPerPage(v); setPage(1); }}
          showPageSize
          showTotal
        />
      )}

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
