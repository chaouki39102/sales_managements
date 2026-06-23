
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

### 3. ✅ إنشاء زبون من POS + بحث فوري
- **بحث فوري بالهاتف/الاسم** في `ProfessionalCart.tsx` مع قائمة منسدلة
- **إنشاء زبون جديد** inline بدون مغادرة POS (اسم + هاتف + عنوان)
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

### 11. ✅ تتبع المخزون اللحظي في بطاقة المنتج
- `stockDeductions` كمشتق من `pos.items` عبر `useMemo`
- يتناقص `current_stock` فوراً عند إضافة/حذف الأصناف
- badge "آخر قطعة" (ذهبي) عند المخزون ≤ 2 في `ProductGrid.tsx`
- طبقة جاهزة لـ WebSockets — يستخدم `stockData` من `GET /inventory/stock-at`

### 12. ✅ إحصاءات الجلسة — SessionStatsModal
- `paymentsBreakdown` — تسجيل المبالغ حسب وسيلة الدفع لكل فاتورة
- `productsSold` — المنتجات المباعة مع الكميات والمبالغ
- `highestInvoice` + `invoiceTotals[]` — تتبع أعلى وأدنى فاتورة
- **SessionStatsModal** محدث: يعرض توزيع الدفع، أكثر 10 منتجات، متوسط الفاتورة
- زر "إنهاء الجلسة" — يصفّر الإحصائيات ويُظهر toast

### 13. ✅ الطباعة الحرارية — printService.ts
- **Windows-1256 encoding**: جدول تحويل الأحرف العربية (`encodeWin1256`) يضمن طباعة صحيحة للعربية
- **QR code** في نهاية الإيصال: يطبع رقم الفاتورة كـ QR code عبر أوامر ESC/POS القياسية
- **طباعة تلقائية**: checkbox "طباعة تلقائية" في مودال الإيصال، يُحفظ في localStorage، يشغّل `printThermal` تلقائياً عند فتح الإيصال
- `printThermal` أعيدت تسميتها (استُبدلت `printThermalViaWebUSB`) مع الاحتفاظ بالتوافق العكسي

### 14. WebSockets للمخزون اللحظي
- يتطلب Laravel Broadcasting (Pusher/Reverb)
- أحداث: `ProductVariantStockUpdated`
- تحديث `current_stock` في الـ ProductGrid مباشرة
- منع البيع عند نفاد المخزون من كاشير آخر

### 15. ✅ وضع الكيوسك / Self-Checkout
- **POSKioskPage.tsx**: صفحة مستقلة خارج DashboardLayout (بدون sidebar/topbar)
- شاشة كاملة مع: شريط علوي (عدد الأصناف + الإجمالي + زر دفع), حقل بحث, تصنيفات, شبكة منتجات, شريط سفري للأصناف المضافة مع زر إزالة لكل صنف
- زر "إفراغ السلة" و"دفع" — واجهة لمسية للأزرار الكبيرة
- مسار منفصل `/pos/kiosk` — يحافظ على نفس منطق البيع (استعلامات API + مودال الدفع + الطباعة التلقائية)

---

## مخرجات البناء
- **Build**: 331 modules, 0 errors (2.44s)
- **JS (POSPage)**: 128 kB gzip: 34 kB
- **Tests**: 45/45 passing
