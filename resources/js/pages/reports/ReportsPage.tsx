// ════════════════════════════════════════════════
// resources/js/pages/reports/ReportsPage.tsx
// لوحة التقارير والإحصائيات
// ════════════════════════════════════════════════
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import KpiCard from '@/components/ui/KpiCard';
import AlertBar from '@/components/ui/AlertBar';
import ProgressBar from '@/components/ui/ProgressBar';
import apiClient from '@/lib/api/client';
import { useFiscalYear } from '@/context/FiscalYearContext';

// ─────────────────────────────────────────────────────────────
// أنواع التقارير
// ─────────────────────────────────────────────────────────────
interface ReportCard {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    endpoint: string;
    params?: Record<string, string>;
    badge?: string;
    badgeColor?: string;
}

const REPORT_CARDS: ReportCard[] = [
    {
        id: 'sales',
        title: 'تقرير المبيعات',
        description: 'تحليل المبيعات حسب الفترة، المنتج، والعميل مع مقارنة سنوية',
        icon: 'ti-trending-up',
        color: 'var(--em)',
        endpoint: '/reports/sales',
        badge: 'الأكثر استخداماً',
    },
    {
        id: 'purchases',
        title: 'تقرير المشتريات',
        description: 'تحليل المشتريات والموردين مع تتبع التكاليف',
        icon: 'ti-trending-down',
        color: 'var(--blue)',
        endpoint: '/reports/purchases',
    },
    {
        id: 'customers',
        title: 'تقرير العملاء',
        description: 'كشف حساب العملاء، الديون المستحقة، وأفضل العملاء',
        icon: 'ti-users',
        color: 'var(--purple)',
        endpoint: '/reports/customers',
    },
    {
        id: 'suppliers',
        title: 'تقرير الموردين',
        description: 'كشف حساب الموردين، المستحقات، وأفضل الموردين',
        icon: 'ti-truck',
        color: 'var(--gold)',
        endpoint: '/reports/suppliers',
    },
    {
        id: 'products',
        title: 'تقرير المنتجات',
        description: 'حركة المنتجات، الأكثر مبيعاً، والأقل مبيعاً',
        icon: 'ti-package',
        color: 'var(--teal)',
        endpoint: '/reports/products',
    },
    {
        id: 'inventory',
        title: 'تقرير المخزون',
        description: 'تقييم المخزون، الحركات، والمنتجات المنخفضة',
        icon: 'ti-building-warehouse',
        color: 'var(--orange)',
        endpoint: '/reports/inventory',
    },
    {
        id: 'payments',
        title: 'تقرير الدفعات',
        description: 'سجل الدفعات والتحصيلات حسب طريقة الدفع والفترة',
        icon: 'ti-cash',
        color: 'var(--em)',
        endpoint: '/reports/payments',
    },
    {
        id: 'taxes',
        title: 'تقرير الضرائب',
        description: 'تقرير TVA، الطابع الجبائي، وإقرار G50',
        icon: 'ti-calculator',
        color: 'var(--red)',
        endpoint: '/reports/taxes',
        badge: 'G50',
        badgeColor: 'var(--gold)',
    },
];

// ─────────────────────────────────────────────────────────────
// مكون التقرير السريع
// ─────────────────────────────────────────────────────────────
function QuickReportCard({ report }: { report: ReportCard }) {
    const navigate = useNavigate();

    return (
        <Card
            style={{ cursor: 'pointer', transition: 'all .2s' }}
            onClick={() => navigate(`/reports?id=${report.id}`)}
        >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {/* الأيقونة */}
                <div style={{
                    width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                    background: `color-mix(in srgb, ${report.color} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${report.color} 25%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: report.color, fontSize: 22,
                }}>
                    <span className="ic"><i className={`ti ${report.icon}`}/></span>
                </div>

                {/* المحتوى */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>
                            {report.title}
                        </div>
                        {report.badge && (
                            <Badge variant="success" noDot>
                                {report.badge}
                            </Badge>
                        )}
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

// ─────────────────────────────────────────────────────────────
// مكون عرض تقرير محدد
// ─────────────────────────────────────────────────────────────
function ReportViewer({ reportId, fiscalYearId }: { reportId: string; fiscalYearId?: number }) {
    const report = REPORT_CARDS.find(r => r.id === reportId);
    const isTaxReport = reportId === 'taxes';

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['report', reportId, fiscalYearId],
        queryFn: () => apiClient.get(report?.endpoint || '', {
            params: {
                fiscal_year_id: fiscalYearId,
                ...(report?.params || {}),
            },
        }).then(r => r.data),
        enabled: !!reportId && !!report?.endpoint,
    });

    if (!report) {
        return (
            <EmptyState icon="ti-file-search" text="تقرير غير موجود" sub="اختر تقريراً من القائمة"/>
        );
    }

    return (
        <div>
            <PageHeader
                title={report.title}
                subtitle={report.description}
                actions={
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button size="sm" icon={<i className="ti ti-download"/>} onClick={() => window.open(`${report.endpoint}?fiscal_year_id=${fiscalYearId}&export=excel`, '_blank')}>
                            تصدير Excel
                        </Button>
                        <Button size="sm" icon={<i className="ti ti-printer"/>} onClick={() => window.open(`${report.endpoint}?fiscal_year_id=${fiscalYearId}&export=pdf`, '_blank')}>
                            PDF
                        </Button>
                        <Button size="sm" icon={<i className="ti ti-refresh"/>} onClick={() => refetch()}>
                            تحديث
                        </Button>
                    </div>
                }
            />

            {isLoading ? (
                <div className="empty" style={{ padding: 60 }}>
                    <div className="empty-ic"><i className="ti ti-loader"/></div>
                    <div className="empty-tx">جاري تحميل التقرير...</div>
                </div>
            ) : isError ? (
                <AlertBar variant="red">
                    فشل تحميل التقرير.{' '}
                    <button onClick={() => refetch()} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        إعادة المحاولة
                    </button>
                </AlertBar>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* KPIs خاصة بالتقرير */}
                    {isTaxReport && data?.summary && (
                        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                            <KpiCard variant="green" icon="ti-arrow-up-circle" label="TVA محصلة" value={data.summary.tva_collected?.toLocaleString('fr-DZ') || '—'} unit="دج"/>
                            <KpiCard variant="blue" icon="ti-arrow-down-circle" label="TVA قابلة للخصم" value={data.summary.tva_deductible?.toLocaleString('fr-DZ') || '—'} unit="دج"/>
                            <KpiCard variant="red" icon="ti-calculator" label="المستحق" value={data.summary.net_tva?.toLocaleString('fr-DZ') || '—'} unit="دج"/>
                            <KpiCard variant="gold" icon="ti-file-check" label="حالة الإقرار" value={data.summary.submitted ? 'مقدم' : 'قيد الإعداد'}/>
                        </div>
                    )}

                    {/* جدول البيانات */}
                    {data?.data && data.data.length > 0 && (
                        <Card noHeader style={{ padding: 0 }}>
                            <div className="tw">
                                <table>
                                    <thead>
                                        <tr>
                                            {Object.keys(data.data[0]).slice(0, 6).map(key => (
                                                <th key={key}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.data.slice(0, 20).map((row: any, i: number) => (
                                            <tr key={i}>
                                                {Object.values(row).slice(0, 6).map((val: any, j: number) => (
                                                    <td key={j}>{String(val ?? '—')}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {data.data.length > 20 && (
                                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--b1)', fontSize: 12, color: 'var(--t4)', textAlign: 'center' }}>
                                    عرض 20 من أصل {data.data.length} سجل — حمّل الملف للاطلاع على الكل
                                </div>
                            )}
                        </Card>
                    )}

                    {(!data?.data || data.data.length === 0) && (
                        <div className="empty" style={{ padding: 40 }}>
                            <div className="empty-ic"><i className="ti ti-file-off"/></div>
                            <div className="empty-tx">لا توجد بيانات متاحة لهذه الفترة</div>
                            <div className="empty-sub">جرب تغيير السنة المالية أو معايير التقرير</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// حالة فارغة
// ─────────────────────────────────────────────────────────────
function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
    return (
        <div className="empty" style={{ padding: 60 }}>
            <div className="empty-ic"><i className={`ti ${icon}`}/></div>
            <div className="empty-tx">{text}</div>
            {sub && <div className="empty-sub">{sub}</div>}
        </div>
    );
}

// ════════════════════════════════════════════════
// الصفحة الرئيسية للتقارير
// ════════════════════════════════════════════════
export default function ReportsPage() {
    const { selectedYear } = useFiscalYear();
    const [viewingReport, setViewingReport] = useState<string | null>(null);

    // إذا كان هناك تقرير مطلوب عرضه
    if (viewingReport) {
        return (
            <div className="page on" id="p-reports">
                <div style={{ marginBottom: 16 }}>
                    <Button size="sm" icon={<i className="ti ti-arrow-right"/>} onClick={() => setViewingReport(null)}>
                        العودة لقائمة التقارير
                    </Button>
                </div>
                <ReportViewer reportId={viewingReport} fiscalYearId={selectedYear?.id}/>
            </div>
        );
    }

    return (
        <div className="page on" id="p-reports">
            <PageHeader
                title="التقارير والإحصائيات"
                subtitle={`جميع التقارير المالية والإدارية — السنة: ${selectedYear?.name || '—'}`}
            />

            {/* KPIs للتقارير */}
            <div className="kpis" style={{ marginBottom: 24 }}>
                <KpiCard variant="green" icon="ti-file-text" label="إجمالي التقارير" value={REPORT_CARDS.length}/>
                <KpiCard variant="blue" icon="ti-clock" label="آخر تحديث" value="قبل لحظات"/>
                <KpiCard variant="gold" icon="ti-download" label="التقارير المُصدرة" value="—"/>
                <KpiCard variant="purple" icon="ti-star" label="التقارير المفضلة" value="3"/>
            </div>

            {/* سنة مقفلة — تحذير */}
            {selectedYear?.is_closed && (
                <AlertBar variant="gold">
                    🔒 السنة المالية {selectedYear.name} مقفلة — التقارير للعرض فقط ولا يمكن تعديل البيانات.
                </AlertBar>
            )}

            {/* قائمة التقارير */}
            <div className="g2" style={{ marginBottom: 20 }}>
                {REPORT_CARDS.map(report => (
                    <div key={report.id} onClick={() => setViewingReport(report.id)}>
                        <QuickReportCard report={report}/>
                    </div>
                ))}
            </div>

            {/* معلومات إضافية */}
            <Card
                title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-info-circle"/></span> معلومات عن التقارير</>}
                noHeader={false}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--t3)' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <i className="ti ti-check" style={{ color: 'var(--em)', flexShrink: 0, marginTop: 3 }}/>
                        <span>جميع التقارير تدعم التصدير بصيغ <strong>Excel</strong> و <strong>PDF</strong></span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <i className="ti ti-check" style={{ color: 'var(--em)', flexShrink: 0, marginTop: 3 }}/>
                        <span>يمكن تصفية التقارير حسب <strong>السنة المالية</strong> المختارة من الشريط العلوي</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <i className="ti ti-check" style={{ color: 'var(--em)', flexShrink: 0, marginTop: 3 }}/>
                        <span>التقارير تُحدَّث <strong>تلقائياً</strong> مع كل عملية بيع أو شراء</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
