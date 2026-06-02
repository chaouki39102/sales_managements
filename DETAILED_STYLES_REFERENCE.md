# 📑 Detailed Reference Table
## Inline Styles و className Patterns — جدول مفصل

**تم إنشاؤه**: 2 يونيو 2026

---

## 1️⃣ Inline Styles - جدول شامل

### 🎯 الفئة: Layout & Flex

| Pattern | استخدام | الملفات | عدد المرات | أولوية |
|---------|--------|-------|----------|--------|
| `display: 'flex'` | Container flex أساسي | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx), [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx), [SuppliersPage.tsx](resources/js/pages/suppliers/SuppliersPage.tsx) | 40+ | 🔴 عالية جداً |
| `alignItems: 'center'` | محاذاة أفقية في الوسط | الملفات أعلاه | 40+ | 🔴 عالية جداً |
| `justifyContent: 'space-between'` | توزيع الفراغات | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L271), [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx) | 8+ | 🟠 عالية |
| `flexDirection: 'column'` | تخطيط عمودي | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L446), [AlertBar.tsx](resources/js/components/ui/AlertBar.tsx) | 6+ | 🟠 عالية |
| `flex: 1` | عنصر ينمو ليملأ المساحة | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L38), [AlertBar.tsx](resources/js/components/ui/AlertBar.tsx#L38), [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L265) | 15+ | 🟠 عالية |
| `flexShrink: 0` | عنصر لا ينكمش | [AlertBar.tsx](resources/js/components/ui/AlertBar.tsx#L35) | 3+ | 🟡 متوسطة |
| `gap: 6` (مختلف: 5,6,8,10,12) | مسافة بين العناصر | معظم الملفات | 50+ | 🔴 عالية جداً |

**الملخص**: 160+ استخدام لخصائص flex
**التوصية**: ✅ إنشاء utility classes: `.flex-center`, `.flex-between`, `.flex-col`, `.gap-1-5`, `.gap-2`, etc.

---

### 🎨 الفئة: Padding & Spacing

| Pattern | استخدام | الملفات | عدد المرات | أولوية |
|---------|--------|-------|----------|--------|
| `padding: '4px 12px'` | صغير | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L150) | 4+ | 🟡 متوسطة |
| `padding: '5px 12px'` | صغير | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L169) | 2+ | 🟡 متوسطة |
| `padding: '6px 12px'` | صغير (رؤوس) | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L202), [PaymentModal.tsx](resources/js/pos/components/PaymentModal.tsx) | 5+ | 🟡 متوسطة |
| `padding: '8px 12px'` | وسط | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L244) | 3+ | 🟡 متوسطة |
| `padding: '8px 14px'` | وسط | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L272) | 2+ | 🟡 متوسطة |
| `padding: '9px 12px'` | وسط | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L537) | 5+ | 🟡 متوسطة |
| `padding: '10px 14px'` | وسط | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L593) | 8+ | 🟡 متوسطة |
| `padding: '12px 16px'` | وسط كبير | [PaymentModal.tsx](resources/js/pos/components/PaymentModal.tsx#L117) | 4+ | 🟡 متوسطة |
| `padding: '14px 16px'` | كبير | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L341), [Receipt.tsx](resources/js/pos/components/Receipt.tsx) | 6+ | 🟡 متوسطة |
| `padding: 16` أو `padding: pad` | ديناميكي | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L198) | 8+ | 🟡 متوسطة |
| `marginTop: 1` | حاشية أعلى صغيرة | [AlertBar.tsx](resources/js/components/ui/AlertBar.tsx#L35) | 2+ | 🟢 منخفضة |
| `marginBottom: 18` أو `22` أو `24` | حاشية أسفل | معظم الملفات | 12+ | 🟡 متوسطة |

**الملخص**: 60+ استخدام لخصائص padding/margin
**التوصية**: ✅ إنشاء spacing scale: `.px-1`, `.py-2`, `.mb-6`, etc.

---

### ⏱️ الفئة: Animation & Transition

| Pattern | استخدام | الملفات | عدد المرات | أولوية |
|---------|--------|-------|----------|--------|
| `animation: 'spin 1s linear infinite'` | loader/spinner | [Button.tsx](resources/js/components/ui/Button.tsx#L52), [routes/index.tsx](resources/js/routes/index.tsx#L88), [RolesPage.tsx](resources/js/pages/users/RolesPage.tsx#L294) | 6+ | 🟠 عالية |
| `animation: 'spin .8s linear infinite'` | spinner أسرع | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L155) | 2+ | 🟠 عالية |
| `animation: 'slideIn .25s ease'` | slide-in | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L2012) | 2+ | 🟠 عالية |
| `animation: 'slideIn .2s ease'` | slide-in سريع | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L2250) | 5+ | 🟠 عالية |
| `animation: 'modalIn .22s cubic-bezier(...)'` | modal appearance | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L216) | 1+ | 🟡 متوسطة |
| `animation: 'ovIn .18s ease'` | overlay appearance | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L199) | 1+ | 🟡 متوسطة |
| `animation: slideIn with delay` | sequential animation | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L2121) | 3+ | 🟠 عالية |
| `transition: '.14s'` أو `'.15s'` | smooth transitions | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx), [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx) | 25+ | 🟠 عالية |
| `transition: 'all .15s'` | transition كل الخصائص | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L172) | 3+ | 🟡 متوسطة |
| `transition: 'background .1s'` | خلفية فقط | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L247) | 4+ | 🟡 متوسطة |

**الملخص**: 50+ استخدام لخصائص animation/transition
**التوصية**: ✅ إنشاء animation utilities: `.animate-spin`, `.animate-slide-in`, `.transition-fast`, etc.

---

### 🎯 الفئة: Sizing & Dimensions

| Pattern | استخدام | الملفات | عدد المرات | أولوية |
|---------|--------|-------|----------|--------|
| `minWidth: 0` | منع overflow | [AlertBar.tsx](resources/js/components/ui/AlertBar.tsx) | 2+ | 🟢 منخفضة |
| `minWidth: 200` | حد أدنى للعرض | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L193), [SuppliersPage.tsx](resources/js/pages/suppliers/SuppliersPage.tsx#L60) | 3+ | 🟢 منخفضة |
| `width: '100%'` | ملء الكامل | [PaymentModal.tsx](resources/js/pos/components/PaymentModal.tsx#L288) | 3+ | 🟢 منخفضة |
| `fontSize: 9` إلى `20` | أحجام نصوص متنوعة | معظم الملفات | 40+ | 🟠 عالية |
| `overflow*: hidden/auto` | إخفاء/عرض overflow | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L331) | 3+ | 🟢 منخفضة |

**الملخص**: 50+ استخدام لخصائص sizing
**التوصية**: ✅ استخدام Tailwind sizes أو utility classes

---

### 🌈 الفئة: Colors & Backgrounds

| Pattern | استخدام | الملفات | عدد المرات | أولوية |
|---------|--------|-------|----------|--------|
| `color: 'var(--em)'` | لون رئيسي | معظم الملفات | 25+ | 🟠 عالية |
| `color: 'var(--t1)'` | نص أغمق | معظم الملفات | 15+ | 🟠 عالية |
| `color: 'var(--t4)'` | نص أفتح | معظم الملفات | 20+ | 🟠 عالية |
| `color: 'var(--gold)'` | ذهبي/خاص | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L185), [RolesPage.tsx](resources/js/pages/users/RolesPage.tsx) | 4+ | 🟡 متوسطة |
| `color: '#dc2626'` | أحمر | [Receipt.tsx](resources/js/pos/components/Receipt.tsx#L102) | 1+ | 🟢 منخفضة |
| `background: 'var(--bg2)'` | خلفية فاتحة | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L193) | 2+ | 🟡 متوسطة |
| `background: 'var(--bg3)'` | خلفية أفتح | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx), [PaymentModal.tsx](resources/js/pos/components/PaymentModal.tsx) | 8+ | 🟡 متوسطة |
| `background: 'transparent'` | شفاف | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L274) | 4+ | 🟢 منخفضة |

**الملخص**: 80+ استخدام لخصائص color/background
**التوصية**: ✅ إنشاء color tokens: `.text-primary`, `.text-secondary`, `.bg-surface`, etc.

---

### 🎨 الفئة: Border & Border Radius

| Pattern | استخدام | الملفات | عدد المرات | أولوية |
|---------|--------|-------|----------|--------|
| `border: '1px solid var(--b2)'` | border عادي | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx), [AlertBar.tsx](resources/js/components/ui/AlertBar.tsx) | 8+ | 🟡 متوسطة |
| `border: '1px solid var(--b1)'` | border أفتح | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L239) | 3+ | 🟡 متوسطة |
| `borderTop: '1px solid var(--b1)'` | border أعلى | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx) | 3+ | 🟡 متوسطة |
| `borderBottom: '1px solid var(--b1)'` | border أسفل | [PaymentModal.tsx](resources/js/pos/components/PaymentModal.tsx#L43) | 2+ | 🟡 متوسطة |
| `borderRadius: 20` | دائري كبير | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L151), [AlertBar.tsx](resources/js/components/ui/AlertBar.tsx) | 4+ | 🟡 متوسطة |
| `borderRadius: 12` | دائري متوسط | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L193) | 2+ | 🟡 متوسطة |
| `borderRadius: 'var(--r1)'` إلى `'var(--r3)'` | CSS variables | [AlertBar.tsx](resources/js/components/ui/AlertBar.tsx#L33), [PaymentModal.tsx](resources/js/pos/components/PaymentModal.tsx#L288) | 5+ | 🟡 متوسطة |
| `boxShadow: '0 8px 24px rgba(0,0,0,.2)'` | ظل | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L194) | 2+ | 🟢 منخفضة |

**الملخص**: 30+ استخدام لخصائص border
**التوصية**: ✅ إنشاء border utilities: `.border`, `.rounded-lg`, `.shadow-md`, etc.

---

### ✍️ الفئة: Typography

| Pattern | استخدام | الملفات | عدد المرات | أولوية |
|---------|--------|-------|----------|--------|
| `fontSize: 9` | صغير جداً | معظم الملفات | 5+ | 🟡 متوسطة |
| `fontSize: 10` | صغير جداً | معظم الملفات | 5+ | 🟡 متوسطة |
| `fontSize: 11` | صغير | معظم الملفات | 8+ | 🟡 متوسطة |
| `fontSize: 12` | صغير | معظم الملفات | 12+ | 🟡 متوسطة |
| `fontSize: 13` | عادي | معظم الملفات | 8+ | 🟡 متوسطة |
| `fontSize: 14` | أكبر | معظم الملفات | 5+ | 🟡 متوسطة |
| `fontSize: 15` | أكبر | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L2223) | 2+ | 🟡 متوسطة |
| `fontWeight: 500` | وسط | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L288) | 2+ | 🟡 متوسطة |
| `fontWeight: 600` | أثقل | معظم الملفات | 8+ | 🟡 متوسطة |
| `fontWeight: 700` | أثقل جداً | معظم الملفات | 8+ | 🟡 متوسطة |
| `fontWeight: 800` | ثقيل جداً | معظم الملفات | 5+ | 🟡 متوسطة |
| `textDecoration: 'none'` | لا تسطير | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L246) | 2+ | 🟢 منخفضة |
| `fontStyle: 'italic'` | مائل | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L232) | 2+ | 🟢 منخفضة |
| `textAlign: 'center'` | توسيط | [Receipt.tsx](resources/js/pos/components/Receipt.tsx) | 3+ | 🟢 منخفضة |
| `textTransform: 'uppercase'` | أحرف كبيرة | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L203) | 2+ | 🟢 منخفضة |
| `letterSpacing: .5` | مسافة أحرف | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L203) | 2+ | 🟢 منخفضة |

**الملخص**: 85+ استخدام لخصائص typography
**التوصية**: ✅ إنشاء typography utilities: `.text-xs`, `.text-sm`, `.font-bold`, etc.

---

### 📍 الفئة: Direction & Position

| Pattern | استخدام | الملفات | عدد المرات | أولوية |
|---------|--------|-------|----------|--------|
| `direction: 'rtl'` | يمين لليسار | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L194) | 2+ | 🟢 منخفضة |
| `direction: 'ltr'` | يسار لليمين | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L1203), [SuppliersPage.tsx](resources/js/pages/suppliers/SuppliersPage.tsx), [ProductCard.tsx](resources/js/pos/components/ProductCard.tsx) | 8+ | 🟢 منخفضة |
| `position: 'relative'` | نسبي | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L164) | 2+ | 🟢 منخفضة |
| `position: 'absolute'` | مطلق | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L192) | 2+ | 🟢 منخفضة |
| `top: 'calc(...)'` | حسابي | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L192) | 1+ | 🟢 منخفضة |
| `zIndex: 1000` | طبقة عالية | [FiscalYearContext.tsx](resources/js/context/FiscalYearContext.tsx#L196) | 2+ | 🟢 منخفضة |

**الملخص**: 20+ استخدام لخصائص positioning
**التوصية**: ✅ استخدام Tailwind positioning classes

---

## 2️⃣ CSS Classes - جدول شامل

### 🏗️ البنية (Structure)

| Class | الاستخدام | الملفات | عدد المرات |
|-------|----------|--------|----------|
| `.card` | Card container | [Card.tsx](resources/js/components/ui/Card.tsx), أكثر المستندات | 30+ |
| `.card-hd` | Card header | [Card.tsx](resources/js/components/ui/Card.tsx) | 10+ |
| `.card-title` | Card title | [Card.tsx](resources/js/components/ui/Card.tsx), [RolesPage.tsx](resources/js/pages/users/RolesPage.tsx) | 8+ |
| `.card-sub` | Card subtitle | [Card.tsx](resources/js/components/ui/Card.tsx) | 3+ |
| `.page` | Page container | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L1991), [RolesPage.tsx](resources/js/pages/users/RolesPage.tsx#L281) | 25+ |
| `.page.on` | Active page | نفس الملفات أعلاه | 20+ |
| `.kpis` | KPI section | [EmployeesPage.tsx](resources/js/pages/users/EmployeesPage.tsx#L60), [SuppliersPage.tsx](resources/js/pages/suppliers/SuppliersPage.tsx#L51) | 8+ |
| `.filters` | Filters section | نفس الملفات | 5+ |
| `.g3` | Grid 3 columns | [SuppliersPage.tsx](resources/js/pages/suppliers/SuppliersPage.tsx#L77) | 4+ |
| `.fgrid` | Form grid | [EmployeesPage.tsx](resources/js/pages/users/EmployeesPage.tsx#L293), [SuppliersPage.tsx](resources/js/pages/suppliers/SuppliersPage.tsx#L224) | 10+ |
| `.fg` | Form group | نفس الملفات | 50+ |
| `.tabs` | Tabs container | [SuppliersPage.tsx](resources/js/pages/suppliers/SuppliersPage.tsx#L219) | 3+ |
| `.tab` | Tab item | نفس الملف | 6+ |

---

### 🔘 الأزرار والأيقونات (Buttons & Icons)

| Class | الاستخدام | الملفات | عدد المرات |
|-------|----------|--------|----------|
| `.btn` | Button base | معظم الملفات | 100+ |
| `.btn-p` | Primary button | نفس الملفات | 60+ |
| `.btn-r` | Danger/Red button | نفس الملفات | 20+ |
| `.btn-g` | Warning/Gold button | نفس الملفات | 8+ |
| `.btn-b` | Blue/Info button | نفس الملفات | 5+ |
| `.btn-xs` | Extra small button | معظم الملفات | 40+ |
| `.btn-sm` | Small button | معظم الملفات | 35+ |
| `.btn-w` | Full width button | [Button.tsx](resources/js/components/ui/Button.tsx) | 3+ |
| `.ic` | Icon container | معظم الملفات | 80+ |
| `.ic-xs` | Extra small icon | معظم الملفات | 40+ |
| `.ic-sm` | Small icon | معظم الملفات | 35+ |
| `.ti` | Tabler Icons base | معظم الملفات | 120+ |
| `.ti-*` | Specific icons | معظم الملفات | 200+ |

---

### 🎯 الحالات والمحتوى الفارغ (States & Empty)

| Class | الاستخدام | الملفات | عدد المرات |
|-------|----------|--------|----------|
| `.empty` | Empty state container | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L1992), [RolesPage.tsx](resources/js/pages/users/RolesPage.tsx#L292), [PaymentModal.tsx](resources/js/pos/components/PaymentModal.tsx) | 25+ |
| `.empty-ic` | Empty state icon | نفس الملفات | 15+ |
| `.empty-tx` | Empty state text | نفس الملفات | 15+ |
| `.al` | Alert base | [AlertBar.tsx](resources/js/components/ui/AlertBar.tsx) | 15+ |
| `.al-g` | Green alert | نفس الملف | 5+ |
| `.al-r` | Red alert | نفس الملف | 5+ |
| `.al-w` | Gold/Warning alert | نفس الملف | 3+ |
| `.al-b` | Blue alert | نفس الملف | 2+ |

---

### 🔍 البحث والتصفية (Search & Filtering)

| Class | الاستخدام | الملفات | عدد المرات |
|-------|----------|--------|----------|
| `.srch` | Search wrapper | [EmployeesPage.tsx](resources/js/pages/users/EmployeesPage.tsx#L69), [SuppliersPage.tsx](resources/js/pages/suppliers/SuppliersPage.tsx#L60) | 8+ |
| `.srch-ic` | Search icon | نفس الملفات | 8+ |
| `.u-row` | User row | [UsersPage.tsx](resources/js/pages/users/UsersPage.tsx#L2395) | 3+ |
| `.r-card` | Role card | نفس الملف | 5+ |

---

### 📋 الجداول والنماذج (Tables & Forms)

| Class | الاستخدام | الملفات | عدد المرات |
|-------|----------|--------|----------|
| `.tw` | Table wrapper | [EmployeesPage.tsx](resources/js/pages/users/EmployeesPage.tsx#L96) | 4+ |
| `.label` | Form label | [EmployeesPage.tsx](resources/js/pages/users/EmployeesPage.tsx#L295), [SuppliersPage.tsx](resources/js/pages/suppliers/SuppliersPage.tsx#L226) | 30+ |
| `.label.req` | Required label | نفس الملفات | 15+ |
| `.m-hd` | Modal header | [PaymentModal.tsx](resources/js/pos/components/PaymentModal.tsx#L117) | 4+ |
| `.m-title` | Modal title | نفس الملف | 5+ |
| `.m-sub` | Modal subtitle | نفس الملف | 3+ |
| `.m-x` | Modal close button | نفس الملف | 2+ |
| `.modal` | Modal base | نفس الملف | 5+ |
| `.modal-sm` | Small modal | نفس الملف | 3+ |
| `.breadcrumb__*` | Breadcrumb classes | [Breadcrumb.tsx](resources/js/components/ui/Breadcrumb.tsx#L29) | 15+ |

---

### 🧾 الفواتير والمتاجر (Receipt & POS)

| Class | الاستخدام | الملفات | عدد المرات |
|-------|----------|--------|----------|
| `.receipt-wrap` | Receipt wrapper | [Receipt.tsx](resources/js/pos/components/Receipt.tsx#L38) | 2+ |
| `.receipt-head` | Receipt header | نفس الملف | 2+ |
| `.receipt-logo` | Company logo | نفس الملف | 1+ |
| `.receipt-totals` | Totals section | نفس الملف | 2+ |
| `.receipt-row` | Total row | نفس الملف | 4+ |
| `.receipt-grand` | Grand total | نفس الملف | 1+ |
| `.receipt-foot` | Footer | نفس الملف | 1+ |
| `.pay-*` | Payment classes | [PaymentModal.tsx](resources/js/pos/components/PaymentModal.tsx#L133) | 50+ |
| `.pc2-*` | Product card classes | [ProductCard.tsx](resources/js/pos/components/ProductCard.tsx#L46) | 20+ |

---

## 3️⃣ الأنماط المتكررة الموصى بتوحيدها

### 📌 قائمة الأولويات

| الترتيب | الاسم | النمط الحالي | الفئة | التكرار | الأثر |
|-------|------|-----------|------|--------|------|
| 1 | Flex Center | `{ display: 'flex', alignItems: 'center', gap: N }` | Layout | 40+ | 🔴 عالي جداً |
| 2 | Gaps | `gap: 5,6,8,10,12` | Layout | 50+ | 🔴 عالي جداً |
| 3 | Padding Scale | `padding: 'XpxYpx'` | Spacing | 60+ | 🔴 عالي جداً |
| 4 | Animations | `animation: 'spin/slideIn'` | Effects | 50+ | 🟠 عالي |
| 5 | Transitions | `transition: '.14s'` | Effects | 25+ | 🟠 عالي |
| 6 | Font Sizes | `fontSize: 9-20` | Typography | 40+ | 🟠 عالي |
| 7 | Color Variables | `color: 'var(--*)'` | Colors | 80+ | 🟠 عالي |
| 8 | Border Patterns | `border/borderRadius` | Styling | 30+ | 🟡 متوسط |

---

## 4️⃣ ملخص الإجراءات المقترحة

### المرحلة الأولى (إنشاء Utilities)

```css
/* Layout Utilities */
.flex-center { display: flex; align-items: center; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex-col { display: flex; flex-direction: column; }

/* Gap Utilities */
.gap-1 { gap: 4px; }
.gap-1-5 { gap: 6px; }
.gap-2 { gap: 8px; }
.gap-2-5 { gap: 10px; }
.gap-3 { gap: 12px; }

/* Padding Utilities */
.px-1 { padding-left: 4px; padding-right: 4px; }
.px-1-5 { padding-left: 6px; padding-right: 6px; }
.py-1 { padding-top: 4px; padding-bottom: 4px; }
.py-1-5 { padding-top: 6px; padding-bottom: 6px; }
/* ... etc */

/* Animation Utilities */
.animate-spin { animation: spin 1s linear infinite; }
.animate-spin-fast { animation: spin 0.8s linear infinite; }
.animate-slide-in { animation: slideIn 0.2s ease; }
```

---

**تم إنشاؤه بواسطة**: GitHub Copilot  
**التاريخ**: 2026-06-02  
**الملخص**: جدول مرجعي شامل يتضمن 4 أقسام رئيسية تغطي جميع الأنماط المستخدمة
