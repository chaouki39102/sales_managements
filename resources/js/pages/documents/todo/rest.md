# المتبقي من STUDY_extended.md

> نسبة الإنجاز الكلية: ~15-20%
> ما طُبِّق: todo/ بالكامل (100% من ملفات التنفيذ) + فصول 1-4

---

## ✅  تم إنجازه

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
| DocumentComputeController | `app/Http/Controllers/Api/V1/DocumentComputeController.php`|
| طلب التوثيق | `app/Http/Requests/StoreCommercialDocumentRequest.php` |
| validateDocument | `app/Services/CommercialDocumentService.php` |
| Routes | `routes/api.php` |
| اسم الطرف في الدفعات | `FinancePage.tsx` |

---

## ❌ المتبقي — فصول 5-24

### الفصل 5: نظام التسليم والتتبع
**الملفات المطلوبة:**
- تحديث `DocumentConversionService.php` (موجود جزئياً)
- `components/DeliveryProgress.tsx` — شريط تقدم التسليم في أسطر BCC
- `components/DeliveryTrackingBadge.tsx` — Badge "مُسلَّم كلياً / جزئياً"
- تحديث `DocumentLineRow.tsx` لإظهار progress bar للأسطر القابلة للتسليم

**المنطق:**
- تحويل BCC→BL يُحدِّث `delivered_quantity`
- `getRemainingQuantity()` محسوبة = `quantity - delivered_quantity - returned_quantity`
- الفرونتند يُظهر 300/500 (60%)

---

### الفصل 6: نظام معالجة الشيكات
**الملفات المطلوبة:**
- `components/CheckFormFields.tsx` — حقول الشيك (رقم، بنك، تاريخ استحقاق)
- `pages/checks/ChecksPage.tsx` — صفحة إدارة الشيكات
- تحديث `PaymentForm` في `CommercialDocumentModal.tsx` — إظهار حقول الشيك عند اختيار طريقة دفع "شيك"

**المنطق:**
- `Payment.check_id` → `Check` model
- دورة حياة الشيك: received → deposited → cleared / returned
- تنبيه قبل أسبوع من تاريخ الاستحقاق
- الحقول مخزَّنة في `payments.*.check_number`, `check_bank`, `check_due_date` (موجودة في Request)

---

### الفصل 7: الفاتورة المبدئية (Pro Forma)
**الملفات المطلوبة:**
- تحديث `CommercialDocumentModal.tsx` — إضافة toggle `is_proforma`
- تحديث `CommercialDocumentService.php` — تخطي حركات المخزون والدفعات إذا `is_proforma`

**المنطق:**
- `CommercialDocument.is_proforma` موجود في DB
- Badge "مبدئية" بجانب العنوان
- زر "تأكيد وتحويل لفاتورة حقيقية"

---

### الفصل 8: بيانات الشحن والتسليم
**الملفات المطلوبة:**
- `components/ShippingInfoSection.tsx` — قسم الشحن القابل للطي

**المنطق:**
- `shipping_info` JSON: address, transport_mode, driver_name, vehicle_plate, driver_notes
- `delivery_date` — تاريخ التسليم
- يُظهر فقط لـ BL و BCC
- `shipping_info.*` موجودة في Request

---

### الفصل 9: شروط الدفع المفصلة
**الملفات المطلوبة:**
- `components/PaymentTermsTable.tsx` — جدول شروط الدفع

**المنطق:**
- `payment_terms` JSON array: `[{due_date, percentage, amount, notes}]`
- يُحسَب تلقائياً من `credit_days` الزبون أو يُدخَل يدوياً
- المجموع يساوي `net_to_pay`
- يُخزَّن في `CommercialDocument.payment_terms` (موجود في DB)

---

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

## 🐛  مشاكل صغيرة متبقية

| المشكلة | الموقع | الحل |
|---|---|---|
| `lineWarnings` من useDocumentForm غير مستخدمة | `CommercialDocumentModal.tsx` و `DocumentLineRow.tsx` | تمرير `lineWarnings` للـ row وعرضها |
| `_warnings` في LineItem غير معروضة | `DocumentLineRow.tsx` | إضافة صف تحذير أسفل كل سطر من `line._warnings` |

---

**ملخص:** 24 فصلاً، أُنجز 4 فصول كاملة (~17%)، بقي 20 فصلاً (~83%) + مشكلتين صغيرتين في `lineWarnings` و `_warnings`.
