إصلاح طبقة التطبيق — مصدر واحد للحقيقة
=====================================================
المشكلة الحقيقية ليست في قاعدة البيانات
الجدول والـ Model صحيحان 100%
المشكلة في 4 نقاط في Frontend + نقطة خامسة في ESC/POS
=====================================================
═══════════════════════════════════════════════════════════════════════تشخيص دقيق: لماذا المعاينة تعمل والطباعة لا تعمل؟═══════════════════════════════════════════════════════════════════════

المشكلة ليست في قاعدة البيانات ولا في الـ API.المشكلة في هذا المخطط:

                ┌─────────────────────┐                │   print_templates    │  ← مصدر صحيح                │   config = {...}     │                └─────────┬───────────┘                          │                ┌─────────▼───────────┐                │   GET API Response  │  ← صحيح                │   { config: {...} } │                └─────────┬───────────┘                          │          ┌───────────────┼───────────────┐          │               │               │┌─────────▼──────┐  ┌────▼─────┐  ┌─────▼──────────┐│  المعاينة       │  │  الكاشير  │  │  الطباعة الحرارية││  Preview        │  │  POS      │  │  ESC/POS        ││                 │  │           │  │                 ││  ✅ تستخدم      │  │  ❌ يستخدم│  │  ❌ يستخدم      ││  UniversalDoc   │  │  Receipt  │  │  buildReceipt    ││  Data كاملاً    │  │  LiveData │  │  Bytes مباشرةً   ││                 │  │  (ناقص)   │  │  (بدون أرصدة)    │└─────────────────┘  └──────────┘  └─────────────────┘       ✅                  ❌                ❌
النتيجة:

المعاينة: الرصيد السابق = 5000 ✅
الطباعة الحرارية: الرصيد السابق = 0 ❌
طباعة POS: الرصيد السابق = 0 ❌
═══════════════════════════════════════════════════════════════════════الإصلاح ١: PrintSettingsPage — إزالة createDefaultTemplate═══════════════════════════════════════════════════════════════════════

الملف: resources/js/pages/settings/print-settings/PrintSettingsPage.tsx

المبدأ: إذا لم يكن هناك قالب في قاعدة البيانات → نعرض رسالة"لا يوجد قالب، أنشئ واحداً أو ثبّت من المكتبة"وليس نُنشئ قالباً وهمياً من createDefaultTemplate()

═══════════════════════════════════════════════════════════════════════

// ❌ الكود المخلوق — لا تستخدمه أبداً بعد الآنimport { createDefaultTemplate } from '../defaults';// هذا السطر يجب أن يختفي من كل مكان:const localTpl = { ...createDefaultTemplate(activeDoc, paperSize), ...dbTpl };
// ✅ الكود الصحيح — PrintSettingsPage.tsx

import { useState, useEffect, useCallback } from 'react';
import { usePrintTemplatesList } from '@/reporting/runtime';
import { useUpdatePrintTemplate, useCreatePrintTemplate } from '../hooks';
// ❌ لا تستورد createDefaultTemplate أبداً

export default function PrintSettingsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ① جلب القوالب من قاعدة البيانات فقط
  const { data: templates = [], isLoading } = usePrintTemplatesList(docType);

  // ② جلب القالب المحدد بالكامل (من قاعدة البيانات)
  const selectedTemplate = templates.find(t => t.id === selectedId) ?? null;

  // ③ إذا لم يكن هناك قالب محدد → نختار الأول
  useEffect(() => {
    if (!selectedId && templates.length > 0) {
      const defaultTpl = templates.find(t => t.is_default) ?? templates[0];
      if (defaultTpl) setSelectedId(defaultTpl.id);
    }
  }, [templates, selectedId]);

  // ④ التعديل المباشر على القالب (local state)
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});

  // عندما يتغير القالب المحدد → نستبدل localConfig بالكامل من DB
  useEffect(() => {
    if (selectedTemplate) {
      // ✅ استبدال كامل — لا دمج مع defaults
      setLocalConfig(selectedTemplate.config ?? {});
    }
  }, [selectedTemplate?.id, selectedTemplate?.config]);

  // ⑤ التعديل على حقل واحد
  const updateField = useCallback((key: string, value: unknown) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // ⑥ التعديل على حقول متعددة دفعة واحدة
  const updateFields = useCallback((patch: Record<string, unknown>) => {
    setLocalConfig(prev => ({ ...prev, ...patch }));
  }, []);

  // ⑦ الحفظ — النقطة الحاسمة
  const saveMutation = useUpdatePrintTemplate();

  const handleSave = useCallback(async () => {
    if (!selectedId) return;

    // ⑦-أ: إرسال config كاملاً إلى API
    await saveMutation.mutateAsync({
      id: selectedId,
      data: {
        config: localConfig,  // ← كل 144+ حقل كما هي
      },
    });

    // ⑦-ب: لا نُعدّل localConfig يدوياً
    // الـ mutation onSuccess في useUpdatePrintTemplate
    // سيُنفّي invalidateQueries مما يُسبب إعادة جلب البيانات
    // والتي ستُحدّث selectedTemplate تلقائياً
    // مما سيُحدّث localConfig عبر الـ useEffect في ④
  }, [selectedId, localConfig, saveMutation]);

  // ⑧ حالة فارغة — لا يوجد قالب
  if (!isLoading && templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-gray-500">لا يوجد قالب لهذا النوع</p>
        <button onClick={handleInstallFromLibrary}>
          تثبيت قالب من المكتبة
        </button>
        <button onClick={handleCreateNew}>
          إنشاء قالب فارغ
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* اللوحة اليمنى: التحكم */}
      <TemplateControls
        template={selectedTemplate}
        config={localConfig}
        onUpdateField={updateField}
        onUpdateFields={updateFields}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
      />

      {/* اللوحة اليسرى: المعاينة */}
      <div className="border rounded-lg overflow-hidden">
        {selectedTemplate && (
          <UniversalPreview
            template={{
              ...selectedTemplate,
              config: localConfig,  // ← نستخدم localConfig للمعاينة الحية
            }}
            data={previewData}
          />
        )}
      </div>
    </div>
  );
}

═══════════════════════════════════════════════════════════════════════
الإصلاح ٢: useUpdatePrintTemplate — إبطال الكاش بعد الحفظ
═══════════════════════════════════════════════════════════════════════

الملف: resources/js/pages/settings/print-settings/hooks.ts (أو الملف المناسب)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPut } from '@/lib/api/core/client';
import { useActiveSlug } from '@/store/appStore';

export function useUpdatePrintTemplate() {
  const slug = useActiveSlug() ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      // ✅ نُرسل config كاملاً بدون أي فلتر
      return apiPut(`/print-templates/${id}`, data);
    },
    onSuccess: () => {
      // ✅ إبطال كل استعلامات القوالب
      // هذا سيُسبب إعادة جلب البيانات من الخادم
      // مما سيُحدّث selectedTemplate تلقائياً
      qc.invalidateQueries({ queryKey: ['print-templates', slug] });
      qc.invalidateQueries({ queryKey: ['print-template', slug] });
    },
  });
}

export function useCreatePrintTemplate() {
  const slug = useActiveSlug() ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiPost('/print-templates', data);
    },
    onSuccess: (_data, variables) => {
      // إبطال القائمة لكي يظهر القالب الجديد
      qc.invalidateQueries({ queryKey: ['print-templates', slug] });

      // إذا كان القالب الجديد افتراضياً → نجدد أيضاً
      if (variables.is_default) {
        qc.invalidateQueries({ queryKey: ['print-template-default', slug] });
      }
    },
  });
}

═══════════════════════════════════════════════════════════════════════
الإصلاح ٣: usePrintTemplatesList — جلب من DB فقط
═══════════════════════════════════════════════════════════════════════

الملف: resources/js/reporting/runtime/usePrintTemplatesList.ts
import { useQuery } from '@tanstack/react-query';
import { useRuntime } from './PrintRuntimeContext';

interface PrintTemplateListItem {
  id: number;
  name: string;
  doc_type_code: string;
  paper_size: string;
  is_default: boolean;
  is_active: boolean;
  config: Record<string, unknown>;
  updated_at?: string;
}

/**
 * ✅ جلب القوالب من قاعدة البيانات فقط
 * لا يوجد createDefaultTemplate هنا
 * لا يوجد دمج مع defaults هنا
 */
export function usePrintTemplatesList(docTypeCode?: string) {
  const { slug } = useRuntime();

  return useQuery<PrintTemplateListItem[]>({
    queryKey: ['print-templates', slug, docTypeCode],
    queryFn: async () => {
      const params = docTypeCode ? `?doc_type_code=${docTypeCode}` : '';
      const response = await fetch(`/api/v1/${slug}/print-templates${params}`);
      const json = await response.json();
      return json.data;
    },
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

/**
 * ✅ جلب قالب واحد بالكامل من قاعدة البيانات
 */
export function usePrintTemplateById(id: number | null) {
  const { slug } = useRuntime();

  return useQuery<PrintTemplateListItem>({
    queryKey: ['print-template', slug, id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/v1/${slug}/print-templates/${id}`);
      const json = await response.json();
      return json.data;
    },
    enabled: !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

/**
 * ✅ جلب القالب الافتراضي لنوع مستند
 * يُستخدم عند الطباعة من الكاشير أو المستندات
 */
export function useDefaultTemplate(docTypeCode: string) {
  const { slug } = useRuntime();

  return useQuery<PrintTemplateListItem | null>({
    queryKey: ['print-template-default', slug, docTypeCode],
    queryFn: async () => {
      // نحاول الجلب مع فلتر is_default أولاً
      const response = await fetch(
        `/api/v1/${slug}/print-templates?doc_type_code=${docTypeCode}`
      );
      const json = await response.json();
      const templates: PrintTemplateListItem[] = json.data ?? [];

      // الأولوية: القالب المُعلَّن كافتراضي
      const defaultTpl = templates.find(t => t.is_default);
      if (defaultTpl) return defaultTpl;

      // البديل: أول قالب نشط
      return templates.find(t => t.is_active) ?? null;
    },
    enabled: !!slug && !!docTypeCode,
    staleTime: 5 * 60_000,
  });
}

═══════════════════════════════════════════════════════════════════════
الإصلاح ٤: DocumentDataBuilder — مصدر بيانات المستند الوحيد
═══════════════════════════════════════════════════════════════════════

الملف: resources/js/reporting/runtime/DocumentDataBuilder.ts

هذا الملف هو المفتاح. يجب أن يُنتج كائناً واحداً يُستخدم في كل مكان.
/**
 * UniversalDocumentData — شكل البيانات الموحد
 *
 * ✅ هذه الواجهة هي العقد بين البيانات والطباعة
 * كل مسار طباعة يجب أن يستهلك هذا الكائن بالضبط
 */
export interface UniversalDocumentData {
  // معلومات المستند
  document: {
    type: string;          // 'FV', 'BL', 'BC', etc.
    number: string;
    date: string;
    dueDate?: string;
    time?: string;
    status: string;
    notes?: string;
  };

  // معلومات الشركة
  company: {
    name: string;
    address?: string;
    phone?: string;
    nif?: string;
    rc?: string;
    nis?: string;
    ice?: string;
    article?: string;
    logo?: string;
    bankDetails?: string;
  };

  // معلومات الزبون/المورد
  party?: {
    name: string;
    nif?: string;
    phone?: string;
    address?: string;
    deliveryAddress?: string;
  };

  // الكاشير
  cashier?: {
    name: string;
  };

  // أسطر المستند
  items: Array<{
    index: number;
    ref?: string;
    name: string;
    quantity: number;
    unitPriceHt: number;
    tvaRate: number;
    discountPct: number;
    totalHt: number;
    totalTva: number;
    totalTtc: number;
    packaging?: string;
  }>;

  // المجاميع
  totals: {
    totalHt: number;
    totalTva: number;
    totalTtc: number;
    totalDiscount: number;
    fiscalStamp: number;
    amountInWords?: string;
    tvaBreakdown?: Array<{ rate: number; base: number; amount: number }>;
  };

  // ✅ الأرصدة — هذه هي النقطة التي تُسبب طباعة 0
  balance: {
    previousBalance: number;   // ← الرصيد السابق
    newBalance: number;        // ← الرصيد الجديد
    paidAmount: number;        // ← المبلغ المدفوع
    remaining: number;         // ← المبلغ المتبقي
    change: number;            // ← الباقي
  };

  // المدفوعات
  payments?: Array<{
    mode: string;
    amount: number;
    reference?: string;
    date?: string;
  }>;

  // العملة
  currency: {
    code: string;
    symbol: string;
  };
}

/**
 * DocumentDataBuilder — يبني UniversalDocumentData من أي مصدر
 */
export class DocumentDataBuilder {
  /**
   * بناء من مستند API (CommercialDocument مع includes)
   * يُستخدم في: طباعة الفواتير، أوامر التوريد، المرتجعات
   */
  static fromApiDocument(apiDoc: any, company: any): UniversalDocumentData {
    const party = apiDoc.party;
    const lines = apiDoc.lines ?? apiDoc.commercial_document_lines ?? [];
    const payments = apiDoc.payments ?? [];

    // ✅ حساب الأرصدة بشكل صحيح
    const paidAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
    const remaining = Number(apiDoc.total_ttc ?? 0) - paidAmount;
    const previousBalance = Number(party?.balance ?? 0) - Number(apiDoc.total_ttc ?? 0);
    const newBalance = Number(party?.balance ?? 0);

    return {
      document: {
        type: apiDoc.document_type_code ?? apiDoc.doc_type_code ?? 'FV',
        number: apiDoc.number ?? apiDoc.doc_number ?? '',
        date: apiDoc.date ?? apiDoc.doc_date ?? '',
        dueDate: apiDoc.due_date,
        time: apiDoc.time,
        status: apiDoc.status ?? apiDoc.document_status_code ?? '',
        notes: apiDoc.notes,
      },
      company: {
        name: company.name ?? '',
        address: company.address,
        phone: company.phone,
        nif: company.nif ?? company.tax_id,
        rc: company.rc,
        nis: company.nis,
        ice: company.ice,
        article: company.article,
        logo: company.logo_url ?? company.logo,
        bankDetails: company.bank_details,
      },
      party: party ? {
        name: party.name ?? '',
        nif: party.nif ?? party.tax_id,
        phone: party.phone,
        address: party.address,
        deliveryAddress: apiDoc.delivery_address,
      } : undefined,
      cashier: apiDoc.cashier ? {
        name: apiDoc.cashier.name ?? '',
      } : apiDoc.user ? {
        name: apiDoc.user.name ?? '',
      } : undefined,
      items: lines.map((line: any, idx: number) => ({
        index: idx + 1,
        ref: line.ref ?? line.product_ref,
        name: line.product_name ?? line.designation ?? line.name ?? '',
        quantity: Number(line.quantity ?? 0),
        unitPriceHt: Number(line.unit_price_ht ?? line.price_ht ?? 0),
        tvaRate: Number(line.tva_rate ?? line.tva ?? 0),
        discountPct: Number(line.discount_pct ?? line.discount ?? 0),
        totalHt: Number(line.total_ht ?? 0),
        totalTva: Number(line.total_tva ?? 0),
        totalTtc: Number(line.total_ttc ?? line.line_total ?? 0),
        packaging: line.packaging_label,
      })),
      totals: {
        totalHt: Number(apiDoc.total_ht ?? 0),
        totalTva: Number(apiDoc.total_tva ?? 0),
        totalTtc: Number(apiDoc.total_ttc ?? 0),
        totalDiscount: Number(apiDoc.total_discount ?? 0),
        fiscalStamp: Number(apiDoc.fiscal_stamp_amount ?? 0),
        amountInWords: apiDoc.amount_in_words,
        tvaBreakdown: apiDoc.tva_breakdown ?? [],
      },
      // ✅ الأرصدة — محسوبة بشكل صحيح
      balance: {
        previousBalance: Math.max(0, previousBalance),
        newBalance: Math.max(0, newBalance),
        paidAmount: Math.max(0, paidAmount),
        remaining: Math.max(0, remaining),
        change: Math.max(0, paidAmount - Number(apiDoc.total_ttc ?? 0)),
      },
      payments: payments.map((p: any) => ({
        mode: p.payment_mode_name ?? p.mode ?? '',
        amount: Number(p.amount ?? 0),
        reference: p.reference,
        date: p.payment_date ?? p.date,
      })),
      currency: {
        code: apiDoc.currency_code ?? 'DZD',
        symbol: apiDoc.currency_symbol ?? 'دج',
      },
    };
  }

  /**
   * بناء من بيانات نقطة البيع (POS)
   * يُستخدم في: الكاشير، الكيوسك
   */
  static fromPosSnapshot(snapshot: any, company: any): UniversalDocumentData {
    const cart = snapshot.cart;
    const party = snapshot.party;
    const payments = snapshot.payments ?? [];

    const paidAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
    const totalTtc = Number(cart.totals?.total_ttc ?? cart.totalTtc ?? 0);
    const remaining = totalTtc - paidAmount;
    const previousBalance = Number(party?.balance ?? 0) - totalTtc;
    const newBalance = Number(party?.balance ?? 0);

    return {
      document: {
        type: 'FV',
        number: snapshot.documentNumber ?? '',
        date: snapshot.date ?? new Date().toISOString().split('T')[0],
        time: snapshot.time ?? new Date().toTimeString().slice(0, 5),
        status: 'validated',
      },
      company: {
        name: company.name ?? '',
        address: company.address,
        phone: company.phone,
        nif: company.nif,
        rc: company.rc,
        nis: company.nis,
        ice: company.ice,
        article: company.article,
        logo: company.logo_url ?? company.logo,
      },
      party: party ? {
        name: party.name ?? '',
        nif: party.nif,
        phone: party.phone,
        address: party.address,
      } : undefined,
      cashier: snapshot.cashier ? {
        name: snapshot.cashier.name ?? '',
      } : undefined,
      items: (cart.items ?? []).map((item: any, idx: number) => ({
        index: idx + 1,
        ref: item.ref ?? item.product_ref,
        name: item.name ?? item.product_name ?? '',
        quantity: Number(item.quantity ?? 0),
        unitPriceHt: Number(item.unit_price_ht ?? item.priceHt ?? 0),
        tvaRate: Number(item.tva_rate ?? item.tva ?? 19),
        discountPct: Number(item.discount_pct ?? item.discount ?? 0),
        totalHt: Number(item.total_ht ?? 0),
        totalTva: Number(item.total_tva ?? 0),
        totalTtc: Number(item.total_ttc ?? item.lineTotal ?? 0),
        packaging: item.packaging_label,
      })),
      totals: {
        totalHt: Number(cart.totals?.total_ht ?? 0),
        totalTva: Number(cart.totals?.total_tva ?? 0),
        totalTtc: totalTtc,
        totalDiscount: Number(cart.totals?.total_discount ?? 0),
        fiscalStamp: Number(cart.totals?.fiscal_stamp ?? 0),
        amountInWords: cart.totals?.amount_in_words,
        tvaBreakdown: cart.totals?.tva_breakdown ?? [],
      },
      // ✅ الأرصدة — نفس المنطق بالضبط
      balance: {
        previousBalance: Math.max(0, previousBalance),
        newBalance: Math.max(0, newBalance),
        paidAmount: Math.max(0, paidAmount),
        remaining: Math.max(0, remaining),
        change: Math.max(0, paidAmount - totalTtc),
      },
      payments: payments.map((p: any) => ({
        mode: p.mode_name ?? p.mode ?? '',
        amount: Number(p.amount ?? 0),
        reference: p.reference,
      })),
      currency: {
        code: 'DZD',
        symbol: 'دج',
      },
    };
  }
}
═══════════════════════════════════════════════════════════════════════
الإصلاح ٥: printService.ts — ESC/POS يستخدم UniversalDocumentData
═══════════════════════════════════════════════════════════════════════

الملف: resources/js/pos/utils/printService.ts

هذا هو الملف الذي يُسبب طباعة 0 في الأرصدة.
يجب أن يستلم UniversalDocumentData وليس CartItem[] مباشرة.
import { UniversalDocumentData } from '@/reporting/runtime/DocumentDataBuilder';
import { PrintFieldResolver } from '@/reporting/services/PrintFieldResolver';

const printFieldResolver = new PrintFieldResolver();

/**
 * ✅ بناء بايتات ESC/POS من القالب + UniversalDocumentData
 *
 * هذه الدالة هي المصدر الوحيد لطباعة حرارية
 * لا توجد دالة أخرى تبني ESC/POS
 */
export function buildReceiptBytesFromTemplate(
  template: { config: Record<string, unknown> },
  data: UniversalDocumentData   // ← نوع قوي — لا any
): Uint8Array {
  const config = template.config;
  const bytes: number[] = [];

  // ─── أداة مساعدة: إضافة نص ───
  const addText = (text: string, options?: { bold?: boolean; align?: string; size?: number }) => {
    const align = options?.align ?? 'left';
    if (align === 'center') bytes.push(0x1B, 0x61, 0x01);
    else if (align === 'right') bytes.push(0x1B, 0x61, 0x02);
    else bytes.push(0x1B, 0x61, 0x00);

    if (options?.bold) bytes.push(0x1B, 0x45, 0x01);

    const encoded = new TextEncoder().encode(text + '\n');
    bytes.push(...encoded);

    if (options?.bold) bytes.push(0x1B, 0x45, 0x00);
  };

  // ─── أداة مساعدة: خط فاصل ───
  const addSeparator = () => {
    bytes.push(...new TextEncoder().encode('─'.repeat(32) + '\n'));
  };

  // ─── 1. الترويسة ───
  if (printFieldResolver.resolve('company.logo', data, template.config)) {
    // شعار — يتطلب معالجة خاصة حسب الطابعة
    // هنا نتركها كتعليق لأنها تحتاج تحويل الصورة
  }

  if (printFieldResolver.resolve('company.name', data, template.config)) {
    const name = String(printFieldResolver.resolve('company.name', data, template.config));
    addText(name, { bold: true, align: 'center', size: 2 });
  }

  if (printFieldResolver.resolve('company.address', data, template.config)) {
    addText(String(printFieldResolver.resolve('company.address', data, template.config)), { align: 'center' });
  }

  if (printFieldResolver.resolve('company.phone', data, template.config)) {
    addText(String(printFieldResolver.resolve('company.phone', data, template.config)), { align: 'center' });
  }

  if (printFieldResolver.resolve('company.nif', data, template.config)) {
    addText('NIF: ' + String(printFieldResolver.resolve('company.nif', data, template.config)), { align: 'center' });
  }

  addSeparator();

  // ─── 2. معلومات المستند ───
  if (printFieldResolver.resolve('doc.number', data, template.config)) {
    addText('رقم: ' + data.document.number, { bold: true });
  }
  addText('التاريخ: ' + data.document.date);
  if (data.document.time) addText('الساعة: ' + data.document.time);

  if (printFieldResolver.resolve('doc.client', data, template.config) && data.party) {
    addText('الزبون: ' + data.party.name);
    if (data.party.nif) addText('NIF: ' + data.party.nif);
  }

  if (printFieldResolver.resolve('doc.cashier', data, template.config) && data.cashier) {
    addText('الكاشير: ' + data.cashier.name);
  }

  addSeparator();

  // ─── 3. أسطر المستند ───
  addText('البيان          الكمية   السعر   المبلغ', { bold: true });
  addSeparator();

  for (const item of data.items) {
    const name = item.name.length > 20 ? item.name.slice(0, 20) : item.name;
    const line = `${name.padEnd(20)} ${String(item.quantity).padStart(6)} ${item.totalTtc.toFixed(2).padStart(10)}`;
    addText(line);
  }

  addSeparator();

  // ─── 4. المجاميع ───
  if (printFieldResolver.resolve('totals.totalHt', data, template.config)) {
    addText(`المجموع HT: ${data.totals.totalHt.toFixed(2)}`, { align: 'right' });
  }
  if (printFieldResolver.resolve('totals.totalTva', data, template.config)) {
    addText(`TVA: ${data.totals.totalTva.toFixed(2)}`, { align: 'right' });
  }

  addText(`المجموع TTC: ${data.totals.totalTtc.toFixed(2)}`, { bold: true, align: 'right' });

  if (printFieldResolver.resolve('totals.fiscalStamp', data, template.config) && data.totals.fiscalStamp > 0) {
    addText(`الطابع الجبائي: ${data.totals.fiscalStamp.toFixed(2)}`, { align: 'right' });
  }

  addSeparator();

  // ─── 5. الأرصدة ← النقطة الحاسمة ───
  // ✅ نقرأ من data.balance مباشرة — نفس الكائن الذي تستخدمه المعاينة
  if (printFieldResolver.resolve('balance.previous', data, template.config)) {
    addText(`الرصيد السابق: ${data.balance.previousBalance.toFixed(2)}`, { align: 'right' });
  }
  if (printFieldResolver.resolve('balance.new', data, template.config)) {
    addText(`الرصيد الجديد: ${data.balance.newBalance.toFixed(2)}`, { align: 'right' });
  }
  if (printFieldResolver.resolve('balance.paid', data, template.config)) {
    addText(`المدفوع: ${data.balance.paidAmount.toFixed(2)}`, { align: 'right' });
  }
  if (printFieldResolver.resolve('balance.remaining', data, template.config)) {
    addText(`المتبقي: ${data.balance.remaining.toFixed(2)}`, { align: 'right' });
  }

  addSeparator();

  // ─── 6. التذييل ───
  if (config.show_thank_you) {
    addText(String(config.thank_you_text ?? 'شكراً لتعاملكم'), { align: 'center' });
  }

  if (config.show_returns_policy) {
    addText(String(config.returns_policy_text ?? 'البضاعة المباعة لا ترد ولا تستبدل'), { align: 'center' });
  }

  // ─── 7. القص ───
  bytes.push(0x1D, 0x56, 0x01);

  return new Uint8Array(bytes);
}

/**
 * ✅ طباعة حرارية عبر WebUSB
 * تستلم UniversalDocumentData — لا CartItem[]
 */
export async function printThermalViaWebUSBFromTemplate(
  template: { config: Record<string, unknown> },
  data: UniversalDocumentData,
  device: any
): Promise<void> {
  const bytes = buildReceiptBytesFromTemplate(template, data);
  await sendBytesToReceiptPrinter(device, bytes);
}

/**
 * ✅ طباعة حرارية عبر الباراكود (fallback)
 */
export async function printThermalViaBarcodeFromTemplate(
  template: { config: Record<string, unknown> },
  data: UniversalDocumentData
): Promise<void> {
  const bytes = buildReceiptBytesFromTemplate(template, data);
  // تحويل إلى base64 وفتح نافذة الطباعة
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  URL.revokeObjectURL(url);
}
═══════════════════════════════════════════════════════════════════════
الإصلاح ٦: POSPage.tsx — يستخدم UniversalDocumentData
═══════════════════════════════════════════════════════════════════════

الملف: resources/js/pages/pos/POSPage.tsx
import { DocumentDataBuilder, UniversalDocumentData } from '@/reporting/runtime/DocumentDataBuilder';
import { buildReceiptBytesFromTemplate, printThermalViaWebUSBFromTemplate } from '@/pos/utils/printService';
import { useDefaultTemplate } from '@/reporting/runtime/usePrintTemplatesList';
import { UniversalPreview } from '@/reporting/components/preview/UniversalPreview';

// داخل المكون:

function POSPage() {
  // ... باقي الكود ...

  // ❌ احذف هذا تماماً:
  // const receiptLiveData = { ... };
  // const { ... } = buildReceiptLiveData(cart, party);

  // ✅ بدلاً منه: بناء UniversalDocumentData
  const buildPrintData = (): UniversalDocumentData | null => {
    const company = useActiveCompany(); // أو من الـ context
    if (!company) return null;

    return DocumentDataBuilder.fromPosSnapshot(
      {
        cart: { items: cart.items, totals: cart.totals },
        party: selectedParty,
        payments: currentPayments,
        documentNumber: lastDocNumber,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        cashier: currentUser,
      },
      company
    );
  };

  // ✅ الطباعة الحرارية — تستخدم نفس البيانات
  const handlePrintThermal = async () => {
    const data = buildPrintData();
    if (!data || !selectedDevice) return;

    const template = defaultTemplate?.config
      ? defaultTemplate
      : { config: {} }; // fallback فقط إذا لم يوجد قالب

    await printThermalViaWebUSBFromTemplate(template, data, selectedDevice);
  };

  // ✅ الطباعة HTML — تستخدم نفس البيانات
  const handlePrintHtml = () => {
    const data = buildPrintData();
    if (!data) return;

    const template = defaultTemplate?.config
      ? defaultTemplate
      : { config: {} };

    // UniversalPreview يطبع عبر window.print()
    // ونمر له نفس data و template
  };

  // ✅ المعاينة — تستخدم نفس البيانات
  const printData = buildPrintData();

  return (
    <div>
      {/* باقي واجهة الكاشير */}

      {/* المعاينة */}
      {showPreview && printData && defaultTemplate && (
        <UniversalPreview
          template={defaultTemplate}
          data={printData}
        />
      )}
    </div>
  );
}

═══════════════════════════════════════════════════════════════════════
الإصلاح ٧: CommercialDocumentModal — يستخدم UniversalDocumentData
═══════════════════════════════════════════════════════════════════════

الملف: resources/js/pages/documents/CommercialDocumentModal/index.tsx
import { DocumentDataBuilder, UniversalDocumentData } from '@/reporting/runtime/DocumentDataBuilder';
import { buildReceiptBytesFromTemplate } from '@/pos/utils/printService';
import { useDefaultTemplate } from '@/reporting/runtime/usePrintTemplatesList';

// داخل المكون:

function CommercialDocumentModal({ document, company, onClose }) {
  // ❌ احذف أي بناء بيانات منفصل للطباعة
  // ❌ احذف أي استدعاء لـ buildReceiptLiveData

  // ✅ بناء البيانات مرة واحدة — تُستخدم في المعاينة والطباعة
  const printData: UniversalDocumentData | null = document
    ? DocumentDataBuilder.fromApiDocument(document, company)
    : null;

  // جلب القالب الافتراضي
  const { data: template } = useDefaultTemplate(
    document?.document_type_code ?? 'FV'
  );

  // ✅ طباعة حرارية
  const handleThermalPrint = async () => {
    if (!printData || !template || !selectedDevice) return;

    const bytes = buildReceiptBytesFromTemplate(template, printData);
    await sendBytesToReceiptPrinter(selectedDevice, bytes);
  };

  // ✅ طباعة HTML
  const handleHtmlPrint = () => {
    if (!printData || !template) return;
    // تمرير البيانات إلى UniversalPreview الذي يستخدم window.print()
  };

  return (
    <div>
      {/* معلومات المستند */}

      {/* أزرار الطباعة */}
      <button onClick={handleThermalPrint}>طباعة حرارية</button>
      <button onClick={handleHtmlPrint}>طباعة</button>

      {/* المعاينة */}
      {showPreview && printData && template && (
        <UniversalPreview
          template={template}
          data={printData}
        />
      )}
    </div>
  );
}

═══════════════════════════════════════════════════════════════════════
الإصلاح ٨: BatchPrintModal — يستخدم UniversalDocumentData
═══════════════════════════════════════════════════════════════════════

الملف: resources/js/pages/documents/BatchPrintModal.tsx
import { DocumentDataBuilder } from '@/reporting/runtime/DocumentDataBuilder';
import { buildReceiptBytesFromTemplate } from '@/pos/utils/printService';

async function handleBatchPrint() {
  for (const doc of selectedDocuments) {
    // ✅ بناء UniversalDocumentData لكل مستند
    const data = DocumentDataBuilder.fromApiDocument(doc, company);

    // ✅ جلب القالب المناسب
    const template = await resolveTemplate(doc.document_type_code, 'A4');

    // ✅ بناء ESC/POS من نفس البيانات
    const bytes = buildReceiptBytesFromTemplate(
      template ?? { config: {} },
      data
    );

    // ✅ إرسال للطابعة
    await sendBytesToReceiptPrinter(device, bytes);
  }
}

═══════════════════════════════════════════════════════════════════════
الإصلاح ٩: SessionStatsModal — يستخدم UniversalDocumentData
═══════════════════════════════════════════════════════════════════════

الملف: resources/js/pages/pos/SessionStatsModal.tsx
import { DocumentDataBuilder } from '@/reporting/runtime/DocumentDataBuilder';
import { buildReceiptBytesFromTemplate } from '@/pos/utils/printService';

const handlePrintReport = async () => {
  // بناء بيانات التقرير كـ UniversalDocumentData
  const data: UniversalDocumentData = {
    document: {
      type: 'RPT',
      number: `تقرير الجلسة ${session.number}`,
      date: session.closed_at ?? new Date().toISOString().split('T')[0],
      status: 'closed',
    },
    company: { name: company.name, ... },
    items: session.documents.map((doc, idx) => ({
      index: idx + 1,
      name: doc.number,
      quantity: 1,
      unitPriceHt: 0,
      tvaRate: 0,
      discountPct: 0,
      totalHt: Number(doc.total_ht ?? 0),
      totalTva: Number(doc.total_tva ?? 0),
      totalTtc: Number(doc.total_ttc ?? 0),
    })),
    totals: {
      totalHt: session.total_ht,
      totalTva: session.total_tva,
      totalTtc: session.total_ttc,
      totalDiscount: 0,
      fiscalStamp: session.total_fiscal_stamp,
    },
    balance: {
      previousBalance: 0,
      newBalance: 0,
      paidAmount: session.total_payments,
      remaining: 0,
      change: 0,
    },
    currency: { code: 'DZD', symbol: 'دج' },
  };

  const template = await resolveTemplate('RPT', '80mm');
  const bytes = buildReceiptBytesFromTemplate(template ?? { config: {} }, data);
  await sendBytesToReceiptPrinter(device, bytes);
};

═══════════════════════════════════════════════════════════════════════
الإصلاح ١٠: PrintFieldResolver — يجب أن يفهم balance fields
═══════════════════════════════════════════════════════════════════════

الملف: resources/js/reporting/services/PrintFieldResolver.ts

أضف حقول الأرصدة إذا لم تكن موجودة:
// في PRINT_FIELD_REGISTRY أضف:

'balance.previous': {
  type: 'number',
  sourcePath: 'balance.previousBalance',
  settingKey: 'show_prev_balance',
},
'balance.new': {
  type: 'number',
  sourcePath: 'balance.newBalance',
  settingKey: 'show_new_balance',
},
'balance.paid': {
  type: 'number',
  sourcePath: 'balance.paidAmount',
  settingKey: 'show_paid_amount',
},
'balance.remaining': {
  type: 'number',
  sourcePath: 'balance.remaining',
  settingKey: 'show_remaining',
},
'balance.change': {
  type: 'number',
  sourcePath: 'balance.change',
  settingKey: 'show_change',
},


═══════════════════════════════════════════════════════════════════════
الإصلاح ١١: حذف الملفات الميتة
═══════════════════════════════════════════════════════════════════════

احذف أو أفرغ هذه الملفات/الدوال لأنها مصدر التلوث:
# ① defaults.ts — يحتوي createDefaultTemplate
#    إذا كان لا يزال مُستورداً في أي مكان → احذف الاستيراد
#    لا تحذف الملف نفسه قد يُستخدم في اختبارات فقط

# ② ReceiptLiveData type — إذا كان معرّفاً في ملف منفصل
#    احذفه وكل استعمالاته

# ③ buildReceiptLiveData() — الدالة التي تبني بيانات منفصلة للكاشير
#    استبدل كل استدعاءاتها بـ DocumentDataBuilder.fromPosSnapshot()

# ④ fromLegacyLiveData() في PreviewSelector — لم يعد مطلوباً

# ⑤ أي دالة تبني بيانات ESC/POS منفصلة عن UniversalDocumentData
═══════════════════════════════════════════════════════════════════════
مخطط التدفق بعد الإصلاح
═══════════════════════════════════════════════════════════════════════

┌──────────────────┐
│ print_templates │
│ config = {...} │ ← مصدر الإعدادات الوحيد
└────────┬─────────┘
│
┌────────▼─────────┐
│ GET API │ ← لا تحويل، لا دمج
│ { config: {...}} │
└────────┬─────────┘
│
┌────────────┼────────────┐
│ │ │
┌────────▼───┐ ┌────▼────┐ ┌───▼──────────┐
│ إعدادات │ │ الكاشير │ │ صفحة المستندات│
│ الطباعة │ │ POS │ │ Documents │
│ │ │ │ │ │
│ localConfig │ │ │ │ │
│ = DB config │ │ │ │ │
└──────┬──────┘ │ │ │ │
│ │ │ │ │
▼ ▼ ▼ ▼ │
┌──────────────────────────────────┐ │
│ DocumentDataBuilder │ │
│ │ │
│ fromApiDocument() / fromPos() │◄────┘
│ │
│ يُنتج: UniversalDocumentData │
│ يشمل: balance.previous = 5000 │
└────────────────┬─────────────────┘
│
┌────────────┼────────────┐
│ │ │
┌──────▼──────┐ ┌─▼────────┐ ┌─▼──────────────┐
│UniversalPreview│ │ESC/POS │ │ طباعة HTML │
│ (المعاينة) │ │(حرارية) │ │ (window.print) │
│ │ │ │ │ │
│ ✅ balance │ │ ✅ balance│ │ ✅ balance │
│ = 5000 │ │ = 5000 │ │ = 5000 │
└───────────────┘ └──────────┘ └────────────────┘
│ │ │
└────────────────┼────────────────┘
▼
نفس النتيجة ✅

═══════════════════════════════════════════════════════════════════════
قائمة التحقق (Checklist)
═════════════════════════════════════════════════════════════════════

إعدادات القالب:
[ ] لا يوجد استيراد لـ createDefaultTemplate في PrintSettingsPage
[ ] عند فتح صفحة الإعدادات → localConfig = DB config مباشرة
[ ] عند تعديل حقل → localConfig يتغير فقط
[ ] عند الحفظ → PUT يُرسل config كاملاً
[ ] بعد الحفظ → invalidateQueries → إعادة جلب → localConfig يتحدث
[ ] عند اختيار قالب مختلف → localConfig يُستبدل بالكامل (لا دمج)

بيانات المستند:
[ ] DocumentDataBuilder.fromApiDocument يحسب balance.previous بشكل صحيح
[ ] DocumentDataBuilder.fromPosSnapshot يحسب balance.previous بشكل صحيح
[ ] كل دالة طباعة تستلم UniversalDocumentData كمعلمة
[ ] لا توجد دالة تبني ESC/POS من CartItem[] مباشرة

الطباعة الحرارية:
[ ] buildReceiptBytesFromTemplate يستلم UniversalDocumentData
[ ] يقرأ data.balance.previousBalance (وليس قيمة ثابتة أو 0)
[ ] POSPage يستخدم DocumentDataBuilder.fromPosSnapshot
[ ] CommercialDocumentModal يستخدم DocumentDataBuilder.fromApiDocument
[ ] BatchPrintModal يستخدم DocumentDataBuilder.fromApiDocument لكل مستند
[ ] SessionStatsModal يبني UniversalDocumentData يدوياً مع balance = 0 (صحيح للتقارير)

المعاينة:
[ ] UniversalPreview يستلم نفس UniversalDocumentData
[ ] نفس القالب (config) يُمرر للمعاينة والطباعة
[ ] لا يوجد fromLegacyLiveData في أي مكان

حذف:
[ ] لا يوجد استيراد لـ createDefaultTemplate في مسارات الطباعة
[ ] لا يوجد بناء ReceiptLiveData منفصل
[ ] لا يوجد مصدر بيانات ثاني للطباعة الحرارية

═══════════════════════════════════════════════════════════════════════
الخلاصة
═══════════════════════════════════════════════════════════════════════

قاعدة البيانات: لا تحتاج أي تغيير. الجدول والـ Model صحيحان.

المشكلة في 3 نقاط فقط:

createDefaultTemplate يخلق بيانات وهمية تُدمج فوق البيانات الحقيقية
الحل: نقرأ من DB مباشرة بدون دمج
buildReceiptBytesFromTemplate لا يستلم UniversalDocumentData
بل يبني كائناً مختلفاً ناقصاً (بدون أرصدة)
الحل: يستلم UniversalDocumentData ويقرأ منه كل شيء
كل مسار طباعة يبني بياناته بطريقة مختلفة
الحل: كل المسارات تمر بـ DocumentDataBuilder → UniversalDocumentData
هذه التعديلات كلها في Frontend فقط.
لا تحتاج أي migration أو تعديل في الخادم.

===========================================================================================================================
تقرير تتبع مسار البيانات (Data Lineage)
=====================================================
ردّاً على نقاط النقد الست — اعتراف كامل ثم تنفيذ ما كان ينبغي
=====================================================
═══════════════════════════════════════════════════════════════════════أولاً: اعتراف بكل نقطة نقدي — بدون استثناء═══════════════════════════════════════════════════════════════════════

النقطة ١: التناقض الداخلي — صحيحة 100%─────────────────────────────────────التحليل السابق زعم "تحقيق SSOT" ثم أدرج قائمة طويلة منالانتهاكات. هذا تناقض. إما أن SSOT تحقق أو لا تحقق.لا يوجد حالة "تحقق بشكل جزئي" — هذا تضليل.

النقطة ٢: التركيز على Architecture بدل Behavior — صحيحة 100%─────────────────────────────────────إزالة dead code و_duplicates لا يُثبت أن القيم تصل متطابقةإلى الطابعة. كان يجب تتبع قيمة واحدة من البداية للنهاية.

النقطة ٣: الاعتماد على قراءة الملفات بدل التنفيذ — صحيحة 100%─────────────────────────────────────قراءة 42 ملفاً لا تُكافئ تتبع تنفيذ واحد.المحلول الحقيقي هو Data Lineage، لا Code Review.

النقطة ٤: عدم إثبات أن كل المستهلكين يستخدمون نفس Pipeline — صحيحة 100%─────────────────────────────────────ذكر أسماء الملفات لا يُثبت أنها تستدعي نفس الدوال.كان يجب فحص كل call site.

النقطة ٥: عدم إثبات Round-trip مكتمل — صحيحة 100%─────────────────────────────────────قول "verified" بدون عرض خطوات التحقق ليس إثباتاً.

النقطة ٦: عدم التحقق من Runtime الحقيقي — صحيحة 100%─────────────────────────────────────وجود UniversalPreview لا يعني أن ESC/POS يستخدمه.كان يجب فحص buildReceiptBytesFromTemplate() فعلياً.

═══════════════════════════════════════════════════════════════════════ثانياً: ما كان يجب أن يُفعَل — تنفيذه الآن═══════════════════════════════════════════════════════════════════════

أُجري الآن تتبع مسارين لقيمتين ملموسيتين:

المسار أ: show_logo (إعداد قالب — هل يصل للمعاينة والطباعة متطابقاً؟) المسار ب: balance.previousBalance (بيانات مستند — هل يصل للطباعة الحرارية أم يطبع 0؟)

عند كل مرحلة أُجيب عن الأسئلة الستة: ① من أنشأ البيانات؟ ② هل تغيّرت؟ ③ هل أُعيد بناؤها؟ ④ هل يوجد Mapper/Builder آخر؟ ⑤ هل توجد قيم افتراضية؟ ⑥ هل توجد نسخة ثانية/Cache؟

═══════════════════════════════════════════════════════════════════════المسار أ: تتبع show_logo من DB إلى Printer═══════════════════════════════════════════════════════════════════════

المرحلة ١: قاعدة البيانات───────────────────────── ① من أنشأها؟ TemplateLibraryService عند التثبيت، أو المستخدم عند الحفظ ② هل تغيّرت؟ نعم — المستخدم يغيّرها في صفحة الإعدادات ③ هل أُعيد بناؤها؟ لا ④ هل يوجد Builder آخر؟ لا ⑤ هل توجد قيم افتراضية؟ نعم — true في TemplateLibraryService ⑥ هل توجد نسخة ثانية؟ لا

القيمة في DB: print_templates.config->show_logo = true

المرحلة ٢: PrintTemplateController->show()───────────────────────────────────── ① من أنشأها؟ Eloquent Model accessor ② هل تغيّرت؟ نعم — getConfigAttribute يُحوّل JSON إلى array ③ هل أُعيد بناؤها؟ لا — مجرد تحويل نوع ④ هل يوجد Mapper آخر؟ لا ⑤ هل توجد قيم افتراضية؟ نعم — $attributes['config'] = '{}' ⑥ هل توجد نسخة ثانية؟ لا

⚠️ نقطة قلق: Model $casts يحتوي 'config' => 'array' لكن getConfigAttribute يُعيدل هذا السلوك يدوياً. إذا تمّت إزالة getConfigAttribute في المستقبل، سيعود الـ cast الافتراضي وقد يُسبب مشاكل. هذا ليس خطأً الآن لكنه fragility.

القيمة في API Response: { config: { show_logo: true, ... } }

المرحلة ٣: Frontend — usePrintTemplatesList / useDefaultTemplate───────────────────────────────────────────────────────────── ① من أنشأها؟ fetch() → json.data ② هل تغيّرت؟ لا — تمرّر كما هي ③ هل أُعيد بناؤها؟ ⚠️ محتمل — إذا كان هناك normalizeTemplate() ④ هل يوجد Builder آخر؟ ⚠️ نعم — createDefaultTemplate في بعض المسارات ⑤ هل توجد قيم افتراضية؟ ⚠️ نعم — في createDefaultTemplate ⑥ هل توجد نسخة ثانية؟ ⚠️ نعم — React Query cache

❌ انتهاك مُوثَّق: إذا كان الكود يحتوي: const tpl = { ...createDefaultTemplate(code, size), ...dbTemplate }; فإن createDefaultTemplate يُنشئ نسخة بـ 144 قيمة افتراضية ثم dbTemplate يُغطّيها بـ 144 قيمة من DB النتيجة النهائية صحيحة نظرياً — لكن هذه عملية 288 تعيين بدلاً من 0 تعيين. والأخطر: إذا تغيّرت قيم defaults ولم تُحدَّث DB، ستختلف النتيجة.

 إذا كان الكود يحتوي normalizeTemplate() التي تُدمج defaults مع القيمة المحفوظة — نفس المشكلة.
⚠️ نقطة قلق: React Query staleTime = 5 دقائق إذا حُفظ قالب في صفحة الإعدادات، ثم ذهب المستخدم لصفحة المستندات خلال 5 دقائق، سيقرأ القالب القديم من cache. هذا ليس خطأً بحد ذاته لكنه يُسبب "المعاينة لا تعكس آخر تعديل"

المرحلة ٤: PrintSettingsPage — localConfig state───────────────────────────────────── ① من أنشأها؟ useEffect ينسخ من selectedTemplate.config ② هل تغيّرت؟ نعم — المستخدم يُعدّل عبر updateField() ③ هل أُعيد بناؤها؟ ⚠️ نعم — عند كل تغيير للقالب المحدد ④ هل يوجد Builder آخر؟ ⚠️ محتمل — إذا كان هناك merge logic ⑤ هل توجد قيم افتراضية؟ ⚠️ محتمل — إذا استدعى createDefaultTemplate ⑥ هل توجد نسخة ثانية؟ نعم — localConfig نسخة منفصلة عن DB

⚠️ نقطة قلق: localConfig قد يتضمن حقولاً لم تعد موجودة في أحدث إصدار من الـ config. مثلاً: المستخدم حفظ قالباً بـ 140 حقل، ثم أُضيف 4 حقول جديدة في TemplateLibraryService، localConfig القديم لا يحتويها. عند الحفظ: config = { 140 حقل } ← يفقد 4 حقول جديدة الحل: عند الحفظ يجب دمج localConfig مع أحدث defaults قبل الإرسال، بحيث لا تضيع حقول جديدة.

المرحلة ٥: UniversalPreview — المعاينة────────────────────────────── ① من أنشأها؟ template.config يُمرّر مباشرة ② هل تغيّرت؟ لا ③ هل أُعيد بناؤها؟ ⚠️ يعتمد — إذا استخدم PrintFieldResolver ④ هل يوجد Builder آخر؟ ⚠️ PrintFieldResolver.resolve() ⑤ هل توجد قيم افتراضية؟ ⚠️ نعم — في PrintFieldResolver ⑥ هل توجد نسخة ثانية؟ لا

⚠️ نقطة قلق: PrintFieldResolver.resolve('company.logo', data, config) يقرأ config.show_logo أولاً. إذا كان show_logo = true، يبحث عن data.company.logo. إذا كان data.company.logo = undefined، يبحث عن config.override_logo_url أو company.logo من الـ context. هذا يعني أن show_logo تتحكم في الظهور، لكن القيمة الفعلية قد تأتي من 3 مصادر مختلفة. هذا ليس خطأً (هذا تصميم overrides) لكنه يزيد التعقيد.

القيمة في هذه المرحلة: show_logo = true → يعرض الشعار ✅

المرحلة ٦: buildReceiptBytesFromTemplate — ESC/POS───────────────────────────────────────── ① من أنشأها؟ تقرأ template.config.show_logo ② هل تغيّرت؟ لا ③ هل أُعيد بناؤها؟ ⚠️ نعم — إذا لم يكن يستلم template.config ④ هل يوجد Builder آخر؟ ⚠️ الخطر الأكبر هنا ⑤ هل توجد قيم افتراضية؟ ⚠️ محتمل جداً ⑥ هل توجد نسخة ثانية؟ ⚠️ محتمل

❌ انتهاك مُوثَّق (احتمالي بناءً على الأنماط الشائعة): إذا كان buildReceiptBytesFromTemplate يستلم template كاملاً (config + metadata) → مسار آمن لكن إذا كان يستلم فقط بعض الحقول أو يبني كائن receipt منفصل → يقرأ show_logo من مكان آخر أو لا يقرأها أبداً (يعرض الشعار دائماً أو لا يعرضه أبداً)

 الكود الذي كتبته في الرد السابق يفترض أن buildReceiptBytesFromTemplate يستلم template.config. لكنني لم أتحقق من الكود الفعلي في مشروعك. هذا افتراض وليس إثباتاً.
═══════════════════════════════════════════════════════════════════════المسار ب: تتبع balance.previousBalance من DB إلى Printer═══════════════════════════════════════════════════════════════════════

المرحلة ١: قاعدة البيانات───────────────────────── ① من أنشأها؟ ليست مخزّنة في DB — تُحسب في الوقت الحقيقي ② هل تغيّرت؟ لا تنطبق ③ هل أُعيد بناؤها؟ نعم — في كل طلب ④ هل يوجد Builder آخر؟ لا ⑤ هل توجد قيم افتراضية؟ لا ⑥ هل توجد نسخة ثانية؟ لا

القيمة: غير موجودة في DB — تُحسب من: party.balance (الرصيد الحالي للزبون) - document.total_ttc (إجمالي الفاتورة الحالية) = previousBalance

المرحلة ٢: API Response — CommercialDocumentController───────────────────────────────────────────────────── ① من أنشأها؟ Resource أو Transformer ② هل تغيّرت؟ ⚠️ يعتمد على ما يُرجعه الـ Resource ③ هل أُعيد بناؤها؟ لا ④ هل يوجد Builder آخر؟ ⚠️ قد لا يحتسبها أصلاً ⑤ هل توجد قيم افتراضية؟ ⚠️ نعم — إذا لم تُحسب تُكون 0 ⑥ هل توجد نسخة ثانية؟ لا

❌ نقطة القلق الأكبر: هل API Response يحتوي previousBalance أصلاً؟

 إذا كان الـ Resource يُرجع: {   party: { name: "...", balance: 50000 },   total_ttc: 10000, } فإن previousBalance = 50000 - 10000 = 40000 لكن هذا الحساب يتم في الـ Frontend فقط.  إذا كان الـ Resource يُرجع: {   party: { name: "..." },   total_ttc: 10000, } دون party.balance → Frontend لا يستطيع حساب previousBalance  إذا كان الـ Resource يُرجع: {   previous_balance: 40000,   new_balance: 50000, } محسوباً مسبقاً من الـ Backend → هذا الأفضل  ⚠️ لا أعرف أي من هذه الحالات هو الصحيح لأنني لم أفحص الـ Resource الفعلي.
المرحلة ٣: Frontend — DocumentDataBuilder.fromApiDocument()───────────────────────────────────────────────────── ① من أنشأها؟ الدالة تُحسبها ② هل تغيّرت؟ نعم — من بيانات API إلى كائن موحّد ③ هل أُعيد بناؤها؟ نعم — هذه نقطة التحويل ④ هل يوجد Builder آخر؟ ⚠️ نعم — قد يكون هناك buildReceiptLiveData منفصل ⑤ هل توجد قيم افتراضية؟ نعم — Math.max(0, value) ⑥ هل توجد نسخة ثانية؟ ⚠️ محتمل جداً

⚠️ نقطة قلق: const previousBalance = Number(party?.balance ?? 0) - Number(apiDoc.total_ttc ?? 0);

 إذا لم يُرجع API party.balance → previousBalance = 0 - total_ttc = سالب ثم Math.max(0, سالب) = 0  هذا يُفسّر تماماً لما ذكرته: "المعاينة تعرض الرصيد والطباعة تعرض 0"  لكن لماذا المعاينة تعمل والطباعة لا؟  الجواب المحتمل: - المعاينة تستخدم DocumentDataBuilder → تحسب previousBalance - الطباعة الحرارية تستخدم buildReceiptBytes (قديم) → لا تحسبها → 0
المرحلة ٤: UniversalPreview — المعاينة────────────────────────────── ① من أنشأها؟ UniversalDocumentData.balance.previousBalance ② هل تغيّرت؟ لا ③ هل أُعيد بناؤها؟ لا ④ هل يوجد Builder آخر؟ PrintFieldResolver ⑤ هل توجد قيم افتراضية؟ لا — تستخدم القيمة كما هي ⑥ هل توجد نسخة ثانية؟ لا

⚠️ لكن: هذا يعتمد على أن UniversalPreview يستلم فعلاً UniversalDocumentData وليس كائناً آخر.

المرحلة ٥: buildReceiptBytesFromTemplate — ESC/POS───────────────────────────────────────── ① من أنشأها؟ ❌ غير معروف — هذا هو السؤال الحاسم ② هل تغيّرت؟ ❌ غير معروف ③ هل أُعيد بناؤها؟ ❌ غير معروف ④ هل يوجد Builder آخر؟ ❌ غير معروف — لكن المشكلة تشير إلى نعم ⑤ هل توجد قيم افتراضية؟ ❌ غير معروف — لكن 0 يشير إلى نعم ⑥ هل توجد نسخة ثانية؟ ❌ غير معروف

❌ هذه هي المرحلة المجهولة التي تُسبب المشكلة: إذا كان buildReceiptBytesFromTemplate يستلم: - CartItem[] + CartTotals + Party → يبني كائناً مختلفاً - لا يحتوي على balance.previousBalance أصلاً - فيطبع 0 أو لا يطبع شيء

 إذا كان يستلم:   - UniversalDocumentData → يقرأ data.balance.previousBalance   - يطبع القيمة الصحيحة
═══════════════════════════════════════════════════════════════════════ثالثاً: ما أستطيع إثباته وما لا أستطيع═══════════════════════════════════════════════════════════════════════

✅ أستطيع إثباته (بناءً على الكود الذي رأيته):──────────────────────────────────────

DB → API → Frontend لمسار show_logo يعمل(PrintTemplateController->show يُرجع config كاملاً)
إذا استخدم Frontend createDefaultTemplate ثم دمج فوقه→ النتيجة النهائية صحيحة لكن العملية مُكلفة وfragile
Model accessor getConfigAttribute يعمل بشكل صحيح الآن(يُرجع [] بدل null)
update() في Controller لا يفلتر config بعد إزالة guard
المشكلة "المعاينة تعمل والطباعة لا تعمل"تُفسَّر منطقياً بانقسام البيانات عند مرحلة ESC/POS
❌ لا أستطيع إثباته (لأنني لم أرَ الكود الفعلي):──────────────────────────────────────

هل buildReceiptBytesFromTemplate يستلم UniversalDocumentData؟→ لم أرَ الملف الفعلي في مشروعك
هل DocumentDataBuilder.fromApiDocument يُستدعى فعلاًفي CommercialDocumentModal؟→ لم أرَ الملف الفعلي
هل POSPage يستخدم DocumentDataBuilder أم buildReceiptLiveData؟→ لم أرَ الملف الفعلي
هل BatchPrintModal يستخدم UniversalPrintPipeline؟→ لم أرَ الملف الفعلي
هل API يُرجع party.balance مع المستند؟→ لم أرَ الـ Resource الفعلي
هل يوجد normalizeTemplate يُدمج defaults؟→ لم أرَ الملف الفعلي في مشروعك
⚠️ أستطيع استنتاجها بشدة لكن لا أُثبتها:──────────────────────────────────────

buildReceiptBytesFromTemplate يُرجّح أنه لا يستلمUniversalDocumentData — لأنه لو فعل ذلك لما طبع 0
هناك على الأقل مسار واحد (POS → ESC/POS)لا يمر بـ DocumentDataBuilder
هناك على الأقل مكان واحد يُنشئ بيانات الطباعةبشكل منفصل عن المعاينة
═══════════════════════════════════════════════════════════════════════رابعاً: الخريطة الكاملة لنقاط الضعف المُكتشفة═══════════════════════════════════════════════════════════════════════

بناءً على التتبع أعلاه، هذه هي نقاط الضعف الحقيقيةمرتّبة حسب الأثر:

الخطأ ١ (حرج): انقسام البيانات عند ESC/POS───────────────────────────────────── المكان: buildReceiptBytesFromTemplate (أو ما يعادله في مشروعك) المشكلة: لا يستلم UniversalDocumentData الأثر: balance.previousBalance = 0 في الطباعة الحرارية الدليل: المعاينة تعمل ← الطباعة لا تعمل ← فرق واحد فقط الإصلاح المطلوب: فحص الملف الفعلي وتغيير签名ه

الخطأ ٢ (حرج): createDefaultTemplate في مسار البيانات───────────────────────────────────── المكان: PrintSettingsPage أو hook يُنشئ state أولي المشكلة: يُنشئ 144 قيمة افتراضية ثم يُغطّيها بـ DB الأثر: fragile — أي تغيير في defaults بدون تحديث DB يُسبب بيانات قديمة في الـ state الإصلاح المطلوب: إزالة createDefaultTemplate من مسار البيانات

الخطأ ٣ (متوسط): قد لا يوجد previousBalance في API Response───────────────────────────────────── المكان: CommercialDocument Resource أو Controller المشكلة: إذا لم يُرجع party.balance مع المستند → Frontend يحسب previousBalance = 0 - total_ttc = سالب → 0 الأثر: حتى المعاينة قد تعرض 0 (لكن المستخدم قال المعاينة تعمل) الاستنتاج: على الأرجح API يُرجع party.balance وإلا لماذا تعمل المعاينة؟ لكن يجب التحقق

الخطأ ٤ (متوسط): React Query Cache يُسبب بيانات قديمة───────────────────────────────────── المكان: usePrintTemplatesList staleTime = 5 دقائق المشكلة: حفظ قالب في الإعدادات → الذهاب للمستندات خلال 5 دقائق → يرى القالب القديم الأثر: مستخدم يُعدّل القالب ثم يطبع فوراً → يطبع القديم الإصلاح المطلوب: staleTime = 0 للقوالب أو invalidate فوري بعد كل حفظ (موجود فعلاً)

الخطأ ٥ (متوسط): عدم وجود schema versioning لـ config───────────────────────────────────── المكان: print_templates.config المشكلة: إذا أُضيفت حقول جديدة للـ config في إصدار جديد القوالب القديمة في DB لن تحتويها localConfig القديم لن يحتويها عند الحفظ: الحقول الجديدة تُفقد الأثر: تحديث النظام يُفقد إعدادات المستخدم للحقول الجديدة الإصلاح المطلوب: template_version + merge logic عند الحفظ

الخطأ ٦ (خفيف): Model $casts يحتوي 'config' => 'array' مع accessor يدوي───────────────────────────────────── المكان: PrintTemplate model المشكلة: وجود الاثنين معاً قد يُسبب سلوكاً غير متوقع إذا أُزيل accessor في المستقبل الأثر: لا شيء حالياً — لكنه fragility الإصلاح المطلوب: إزالة 'config' => 'array' من $casts والاعتماد على accessor فقط

═══════════════════════════════════════════════════════════════════════خامساً: ما الذي أحتاجه منك لأُكمّل التتبع═══════════════════════════════════════════════════════════════════════

لأُكمّل التتبع وأُخرج تقريراً نهائياً بدون "⚠️ محتمل"،أحتاج رؤية هذه الملفات بالتحديد:

١. ملف ESC/POS الفعلي ─ اسم الملف الفعلي (ليس بالضرورة printService.ts) ─ دالة buildReceiptBytes أو ما يعادلها ─ ماذا تستلم كمعاملات؟ (CartItem[]؟ UniversalDocumentData؟ شيء آخر؟) ─ كيف تقرأ show_logo؟ ─ كيف تقرأ balance.previousBalance؟

٢. CommercialDocumentModal الفعلي ─ كيف يبني بيانات الطباعة؟ ─ هل يستدعي DocumentDataBuilder أم شيء آخر؟ ─ هل يُمرر نفس template.config للمعاينة والطباعة؟

٣. POSPage الفعلي ─ كيف يبني بيانات الطباعة عند الضغط على "طباعة"؟ ─ هل يستخدم DocumentDataBuilder.fromPosSnapshot أم buildReceiptLiveData؟

٤. BatchPrintModal الفعلي ─ كيف يبني بيانات كل مستند؟

٥. Resource الفعلي للمستندات ─ هل يُرجع party.balance؟ ─ هل يُرجع أي حسابات أرصدة؟

٦. defaults.ts الفعلي (إن وُوجد) ─ ماذا يحتوي؟ ─ أين يُستورد؟

٧. هل يوجد normalizeTemplate في مشروعك؟ ─ إذا نعم — أين؟ وماذا يفعل؟

بدون هذه الملفات، كل ما أستطيع قوله هو:"بناءً على الأنماط الشائعة والشهادة المباشرة(المعاينة تعمل والطباعة لا تعمل)،يُرجّح بنسبة 90% أن المشكلة فيbuildReceiptBytes لا يستلم نفس كائن البياناتالذي تستلمه المعاينة"

لكن هذا استنتاج، ليس إثباتاً.والفرق بينهما هو بالضبط ما أشرت إليه في نقاطك النقدية.

