/**
 * Canonical identifier for every printable field in the system.
 * Every renderer (UniversalPreview, ESC/POS, future PDF) reads fields
 * by ID from this registry — never by raw property access.
 *
 * Design rule:
 *   One field ID → one data source → one visibility rule → one render path.
 */

export interface PrintFieldDefinition {
  id: string;
  label: string;
  group: PrintFieldGroup;
  type: 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'image';
  /** Dot-path inside UniversalDocumentData (e.g. "party.name") */
  sourcePath: string;
  /** Related setting key in SettingsRegistry (e.g. "show_client") */
  settingKey?: string;
  /** Template override path — if non-empty in template, wins over sourcePath */
  overrideTemplatePath?: string;
  align: 'left' | 'center' | 'right';
  visibleByDefault: boolean;
  /** True if this field appears in a repeating table (items, payments, etc.) */
  isRepeating?: boolean;
  /** Path relative to repeating context (e.g. "name" for DocumentLine) */
  relativePath?: string;
  description?: string;
}

export type PrintFieldGroup =
  | 'customer' | 'document' | 'company' | 'session' | 'warehouse'
  | 'item' | 'totals' | 'balance' | 'payment'
  | 'tvaBreakdown' | 'footer' | 'barcode' | 'qr'
  | 'signature' | 'report';

export const PRINT_FIELDS: PrintFieldDefinition[] = [
  // ── Customer / Party ─────────────────────────────────────────────────
  { id: 'customer.name',           label: 'اسم العميل',          group: 'customer', type: 'string',   sourcePath: 'party.name',           settingKey: 'show_client',          align: 'right',   visibleByDefault: true },
  { id: 'customer.nif',            label: 'رقم ضريبة العميل',    group: 'customer', type: 'string',   sourcePath: 'party.nif',            settingKey: 'show_client_nif',      align: 'right',   visibleByDefault: true },
  { id: 'customer.phone',          label: 'هاتف العميل',          group: 'customer', type: 'string',   sourcePath: 'party.phone',          settingKey: 'show_client_phone',    align: 'right',   visibleByDefault: true },
  { id: 'customer.address',        label: 'عنوان العميل',         group: 'customer', type: 'string',   sourcePath: 'party.address',        settingKey: 'show_client_address',  align: 'right',   visibleByDefault: true },
  { id: 'customer.deliveryAddress', label: 'عنوان التسليم',       group: 'customer', type: 'string',   sourcePath: 'party.deliveryAddress', settingKey: 'show_delivery_address', align: 'right',   visibleByDefault: false },
  { id: 'customer.cashierName',    label: 'الكاشير',              group: 'customer', type: 'string',   sourcePath: 'party.cashierName',    settingKey: 'show_cashier',         align: 'right',   visibleByDefault: true },
  { id: 'customer.code',           label: 'رمز الزبون',           group: 'customer', type: 'string',   sourcePath: 'party.code',           align: 'right',   visibleByDefault: true },

  // ── Document ─────────────────────────────────────────────────────────
  { id: 'document.number',         label: 'رقم المستند',          group: 'document', type: 'string',   sourcePath: 'doc.number',           settingKey: 'show_doc_number',      align: 'right',   visibleByDefault: true },
  { id: 'document.date',           label: 'التاريخ',              group: 'document', type: 'date',     sourcePath: 'doc.date',             settingKey: 'show_date',            align: 'right',   visibleByDefault: true },
  { id: 'document.time',           label: 'الوقت',                group: 'document', type: 'string',   sourcePath: 'doc.time',             settingKey: 'show_time',            align: 'right',   visibleByDefault: true },
  { id: 'document.dueDate',        label: 'تاريخ الاستحقاق',       group: 'document', type: 'date',     sourcePath: 'doc.dueDate',          settingKey: 'show_due_date',        align: 'right',   visibleByDefault: true },
  { id: 'document.paymentTerm',    label: 'شروط الدفع',           group: 'document', type: 'string',   sourcePath: 'doc.dueDate',          settingKey: 'show_payment_term',    align: 'right',   visibleByDefault: false },
  { id: 'document.typeCode',       label: 'رمز النوع',            group: 'document', type: 'string',   sourcePath: 'doc.typeCode',                                         align: 'right',   visibleByDefault: false },
  { id: 'document.typeName',       label: 'نوع المستند',          group: 'document', type: 'string',   sourcePath: 'doc.typeName',                                        align: 'right',   visibleByDefault: false },
  { id: 'document.status',         label: 'الحالة',               group: 'document', type: 'string',   sourcePath: 'doc.status',                                          align: 'right',   visibleByDefault: false },
  { id: 'document.notes',          label: 'ملاحظات',              group: 'document', type: 'string',   sourcePath: 'doc.notes',                                           align: 'right',   visibleByDefault: false },
  { id: 'document.reference',      label: 'المرجع',               group: 'document', type: 'string',   sourcePath: 'doc.reference',                                       align: 'right',   visibleByDefault: false },

  // ── Session ──────────────────────────────────────────────────────────
  { id: 'session.code',            label: 'رقم الجلسة',           group: 'session',  type: 'string',   sourcePath: 'session.code',          settingKey: 'show_session',         align: 'right',   visibleByDefault: true },
  { id: 'session.cashierName',     label: 'كاشير الجلسة',         group: 'session',  type: 'string',   sourcePath: 'session.cashierName',                                  align: 'right',   visibleByDefault: false },

  // ── Warehouse ────────────────────────────────────────────────────────
  { id: 'warehouse.name',          label: 'اسم المستودع',          group: 'warehouse', type: 'string',  sourcePath: 'warehouse.name',                                       align: 'right',   visibleByDefault: false },

  // ── Company ──────────────────────────────────────────────────────────
  { id: 'company.name',            label: 'اسم الشركة',           group: 'company',  type: 'string',   sourcePath: 'company.name',          settingKey: 'show_company_name',     align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'company_name_text' },
  { id: 'company.address',         label: 'عنوان الشركة',         group: 'company',  type: 'string',   sourcePath: 'company.address',       settingKey: 'show_address',         align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_address' },
  { id: 'company.phone',           label: 'هاتف الشركة',          group: 'company',  type: 'string',   sourcePath: 'company.phone',         settingKey: 'show_phone',           align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_phone' },
  { id: 'company.nif',             label: 'رقم الضريبة',          group: 'company',  type: 'string',   sourcePath: 'company.nif',           settingKey: 'show_tax_id',          align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_nif' },
  { id: 'company.rc',              label: 'السجل التجاري',        group: 'company',  type: 'string',   sourcePath: 'company.rc',            settingKey: 'show_rc',              align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_rc' },
  { id: 'company.nis',             label: 'الرقم الإحصائي',       group: 'company',  type: 'string',   sourcePath: 'company.nis',           settingKey: 'show_nis',             align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_nis' },
  { id: 'company.ice',             label: 'رقم ICE',              group: 'company',  type: 'string',   sourcePath: 'company.ice',           settingKey: 'show_ice',             align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_ice' },
  { id: 'company.article',         label: 'المادة',               group: 'company',  type: 'string',   sourcePath: 'company.article',       settingKey: 'show_article',         align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_article' },
  { id: 'company.logo',            label: 'الشعار',               group: 'company',  type: 'image',    sourcePath: 'company.logoUrl',       settingKey: 'show_logo',            align: 'center',  visibleByDefault: true },
  { id: 'company.capital',         label: 'رأس مال الشركة',       group: 'company',  type: 'string',   sourcePath: 'company.capital',       align: 'right',   visibleByDefault: true },
  { id: 'company.mobile',          label: 'الهاتف المحمول',       group: 'company',  type: 'string',   sourcePath: 'company.mobile',        align: 'right',   visibleByDefault: true },

  // ── Items (table) ─────────────────────────────────────────────────────
  { id: 'item.index',              label: 'الرقم',                group: 'item',     type: 'number',   sourcePath: '',                      align: 'center',  visibleByDefault: true,  isRepeating: true, relativePath: '_index' },
  { id: 'item.name',               label: 'المنتج',               group: 'item',     type: 'string',   sourcePath: '',                      align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'name' },
  { id: 'item.code',               label: 'الرمز',                group: 'item',     type: 'string',   sourcePath: '',                      align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'ref' },
  { id: 'item.barcode',            label: 'الباركود',             group: 'item',     type: 'string',   sourcePath: '',                      align: 'right',   visibleByDefault: false, isRepeating: true, relativePath: 'barcode' },
  { id: 'item.unit',               label: 'الوحدة',               group: 'item',     type: 'string',   sourcePath: '',                      align: 'center',  visibleByDefault: true,  isRepeating: true, relativePath: 'unit' },
  { id: 'item.quantity',           label: 'الكمية',               group: 'item',     type: 'number',   sourcePath: '',                      align: 'center',  visibleByDefault: true,  isRepeating: true, relativePath: 'quantity' },
  { id: 'item.price',              label: 'الثمن',                group: 'item',     type: 'currency',  sourcePath: '',                     align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'unitPriceHt' },
  { id: 'item.discount',           label: 'الخصم',                group: 'item',     type: 'currency',  sourcePath: '',                     align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'discountPct' },
  { id: 'item.tva',                label: 'TVA',                  group: 'item',     type: 'number',   sourcePath: '',                      align: 'center',  visibleByDefault: true,  isRepeating: true, relativePath: 'tvaRate' },
  { id: 'item.total',              label: 'المجموع',              group: 'item',     type: 'currency',  sourcePath: '',                     align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'totalHt' },
  { id: 'item.lot',                label: 'رقم الدفعة',           group: 'item',     type: 'string',   sourcePath: '',                      align: 'right',   visibleByDefault: false, isRepeating: true, relativePath: 'lot' },
  { id: 'item.notes',              label: 'ملاحظات',              group: 'item',     type: 'string',   sourcePath: '',                      align: 'right',   visibleByDefault: false, isRepeating: true, relativePath: 'notes' },

  // ── Totals ───────────────────────────────────────────────────────────
  { id: 'totals.ht',               label: 'المجموع HT',            group: 'totals',   type: 'currency', sourcePath: 'totals.totalHt',        settingKey: 'show_total_ht',        align: 'right',   visibleByDefault: true },
  { id: 'totals.tva',              label: 'مجموع الضريبة',         group: 'totals',   type: 'currency', sourcePath: 'totals.totalTva',       settingKey: 'show_total_tva',        align: 'right',   visibleByDefault: true },
  { id: 'totals.discount',         label: 'مجموع الخصم',           group: 'totals',   type: 'currency', sourcePath: 'totals.totalDiscount',  settingKey: 'show_discount_total',   align: 'right',   visibleByDefault: true },
  { id: 'totals.fiscalStamp',      label: 'الطابع الضريبي',        group: 'totals',   type: 'currency', sourcePath: 'totals.fiscalStamp',    settingKey: 'show_fiscal_stamp',     align: 'right',   visibleByDefault: true },
  { id: 'totals.ttc',              label: 'المجموع TTC',           group: 'totals',   type: 'currency', sourcePath: 'totals.totalTtc',       settingKey: 'show_total_ttc',        align: 'right',   visibleByDefault: true },
  { id: 'totals.paid',             label: 'المدفوع',               group: 'totals',   type: 'currency', sourcePath: 'totals.paid',           settingKey: 'show_paid_amount',      align: 'right',   visibleByDefault: true },
  { id: 'totals.change',           label: 'الباقي',                group: 'totals',   type: 'currency', sourcePath: 'totals.change',         settingKey: 'show_change',           align: 'right',   visibleByDefault: true },
  { id: 'totals.remaining',        label: 'المتبقي',               group: 'totals',   type: 'currency', sourcePath: 'totals.remaining',      settingKey: 'show_remaining',        align: 'right',   visibleByDefault: true },
  { id: 'totals.amountInWords',    label: 'المبلغ كتابة',          group: 'totals',   type: 'string',   sourcePath: 'computed.amountInWords', settingKey: 'show_amount_in_words', align: 'right',   visibleByDefault: true },

  // ── Balance ──────────────────────────────────────────────────────────
  { id: 'balance.previous',        label: 'الرصيد السابق',         group: 'balance',  type: 'currency', sourcePath: 'balance.previous',      settingKey: 'show_prev_balance',     align: 'right',   visibleByDefault: true },
  { id: 'balance.current',         label: 'الرصيد الجديد',         group: 'balance',  type: 'currency', sourcePath: 'balance.current',       settingKey: 'show_new_balance',      align: 'right',   visibleByDefault: true },

  // ── Payment ──────────────────────────────────────────────────────────
  { id: 'payment.method',          label: 'طريقة الدفع',           group: 'payment',  type: 'string',   sourcePath: 'payments[*].mode',      settingKey: 'show_payment_details',  align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'mode' },
  { id: 'payment.amount',          label: 'المبلغ المدفوع',        group: 'payment',  type: 'currency', sourcePath: 'payments[*].amount',    settingKey: 'show_payment_details',  align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'amount' },

  // ── TVA Breakdown ────────────────────────────────────────────────────
  { id: 'tvaBreakdown.rate',       label: 'نسبة الضريبة',          group: 'tvaBreakdown', type: 'number',  sourcePath: 'taxBreakdown[*].rate', settingKey: 'show_tva_breakdown', align: 'center', visibleByDefault: true,  isRepeating: true, relativePath: 'rate' },
  { id: 'tvaBreakdown.base',       label: 'الأساس',                group: 'tvaBreakdown', type: 'currency', sourcePath: 'taxBreakdown[*].baseHt', settingKey: 'show_tva_breakdown', align: 'right',  visibleByDefault: true,  isRepeating: true, relativePath: 'baseHt' },
  { id: 'tvaBreakdown.tva',        label: 'الضريبة',               group: 'tvaBreakdown', type: 'currency', sourcePath: 'taxBreakdown[*].tva',   settingKey: 'show_tva_breakdown', align: 'right',  visibleByDefault: true,  isRepeating: true, relativePath: 'tva' },
  { id: 'tvaBreakdown.ttc',        label: 'المجموع',               group: 'tvaBreakdown', type: 'currency', sourcePath: 'taxBreakdown[*].ttc',   settingKey: 'show_tva_breakdown', align: 'right',  visibleByDefault: true,  isRepeating: true, relativePath: 'ttc' },

  // ── Footer / Barcode / QR ────────────────────────────────────────────
  { id: 'footer.barcode',          label: 'الباركود',              group: 'barcode',  type: 'string',   sourcePath: 'doc.number',            settingKey: 'show_barcode',          align: 'center', visibleByDefault: true },
  { id: 'footer.qr',               label: 'رمز QR',               group: 'qr',       type: 'string',   sourcePath: 'doc.number',            settingKey: 'show_qr',               align: 'center', visibleByDefault: true },
  { id: 'footer.thankYou',         label: 'الشكر',                 group: 'footer',   type: 'string',   sourcePath: '',                      settingKey: 'show_thank_you',        align: 'center', visibleByDefault: true },
  { id: 'footer.returnsPolicy',    label: 'سياسة الإرجاع',         group: 'footer',   type: 'string',   sourcePath: '',                      settingKey: 'show_returns_policy',   align: 'center', visibleByDefault: false },
  { id: 'footer.bankDetails',      label: 'البيانات البنكية',       group: 'footer',   type: 'string',   sourcePath: '',                      settingKey: 'show_bank_details',     align: 'center', visibleByDefault: false },

  // ── Cashier / Client Signature ───────────────────────────────────────
  { id: 'signature.cashier',       label: 'توقيع الكاشير',         group: 'signature', type: 'boolean', sourcePath: '',                      settingKey: 'show_cashier_signature', align: 'center', visibleByDefault: true },
  { id: 'signature.client',        label: 'توقيع العميل',          group: 'signature', type: 'boolean', sourcePath: '',                      settingKey: 'show_client_signature',  align: 'center', visibleByDefault: true },
  { id: 'signature.stamp',         label: 'الختم',                 group: 'signature', type: 'boolean', sourcePath: '',                      settingKey: 'show_stamp',             align: 'center', visibleByDefault: true },

  // ── Report (session/aggregated) ──────────────────────────────────────
  { id: 'report.periodStart',      label: 'بداية الفترة',          group: 'report',   type: 'date',     sourcePath: 'report.periodStart',     settingKey: 'show_report_period',     align: 'right',   visibleByDefault: true },
  { id: 'report.periodEnd',        label: 'نهاية الفترة',          group: 'report',   type: 'date',     sourcePath: 'report.periodEnd',       settingKey: 'show_report_period',     align: 'right',   visibleByDefault: true },
  { id: 'report.cashier',          label: 'كاشير التقرير',          group: 'report',   type: 'string',   sourcePath: 'report.cashierName',     settingKey: 'show_report_cashier',    align: 'right',   visibleByDefault: true },
  { id: 'report.grossSales',       label: 'إجمالي المبيعات',       group: 'report',   type: 'currency', sourcePath: 'report.grossSales',      settingKey: 'show_report_summary_cards', align: 'right', visibleByDefault: true },
  { id: 'report.returnsTotal',     label: 'المرتجعات',             group: 'report',   type: 'currency', sourcePath: 'report.returnsTotal',    settingKey: 'show_report_summary_cards', align: 'right', visibleByDefault: true },
  { id: 'report.netSales',         label: 'صافي المبيعات',         group: 'report',   type: 'currency', sourcePath: 'report.netSales',        settingKey: 'show_report_summary_cards', align: 'right', visibleByDefault: true },
  { id: 'report.invoicesCount',    label: 'عدد الفواتير',          group: 'report',   type: 'number',   sourcePath: 'report.invoicesCount',   settingKey: 'show_report_summary_cards', align: 'center', visibleByDefault: true },
  { id: 'report.returnsCount',     label: 'عدد المرتجعات',         group: 'report',   type: 'number',   sourcePath: 'report.returnsCount',    settingKey: 'show_report_summary_cards', align: 'center', visibleByDefault: true },
  { id: 'report.highestInvoice',   label: 'أعلى فاتورة',           group: 'report',   type: 'currency', sourcePath: 'report.highestInvoice',   settingKey: 'show_report_summary_cards', align: 'right', visibleByDefault: true },
  { id: 'report.avgInvoice',       label: 'متوسط الفاتورة',        group: 'report',   type: 'currency', sourcePath: 'report.avgInvoice',       settingKey: 'show_report_summary_cards', align: 'right', visibleByDefault: true },
];

// ─── Singleton ───────────────────────────────────────────────────────────

class PrintFieldRegistry {
  private byId = new Map<string, PrintFieldDefinition>();
  private bySettingKey = new Map<string, PrintFieldDefinition>();
  private byGroup = new Map<PrintFieldGroup, PrintFieldDefinition[]>();

  constructor(fields: PrintFieldDefinition[]) {
    for (const f of fields) {
      this.byId.set(f.id, f);
      if (f.settingKey) {
        this.bySettingKey.set(f.settingKey, f);
      }
      const list = this.byGroup.get(f.group) ?? [];
      list.push(f);
      this.byGroup.set(f.group, list);
    }
  }

  get(id: string): PrintFieldDefinition | undefined {
    return this.byId.get(id);
  }

  getBySettingKey(key: string): PrintFieldDefinition | undefined {
    return this.bySettingKey.get(key);
  }

  getByGroup(group: PrintFieldGroup): PrintFieldDefinition[] {
    return this.byGroup.get(group) ?? [];
  }

  getAllFields(): PrintFieldDefinition[] {
    return Array.from(this.byId.values());
  }

  /** Return only fields that appear in a repeating table */
  getRepeatingFields(group?: PrintFieldGroup): PrintFieldDefinition[] {
    const all = group ? this.getByGroup(group) : this.getAllFields();
    return all.filter(f => f.isRepeating);
  }
}

export const printFieldRegistry = new PrintFieldRegistry(PRINT_FIELDS);
