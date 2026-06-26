// resources/js/pages/settings/print-settings/ReceiptPreview.tsx
// معاينة الإيصال الحراري 80mm — كل العناصر تتحكم بها قيم القالب
// تدعم بيانات حية (liveData) أو بيانات تجريبية (MOCK) كـ fallback

import React from 'react';
import type { ReceiptTemplate80mm, ColumnKey, CompanyPreviewData, ReceiptLiveData } from './types';

const MOCK_COMPANY: CompanyPreviewData = {
  name:    'سوبيرات الوفرة',
  address: 'حي 08 ماي، بجانب القاعدة الجنوبية — الوادي',
  phone:   '029 123 456',
  nif:     '099217700002',
  rc:      '13/B.0123456',
  nis:     '099217700002',
  ice:     '099217700002',
  article: 'تجارة التجزئة للمواد الغذائية',
};

const MOCK = {
  number: 'FV-2025-001770',
  date:   '2026-06-26',
  time:   '14:35',
  dueDate: '2026-07-26',
  cashier: 'أحمد بن علي',
  client:  'سوبيرات الوفرة',
  clientTaxId: '099217700002',
  clientPhone: '029 123 456',
  clientAddress: 'حي 08 ماي، الوادي',
  session: 'جلسة #1770',
  paymentTerm: '30 يوم',
  items: [
    { ref: 'R001', name: 'روز أبيض فراكة 500غ',    qty: 3,  price: 85,  total: 255,  tva: 9,  discount: 0,    unit: 'قطعة' },
    { ref: 'L002', name: 'عدس فراكة 500غ',          qty: 1,  price: 109, total: 109,  tva: 9,  discount: 0,    unit: 'قطعة' },
    { ref: 'L003', name: 'لبن صومام بالفيدوس 1ل',  qty: 1,  price: 140, total: 140,  tva: 19, discount: 10,   unit: 'لتر'  },
    { ref: 'S004', name: 'سيدي السعادة 1ل',         qty: 1,  price: 165, total: 165,  tva: 9,  discount: 0,    unit: 'قطعة' },
  ],
  tvaByRate: [
    { rate: 9,  base: 420, amount: 37.80 },
    { rate: 19, base: 140, amount: 26.60 },
  ],
  totalHt:      614.50,
  totalTva:      54.50,
  totalDiscount: 10,
  fiscalStamp:   50,
  totalTtc:     709.00,
  paid:         669.00,
  change:       0,
  remaining:    40,
  prevBalance:  1200.00,
  newBalance:   1240.00,
  payments: [{ mode: 'نقداً', amount: 669 }],
};

interface ReceiptData {
  number: string;
  date: string;
  time: string;
  dueDate: string;
  cashier: string;
  client: string;
  clientTaxId: string;
  clientPhone: string;
  clientAddress: string;
  session: string;
  paymentTerm: string;
  items: Array<{ ref: string; name: string; qty: number; price: number; total: number; tva: number; discount: number; unit: string }>;
  tvaByRate: Array<{ rate: number; base: number; amount: number }>;
  totalHt: number;
  totalTva: number;
  totalDiscount: number;
  fiscalStamp: number;
  totalTtc: number;
  paid: number;
  change: number;
  remaining: number;
  prevBalance: number;
  newBalance: number;
  payments: Array<{ mode: string; amount: number }>;
}

function buildTvaByRate(items: ReceiptLiveData['items'] = []): Array<{ rate: number; base: number; amount: number }> {
  const map = new Map<number, { base: number; amount: number }>();
  for (const item of items) {
    const rate = Math.round((item.tva_rate ?? 0) * 100);
    const base = item.total_ht ?? 0;
    const tva  = base * (item.tva_rate ?? 0);
    const prev = map.get(rate) ?? { base: 0, amount: 0 };
    map.set(rate, { base: prev.base + base, amount: prev.amount + tva });
  }
  return Array.from(map.entries()).map(([rate, v]) => ({ rate, ...v }));
}

function buildReceiptData(tpl: ReceiptTemplate80mm, liveData?: ReceiptLiveData | null): ReceiptData {
  if (!liveData) return MOCK;
  return {
    number:  liveData.docNumber  ?? '',
    date:    liveData.docDate    ?? new Date().toLocaleDateString('ar-DZ'),
    time:    new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    dueDate: '',
    cashier: liveData.cashierName ?? '',
    client:  liveData.client?.name ?? '',
    clientTaxId: liveData.client?.nif ?? '',
    clientPhone: liveData.client?.phone ?? '',
    clientAddress: liveData.client?.address ?? '',
    session: '',
    paymentTerm: '',
    items: (liveData.items ?? []).map((item, i) => ({
      ref:      item.ref ?? `P${i + 1}`,
      name:     item.name,
      qty:      item.qty,
      price:    item.unit_price_ht,
      total:    item.total_ht,
      tva:      Math.round((item.tva_rate ?? 0) * 100),
      discount: item.discount_percentage ?? 0,
      unit:     item.unit ?? '',
    })),
    tvaByRate: buildTvaByRate(liveData.items),
    totalHt:       liveData.totals?.total_ht       ?? 0,
    totalTva:      liveData.totals?.total_tva      ?? 0,
    totalDiscount: liveData.totals?.total_discount ?? 0,
    fiscalStamp:   liveData.totals?.fiscal_stamp   ?? 0,
    totalTtc:      liveData.totals?.total_ttc      ?? 0,
    paid:          liveData.totals?.paid           ?? 0,
    change:        liveData.totals?.change         ?? 0,
    remaining:     liveData.totals?.remaining      ?? 0,
    prevBalance:   liveData.prevBalance            ?? 0,
    newBalance:    liveData.newBalance             ?? 0,
    payments:      liveData.payments               ?? [],
  };
}

function getCompany(tpl: ReceiptTemplate80mm, api?: CompanyPreviewData | null): CompanyPreviewData {
  return {
    name:    tpl.companyName    || api?.name    || MOCK_COMPANY.name,
    address: tpl.companyAddress || api?.address  || MOCK_COMPANY.address,
    phone:   tpl.companyPhone   || api?.phone   || MOCK_COMPANY.phone,
    nif:     tpl.companyNif     || api?.nif     || MOCK_COMPANY.nif,
    rc:      tpl.companyRc      || api?.rc      || MOCK_COMPANY.rc,
    nis:     tpl.companyNis     || api?.nis     || MOCK_COMPANY.nis,
    ice:     tpl.companyIce     || api?.ice     || MOCK_COMPANY.ice,
    article: tpl.companyArticle || api?.article || MOCK_COMPANY.article,
    logoUrl: api?.logoUrl,
  };
}

const px = (mm: number) => mm * 3.78;

interface PreviewProps {
  tpl: ReceiptTemplate80mm;
  company?: CompanyPreviewData | null;
  liveData?: ReceiptLiveData | null;
}

export default function ReceiptPreview({ tpl, company, liveData }: PreviewProps) {
  const co = getCompany(tpl, company);
  const data = buildReceiptData(tpl, liveData);

  const paperPx = Math.round(tpl.paperWidth * 3.78);

  return (
    <div
      style={{
        width: paperPx,
        fontFamily: tpl.itemsFontFamily === 'monospace' ? "'Courier New', monospace" : "'Tajawal', sans-serif",
        fontSize: tpl.baseFontSize,
        padding: `${px(tpl.marginTop)}px ${px(tpl.marginSides)}px ${px(tpl.marginBottom)}px`,
        lineHeight: tpl.lineSpacing,
        background: '#fff',
        color: '#111',
        direction: 'rtl',
      }}
    >
      <HeaderSection tpl={tpl} company={co} />
      <DocInfoSection tpl={tpl} data={data} />
      <ItemsSection tpl={tpl} items={data.items} />
      <TotalsSection tpl={tpl} data={data} />
      {tpl.showPaymentDetails && <PaymentsSection tpl={tpl} payments={data.payments} />}
      <FooterSection tpl={tpl} data={data} />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
function HeaderSection({ tpl, company }: { tpl: ReceiptTemplate80mm; company: CompanyPreviewData }) {
  return (
    <div style={{ textAlign: tpl.companyInfoAlign, marginBottom: 6 }}>
      {tpl.showLogo && (
        <div style={{
          display: 'flex',
          justifyContent: tpl.logoAlign === 'right' ? 'flex-start' : tpl.logoAlign === 'left' ? 'flex-end' : 'center',
          marginBottom: 4,
        }}>
          {company.logoUrl ? (
            <img src={company.logoUrl} alt="logo"
              style={{ width: tpl.logoSize, height: tpl.logoSize, objectFit: 'contain', borderRadius: 4 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div style={{
              width: tpl.logoSize, height: tpl.logoSize,
              background: '#111', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: tpl.logoSize * 0.3, fontWeight: 900,
            }}>
              {company.name.charAt(0)}
            </div>
          )}
        </div>
      )}
      {tpl.showCompanyName && (
        <div style={{
          fontSize: tpl.companyNameSize,
          fontWeight: tpl.companyNameBold ? 900 : 400,
          textAlign: tpl.companyNameAlign,
          fontFamily: "'Tajawal', sans-serif",
          letterSpacing: 1,
          marginBottom: 2,
        }}>
          *** {company.name} ***
        </div>
      )}
      {tpl.headerCustomText && (
        <div style={{ fontSize: tpl.companyInfoFontSize - 1, color: '#444', marginBottom: 2 }}>
          {tpl.headerCustomText}
        </div>
      )}
      <CompanyInfoBlock tpl={tpl} company={company} />
      {tpl.headerSeparator !== 'none' && <Sep style={tpl.headerSeparator} />}
    </div>
  );
}

function CompanyInfoBlock({ tpl, company }: { tpl: ReceiptTemplate80mm; company: CompanyPreviewData }) {
  const fs = tpl.companyInfoFontSize;
  const c = '#444';
  return (
    <div style={{ fontSize: fs }}>
      {tpl.showAddress && <div style={{ color: c }}>{company.address}</div>}
      {tpl.showPhone   && <div style={{ color: c }}>☎ {company.phone}</div>}
      {tpl.showTaxId   && <div style={{ color: c }}>NIF: {company.nif}</div>}
      {tpl.showRc      && <div style={{ color: c }}>RC: {company.rc}</div>}
      {tpl.showNis     && <div style={{ color: c }}>NIS: {company.nis}</div>}
      {tpl.showIce     && <div style={{ color: c }}>ICE: {company.ice}</div>}
      {tpl.showArticle && <div style={{ color: c }}>{company.article}</div>}
    </div>
  );
}

// ─── Document Info ───────────────────────────────────────────────────────────
function DocInfoSection({ tpl, data }: { tpl: ReceiptTemplate80mm; data: ReceiptData }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        textAlign: tpl.titleAlign,
        fontSize: tpl.titleFontSize,
        fontWeight: tpl.titleBold ? 900 : 400,
        margin: '4px 0',
      }}>
        ── {tpl.titleText} ──
      </div>

      <table style={{ width: '100%', fontSize: tpl.companyInfoFontSize, borderCollapse: 'collapse' }}>
        <tbody>
          {tpl.showDocNumber && <InfoRow label="رقم الفاتورة" value={data.number} />}
          {tpl.showDate      && <InfoRow label="التاريخ"      value={data.date} />}
          {tpl.showTime      && <InfoRow label="الوقت"        value={data.time} />}
          {tpl.showDueDate   && <InfoRow label="تاريخ الاستحقاق" value={data.dueDate} />}
          {tpl.showCashier   && <InfoRow label="الكاشير"      value={data.cashier} />}
          {tpl.showClient    && <InfoRow label="العميل"       value={data.client} />}
          {tpl.showClientTaxId && <InfoRow label="رقم ضريبة العميل" value={data.clientTaxId} />}
          {tpl.showClientPhone && <InfoRow label="هاتف العميل" value={data.clientPhone} />}
          {tpl.showClientAddress && <InfoRow label="عنوان العميل" value={data.clientAddress} />}
          {tpl.showSession   && <InfoRow label="الجلسة"      value={data.session} />}
          {tpl.showPaymentTerm && <InfoRow label="شروط الدفع" value={data.paymentTerm} />}
        </tbody>
      </table>

      {tpl.docSeparator !== 'none' && <Sep style={tpl.docSeparator} />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ color: '#555', padding: '1px 0', whiteSpace: 'nowrap', width: 1 }}>{label}:</td>
      <td style={{ fontWeight: 600, textAlign: 'left', padding: '1px 0', paddingRight: 8 }}>{value}</td>
    </tr>
  );
}

// ─── Items Table ─────────────────────────────────────────────────────────────
function ItemsSection({ tpl, items }: { tpl: ReceiptTemplate80mm; items: ReceiptData['items'] }) {
  const cols = getVisibleCols(tpl);
  if (cols.length === 0) return null;

  const gridCols = cols.map(c => `${tpl.colWidths[c] ?? 20}%`).join(' ');

  return (
    <div style={{ marginBottom: 4 }}>
      {tpl.showColHeader && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          fontWeight: tpl.tableHeaderBold ? 900 : 600,
          fontSize: tpl.fontSizeItems - 0.5,
          borderBottom: `1px ${tpl.tableBorderStyle === 'none' ? 'solid' : tpl.tableBorderStyle} #888`,
          background: tpl.tableHeaderBg ? '#f5f5f5' : 'transparent',
          padding: '3px 0',
          gap: 2,
        }}>
          {cols.map(c => (
            <span key={c} style={{
              textAlign: colAlign(c),
              ...(c === 'name' ? { textAlign: 'right' as const } : {}),
            }}>
              {tpl.colHeaders[c] ?? colLabel(c)}
            </span>
          ))}
        </div>
      )}

      {items.map((item, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          fontSize: tpl.fontSizeItems,
          borderBottom: tpl.tableBorderStyle !== 'none' ? `1px ${tpl.tableBorderStyle} #ddd` : 'none',
          background: tpl.alternatingRows && i % 2 === 1 ? '#fafafa' : 'transparent',
          padding: '3px 0',
          gap: 2,
        }}>
          {cols.map(c => (
            <span key={c} style={{
              textAlign: colAlign(c),
              fontWeight: c === 'total' ? 700 : 400,
              ...(c === 'name' ? { fontFamily: "'Tajawal', sans-serif", fontWeight: 600 } : {}),
            }}>
              {colValue(c, item, tpl)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function getVisibleCols(tpl: ReceiptTemplate80mm): ColumnKey[] {
  const alwaysCols: ColumnKey[] = ['name', 'quantity', 'price', 'total'];
  const visible: ColumnKey[] = [];
  for (const key of tpl.colOrder) {
    if (key === 'name' || key === 'quantity' || key === 'price' || key === 'total') {
      visible.push(key);
    } else {
      const showMap: Partial<Record<ColumnKey, boolean>> = {
        rowNumber: tpl.showRowNumber,
        barcode: tpl.showItemBarcode,
        ref: tpl.showRef,
        unit: tpl.showUnit,
        discount: tpl.showItemDiscount,
        tva: tpl.showItemTva,
      };
      if (showMap[key]) visible.push(key);
    }
  }
  return visible.length > 0 ? visible : alwaysCols;
}

function colAlign(c: ColumnKey) {
  switch (c) {
    case 'name': case 'ref': case 'barcode': return 'right';
    case 'rowNumber': return 'center';
    default: return 'left';
  }
}

function colLabel(c: ColumnKey): string {
  const labels: Record<ColumnKey, string> = {
    rowNumber: '#', barcode: 'باركود', ref: 'مرجع',
    name: 'البيان', unit: 'وحدة', quantity: 'كمية',
    price: 'السعر', discount: 'خصم', tva: 'TVA', total: 'المجموع',
  };
  return labels[c];
}

function colValue(c: ColumnKey, item: ReceiptData['items'][0], tpl: ReceiptTemplate80mm) {
  switch (c) {
    case 'name': return item.name;
    case 'quantity': return String(item.qty);
    case 'price': return item.price.toFixed(2);
    case 'total': return item.total.toFixed(2);
    case 'ref': return item.ref;
    case 'unit': return item.unit;
    case 'discount': return item.discount > 0 ? `${item.discount}%` : '';
    case 'tva': return `TVA ${item.tva}%`;
    default: return '';
  }
}

// ─── Totals ──────────────────────────────────────────────────────────────────
function TotalsSection({ tpl, data }: { tpl: ReceiptTemplate80mm; data: ReceiptData }) {
  const fs = tpl.totalsFontSize;
  return (
    <div style={{
      fontSize: fs,
      fontWeight: tpl.totalsBold ? 700 : 400,
      textAlign: tpl.totalsAlign,
      marginBottom: 4,
    }}>
      {tpl.showTotalHt   && <TotalRow label="المجموع HT"       val={data.totalHt} />}
      {tpl.showDiscountTotal && data.totalDiscount > 0 && (
        <TotalRow label="إجمالي الخصومات" val={-data.totalDiscount} red />
      )}
      {tpl.showTotalTva  && <TotalRow label="TVA"              val={data.totalTva} />}
      {tpl.showTvaBreakdown && data.tvaByRate.map(r => (
        <TotalRow key={r.rate} label={`  TVA ${r.rate}%`} val={r.amount} />
      ))}
      {tpl.showFiscalStamp && data.fiscalStamp > 0 && (
        <TotalRow label="الطابع الجبائي" val={data.fiscalStamp} />
      )}

      {tpl.showTotalTtc && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          border: tpl.totalBorderStyle === 'none' ? 'none' :
            `${tpl.totalBorderStyle === 'thick' ? '3px' : '2px'} ${tpl.totalBorderStyle === 'double' ? 'double' : 'solid'} #111`,
          padding: '4px 6px',
          margin: '6px 0',
          fontWeight: tpl.totalTtcBold ? 900 : 700,
          fontSize: tpl.totalTtcFontSize,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          <span>المجموع TTC:</span>
          <span style={{ direction: 'ltr' }}>{data.totalTtc.toFixed(2)}</span>
        </div>
      )}

      {tpl.showAmountInWords && (
        <div style={{ fontSize: fs - 1, fontFamily: "'Tajawal', sans-serif", marginTop: 2, textAlign: 'center' }}>
          <i>فقط: سبعمائة وتسعة دنانير جزائرية</i>
        </div>
      )}

      {tpl.showPaidAmount  && <TotalRow label="المدفوع"       val={data.paid} bold />}
      {tpl.showChange      && <TotalRow label="الباقي"        val={data.change} />}
      {tpl.showRemaining   && <TotalRow label="المبلغ المتبقي" val={data.remaining} />}
      {tpl.showPrevBalance && <TotalRow label="الرصيد السابق"  val={data.prevBalance} />}
      {tpl.showNewBalance  && <TotalRow label="الرصيد الجديد"  val={data.newBalance} bold />}
    </div>
  );
}

function TotalRow({ label, val, red, bold }: { label: string; val: number; red?: boolean; bold?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', marginBottom: 2,
      fontWeight: bold ? 800 : 400, color: red ? '#c00' : 'inherit',
    }}>
      <span>{label}</span>
      <span style={{ direction: 'ltr' }}>{val.toFixed(2)}</span>
    </div>
  );
}

// ─── Payments ────────────────────────────────────────────────────────────────
function PaymentsSection({ tpl, payments }: { tpl: ReceiptTemplate80mm; payments: ReceiptData['payments'] }) {
  return (
    <div style={{ fontSize: tpl.paymentFontSize, marginBottom: 4 }}>
      <Sep style="dashed" />
      {payments.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span>{p.mode}</span>
          <span style={{ direction: 'ltr' }}>{p.amount.toFixed(2)}</span>
        </div>
      ))}
      <Sep style="dashed" />
    </div>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function FooterSection({ tpl, data }: { tpl: ReceiptTemplate80mm; data: ReceiptData }) {
  const hasFooterContent =
    tpl.footerLine1 || tpl.footerLine2 || tpl.footerLine3 ||
    tpl.showThankYou || tpl.showReturnsPolicy || tpl.footerLegalText ||
    tpl.showBarcode || tpl.showQr ||
    tpl.showCashierSignature || tpl.showClientSignature || tpl.showStamp;

  if (!hasFooterContent) return null;

  return (
    <div style={{ textAlign: 'center', fontSize: tpl.baseFontSize - 0.5 }}>
      {tpl.footerSeparator !== 'none' && <Sep style={tpl.footerSeparator} />}

      {tpl.footerLine1 && <div style={{ margin: '2px 0' }}>{tpl.footerLine1}</div>}
      {tpl.footerLine2 && <div style={{ margin: '2px 0' }}>{tpl.footerLine2}</div>}
      {tpl.footerLine3 && <div style={{ margin: '2px 0' }}>{tpl.footerLine3}</div>}

      {tpl.showReturnsPolicy && tpl.returnsPolicyText && (
        <div style={{ fontSize: tpl.baseFontSize - 1, color: '#555', margin: '3px 0' }}>
          {tpl.returnsPolicyText}
        </div>
      )}

      {tpl.showThankYou && (
        <div style={{
          fontFamily: "'Tajawal', sans-serif",
          fontSize: tpl.thankYouFontSize,
          fontWeight: 700,
          margin: '4px 0',
        }}>
          {tpl.thankYouText}
        </div>
      )}

      {tpl.footerLegalText && (
        <div style={{ fontSize: tpl.baseFontSize - 1.5, color: '#888', margin: '3px 0' }}>
          {tpl.footerLegalText}
        </div>
      )}

      {tpl.showBarcode && (
        <div style={{ textAlign: 'center', margin: '8px 0 4px' }}>
          <div style={{ display: 'inline-flex', gap: 1, alignItems: 'flex-end' }}>
            {Array.from({ length: 42 }, (_, i) => (
              <div key={i} style={{
                width: i % 3 === 0 ? 2 : 1,
                height: i % 5 === 0 ? 28 : 22,
                background: '#111',
              }} />
            ))}
          </div>
          <div style={{ fontSize: tpl.baseFontSize - 1, letterSpacing: 2, marginTop: 2 }}>
            {tpl.barcodeContent === 'custom' ? tpl.barcodeCustomText : data.number.replace(/^[A-Z]+-\d+-/, '')}
          </div>
        </div>
      )}

      {tpl.showQr && (
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
          <div style={{
            width: 40, height: 40, margin: '0 auto',
            display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1,
          }}>
            {Array.from({ length: 64 }, (_, i) => (
              <div key={i} style={{
                background: Math.random() > 0.5 ? '#111' : '#fff',
                aspectRatio: '1',
              }} />
            ))}
          </div>
        </div>
      )}

      {(tpl.showCashierSignature || tpl.showClientSignature) && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 12, fontSize: tpl.baseFontSize - 1,
        }}>
          {tpl.showCashierSignature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, height: 1, borderTop: '1px solid #111', marginBottom: 2 }} />
              <span>إمضاء الكاشير</span>
            </div>
          )}
          {tpl.showClientSignature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, height: 1, borderTop: '1px solid #111', marginBottom: 2 }} />
              <span>إمضاء العميل</span>
            </div>
          )}
        </div>
      )}

      {tpl.showStamp && (
        <div style={{
          width: 40, height: 40, margin: '8px auto',
          border: '2px solid #111', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 900,
          transform: 'rotate(-15deg)',
        }}>
          ختم
        </div>
      )}
    </div>
  );
}

// ─── Common ──────────────────────────────────────────────────────────────────
function Sep({ style: s }: { style: BorderStyle }) {
  const borderMap: Record<string, string> = { solid: 'solid', dashed: 'dashed', double: 'double', none: 'solid' };
  return <div style={{ borderTop: `1px ${borderMap[s]} #888`, margin: '5px 0' }} />;
}

type BorderStyle = 'solid' | 'dashed' | 'double' | 'none';
