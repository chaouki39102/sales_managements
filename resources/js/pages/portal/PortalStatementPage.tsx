// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalStatementPage.tsx — كشف حساب الزبون (مُحسّن)
// ════════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';
import { fmtMoney, fmtMoneySigned, fmtDate, Sparkline, PortalLoading, PortalError, PortalEmpty } from './portalUtils';

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

  const sparkValues = useMemo(() => {
    const rows = data?.rows ?? [];
    if (rows.length === 0) return [];
    return rows.slice(-12).map(r => r.balance);
  }, [data]);

  if (isLoading) return <PortalLoading />;
  if (isError || !data) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل كشف الحساب'} />;

  const { opening, closing, total_debit, total_credit, from: stFrom, to: stTo, rows } = data;

  return (
    <>
      {/* ─── فلتر التاريخ ─── */}
      <div className="portal-card portal-stmt-filter">
        <form
          onSubmit={(e) => { e.preventDefault(); setApplied({ from: from || undefined, to: to || undefined }); }}
          className="portal-stmt-filter-form"
        >
          <div className="fg portal-flex160">
            <label className="portal-form-label">من تاريخ</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="portal-form-input" />
          </div>
          <div className="fg portal-flex160">
            <label className="portal-form-label">إلى تاريخ</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="portal-form-input" />
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

      {/* ─── ملخص الرصيد ─── */}
      <div className="portal-stmt-sum">
        <div className="portal-stmt-item">
          <div className="k">الرصيد الافتتاحي</div>
          <div className="v">{fmtMoneySigned(opening)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">إجمالي المدين</div>
          <div className="v portal-red">{fmtMoney(total_debit)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">إجمالي الدائن</div>
          <div className="v portal-green">{fmtMoney(total_credit)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">الرصيد الختامي</div>
          <div className={`v ${closing < 0 ? 'portal-red' : 'portal-green'}`}>{fmtMoneySigned(closing)}</div>
        </div>
      </div>

      {/* ─── رسم بياني مصغّر ─── */}
      {sparkValues.length > 1 && (
        <div className="portal-card portal-mb-16">
          <div className="portal-card-bd">
            <div className="portal-inline--8 portal-mb-10">
              <i className="ti ti-chart-line portal-em-icon" />
              <span className="portal-sec-title">تطور الرصيد</span>
            </div>
            <Sparkline
              values={sparkValues.map(v => Math.abs(v))}
              color={closing < 0 ? 'var(--red)' : 'var(--em)'}
            />
          </div>
        </div>
      )}

      {/* ─── جدول الحركة ─── */}
      <section className="portal-card">
        <div className="portal-card-hd">
          <h3><i className="ti ti-report-money" /> حركة الحساب</h3>
          <span className="portal-muted portal-t-sm">
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
                    <td className="portal-t-sm">{fmtDate(r.date)}</td>
                    <td className="num">{r.reference}</td>
                    <td>{r.label}</td>
                    <td className="num">{r.debit > 0 ? fmtMoney(r.debit) : '—'}</td>
                    <td className="num">{r.credit > 0 ? fmtMoney(r.credit) : '—'}</td>
                    <td className="num portal-tbl-bold">{fmtMoneySigned(r.balance)}</td>
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
