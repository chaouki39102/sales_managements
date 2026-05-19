# ✅ قائمة الاختبار الشاملة

**التاريخ**: May 19, 2026  
**الحالة**: جاهزة للتنفيذ

---

## 🔐 1. اختبار Multi-tenancy

### أ) فحص الأمان الأساسي

- [ ] قم بتسجيل دخول مستخدم من شركة A
- [ ] قم بتسجيل دخول مستخدم من شركة B
- [ ] تحقق من أن كل مستخدم يرى فقط بيانات شركته

### ب) اختبار findById()

```bash
php artisan tinker
> $userA = User::where('company_id', 1)->first();
> $serviceA = new \App\Services\UserService();
> $result = $serviceA->findById($userA->id); // يجب أن ينجح
> $userB = User::where('company_id', 2)->first();
> $result = $serviceA->findById($userB->id); // يجب أن يفشل (ليس من شركتنا)
```

### ج) اختبار findMany()

```bash
> $results = $serviceA->findMany([1, 2, 3]); // يجب أن يرجع فقط من شركة A
> count($results); // يجب أن يكون ≤ 3
```

### د) اختبار API

```bash
# مع token من شركة A
curl -H "Authorization: Bearer TOKEN_A" \
  http://localhost:8000/api/v1/1/users

# يجب أن يرى فقط مستخدمي شركة A
```

### المتوقع: ✅
- لا توجد تسريبات بيانات بين الشركات
- كل مستخدم يرى فقط بيانات شركته
- الـ logs توضح الـ company_id في كل عملية

---

## ⚡ 2. اختبار Rate Limiting

### أ) اختبار تسجيل الدخول

```bash
# محاولة 1-5 — يجب أن تنجح
for i in {1..5}; do
  curl -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done

# محاولة 6 — يجب أن ترجع 429
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d '{"email":"test@test.com","password":"wrong"}' \
  -w "\nStatus: %{http_code}\n"
```

### ب) اختبار تسجيل الحساب

```bash
# محاولة 1-5 — يجب أن تنجح (أو تفشل مع 422 لأسباب validation)
for i in {1..5}; do
  curl -X POST http://localhost:8000/api/v1/auth/register \
    -d '{"email":"new'$i'@test.com",...}' \
    -w "\nStatus: %{http_code}\n"
done

# محاولة 6 — يجب أن ترجع 429
```

### ج) اختبار تغيير كلمة المرور

```bash
# محاولة 1-3 — يجب أن تنجح
for i in {1..3}; do
  curl -X POST http://localhost:8000/api/v1/auth/profile/change-password \
    -H "Authorization: Bearer TOKEN" \
    -d '{...}' \
    -w "\nStatus: %{http_code}\n"
  sleep 20
done

# محاولة 4 — يجب أن ترجع 429
```

### المتوقع: ✅
- 429 Too Many Requests بعد تجاوز الحد
- Response header: `Retry-After: XXX`
- الـ rate limiting ينطبق على IP أو user

---

## 📝 3. اختبار Logging

### أ) التحقق من القنوات

```bash
# يجب أن توجد 3 ملفات
ls -la storage/logs/
# - operations.log (جديد)
# - security.log (جديد)
# - performance.log (جديد)
# - laravel.log (الأصلي)
```

### ب) فحص سجلات العمليات

```bash
# قم بإنشاء منتج جديد
php artisan tinker
> $product = Product::create([...]);

# ثم افحص السجل
tail -20 storage/logs/operations.log
# يجب أن تجد:
# - operation: "create"
# - resource: "product"
# - user_id: X
# - company_id: Y
# - timestamp: "2026-05-19T..."
```

### ج) فحص سجلات الأمان

```bash
# جرّب تسجيل دخول فاشل
# ثم افحص السجل
tail -20 storage/logs/security.log
# يجب أن تجد معلومات عن المحاولة الفاشلة
```

### د) فحص سجلات الأداء

```bash
# جرّب query بطيء (مثلاً مع 10M سجلات)
# ثم افحص السجل
tail -20 storage/logs/performance.log
```

### المتوقع: ✅
- كل ملف يحتوي على السجلات المناسبة
- التاريخ والوقت دقيق
- البيانات الحساسة لا تُسجل (كلمات مرور، tokens)
- Rotation يعمل بعد 30/60/14 يوم

---

## 🎨 4. اختبار CommercialDocumentModal

### أ) اختبار اختيار المنتج

```
الخطوات:
1. افتح نموذج إنشاء مستند
2. اضغط على حقل "المنتج"
3. ابحث عن منتج (مثلاً "Apple")
4. اختر منتج من النتائج

المتوقع:
✅ تظهر قائمة المنتجات
✅ البحث يعمل
✅ عند الاختيار:
   - تملأ حقول السعر والتعبئة
   - تظهر التعبئة الافتراضية
   - الكمية تُحدث (حسب التعبئة)
```

### ب) اختبار التعبئات

```
الخطوات:
1. اختر منتج بتعبئات متعددة
2. افتح dropdown "التعبئة"
3. غيّر التعبئة

المتوقع:
✅ تظهر جميع التعبئات (UN, FD, PLT, etc.)
✅ عند التغيير:
   - تتحدث الكمية (حسب quantity في التعبئة)
   - يتحدث السعر (price_per_pack)
```

### ج) اختبار الكثير

```
الخطوات:
1. اختر منتج يدير الكثير
2. افتح dropdown "الكثير"

المتوقع:
✅ تظهر قائمة الكثير الاسم (lot_number)
✅ بجانب كل كثير (ينتهي في YYYY-MM-DD)
✅ تظهر الكمية المتاحة
✅ قد تحجب الكثير المنتهي (اختيار)
```

### د) اختبار الخصومات

```
الخطوات:
1. اختر منتج بخصومات كميات
2. غيّر الكمية

المتوقع:
✅ عند تغيير الكمية:
   - يُحسب الخصم المناسب تلقائياً
   - يظهر معدل الخصم في العمود
   - يتحدث الإجمالي
```

### هـ) اختبار الأسعار

```
الخطوات:
1. اختر منتج بأسعار متعددة
2. اختر مستوى سعر مختلف (من إعدادات المستند)

المتوقع:
✅ السعر يتحدث حسب مستوى السعر
✅ يُحسب بناءً على طريقة التسعير:
   - fixed: القيمة المباشرة
   - rate: بناءً على نسبة
   - margin: بناءً على الهامش
```

### و) اختبار الحسابات

```
الخطوات:
1. أضف عدة أسطر
2. غيّر الأسعار والكميات

المتوقع:
✅ "الإجمالي HT" يتحدث دائماً
✅ "TVA" يُحسب من معدل الضريبة
✅ "إجمالي الخصم" مع جميع الخصومات
✅ "الطابع الجبائي" يُحسب:
   - 0 إذا كان < 30,000
   - 1% من TTC إذا كان >= 30,000
   - سقف 2,500
✅ "الإجمالي TTC" صحيح (HT + TVA + Stamp)
```

### ز) اختبار التحقق (Validation)

```
الخطوات:
1. جرّب الحفظ بدون ملء الحقول الإلزامية
2. جرّب الحفظ بدون أسطر
3. جرّب الحفظ مع سطر بدون منتج

المتوقع:
✅ تظهر رسائل خطأ واضحة:
   - "الزبون/المورد إلزامي"
   - "التاريخ إلزامي"
   - "يجب إضافة سطر واحد على الأقل"
   - "السطر 1: المنتج إلزامي"
   - "السطر 1: الكمية يجب أن تكون أكبر من صفر"
```

### ح) اختبار الحفظ

```
الخطوات:
1. ملأ جميع الحقول بشكل صحيح
2. أضف عدة أسطر
3. اضغط "حفظ"

المتوقع:
✅ ظهور تحميل loading
✅ عند النجاح:
   - إغلاق النموذج
   - ظهور رسالة "تم الحفظ بنجاح"
   - تحديث قائمة المستندات
✅ عند الفشل:
   - عرض رسالة الخطأ من الـ API
   - بقاء النموذج مفتوح
```

### المتوقع النهائي: ✅
- كل المميزات تعمل كما هو متوقع
- الحسابات صحيحة
- الواجهة تفاعلية وسلسة
- لا توجد أخطاء في console

---

## 🔗 5. اختبار التكامل

### أ) اختبار API endpoint

```bash
# اختبر إنشاء مستند
curl -X POST http://localhost:8000/api/v1/1/commercial-documents \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_type_id": 1,
    "party_id": 1,
    "warehouse_id": 1,
    "fiscal_year_id": 1,
    "currency_id": 1,
    "exchange_rate": 1,
    "document_date": "2026-05-19",
    "lines": [
      {
        "product_id": 1,
        "quantity": 5,
        "unit_price_ht": 1000,
        "tva_rate": 19,
        "discount_percentage": 0
      }
    ]
  }'
```

### المتوقع: ✅
- Status 201 (Created)
- Response يحتوي على المستند المنشأ مع ID

---

## 📊 ملخص النتائج

| الاختبار | النتيجة | ملاحظات |
|---------|--------|---------|
| Multi-tenancy | ☐ | |
| Rate Limiting | ☐ | |
| Logging | ☐ | |
| CommercialDocumentModal | ☐ | |
| التكامل | ☐ | |

---

## 🔍 معالجة المشاكل

إذا واجهت أي مشكلة:

1. **تحقق من السجلات**:
   ```bash
   tail -100 storage/logs/laravel.log
   tail -100 storage/logs/operations.log
   ```

2. **تفعيل debug mode**:
   ```bash
   # في .env
   APP_DEBUG=true
   ```

3. **جرّب tinker**:
   ```bash
   php artisan tinker
   ```

4. **تحقق من الـ API مباشرة**:
   ```bash
   curl -v http://localhost:8000/api/v1/auth/login
   ```

---

**آخر تحديث**: May 19, 2026
