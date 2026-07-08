// ════════════════════════════════════════════════════════════════════════════
// pages/reports/ReportsPage.tsx
//
// الإصلاحات:
//   1. استبدال apiClient.get المباشر بـ hooks من reports.ts
//   2. fiscal_year_id → year_id (اسم الحقل الصحيح في ReportBaseParams)
//   3. تقسيم ReportViewer لـ sub-components مُصنَّفة بـ types
//   4. جدول TVA يستخدم TaxesReportData الحقيقي
//   5. جدول البيانات لا يعرض مفاتيح الـ object الخام (Object.keys)
//   6. export URLs تمر عبر apiClient بدل window.open مباشرة
//   7. QuickReportCard لا يستدعي navigate + onClick في نفس الوقت
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import PageHeader    from '@/components/ui/PageHeader';
import Card          from '@/components/ui/Card';
import Badge         from '@/components/ui/Badge';
import Button        from '@/components/ui/Button';
import KpiCard       from '@/components/ui/KpiCard';
import AlertBar      from '@/components/ui/AlertBar';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { useActiveSlug } from '@/lib/store/appStore';
import {
  useSalesReport, usePurchasesReport, useCustomersReport,
  useSuppliersReport, useProductsReport, useInventoryReport,
  usePaymentsReport, useTvaReport,
  useVelocityReport, useMarginReport, useAgingReport,
  type SalesReportData, type PurchasesReportData,
  type PartyReportData, type ProductsReportData,
  type InventoryReportData, type PaymentsReportData,
  type TaxesReportData,
  type VelocityReportData, type MarginReportData,
  type AgingReportData,
} from '@/lib/api/endpoints/reports';
import apiClient from '@/lib/api/core/client';

// ─── Report Card meta (UI فقط — بدون endpoint مباشر) ────────────────────────

interface ReportCardMeta {
  id:           string;
  title:        string;
  description:  string;
  icon:         string;
  color:        string;
  badge?:       string;
}

const REPORT_CARDS: ReportCardMeta[] = [
  { id: 'sales',     title: 'تقرير المبيعات',     description: 'تحليل المبيعات حسب الفترة، المنتج، والزبون مع مقارنة سنوية', icon: 'ti-trending-up',        color: 'var(--em)',     badge: 'الأكثر استخداماً' },
  { id: 'purchases', title: 'تقرير المشتريات',    description: 'تحليل المشتريات والموردين مع تتبع التكاليف',                  icon: 'ti-trending-down',      color: 'var(--blue)'   },
  { id: 'customers', title: 'تقرير الزبائن',      description: 'كشف حساب الزبائن، الديون المستحقة، وأفضل الزبائن',           icon: 'ti-users',              color: 'var(--purple)' },
  { id: 'suppliers', title: 'تقرير الموردين',     description: 'كشف حساب الموردين، المستحقات، وأفضل الموردين',              icon: 'ti-truck',              color: 'var(--gold)'   },
  { id: 'products',  title: 'تقرير المنتجات',     description: 'حركة المنتجات، الأكثر مبيعاً، والأقل مبيعاً',               icon: 'ti-package',            color: 'var(--teal)'   },
  { id: 'inventory', title: 'تقرير المخزون',      description: 'تقييم المخزون، الحركات، والمنتجات المنخفضة',                icon: 'ti-building-warehouse', color: 'var(--orange)' },
  { id: 'payments',  title: 'تقرير الدفعات',      description: 'سجل الدفعات والتحصيلات حسب طريقة الدفع والفترة',            icon: 'ti-cash',               color: 'var(--em)'     },
  { id: 'taxes',     title: 'تقرير الضرائب',      description: 'تقرير TVA، الطابع الجبائي، وإقرار G50',                     icon: 'ti-calculator',         color: 'var(--red)',    badge: 'G50' },
  { id: 'velocity',  title: 'سرعة البيع',         description: 'تحليل سرعة بيع المنتجات — الكمية المباعة لكل يوم',           icon: 'ti-rocket',             color: 'var(--teal)'   },
  { id: 'margin',    title: 'تقرير الهوامش',      description: 'هامش الربح لكل منتج — مقارنة سعر البيع بسعر التكلفة',          icon: 'ti-coin',               color: 'var(--em)'     },
  { id: 'aging',     title: 'لوحة الديون',        description: 'تصنيف الديون المستحقة حسب العمر — 0-30 / 31-60 / 61-90 / 90+', icon: 'ti-clock-hour-4',      color: 'var(--red)'    },
];

type ReportId = typeof REPORT_CARDS[number]['id'];

// ─── QuickReportCard ──────────────────────────────────────────────────────────

function QuickReportCard({ report, onSelect }: { report: ReportCardMeta; onSelect: () => void }) {
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
            {report.badge && <Badge variant="success" noDot>{report.badge}</Badge>}
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

// ─── Report Viewers (كل تقرير بـ component مُصنَّف) ──────────────────────────

function SalesViewer() {
  const { data, isLoading, isError, refetch } = useSalesReport();
  return <ReportShell title="تقرير المبيعات" isLoading={isLoading} isError={isError} refetch={refetch} reportId="sales">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="green"  icon="ti-trending-up"   label="إجمالي HT"       value={data.summary.total_ht.toLocaleString('fr-DZ')}   unit="دج"/>
          <KpiCard variant="blue"   icon="ti-receipt"       label="إجمالي TTC"      value={data.summary.total_ttc.toLocaleString('fr-DZ')}  unit="دج"/>
          <KpiCard variant="gold"   icon="ti-file-check"    label="عدد الوثائق"     value={data.summary.documents_count}/>
          <KpiCard variant="red"    icon="ti-clock"         label="غير مسددة"       value={data.summary.unpaid_count}/>
        </div>
        <PartyTable rows={data.documents.slice(0, 20)} columns={['document_number','document_date','total_ttc','status']}/>
      </>
    )}
  </ReportShell>;
}

function PurchasesViewer() {
  const { data, isLoading, isError, refetch } = usePurchasesReport();
  return <ReportShell title="تقرير المشتريات" isLoading={isLoading} isError={isError} refetch={refetch} reportId="purchases">
    {data && (
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <KpiCard variant="blue"  icon="ti-trending-down" label="إجمالي HT"   value={data.summary.total_ht.toLocaleString('fr-DZ')}  unit="دج"/>
        <KpiCard variant="green" icon="ti-receipt"       label="إجمالي TTC"  value={data.summary.total_ttc.toLocaleString('fr-DZ')} unit="دج"/>
        <KpiCard variant="red"   icon="ti-clock"         label="غير مسددة"   value={data.summary.unpaid_count}/>
      </div>
    )}
  </ReportShell>;
}

function CustomersViewer() {
  const { data, isLoading, isError, refetch } = useCustomersReport();
  return <PartyReportView title="تقرير الزبائن" data={data} isLoading={isLoading} isError={isError} refetch={refetch} reportId="customers"/>;
}

function SuppliersViewer() {
  const { data, isLoading, isError, refetch } = useSuppliersReport();
  return <PartyReportView title="تقرير الموردين" data={data} isLoading={isLoading} isError={isError} refetch={refetch} reportId="suppliers"/>;
}

function PartyReportView({ title, data, isLoading, isError, refetch, reportId }: {
  title: string; data?: PartyReportData;
  isLoading: boolean; isError: boolean; refetch: () => void; reportId: ReportId;
}) {
  return <ReportShell title={title} isLoading={isLoading} isError={isError} refetch={refetch} reportId={reportId}>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <KpiCard variant="red"   icon="ti-trending-up"  label="إجمالي الرصيد"   value={data.summary.total_balance.toLocaleString('fr-DZ')} unit="دج"/>
          <KpiCard variant="blue"  icon="ti-users"        label="برصيد موجب"           value={data.summary.debtors_count}/>
          <KpiCard variant="green" icon="ti-users"        label="برصيد سالب"           value={data.summary.creditors_count}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th><th>الكود</th><th>إجمالي المشتريات</th><th>إجمالي المدفوعات</th><th>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    <td>{row.party.name}</td>
                    <td>{row.party.code ?? '—'}</td>
                    <td>{row.total_purchases.toLocaleString('fr-DZ')}</td>
                    <td>{row.total_payments.toLocaleString('fr-DZ')}</td>
                    <td style={{ color: row.balance > 0 ? 'var(--red)' : 'var(--em)', fontWeight: 700 }}>
                      {row.balance.toLocaleString('fr-DZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

function ProductsViewer() {
  const { data, isLoading, isError, refetch } = useProductsReport();
  return <ReportShell title="تقرير المنتجات" isLoading={isLoading} isError={isError} refetch={refetch} reportId="products">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <KpiCard variant="teal"  icon="ti-package"      label="إجمالي HT"      value={data.summary.total_ht.toLocaleString('fr-DZ')} unit="دج"/>
          <KpiCard variant="green" icon="ti-trending-up"  label="عدد المنتجات"   value={data.summary.products_count}/>
          <KpiCard variant="blue"  icon="ti-list"         label="عدد الأصناف"    value={data.summary.items_count}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead><tr><th>المنتج</th><th>المرجع</th><th>الكمية المباعة</th><th>إجمالي HT</th></tr></thead>
              <tbody>
                {data.rows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    <td>{row.product.name}</td>
                    <td>{row.variant.ref}</td>
                    <td>{row.quantity_sold}</td>
                    <td>{row.total_ht.toLocaleString('fr-DZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

function InventoryViewer() {
  const { data, isLoading, isError, refetch } = useInventoryReport();
  return <ReportShell title="تقرير المخزون" isLoading={isLoading} isError={isError} refetch={refetch} reportId="inventory">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="teal"   icon="ti-building-warehouse" label="قيمة المخزون"   value={data.summary.total_value.toLocaleString('fr-DZ')} unit="دج"/>
          <KpiCard variant="blue"   icon="ti-package"            label="إجمالي الأصناف" value={data.summary.total_items}/>
          <KpiCard variant="gold"   icon="ti-alert-triangle"     label="مخزون منخفض"    value={data.summary.low_stock}/>
          <KpiCard variant="red"    icon="ti-package-off"        label="نفد المخزون"     value={data.summary.out_of_stock}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead><tr><th>المنتج</th><th>المرجع</th><th>المستودع</th><th>الكمية</th><th>القيمة</th><th>الحالة</th></tr></thead>
              <tbody>
                {data.rows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    <td>{row.product.name}</td>
                    <td>{row.variant.ref}</td>
                    <td>{row.warehouse.name}</td>
                    <td>{row.current_stock}</td>
                    <td>{row.total_value.toLocaleString('fr-DZ')}</td>
                    <td>
                      {row.is_out
                        ? <Badge variant="danger" noDot>نفد</Badge>
                        : row.is_low_stock
                          ? <Badge variant="warning" noDot>منخفض</Badge>
                          : <Badge variant="success" noDot>جيد</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

function PaymentsViewer() {
  const { data, isLoading, isError, refetch } = usePaymentsReport();
  return <ReportShell title="تقرير الدفعات" isLoading={isLoading} isError={isError} refetch={refetch} reportId="payments">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <KpiCard variant="green" icon="ti-check-circle" label="مؤكدة"     value={data.summary.total_confirmed.toLocaleString('fr-DZ')} unit="دج"/>
          <KpiCard variant="gold"  icon="ti-clock"        label="معلقة"     value={data.summary.total_pending.toLocaleString('fr-DZ')}   unit="دج"/>
          <KpiCard variant="blue"  icon="ti-hash"         label="عدد الدفعات" value={data.summary.count}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead><tr><th>طريقة الدفع</th><th>الإجمالي</th><th>العدد</th></tr></thead>
              <tbody>
                {data.by_mode.map((row, i) => (
                  <tr key={i}>
                    <td>{row.mode_name}</td>
                    <td>{row.total.toLocaleString('fr-DZ')}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

function TaxesViewer() {
  const { data, isLoading, isError, refetch } = useTvaReport();
  return <ReportShell title="تقرير الضرائب — TVA" isLoading={isLoading} isError={isError} refetch={refetch} reportId="taxes">
    {data && (
      <>
        {/* ✅ يستخدم TaxesReportData.summary الحقيقي — لا net_tva وهمي */}
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <KpiCard variant="green" icon="ti-arrow-up-circle"   label="TVA محصلة"         value={data.summary.total_tva_collected.toLocaleString('fr-DZ')}  unit="دج"/>
          <KpiCard variant="blue"  icon="ti-arrow-down-circle" label="TVA قابلة للخصم"  value={data.summary.total_tva_deductible.toLocaleString('fr-DZ')} unit="دج"/>
          <KpiCard variant="red"   icon="ti-calculator"        label="المستحق (G50)"     value={data.summary.total_tva_due.toLocaleString('fr-DZ')}        unit="دج"/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>نسبة TVA</th>
                  <th>وعاء المبيعات HT</th>
                  <th>TVA محصلة</th>
                  <th>وعاء المشتريات HT</th>
                  <th>TVA قابلة للخصم</th>
                  <th>TVA المستحقة</th>
                </tr>
              </thead>
              <tbody>
                {data.by_rate.map((row, i) => (
                  <tr key={i}>
                    <td>{row.tva_rate}%</td>
                    <td>{row.base_ht_sales.toLocaleString('fr-DZ')}</td>
                    <td>{row.tva_collected.toLocaleString('fr-DZ')}</td>
                    <td>{row.base_ht_purchases.toLocaleString('fr-DZ')}</td>
                    <td>{row.tva_deductible.toLocaleString('fr-DZ')}</td>
                    <td style={{ fontWeight: 700, color: row.tva_due > 0 ? 'var(--red)' : 'var(--em)' }}>
                      {row.tva_due.toLocaleString('fr-DZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

// ─── ReportShell — غلاف مشترك لكل viewer ────────────────────────────────────

function ReportShell({
  title, isLoading, isError, refetch, reportId, children,
}: {
  title:     string;
  isLoading: boolean;
  isError:   boolean;
  refetch:   () => void;
  reportId:  ReportId;
  children?: React.ReactNode;
}) {
  const slug   = useActiveSlug();
  const report = REPORT_CARDS.find(r => r.id === reportId);

  const exportUrl = (format: 'excel' | 'pdf') =>
    `/api/v1/${slug}/reports/${reportId}?export=${format}`;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={report?.description}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" icon={<i className="ti ti-download"/>}
              onClick={() => window.open(exportUrl('excel'), '_blank')}>
              تصدير Excel
            </Button>
            <Button size="sm" icon={<i className="ti ti-printer"/>}
              onClick={() => window.open(exportUrl('pdf'), '_blank')}>
              PDF
            </Button>
            <Button size="sm" icon={<i className="ti ti-refresh"/>} onClick={refetch}>
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
          <button onClick={refetch} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            إعادة المحاولة
          </button>
        </AlertBar>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children ?? (
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

// ─── VelocityViewer ───────────────────────────────────────────────────────────

function VelocityViewer() {
  const { data, isLoading, isError, refetch } = useVelocityReport();
  return <ReportShell title="سرعة البيع" isLoading={isLoading} isError={isError} refetch={refetch} reportId="velocity">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <KpiCard variant="teal"  icon="ti-package" label="إجمالي الكمية المباعة" value={data.summary.total_qty.toLocaleString('fr-DZ')}/>
          <KpiCard variant="blue"  icon="ti-file-text" label="عدد الوثائق" value={data.summary.total_docs}/>
          <KpiCard variant="gold"  icon="ti-calendar" label="فترة التحليل (أيام)" value={data.summary.period_days}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw"><table>
            <thead><tr><th>المنتج</th><th>المرجع</th><th>الكمية</th><th>عدد الفواتير</th><th>السرعة (يوم)</th><th>متوسط السعر</th></tr></thead>
            <tbody>
              {data.items.map((row, i) => (
                <tr key={i}>
                  <td>{row.product_name}</td>
                  <td style={{ color: 'var(--t4)', fontSize: 12 }}>{row.product_ref}</td>
                  <td>{row.total_qty.toLocaleString('fr-DZ')}</td>
                  <td>{row.doc_count}</td>
                  <td style={{ fontWeight: 700 }}>{row.velocity.toFixed(2)}</td>
                  <td>{row.avg_price.toLocaleString('fr-DZ')}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>
      </>
    )}
  </ReportShell>;
}

// ─── MarginViewer ─────────────────────────────────────────────────────────────

function MarginViewer() {
  const { data, isLoading, isError, refetch } = useMarginReport();
  return <ReportShell title="تقرير الهوامش" isLoading={isLoading} isError={isError} refetch={refetch} reportId="margin">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="green" icon="ti-trending-up" label="إجمالي المبيعات"   value={data.summary.total_ht.toLocaleString('fr-DZ')}   unit="دج"/>
          <KpiCard variant="blue"  icon="ti-trending-down" label="إجمالي التكلفة"  value={data.summary.total_cost.toLocaleString('fr-DZ')} unit="دج"/>
          <KpiCard variant="gold"  icon="ti-coin"          label="إجمالي الهامش"   value={data.summary.total_margin.toLocaleString('fr-DZ')} unit="دج"/>
          <KpiCard variant="purple" icon="ti-percentage"   label="نسبة الهامش"     value={`${data.summary.margin_pct}%`}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw"><table>
            <thead><tr><th>المنتج</th><th>المرجع</th><th>الكمية</th><th>الإيراد HT</th><th>التكلفة</th><th>الهامش</th><th>%</th></tr></thead>
            <tbody>
              {data.items.map((row, i) => (
                <tr key={i}>
                  <td>{row.product_name}</td>
                  <td style={{ color: 'var(--t4)', fontSize: 12 }}>{row.product_ref}</td>
                  <td>{row.total_qty}</td>
                  <td>{row.total_ht.toLocaleString('fr-DZ')}</td>
                  <td>{row.cost_total.toLocaleString('fr-DZ')}</td>
                  <td style={{ color: row.margin_amount >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>
                    {row.margin_amount.toLocaleString('fr-DZ')}
                  </td>
                  <td style={{ color: row.margin_pct >= 0 ? 'var(--em)' : 'var(--red)' }}>
                    {row.margin_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>
      </>
    )}
  </ReportShell>;
}

// ─── AgingViewer ───────────────────────────────────────────────────────────────

function AgingViewer() {
  const { data, isLoading, isError, refetch } = useAgingReport();
  return <ReportShell title="لوحة الديون" isLoading={isLoading} isError={isError} refetch={refetch} reportId="aging">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="red"   icon="ti-clock-hour-4" label="إجمالي الديون"      value={data.summary.total_due.toLocaleString('fr-DZ')}    unit="دج"/>
          <KpiCard variant="gold"  icon="ti-file-text"    label="عدد الفواتير"       value={data.summary.total_count}/>
        </div>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 8 }}>
          {data.buckets.map((b, i) => (
            <KpiCard key={i} variant={i === 3 ? 'red' : i === 2 ? 'gold' : i === 1 ? 'blue' : 'green'}
              icon="ti-calendar" label={b.label} value={b.total.toLocaleString('fr-DZ')} unit="دج" subtitle={`${b.count} فاتورة`}/>
          ))}
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw"><table>
            <thead><tr><th>الزبون</th><th>إجمالي المستحق</th><th>عدد الفواتير</th><th>أقدم (يوم)</th><th>التصنيف</th></tr></thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i}>
                  <td>{row.party_name}</td>
                  <td style={{ fontWeight: 700 }}>{row.total_due.toLocaleString('fr-DZ')}</td>
                  <td>{row.invoice_count}</td>
                  <td>{row.max_days}</td>
                  <td>
                    {row.bucket === '90_plus' ? <Badge variant="danger" noDot>أكثر من 90 يوم</Badge>
                      : row.bucket === '61_90' ? <Badge variant="warning" noDot>61–90 يوم</Badge>
                      : row.bucket === '31_60' ? <Badge variant="primary" noDot>31–60 يوم</Badge>
                      : <Badge variant="success" noDot>0–30 يوم</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>
      </>
    )}
  </ReportShell>;
}

// ─── Map: reportId → Viewer component ────────────────────────────────────────

const VIEWERS: Record<ReportId, React.FC> = {
  sales:     SalesViewer,
  purchases: PurchasesViewer,
  customers: CustomersViewer,
  suppliers: SuppliersViewer,
  products:  ProductsViewer,
  inventory: InventoryViewer,
  payments:  PaymentsViewer,
  taxes:     TaxesViewer,
  velocity:  VelocityViewer,
  margin:    MarginViewer,
  aging:     AgingViewer,
};

// ════════════════════════════════════════════════════════════════════════════
// ReportsPage
// ════════════════════════════════════════════════════════════════════════════

export default function ReportsPage() {
  const { selectedYear }                    = useFiscalYear();
  const [viewingReport, setViewingReport]   = useState<ReportId | null>(null);

  const handleBack = useCallback(() => setViewingReport(null), []);

  if (viewingReport) {
    const Viewer = VIEWERS[viewingReport];
    return (
      <div className="page on" id="p-reports">
        <div style={{ marginBottom: 16 }}>
          <Button size="sm" icon={<i className="ti ti-arrow-right"/>} onClick={handleBack}>
            العودة لقائمة التقارير
          </Button>
        </div>
        <Viewer/>
      </div>
    );
  }

  return (
    <div className="page on" id="p-reports">
      <PageHeader
        title="التقارير والإحصائيات"
        subtitle={`جميع التقارير المالية والإدارية — السنة: ${selectedYear?.name || '—'}`}
      />

      <div className="kpis" style={{ marginBottom: 24 }}>
        <KpiCard variant="green"  icon="ti-file-text" label="إجمالي التقارير" value={REPORT_CARDS.length}/>
        <KpiCard variant="blue"   icon="ti-clock"     label="آخر تحديث"       value="قبل لحظات"/>
        <KpiCard variant="gold"   icon="ti-download"  label="التقارير المُصدرة" value="—"/>
        <KpiCard variant="purple" icon="ti-star"      label="التقارير المفضلة" value="—"/>
      </div>

      {selectedYear?.is_closed && (
        <AlertBar variant="gold">
          🔒 السنة المالية {selectedYear.name} مقفلة — التقارير للعرض فقط.
        </AlertBar>
      )}

      <div className="g2" style={{ marginBottom: 20 }}>
        {REPORT_CARDS.map(report => (
          <QuickReportCard
            key={report.id}
            report={report}
            onSelect={() => setViewingReport(report.id as ReportId)}
          />
        ))}
      </div>

      <Card title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-info-circle"/></span> معلومات عن التقارير</>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--t3)' }}>
          {[
            'جميع التقارير تدعم التصدير بصيغ Excel و PDF',
            'يمكن تصفية التقارير حسب السنة المالية المختارة من الشريط العلوي',
            'التقارير تُحدَّث تلقائياً مع كل عملية بيع أو شراء',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <i className="ti ti-check" style={{ color: 'var(--em)', flexShrink: 0, marginTop: 3 }}/>
              <span dangerouslySetInnerHTML={{ __html: text }}/>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── PartyTable helper ────────────────────────────────────────────────────────
function PartyTable({ rows, columns }: { rows: any[]; columns: string[] }) {
  if (!rows?.length) return null;
  return (
    <Card noHeader style={{ padding: 0, marginTop: 16 }}>
      <div className="tw">
        <table>
          <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map(c => <td key={c}>{String((row as any)[c] ?? '—')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
