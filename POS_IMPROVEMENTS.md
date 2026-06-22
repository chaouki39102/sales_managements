# اقتراحات تحسين صفحة POS

## 🎯 أداء وبنية الكود

1. **تقسيم POSPage.tsx** (2349 سطراً) إلى مكونات أصغر — حاليًا كل الميزات (TopBar, ProductGrid, Cart, PaymentModal, Receipt, KeyboardHelp, ManualProductModal, SessionStatsModal) معرفة في نفس الملف مما يصعب الصيانة وإعادة الاستخدام.

2. **إضافة التحميل البطيء (Lazy Loading) للمنتجات** — خصوصًا مع وجود آلاف المنتجات، التحميل الحالي قد يسبب بطئًا في تجربة المستخدم.

## 🧮 المبيعات والمدفوعات

3. **إدارة المرتجعات (Returns/Refunds)** — لا يوجد حالياً أي دعم لإرجاع المنتجات أو استرجاع المدفوعات.

4. **إضافة الخصم على مستوى الفاتورة** — حاليًا الخصم مضاف فقط على مستوى الصنف (سطر في الفاتورة)، وليس على مستوى الفاتورة بالكامل.

5. **تفعيل العملات المتعددة بالكامل** — يوجد `currencies` في الـ lookup لكن الميزة غير مفعلة بشكل كامل في واجهة الدفع.

6. **إيداع / دفع جزئي (Partial Payment)** — دفع جزء من المبلغ والباقي لاحقًا (مناسب للمؤسسات التي تتعامل بالآجل).

## 📠 الطباعة والأجهزة

7. **دعم طابعة حرارية (ESC/POS)** مباشرة — عبر WebUSB أو مكتبات متخصصة للطباعة الحرارية بدلاً من `window.print()` فقط.

8. **شاشة عرض العميل (Customer Display)** — عرض الأصناف والمبلغ الإجمالي في شاشة ثانية موجهة للعميل.

## 📱 تجربة المستخدم

9. **أزرار اختصارية سريعة قابلة للتخصيص (Quick Keys)** — شبكة منتجات سريعة تشبه أنظمة الـ POS التقليدية يمكن للمستخدم تخصيصها حسب احتياجه.

10. **تحسين الـ Barcode Scanner** — حاليًا يعتمد على keyboard buffer مع timeout (300ms)، الأفضل استخدام `BarcodeDetector` API أو مكتبة متخصصة لتجنب التعارض مع الكتابة العادية.

## 🔄 الخدمات الخلفية

11. **خاصية Offline Mode** — حفظ الفواتير محليًا (IndexedDB) عند انقطاع الإنترنت ومزامنتها تلقائيًا لاحقًا. ميزة ضرورية لاستمرارية العمل.

12. **تحديث المخزون في الوقت الفعلي** — حاليًا لا توجد ردود فعل فورية عند نفاد المخزون أو وصوله للحد الأدنى.

## 🏷️ أنواع الطلبات والإدارة

13. **إدارة الطاولات (Table Management)** — للحالات التي يعمل فيها الـ POS في مطعم أو مقهى، مع إمكانية دمج الطاولات ونقل الطلبات.

14. **أنواع الطلبات** — إضافة تصنيف للطلبات: توصيل (Delivery) - استلام (Takeaway) - طاولة (Dine-in) مع إعدادات مختلفة لكل نوع (رسوم توصيل، وقت تحضير، إلخ).

🗺️ خارطة طريق تطبيق تحسينات POS Page
بناءً على الكود الموجود (Laravel Backend + React/TS Frontend مع React Query, Zustand, Tailwind)، هذه خارطة طريق تفصيلية لتطبيق التحسينات المقترحة، مرتبة حسب الأولوية والتأثير، مع خطوات تنفيذ كل تحسين.

جدول المحتويات
تحسينات البنية والأداء

المبيعات والمدفوعات

الطباعة والأجهزة

تجربة المستخدم

الخدمات الخلفية

إدارة أنواع الطلبات والطاولات

1. تحسينات البنية والأداء
1.1 تقسيم POSPage.tsx (2349 سطراً) إلى مكونات مستقلة
لماذا؟
صيانة وإعادة استخدام مكونات بشكل منفصل، وتقليل التعقيد، وتحسين سرعة التحميل.

الخطوات:

إنشاء مجلدات: components/pos/ و components/pos/modals/

استخراج المكونات الرئيسية:

POSTopBar → components/pos/POSTopBar.tsx

ProductSearchBar → components/pos/ProductSearchBar.tsx

FilterPanel → components/pos/FilterPanel.tsx

CategoryTabs → components/pos/CategoryTabs.tsx

ProductGrid → components/pos/ProductGrid.tsx (مع ProductCard فرعي)

ProfessionalCart → components/pos/ProfessionalCart.tsx (مع CartRow)

QuickItemsBar → components/pos/QuickItemsBar.tsx

MobileTabs → components/pos/MobileTabs.tsx

استخراج المودالات:

ProfessionalPaymentModal → components/pos/modals/PaymentModal.tsx

HeldCartsModal → components/pos/modals/HeldCartsModal.tsx

ProfessionalReceipt → components/pos/modals/ReceiptModal.tsx

ManualProductModal → components/pos/modals/ManualProductModal.tsx

SessionStatsModal → components/pos/modals/SessionStatsModal.tsx

KeyboardHelpModal → components/pos/modals/KeyboardHelpModal.tsx

نقل الدوال المساعدة (utils) إلى ملف منفصل pos/utils/helpers.ts (مثل productToVariant, familyIcon, familyStyleFromName).

إنشاء Hook مخصص لإدارة اختصارات لوحة المفاتيح pos/hooks/usePOSKeyboard.ts يحتوي على كل الأحداث المرتبطة بـ F-keys وغيرها.

تعديل POSPage.tsx ليصبح مجرد حاوية (Container) تجمع المكونات الفرعية وتدير الحالة العامة (usePOS، UI state، modals).

1.2 التحميل البطيء (Lazy Loading) للمنتجات
لماذا؟
تجنب تحميل آلاف المنتجات دفعة واحدة (حالياً per_page=500) مما يبطئ الاستجابة.

الخطوات:

تعديل useVariants في products.ts لدعم التصفح (pagination) مع keepPreviousData.

ts
// في useVariants نضيف معامل page و per_page
export function useVariants(params?: VariantListParams) {
  return useQuery({
    queryKey: [slug, 'variants', 'list', params],
    queryFn: () => variantsApi.list({ per_page: 50, ...params }),
    placeholderData: keepPreviousData,
  });
}
في ProductGrid إضافة زر "تحميل المزيد" أو استخدام IntersectionObserver لتحميل الصفحة التالية تلقائياً عند التمرير.

تعديل variantsApi.list لقبول page و per_page (موجود بالفعل في ListParams).

في POSPage تمرير page و per_page إلى useVariants، وتحديث setPage عند التمرير.

2. المبيعات والمدفوعات
2.1 إدارة المرتجعات (Returns / Refunds)
لماذا؟
لا يوجد حالياً أي دعم لإرجاع المنتجات أو استرجاع المدفوعات.

الخطوات:

Backend (Laravel)
إنشاء Document Type جديد مثل 'RET' (مرتجع) مع affects_stock_direction = 1 (إدخال للمخزون) أو -1 (إخراج حسب نوع المرتجع).

إضافة حقل original_document_id في جدول commercial_documents (موجود بالفعل source_document_id).

في CommercialDocumentService:

إنشاء دالة createReturnDocument(originalDocument, items, reason).

التحقق من أن الكميات المرتجعة لا تتجاوز الكميات المباعة.

إنشاء حركات مخزون عكسية (إدخال للمخزون).

إنشاء دفعة مالية سالبة (مبلغ مرتجع) أو ربطها بالدفعة الأصلية.

إضافة Route:

php
Route::post('documents/{document}/return', [DocumentComputeController::class, 'createReturn']);
Frontend (React)
إضافة زر "مرتجع" في ProfessionalCart أو في ReceiptModal بعد إتمام الفاتورة.

فتح مودال "إنشاء مرتجع" يسمح باختيار الأصناف المرتجعة والكميات.

استدعاء API documentsApi.createReturn(documentId, items).

تحديث حالة السلة بعد إنشاء المرتجع (يمكن عرضه كفاتورة جديدة أو إضافة إلى السلة).

2.2 إضافة الخصم على مستوى الفاتورة (Invoice-level Discount)
لماذا؟
حالياً الخصم مضاف فقط على مستوى الصنف، والمؤسسات تحتاج أحياناً خصم عام على الفاتورة بأكملها.

الخطوات:

Backend
إضافة حقول في commercial_documents:

discount_percentage_total (decimal) – نسبة خصم عامة.

discount_amount_total (decimal) – قيمة خصم ثابتة.

تعديل recalculateTotals في CommercialDocumentService:

حساب المجموع HT ثم تطبيق الخصم العام (نسبة أو قيمة) قبل حساب TVA.

تحديث total_discount ليشمل خصم الأسطر + الخصم العام.

تعديل StoreCommercialDocumentRequest و UpdateCommercialDocumentRequest لإضافة الحقول الجديدة.

تعديل CommercialDocumentResource لإظهار الخصم العام.

Frontend
في CartTotals إضافة total_discount_global و total_discount_percentage.

في ProfessionalCart إضافة حقل إدخال (نسبة أو قيمة) بجانب ملخص التوتالات.

تعديل usePOS لاحتساب الخصم العام وإعادة حساب الإجماليات.

في PaymentModal عرض الخصم العام في ملخص الفاتورة.

2.3 تفعيل العملات المتعددة بالكامل
لماذا؟
currencies موجودة في الـ lookup لكن غير مفعلة في الدفع.

الخطوات:

إضافة اختيار العملة في ProfessionalCart أو PaymentModal.

تعديل handleCompleteSale لتمرير currency_id و exchange_rate إلى API.

في Backend التأكد من أن CommercialDocumentService يستقبل currency_id ويحفظه ويستخدم سعر الصرف إذا كانت العملة غير أساسية.

عرض العملة في الإيصال والتوتالات.

2.4 الدفع الجزئي (Partial Payment) وآجال السداد
لماذا؟
الأنظمة التجارية تحتاج إلى إمكانية دفع جزء من المبلغ والباقي لاحقاً.

الخطوات:

Backend
التأكد من أن commercial_documents يحتوي amount_paid و amount_remaining (موجود بالفعل).

في attachPayments و addPayments تحديث هذه الحقول.

إضافة حالة partial في document_status (موجود بالفعل partially_paid).

إنشاء جدول آجال السداد payment_schedules مرتبط بالمستند ووسيلة الدفع.

Frontend
في PaymentModal:

إضافة خيار "دفع جزئي" مع إدخال المبلغ المدفوع.

عرض المبلغ المتبقي.

إمكانية تحديد تاريخ استحقاق (due_date) للجزء المتبقي.

في usePOS إضافة amountPaid و dueDate.

في documentsApi.create تمرير payments مع amount جزئي و is_partial إشارة.

3. الطباعة والأجهزة
3.1 دعم طابعة حرارية (ESC/POS) عبر WebUSB
لماذا؟
استخدام window.print() يعتمد على الطابعة الافتراضية ولا يعطي تنسيقاً خاصاً بالـ POS مثل الحجم الضيق.

الخطوات:

إضافة مكتبة مثل esc-pos-encoder أو @node-escpos/core للجانب الخلفي، أو استخدام WebUSB مباشرة.

إنشاء خدمة طباعة pos/printService.ts:

تقوم ببناء أمر ESC/POS من بيانات الفاتورة.

تستخدم navigator.usb لإرسال الأوامر إلى الطابعة (بعد طلب الإذن).

تعديل ReceiptModal لإضافة زر "طباعة حرارية" بجانب "طباعة عادية".

في حال عدم دعم WebUSB، يمكن إرسال البيانات إلى الخادم (Laravel) الذي يقوم بإنشاء ملف PDF أو صورة وإرساله إلى طابعة شبكية.

3.2 شاشة عرض العميل (Customer Display)
لماذا؟
تحسين تجربة العميل برؤية الأصناف والمبلغ الإجمالي.

الخطوات:

إنشاء نافذة منبثقة جديدة (Window.open) تعرض ملخص السلة بشكل مبسط (بدون أزرار تحكم).

مزامنة الحالة عبر BroadcastChannel أو SharedWorker أو تمرير الحالة عبر window.postMessage بين الصفحات.

تصميم واجهة كبيرة الخطوط، تظهر الأصناف والكميات والسعر الإجمالي، مع تحديث فوري عند تغيير السلة.

إضافة زر "عرض للعميل" في ProfessionalCart.

4. تجربة المستخدم
4.1 أزرار اختصارية سريعة قابلة للتخصيص (Quick Keys)
لماذا؟
أنظمة POS التقليدية توفر شبكة أزرار للمنتجات الأكثر مبيعاً، يمكن للمستخدم تخصيصها.

الخطوات:

في Backend:

إنشاء جدول user_quick_keys (user_id, product_variant_id, order, label).

إضافة API لإدارة هذه الأزرار (CRUD).

في Frontend:

استبدال QuickItemsBar القائمة حالياً (المفضلة) بشبكة أزرار قابلة للتخصيص.

إضافة زر "تخصيص" يفتح مودال لإضافة/إزالة/ترتيب الأزرار.

حفظ التخصيصات في الخادم لكل مستخدم.

4.2 تحسين الـ Barcode Scanner (استخدام BarcodeDetector API)
لماذا؟
الحل الحالي (keyboard buffer + timeout) قد يسبب تعارضات مع الكتابة العادية، وليس دقيقاً مع الماسحات الضوئية التي ترسل أحرفاً بسرعة.

الخطوات:

استخدام BarcodeDetector API (مدعوم في Chrome و Edge):

ts
const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] });
const barcodes = await detector.detect(videoElement);
إنشاء كاميرا مخصصة (باستخدام getUserMedia) تعرض إطار فيديو وتطبق عليه BarcodeDetector بشكل دوري.

دمجها كطبقة فوق ProductSearchBar (زر "مسح" يفتح الكاميرا).

الاحتفاظ بالـ keyboard buffer كخيار احتياطي.

5. الخدمات الخلفية
5.1 وضع Offline Mode (العمل دون اتصال)
لماذا؟
استمرارية العمل في حال انقطاع الإنترنت.

الخطوات:

استخدام Service Worker مع Workbox لتخزين API assets والـ HTML/CSS/JS.

تخزين الفواتير محلياً باستخدام IndexedDB عبر مكتبة مثل idb أو localForage.

إنشاء Queue للطلبات الفاشلة (عبر navigator.onLine و backgroundSync).

في documentsApi.create إذا كان غير متصل، حفظ البيانات في IndexedDB مع وضع علامة pending.

عند استعادة الاتصال، مزامنة الفواتير المعلقة تلقائياً (مع إعلام المستخدم).

5.2 تحديث المخزون في الوقت الفعلي (Realtime Stock Updates)
لماذا؟
حالياً لا توجد ردود فعل فورية عند نفاد المخزون.

الخطوات:

استخدام WebSockets (Laravel Broadcasting مع Pusher أو Soketi).

إرسال حدث StockUpdated عند كل حركة مخزون (إنشاء/تعديل مستند).

في Frontend، الاستماع للحدث وتحديث React Query cache للمنتجات المتأثرة.

تعديل useVariants لتشمل staleTime قصير جداً (أو استخدام invalidateQueries عند استلام الحدث).

عرض تنبيه في الـ POS عند انخفاض المخزون (مثل pos-toast).

6. إدارة أنواع الطلبات والطاولات
6.1 إدارة الطاولات (Table Management)
لماذا؟
للمطاعم والمقاهي، يحتاج الـ POS إلى إدارة الطاولات.

الخطوات:

Backend
إنشاء جدول tables: (id, name, qr_code, capacity, status, company_id).

ربط المستندات بالطاولة عبر commercial_documents.table_id.

API لإدارة الطاولات (CRUD) وتغيير الحالة (occupied/free/reserved).

Frontend
إضافة تبويب "طاولات" في الـ POS أو شاشة منفصلة.

عرض خريطة الطاولات بشكل شبكي، كل طاولة بحالتها.

عند النقر على طاولة، فتح السلة وربطها بها.

إمكانية دمج الطاولات (دمج فاتورتين) أو نقل الطلب من طاولة لأخرى.

6.2 أنواع الطلبات (Delivery, Takeaway, Dine-in)
لماذا؟
إعدادات مختلفة لكل نوع (رسوم توصيل، وقت تحضير، إلخ).

الخطوات:

Backend
إضافة عمود order_type في commercial_documents (enum: 'dine_in', 'takeaway', 'delivery').

إضافة جدول delivery_zones و delivery_fees اختيارياً.

تعديل recalculateTotals لإضافة رسوم التوصيل (إن وجدت).

Frontend
في ProfessionalCart، إضافة اختيار "نوع الطلب" (أزرار أو قائمة منسدلة).

إذا كان النوع Delivery، عرض حقل عنوان التسليم ورقم الهاتف.

في PaymentModal، عرض رسوم التوصيل في ملخص الفاتورة.

تعديل handleCompleteSale لتمرير order_type وبيانات التوصيل.

خلاصة الخارطة
الأولوية	التحسين	الزمن التقديري
1	تقسيم POSPage	2 أيام
2	التحميل البطيء للمنتجات	1 يوم
3	الخصم على مستوى الفاتورة	2 أيام
4	الدفع الجزئي وآجال السداد	3 أيام
5	المرتجعات	3 أيام
6	طباعة حرارية	2 أيام
7	تحسين الباركود	1 يوم
8	Offline Mode	4 أيام
9	أنواع الطلبات والطاولات	3 أيام
10	العملات المتعددة	1 يوم
11	أزرار Quick Keys	2 أيام
12	شاشة العميل	1 يوم
13	تحديث المخزون الفوري	2 أيام
ملاحظة: الأوقات تقديرية وتعتمد على حجم الفريق والبنية الحالية.

هذه الخارطة مصممة لتكون قابلة للتنفيذ خطوة بخطوة، مع مراعاة الكود الموجود في المرفقات (Laravel 11، React مع React Query، Zustand). كل نقطة تحسين مرفقة بتغييرات محددة في الـ Backend والـ Frontend. يُنصح بالبدء بالتحسينات الأساسية (تقسيم الكود، التحميل البطيء) ثم الانتقال إلى الميزات التجارية (الخصومات، المرتجعات، الدفع الجزئي) وأخيراً التكاملات الخارجية (الطباعة، وضع عدم الاتصال).

---

# تقرير التنفيذ (Completion Report)

## تاريخ التنفيذ: 22 يونيو 2026

### ✅ تم تنفيذه

#### 1. تقسيم POSPage.tsx إلى مكونات منفصلة
تم استخراج جميع المكونات من `POSPage.tsx` (2349 سطراً) إلى ملفات مستقلة في `resources/js/pos/components/`:

| المكون | الملف | الحجم |
|--------|-------|-------|
| `POSTopBar` | `POSTopBar.tsx` | شريط الجلسة العلوي |
| `QuickItemsBar` | `QuickItemsBar.tsx` | شريط الأصناف المفضلة |
| `ProductSearchBar` | `ProductSearchBar.tsx` | شريط البحث والفرز |
| `FilterPanel` | `FilterPanel.tsx` | لوحة الفلتر المتقدم |
| `CategoryTabs` | `CategoryTabs.tsx` | تبويبات التصنيفات |
| `ProductGrid` | `ProductGrid.tsx` | شبكة/قائمة المنتجات |
| `ProfessionalCart` | `ProfessionalCart.tsx` | السلة مع كل الإجراءات |
| `CartRow` | `CartRow.tsx` | صف صنف واحد في السلة |
| `ProfessionalPaymentModal` | `ProfessionalPaymentModal.tsx` | مودال الدفع المتعدد |
| `HeldCartsModal` | `HeldCartsModal.tsx` | الفواتير المعلقة |
| `ProfessionalReceipt` | `ProfessionalReceipt.tsx` | إيصال البيع |
| `ManualProductModal` | `ManualProductModal.tsx` | إضافة منتج يدوي |
| `SessionStatsModal` | `SessionStatsModal.tsx` | إحصاءات الجلسة |
| `KeyboardHelpModal` | `KeyboardHelpModal.tsx` | دليل الاختصارات |
| `MobileTabs` | `MobileTabs.tsx` | تبويبات الجوال |

كما تم:
- إنشاء ملف `resources/js/pos/utils/posHelpers.ts` يضم الدوال المساعدة (`productToVariant`, `makeFakeVariant`, `getVariantPrice`, `familyIcon`, `familyStyleFromName`)
- حجم `POSPage.tsx` انخفض من **2349 سطراً** إلى **~300 سطر** (حاوية فقط)

#### 2. الخصم على مستوى الفاتورة (Invoice-level Discount)
- إضافة حالة `invoiceDiscountPct` في `POSPage.tsx`
- تعديل `ProfessionalCart.tsx` لعرض حقل إدخال نسبة الخصم في ملخص التوتالات
- حساب المبلغ `invoiceDiscountAmount` وتوزيعه نسبياً على الأسطر
- تمرير الخصم إلى API عبر `discount_percentage` لكل سطر

#### 3. تفعيل العملات المتعددة في مودال الدفع
- إضافة `currencies` كـ prop لـ `ProfessionalPaymentModal`
- عرض قائمة منسدلة لاختيار العملة (تظهر فقط عند وجود أكثر من عملة)
- تمرير `currencyId` إلى `handleCompleteSale` ومن ثم إلى API

#### 4. تحسين Barcode Scanner
- إضافة `BarcodeDetector` API مع دعم تنسيقات EAN-13, EAN-8, Code-128, Code-39, QR
- الاحتفاظ بالـ keyboard buffer كخيار احتياطي (fallback)
- تنظيف الـ timer لتجنب تسرب الذاكرة

#### 5. أنواع الطلبات (Dine-in / Takeaway / Delivery)
- إضافة `orderType` state في `POSPage.tsx`
- إضافة شريط اختيار نوع الطلب (`pos-order-type`) أسفل الـ TopBar
- تمرير `delivery_type` إلى API عند الحفظ
- إضافة CSS كامل للشريط والأزرار في `pos.css`

### ❌ لم ينفذ (مقترحات للمستقبل)

| الاقتراح | السبب |
|----------|-------|
| إدارة المرتجعات (Returns/Refunds) | يتطلب تغييرات كبيرة في Backend (جدول مرتجعات، API جديد) |
| دعم طابعة حرارية (ESC/POS) | يتطلب مكتبة WebUSB ومتطلبات أجهزة |
| شاشة عرض العميل | يتطلب BroadcastChannel API |
| Offline Mode | يتطلب Service Worker مع IndexedDB |
| تحديث المخزون في الوقت الفعلي | يتطلب WebSockets (Pusher/Soketi) |
| إدارة الطاولات | يتطلب جدول جديد في Backend |
| أزرار Quick Keys قابلة للتخصيص | يتطلب جدول user_quick_keys في Backend |
| التحميل البطيء (Lazy Loading) | تعديل بسيط، يمكن تطبيقه لاحقاً |

### 📊 نتيجة البناء (Build)
- ✅ `npm run build` تم بنجاح دون أخطاء
- `POSPage-CK2mWdea.js` بحجم **64.02 kB** (مقسم تلقائياً)
- جميع الـ 322 module تم تحويلها بنجاح

---

# تقرير التنفيذ — الجلسة الثانية (22 يونيو 2026)

### ✅ تم إصلاحه

#### 1. 🏪 المخزون الحقيقي — لا يعمل (Real stock missing from API responses)
| الملف | التغيير |
|-------|---------|
| `resources/js/pages/pos/POSPage.tsx:109-135` | إضافة استعلام منفصل `useQuery` لجلب المخزون من `GET /inventory/stock-at` |
| `resources/js/pages/pos/POSPage.tsx:127-135` | دمج `stockData` مع `allVariants` في `useMemo` |
- **السبب الجذري**: لا يوجد عمود `current_stock` في جدول `products`. الكمية الحالية تُحتسب ديناميكياً من `opening_balances_stock + stock_movements` عبر `InventoryStockService::getStockAt()`. قائمة المنتجات العادية (API `GET /products`) لم تكن تحتسب المخزون بتاتاً.
- **الإصلاح** (على غرار `CommercialDocumentModal/index.tsx:221-235`):
  - **لا** تعديل Backend إطلاقاً — `GET /products` يبقى كما هو.
  - إضافة استعلام `useQuery` منفصل يستدعي `GET /inventory/stock-at?warehouse_id=X&fiscal_year_id=Y`.
  - بناء `Record<number, number>` من الاستجابة (`{ productId: current_stock }`).
  - دمج المخزون في `allVariants` عبر `useMemo` بحيث `current_stock` يُملأ من الخريطة.
- **التأثير**: الآن الـ POS يعرض المخزون الحقيقي المحتسب من حركات المخزون (عبر `InventoryStockService::getStockAt()`)، دون أي تعديل على Backend. يظهر بالألوان المناسبة في البطاقات والقائمة، وتعمل فلاتر "في المخزون" و"منخفض المخزون" بشكل صحيح.

#### 2. 💰 مستويات الأسعار — لا تعمل عند العودة إلى "عادي"
| الملف | التغيير |
|-------|---------|
| `resources/js/pages/pos/POSPage.tsx:262-285` | تعديل `applyPriceLevel` لاستعادة السعر الأصلي عند إلغاء مستوى السعر |
- **المشكلة**: عند النقر على "عادي" بعد تطبيق مستوى سعر، كانت الدالة فقط تعيد `return` دون استعادة `default_selling_price_ht` الأصلي للصناف في السلة.
- **الإصلاح**: إضافة حلقة `forEach` تسترجع السعر الأصلي من `variant.default_selling_price_ht` وتستدعي `pos.updatePrice()`.

#### 3. 🃏 بطاقة المنتجات — تصميم ضعيف و TTC غير بارز
| الملف | التغيير |
|-------|---------|
| `resources/css/theme/pos.css` | إعادة تصميم كاملة لبطاقات المنتجات |
- **التغييرات**:
  - زيادة الحجم الأدنى للبطاقات من 145px → 160px
  - سعر TTC أصبح بارزاً جداً: حجم 17px، عريض (900)، مع خلفية خضراء `var(--emb)` و padding
  - زيادة حجم الخط للاسم (12px → 13px) والباركود (9.5px → 10px)
  - زيادة المسافات والـ padding في كل مكان
  - تحسين تأثيرات hover (ظل أكبر، رفع أكثر)
  - زيادة حجم أزرار الإجراءات (pin, add)
  - تحديث أحجام xs/sm/lg لتتناسب مع التصميم الجديد
  - إخفاء سعر HT في وضع sm لتوفير المساحة

#### 4. 🔍 حقل البحث — صغير جداً
| الملف | التغيير |
|-------|---------|
| `resources/css/theme/pos.css` | تكبير حقل البحث |
- **التغييرات**:
  - زيادة حجم الخط من 13px → 15px
  - زيادة الـ padding من 7px 10px → 10px 12px
  - تحديث responsive للشاشات الصغيرة (480px) للحفاظ على تجربة جيدة

#### 5. 🔧 تحسينات عامة (مراجعة الصفحة)
| الملف | التغيير |
|-------|---------|
| `resources/css/theme/pos.css` | تحديث الـ loading skeleton والشبكة المتجاوبة |
- مزامنة حجم الـ loading skeleton مع أحجام البطاقات الجديدة (195px ارتفاع)
- تحديث responsive query عند 480px للبحث والبطاقات
- إزالة كود ميت: استيراد `getVariantPrice` غير المستخدم من `POSPage.tsx` (جلسة سابقة)

### 📊 نتيجة البناء (Build)
- ✅ `npm run build` — نجاح كامل (322 modules، 0 أخطاء)
- `POSPage-DaTrYpYa.js` بحجم **64.10 kB**
- `app-CwSnz_Ce.css` (77 kB) و `app-C7dlad10.css` (201 kB) — محدثين مع CSS الجديد

### 📋 ملخص الملفات المعدلة
| الملف | التعديل |
|-------|---------|
| `resources/js/pages/pos/POSPage.tsx` | استعلام مخزون منفصل (`GET /inventory/stock-at`) + دمج مع `allVariants` + إصلاح `applyPriceLevel` |
| `resources/css/theme/pos.css` | ~150 سطر تغيير (بطاقات، بحث، تحميل، responsive) |
| `POS_IMPROVEMENTS.md` | تحديث تقرير التنفيذ |

### 🔜 المتبقي (تحسينات مستقبلية)
كما هو في الجدول أعلاه — الميزات الكبيرة (المرتجعات، الطباعة الحرارية، Offline Mode، WebSockets، الطاولات) لا تزال بحاجة إلى تخطيط منفصل نظراً لحجم التغييرات في Backend.

---

# تقرير التنفيذ — الجلسة الثالثة (22 يونيو 2026) — الإجراءات العاجلة

### ✅ تم تنفيذه — 5 إجراءات من IMPLEMENTATION_GUIDE_v2.md

#### 1. حذف الملفات المكررة (Dead Code)
| الملف | الحالة |
|-------|--------|
| `resources/js/pos/components/Cart.tsx` | ✅ حذف |
| `resources/js/pos/components/PaymentModal.tsx` | ✅ حذف |
| `resources/js/pos/components/Receipt.tsx` | ✅ حذف |
غير مستوردة في أي مكان — أعباء قديمة من النسخة الأولى.

#### 2. استبدال `as any` بأنواع صريحة

| الملف | التغيير |
|-------|---------|
| `ProductGrid.tsx:81` | `(v.unit as any)?.abbreviation` → `v.unit?.abbreviation` |
| `ProductGrid.tsx:148-149` | `(v as any).image_url` → `(v as unknown as { image_url?: string }).image_url` |
| `ProductGrid.tsx:171` | `(v.unit as any)?.abbreviation` → `v.unit?.abbreviation` |
| `useCartStore.ts:48-49` | `variant.unit as any` → `variant.unit?.abbreviation` |
| `POSPage.tsx:303` | `(variant as any)?.prices?.find((pr: any) => ...)` → `variant?.prices?.find(pr => ...)` |

#### 3. تطبيق خصم الفاتورة في `useCartStore` + `calculations.ts`
- **`types.ts`**: إضافة `invoice_discount_pct` و `invoice_discount_amount` إلى `CartTotals`
- **`calculations.ts`**: `calcTotals()` تقبل الآن `invoiceDiscountPct` وتحسب المبلغ المخفض пропорционально على HT و TVA
- **`useCartStore.ts`**: إضافة `invoiceDiscountPct` (state) + `setInvoiceDiscountPct` (action) + تحديث `totals()` لاستخدام `calcTotals` مع الخصم
- **`usePOS.ts`**: إضافة `invoiceDiscountPct` و `setInvoiceDiscountPct` للـ hook
- **`POSPage.tsx`**: إزالة `useState` المحلي للخصم واستخدام `pos.invoiceDiscountPct` من الـ store
- **التأثير**: الخصم يستمر مع السلة (persist)، ويؤثر على `totals()` مباشرة، ولا حاجة لحساباته يدوياً في `POSPage.tsx`

#### 4. تحسين `holdCart` — استقبال معاملات بدلاً من الاتصال المباشر

**قبل**: `usePOSStore.ts` كان يستدعي `useCartStore.getState()` مباشرة داخل `holdCart()` — اقتران محكم بين الـ store والـ cart.

**بعد**: 
- `holdCart` في `usePOSStore` تستقبل `{ items, totals, client, label, clearCart }` كمعاملات
- `usePOS.ts` ينشئ wrapper `holdCart` يجمع المعاملات ويمررها — لا اقتران مباشر

#### 5. إضافة معالج أخطاء موحد باستخدام Toast (sonner)
- إضافة `<Toaster>` من مكتبة `sonner` في `POSPage.tsx`
- `toast.success()` بعد حفظ الفاتورة بنجاح
- `toast.error()` عند فشل الحفظ (مع عرض رسالة الخطأ من API)
- تنسيق: `richColors` مع `closeButton` و `position: top-left`

### 📊 نتيجة البناء (Build)
- ✅ `npm run build` — نجاح كامل (323 modules، 0 أخطاء)
- `POSPage-C3Se66z-.js` بحجم **96.65 kB** (زيادة بسبب دمج الـ stores و sonner)

### 📋 ملخص الملفات المعدلة — الجلسة الثالثة
| الملف | التعديل |
|-------|---------|
| `resources/js/lib/api/core/types.ts` | إضافة `invoice_discount_pct` و `invoice_discount_amount` إلى `CartTotals` |
| `resources/js/pos/utils/calculations.ts` | `calcTotals` تقبل `invoiceDiscountPct` |
| `resources/js/pos/utils/useCartStore.ts` | إضافة `invoiceDiscountPct` + `setInvoiceDiscountPct`، إزالة `as any` |
| `resources/js/pos/hooks/usePOSStore.ts` | `holdCart` تستقبل معاملات بدلاً من direct store access |
| `resources/js/pos/hooks/usePOS.ts` | إضافة `invoiceDiscountPct`، `setInvoiceDiscountPct`، `holdCart` wrapper |
| `resources/js/pos/components/ProductGrid.tsx` | إزالة 4 `as any` — استخدام `as unknown as { image_url }` |
| `resources/js/pos/components/Cart.tsx` | **حذف** — dead code |
| `resources/js/pos/components/PaymentModal.tsx` | **حذف** — dead code |
| `resources/js/pos/components/Receipt.tsx` | **حذف** — dead code |
| `resources/js/pages/pos/POSPage.tsx` | إزالة local `invoiceDiscountPct` state، إضافة `<Toaster/>`، toast في `handleCompleteSale` |
| `POS_IMPROVEMENTS.md` | تحديث التقرير |

---

# تقرير التنفيذ — الجلسة الرابعة (22 يونيو 2026) — تحسينات إضافية

### ✅ تم تنفيذه

#### 1. 📱 إصلاح الشاشة الفارغة على الجوال (Mobile Empty Screen)
| الملف | التغيير |
|-------|---------|
| `resources/js/pages/pos/POSPage.tsx:414` | إضافة class `on` إلى `pos-wrap` (`className="pos-wrap on ..."`) |
- **السبب الجذري**: في `theme.css:1386` داخل media query `@media(max-width:768px)`، القاعدة `#p-pos:not(.on) { display: none !important; }` كانت تخفي الصفحة بالكامل على الجوال لعدم وجود class `on`.
- **الإصلاح**: إضافة `on` إلى `className` في عنصر `<div id="p-pos">`.

#### 2. 📦 التحميل البطيء للمنتجات (Lazy Loading / Pagination)
| الملف | التغيير |
|-------|---------|
| `resources/js/pages/pos/POSPage.tsx` | إضافة `page` state + `loadedData` accumulator + ترحيل فلاتر التصنيف إلى الخادم |
| `resources/js/pos/components/ProductGrid.tsx` | إضافة `hasMore` و `onLoadMore` props + زر "تحميل المزيد" |
| `resources/css/theme/pos.css` | إضافة CSS لزر `.pos-load-more` |
- **التفاصيل**:
  - تقليل `per_page` من 500 → 120 منتج للتحميل الأولي الأسرع
  - إضافة `page` parameter إلى استعلام `productsApi.list`
  - ترحيل فلتر `family_id` إلى الخادم (server-side filtering) عند اختيار تصنيف
  - تراكم المنتجات عبر الصفحات في `loadedData` state
  - زر "تحميل المزيد" يظهر تلقائياً عند وجود صفحات إضافية (`meta.is_last_page`)
  - إعادة تعيين الصفحة تلقائياً عند تغيير البحث أو التصنيف
- **التأثير**: تحميل أولي أسرع (120 منتج بدلاً من 500)، مع إمكانية تحميل المزيد عند الحاجة

#### 3. 🔤 استبدال CDN Tabler Icons بالتجميع المحلي
| الملف | التغيير |
|-------|---------|
| `resources/js/app.jsx` | إضافة `import '@tabler/icons-webfont/dist/tabler-icons.min.css'` |
| `resources/views/app.blade.php` | إزالة رابطَي CDN لتطبيق Tabler Icons |
- **التفاصيل**: fonts أصبحت تُجمّع محلياً عبر Vite (woff2: 457 kB، woff: 786 kB، ttf: 2.8 MB) بدلاً من تحميلها من CDN
- **التأثير**: إزالة مشكلة بطء الشبكة (slow network) — الخطوط متاحة فوراً من الخادم المحلي

### 📊 نتيجة البناء (Build)
- ✅ `npm run build` — نجاح كامل (324 modules، 0 أخطاء)
- `POSPage-DGXSGq-_.js` بحجم **97.43 kB**
- `app-CaXPp4RM.css` (276 kB) — مضاف إليه tabler icons CSS
- Fonts مدمجة محلياً: `tabler-icons-*.woff2` (457 kB)، `tabler-icons-*.woff` (786 kB)

### 📋 ملخص الملفات المعدلة — الجلسة الرابعة
| الملف | التعديل |
|-------|---------|
| `resources/js/pages/pos/POSPage.tsx` | إضافة `page`/`loadedData` state + pagination في `useQuery` + إزالة client-side category filter |
| `resources/js/pos/components/ProductGrid.tsx` | إضافة `hasMore`/`onLoadMore` props + `LoadMore` component |
| `resources/css/theme/pos.css` | إضافة `.pos-load-more` CSS |
| `resources/js/app.jsx` | إضافة import لـ `@tabler/icons-webfont/dist/tabler-icons.min.css` |
| `resources/views/app.blade.php` | إزالة رابطَي CDN لتطبيق Tabler Icons |
| `POS_IMPROVEMENTS.md` | تحديث التقرير |

---

# تقرير التنفيذ — الجلسة الخامسة (22 يونيو 2026) — الطباعة الحرارية

### ✅ تم تنفيذه — دعم طابعة حرارية (ESC/POS)

| الملف | التغيير |
|-------|---------|
| `resources/js/pos/utils/printService.ts` | إنشاء خدمة طباعة حرارية كاملة (جديد) |
| `resources/js/pos/components/ProfessionalReceipt.tsx` | إضافة زر "طباعة حرارية" مع WebUSB |
| `resources/css/theme/pos.css` | إضافة CSS لزر `.btn-thermal` وحالة الطباعة |

**التفاصيل التقنية**:
- **`EscPosBuilder`**: builder pattern يصمم أوامر ESC/POS يدوياً (بدون مكتبة خارجية)
  - دعم: bold، محاذاة (يمين/وسط/يسار)، تغيير حجم الخط، قص الورق
  - ترميز UTF-8 عبر `TextEncoder` لدعم العربية
- **`printThermalViaWebUSB()`**: تستخدم `navigator.usb.requestDevice()` لاختيار طابعة حرارية
  - فتح الجهاز، المطالبة بالواجهة 0، إرسال البيانات عبر `transferOut`
  - دعم fallback عند عدم وجود WebUSB
- **`isWebUsbSupported()`**: كشف ما إذا كان المتصفح يدعم WebUSB (Chrome/Edge)
- **الزر "طباعة حرارية"**: يظهر تلقائياً فقط في المتصفحات المدعومة، مع عرض حالة الطباعة (نجاح/فشل)

**الاستخدام**:
1. في واجهة الإيصال، اضغط "طباعة حرارية"
2. سيظهر مربع حوار لاختيار الطابعة (USB)
3. بعد الاختيار، ترسل أوامر ESC/POS مباشرة إلى الطابعة

### 📊 نتيجة البناء (Build)
- ✅ `npm run build` — نجاح كامل (325 modules، 0 أخطاء)
- `POSPage-BB2Aqo0N.js` بحجم **100.77 kB**

### 📋 ملخص الملفات المعدلة — الجلسة الخامسة
| الملف | التعديل |
|-------|---------|
| `resources/js/pos/utils/printService.ts` | **جديد** — ESC/POS builder + WebUSB print service |
| `resources/js/pos/components/ProfessionalReceipt.tsx` | إضافة زر "طباعة حرارية" مع WebUSB + thermal status |
| `resources/css/theme/pos.css` | إضافة `.btn-thermal` و `.thermal-status` CSS |
| `POS_IMPROVEMENTS.md` | تحديث التقرير |

### 🔜 المتبقي (تحسينات مستقبلية)
الميزات التالية لا تزال بحاجة إلى تخطيط منفصل نظراً لحجم التغييرات في Backend:
- **المرتجعات (Returns/Refunds)** — نوع مستند RET + API جديد
- **الدفع الجزئي (Partial Payment)** — دفع جزء من المبلغ مع آجال السداد
- **شاشة عرض العميل** — BroadcastChannel API
- **Offline Mode** — Service Worker + IndexedDB
- **تحديث المخزون الفوري** — WebSockets (Pusher/Soketi)
- **إدارة الطاولات** — جدول جديد + خريطة طاولات
- **أزرار Quick Keys قابلة للتخصيص** — جدول user_quick_keys

