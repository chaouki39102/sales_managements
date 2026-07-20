import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

export const FMT = (n: number) => n.toLocaleString('fr-DZ');
export const MONEY = (n: number) => `${FMT(n)} دج`;

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
];

type ReportId = typeof REPORT_CARDS[number]['id'];

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
