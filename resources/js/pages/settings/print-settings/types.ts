// resources/js/pages/settings/print-settings/types.ts
// أنواع بيانات إعدادات الطباعة — القالب الحراري 80mm

export interface DetectedPrinter {
  id:        string;
  name:      string;
  isDefault: boolean;
  status:    'ready' | 'offline' | 'unknown';
  source?:   'usb' | 'demo' | 'manual';
}

export type PaperSize = '80mm' | 'A4' | 'A5' | 'none';

export interface DocumentPrintConfig {
  docTypeCode:   string;
  docTypeName:   string;
  enabled:       boolean;
  paperSize:     PaperSize;
  printerId:     string | null;
  copies:        number;
  autoPrint:     boolean;
  showPreview:   boolean;
  templates:     PaperSize[];
}

export type ColumnKey =
  | 'rowNumber'
  | 'barcode'
  | 'ref'
  | 'name'
  | 'unit'
  | 'quantity'
  | 'price'
  | 'discount'
  | 'tva'
  | 'total';

export type AlignOption = 'right' | 'center' | 'left';
export type BorderStyle = 'solid' | 'dashed' | 'double' | 'none';
export type PriceMode   = 'ht' | 'ttc';

export interface ReceiptTemplate80mm {
  // ── Paper ──
  paperWidth: 58 | 80;

  // ── HEADER ──
  showLogo:        boolean;
  logoSize:        number;
  logoAlign:       AlignOption;
  showCompanyName: boolean;
  companyNameSize: number;
  companyNameBold: boolean;
  companyNameAlign: AlignOption;
  headerSeparator: BorderStyle;
  headerCustomText: string;

  // ── Company Info ──
  showAddress:       boolean;
  showPhone:         boolean;
  showTaxId:         boolean;
  showRc:            boolean;
  showNis:           boolean;
  showIce:           boolean;
  showArticle:       boolean;
  companyInfoAlign:  AlignOption;
  companyInfoFontSize: number;

  // ── Company Data Override ──
  companyName:    string;
  companyAddress: string;
  companyPhone:   string;
  companyNif:     string;
  companyRc:      string;
  companyNis:     string;
  companyIce:     string;
  companyArticle: string;

  // ── Document Info ──
  titleText:        string;
  titleFontSize:    number;
  titleBold:        boolean;
  titleAlign:       AlignOption;
  showDocNumber:    boolean;
  showDate:         boolean;
  showTime:         boolean;
  showDueDate:      boolean;
  showCashier:      boolean;
  showClient:       boolean;
  showClientTaxId:  boolean;
  showClientPhone:  boolean;
  showClientAddress: boolean;
  showSession:      boolean;
  showPaymentTerm:  boolean;
  docSeparator:     BorderStyle;

  // ── Items Table ──
  fontSizeItems:    number;
  itemsFontFamily:  'monospace' | 'tajawal';

  colOrder:    ColumnKey[];
  colWidths:   Partial<Record<ColumnKey, number>>;
  colHeaders:  Partial<Record<ColumnKey, string>>;
  colShow:     Partial<Record<ColumnKey, boolean>>;
  showColHeader:    boolean;
  tableHeaderBold:  boolean;
  tableHeaderBg:    boolean;
  tableBorderStyle: BorderStyle;
  alternatingRows:  boolean;

  showRowNumber:    boolean;
  showItemBarcode:  boolean;
  showRef:          boolean;
  showUnit:         boolean;
  showItemTva:      boolean;
  showItemDiscount: boolean;
  priceDisplay:     PriceMode;
  showLineTotalTtc: boolean;

  // ── Totals ──
  totalsFontSize:   number;
  totalsBold:       boolean;
  totalsAlign:      AlignOption;
  showTotalHt:      boolean;
  showTotalTva:     boolean;
  showTvaBreakdown: boolean;
  showDiscountTotal: boolean;
  showFiscalStamp:  boolean;
  showTotalTtc:     boolean;
  totalTtcFontSize: number;
  totalTtcBold:     boolean;
  totalBorderStyle: BorderStyle;
  showAmountInWords: boolean;
  showPaidAmount:   boolean;
  showChange:       boolean;
  showRemaining:    boolean;
  showPrevBalance:  boolean;
  showNewBalance:   boolean;

  // ── Payments ──
  showPaymentDetails: boolean;
  paymentFontSize:    number;

  // ── Footer ──
  footerLine1:       string;
  footerLine2:       string;
  footerLine3:       string;
  footerSeparator:   BorderStyle;

  showThankYou:      boolean;
  thankYouText:      string;
  thankYouFontSize:  number;

  showBarcode:       boolean;
  barcodeContent:    'doc-number' | 'total' | 'custom';
  barcodeCustomText: string;

  showQr:            boolean;
  qrContent:         'doc-number' | 'company-info' | 'both';

  showCashierSignature: boolean;
  showClientSignature:  boolean;
  showStamp:            boolean;

  showReturnsPolicy: boolean;
  returnsPolicyText: string;
  footerLegalText:   string;

  // ── Formatting ──
  marginTop:    number;
  marginBottom: number;
  marginSides:  number;
  lineSpacing:  number;
  baseFontSize: number;
}

export interface ReceiptLiveData {
  docNumber?: string;
  docDate?: string;
  cashierName?: string;
  items?: Array<{
    name: string;
    ref?: string;
    qty: number;
    unit_price_ht: number;
    unit?: string;
    tva_rate: number;
    discount_percentage?: number;
    total_ht: number;
  }>;
  totals?: {
    total_ht:       number;
    total_tva:      number;
    total_ttc:      number;
    fiscal_stamp:   number;
    total_discount: number;
    paid?:          number;
    change?:        number;
    remaining?:     number;
  };
  client?: { name?: string; nif?: string; phone?: string; address?: string } | null;
  payments?: Array<{ mode: string; amount: number }>;
  prevBalance?: number;
  newBalance?: number;
}

export interface CompanyPreviewData {
  name:     string;
  address:  string;
  phone:    string;
  nif:      string;
  rc:       string;
  nis:      string;
  ice:      string;
  article:  string;
  logoUrl?: string | null;
}

export function defaultTemplate(): ReceiptTemplate80mm {
  return {
    paperWidth: 80,

    showLogo: true,
    logoSize: 60,
    logoAlign: 'center',
    showCompanyName: true,
    companyNameSize: 16,
    companyNameBold: true,
    companyNameAlign: 'center',
    headerSeparator: 'solid',
    headerCustomText: '',

    showAddress: true,
    showPhone: true,
    showTaxId: true,
    showRc: true,
    showNis: true,
    showIce: false,
    showArticle: false,
    companyInfoAlign: 'center',
    companyInfoFontSize: 10,

    companyName:    '',
    companyAddress: '',
    companyPhone:   '',
    companyNif:     '',
    companyRc:      '',
    companyNis:     '',
    companyIce:     '',
    companyArticle: '',

    titleText: 'فاتورة بيع',
    titleFontSize: 14,
    titleBold: true,
    titleAlign: 'center',
    showDocNumber: true,
    showDate: true,
    showTime: true,
    showDueDate: false,
    showCashier: true,
    showClient: true,
    showClientTaxId: false,
    showClientPhone: false,
    showClientAddress: false,
    showSession: false,
    showPaymentTerm: false,
    docSeparator: 'dashed',

    fontSizeItems: 10,
    itemsFontFamily: 'tajawal',

    colOrder: ['name', 'quantity', 'price', 'total'],
    colWidths: { name: 40, quantity: 15, price: 22, total: 23 },
    colHeaders: { name: 'البيان', quantity: 'الكمية', price: 'السعر', total: 'الإجمالي' },
    colShow: { name: true, quantity: true, price: true, total: true },
    showColHeader: true,
    tableHeaderBold: true,
    tableHeaderBg: true,
    tableBorderStyle: 'dashed',
    alternatingRows: false,

    showRowNumber: false,
    showItemBarcode: false,
    showRef: false,
    showUnit: true,
    showItemTva: false,
    showItemDiscount: false,
    priceDisplay: 'ht',
    showLineTotalTtc: false,

    totalsFontSize: 11,
    totalsBold: true,
    totalsAlign: 'right',
    showTotalHt: true,
    showTotalTva: true,
    showTvaBreakdown: false,
    showDiscountTotal: true,
    showFiscalStamp: true,
    showTotalTtc: true,
    totalTtcFontSize: 15,
    totalTtcBold: true,
    totalBorderStyle: 'double',
    showAmountInWords: false,
    showPaidAmount: true,
    showChange: true,
    showRemaining: true,
    showPrevBalance: true,
    showNewBalance: true,

    showPaymentDetails: true,
    paymentFontSize: 10,

    footerLine1: '',
    footerLine2: '',
    footerLine3: '',
    footerSeparator: 'solid',

    showThankYou: true,
    thankYouText: 'شكراً لزيارتكم!',
    thankYouFontSize: 12,

    showBarcode: true,
    barcodeContent: 'doc-number',
    barcodeCustomText: '',

    showQr: false,
    qrContent: 'doc-number',

    showCashierSignature: false,
    showClientSignature: false,
    showStamp: false,

    showReturnsPolicy: false,
    returnsPolicyText: 'كل الاحتجاجات لا تتعدى 48 ساعة',
    footerLegalText: '',

    marginTop: 3,
    marginBottom: 3,
    marginSides: 3,
    lineSpacing: 1.3,
    baseFontSize: 10,
  };
}
