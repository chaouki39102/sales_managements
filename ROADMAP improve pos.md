
# خارطة طريق تطوير POS

## ✅ تم الإنجاز (Priority 1–5)

### 1. ✅ مودال الدفع — Numpad + مبالغ سريعة + حساب الباقي
**ProfessionalPaymentModal.tsx** — إعادة كتابة كاملة:
- لوحة أرقام numpad تعمل باللمس (1–9, 0, 00, ., C, ⌫)
- أزرار مبالغ سريعة تتكيف مع المبلغ المتبقي (200–5000 دج)
- مؤشر بصري لحالة الدفع: ناقص / كافٍ / باقي للزبون مع animation
- دعم حسابات الخزينة (treasury_account_id) لكل وسيلة دفع
- شبكة عمودين: يمين ملخص الفاتورة، يسار وسائل الدفع + numpad
- تخطيط Responsive للشاشات الصغيرة

### 2. ✅ خصم الكمية التلقائي
**useCartStore.ts** — `findQuantityDiscount()`:
- يقرأ `variant.quantity_discounts` (جدول خصومات الكمية من الباكاند)
- يطبّق الخصم التلقائي عند `addItem` للكميات المطابقة
- يُعيد الحساب عند زيادة الكمية على صنف موجود
- لا يطغى على خصم يدوي أعلى

### 3. ✅ إنشاء عميل من POS + بحث فوري
- **بحث فوري بالهاتف/الاسم** في `ProfessionalCart.tsx` مع قائمة منسدلة
- **إنشاء عميل جديد** inline بدون مغادرة POS (اسم + هاتف + عنوان)
- **CustomerSearchModal.tsx** — مودال بحث متقدم debounced + إنشاء مع NIF/بريد/نوع
- زر "بحث متقدم" بجانب حقل البحث في client dropdown

### 4. ✅ المرتجعات من POS مباشرة (AVC)
**ReturnsModal.tsx**:
- البحث عن فاتورة سابقة بالرقم
- اختيار أصناف للإرجاع (كل أو جزء)
- إنشاء AVC تلقائياً عبر `documentsApi.create` بكميات سالبة
- زر في POSTopBar + اختصار F10

### 5. ✅ Offline Mode
- **IndexedDB** عبر `idb` — تخزين مؤقت لاستجابات API (`db.ts`)
- **axios interceptor** — يخزّن GET في الكاش، يُصفف PUT/POST/DELETE في قائمة انتظار عند انقطاع النت
- **pendingOps queue** — يُعاد تشغيلها تلقائياً عند عودة الاتصال
- **OfflineIndicator.tsx** — يُظهر حالة الاتصال وعدد العمليات المعلقة
- **Hooks** — `useOnlineStatus()`، `usePendingOpsCount()`، `useSync()`

---

## ✅ تحسينات إضافية تم إنجازها

### 6. ✅ صورة المنتج في السلة ومودال الدفع
- إضافة `image_url` إلى `CartItem` والمخزن
- صورة مصغرة (32×32) بجانب اسم المنتج في `CartRow.tsx`
- قائمة منتجات مع صور في `ProfessionalPaymentModal.tsx`

### 7. ✅ خصم ثابت بالمبلغ (Fixed Amount Discount)
- زر تبديل بين خصم نسبي `%` وخصم ثابت `دج` في `CartRow.tsx`
- دالة `updateDiscountAmount` في `useCartStore.ts`
- `recalcItem` يُحوّل تلقائياً بين النسبة والمبلغ

### 8. ✅ إصلاحات أساسية
- `price_ht` → `price` في `getVariantPrice` (حقل السعر الصحيح)
- إصلاح `invoiceDiscountPct is not defined`
- إعادة تعيين `loadedPageRef` عند تغيير البحث/التصنيف
- إزالة كل `as any` (8 occurrences)

### 9. ✅ 45 اختبار وحدة
- `calculations.test.ts` — 28 اختبار (htToTtc, ttcToHt, calcTotals, calcFiscalStamp, formatDZD, إلخ)
- `posHelpers.test.ts` — 17 اختبار (getVariantPrice, productToVariant, familyIcon, إلخ)

---

## 🔲 الأولوية التالية (6–10)

### 10. إدارة الطاولات والأوامر (مطاعم/مقاهي)
- `OrderType` موجود كـ state لكن لا منطق حقيقي ولا يُرسَل للباكاند
- خريطة طاولات مع حالة (فارغة / مشغولة / تنتظر فاتورة)
- تعيين طاولة للسلة، نقل أصناف، دمج طاولتين
- تغيير نوع الطلب (طاولة / استلام / توصيل) يؤثر على إنشاء الوثيقة

### 11. تتبع المخزون اللحظي في بطاقة المنتج
- `current_stock` يُجلَب مرة واحدة (staleTime: 2min)
- optimistic update عند إضافة للسلة — يتناقص الرقم فوراً
- badge "آخر قطعة" عند وصول المخزون لـ 1 أو 2
- WebSockets للتحديث الفوري عند البيع من كاشير آخر

### 12. إحصاءات الجلسة — SessionStatsModal
- SessionStatsModal موجود لكن بياناته محلية
- أداء الكاشير: عدد الفواتير، متوسط القيمة، أعلى فاتورة
- توزيع وسائل الدفع في الجلسة
- المنتجات الأكثر مبيعاً
- زر إغلاق الجلسة مع طباعة تقرير

### 13. الطباعة الحرارية — printService.ts
- إضافة logo الشركة و QR code في الإيصال
- دعم Arabic CodePage للطابعات الحرارية (Windows-1256)
- طباعة تلقائية بعد تأكيد البيع بدون مودال

### 14. WebSockets للمخزون اللحظي
- يتطلب Laravel Broadcasting (Pusher/Reverb)
- أحداث: `ProductVariantStockUpdated`
- تحديث `current_stock` في الـ ProductGrid مباشرة
- منع البيع عند نفاد المخزون من كاشير آخر

### 15. وضع الكيوسك / Self-Checkout
- شاشة بدون sidebar ولا topbar
- العميل يختار الأصناف بنفسه
- كاشير يؤكد الدفع فقط

---

## مخرجات البناء
- **Build**: 331 modules, 0 errors
- **CSS**: 212 kB (app.css + pages.css)
- **JS (POSPage)**: 123 kB gzip: 32 kB
- **Tests**: 45/45 passing
