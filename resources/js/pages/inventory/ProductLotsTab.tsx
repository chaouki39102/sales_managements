// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/ProductLotsTab.tsx
// تبويب دفعات المنتجات (LOT)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useProductLots } from '@/lib/api/endpoints/inventory';
import { useNotification } from '@/hooks/useNotification';
import { apiDelete } from '@/lib/api/core/client';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveSlug } from '@/lib/store/appStore';

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const fmtNum = (n: number) => n.toLocaleString('fr-DZ');

export default function ProductLotsTab() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const { notify } = useNotification();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useProductLots({
    search: search || undefined,
    per_page: 20,
    page,
    include: 'product,warehouse',
  });

  const items = (data as unknown as { data?: unknown[] } | undefined)?.data
    ?? (Array.isArray(data) ? data : []);

  const meta = (data as unknown as { meta?: Record<string, number> } | undefined)?.meta;

  const handleDelete = async (id: number, lotNumber: string) => {
    if (!window.confirm(`تأكيد حذف الدفعة ${lotNumber}؟`)) return;
    try {
      await apiDelete(`/product-lots/${id}`);
      if (slug) qc.invalidateQueries({ queryKey: [slug, 'product-lots'] });
      notify.success('تم الحذف');
    } catch {
      notify.error('فشل الحذف');
    }
  };

  const expiringSoon = (lot: Record<string, unknown>) => {
    if (!lot.expiration_date) return false;
    const diff = new Date(lot.expiration_date as string).getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000;
  };

  const isExpired = (lot: Record<string, unknown>) => {
    if (!lot.expiration_date) return false;
    return new Date(lot.expiration_date as string).getTime() < Date.now();
  };

  return (
    <div>
      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', fontSize: 14 }} />
          <input
            type="text"
            placeholder="بحث برقم الدفعة أو اسم المنتج..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8,
              border: '1px solid var(--b2)', background: 'var(--bg2)',
              color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
      </div>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t4)' }}>
          <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite', fontSize: 20 }} />
          <div style={{ marginTop: 8 }}>جارٍ التحميل…</div>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t4)', fontSize: 14 }}>
          لا توجد دفعات
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                {['رقم الدفعة', 'المنتج', 'المستودع', 'الكمية الأصلية', 'المتبقي', 'تاريخ الصنع', 'تاريخ الانتهاء', 'الحالة', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--t4)', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((lot: Record<string, unknown>) => {
                const expired   = isExpired(lot);
                const expiring  = expiringSoon(lot);
                const remaining = Number(lot.remaining_quantity ?? 0);
                const original  = Number(lot.original_quantity ?? 0);

                return (
                  <tr key={String(lot.id)} style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace', fontSize: 11 }}>
                      {String(lot.lot_number)}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontWeight: 600 }}>
                        {String((lot.product as Record<string, unknown> | undefined)?.name ?? '—')}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--t3)' }}>
                      {String((lot.warehouse as Record<string, unknown> | undefined)?.name ?? '—')}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'left' }}>{fmtNum(original)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'left' }}>
                      <span style={{
                        fontWeight: 700,
                        color: remaining <= 0 ? 'var(--t4)' : remaining < original * 0.2 ? 'var(--red)' : 'var(--t1)',
                      }}>
                        {fmtNum(remaining)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--t3)' }}>{fmtDate(lot.manufacturing_date as string)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        color: expired ? 'var(--red)' : expiring ? 'var(--orange)' : 'var(--t3)',
                        fontWeight: expired || expiring ? 700 : 400,
                      }}>
                        {fmtDate(lot.expiration_date as string)}
                        {expired && ' ⚠ منتهية'}
                        {expiring && ' ⏳ تنتهي قريباً'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {remaining <= 0
                        ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--t4)' }}>فارغة</span>
                        : lot.active
                          ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'color-mix(in srgb, var(--em) 10%, transparent)', color: 'var(--em)' }}>نشطة</span>
                          : <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--t4)' }}>غير نشطة</span>
                      }
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <button
                        onClick={() => handleDelete(lot.id as number, String(lot.lot_number))}
                        title="حذف"
                        style={{
                          width: 26, height: 26, borderRadius: 6, border: '1px solid var(--b1)',
                          background: 'var(--bg2)', color: 'var(--t3)', fontSize: 12,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && Number(meta.last_page ?? 1) > 1 && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 16 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid var(--b2)',
              background: 'var(--bg2)', color: page <= 1 ? 'var(--t4)' : 'var(--t2)',
              cursor: page <= 1 ? 'default' : 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            السابق
          </button>
          <span style={{ padding: '6px 14px', fontSize: 12, color: 'var(--t3)' }}>
            صفحة {page} / {Number(meta.last_page ?? 1)}
          </span>
          <button
            disabled={page >= Number(meta.last_page ?? 1)}
            onClick={() => setPage(p => p + 1)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid var(--b2)',
              background: 'var(--bg2)', color: page >= Number(meta.last_page ?? 1) ? 'var(--t4)' : 'var(--t2)',
              cursor: page >= Number(meta.last_page ?? 1) ? 'default' : 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
