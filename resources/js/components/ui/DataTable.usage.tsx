// ════════════════════════════════════════════════════════════════════════════
// DataTable.usage.tsx — أمثلة استخدام شاملة لكل ميزات v3
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { DataTable }                    from './DataTable';
import type { Column, CellEditPayload } from './DataTable';

// ─── نوع بيانات المثال ───────────────────────────────────────────────────────

interface Invoice {
  id:           number;
  number:       string;
  party:        string;
  date:         string;
  status:       'draft' | 'validated' | 'paid' | 'cancelled';
  total_ht:     number;
  total_tva:    number;
  total_ttc:    number;
  net_to_pay:   number;
  remaining:    number;
  warehouse:    string;
  notes:        string;
  lines?: {
    id: number; product: string; qty: number; price: number; total: number;
  }[];
}

// ─── تعريف الأعمدة ───────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: 'draft',     label: 'مسودة'   },
  { value: 'validated', label: 'معتمد'   },
  { value: 'paid',      label: 'مدفوع'   },
  { value: 'cancelled', label: 'ملغي'    },
] as const;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  draft:     { color: '#6b7280', bg: '#f3f4f6' },
  validated: { color: '#2563eb', bg: '#eff6ff' },
  paid:      { color: '#059669', bg: '#ecfdf5' },
  cancelled: { color: '#dc2626', bg: '#fef2f2' },
};

function fmtNum(n: number) {
  return n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const COLUMNS: Column<Invoice>[] = [
  // ── رقم المستند — sticky + editable
  {
    key:      'number',
    header:   'الرقم',
    sticky:   'start',
    width:    130,
    sortable: true,
    filter:   { type: 'text' },
    // ✅ Inline editing
    editable: { type: 'text' },
    render:   (row) => (
      <span style={{ fontWeight: 800, color: 'var(--em)', fontSize: 12 }}>
        {row.number}
      </span>
    ),
  },

  // ── التاريخ
  {
    key:      'date',
    header:   'التاريخ',
    width:    110,
    sortable: true,
    filter:   { type: 'date' },
    render:   (row) => (
      <span style={{ fontSize: 12, color: 'var(--t3)' }}>
        {new Date(row.date).toLocaleDateString('ar-DZ')}
      </span>
    ),
  },

  // ── الطرف
  {
    key:      'party',
    header:   'الزبون',
    sortable: true,
    filter:   { type: 'text' },
    editable: { type: 'text' },
  },

  // ── الحالة — editable select
  {
    key:      'status',
    header:   'الحالة',
    width:    120,
    sortable: true,
    filter:   { type: 'select', options: STATUS_OPTS },
    // ✅ Editable select
    editable: { type: 'select', options: STATUS_OPTS },
    render:   (row) => {
      const cfg = STATUS_COLORS[row.status] ?? STATUS_COLORS.draft;
      return (
        <span style={{
          padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          color: cfg.color, background: cfg.bg,
          border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`,
        }}>
          {STATUS_OPTS.find(o => o.value === row.status)?.label ?? row.status}
        </span>
      );
    },
  },

  // ── المستودع — hidden بالافتراضي
  {
    key:           'warehouse',
    header:        'المستودع',
    defaultHidden: true,
    sortable:      false,
    filter:        { type: 'text' },
  },

  // ── HT — aggregate: sum
  {
    key:       'total_ht',
    header:    'إجمالي HT',
    width:     130,
    align:     'end',
    sortable:  true,
    filter:    { type: 'number' },
    hideOnMobile: true,
    // ✅ Aggregation
    aggregate: 'sum',
    aggregateFormat: (v) => `${fmtNum(v)} دج`,
    render:    (row) => (
      <span style={{ direction: 'ltr', display: 'inline-block', fontSize: 12 }}>
        {fmtNum(row.total_ht)}
        <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 3 }}>دج</span>
      </span>
    ),
  },

  // ── TVA — aggregate: sum + hidden افتراضي
  {
    key:           'total_tva',
    header:        'TVA',
    width:         110,
    align:         'end',
    defaultHidden: true,
    aggregate:     'sum',
    aggregateFormat: (v) => `${fmtNum(v)} دج`,
    render:        (row) => (
      <span style={{ direction: 'ltr', display: 'inline-block', fontSize: 12, color: 'var(--t3)' }}>
        {fmtNum(row.total_tva)}
      </span>
    ),
  },

  // ── TTC — aggregate: sum
  {
    key:       'total_ttc',
    header:    'الإجمالي TTC',
    width:     140,
    align:     'end',
    sortable:  true,
    aggregate: 'sum',
    aggregateFormat: (v) => `${fmtNum(v)} دج`,
    render:    (row) => (
      <strong style={{ direction: 'ltr', display: 'inline-block', color: 'var(--t1)' }}>
        {fmtNum(row.total_ttc)}
        <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 3 }}>دج</span>
      </strong>
    ),
  },

  // ── المتبقي — aggregate: sum + تلوين شرطي
  {
    key:       'remaining',
    header:    'المتبقي',
    width:     130,
    align:     'end',
    sortable:  true,
    aggregate: 'sum',
    aggregateFormat: (v) => v > 0 ? `${fmtNum(v)} دج` : '—',
    render:    (row) => row.remaining > 0 ? (
      <span style={{ color: 'var(--red)', fontWeight: 700, direction: 'ltr', display: 'inline-block' }}>
        {fmtNum(row.remaining)}
        <span style={{ fontSize: 10, marginRight: 3 }}>دج</span>
      </span>
    ) : (
      <span style={{ color: 'var(--em)', fontSize: 12 }}>✓ مسدد</span>
    ),
  },

  // ── الملاحظات — editable text + لا يُضمَّن في global search
  {
    key:        'notes',
    header:     'ملاحظات',
    sortable:   false,
    searchable: false,
    editable:   { type: 'text' },
    render:     (row) => row.notes ? (
      <span style={{ fontSize: 12, color: 'var(--t3)', fontStyle: 'italic' }}>
        {row.notes.length > 30 ? row.notes.slice(0, 30) + '…' : row.notes}
      </span>
    ) : null,
  },
];

// ─── Expanded Content ────────────────────────────────────────────────────────

function InvoiceLines({ row }: { row: Invoice }) {
  if (!row.lines?.length) {
    return (
      <div style={{ color: 'var(--t4)', fontSize: 12, padding: '8px 0' }}>
        لا توجد أسطر محملة
      </div>
    );
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: 'var(--bg3)' }}>
          {['المنتج', 'الكمية', 'السعر', 'الإجمالي'].map(h => (
            <th key={h} style={{
              padding: '6px 12px', textAlign: 'right', fontWeight: 700,
              color: 'var(--t4)', fontSize: 11,
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {row.lines.map(line => (
          <tr key={line.id} style={{ borderBottom: '1px solid var(--b1)' }}>
            <td style={{ padding: '6px 12px', fontWeight: 600 }}>{line.product}</td>
            <td style={{ padding: '6px 12px', color: 'var(--t3)' }}>{line.qty}</td>
            <td style={{ padding: '6px 12px', direction: 'ltr' }}>{fmtNum(line.price)} دج</td>
            <td style={{ padding: '6px 12px', direction: 'ltr', fontWeight: 700, color: 'var(--em)' }}>
              {fmtNum(line.total)} دج
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE PAGE
// ════════════════════════════════════════════════════════════════════════════

const MOCK_DATA: Invoice[] = Array.from({ length: 42 }, (_, i) => ({
  id:         i + 1,
  number:     `FV-2025-${String(i + 1).padStart(4, '0')}`,
  party:      ['الشركة الوطنية', 'مؤسسة النور', 'شركة الأمل', 'مصنع الشرق'][i % 4],
  date:       new Date(2025, i % 12, (i % 28) + 1).toISOString().split('T')[0],
  status:     (['draft', 'validated', 'paid', 'cancelled'] as const)[i % 4],
  warehouse:  ['المستودع الرئيسي', 'مستودع الشمال'][i % 2],
  total_ht:   Math.round((1000 + i * 350) * 100) / 100,
  total_tva:  Math.round((1000 + i * 350) * 0.19 * 100) / 100,
  total_ttc:  Math.round((1000 + i * 350) * 1.19 * 100) / 100,
  net_to_pay: Math.round((1000 + i * 350) * 1.19 * 100) / 100,
  remaining:  i % 3 === 0 ? Math.round((1000 + i * 350) * 1.19 * 100) / 100 : 0,
  notes:      i % 5 === 0 ? 'ملاحظة خاصة بهذه الفاتورة' : '',
  lines: i % 2 === 0 ? [
    { id: 1, product: 'منتج أ', qty: 10, price: 500, total: 5000 },
    { id: 2, product: 'منتج ب', qty: 5,  price: 800, total: 4000 },
  ] : [],
}));

export default function InvoicesExample() {
  const [data, setData] = useState<Invoice[]>(MOCK_DATA);
  const [selected, setSelected] = useState<Invoice[]>([]);

  // ✅ Inline edit handler
  const handleCellEdit = useCallback((payload: CellEditPayload<Invoice>) => {
    setData(prev => prev.map((row, i) => {
      if (i !== payload.rowIndex) return row;
      return { ...row, [payload.colKey]: payload.newValue };
    }));
  }, []);

  // ✅ Row actions
  const rowActions = useCallback((row: Invoice) => (
    <div style={{ display: 'flex', gap: 3 }}>
      <button
        title="عرض"
        style={actionBtn}
        onClick={() => alert(`عرض: ${row.number}`)}
      >
        <i className="ti ti-eye" />
      </button>
      {row.status === 'draft' && (
        <button
          title="اعتماد"
          style={{ ...actionBtn, color: 'var(--em)' }}
          onClick={() => setData(p => p.map(r => r.id === row.id ? { ...r, status: 'validated' } : r))}
        >
          <i className="ti ti-check" />
        </button>
      )}
      <button
        title="حذف"
        style={{ ...actionBtn, color: 'var(--red)' }}
        onClick={() => setData(p => p.filter(r => r.id !== row.id))}
      >
        <i className="ti ti-trash" />
      </button>
    </div>
  ), []);

  // ✅ Header actions
  const headerActions = (
    <div style={{ display: 'flex', gap: 6 }}>
      {selected.length > 0 && (
        <button style={{
          height: 30, padding: '0 12px', borderRadius: 6,
          border: '1px solid var(--red)', background: 'color-mix(in srgb, var(--red) 8%, transparent)',
          color: 'var(--red)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className="ti ti-trash" style={{ fontSize: 13 }} />
          حذف {selected.length} محدد
        </button>
      )}
      <button style={{
        height: 30, padding: '0 14px', borderRadius: 6,
        border: 'none', background: 'var(--em)', color: '#fff',
        fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <i className="ti ti-plus" style={{ fontSize: 14 }} />
        فاتورة جديدة
      </button>
    </div>
  );

  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--b1)',
      borderRadius: 'var(--r3)', overflow: 'hidden',
    }}>
      <DataTable<Invoice>
        // ── بيانات
        data={data}
        columns={COLUMNS}
        rowKey={(r) => r.id}

        // ── ميزات جديدة v3
        searchable                                    // ✅ Global search
        showAggregates                                // ✅ Aggregate footer
        aggregateLabel="إجمالي الصفحة"
        expandable                                    // ✅ Expandable rows
        renderExpanded={(row, _idx) => <InvoiceLines row={row} />}
        isExpandable={(row) => (row.lines?.length ?? 0) > 0}
        onCellEdit={handleCellEdit}                  // ✅ Inline editing

        // ── تحديد
        selectable
        onSelect={setSelected}

        // ── إجراءات
        rowActions={rowActions}
        headerActions={headerActions}

        // ── مظهر
        title="فواتير البيع"
        exportable
        exportName="فواتير_البيع_2025"

        // ── row click
        onRowClick={(row) => console.log('row clicked:', row.number)}

        // ── تلوين الصفوف المتأخرة
        rowClassName={(row) =>
          row.remaining > 0 && row.status === 'validated'
            ? 'dt-row-overdue'
            : undefined
        }
      />
    </div>
  );
}

// ─── Style helper ────────────────────────────────────────────────────────────

const actionBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid var(--b1)', background: 'var(--bg2)',
  color: 'var(--t3)', fontSize: 13, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all .15s',
};
