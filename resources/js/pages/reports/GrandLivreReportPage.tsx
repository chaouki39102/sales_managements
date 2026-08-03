import { useMemo, useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useGrandLivreReport } from '@/lib/api/endpoints/reports';
import type { GrandLivreParty } from '@/lib/api/endpoints/reports';
import { useClients, useSuppliers } from '@/lib/api/endpoints/parties';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import SimpleTable from '@/components/ui/SimpleTable';

const PARTY_TYPES: { value: number | null; label: string }[] = [
  { value: null, label: 'كل الأطراف' },
  { value: 1,    label: 'الزبائن' },
  { value: 2,    label: 'الموردين' },
];

interface FlatRow {
  _k:       string;
  _isOpen?:  boolean;
  _isClose?: boolean;
  party?:    string;
  partyCode?: string;
  seq?:      number;
  date?:     string;
  reference?: string;
  label?:    string;
  debit?:    number;
  credit?:   number;
  balance?:  number;
  opening?:  number;
  closing?:  number;
  pDebit?:   number;
  pCredit?:  number;
}

export default function GrandLivreReportPage() {
  const [fromDate,  setFromDate]  = useState(REPORT_DEFAULTS.from);
  const [toDate,    setToDate]    = useState(REPORT_DEFAULTS.to);
  const [partyType, setPartyType] = useState<number | null>(null);
  const [partyId,   setPartyId]   = useState<number | undefined>(undefined);

  const { data: clients }   = useClients({ per_page: 1000 });
  const { data: suppliers } = useSuppliers({ per_page: 1000 });

  const partyOptions = partyType === 1 ? (clients?.data ?? []) : partyType === 2 ? (suppliers?.data ?? []) : [];

  const params = useMemo(() => ({
    from_date:     fromDate || undefined,
    to_date:       toDate   || undefined,
    party_type_id: partyType ?? undefined,
    party_id:      partyId,
  }), [fromDate, toDate, partyType, partyId]);

  const { data, isLoading, isError, refetch } = useGrandLivreReport(params);

  const parties: GrandLivreParty[] = data?.parties ?? [];

  const rows = useMemo(() => {
    const out: FlatRow[] = [];
    for (const p of parties) {
      out.push({
        _k: `o-${p.id}`, _isOpen: true,
        party: p.name, partyCode: p.code ?? undefined,
        label: 'الرصيد الافتتاحي', balance: p.opening_balance,
      });
      for (const tx of p.transactions) {
        out.push({
          _k: `t-${p.id}-${tx.seq}`,
          seq: tx.seq, date: tx.date, reference: tx.reference, label: tx.label,
          debit: tx.debit, credit: tx.credit, balance: tx.balance,
        });
      }
      out.push({
        _k: `c-${p.id}`, _isClose: true,
        party: p.name, partyCode: p.code ?? undefined,
        label: 'الرصيد الختامي', debit: p.total_debit, credit: p.total_credit, balance: p.closing_balance,
      });
    }
    return out;
  }, [parties]);

  const columns: { key: string; label: React.ReactNode; className?: string; render?: (v: unknown, row: any) => React.ReactNode }[] = [
    { key: 'seq', label: '#', render: (v, row) => row._isOpen || row._isClose ? null : <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as React.ReactNode}</span> },
    { key: 'date', label: 'التاريخ', render: (v, row) => row._isOpen || row._isClose ? null : <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as React.ReactNode}</span> },
    {
      key: 'party',
      label: 'الطرف',
      render: (v, row) => row._isOpen || row._isClose
        ? (
          <div>
            <span style={{ fontWeight: 800 }}>{v as React.ReactNode}</span>
            {row.partyCode && <span style={{ fontSize: 11, color: 'var(--t4)', marginInlineStart: 6 }}>{row.partyCode}</span>}
          </div>
        )
        : null,
    },
    { key: 'reference', label: 'المرجع', render: (v, row) => row._isOpen || row._isClose ? null : <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{v as React.ReactNode}</span> },
    { key: 'label', label: 'البيان', render: (v, row) => row._isOpen || row._isClose ? <span style={{ fontWeight: 700 }}>{v as React.ReactNode}</span> : (v as React.ReactNode) },
    { key: 'debit', label: 'مدين', className: 'num', render: (v, row) => row._isClose ? <b>{FMT(Number(v ?? 0))}</b> : (Number(v ?? 0) > 0 ? FMT(Number(v ?? 0)) : '—') },
    { key: 'credit', label: 'دائن', className: 'num', render: (v, row) => row._isClose ? <b>{FMT(Number(v ?? 0))}</b> : (Number(v ?? 0) > 0 ? FMT(Number(v ?? 0)) : '—') },
    {
      key: 'balance',
      label: 'الرصيد',
      className: 'num',
      render: (v, row) => {
        const n = Number(v ?? 0);
        const weight = row._isOpen || row._isClose ? 800 : 700;
        const color = row._isOpen || row._isClose ? 'var(--em)' : (n < 0 ? 'var(--red)' : 'var(--t1)');
        return <span style={{ fontWeight: weight, color }}>{FMT(n)}</span>;
      },
    },
  ];

  const handleExport = async () => {
    if (!data) return;
    const body: (string | number)[][] = [];
    for (const p of parties) {
      body.push([p.name, p.code ?? '', '', '', 'الرصيد الافتتاحي', '', '', p.opening_balance]);
      for (const tx of p.transactions) {
        body.push([p.name, p.code ?? '', tx.date, tx.reference, tx.label, tx.debit, tx.credit, tx.balance]);
      }
      body.push([p.name, p.code ?? '', '', '', 'الرصيد الختامي', p.total_debit, p.total_credit, p.closing_balance]);
    }
    await exportToExcel([{
      name: 'دفتر الأستاذ العام',
      headers: ['الطرف', 'الكود', 'التاريخ', 'المرجع', 'البيان', 'مدين', 'دائن', 'الرصيد'],
      rows: body,
    }], `دفتر-الأستاذ-العام ${fromDate}-${toDate}`);
  };

  const title = 'دفتر الأستاذ العام (Grand Livre)';
  const subtitle = `سجل زمني لجميع الحركات — ${fromDate} → ${toDate}`;

  return (
    <ReportShell title={title} subtitle={subtitle} onExport={handleExport} isLoading={isLoading} isError={isError} refetch={refetch} reportId="grand-livre">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>النوع:</span>
          <select className="form-control" style={{ width: 130 }} value={partyType ?? ''} onChange={e => { setPartyType(e.target.value === '' ? null : Number(e.target.value)); setPartyId(undefined); }}>
            {PARTY_TYPES.map(t => <option key={String(t.value)} value={t.value === null ? '' : t.value}>{t.label}</option>)}
          </select>
        </div>
        {partyType !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>الطرف:</span>
            <select className="form-control" style={{ width: 200 }} value={partyId ?? ''} onChange={e => setPartyId(e.target.value === '' ? undefined : Number(e.target.value))}>
              <option value="">كل الأطراف</option>
              {partyOptions.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {data && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <KpiCard variant="blue"   icon="ti-users"  label="عدد الحسابات"    value={data.summary.party_count} />
            <KpiCard variant="teal"   icon="ti-receipt" label="عدد الحركات"     value={data.summary.transaction_count} />
            <KpiCard variant="green"  icon="ti-arrow-left"  label="إجمالي المدين"  value={MONEY(data.summary.total_debit)} />
            <KpiCard variant="orange" icon="ti-arrow-right" label="إجمالي الدائن"  value={MONEY(data.summary.total_credit)} />
            <KpiCard variant="red"    icon="ti-scale"       label="الصافي"        value={MONEY(data.summary.net)} />
          </div>

          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <SimpleTable
                columns={columns as never[]}
                data={rows}
                rowKey="_k"
                rowClassName={(row) => ((row as any)._isOpen || (row as any)._isClose) ? 'tw-sr' : ''}
                emptyText="لا توجد حركات لهذه الفترة"
              />
            </div>
          </Card>
          <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 8 }}>
            مدين = ما هو مستحق لنا (فاتورة بيع / دفعة مدفوعة) · دائن = ما هو مستحق منا (فاتورة شراء / دفعة مستلمة) · الرصيد الجاري يُحسب لكل طرف.
          </div>
        </>
      )}
    </ReportShell>
  );
}
