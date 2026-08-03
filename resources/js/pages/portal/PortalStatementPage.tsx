// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalStatementPage.tsx — كشف حساب الزبون (رصيد متدرج)
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';
import { fmtMoney, fmtMoneySigned, fmtDate, PortalLoading, PortalError, PortalEmpty } from './portalUtils';

export default function PortalStatementPage() {
  const { slug } = useParams<{ slug: string }>();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState<{ from?: string; to?: string }>({});

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal', slug, 'statement', applied.from ?? 'all', applied.to ?? 'all'],
    queryFn: () => portalApi.statement(applied.from, applied.to),
    staleTime: 30_000,
  });

  if (isLoading) return <PortalLoading />;
  if (isError || !data) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل كشف الحساب'} />;

  const { opening, closing, total_debit, total_credit, from: stFrom, to: stTo, rows } = data;

  return (
    <>
      <div className="portal-card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); setApplied({ from: from || undefined, to: to || undefined }); }}
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10 }}
        >
          <div className="fg" style={{ flex: '1 1 160px' }}>
            <label>من تاريخ</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="fg" style={{ flex: '1 1 160px' }}>
            <label>إلى تاريخ</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="submit" className="portal-btn portal-btn--em">
            <i className="ti ti-filter" /> تطبيق
          </button>
          {(applied.from || applied.to) && (
            <button
              type="button"
              className="portal-btn"
              onClick={() => { setFrom(''); setTo(''); setApplied({}); }}
            >
              <i className="ti ti-refresh" /> إلغاء الفلترة
            </button>
          )}
        </form>
      </div>

      <div className="portal-stmt-sum">
        <div className="portal-stmt-item">
          <div className="k">الرصيد الافتتاحي</div>
          <div className="v">{fmtMoneySigned(opening)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">إجمالي المدين</div>
          <div className="v" style={{ color: 'var(--red)' }}>{fmtMoney(total_debit)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">إجمالي الدائن</div>
          <div className="v" style={{ color: 'var(--em)' }}>{fmtMoney(total_credit)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">الرصيد الختامي</div>
          <div className="v" style={{ color: closing < 0 ? 'var(--red)' : 'var(--t1)' }}>{fmtMoneySigned(closing)}</div>
        </div>
      </div>

      <section className="portal-card">
        <div className="portal-card-hd">
          <h3><i className="ti ti-report-money" /> حركة الحساب</h3>
          <span style={{ fontSize: 11.5, color: 'var(--t4)' }}>
            {stFrom || 'البداية'} ← {stTo || 'اليوم'}
          </span>
        </div>
        {rows.length === 0 ? (
          <PortalEmpty icon="ti-report-money" text="لا توجد حركات في هذه الفترة" />
        ) : (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>التاريخ</th><th>المرجع</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.date}-${r.reference}-${i}`} className={r.balance < 0 ? 'portal-row-debit' : 'portal-row-credit'}>
                    <td>{fmtDate(r.date)}</td>
                    <td className="num">{r.reference}</td>
                    <td>{r.label}</td>
                    <td className="num">{r.debit > 0 ? fmtMoney(r.debit) : '—'}</td>
                    <td className="num">{r.credit > 0 ? fmtMoney(r.credit) : '—'}</td>
                    <td className="num">{fmtMoneySigned(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
