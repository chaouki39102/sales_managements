// resources/js/pos/components/SessionStatsModal.tsx — v2 احترافي
import { useState, useMemo } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import { useActiveCompany } from '@/lib/store/appStore';
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
import TemplatePrintModal from '@/pages/settings/print-settings/components/shared/TemplatePrintModal';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';

interface Props {
  session:      PosSession;
  onClose:      () => void;
  onEndSession: () => void;
}

type Tab = 'overview' | 'payments' | 'products' | 'timeline';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview',  label: 'لوحة البيانات',  icon: 'ti-layout-dashboard' },
  { key: 'payments',  label: 'وسائل الدفع',   icon: 'ti-credit-card'       },
  { key: 'products',  label: 'المنتجات',       icon: 'ti-package'            },
];

export default function SessionStatsModal({ session, onClose, onEndSession }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const companyInfo = mapCompany(useActiveCompany());

  const { data: reportTemplates = [] } = usePrintTemplatesList('RPT');

  const reportData = useMemo(
    () => companyInfo ? DocumentDataBuilder.fromSessionReport(session as unknown as Record<string, unknown>, companyInfo) : null,
    [session, companyInfo],
  );

  const paymentRows = useMemo(() =>
    (session.payments ?? []).filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount),
    [session.payments],
  );
  const topProducts = useMemo(() =>
    (session.top_products ?? []).sort((a, b) => b.total_ttc - a.total_ttc).slice(0, 10),
    [session.top_products],
  );

  const totalCollected = Number(session.cash_collected ?? 0)
    + Number(session.cib_collected ?? 0)
    + Number(session.ccp_collected ?? 0)
    + Number(session.bank_collected ?? 0);
  const maxPayAmt   = Math.max(...paymentRows.map(p => p.amount), 1);
  const maxProdTtc  = Math.max(...topProducts.map(p => p.total_ttc), 1);
  const netSalesPct = session.gross_sales > 0
    ? (session.net_sales / session.gross_sales) * 100 : 100;

  // KPI cards
  const kpiBlocks = [
    {
      title: 'المبيعات الصافية',
      value: formatDZD(session.net_sales),
      sub: `إجمالي: ${formatDZD(session.gross_sales)}`,
      icon: 'ti-cash', color: 'var(--em)', bg: 'var(--emb)', size: 'lg',
    },
    {
      title: 'الفواتير',
      value: String(session.invoices_count),
      sub: `متوسط: ${formatDZD(session.avg_invoice ?? 0)}`,
      icon: 'ti-receipt', color: 'var(--blue)', bg: 'var(--blueb)', size: 'md',
    },
    {
      title: 'أعلى فاتورة',
      value: formatDZD(session.highest_invoice ?? 0),
      sub: `مدة الجلسة: ${session.duration}`,
      icon: 'ti-trending-up', color: 'var(--purple)', bg: 'var(--purb)', size: 'md',
    },
    {
      title: 'الخصومات',
      value: formatDZD(session.total_discount ?? 0),
      sub: 'إجمالي الخصومات المُمنوحة',
      icon: 'ti-discount', color: 'var(--orange)', bg: 'var(--orb)', size: 'sm',
    },
    {
      title: 'TVA',
      value: formatDZD(session.total_tva ?? 0),
      sub: 'ضريبة القيمة المضافة',
      icon: 'ti-percentage', color: 'var(--teal)', bg: 'var(--tealb)', size: 'sm',
    },
    {
      title: 'المرتجعات',
      value: formatDZD(session.returns_total ?? 0),
      sub: `${session.returns_count ?? 0} مرتجع`,
      icon: 'ti-receipt-refund', color: 'var(--red)', bg: 'var(--redb)', size: 'sm',
    },
  ];

  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="ssm-wrap"
        onClick={e => e.stopPropagation()}
      >
        {/* ════ Header ════ */}
        <div className="ssm-header">
          {/* شريط الجلسة */}
          <div className="ssm-session-bar">
            <div className="ssm-session-avatar">
              {session.user?.name?.charAt(0) ?? '?'}
            </div>
            <div className="ssm-session-info">
              <div className="ssm-session-name">{session.user?.name}</div>
              <div className="ssm-session-meta">
                <i className="ti ti-building-warehouse" />
                {session.warehouse?.name}
                <span>·</span>
                <i className="ti ti-clock" />
                فُتحت {new Date(session.opened_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                <span>·</span>
                <i className="ti ti-hourglass" />
                {session.duration}
              </div>
            </div>
            <div className={`ssm-status-pill ${session.status !== 'open' ? 'ssm-status-pill--closed' : ''}`}>
              <span className={`ssm-status-dot ${session.status !== 'open' ? 'ssm-status-dot--closed' : ''}`} />
              {session.status === 'open' ? 'جلسة مفتوحة' : session.status === 'closed' ? 'جلسة مغلقة' : 'جلسة معلقة'}
            </div>
          </div>

          {/* tabs */}
          <div className="ssm-tabs">
            {TABS.map(t => (
              <button
                key={t.key}
                type="button"
                className={`ssm-tab ${tab === t.key ? 'on' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <i className={`ti ${t.icon}`} />
                {t.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button className="m-x" onClick={onClose} type="button">
              <i className="ti ti-x" />
            </button>
          </div>
        </div>

        {/* ════ Body ════ */}
        <div className="ssm-body">

          {/* ══ لوحة البيانات ══ */}
          {tab === 'overview' && (
            <>
              {/* KPI Grid */}
              <div className="ssm-kpi-grid">
                {kpiBlocks.map(k => (
                  <div
                    key={k.title}
                    className={`ssm-kpi ssm-kpi--${k.size}`}
                    style={{ '--kc': k.color, '--kb': k.bg } as any}
                  >
                    <div className="ssm-kpi-header">
                      <div className="ssm-kpi-icon">
                        <i className={`ti ${k.icon}`} />
                      </div>
                      <div className="ssm-kpi-title">{k.title}</div>
                    </div>
                    <div className="ssm-kpi-value" style={{ direction: 'ltr' }}>{k.value}</div>
                    <div className="ssm-kpi-sub">{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* شريط صافي المبيعات */}
              <div className="ssm-progress-section">
                <div className="ssm-ps-row">
                  <span className="ssm-ps-label">الصافي من الإجمالي (بعد المرتجعات)</span>
                  <span className="ssm-ps-pct">{netSalesPct.toFixed(1)}%</span>
                </div>
                <div className="ssm-progress-bar">
                  <div className="ssm-pb-fill" style={{ width: `${netSalesPct}%` }} />
                </div>
              </div>

              {/* ملخص سريع وسائل الدفع */}
              {paymentRows.length > 0 && (
                <div className="ssm-quick-pay">
                  <div className="ssm-section-title">
                    <i className="ti ti-credit-card" /> ملخص الدفع
                  </div>
                  <div className="ssm-quick-pay-grid">
                    {paymentRows.map(p => (
                      <div key={p.payment_mode_id} className="ssm-qp-item">
                        <div className="ssm-qp-name">
                          {p.payment_mode?.name ?? `#${p.payment_mode_id}`}
                        </div>
                        <div className="ssm-qp-amount" style={{ direction: 'ltr' }}>
                          {formatDZD(p.amount)}
                        </div>
                        <div className="ssm-qp-count">{p.count} عملية</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ملاحظة الفتح */}
              {session.opening_note && (
                <div className="ssm-note-row">
                  <i className="ti ti-notes" />
                  <span>{session.opening_note}</span>
                </div>
              )}
            </>
          )}

          {/* ══ وسائل الدفع ══ */}
          {tab === 'payments' && (
            <div className="ssm-payments">
              {/* إجمالي بارز */}
              <div className="ssm-pay-total-banner">
                <div className="ssm-ptb-label">إجمالي المحصَّل (نقد + بطاقات + تحويل)</div>
                <div className="ssm-ptb-amount" style={{ direction: 'ltr' }}>
                  {formatDZD(totalCollected)}
                </div>
                {(session.credit_total ?? 0) > 0 && (
                  <div className="ssm-ptb-credit">
                    + {formatDZD(session.credit_total ?? 0)} آجل غير مقبوض
                  </div>
                )}
              </div>

              {paymentRows.length === 0 ? (
                <div className="ssm-empty">
                  <i className="ti ti-credit-card" />
                  <span>لا توجد مدفوعات مسجَّلة بعد</span>
                </div>
              ) : (
                <div className="ssm-pay-list">
                  {paymentRows.map((p, i) => {
                    const pct = session.net_sales > 0
                      ? (p.amount / session.net_sales) * 100 : 0;
                    const barW = (p.amount / maxPayAmt) * 100;
                    const colors = [
                      ['var(--em)',     'var(--emb)'],
                      ['var(--blue)',   'var(--blueb)'],
                      ['var(--purple)', 'var(--purb)'],
                      ['var(--teal)',   'var(--tealb)'],
                      ['var(--orange)', 'var(--orb)'],
                      ['var(--gold)',   'var(--goldb)'],
                    ][i % 6];

                    return (
                      <div key={p.payment_mode_id} className="ssm-pay-card">
                        <div className="ssm-pay-card-header">
                          <div
                            className="ssm-pay-icon"
                            style={{ background: colors[1], color: colors[0] }}
                          >
                            <i className="ti ti-credit-card" />
                          </div>
                          <div className="ssm-pay-card-info">
                            <div className="ssm-pay-card-name">
                              {p.payment_mode?.name ?? `#${p.payment_mode_id}`}
                            </div>
                            <div className="ssm-pay-card-meta">
                              {p.count} عملية · {pct.toFixed(1)}% من الإجمالي
                            </div>
                          </div>
                          <div
                            className="ssm-pay-card-amount"
                            style={{ color: colors[0], direction: 'ltr' }}
                          >
                            {formatDZD(p.amount)}
                          </div>
                        </div>
                        <div className="ssm-pay-card-bar">
                          <div
                            className="ssm-pay-card-bar-fill"
                            style={{ width: `${barW}%`, background: colors[0] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ المنتجات ══ */}
          {tab === 'products' && (
            <div className="ssm-products">
              {topProducts.length === 0 ? (
                <div className="ssm-empty">
                  <i className="ti ti-package" />
                  <span>لا توجد منتجات مسجَّلة بعد</span>
                </div>
              ) : (
                <>
                  <div className="ssm-prod-header-row">
                    <span>#</span>
                    <span>المنتج</span>
                    <span style={{ textAlign: 'center' }}>الكمية</span>
                    <span style={{ textAlign: 'left' }}>الإجمالي</span>
                    <span style={{ textAlign: 'left', minWidth: 80 }}>النسبة</span>
                  </div>
                  {topProducts.map((p, i) => {
                    const barW = (p.total_ttc / maxProdTtc) * 100;
                    return (
                      <div key={p.product_id} className="ssm-prod-row">
                        <div className={`ssm-prod-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
                        <div className="ssm-prod-info">
                          <div className="ssm-prod-name">{p.product_name}</div>
                          <div className="ssm-prod-bar">
                            <div
                              className="ssm-prod-bar-fill"
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                        </div>
                        <div className="ssm-prod-qty">
                          <span>×{p.quantity_sold % 1 === 0 ? p.quantity_sold : p.quantity_sold.toFixed(2)}</span>
                        </div>
                        <div className="ssm-prod-ttc" style={{ direction: 'ltr' }}>
                          {formatDZD(p.total_ttc)}
                        </div>
                        <div className="ssm-prod-pct">
                          {session.net_sales > 0
                            ? ((p.total_ttc / session.net_sales) * 100).toFixed(1)
                            : 0}%
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* ════ Footer ════ */}
        <div className="ssm-footer">
          {session.status === 'open' && (
            <button
              type="button"
              className="ssm-btn-end"
              onClick={onEndSession}
            >
              <i className="ti ti-door-exit" /> إغلاق الجلسة
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="ssm-btn-print"
            onClick={() => setPrintModalOpen(true)}
          >
            <i className="ti ti-printer" /> طباعة التقرير
          </button>
          <button type="button" className="ssm-btn-close" onClick={onClose}>
            <i className="ti ti-x" /> إغلاق
          </button>
        </div>
      </div>

      {/* ════ Template Print Modal ════ */}
      {reportData && companyInfo && (
        <TemplatePrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          data={reportData}
          company={companyInfo}
          templates={reportTemplates}
          docTypeCode="RPT"
        />
      )}
    </div>
  );
}
