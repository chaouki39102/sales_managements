import { useMemo, useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, REPORT_DEFAULTS } from './helpers';
import { useClientMonthlyReport } from '@/lib/api/endpoints/reports';
import type { ClientMonthlyParty } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import SimpleTable from '@/components/ui/SimpleTable';

type Measure = 'qty' | 'ht' | 'ttc';

const MEASURES: { key: Measure; label: string }[] = [
  { key: 'qty', label: 'الكمية' },
  { key: 'ht',  label: 'HT' },
  { key: 'ttc', label: 'TTC' },
];

const monthValue = (p: ClientMonthlyParty, month: string, measure: Measure): number => {
  const cell = p.months[month];
  if (!cell) return 0;
  switch (measure) {
    case 'qty': return cell.qty;
    case 'ht':  return cell.ht;
    case 'ttc': return cell.ttc;
  }
};

const partyTotal = (p: ClientMonthlyParty, measure: Measure): number => {
  switch (measure) {
    case 'qty': return p.total_qty;
    case 'ht':  return p.total_ht;
    case 'ttc': return p.total_ttc;
  }
};

export default function ClientMonthlyReportPage() {
  const [fromDate, setFromDate] = useState(REPORT_DEFAULTS.from);
  const [toDate,   setToDate]   = useState(REPORT_DEFAULTS.to);
  const [measure,  setMeasure]  = useState<Measure>('ttc');

  const params = useMemo(() => ({
    from_date: fromDate || undefined,
    to_date:   toDate   || undefined,
  }), [fromDate, toDate]);

  const { data, isLoading, isError, refetch } = useClientMonthlyReport(params);

  const months: string[] = (data?.months ?? []).map(m => m.month);
  const parties: ClientMonthlyParty[] = data?.parties ?? [];

  const monthLabel = (m: string) => data?.months.find(x => x.month === m)?.label ?? m;

  const formatMeasure = (v: number) => {
    if (measure === 'qty') return FMT(Math.round(v * 1000) / 1000);
    return `${FMT(Math.round(v * 100) / 100)} دج`;
  };

  const rows = useMemo(() => parties.map((p) => {
    const r: Record<string, unknown> = {
      id: p.id,
      name: p.name,
      code: p.code,
      __total: partyTotal(p, measure),
    };
    for (const m of months) r[`c_${m}`] = monthValue(p, m, measure);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [parties, months, measure]);

  const summaryRow = useMemo(() => {
    const r: Record<string, unknown> = {
      id: '__summary',
      name: `الإجمالي (${parties.length} زبون)`,
      __total: parties.reduce((s, p) => s + partyTotal(p, measure), 0),
    };
    for (const m of months) {
      r[`c_${m}`] = parties.reduce((s, p) => s + monthValue(p, m, measure), 0);
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties, months, measure]);

  const renderCell = (v: unknown, row: Record<string, unknown>) => {
    const num = Number(v ?? 0);
    if (row.id === '__summary') return <span style={{ fontWeight: 800 }}>{formatMeasure(num)}</span>;
    if (num === 0) return <span style={{ color: 'var(--t4)', fontSize: 12 }}>—</span>;
    return <span style={{ fontWeight: 600, color: num < 0 ? 'var(--red)' : 'var(--t1)', fontSize: 12 }}>{formatMeasure(num)}</span>;
  };

  const columns: { key: string; label: React.ReactNode; className?: string; render?: (v: unknown, row: any) => React.ReactNode }[] = [
    {
      key: 'name',
      label: 'الزبون',
      render: (v, row) => row.id === '__summary'
        ? <span style={{ fontWeight: 800 }}>{v as React.ReactNode}</span>
        : (
          <div>
            <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{v as React.ReactNode}</div>
            {row.code && <div style={{ fontSize: 11, color: 'var(--t4)' }}>{row.code}</div>}
          </div>
        ),
    },
    ...months.map(m => ({
      key: `c_${m}`,
      label: <div style={{ minWidth: 96, textAlign: 'center' }}><span style={{ fontWeight: 700, fontSize: 12 }}>{monthLabel(m)}</span></div>,
      className: 'num',
      render: (v: unknown, row: any) => renderCell(v, row),
    })),
    {
      key: '__total',
      label: <div style={{ minWidth: 90 }}><span style={{ fontWeight: 800 }}>الإجمالي</span></div>,
      className: 'num',
      render: (v: unknown, row: any) => row.id === '__summary'
        ? <span style={{ fontWeight: 800, color: 'var(--em)' }}>{formatMeasure(Number(v ?? 0))}</span>
        : <b style={{ color: 'var(--em)' }}>{formatMeasure(Number(v ?? 0))}</b>,
    },
  ];

  const handleExport = async () => {
    if (!data) return;
    const headers = ['الزبون', ...months.map(m => monthLabel(m)), 'الإجمالي'];
    const body = parties.map(p => [
      p.name,
      ...months.map(m => monthValue(p, m, measure)),
      partyTotal(p, measure),
    ]);
    body.push([
      'الإجمالي',
      ...months.map(m => parties.reduce((s, p) => s + monthValue(p, m, measure), 0)),
      parties.reduce((s, p) => s + partyTotal(p, measure), 0),
    ]);
    await exportToExcel([{
      name: 'رقم الأعمال الشهري حسب الزبون',
      headers,
      rows: body,
    }], `رقم-الأعمال-الشهري-حسب-الزبون ${fromDate}-${toDate}`);
  };

  const title = 'رقم الأعمال الشهري حسب الزبون';
  const subtitle = `الزبائن × الأشهر — ${fromDate} → ${toDate}`;

  return (
    <ReportShell title={title} subtitle={subtitle} onExport={handleExport} isLoading={isLoading} isError={isError} refetch={refetch} reportId="client-monthly">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12, marginTop: 8 }}>
        {MEASURES.map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMeasure(m.key)}
            style={{
              padding: '4px 10px', borderRadius: 18, border: '1px solid var(--b2)',
              background: measure === m.key ? 'var(--em)' : 'var(--bg2)',
              color: measure === m.key ? '#fff' : 'var(--t2)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
              transition: 'all .12s',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {data && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <KpiCard variant="blue"   icon="ti-users"       label="الزبائن النشطون"  value={data.summary.party_count} />
            <KpiCard variant="teal"   icon="ti-calendar-month" label="الأشهر"         value={data.summary.month_count} />
            <KpiCard variant="green"  icon="ti-stack-2"     label="الكمية الإجمالية"  value={FMT(data.summary.total_qty)} />
            <KpiCard variant="purple" icon="ti-trending-up" label="الإجمالي HT"       value={`${FMT(data.summary.total_ht)} دج`} />
            <KpiCard variant="orange" icon="ti-coins"       label="الإجمالي TTC"      value={`${FMT(data.summary.total_ttc)} دج`} />
          </div>

          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <SimpleTable
                columns={columns as never[]}
                data={[...rows, summaryRow]}
                rowKey="id"
                emptyText="لا توجد مبيعات لهذه الفترة"
              />
            </div>
          </Card>
          <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 8 }}>
            الإرجاعات (AV) تظهر بالأحمر وتبقى بإشارة سالبة. الأعمدة تشمل كل أشهر الفترة حتى لو لم يحدث فيها بيع.
          </div>
        </>
      )}
    </ReportShell>
  );
}
