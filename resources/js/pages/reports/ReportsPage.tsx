// resources/js/pages/reports/ReportsPage.tsx
import React from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import KpiCard from '@/components/ui/KpiCard';

const REPORT_CARDS = [
    { title: 'تقرير المبيعات', icon: 'ti-trending-up', color: 'var(--em)', desc: 'تحليل المبيعات حسب الفترة والمنتج والعميل', link: '/reports/sales' },
    { title: 'تقرير المشتريات', icon: 'ti-trending-down', color: 'var(--blue)', desc: 'تحليل المشتريات والموردين', link: '/reports/purchases' },
    { title: 'تقرير العملاء', icon: 'ti-users', color: 'var(--purple)', desc: 'كشف حساب العملاء والديون', link: '/reports/customers' },
    { title: 'تقرير الموردين', icon: 'ti-truck', color: 'var(--gold)', desc: 'كشف حساب الموردين والمستحقات', link: '/reports/suppliers' },
    { title: 'تقرير المنتجات', icon: 'ti-package', color: 'var(--teal)', desc: 'حركة المنتجات والأكثر مبيعاً', link: '/reports/products' },
    { title: 'تقرير المخزون', icon: 'ti-building-warehouse', color: 'var(--orange)', desc: 'تقييم المخزون والحركات', link: '/reports/inventory' },
    { title: 'تقرير الدفعات', icon: 'ti-cash', color: 'var(--em)', desc: 'سجل الدفعات والتحصيلات', link: '/reports/payments' },
    { title: 'تقرير الضرائب', icon: 'ti-calculator', color: 'var(--red)', desc: 'تقرير TVA والطابع الجبائي', link: '/reports/taxes' },
];

export default function ReportsPage() {
    return (
        <div className="page on" id="p-reports">
            <PageHeader title="التقارير والإحصائيات" subtitle="لوحة تحكم لجميع التقارير والتحليلات المالية والإدارية" />

            <div className="kpis" style={{ marginBottom: 24 }}>
                <KpiCard variant="green" icon="ti-file-text" label="إجمالي التقارير" value="8" />
                <KpiCard variant="blue" icon="ti-clock" label="آخر تحديث" value="قبل 5 دقائق" />
                <KpiCard variant="gold" icon="ti-download" label="تم تحميلها" value="24 مرة" />
                <KpiCard variant="purple" icon="ti-star" label="المفضلة" value="3" />
            </div>

            <div className="g2" style={{ marginBottom: 20 }}>
                {REPORT_CARDS.map((report) => (
                    <Card key={report.title} style={{ cursor: 'pointer', transition: 'all .2s' }}
                        onClick={() => console.log('Navigate to', report.link)}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 'var(--r2)',
                                background: `color-mix(in srgb, ${report.color} 12%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${report.color} 25%, transparent)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: report.color, fontSize: 22, flexShrink: 0
                            }}>
                                <span className="ic"><i className={`ti ${report.icon}`}/></span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)', marginBottom: 4 }}>{report.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 10 }}>{report.desc}</div>
                                <Button size="xs" variant="primary" icon={<i className="ti ti-arrow-left"/>}>
                                    عرض التقرير
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
