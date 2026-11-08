تقييم Migration الأخير: 2026_07_25_100144
ملخص الـ Migration
$table->decimal('discount_amount_per_unit', 15, 4)->nullable()
      ->after('discount_percentage')
      ->comment('Frozen per-unit discount from a quantity tier, stored natively — never derived from discount_percentage.');
يضيف عمود discount_amount_per_unit لتخزين خصم الوحدة الثابتة (الذي يأتي من تسعير الكميات) بشكل "مجمد" — لا يُشتق من discount_percentage.
هل تم الاعتماد عليها في المشروع؟
نعم، بشكل كامل ومتسق. البحث يظهر:
الطبقة	الملف
Model	CommercialDocumentLine.php:33,63
Observer	CommercialDocumentLineObserver.php:38,54,74
Service	CommercialDocumentService.php:518,522,528,546,562,581
ComputeLine	ComputeLineService.php:326,367
API Resource	CommercialDocumentLineResource.php:25
Frontend Type	types.ts:496
POS Page	POSPage.tsx:707,1042,1051-1060
تقييم: 8/10 ✅
نقاط إيجابية
1. حل مشكلة حقيقية وخطيرة — bug التلف الذاتي (self-corruption) كان يُعيد حساب discount_percentage بشكل خاطئ عند تغيير الكمية. الحل يفصل بين "المُدخل" و"المُحسب" بشكل جذري.
2. تمييز واضح بين مسارين متنافيين — Observer يُ implement منطق Path A (ثابت) / Path B (نسبة) بشكل نظيف:
if ($discAmtPerUnit > 0) { /* ثابت */ } else { /* نسبة */ }
3. العمود nullable بالتصميم — لا يملأ إلا في حالة fixed-amount. في حالة النسبة يبقى null. هذا صحيح لأن percentages لا تحتاج تخزين ثابت.
4. الـ Comment وصفي ودقيق — يُوضّح الغرض والقيود بوضوح.
5. Migration مُعاكس (down()) — يحذف العمود عند التراجع. بسيط ونظيف.
6. المigration مُنسق زمنياً مع 100000 — الـ precision migration (100000) يسبق الـ new column (100144). الترتيب صحيح لأن change() على العمود الموجود يي أولاً.
7. التكامل الكامل مع discount_mode في Frontend — CartItem uses discount_mode: 'fixed_amount' | 'percentage' which maps cleanly to the backend's discount_amount_per_unit > 0 vs null branching.
نقاط سلبية / ملاحظات
1. ⚠️ لا يوجد Data Migration للبيانات القديمة — الأسطر الموجودة قبل هذا الـ migration ستحصل على NULL في discount_amount_per_unit. هذا مقبول فقط إذا:
- لا توجد أسطر قديمة بـ fixed-amount discount محفوظة في discount_percentage
- أو أن الأسطر القديمة كانت دائماً percentages
التحقق مطلوب: هل هناك أسطر قديمة كان خصمها ثابت (fixed) مُخزَّن في discount_percentage كنسبة مُحوّلة؟ إذا نعم، تحتاج Data Migration.
2. ⚠️ decimal(15,4) vs discount_amount الأصلي — العمود الجديد يستخدم (15,4) بينما discount_amount الأصلي في الجدول (من migration 2025_10_15_093437) قد يكون (12,4) أو (15,4). عدم تساوي الـ precision قد يسبب خسائر في الحسابات إذا لم يكن discount_amount الأصلي (15,4) also.
3. ⚠️ لا يوجد Index — لا يوجد index على discount_amount_per_unit. هذا مقبول حالياً لأن لا يوجد استعلام يُصفّي بهذا العمود. لكن إذا احتجت مستقبلاً:
WHERE discount_amount_per_unit IS NOT NULL
ستحتاج index.
4. ⚠️ تداخل أسماء محتمل — discount_amount (العمود القديم) و discount_amount_per_unit (الجديد) متشابهان جداً في الاسم. في السياق:
- discount_amount = خصم الوحدة المُحسَّب من النسبة (unit_price_ht × pct/100)
- discount_amount_per_unit = خصم الوحدة الثابت من tier
قد يُسبب لبسًا للمطورين الجدد. اسم مثل frozen_discount_per_unit أو tier_discount_per_unit كان أوضح.
5. ⚠️ لا يوجد $table->index() على quantity_discount_id — العمود المُضاف في migration يوم 2026_07_24 (quantity_discount_id) أيضاً لا يبدو أنه عليه index، وهو يُستخدم في JOINs.
6. ملاحظة بسيطة: الـ comment يقول "never derived from discount_percentage" — لكن في Observer سطر 76:
$line->discount_amount = round($unitDiscount, 4);
discount_amount يُشتق من discount_percentage في Path B. هذا صحيح، لكن الـ comment على العمود الجديد قد يُوهم أن discount_amount لا علاقة له بالنسبة.
هل تم دمجها بالشكل الصحيح؟
نعم، بالمجمل. التكامل مُكتمل عبر جميع الطبقات:
- DB → Model → Observer → Service → API Resource → Frontend Type → POS Page
ال Observer هو النقطة المحورية ويُ implementing المنطق بشكل صحيح:
- discount_amount_per_unit > 0 → Path A (ثابت، لا تحويل)
- discount_amount_per_unit null/0 → Path B (نسبة)
ملخص التقييم: Migration جيد يحل مشكلة معمارية حقيقية. النقاط السلبية محدودة وقابلة للتحسين (rename محتمل، data migration check، index). الكود المُدمج متسق ومكتمل عبر الطبقات.
▣  Build · Big Pickle · 12m 19s
