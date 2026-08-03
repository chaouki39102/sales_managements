import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';
import type { ReportDocumentLine } from '@/lib/api/endpoints/reports';

export const FMT = (n: number) => n.toLocaleString('fr-DZ');
export const MONEY = (n: number) => `${FMT(n)} دج`;
export const PCT = (n: number) => `${n.toFixed(1)}%`;

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export const REPORT_DEFAULTS = {
  from: monthStart(),
  to:   new Date().toISOString().slice(0, 10),
};

/** سطر تفاصيل الوثيقة — "تفاصيل التفاصيل" للتقارير */
export function ReportLinesDetail({ lines }: { lines?: ReportDocumentLine[] }) {
  if (!lines?.length) {
    return (
      <div style={{ fontSize: 12, color: 'var(--t4)', padding: '8px 2px' }}>
        لا توجد تفاصيل مسجلة لهذه الوثيقة
      </div>
    );
  }
  const columns = [
    { key: 'product_name', label: 'المنتج' },
    { key: 'product_ref', label: 'المرجع' },
    {
      key: 'quantity', label: 'الكمية', align: 'end' as const,
      render: (v: unknown, row: ReportDocumentLine) => {
        const q = Number(v ?? 0);
        const pk = row.pack_qty ? Number(row.pack_qty) : 0;
        return pk > 1 ? `${FMT(q)} × ${pk}` : FMT(q);
      },
    },
    { key: 'unit_price_ht', label: 'سعر الوحدة HT', align: 'end' as const, render: (v: unknown) => MONEY(Number(v ?? 0)) },
    {
      key: 'discount_percentage', label: 'الخصم', align: 'end' as const,
      render: (_v: unknown, row: ReportDocumentLine) => {
        const pct = Number(row.discount_percentage ?? 0);
        const amt = Number(row.total_discount_amount ?? 0);
        if (amt > 0) return pct > 0 ? `${MONEY(amt)} (${pct.toFixed(2)}%)` : MONEY(amt);
        if (pct > 0) return `${pct.toFixed(2)}%`;
        return '—';
      },
    },
    { key: 'tva_rate', label: 'TVA %', align: 'end' as const, render: (v: unknown) => `${Number(v ?? 0).toFixed(2)}%` },
    { key: 'total_ht', label: 'المجموع HT', align: 'end' as const, render: (v: unknown) => MONEY(Number(v ?? 0)) },
    { key: 'total_tva', label: 'TVA', align: 'end' as const, render: (v: unknown) => MONEY(Number(v ?? 0)) },
    { key: 'total_ttc', label: 'المجموع TTC', align: 'end' as const, render: (v: unknown) => MONEY(Number(v ?? 0)) },
  ];
  return (
    <SimpleTable
      columns={columns}
      data={lines}
      rowKey={(row) => `${row.product_id}-${row.quantity}-${row.unit_price_ht}-${row.tva_rate}`}
      emptyText="لا توجد تفاصيل"
    />
  );
}

export interface ReportCardMeta {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  badge?: string;
  href: string;
}

export const REPORT_CARDS: ReportCardMeta[] = [
  { id: 'creative', title: 'التقرير الشامل', description: 'نظرة شاملة على الأداء', icon: 'ti-star', color: 'var(--purple)', badge: 'جديد', href: '/reports/creative' },
  { id: 'sales', title: 'تقرير المبيعات', description: 'تحليل المبيعات مع الهامش والتكاليف', icon: 'ti-trending-up', color: 'var(--em)', href: '/reports/sales' },
  { id: 'purchases', title: 'تقرير المشتريات', description: 'تحليل المشتريات مع التكاليف والمدفوعات', icon: 'ti-trending-down', color: 'var(--blue)', href: '/reports/purchases' },
  { id: 'customers', title: 'تقرير الزبائن', description: 'كشف حساب الزبائن والديون المستحقة', icon: 'ti-users', color: 'var(--purple)', href: '/reports/customers' },
  { id: 'suppliers', title: 'تقرير الموردين', description: 'كشف حساب الموردين والمستحقات', icon: 'ti-truck', color: 'var(--gold)', href: '/reports/suppliers' },
  { id: 'products', title: 'تقرير المنتجات', description: 'حركة المنتجات والمبيعات', icon: 'ti-package', color: 'var(--teal)', href: '/reports/products' },
  { id: 'dashboard', title: 'لوحة القيادة', description: 'مؤشرات الأداء الرئيسية للفترة', icon: 'ti-gauge', color: 'var(--em)', badge: 'جديد', href: '/reports/dashboard' },
  { id: 'forecast', title: 'التنبؤ وإعادة الطلب', description: 'توقع الطلب وكمية إعادة الطلب المقترحة', icon: 'ti-chart-line', color: 'var(--orange)', badge: 'جديد', href: '/reports/forecast' },
  { id: 'monthly', title: 'التقرير الشهري', description: 'مبيعات ومشتريات شهراً بشهر', icon: 'ti-calendar-month', color: 'var(--blue)', badge: 'جديد', href: '/reports/monthly' },
  { id: 'inventory', title: 'تقرير المخزون', description: 'تقييم المخزون والمنتجات المنخفضة', icon: 'ti-building-warehouse', color: 'var(--orange)', href: '/reports/inventory' },
  { id: 'payments', title: 'تقرير الدفعات', description: 'سجل الدفعات والتحصيلات', icon: 'ti-cash', color: 'var(--em)', href: '/reports/payments' },
  { id: 'taxes', title: 'تقرير الضرائب', description: 'تقرير TVA والطابع الجبائي', icon: 'ti-calculator', color: 'var(--red)', href: '/reports/taxes' },
  { id: 'velocity', title: 'سرعة البيع', description: 'تحليل سرعة بيع المنتجات', icon: 'ti-rocket', color: 'var(--teal)', href: '/reports/velocity' },
  { id: 'margin', title: 'تقرير الهوامش', description: 'هامش الربح لكل منتج', icon: 'ti-coin', color: 'var(--em)', href: '/reports/margin' },
  { id: 'aging', title: 'لوحة الديون', description: 'تصنيف الديون المستحقة حسب العمر', icon: 'ti-clock-hour-4', color: 'var(--red)', href: '/reports/aging' },
  { id: 'daily', title: 'التقرير اليومي', description: 'ملخص يومي للوثائق والمدفوعات', icon: 'ti-calendar-day', color: 'var(--blue)', href: '/reports/daily' },
  { id: 'product-movement', title: 'حركة المنتجات', description: 'تحليل حركات البيع والشراء لكل منتج', icon: 'ti-arrows-exchange', color: 'var(--gold)', href: '/reports/product-movement' },
  { id: 'profit-loss', title: 'الأرباح والخسائر', description: 'تقرير الأرباح الصافية بعد الخصم من التكاليف والمصروفات', icon: 'ti-chart-line', color: 'var(--em)', href: '/reports/profit-loss' },
  { id: 'returns', title: 'تقرير الإرجاعات', description: 'تحليل وثائق الإرجاع (AV/AA)', icon: 'ti-rotate-left', color: 'var(--red)', href: '/reports/returns' },
  { id: 'cash-flow', title: 'التدفقات النقدية', description: 'حركات التحصيل اليومية والشهرية', icon: 'ti-cash', color: 'var(--em)', href: '/reports/cash-flow' },
  { id: 'expenses', title: 'تقرير المصروفات', description: 'تحليل المصروفات حسب الفئة والشهر', icon: 'ti-wallet', color: 'var(--orange)', href: '/reports/expenses' },
  { id: 'sales-trend', title: 'اتجاهات المبيعات', description: 'مقارنة يومية/أسبوعية/شهرية', icon: 'ti-chart-line', color: 'var(--blue)', href: '/reports/sales-trend' },
  { id: 'stock-movements', title: 'حركات المخزون', description: 'تفاصيل الوارد والصادر والتسويات', icon: 'ti-arrows-exchange', color: 'var(--teal)', href: '/reports/stock-movements' },
  { id: 'sales-matrix', title: 'المبيعات حسب الزبون والمنتج', description: 'مصفوفة الزبائن × المنتجات', icon: 'ti-grid-dots', color: 'var(--purple)', badge: 'جديد', href: '/reports/sales-matrix' },
  { id: 'purchases-matrix', title: 'المشتريات حسب المورد والمنتج', description: 'مصفوفة الموردين × المنتجات', icon: 'ti-grid-dots', color: 'var(--blue)', badge: 'جديد', href: '/reports/purchases-matrix' },
  { id: 'client-monthly', title: 'رقم الأعمال الشهري حسب الزبون', description: 'مصفوفة الزبائن × الأشهر', icon: 'ti-calendar-stats', color: 'var(--gold)', badge: 'جديد', href: '/reports/client-monthly' },
  { id: 'grand-livre', title: 'دفتر الأستاذ العام', description: 'سجل زمني لكل الحركات مع الرصيد الجاري', icon: 'ti-book', color: 'var(--teal)', badge: 'جديد', href: '/reports/grand-livre' },
];

export function QuickReportCard({ report, onSelect }: { report: ReportCardMeta; onSelect: () => void }) {
  return (
    <Card style={{ cursor: 'pointer', transition: 'all .2s' }} onClick={onSelect}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12, flexShrink: 0,
          background: `color-mix(in srgb, ${report.color} 12%, transparent)`,
          border:     `1px solid color-mix(in srgb, ${report.color} 25%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: report.color, fontSize: 22,
        }}>
          <span className="ic"><i className={`ti ${report.icon}`}/></span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>{report.title}</div>
            {report.badge && <Badge variant={report.id === 'creative' ? 'primary' : 'success'} noDot>{report.badge}</Badge>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 12, lineHeight: 1.6 }}>
            {report.description}
          </div>
          <Button size="xs" variant="primary" icon={<i className="ti ti-arrow-left"/>}>
            عرض التقرير
          </Button>
        </div>
      </div>
    </Card>
  );
}
