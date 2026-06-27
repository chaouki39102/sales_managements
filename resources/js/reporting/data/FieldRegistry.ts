// ═══════════════════════════════════════════════════════════════════════════════
// reporting/data/FieldRegistry.ts
//
// Layer 2 — depends on UniversalDocumentData types only.
// Catalogs every entity field available for use in report formulas, rules, and
// template properties. The singleton `fieldRegistry` is the single source of
// truth for field discovery in the reporting framework.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FieldDefinition {
  path: string;
  label: string;
  group: string;
  type: 'string' | 'number' | 'boolean';
  /**
   * Primary aggregation hint for array-numeric fields:
   * - `'sum'` — supports SUM, AVG, COUNT
   * - `'count'` — supports COUNT only (string/boolean array fields)
   * - `null` — no aggregation
   */
  aggregate?: 'sum' | 'avg' | 'count' | null;
  description?: string;
}

export interface FieldGroup {
  id: string;
  label: string;
  fields: FieldDefinition[];
}

// ─── Registry implementation ───────────────────────────────────────────────────

class FieldRegistry {
  private byPath = new Map<string, FieldDefinition>();
  private groups = new Map<string, FieldGroup>();

  constructor(fields: FieldDefinition[]) {
    const grouped = new Map<string, FieldDefinition[]>();

    fields.forEach(f => {
      this.byPath.set(f.path, f);
      const list = grouped.get(f.group) ?? [];
      list.push(f);
      grouped.set(f.group, list);
    });

    const groupLabels: Record<string, string> = {
      doc:      'معلومات المستند',
      company:  'الشركة',
      party:    'العميل/المورد',
      lines:    'الأسطر',
      totals:   'الإجماليات',
      balance:  'الرصيد',
      payments: 'المدفوعات',
      computed: 'محسوب',
    };

    grouped.forEach((fields, id) => {
      this.groups.set(id, {
        id,
        label: groupLabels[id] ?? id,
        fields,
      });
    });
  }

  getGroup(groupId: string): FieldGroup {
    const g = this.groups.get(groupId);
    if (!g) throw new Error(`FieldRegistry: unknown group "${groupId}"`);
    return g;
  }

  getAllGroups(): FieldGroup[] {
    const order = ['doc', 'company', 'party', 'lines', 'totals', 'balance', 'payments', 'computed'];
    return order.reduce<FieldGroup[]>((acc, id) => {
      const g = this.groups.get(id);
      if (g) acc.push(g);
      return acc;
    }, []);
  }

  getByPath(path: string): FieldDefinition | undefined {
    return this.byPath.get(path);
  }

  search(query: string): FieldDefinition[] {
    const q = query.toLowerCase();
    const results: FieldDefinition[] = [];
    this.byPath.forEach(f => {
      if (f.path.toLowerCase().includes(q) || f.label.includes(q)) {
        results.push(f);
      }
    });
    return results;
  }

  register(field: FieldDefinition): void {
    if (this.byPath.has(field.path)) {
      throw new Error(`FieldRegistry: field "${field.path}" already registered`);
    }
    this.byPath.set(field.path, field);
    let group = this.groups.get(field.group);
    if (!group) {
      group = { id: field.group, label: field.group, fields: [] };
      this.groups.set(field.group, group);
    }
    group.fields.push(field);
  }
}

// ─── All fields from UniversalDocumentData ─────────────────────────────────────

const ALL_FIELDS: FieldDefinition[] = [
  // ── doc (معلومات المستند) ─────────────────────────────────────────────────
  { path: 'doc.number',     label: 'رقم الفاتورة',       group: 'doc', type: 'string', description: 'رقم المستند الفريد' },
  { path: 'doc.date',       label: 'تاريخ الفاتورة',     group: 'doc', type: 'string', description: 'تاريخ المستند بصيغة ISO' },
  { path: 'doc.dueDate',    label: 'تاريخ الاستحقاق',    group: 'doc', type: 'string', description: 'تاريخ استحقاق الدفع' },
  { path: 'doc.time',       label: 'الوقت',              group: 'doc', type: 'string', description: 'وقت إصدار المستند' },
  { path: 'doc.typeCode',   label: 'رمز النوع',          group: 'doc', type: 'string', description: 'رمز نوع المستند (FV, BL, FA, POS)' },
  { path: 'doc.typeName',   label: 'نوع المستند',        group: 'doc', type: 'string', description: 'الاسم المحلي لنوع المستند' },
  { path: 'doc.status',     label: 'الحالة',             group: 'doc', type: 'string', description: 'حالة المستند (مسودة, مؤكدة, ملغية)' },
  { path: 'doc.notes',      label: 'ملاحظات',            group: 'doc', type: 'string', description: 'ملاحظات على المستند' },
  { path: 'doc.reference',  label: 'المرجع',             group: 'doc', type: 'string', description: 'رقم مرجعي خارجي' },

  // ── warehouse تحت doc ─────────────────────────────────────────────────────
  { path: 'warehouse.id',      label: 'معرف المستودع',     group: 'doc', type: 'number', description: 'معرف المستودع الرقمي' },
  { path: 'warehouse.name',    label: 'اسم المستودع',      group: 'doc', type: 'string', description: 'اسم المستودع أو الفرع' },
  { path: 'warehouse.address', label: 'عنوان المستودع',    group: 'doc', type: 'string', description: 'عنوان المستودع' },
  { path: 'warehouse.code',    label: 'رمز المستودع',      group: 'doc', type: 'string', description: 'رمز المستودع' },

  // ── session تحت doc ──────────────────────────────────────────────────────
  { path: 'session.id',         label: 'معرف الجلسة',      group: 'doc', type: 'number', description: 'معرف جلسة البيع' },
  { path: 'session.code',       label: 'رمز الجلسة',       group: 'doc', type: 'string', description: 'رقم الجلسة' },
  { path: 'session.openedAt',   label: 'وقت الفتح',        group: 'doc', type: 'string', description: 'وقت فتح الجلسة' },
  { path: 'session.closedAt',   label: 'وقت الإغلاق',      group: 'doc', type: 'string', description: 'وقت إغلاق الجلسة' },
  { path: 'session.cashierName', label: 'اسم الكاشير',     group: 'doc', type: 'string', description: 'اسم أمين الصندوق' },

  // ── currency تحت doc ─────────────────────────────────────────────────────
  { path: 'currency.code',   label: 'رمز العملة',         group: 'doc', type: 'string', description: 'رمز العملة (DZD, EUR, USD)' },
  { path: 'currency.symbol', label: 'رمز العملة',         group: 'doc', type: 'string', description: 'رمز العملة المحلي (دج)' },
  { path: 'currency.rate',   label: 'سعر الصرف',          group: 'doc', type: 'number', description: 'سعر الصرف مقابل العملة الأساسية' },

  // ── company (الشركة) ─────────────────────────────────────────────────────
  { path: 'company.name',    label: 'اسم الشركة',         group: 'company', type: 'string', description: 'اسم الشركة المطبوعة على المستند' },
  { path: 'company.address', label: 'عنوان الشركة',       group: 'company', type: 'string', description: 'عنوان الشركة' },
  { path: 'company.phone',   label: 'هاتف الشركة',        group: 'company', type: 'string', description: 'رقم هاتف الشركة' },
  { path: 'company.nif',     label: 'الرقم الجبائي',      group: 'company', type: 'string', description: 'رقم التعريف الجبائي' },
  { path: 'company.rc',      label: 'السجل التجاري',      group: 'company', type: 'string', description: 'رقم السجل التجاري' },
  { path: 'company.nis',     label: 'الرقم الإحصائي',     group: 'company', type: 'string', description: 'الرقم الإحصائي' },
  { path: 'company.ice',     label: 'رقم الحساب ICE',     group: 'company', type: 'string', description: 'رقم الحساب الجاري ICE' },
  { path: 'company.article', label: 'المادة',             group: 'company', type: 'string', description: 'رقم المادة' },
  { path: 'company.logoUrl', label: 'رابط الشعار',        group: 'company', type: 'string', description: 'رابط صورة شعار الشركة' },
  { path: 'company.email',   label: 'البريد الإلكتروني',  group: 'company', type: 'string', description: 'البريد الإلكتروني للشركة' },
  { path: 'company.website', label: 'الموقع الإلكتروني',  group: 'company', type: 'string', description: 'الموقع الإلكتروني للشركة' },

  // ── party (العميل/المورد) ────────────────────────────────────────────────
  { path: 'party.id',              label: 'معرف الطرف',           group: 'party', type: 'number', description: 'المعرف الرقمي للعميل/المورد' },
  { path: 'party.name',            label: 'اسم العميل',           group: 'party', type: 'string', description: 'اسم العميل أو المورد' },
  { path: 'party.type',            label: 'نوع الطرف',            group: 'party', type: 'string', description: 'نوع الطرف: عميل أو مورد' },
  { path: 'party.nif',             label: 'الرقم الجبائي للطرف',  group: 'party', type: 'string', description: 'الرقم الجبائي للعميل/المورد' },
  { path: 'party.rc',              label: 'السجل التجاري للطرف',  group: 'party', type: 'string', description: 'السجل التجاري للعميل/المورد' },
  { path: 'party.nis',             label: 'الرقم الإحصائي للطرف', group: 'party', type: 'string', description: 'الرقم الإحصائي للعميل/المورد' },
  { path: 'party.phone',           label: 'هاتف الطرف',           group: 'party', type: 'string', description: 'رقم هاتف العميل/المورد' },
  { path: 'party.email',           label: 'بريد الطرف',           group: 'party', type: 'string', description: 'البريد الإلكتروني للعميل/المورد' },
  { path: 'party.address',         label: 'عنوان الطرف',          group: 'party', type: 'string', description: 'عنوان العميل/المورد' },
  { path: 'party.deliveryAddress', label: 'عنوان التوصيل',        group: 'party', type: 'string', description: 'عنوان التوصيل للعميل' },
  { path: 'party.cashierName',     label: 'اسم الكاشير',          group: 'party', type: 'string', description: 'اسم أمين الصندوق (للمبيعات النقدية)' },

  // ── lines.* (الأسطر) ─────────────────────────────────────────────────────
  // Wildcard paths — individual line fields accessible via lines.*.<field>
  { path: 'lines.*.rowNumber',   label: 'رقم السطر',     group: 'lines', type: 'number', aggregate: 'sum',  description: 'رقم السطر (1-based)' },
  { path: 'lines.*.ref',         label: 'المرجع',        group: 'lines', type: 'string', aggregate: 'count', description: 'مرجع المنتج / SKU' },
  { path: 'lines.*.barcode',     label: 'الباركود',      group: 'lines', type: 'string', aggregate: 'count', description: 'الباركود' },
  { path: 'lines.*.name',        label: 'البيان',        group: 'lines', type: 'string', aggregate: 'count', description: 'اسم المنتج أو الخدمة' },
  { path: 'lines.*.unit',        label: 'الوحدة',        group: 'lines', type: 'string', aggregate: 'count', description: 'وحدة القياس' },
  { path: 'lines.*.quantity',    label: 'الكمية',        group: 'lines', type: 'number', aggregate: 'sum',  description: 'الكمية المباعة' },
  { path: 'lines.*.unitPriceHt', label: 'سعر الوحدة',    group: 'lines', type: 'number', aggregate: 'sum',  description: 'سعر الوحدة بدون الضريبة' },
  { path: 'lines.*.unitPriceTtc', label: 'سعر الوحدة شامل الضريبة', group: 'lines', type: 'number', aggregate: 'sum', description: 'سعر الوحدة شامل الضريبة' },
  { path: 'lines.*.tvaRate',     label: 'نسبة الضريبة',  group: 'lines', type: 'number', aggregate: 'sum',  description: 'نسبة الضريبة (0.19)' },
  { path: 'lines.*.tvaPct',      label: 'نسبة الضريبة %', group: 'lines', type: 'number', aggregate: 'sum', description: 'نسبة الضريبة المئوية (19)' },
  { path: 'lines.*.discountPct', label: 'نسبة الخصم',    group: 'lines', type: 'number', aggregate: 'sum',  description: 'نسبة الخصم المئوية' },
  { path: 'lines.*.discountAmt', label: 'قيمة الخصم',    group: 'lines', type: 'number', aggregate: 'sum',  description: 'قيمة الخصم بالعملة' },
  { path: 'lines.*.totalHt',     label: 'المجموع الخام', group: 'lines', type: 'number', aggregate: 'sum',  description: 'المجموع بدون الضريبة بعد الخصم' },
  { path: 'lines.*.totalTva',    label: 'قيمة الضريبة',  group: 'lines', type: 'number', aggregate: 'sum',  description: 'قيمة الضريبة على السطر' },
  { path: 'lines.*.totalTtc',    label: 'المجموع شامل الضريبة', group: 'lines', type: 'number', aggregate: 'sum', description: 'المجموع شامل الضريبة' },
  { path: 'lines.*.lot',         label: 'رقم الدفعة',    group: 'lines', type: 'string', aggregate: 'count', description: 'رقم الدفعة / التسلسل' },
  { path: 'lines.*.notes',       label: 'ملاحظات',       group: 'lines', type: 'string', aggregate: 'count', description: 'ملاحظات على السطر' },

  // ── totals (الإجماليات) ───────────────────────────────────────────────────
  { path: 'totals.totalHt',       label: 'المجموع الخام',             group: 'totals', type: 'number', description: 'مجموع كل الأسطر بدون الضريبة' },
  { path: 'totals.totalTva',      label: 'مجموع الضريبة',            group: 'totals', type: 'number', description: 'مجموع الضريبة على القيمة المضافة' },
  { path: 'totals.totalTtc',      label: 'المجموع شامل الضريبة',     group: 'totals', type: 'number', description: 'المجموع النهائي شامل الضريبة' },
  { path: 'totals.fiscalStamp',   label: 'الطابع الجبائي',           group: 'totals', type: 'number', description: 'الطابع الجبائي (1% بقيمة 2500 دج كحد أقصى)' },
  { path: 'totals.totalDiscount', label: 'مجموع الخصم',              group: 'totals', type: 'number', description: 'مجموع الخصم على كل الأسطر' },
  { path: 'totals.paid',          label: 'المدفوع',                  group: 'totals', type: 'number', description: 'المبلغ المدفوع فعلاً' },
  { path: 'totals.change',        label: 'المبلغ المرتجع',           group: 'totals', type: 'number', description: 'المبلغ المرتجع للعميل' },
  { path: 'totals.remaining',     label: 'المبلغ المتبقي',           group: 'totals', type: 'number', description: 'المبلغ المتبقي للدفع' },

  // ── taxBreakdown.* تحت totals ────────────────────────────────────────────
  { path: 'taxBreakdown.*.rate',   label: 'نسبة الضريبة',        group: 'totals', type: 'number', aggregate: 'sum', description: 'نسبة الضريبة' },
  { path: 'taxBreakdown.*.baseHt', label: 'الأساس الخاضع',       group: 'totals', type: 'number', aggregate: 'sum', description: 'الأساس الخاضع للضريبة' },
  { path: 'taxBreakdown.*.tva',    label: 'قيمة الضريبة',        group: 'totals', type: 'number', aggregate: 'sum', description: 'قيمة الضريبة للشريحة' },
  { path: 'taxBreakdown.*.ttc',    label: 'المجموع شامل الضريبة', group: 'totals', type: 'number', aggregate: 'sum', description: 'المجموع شامل الضريبة للشريحة' },

  // ── payments (المدفوعات) ─────────────────────────────────────────────────
  { path: 'payments.*.mode',      label: 'طريقة الدفع',     group: 'payments', type: 'string', aggregate: 'count', description: 'طريقة الدفع (نقداً, تحويل بنكي)' },
  { path: 'payments.*.amount',    label: 'المبلغ',          group: 'payments', type: 'number', aggregate: 'sum',  description: 'المبلغ المدفوع عبر هذه الطريقة' },
  { path: 'payments.*.reference', label: 'مرجع الدفع',     group: 'payments', type: 'string', aggregate: 'count', description: 'المرجع المصرفي للدفع' },
  { path: 'payments.*.date',      label: 'تاريخ الدفع',     group: 'payments', type: 'string', aggregate: 'count', description: 'تاريخ الدفع' },

  // ── balance (الرصيد) ─────────────────────────────────────────────────────
  { path: 'balance.previous', label: 'الرصيد السابق',   group: 'balance', type: 'number', description: 'رصيد العميل قبل هذه الفاتورة' },
  { path: 'balance.movement', label: 'الحركة',          group: 'balance', type: 'number', description: 'صافي الحركة من هذه الفاتورة' },
  { path: 'balance.current',  label: 'الرصيد الحالي',    group: 'balance', type: 'number', description: 'رصيد العميل بعد هذه الفاتورة' },
  { path: 'balance.due',      label: 'المستحق',          group: 'balance', type: 'number', description: 'الرصيد المستحق في تاريخ الاستحقاق' },

  // ── computed (محسوب) — future / formula-engine fields ────────────────────
  { path: 'computed.amountInWords', label: 'المبلغ كتابة',     group: 'computed', type: 'string',  description: 'المبلغ الإجمالي كتابة بالعربي' },
  { path: 'computed.profit',        label: 'الربح',            group: 'computed', type: 'number',  description: 'الربح في الفاتورة (محسوب)' },
];

// ─── Legacy / convenience aliases (identical to real paths for field lookup) ──
// These are NOT registered — they exist conceptually but resolve to existing paths.
// The labels here are for documentation only:
//   prevBalance → balance.previous
//   newBalance  → balance.current
//   amountInWords → computed.amountInWords
//   profit → computed.profit

// ─── Singleton ─────────────────────────────────────────────────────────────────

export const fieldRegistry = new FieldRegistry(ALL_FIELDS);
