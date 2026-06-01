// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/StockTab.tsx — تاب "المخزون الحالي"
// ════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import {
  type InventoryProduct,
  fmt,
  stockStatus,
} from './inventoryTypes';
import { Th } from './InventoryShared';

// ─── ثوابت ───────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  out: { label: 'نافد',   color: '#ef4444', bg: 'rgba(239,68,68,.12)'  },
  low: { label: 'منخفض', color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  ok:  { label: 'جيد',   color: '#10b981', bg: 'rgba(16,185,129,.12)' },
} as const;

type Filter = 'all' | keyof typeof STATUS_MAP;

const KPI_DEFS = [
  { key: 'all' as Filter, label: 'إجمالي المنتجات', icon: 'ti-cube',           color: 'var(--em)' },
  { key: 'out' as Filter, label: 'نافد المخزون',    icon: 'ti-alert-circle',   color: '#ef4444'   },
  { key: 'low' as Filter, label: 'مخزون منخفض',    icon: 'ti-alert-triangle', color: '#f59e0b'   },
  { key: 'ok'  as Filter, label: 'مخزون جيد',      icon: 'ti-circle-check',   color: '#10b981'   },
] as const;

// ════════════════════════════════════════════════════════════════════════════

export default function StockTab() {
  const slug = useActiveSlug();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // extractData في client.ts يستخرج data.data ويرجع المصفوفة مباشرة
  const { data, isLoading } = useQuery({
    queryKey:        tenantKeys.inventory.list(slug ?? '', { search }),
    queryFn:         () => apiGet<InventoryProduct[]>('/products', {
      search,
      manages_stock: 1,
      per_page:      500,
      include:       'family,unit',
    }),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });

  const all: InventoryProduct[] = data ?? [];

  // KPI counts — حساب مرة واحدة
  const counts = {
    all: all.length,
    out: all.filter(p => stockStatus(p) === 'out').length,
    low: all.filter(p => stockStatus(p) === 'low').length,
    ok:  all.filter(p => stockStatus(p) === 'ok').length,
  };

  const products = filter === 'all' ? all : all.filter(p => stockStatus(p) === filter);

  return (
    <div>
      {/* ── KPI cards (قابلة للنقر كفلاتر) ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {KPI_DEFS.map(k => (
          <button
            key={k.key}
            onClick={() => setFilter(k.key)}
            style={{
              flex: '1 1 140px',
              background: filter === k.key ? 'var(--emb)' : 'var(--bg2)',
              border: `1px solid ${filter === k.key ? 'var(--em)' : 'var(--b1)'}`,
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

      {/* ── شريط البحث + badge الفلتر الفعّال ── */}
      <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <i className="ti ti-search" style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--t4)', fontSize: 15, pointerEvents: 'none',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن منتج..."
            style={{
              width: '100%', padding: '8px 34px 8px 12px',
              background: 'var(--bg2)', border: '1px solid var(--b2)',
              borderRadius: 8, color: 'var(--t1)', fontSize: 13,
              fontFamily: 'Tajawal, sans-serif', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {filter !== 'all' && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', background: 'var(--emb)',
            borderRadius: 20, fontSize: 11, color: 'var(--em)', fontWeight: 700,
          }}>
            {STATUS_MAP[filter].label}
            <i
              className="ti ti-x"
              style={{ fontSize: 12, cursor: 'pointer' }}
              onClick={() => setFilter('all')}
            />
          </span>
        )}

        <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--t4)' }}>
          {products.length} منتج
        </span>
      </div>

      {/* ── الجدول ── */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--b1)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b1)' }}>
              <Th>المنتج</Th>
              <Th>التصنيف</Th>
              <Th width="130px">المخزون الحالي</Th>
              <Th width="110px">الحد الأدنى</Th>
              <Th width="130px">سعر التكلفة</Th>
              <Th width="90px">الحالة</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: 50, textAlign: 'center', color: 'var(--t4)' }}>
                  <i className="ti ti-loader-2" style={{
                    fontSize: 24, animation: 'spin .8s linear infinite',
                  }} />
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 50, textAlign: 'center', color: 'var(--t4)' }}>
                  <i className="ti ti-cube-off" style={{
                    fontSize: 32, display: 'block', marginBottom: 8,
                  }} />
                  لا توجد منتجات
                </td>
              </tr>
            ) : (
              products.map((p, i) => {
                const st = stockStatus(p);
                const sm = STATUS_MAP[st];
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid var(--b1)',
                      background: i % 2 === 0 ? 'transparent' : 'var(--bg1)',
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--t1)' }}>{p.name}</div>
                      {p.ref && (
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>{p.ref}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--t3)', fontSize: 12 }}>
                      {p.family?.name ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontWeight: 700,
                        color: st === 'out' ? '#ef4444' : 'var(--t1)',
                      }}>
                        {fmt(p.current_stock, 3)}
                      </span>
                      {p.unit?.symbol && (
                        <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 4 }}>
                          {p.unit.symbol}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--t4)', fontSize: 12 }}>
                      {fmt(p.min_stock_alert, 3)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--t1)' }}>
                      {fmt(p.current_cost_price)}{' '}
                      <span style={{ fontSize: 11, color: 'var(--t4)' }}>دج</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px',
                        borderRadius: 20, fontSize: 11, fontWeight: 700,
                        color: sm.color, background: sm.bg,
                      }}>
                        {sm.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
