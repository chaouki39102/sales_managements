// resources/js/pages/settings/print-settings/A4Preview.tsx
// معاينة فاتورة بحجم A4 — تصميم احترافي كامل الصفحة

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
  client:  'مؤسسة البركة للتوزيع',
  clientTaxId: '099217700002',
  clientPhone: '029 123 456',
  clientAddress: 'حي 08 ماي، بجانب القاعدة الجنوبية — الوادي',
  deliveryAddress: 'المنطقة الصناعية، طريق وادي سوف — الوادي',
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

interface A4Data {
  number: string;
  date: string;
  time: string;
  dueDate: string;
  cashier: string;
  client: string;
  clientTaxId: string;
  clientPhone: string;
  clientAddress: string;
  deliveryAddress: string;
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

function buildData(tpl: ReceiptTemplate80mm, liveData?: ReceiptLiveData | null): A4Data {
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
    deliveryAddress: '',
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

interface A4PreviewProps {
  tpl:      ReceiptTemplate80mm;
  company?: CompanyPreviewData | null;
  liveData?: ReceiptLiveData | null;
}

export default function A4Preview({ tpl, company, liveData }: A4PreviewProps) {
  const co   = getCompany(tpl, company);
  const data = buildData(tpl, liveData);

  const paperWidth = 794;
  const fs = tpl.baseFontSize;

  return (
    <div
      style={{
        width: paperWidth,
        minHeight: 1123,
        fontFamily: "'Tajawal', sans-serif",
        fontSize: fs,
        padding: '40px 50px',
        lineHeight: tpl.lineSpacing,
        background: '#fff',
        color: '#111',
        direction: 'rtl',
        boxSizing: 'border-box',
      }}
    >
      <A4Header tpl={tpl} company={co} data={data} />
      <AddressBlock tpl={tpl} data={data} />
      <A4ItemsTable tpl={tpl} items={data.items} />
      <A4Totals tpl={tpl} data={data} />
      {tpl.showPaymentDetails && <A4Payments tpl={tpl} payments={data.payments} />}
      <A4Footer tpl={tpl} data={data} />
    </div>
  );
}

function A4Header({ tpl, company, data }: { tpl: ReceiptTemplate80mm; company: CompanyPreviewData; data: A4Data }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, paddingBottom: 20, borderBottom: '2px solid #111' }}>
      <div style={{ flex: 1 }}>
        {tpl.showLogo && (
          <div style={{ marginBottom: 8 }}>
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="logo"
                style={{ width: tpl.logoSize * 1.5, height: tpl.logoSize * 1.5, objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              <div style={{
                width: tpl.logoSize * 1.5, height: tpl.logoSize * 1.5,
                background: '#111', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: tpl.logoSize * 0.4, fontWeight: 900,
              }}>
                {company.name.charAt(0)}
              </div>
            )}
          </div>
        )}
        {tpl.showCompanyName && (
          <div style={{
            fontSize: tpl.companyNameSize + 4,
            fontWeight: tpl.companyNameBold ? 900 : 400,
            fontFamily: "'Tajawal', sans-serif",
            marginBottom: 4,
          }}>
            {company.name}
          </div>
        )}
        <div style={{ fontSize: tpl.companyInfoFontSize, color: '#555' }}>
          {tpl.showAddress && <div>{company.address}</div>}
          {tpl.showPhone && <div>☎ {company.phone}</div>}
          {tpl.showTaxId && <div>NIF: {company.nif}</div>}
          {tpl.showRc && <div>RC: {company.rc}</div>}
          {tpl.showNis && <div>NIS: {company.nis}</div>}
        </div>
      </div>

      <div style={{ textAlign: 'left', minWidth: 250 }}>
        <div style={{
          fontSize: tpl.titleFontSize + 4,
          fontWeight: tpl.titleBold ? 900 : 400,
          color: '#111',
          marginBottom: 12,
          textAlign: 'left',
        }}>
          {tpl.titleText}
        </div>
        <table style={{ fontSize: tpl.companyInfoFontSize, borderCollapse: 'collapse' }}>
          <tbody>
            {tpl.showDocNumber && <A4InfoRow label="رقم الفاتورة" value={data.number} />}
            {tpl.showDate && <A4InfoRow label="التاريخ" value={data.date} />}
            {tpl.showTime && <A4InfoRow label="الوقت" value={data.time} />}
            {tpl.showDueDate && <A4InfoRow label="تاريخ الاستحقاق" value={data.dueDate} />}
            {tpl.showCashier && <A4InfoRow label="الكاشير" value={data.cashier} />}
            {tpl.showPaymentTerm && <A4InfoRow label="شروط الدفع" value={data.paymentTerm} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function A4InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ color: '#555', padding: '2px 0', whiteSpace: 'nowrap', fontWeight: 600 }}>{label}:</td>
      <td style={{ padding: '2px 0', paddingRight: 12 }}>{value}</td>
    </tr>
  );
}

function AddressBlock({ tpl, data }: { tpl: ReceiptTemplate80mm; data: A4Data }) {
  return (
    <div style={{ display: 'flex', gap: 30, marginBottom: 24 }}>
      {tpl.showClient && (
        <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.companyInfoFontSize + 1, marginBottom: 6, color: '#111' }}>بيانات العميل</div>
          <div style={{ fontSize: tpl.companyInfoFontSize, color: '#333' }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{data.client}</div>
            {tpl.showClientTaxId && data.clientTaxId && <div>NIF: {data.clientTaxId}</div>}
            {tpl.showClientPhone && data.clientPhone && <div>☎ {data.clientPhone}</div>}
            {tpl.showClientAddress && data.clientAddress && <div>{data.clientAddress}</div>}
          </div>
        </div>
      )}
      {tpl.showDeliveryAddress && data.deliveryAddress && (
        <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.companyInfoFontSize + 1, marginBottom: 6, color: '#111' }}>عنوان التسليم</div>
          <div style={{ fontSize: tpl.companyInfoFontSize, color: '#333' }}>
            {data.deliveryAddress}
          </div>
        </div>
      )}
    </div>
  );
}

function A4ItemsTable({ tpl, items }: { tpl: ReceiptTemplate80mm; items: A4Data['items'] }) {
  const cols = getVisibleCols(tpl);
  if (cols.length === 0) return null;

  const totalWidth = 100;
  const colWidths = cols.map(c => {
    const w = tpl.colWidths[c] ?? 20;
    return `${(w / 100) * totalWidth}%`;
  });

  return (
    <div style={{ marginBottom: 20 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tpl.fontSizeItems }}>
        <thead>
          <tr style={{
            background: tpl.tableHeaderBg ? '#111' : '#f5f5f5',
            borderBottom: `2px solid #111`,
          }}>
            {cols.map(c => (
              <th key={c} style={{
                padding: '8px 10px',
                textAlign: c === 'name' || c === 'ref' ? 'right' as const : 'left' as const,
                fontWeight: tpl.tableHeaderBold ? 700 : 600,
                color: tpl.tableHeaderBg ? '#fff' : '#111',
                fontSize: tpl.fontSizeItems,
                width: colWidths[cols.indexOf(c)],
              }}>
                {tpl.colHeaders[c] ?? colLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{
              borderBottom: tpl.tableBorderStyle !== 'none' ? `1px ${tpl.tableBorderStyle} #ddd` : 'none',
              background: tpl.alternatingRows && i % 2 === 1 ? '#fafafa' : 'transparent',
            }}>
              {cols.map(c => (
                <td key={c} style={{
                  padding: '10px',
                  textAlign: c === 'name' || c === 'ref' ? 'right' as const : 'left' as const,
                  fontWeight: c === 'total' ? 700 : 400,
                  fontSize: tpl.fontSizeItems,
                }}>
                  {colValue(c, item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getVisibleCols(tpl: ReceiptTemplate80mm): ColumnKey[] {
  const alwaysCols: ColumnKey[] = ['name', 'quantity', 'price', 'total'];
  const visible = tpl.colOrder.filter(key => {
    if (key === 'name' || key === 'quantity' || key === 'price' || key === 'total') return true;
    const showMap: Partial<Record<ColumnKey, boolean>> = {
      rowNumber: tpl.showRowNumber,
      barcode: tpl.showItemBarcode,
      ref: tpl.showRef,
      unit: tpl.showUnit,
      discount: tpl.showItemDiscount,
      tva: tpl.showItemTva,
    };
    return showMap[key] ?? false;
  });
  return visible.length > 0 ? visible : alwaysCols;
}

function colLabel(c: ColumnKey): string {
  const labels: Record<ColumnKey, string> = {
    rowNumber: '#', barcode: 'باركود', ref: 'مرجع',
    name: 'البيان', unit: 'وحدة', quantity: 'الكمية',
    price: 'السعر', discount: 'خصم', tva: 'TVA', total: 'المجموع',
  };
  return labels[c];
}

function colValue(c: ColumnKey, item: A4Data['items'][0]) {
  switch (c) {
    case 'name': return item.name;
    case 'quantity': return String(item.qty);
    case 'price': return `${item.price.toFixed(2)}`;
    case 'total': return `${item.total.toFixed(2)}`;
    case 'ref': return item.ref;
    case 'unit': return item.unit;
    case 'discount': return item.discount > 0 ? `${item.discount}%` : '';
    case 'tva': return `TVA ${item.tva}%`;
    default: return '';
  }
}

function A4Totals({ tpl, data }: { tpl: ReceiptTemplate80mm; data: A4Data }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end',
      fontSize: tpl.totalsFontSize,
      fontWeight: tpl.totalsBold ? 700 : 400,
      textAlign: tpl.totalsAlign,
      marginBottom: 24,
      direction: 'ltr',
    }}>
      <table style={{ width: 320, borderCollapse: 'collapse' }}>
        <tbody>
          {tpl.showTotalHt && <A4TotalRow label="المجموع HT" val={data.totalHt} />}
          {tpl.showDiscountTotal && data.totalDiscount > 0 && <A4TotalRow label="إجمالي الخصومات" val={-data.totalDiscount} red />}
          {tpl.showTotalTva && <A4TotalRow label="TVA" val={data.totalTva} />}
          {tpl.showTvaBreakdown && data.tvaByRate.map(r => (
            <A4TotalRow key={r.rate} label={`  TVA ${r.rate}%`} val={r.amount} />
          ))}
          {tpl.showFiscalStamp && data.fiscalStamp > 0 && <A4TotalRow label="الطابع الجبائي" val={data.fiscalStamp} />}
          {tpl.showTotalTtc && (
            <tr>
              <td style={{
                padding: '10px 12px',
                borderTop: `3px double #111`,
                fontWeight: tpl.totalTtcBold ? 900 : 700,
                fontSize: tpl.totalTtcFontSize,
                textAlign: 'right',
              }}>
                المجموع TTC:
              </td>
              <td style={{
                padding: '10px 12px',
                borderTop: `3px double #111`,
                fontWeight: tpl.totalTtcBold ? 900 : 700,
                fontSize: tpl.totalTtcFontSize,
                textAlign: 'right',
              }}>
                {data.totalTtc.toFixed(2)}
              </td>
            </tr>
          )}
          {tpl.showPaidAmount && <A4TotalRow label="المدفوع" val={data.paid} bold />}
          {tpl.showChange && <A4TotalRow label="الباقي" val={data.change} />}
          {tpl.showRemaining && <A4TotalRow label="المبلغ المتبقي" val={data.remaining} />}
          {tpl.showPrevBalance && <A4TotalRow label="الرصيد السابق" val={data.prevBalance} />}
          {tpl.showNewBalance && <A4TotalRow label="الرصيد الجديد" val={data.newBalance} bold />}
        </tbody>
      </table>
    </div>
  );
}

function A4TotalRow({ label, val, red, bold }: { label: string; val: number; red?: boolean; bold?: boolean }) {
  return (
    <tr>
      <td style={{
        padding: '5px 12px',
        textAlign: 'right',
        fontWeight: bold ? 800 : 400,
        color: red ? '#c00' : 'inherit',
      }}>
        {label}
      </td>
      <td style={{
        padding: '5px 12px',
        textAlign: 'right',
        fontWeight: bold ? 800 : 400,
        color: red ? '#c00' : 'inherit',
      }}>
        {val.toFixed(2)}
      </td>
    </tr>
  );
}

function A4Payments({ tpl, payments }: { tpl: ReceiptTemplate80mm; payments: A4Data['payments'] }) {
  if (payments.length === 0) return null;
  return (
    <div style={{ fontSize: tpl.paymentFontSize, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>تفاصيل الدفع</div>
      <table style={{ width: 320, borderCollapse: 'collapse', direction: 'ltr' }}>
        <tbody>
          {payments.map((p, i) => (
            <tr key={i}>
              <td style={{ padding: '4px 12px', textAlign: 'right' }}>{p.mode}</td>
              <td style={{ padding: '4px 12px', textAlign: 'right' }}>{p.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function A4Footer({ tpl, data }: { tpl: ReceiptTemplate80mm; data: A4Data }) {
  const hasContent = tpl.footerLine1 || tpl.footerLine2 || tpl.footerLine3 ||
    tpl.showThankYou || tpl.showReturnsPolicy || tpl.footerLegalText ||
    tpl.showPaymentConditions || tpl.showBankDetails;

  if (!hasContent) return null;

  return (
    <div style={{
      fontSize: tpl.baseFontSize - 0.5,
      borderTop: '2px solid #111',
      paddingTop: 16,
      marginTop: 12,
    }}>
      {tpl.showPaymentConditions && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>شروط الدفع</div>
          <div style={{ fontSize: tpl.baseFontSize - 1, color: '#555', lineHeight: 1.6 }}>
            مدة السداد: {data.paymentTerm || 'غير محدد'}
          </div>
        </div>
      )}

      {tpl.showBankDetails && tpl.bankDetailsText && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>البيانات البنكية</div>
          <div style={{ fontSize: tpl.baseFontSize - 1, color: '#555', whiteSpace: 'pre-line' }}>
            {tpl.bankDetailsText}
          </div>
        </div>
      )}

      {tpl.footerLine1 && <div style={{ margin: '4px 0' }}>{tpl.footerLine1}</div>}
      {tpl.footerLine2 && <div style={{ margin: '4px 0' }}>{tpl.footerLine2}</div>}
      {tpl.footerLine3 && <div style={{ margin: '4px 0' }}>{tpl.footerLine3}</div>}

      {tpl.showReturnsPolicy && tpl.returnsPolicyText && (
        <div style={{ fontSize: tpl.baseFontSize - 1, color: '#555', margin: '6px 0' }}>
          {tpl.returnsPolicyText}
        </div>
      )}

      {tpl.showThankYou && (
        <div style={{
          fontWeight: 700, margin: '8px 0',
          fontSize: tpl.thankYouFontSize,
          textAlign: 'center',
        }}>
          {tpl.thankYouText}
        </div>
      )}

      {tpl.footerLegalText && (
        <div style={{ fontSize: tpl.baseFontSize - 1.5, color: '#888', margin: '6px 0', textAlign: 'center' }}>
          {tpl.footerLegalText}
        </div>
      )}

      {(tpl.showCashierSignature || tpl.showClientSignature) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: tpl.baseFontSize }}>
          {tpl.showCashierSignature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 150, height: 1, borderTop: '1px solid #111', marginBottom: 4 }} />
              <span>إمضاء الكاشير</span>
            </div>
          )}
          {tpl.showClientSignature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 150, height: 1, borderTop: '1px solid #111', marginBottom: 4 }} />
              <span>إمضاء العميل</span>
            </div>
          )}
        </div>
      )}

      {tpl.showStamp && (
        <div style={{
          width: 60, height: 60, margin: '16px auto',
          border: '2px solid #111', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 900,
          transform: 'rotate(-15deg)',
        }}>
          ختم
        </div>
      )}
    </div>
  );
}