// ════════════════════════════════════════════════════════════════════════════
// 📘 POS Smart Search Integration Guide
// نظام البحث الذكي المتقدم للـ POS
// ════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// ✅ الملفات المضافة والتحسينات
// ═══════════════════════════════════════════════════════════════════════════

1️⃣ lib/pos/services/posSearchService.ts
   ├─ searchVariants() — البحث الأساسي مع أولويات
   ├─ searchWithCategories() — البحث مع تجميع الفئات
   ├─ levenshteinDistance() — fuzzy search
   ├─ normalizeSearchText() — تطبيع النصوص العربية
   ├─ scoreVariant() — تقييم درجة المطابقة
   └─ Cache system — كاش ذكي مع TTL

2️⃣ lib/pos/hooks/usePOSSmartSearch.ts
   ├─ usePOSSmartSearch() — hook رئيسي مع debounce
   ├─ usePOSQuickSearch() — بحث سريع بسيط
   └─ دعم كامل للتجميع حسب الفئة

3️⃣ lib/api/endpoints/productsEnhanced.ts
   ├─ getAllFamilies() — جلب جميع الفئات مع الإحصائيات
   ├─ smartSearch() — بحث ذكي في الباكاند
   ├─ barcodeSearch() — بحث بالباركود
   ├─ trending() — المنتجات الشعبية
   ├─ discounted() — المنتجات المخفضة
   ├─ searchGroupedByFamily() — بحث مجمع
   └─ similar() — منتجات مشابهة

4️⃣ components/pos/ProductSearchBarEnhanced.tsx
   ├─ بحث ذكي مع اقتراحات فورية
   ├─ عرض أيقونات لأنواع المطابقة
   ├─ اختصارات لوحة مفاتيح (↑↓Enter)
   ├─ عرض درجة المطابقة والوقت
   └─ تجميع النتائج حسب الفئة

5️⃣ components/pos/CategoryTabsEnhanced.tsx
   ├─ عرض جميع الفئات (ليس المتاحة فقط)
   ├─ عدد المنتجات لكل فئة
   ├─ بحث سريع في الفئات
   ├─ تمرير أفقي للفئات الكثيرة
   └─ استجابة كاملة

6️⃣ pos-search-enhanced.css
   ├─ تصميم حديث واحترافي
   ├─ دعم RTL كامل
   ├─ انتقالات سلسة
   └─ استجابة للأجهزة المختلفة

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 خطوات التثبيت والتكامل
// ═══════════════════════════════════════════════════════════════════════════

### الخطوة 1: نسخ الملفات

```bash
# خدمات و hooks
cp posSearchService.ts lib/pos/services/
cp usePOSSmartSearch.ts lib/pos/hooks/

# API endpoints
cp productsEnhanced.ts lib/api/endpoints/

# مكونات
cp ProductSearchBarEnhanced.tsx components/pos/
cp CategoryTabsEnhanced.tsx components/pos/

# أنماط
cp pos-search-enhanced.css styles/
```

### الخطوة 2: استيراد الأنماط

في ملفك الرئيسي (App.tsx أو main.tsx):

```tsx
import '@/styles/pos-search-enhanced.css';
```

### الخطوة 3: تحديث صفحة POS

في `pages/pos/POSKioskPage.tsx`:

```tsx
// استبدال الواردات القديمة
- import ProductSearchBar from '@/pos/components/ProductSearchBar';
- import CategoryTabs from '@/pos/components/CategoryTabs';

+ import ProductSearchBarEnhanced from '@/pos/components/ProductSearchBarEnhanced';
+ import CategoryTabsEnhanced from '@/pos/components/CategoryTabsEnhanced';

// استبدال المكونات
<ProductSearchBar
  query={searchQuery}
  onQuery={setSearchQuery}
  // ... props أخرى
/>

// ↓ يصبح:

<ProductSearchBarEnhanced
  variants={allVariants}
  families={families}
  onSelectVariant={v => pos.addItem(v)}
  onQueryChange={setSearchQuery}
  maxSuggestions={15}
/>

// ─────────────────────────────────────────────────────────────

<CategoryTabs
  families={families}
  selected={selectedCategory}
  onSelect={setSelectedCategory}
/>

// ↓ يصبح:

<CategoryTabsEnhanced
  families={families}
  selected={selectedCategory}
  onSelect={setSelectedCategory}
  allowAll={true}
  maxVisible={8}
/>
```

### الخطوة 4: تحديث الاستعلام (اختياري)

يمكنك إزالة استعلام المنتجات الحالي واستخدام hook جديد:

```tsx
// القديم:
const { data: productsRaw } = useQuery({
  queryKey: ['pos-products-kiosk', slug, searchQuery, selectedCategory],
  queryFn: () => productsApi.list({
    per_page: PER_PAGE,
    search: searchQuery || undefined,
    family_id: selectedCategory ?? undefined,
    include: 'tva,unit,family,prices.priceLevel',
    active: true,
  }),
  placeholderData: keepPreviousData,
  staleTime: 60_000,
});

// الجديد (اختياري — للحصول على أداء أفضل):
import { useSmartSearch, useAllFamilies } from '@/lib/api/endpoints/productsEnhanced';

const { data: smartResults } = useSmartSearch({
  query: searchQuery,
  family_id: selectedCategory,
  per_page: 100,
  sort: 'popularity',
});

const { data: allFamilies } = useAllFamilies();
```

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 الميزات الرئيسية
// ═══════════════════════════════════════════════════════════════════════════

✅ **بحث ذكي مع أولويات**
   - باركود دقيق (score: 1000)
   - اسم دقيق (score: 650)
   - اسم يبدأ بـ (score: 550)
   - بحث جزئي (score: 450)
   - fuzzy search (score: 80-150)

✅ **Fuzzy Search (تصحيح الأخطاء)**
   - يعمل حتى مع الأخطاء الإملائية
   - threshold: 50% تشابه
   - Levenshtein distance algorithm

✅ **Debounce ذكي**
   - تأخير 200-300ms قابل للتخصيص
   - تجنب البحث الزائد
   - أداء محسّنة على الأجهزة البطيئة

✅ **Cache System**
   - تخزين مؤقت تلقائي (TTL: 10 دقائق)
   - تخزين مؤقت للنتائج المكررة
   - إمكانية التنظيف اليدوي

✅ **عرض الفئات**
   - جميع الفئات متاحة (ليس المتاحة فقط)
   - عدد المنتجات لكل فئة
   - بحث سريع في الفئات
   - تمرير أفقي للفئات الكثيرة

✅ **اختصارات لوحة المفاتيح**
   - ↑↓ — التنقل بين النتائج
   - Enter — اختيار النتيجة
   - Escape — إغلاق الاقتراحات
   - X — مسح البحث

✅ **معلومات أداء**
   - عرض وقت البحث
   - عدد النتائج
   - درجة المطابقة لكل نتيجة

// ═══════════════════════════════════════════════════════════════════════════
// 💻 استخدام متقدم
// ═══════════════════════════════════════════════════════════════════════════

### 1. البحث البسيط

```tsx
import { usePOSSmartSearch } from '@/lib/pos/hooks/usePOSSmartSearch';

function MyComponent({ variants, families }) {
  const { query, setQuery, results, resultsByCategory } = usePOSSmartSearch(
    variants,
    families,
  );

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder=\"بحث...\"
      />
      {results.results.map(r => (
        <div key={r.variant.id}>
          {r.variant.product?.name}
          <span>{r.matchType} ({r.score}%)</span>
        </div>
      ))}
    </>
  );
}
```

### 2. البحث مع خيارات مخصصة

```tsx
const { results } = usePOSSmartSearch(variants, families, {
  debounceMs: 500,          // تأخير أطول
  maxResults: 50,           // تحديد عدد النتائج
  minScore: 100,            // حد أدنى أعلى للدرجة
  activeOnly: true,         // فقط المنتجات المفعلة
});
```

### 3. البحث المباشر (بدون hook)

```tsx
import { searchVariants } from '@/lib/pos/services/posSearchService';

const results = searchVariants(variants, 'باركود المنتج', {
  maxResults: 20,
  minScore: 50,
  activeOnly: true,
});

console.log(results.results);
console.log(results.executionTime); // ms
```

### 4. البحث مع تجميع الفئات

```tsx
import { searchWithCategories } from '@/lib/pos/services/posSearchService';

const grouped = searchWithCategories(
  variants,
  'منتج',
  families,
);

grouped.forEach(category => {
  console.log(category.category.name);
  console.log(category.variants.length);
  console.log(category.score); // درجة الفئة
});
```

### 5. تنظيف الكاش

```tsx
import { clearSearchCache } from '@/lib/pos/services/posSearchService';

// عند تبديل الشركة مثلاً
clearSearchCache();
```

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 تحسينات الباكاند المقترحة (اختياري)
// ═══════════════════════════════════════════════════════════════════════════

### إضافة routes في api.php:

```php
// Families — جلب جميع الفئات
Route::get('families', [FamilyController::class, 'index']);

// Smart Search — بحث ذكي
Route::get('product-variants/search', [ProductVariantController::class, 'search']);

// Barcode Search — بحث بالباركود
Route::get('product-variants/barcode-search', [ProductVariantController::class, 'barcodeSearch']);

// Trending — الأكثر رواجاً
Route::get('product-variants/trending', [ProductVariantController::class, 'trending']);

// Discounted — المخفضة
Route::get('product-variants/discounted', [ProductVariantController::class, 'discounted']);

// Similar — منتجات مشابهة
Route::get('products/{id}/similar-variants', [ProductController::class, 'similar']);

// Grouped Search — بحث مجمع
Route::get('product-variants/search/grouped', [ProductVariantController::class, 'groupedSearch']);
```

### مثال Controller في Laravel:

```php
public function search(Request $request)
{
    $query = $request->input('search');
    
    return ApiListService::getList(ProductVariant::class, [
        'filters' => [
            'name' => 'partial',
            'barcode' => 'partial',
            'ref' => 'partial',
            'product.family_id' => 'exact',
        ],
        'search_fields' => ['ref', 'barcode', 'product.name'],
        'sorts' => ['popularity', 'price', 'newest', 'name'],
        'relations' => ['product', 'product.family', 'unit', 'tva', 'prices.priceLevel'],
        'default_per_page' => 50,
    ], $request, function ($qb) use ($request) {
        // إضافة الترتيب الذكي
        $sort = $request->input('sort', 'popularity');
        
        return match($sort) {
            'popularity' => $qb->orderByDesc('sales_count'),
            'price' => $qb->orderBy('default_selling_price_ht'),
            'newest' => $qb->orderByDesc('created_at'),
            default => $qb->orderBy('product.name'),
        };
    });
}
```

// ═══════════════════════════════════════════════════════════════════════════
// 📊 ملاحظات الأداء
// ═══════════════════════════════════════════════════════════════════════════

✅ **الفرونتند (Client-side)**
   - البحث يتم بسرعة جداً (عادة < 10ms)
   - لا حاجة لطلبات API متكررة
   - كاش ذكي يقلل الحسابات المكررة
   - Debounce يقلل عدد العمليات

✅ **الباكاند (Server-side)**
   - إذا أضفت endpoints جديدة، استخدم:
     - Simple pagination بدلاً من full pagination
     - Eager loading للعلاقات
     - Database indexes على: barcode, ref, name
   
⚠️  **تنبيهات مهمة**
   - للبيانات الكبيرة جداً (>10000 منتج)، استخدم API الباكاند للبحث
   - للبيانات الصغيرة (<1000)، البحث الفرونتند كافٍ تماماً
   - استخدم debounce لتجنب البحث الزائد

// ═══════════════════════════════════════════════════════════════════════════
// 🐛 استكشاف الأخطاء
// ═══════════════════════════════════════════════════════════════════════════

مشكلة: البحث بطيء جداً
✓ زيادة debounceMs
✓ تقليل maxResults
✓ تأكد من تحميل الفئات بشكل صحيح

مشكلة: النتائج غير دقيقة
✓ تقليل minScore
✓ تحقق من normalizeSearchText() للنصوص العربية
✓ اختبر levenshteinDistance مع الأخطاء الإملائية

مشكلة: الكاش لا يعمل
✓ تحقق من clearSearchCache() عند تحديث البيانات
✓ استخدم DevTools لفحص Cache الـ Service Worker

مشكلة: الفئات لا تظهر
✓ تأكد من تحميل useAllFamilies() بشكل صحيح
✓ تحقق من العلاقة family_id في المنتجات

// ═══════════════════════════════════════════════════════════════════════════
// 📝 الترخيص والدعم
// ═══════════════════════════════════════════════════════════════════════════

نظام مفتوح المصدر — يمكنك تطويره كما تشاء
لأي استفسارات أو تحسينات، يمكنك تعديل الأكواد بحرية
