// ════════════════════════════════════════════════════════════════════════════
// pages/offline/OfflinePage.tsx — صفحة تجهيز البيانات للعمل دون اتصال (C.3)
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useActiveSlug } from '@/lib/store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { useWarehouses } from '@/lib/api/endpoints/lookups';
import {
  OFFLINE_DATASETS,
  type DatasetFreshness,
  type PrefetchResult,
} from '@/lib/offline/prepareOffline';
import { useOfflineReadiness } from '@/lib/offline/useOffline';

function formatTime(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
}

export default function OfflinePage() {
  const slug = useActiveSlug();
  const { selectedYear } = useFiscalYear();
  const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState<number | ''>('');

  const readiness = useOfflineReadiness({
    slug: slug ?? '',
    warehouseId: warehouseId === '' ? null : warehouseId,
    fiscalYearId: selectedYear?.id,
  });

  const resultsById = new Map<string, PrefetchResult>((readiness.lastResults ?? []).map(r => [r.id, r]));

  return (
    <div>
      <PageHeader
        title="تجهيز البيانات للعمل دون اتصال"
        subtitle="حمّل البيانات المهمة مسبقاً لتُستخدم عندما ينقطع الاتصال"
      />

      <Card className="offline-page-card">
        <div className="offline-page-fields">
          <label className="offline-page-field">
            <span>المستودع (لبيانات المخزون)</span>
            {warehousesLoading ? (
              <Skeleton width="100%" height={34} />
            ) : (
              <select value={warehouseId} onChange={e => setWarehouseId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— بدون تحديد —</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            )}
          </label>
          <label className="offline-page-field">
            <span>السنة المالية</span>
            <input value={selectedYear ? `${selectedYear.name} (${selectedYear.id})` : '—'} readOnly disabled />
          </label>
        </div>

        <div className="offline-page-hint">
          <i className="ti ti-info-circle" />
          عند الضغط على «جهّز البيانات» تُحمَّل الآن البيانات أدناه وتُخزَّن محلياً في متصفحك.
          إذا انقطع الاتصال لاحقاً، ستُقدَّم هذه البيانات من الذاكرة المحلية بدلاً من شاشة فارغة.
        </div>

        <div className="offline-page-actions">
          <button
            type="button"
            className="btn btn-p"
            onClick={() => void readiness.prefetch()}
            disabled={readiness.prefetching || !slug}
          >
            <i className="ti ti-cloud-download" />
            {readiness.prefetching ? 'جارٍ التحميل...' : 'جهّز البيانات'}
          </button>
          <button type="button" className="btn btn-b" onClick={() => void readiness.refresh()} disabled={readiness.refreshing}>
            <i className="ti ti-refresh" />
            تحديث الحالة
          </button>
        </div>

        {readiness.lastResults && (
          <div className="offline-page-results">
            {readiness.lastResults.map(r => (
              <span key={r.id} className={`offline-page-result ${r.ok ? 'ok' : 'no'}`}>
                <i className={`ti ${r.ok ? 'ti-circle-check' : 'ti-alert-triangle'}`} />
                {r.ok ? 'تم التجهيز' : r.error}
              </span>
            ))}
          </div>
        )}

        <div className="offline-page-grid">
          {readiness.refreshing && readiness.datasets.length === 0 ? (
            [0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} width="100%" height={84} />)
          ) : (
            OFFLINE_DATASETS.map(ds => {
              const f: DatasetFreshness | undefined = readiness.datasets.find(x => x.id === ds.id);
              const r: PrefetchResult | undefined = resultsById.get(ds.id);
              return (
                <div key={ds.id} className={`offline-page-item ${f?.fresh ? 'ok' : 'no'}`}>
                  <div className="offline-page-item-hd">
                    <i className={`ti ${f?.fresh ? 'ti-circle-check' : 'ti-circle'}`} />
                    <span className="offline-page-item-name">{ds.label}</span>
                    <span className={`offline-page-item-state ${f?.fresh ? 'ok' : 'no'}`}>
                      {f?.fresh ? 'جاهز' : 'غير محفوظ'}
                    </span>
                  </div>
                  <div className="offline-page-item-desc">{ds.desc}</div>
                  <div className="offline-page-item-meta">
                    ينتهي الصلاحية: {formatTime(f?.expiresAt ?? null)}
                  </div>
                  {r && !r.ok && (
                    <div className="offline-page-item-err">{r.error}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
