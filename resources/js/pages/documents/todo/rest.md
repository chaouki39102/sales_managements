# المتبقي من STUDY_extended.md

> نسبة الإنجاز الكلية: ~38%
> ما طُبِّق: todo/ بالكامل (100% من ملفات التنفيذ) + فصول 1–9

---

## ✅ تم إنجازه

| البند | الملفات |
|---|---|
| أنواع document.types.ts | `document.types.ts` |
| هوك useDocumentForm | `hooks/useDocumentForm.ts` |
| هوك useDocumentLookups | `hooks/useDocumentLookups.ts` |
| هوك useComputeLine | `hooks/useComputeLine.ts` |
| هوك useCreditCheck | `hooks/useCreditCheck.ts` |
| هوك useDocumentChain | `hooks/useDocumentChain.ts` |
| مكون DocumentChainPanel | `components/DocumentChainPanel.tsx` |
| مكون CreditCheckBar | `components/CreditCheckBar.tsx` |
| مكون ReturnDocumentModal | `components/ReturnDocumentModal.tsx` |
| مكون DocumentLineRow | `components/DocumentLineRow.tsx` |
| المودال الرئيسي | `CommercialDocumentModal.tsx` |
| ComputeLineService | `app/Services/ComputeLineService.php` |
| DocumentConversionService | `app/Services/DocumentConversionService.php` |
| DocumentReturnService | `app/Services/DocumentReturnService.php` |
| CreditCheckService | `app/Services/CreditCheckService.php` |
| DocumentComputeController | `app/Http/Controllers/Api/V1/DocumentComputeController.php` |
| طلب التوثيق | `app/Http/Requests/StoreCommercialDocumentRequest.php` |
| validateDocument | `app/Services/CommercialDocumentService.php` |
| Routes | `routes/api.php` |
| اسم الطرف في الدفعات | `FinancePage.tsx` |
| **الفصل 5: نظام التسليم** | `DeliveryProgressBar.tsx`, تحويل BCC→BL delivery logic |
| **الفصل 6: معالجة الشيكات** | `CheckFormFields.tsx`, `ChecksPage.tsx`, route + nav |
| **الفصل 7: الفاتورة المبدئية** | `is_proforma` toggle/badge/logic + تحويل مبدئي→حقيقي |
| **الفصل 8: الشحن والتسليم** | `ShippingInfoSection.tsx` + `delivery_date`, `shipping_info` في النموذج |
| **الفصل 9: شروط الدفع** | `PaymentTermsTable.tsx` + `payment_terms` في النموذج |
| **تحسينات PaymentTermsTable** | حقل مبلغ قابل للكتابة + حساب عكسي (نسبة↔مبلغ) + زر المبلغ المتبقي + عملة `دج` |
| **Tabs للمساحة** | `Tabs` component في `DocumentUIPrimitives.tsx` + دمج الشحن/شروط الدفع في tabs |
| **مودال التحويل** | `ConvertDocumentModal.tsx` — تاريخ, اختيار نوع, لوحة مفاتيح |
| **تحسينات سلسلة المستندات** | عرض الكود + الاسم الكامل في chain panel و قائمة التحويل |

---

## ❌ المتبقي — فصول 10–24

### الفصل 10: الإعفاء الضريبي
**الملفات المطلوبة:**
- `services/TaxRuleService.php` — تحديد `effective_tva_rate` لكل (منتج × زبون)
- تحديث `ComboBox` أيقونة "معفى من TVA"
- تحديث `DocumentLineRow.tsx` — TVA = 0 تلقائياً وقراءة فقط للزبون المعفى

**المنطق:**
- `Party.is_tva_exempt` ← 0 TVA
- `Party.is_final_consumer` ← قواعد مختلفة
- `Product.tva_id` × `Party.tax_regime`

---

### الفصل 11: تحليلات مدمجة (CustomerInsightPanel)
**الملفات المطلوبة:**
- `components/CustomerInsightPanel.tsx`
- `hooks/useCustomerInsights.ts`

**المنطق:**
- آخر 5 مستندات للزبون
- متوسط قيمة الفاتورة الشهرية
- متوسط أيام السداد الفعلية
- المنتجات الأكثر شراءً (top 5)

---

### الفصل 12: محرك الاقتراحات الذكية
**الملفات المطلوبة:**
- `hooks/useProductSuggestions.ts`
- `components/SmartSuggestionsPanel.tsx`

**المنطق:**
- عند إضافة منتج: "اشتراه آخر مرة بسعر X"
- Cross-sell: "يُشترى عادةً مع Y, Z"
- Upsell: "خصم كمية عند ≥50 وحدة — أنت تطلب 30"

---

### الفصل 13: الدفع المسبق (Advance Payment)
**الملفات المطلوبة:**
- `hooks/useAdvancePayments.ts`
- تحديث `CommercialDocumentModal.tsx` — إشعار التسبيق غير المُستخدم

**المنطق:**
- `Payment.getUnappliedAmount()` موجود في الباكاند
- إشعار "لديه تسبيق X دج — هل تريد تطبيقه؟"
- ربط الدفعة بالفاتورة عبر `document_payment.amount_applied`

---

### الفصل 14: المطابقة البنكية
**الملفات المطلوبة:**
- `pages/reconciliation/BankReconciliationPage.tsx`
- `services/BankReconciliationService.php`

**المنطق:**
- `Payment.is_reconciled`, `reconciliation_date`, `bank_reference`
- واجهة 3 أعمدة: النظام ← المقترحات ← كشف البنك

---

### الفصل 15: تنبيهات ذكية
**الملفات المطلوبة:**
- `services/AlertEngine.php`
- `hooks/useAlerts.ts`
- `components/AlertBell.tsx`

**المنطق:**
- فواتير متأخرة، شيكات تستحق، مخزون منخفض — يومياً
- تنبيهات فورية بعد الحفظ

---

### الفصل 16: إحصاءات وتقارير مدمجة
**الملفات المطلوبة:**
- سرعة البيع (Velocity Report)
- تقرير الهامش (Margin Report)
- لوحة الديون (Aging Report — 0-30 / 31-60 / 61-90 / 90+ يوم)

---

### الفصل 17: المخزون متعدد المستودعات في السطر
**الملفات المطلوبة:**
- مigration لإضافة `warehouse_id` إلى `commercial_document_lines`
- تحديث `DocumentLineRow.tsx` — اختيار مستودع لكل سطر

**المنطق:**
- يُرث من header إذا لم يُحدَّد
- حركة المخزون من مستودع السطر

---

### الفصل 18: نظام الموافقات
**الملفات المطلوبة:**
- `models/ApprovalThreshold.php`
- `services/ApprovalWorkflowService.php`
- تحديث `CommercialDocumentModal.tsx` — تحذير "يتجاوز الحد — سيُرسَل للموافقة"

**المنطق:**
- `net_to_pay > threshold` ← حالة `pending_approval`
- إشعار للمدير ← موافقة أو رفض مع سبب

---

### الفصل 19: استيراد/تصدير
**الملفات المطلوبة:**
- استيراد أسطر من Excel
- تصدير PDF / Excel / JSON / XML

---

### الفصل 20: الذاكرة الذكية للمودال
**الملفات المطلوبة:**
- حفظ مسودة تلقائية في localStorage كل 30 ثانية
- اقتراحات ذكية (المستودع المفضل، فئة السعر المعتادة)

---

### الفصل 21: واجهة السطر — Card Mode
**الملفات المطلوبة:**
- `components/LineCard.tsx` — وضع البطاقة لكل سطر
- toggle Table/Card Mode

---

### الفصل 22: إدخال الباركود
**الملفات المطلوبة:**
- `components/BarcodeInput.tsx`
- البحث بـ `Product.barcode` + إضافة سطر / زيادة كمية

---

### الفصل 23: التواصل مع الزبون
**الملفات المطلوبة:**
- `services/DocumentMailService.php`
- زر "إرسال للزبون" في footer المودال
- إرفاق PDF تلقائياً

---

### الفصل 24: تكامل السنة المالية
**الملفات المطلوبة:**
- تحقق: تاريخ المستند ضمن نطاق السنة المالية
- تحقق: السنة المالية مفتوحة (`is_closed = false`)
- تحذير فوري عند عدم التطابق

---

## 🐛 مشاكل صغيرة متبقية

| المشكلة | الموقع | الحل |
|---|---|---|
| `lineWarnings` من useDocumentForm غير مستخدمة | `CommercialDocumentModal.tsx` و `DocumentLineRow.tsx` | تمرير `lineWarnings` للـ row وعرضها |
| `_warnings` في LineItem غير معروضة | `DocumentLineRow.tsx` | إضافة صف تحذير أسفل كل سطر من `line._warnings` |

---

**ملخص:** 24 فصلاً، أُنجز 9 فصول كاملة (~38%)، بقي 15 فصلاً (~62%) + تحسينات PaymentTermsTable + Tabs + مشكلتين صغيرتين في `lineWarnings` و `_warnings`.



