// resources/js/pages/fiscal/TvaPage.tsx
import React, { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import KpiCard from '@/components/ui/KpiCard';
import ProgressBar from '@/components/ui/ProgressBar';

// Static data for demonstration (will be replaced by API later)
const TVA_SUMMARY = {
    totalCollected: 237196.00,
    totalDeductible: -46588.00,
    netToPay: 190608.00,
    submitted: false,
    deadline: '2024-05-20', // Usually the 20th of next month
};

const TVA_TRANSACTIONS = [
    { id: 1, date: '2024-04-25', description: 'فاتورة رقم #0342', client: 'بوزيد أحمد', amount: 45000.00, tva: 8550.00, type: 'collected' },
    { id: 2, date: '2024-04-24', description: 'فاتورة رقم #0341', client: 'فاطمة بن علي', amount: 8200.00, tva: 1558.00, type: 'collected' },
    { id: 3, date: '2024-04-22', description: 'شراء بضاعة', supplier: 'مورد الجملة', amount: 50000.00, tva: 9500.00, type: 'deductible' },
    { id: 4, date: '2024-04-20', description: 'فاتورة رقم #0340', client: 'الشركة الوطنية', amount: 152000.00, tva: 28880.00, type: 'collected' },
    { id: 5, date: '2024-04-18', description: 'مصاريف كهرباء', supplier: 'سونلغاز', amount: 12000.00, tva: 1080.00, type: 'deductible' },
    { id: 6, date: '2024-04-15', description: 'فاتورة رقم #0339', client: 'كمال دبيح', amount: 5800.00, tva: 1102.00, type: 'collected' },
    { id: 7, date: '2024-04-10', description: 'شراء أثاث', supplier: 'الأثاث العصري', amount: 35000.00, tva: 6650.00, type: 'deductible' },
];

export default function TvaPage() {
    const [period, setPeriod] = useState('2024-04');
    const [declarationType, setDeclarationType] = useState<'G50' | 'G12'>('G50');

    const totalTvaCollected = TVA_TRANSACTIONS
        .filter(t => t.type === 'collected')
        .reduce((sum, t) => sum + t.tva, 0);

    const totalTvaDeductible = TVA_TRANSACTIONS
        .filter(t => t.type === 'deductible')
        .reduce((sum, t) => sum + t.tva, 0);

    const netTva = totalTvaCollected - totalTvaDeductible;

    return (
        <div className="page on" id="p-tva">
            <PageHeader
                title="إقرار TVA"
                subtitle={`إقرار ${declarationType} — ${new Date(period + '-01').toLocaleDateString('ar-DZ', { month: 'long', year: 'numeric' })}`}
                actions={
                    <>
                        <Button size="sm" icon={<i className="ti ti-file-export"/>}>تصدير Excel</Button>
                        <Button size="sm" icon={<i className="ti ti-printer"/>}>طباعة</Button>
                        <Button variant="primary" size="sm" icon={<i className="ti ti-send"/>} disabled={TVA_SUMMARY.submitted}>
                            {TVA_SUMMARY.submitted ? 'تم التصريح' : 'تقديم الإقرار'}
                        </Button>
                    </>
                }
            />

            {/* Type selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <Button
                    variant={declarationType === 'G50' ? 'primary' : 'default'}
                    size="sm"
                    onClick={() => setDeclarationType('G50')}
                >
                    G50 — شهري
                </Button>
                <Button
                    variant={declarationType === 'G12' ? 'primary' : 'default'}
                    size="sm"
                    onClick={() => setDeclarationType('G12')}
                >
                    G12 — ربع سنوي
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard
                    variant="green"
                    icon="ti-arrow-up-circle"
                    label="TVA محصلة"
                    value={totalTvaCollected.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                    unit="دج"
                    sub="من الفواتير والمبيعات"
                />
                <KpiCard
                    variant="blue"
                    icon="ti-arrow-down-circle"
                    label="TVA مستردة"
                    value={totalTvaDeductible.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                    unit="دج"
                    sub="من المشتريات والمصاريف"
                />
                <KpiCard
                    variant="red"
                    icon="ti-calculator"
                    label="المستحق للدولة"
                    value={netTva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                    unit="دج"
                    sub={`آخر أجل: ${new Date(TVA_SUMMARY.deadline).toLocaleDateString('ar-DZ')}`}
                />
                <KpiCard
                    variant="purple"
                    icon="ti-file-check"
                    label="حالة الإقرار"
                    value={TVA_SUMMARY.submitted ? 'مقدم' : 'قيد الإعداد'}
                    sub={TVA_SUMMARY.submitted ? 'بانتظار المراجعة' : 'لم يقدم بعد'}
                />
            </div>

            {/* Summary Card */}
            <div className="g2" style={{ marginBottom: 20 }}>
                <Card title="ملخص الإقرار" subtitle={`${declarationType} — ${new Date(period + '-01').toLocaleDateString('ar-DZ', { month: 'long', year: 'numeric' })}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { label: 'رقم الإقرار', value: declarationType === 'G50' ? 'G50-04-2024' : 'G12-T1-2024', mono: true },
                            { label: 'الفترة القانونية', value: new Date(period + '-01').toLocaleDateString('ar-DZ', { month: 'long', year: 'numeric' }) },
                            { label: 'المبيعات الإجمالية HT', value: `${(totalTvaCollected / 0.19).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج` },
                            { label: 'TVA محصلة (19%)', value: `${totalTvaCollected.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج`, color: 'var(--em)' },
                            { label: 'المشتريات الإجمالية HT', value: `${(totalTvaDeductible / 0.19).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج` },
                            { label: 'TVA قابلة للخصم', value: `${totalTvaDeductible.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج`, color: 'var(--blue)' },
                        ].map((row) => (
                            <div key={row.label} className="sr">
                                <span className="sr-l">{row.label}</span>
                                <span className="sr-v" style={row.color ? { fontFamily: row.mono ? 'monospace' : undefined, color: 'var(--t1)', fontWeight: 700 } : { fontFamily: row.mono ? 'monospace' : undefined }}>
                                    {row.value}
                                </span>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--b3)', paddingTop: 12, marginTop: 4 }}>
                            <div className="sr">
                                <span className="sr-l" style={{ fontWeight: 800, color: 'var(--t1)' }}>المبلغ المستحق للدفع</span>
                                <span className="sr-v" style={{ fontSize: 18, fontWeight: 900, color: 'var(--red)' }}>
                                    {netTva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title="نسبة الامتثال الضريبي" subtitle="آخر 6 أشهر">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { month: 'نوفمبر 2023', percent: 100 },
                            { month: 'ديسمبر 2023', percent: 100 },
                            { month: 'جانفي 2024', percent: 100 },
                            { month: 'فيفري 2024', percent: 85 },
                            { month: 'مارس 2024', percent: 100 },
                            { month: 'أفريل 2024', percent: 100 },
                        ].map((m) => (
                            <div key={m.month}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                    <span style={{ color: 'var(--t3)' }}>{m.month}</span>
                                    <span style={{ fontWeight: 700, color: m.percent < 100 ? 'var(--red)' : 'var(--em)' }}>{m.percent}%</span>
                                </div>
                                <ProgressBar value={m.percent} color={m.percent < 100 ? 'var(--red)' : 'var(--em)'} height={4} />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Transactions Detail */}
            <Card title="تفاصيل العمليات" subtitle="حركات TVA للفترة المحددة">
                <div className="tw">
                    <table>
                        <thead>
                            <tr>
                                <th>التاريخ</th>
                                <th>البيان</th>
                                <th>المتعامل</th>
                                <th>المبلغ HT</th>
                                <th>TVA</th>
                                <th>النوع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {TVA_TRANSACTIONS.map((trans) => (
                                <tr key={trans.id}>
                                    <td className="m">{new Date(trans.date).toLocaleDateString('fr-DZ')}</td>
                                    <td className="s">{trans.description}</td>
                                    <td style={{ color: 'var(--t3)' }}>{trans.client || trans.supplier}</td>
                                    <td className="m">{trans.amount.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                    <td className={trans.type === 'collected' ? 'e' : 'r'}>
                                        {trans.type === 'deductible' ? '- ' : ''}{trans.tva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                                    </td>
                                    <td>
                                        <Badge variant={trans.type === 'collected' ? 'success' : 'info'}>
                                            {trans.type === 'collected' ? 'محصلة' : 'قابلة للخصم'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--b2)' }}>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--t4)' }}>إجمالي TVA المحصلة: </span>
                        <strong style={{ color: 'var(--em)' }}>{totalTvaCollected.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--t4)' }}>إجمالي TVA القابلة للخصم: </span>
                        <strong style={{ color: 'var(--red)' }}>- {totalTvaDeductible.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--t4)' }}>الصافي المستحق: </span>
                        <strong style={{ color: 'var(--red)', fontSize: 15 }}>{netTva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</strong>
                    </div>
                </div>
            </Card>
        </div>
    );
}
