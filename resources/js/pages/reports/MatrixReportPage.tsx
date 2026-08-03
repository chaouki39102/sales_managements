import { useMemo, useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, REPORT_DEFAULTS } from './helpers';
import { useMatrixReport, useMatrixDetail } from '@/lib/api/endpoints/reports';
import type { MatrixCell, MatrixParty, MatrixProduct } from '@/lib/api/endpoints/reports';
import { useFamilies, useBrands } from '@/lib/api/endpoints/lookups';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';
import Modal from '@/components/ui/Modal';
import AlertBar from '@/components/ui/AlertBar';

type Measure = 'qty' | 'ht' | 'ttc' | 'cost' | 'margin';

const MEASURES_SALE: { key: Measure; label: string }[] = [
  { key: 'qty',   label: 'الكمية' },
  { key: 'ht',    label: 'HT' },
  { key: 'ttc',   label: 'TTC' },
  { key: 'cost',  label: 'التكلفة' },
  { key: 'margin', label: 'الهامش' },
];

const MEASURES_PURCHASE: { key: Measure; label: string }[] = [
  { key: 'qty', label: 'الكمية' },
  { key: 'ht',  label: 'HT' },
  { key: 'ttc', label: 'TTC' },
];

const TOP_N_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'كل المنتجات' },
  { value: 5,    label: 'أفضل 5' },
  { value: 10,   label: 'أفضل 10' },
  { value: 15,   label: 'أفضل 15' },
  { value: 20,   label: 'أفضل 20' },
];

const cellValue = (cell: MatrixCell | undefined, measure: Measure): number => {
  if (!cell) return 0;
  switch (measure) {
    case 'qty':    return cell.qty;
    case 'ht':     return cell.ht;
    case 'ttc':    return cell.ttc;
    case 'cost':   return cell.cost;
    case 'margin': return cell.ht - cell.cost;
  }
};

const partyTotal = (p: MatrixParty, measure: Measure): number => {
  switch (measure) {
    case 'qty':    return p.total_qty;
    case 'ht':     return p.total_ht;
    case 'ttc':    return p.total_ttc;
    case 'cost':   return p.total_cost;
    case 'margin': return p.total_margin;
  }
};

interface DetailState {
  partyId:    number;
  partyName:  string;
  productId:  number;
  productName: string;
}

export default function MatrixReportPage({ mode }: { mode: 'sale' | 'purchase' }) {
  const isSale = mode === 'sale';
  const [fromDate, setFromDate] = useState(REPORT_DEFAULTS.from);
  const [toDate,   setToDate]   = useState(REPORT_DEFAULTS.to);
  const [familyId, setFamilyId] = useState<number | undefined>(undefined);
  const [brandId,  setBrandId]  = useState<number | undefined>(undefined);
  const [measure,  setMeasure]  = useState<Measure>('ht');
  const [topN,     setTopN]     = useState<number | null>(10);

  const params = useMemo(() => ({
    from_date:  fromDate || undefined,
    to_date:    toDate   || undefined,
    family_id:  familyId,
    brand_id:   brandId,
  }), [fromDate, toDate, familyId, brandId]);

  const { data, isLoading, isError, refetch } = useMatrixReport(mode, params);
  const { data: families } = useFamilies();
  const { data: brands }   = useBrands();

  const [detail, setDetail] = useState<DetailState | null>(null);
  const detailQ = useMatrixDetail(detail ? {
    mode,
    party_id:   detail.partyId,
    product_id: detail.productId,
    from_date:  fromDate || undefined,
    to_date:    toDate   || undefined,
  } : null);

  const products: MatrixProduct[] = data?.products ?? [];
  const parties:  MatrixParty[]   = data?.parties   ?? [];

  const visibleProducts = useMemo(
    () => (topN ? products.slice(0, topN) : products),
    [products, topN],
  );
  const folded = useMemo(
    () => (topN && products.length > topN ? products.slice(topN) : []),
    [products, topN],
  );
  const hasOthers = folded.length > 0;

  const colSum = (prodId: number) =>
    parties.reduce((s, p) => s + cellValue(p.cells[prodId], measure), 0);

  const othersSum = folded.reduce((s, prod) => s + colSum(prod.id), 0);
  const totalSum  = parties.reduce((s, p) => s + partyTotal(p, measure), 0);

  const formatMeasure = (v: number) => {
    if (measure === 'qty') return FMT(Math.round(v * 1000) / 1000);
    return `${FMT(Math.round(v * 100) / 100)} دج`;
  };

  const cellStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 6,
    padding: '2px 6px',
    color: 'var(--em)',
    fontWeight: 700,
    fontSize: 12,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };

  const rows = useMemo(() => parties.map((p) => {
    const r: Record<string, unknown> = {
      id: p.id,
      name: p.name,
      code: p.code,
      __total: partyTotal(p, measure),
    };
    for (const prod of visibleProducts) r[`c_${prod.id}`] = cellValue(p.cells[prod.id], measure);
    r.__others = hasOthers ? folded.reduce((s, prod) => s + cellValue(p.cells[prod.id], measure), 0) : null;
    return r;
  }), [parties, visibleProducts, folded, hasOthers, measure]);

  const summaryRow = useMemo(() => {
    const r: Record<string, unknown> = {
      id: '__summary',
      name: `الإجمالي (${parties.length} ${isSale ? 'زبون' : 'مورد'})`,
      __total: totalSum,
    };
    for (const prod of visibleProducts) r[`c_${prod.id}`] = colSum(prod.id);
    r.__others = hasOthers ? othersSum : null;
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties, visibleProducts, hasOthers, othersSum, totalSum, isSale]);

  const renderCell = (v: unknown, row: Record<string, unknown>, prodId?: number) => {
    const num = Number(v ?? 0);
    const isSum = row.id === '__summary';
    if (isSum) return <span style={{ fontWeight: 800 }}>{formatMeasure(num)}</span>;
    if (num === 0) return <span style={{ color: 'var(--t4)', fontSize: 12 }}>—</span>;
    return (
      <button
        type="button"
        className="matrix-cell"
        style={cellStyle}
        title={`عرض تفاصيل ${String(row.name)} × ${String(prodId ?? '')}`}
        onClick={() => {
          if (prodId == null) return;
          const prod = products.find(p => p.id === prodId);
          setDetail({
            partyId:   Number(row.id),
            partyName: String(row.name),
            productId: prodId,
            productName: prod?.name ?? String(prodId),
          });
        }}
      >
        {formatMeasure(num)}
      </button>
    );
  };

  const columns: { key: string; label: React.ReactNode; className?: string; render?: (v: unknown, row: any) => React.ReactNode }[] = [
    {
      key: 'name',
      label: isSale ? 'الزبون' : 'المورد',
      render: (v, row) => row.id === '__summary'
        ? <span style={{ fontWeight: 800 }}>{v as React.ReactNode}</span>
        : (
          <div>
            <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{v as React.ReactNode}</div>
            {row.code && <div style={{ fontSize: 11, color: 'var(--t4)' }}>{row.code}</div>}
          </div>
        ),
    },
    ...visibleProducts.map(prod => ({
      key: `c_${prod.id}`,
      label: (
        <div style={{ minWidth: 110, maxWidth: 160 }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{prod.name}</div>
          <div style={{ fontSize: 10, color: 'var(--t4)' }}>{prod.ref ?? ''}</div>
        </div>
      ),
      className: 'num',
      render: (v: unknown, row: any) => renderCell(v, row, prod.id),
    })),
    ...(hasOthers ? [{
      key: '__others',
      label: <div style={{ minWidth: 90 }}><span style={{ fontWeight: 700 }}>أخرى</span></div>,
      className: 'num',
      render: (v: unknown, row: any) => renderCell(v, row),
    }] : []),
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
    const headers = [
      isSale ? 'الزبون' : 'المورد',
      ...visibleProducts.map(p => (p.ref ? `${p.name} (${p.ref})` : p.name)),
      ...(hasOthers ? ['أخرى'] : []),
      'الإجمالي',
    ];
    const body = parties.map(p => [
      p.name,
      ...visibleProducts.map(prod => cellValue(p.cells[prod.id], measure)),
      ...(hasOthers ? [folded.reduce((s, prod) => s + cellValue(p.cells[prod.id], measure), 0)] : []),
      partyTotal(p, measure),
    ]);
    body.push([
      'الإجمالي',
      ...visibleProducts.map(prod => colSum(prod.id)),
      ...(hasOthers ? [othersSum] : []),
      totalSum,
    ]);
    await exportToExcel([{
      name: isSale ? 'الزبائن × المنتجات' : 'الموردين × المنتجات',
      headers,
      rows: body,
    }], `${isSale ? 'مبيعات-حسب-الزبون-والمنتج' : 'مشتريات-حسب-المورد-والمنتج'} ${fromDate}-${toDate}`);
  };

  const detailRows = useMemo(() => {
    const list = (detailQ.data ?? []) as unknown as Array<Record<string, unknown>>;
    const sum = (k: string) => list.reduce((s, r) => s + Number(r[k] ?? 0), 0);
    return [
      ...list.map((r, i) => ({ ...r, _idx: i + 1 })),
      {
        id: '__summary', _idx: null,
        document_number: 'الإجمالي', document_date: '', type_name: '',
        quantity: sum('quantity'), unit_price_ht: null,
        total_ht: sum('total_ht'), total_ttc: sum('total_ttc'),
        cost_ht: sum('cost_ht'), margin_value: sum('margin_value'),
      },
    ];
  }, [detailQ.data]);

  const detailCols: { key: string; label: string; className?: string; render?: (v: unknown, row: any) => React.ReactNode }[] = [
    { key: '_idx', label: '#', render: (v) => v == null ? null : <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as React.ReactNode}</span> },
    { key: 'document_number', label: 'رقم الوثيقة', render: (v, row) => row.id === '__summary' ? <b>{v as React.ReactNode}</b> : <span style={{ fontWeight: 700 }}>{v as React.ReactNode}</span> },
    { key: 'document_date', label: 'التاريخ', render: (v, row) => row.id === '__summary' ? null : <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as React.ReactNode}</span> },
    { key: 'type_name', label: 'النوع' },
    { key: 'quantity', label: 'الكمية', className: 'num', render: (v, row) => row.id === '__summary' ? <b>{FMT(Number(v ?? 0))}</b> : <span style={{ color: (v as number) < 0 ? 'var(--red)' : undefined }}>{FMT(Number(v ?? 0))}</span> },
    { key: 'unit_price_ht', label: 'سعر الوحدة HT', className: 'num', render: (v, row) => row.id === '__summary' ? null : `${FMT(Number(v ?? 0))} دج` },
    { key: 'total_ht', label: 'المجموع HT', className: 'num', render: (v, row) => row.id === '__summary' ? <b>{`${FMT(Number(v ?? 0))} دج`}</b> : `${FMT(Number(v ?? 0))} دج` },
    { key: 'total_ttc', label: 'المجموع TTC', className: 'num', render: (v, row) => row.id === '__summary' ? <b>{`${FMT(Number(v ?? 0))} دج`}</b> : `${FMT(Number(v ?? 0))} دج` },
    ...(isSale ? [
      { key: 'cost_ht', label: 'التكلفة', className: 'num', render: (v: unknown, row: any) => row.id === '__summary' ? <b>{`${FMT(Number(v ?? 0))} دج`}</b> : `${FMT(Number(v ?? 0))} دج` },
      { key: 'margin_value', label: 'الهامش', className: 'num', render: (v: unknown, row: any) => row.id === '__summary' ? <b style={{ color: 'var(--em)' }}>{`${FMT(Number(v ?? 0))} دج`}</b> : <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{`${FMT(Number(v ?? 0))} دج`}</span> },
    ] as { key: string; label: string; className?: string; render?: (v: unknown, row: any) => React.ReactNode }[] : []),
  ];

  const title = isSale ? 'المبيعات حسب الزبون والمنتج' : 'المشتريات حسب المورد والمنتج';
  const subtitle = `${isSale ? 'الزبائن' : 'الموردون'} × المنتجات — ${fromDate} → ${toDate}`;

  return (
    <ReportShell title={title} subtitle={subtitle} isLoading={isLoading} isError={isError} refetch={refetch} reportId={isSale ? 'sales-matrix' : 'purchases-matrix'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
        <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet" />} onClick={handleExport}>تصدير Excel</Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>العائلة:</span>
          <select className="form-control" style={{ width: 170 }} value={familyId ?? ''} onChange={e => setFamilyId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">كل العائلات</option>
            {(families ?? []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>العلامة:</span>
          <select className="form-control" style={{ width: 170 }} value={brandId ?? ''} onChange={e => setBrandId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">كل العلامات</option>
            {(brands ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {(isSale ? MEASURES_SALE : MEASURES_PURCHASE).map(m => (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>الأعمدة:</span>
          <select className="form-control" style={{ width: 130 }} value={topN === null ? '' : topN} onChange={e => setTopN(e.target.value === '' ? null : Number(e.target.value))}>
            {TOP_N_OPTIONS.map(o => <option key={String(o.value)} value={o.value === null ? '' : o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {data && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <KpiCard variant="blue"   icon="ti-users"       label={isSale ? 'الزبائن' : 'الموردون'} value={data.summary.party_count} />
            <KpiCard variant="teal"   icon="ti-package"     label="المنتجات"                       value={data.summary.product_count} />
            <KpiCard variant="green"  icon="ti-stack-2"     label="الكمية الإجمالية"               value={FMT(data.summary.total_qty)} />
            <KpiCard variant="purple" icon="ti-trending-up" label="الإجمالي HT"                    value={`${FMT(data.summary.total_ht)} دج`} />
            <KpiCard variant="orange" icon="ti-coins"       label="الإجمالي TTC"                   value={`${FMT(data.summary.total_ttc)} دج`} />
            {isSale && (
              <KpiCard variant="gold" icon="ti-percentage" label="هامش الربح" value={`${FMT(data.summary.total_margin)} دج`} />
            )}
          </div>

          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <SimpleTable
                columns={columns as never[]}
                data={[...rows, summaryRow]}
                rowKey="id"
                emptyText={isSale ? 'لا توجد مبيعات لهذه الفترة' : 'لا توجد مشتريات لهذه الفترة'}
              />
            </div>
          </Card>
          <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 8 }}>
            اضغط على أي خلية لعرض وثائق (الطرف × المنتج) للفترة المحددة.
          </div>
        </>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`تفاصيل ${detail?.productName ?? ''}`}
        subtitle={`${detail?.partyName ?? ''} — ${fromDate} → ${toDate}`}
        size="xl"
      >
        {detailQ.isLoading ? (
          <div className="empty" style={{ padding: 30 }}>
            <div className="empty-ic"><i className="ti ti-loader" /></div>
            <div className="empty-tx">جاري تحميل التفاصيل...</div>
          </div>
        ) : detailQ.isError ? (
          <AlertBar variant="red">فشل تحميل التفاصيل</AlertBar>
        ) : (
          <SimpleTable columns={detailCols as never[]} data={detailRows} rowKey="id" emptyText="لا توجد وثائق لهذا الزوج" />
        )}
      </Modal>
    </ReportShell>
  );
}
