# 📘 دليل استخدام Utility Classes الجديد
## تنظيم الواجهات وإزالة Inline Styles

---

## 🎯 الهدف

تحويل جميع `inline styles` إلى `CSS classes` منظمة وقابلة للصيانة.

---

## 📁 ملفات CSS الرئيسية

### 1. `resources/css/theme/tokens.css` ✅
- جميع المتغيرات الأساسية (colors, spacing, shadows)
- يجب أن يكون **أول ملف CSS** يُستورد

### 2. `resources/css/theme/modern-utilities.css` ✅ (جديد)
- **آلاف** الـ utility classes الجاهزة للاستخدام
- يحتوي على:
  - Flexbox utilities
  - Spacing (padding/margin)
  - Typography
  - Colors & Backgrounds
  - Animations
  - Components helpers

### 3. `resources/css/theme/components.css` ✅
- Card, Badge, Table, Modal styles
- KPI Cards و Grid layouts

### 4. `resources/css/app.css` ✅
- يستورد جميع الملفات بالترتيب الصحيح

---

## 🔄 كيفية التحويل

### ❌ القديم — Inline Styles

```tsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '16px 20px',
  borderRadius: 10,
  background: 'var(--bg3)',
  border: '1px solid var(--b2)',
  cursor: 'pointer',
  transition: '.15s'
}}>
  Content
</div>
```

### ✅ الجديد — Utility Classes

```tsx
<div className="flex items-center gap-12 p-16 px-20 rounded-md border bg-3 cursor-pointer transition">
  Content
</div>
```

---

## 🎨 أمثلة Utility Classes

### Flexbox

```tsx
// Display & Direction
<div className="flex">              {/* display: flex */}
<div className="flex-col">          {/* flex-direction: column */}
<div className="flex-row">          {/* flex-direction: row */}
<div className="inline-flex">       {/* display: inline-flex */}

// Alignment
<div className="items-center">      {/* align-items: center */}
<div className="items-start">       {/* align-items: flex-start */}
<div className="justify-between">   {/* justify-content: space-between */}
<div className="justify-center">    {/* justify-content: center */}

// Gap
<div className="gap-8">             {/* gap: 8px */}
<div className="gap-12">            {/* gap: 12px */}
<div className="gap-16">            {/* gap: 16px */}
```

### Spacing

```tsx
// Padding
<div className="p-16">              {/* padding: 16px */}
<div className="px-12 py-20">       {/* padding-x: 12px, padding-y: 20px */}
<div className="pt-16 pb-20">       {/* padding-top/bottom */}

// Margin
<div className="m-8">               {/* margin: 8px */}
<div className="mx-auto">           {/* margin-left/right: auto (center) */}
<div className="mt-12 mb-16">       {/* margin-top/bottom */}
```

### Typography

```tsx
// Font sizes
<div className="text-xs">          {/* 10px */}
<div className="text-sm">          {/* 11px */}
<div className="text-base">        {/* 13px */}
<div className="text-xl">          {/* 15px */}
<div className="text-3xl">         {/* 23px */}
<div className="text-5xl">         {/* 36px */}

// Font weights
<div className="font-normal">       {/* 400 */}
<div className="font-semibold">    {/* 600 */}
<div className="font-bold">        {/* 700 */}
<div className="font-extrabold">   {/* 800 */}
<div className="font-black">       {/* 900 */}
```

### Colors & Backgrounds

```tsx
// Text colors
<div className="text-t1">          {/* Primary text */}
<div className="text-t3">          {/* Secondary text */}
<div className="text-t4">          {/* Tertiary text */}
<div className="text-em">          {/* Emerald/Primary */}
<div className="text-red">         {/* Error/Red */}
<div className="text-gold">        {/* Warning/Gold */}

// Background colors
<div className="bg-2">             {/* bg: var(--bg2) - white */}
<div className="bg-3">             {/* bg: var(--bg3) - light gray */}
<div className="bg-em">            {/* bg: var(--em) - emerald */}
<div className="bg-emb">           {/* bg: var(--emb) - emerald background */}
<div className="bg-redb">          {/* bg: var(--redb) - red background */}

// Gradients
<div className="grad-em">          {/* Emerald gradient */}
<div className="grad-em-faint">    {/* Faint emerald gradient */}
```

### Border & Radius

```tsx
// Border
<div className="border">            {/* 1px border */}
<div className="border-b3">        {/* border-bottom: 1px solid var(--b3) */}
<div className="border-em">        {/* border-color: var(--em) */}

// Border radius
<div className="rounded-md">       {/* border-radius: var(--r2) */}
<div className="rounded-lg">       {/* border-radius: var(--r3) */}
<div className="rounded-xl">       {/* border-radius: var(--r4) */}
<div className="rounded-full">     {/* border-radius: 9999px */}
<div className="rounded-50">       {/* border-radius: 50% */}
```

### Animations & Transitions

```tsx
// Animations
<i className="animate-spin">        {/* animation: spin 1s linear infinite */}
<i className="animate-spin-slow">  {/* animation: spin 0.8s linear infinite */}
<div className="animate-fadeInUp">  {/* animation: fadeInUp */}
<div className="animate-slideInRight"> {/* animation: slideInRight */}

// Transitions
<div className="transition">        {/* transition: all 0.15s */}
<div className="transition-fast">   {/* transition: all 0.1s */}
<div className="transition-slow">   {/* transition: all 0.3s */}
<div className="transition-colors"> {/* transition: colors 0.15s */}
```

### Sizing

```tsx
// Width/Height
<div className="w-full">           {/* width: 100% */}
<div className="w-30">             {/* width: 30px */}
<div className="w-36">             {/* width: 36px */}
<div className="h-30">             {/* height: 30px */}
<div className="h-36">             {/* height: 36px */}

// Min height
<div className="min-h-92vh">       {/* min-height: 92vh */}
```

### Position & Display

```tsx
// Position
<div className="absolute">         {/* position: absolute */}
<div className="relative">         {/* position: relative */}
<div className="fixed">            {/* position: fixed */}
<div className="inset-0">          {/* top/right/bottom/left: 0 */}

// Display
<div className="block">            {/* display: block */}
<div className="hidden">           {/* display: none */}
<div className="flex">             {/* display: flex */}
<div className="grid">             {/* display: grid */}
```

### Cursor & User Select

```tsx
// Cursor
<div className="cursor-pointer">   {/* cursor: pointer */}
<div className="cursor-not-allowed"> {/* cursor: not-allowed */}

// User Select
<div className="select-none">      {/* user-select: none */}
<div className="select-text">      {/* user-select: text */}
```

---

## 🔧 مثال عملي متكامل

### قبل — مع Inline Styles

```tsx
function UserCard({ user }) {
  return (
    <div style={{
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      padding: '16px',
      borderRadius: 14,
      background: user.active ? 'var(--emb)' : 'var(--redb)',
      border: `1px solid ${user.active ? 'var(--embo)' : 'var(--redbo)'}`,
    }}>
      <Avatar name={user.name} size={48} />
      
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 17,
          fontWeight: 800,
          color: 'var(--t1)',
          marginBottom: 3,
        }}>
          {user.name}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--t4)',
          fontFamily: 'monospace',
        }}>
          {user.email}
        </div>
      </div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        color: user.active ? 'var(--em)' : 'var(--red)',
        background: user.active ? 'var(--emb)' : 'var(--redb)',
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: user.active ? 'var(--em)' : 'var(--red)',
          display: 'inline-block',
        }} />
        {user.active ? 'نشط' : 'موقوف'}
      </div>
    </div>
  );
}
```

### بعد — مع Utility Classes

```tsx
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

function UserCard({ user }) {
  return (
    <div className={`flex gap-16 items-center p-16 rounded-lg border ${
      user.active ? 'bg-emb border-embo' : 'bg-redb border-redbo'
    }`}>
      <Avatar name={user.name} size="lg" />
      
      <div className="flex-1">
        <div className="text-2xl font-extrabold text-t1 mb-3">
          {user.name}
        </div>
        <div className="text-sm text-t4" style={{ fontFamily: 'monospace' }}>
          {user.email}
        </div>
      </div>

      <Badge variant={user.active ? 'success' : 'danger'}>
        <span className="badge-status" />
        {user.active ? 'نشط' : 'موقوف'}
      </Badge>
    </div>
  );
}
```

---

## 📋 استبدال سريع — جدول مرجعي

| الكود القديم | الفئة الجديدة |
|:---|:---|
| `style={{ display: 'flex' }}` | `className="flex"` |
| `style={{ alignItems: 'center' }}` | `className="items-center"` |
| `style={{ justifyContent: 'center' }}` | `className="justify-center"` |
| `style={{ gap: 12 }}` | `className="gap-12"` |
| `style={{ padding: '16px' }}` | `className="p-16"` |
| `style={{ borderRadius: 10 }}` | `className="rounded-md"` |
| `style={{ background: 'var(--bg3)' }}` | `className="bg-3"` |
| `style={{ color: 'var(--t1)' }}` | `className="text-t1"` |
| `style={{ fontSize: 13 }}` | `className="text-base"` |
| `style={{ fontWeight: 700 }}` | `className="font-bold"` |
| `style={{ animation: 'spin 1s linear infinite' }}` | `className="animate-spin"` |
| `style={{ cursor: 'pointer' }}` | `className="cursor-pointer"` |

---

## ✨ المميزات

✅ **نظيف**: لا inline styles  
✅ **سهل الصيانة**: معايير موحدة  
✅ **سريع البناء**: كتابة أقل  
✅ **متسق**: نفس الأسلوب في كل المشروع  
✅ **responsive**: responsive utilities جاهزة  
✅ **dark mode**: جاهز مع CSS variables  

---

## 🚀 الخطوات العملية

### 1. استيراد الملفات الجديدة ✅
```css
/* resources/css/app.css */
@import 'theme/tokens.css';        /* أولاً */
@import 'theme/modern-utilities.css'; /* ثانياً */
```

### 2. استخدام الفئات في المكونات
```tsx
// قبل: style={{ display: 'flex', gap: 12 }}
// بعد:
<div className="flex gap-12">
```

### 3. دمج الفئات المشروطة
```tsx
<div className={`flex gap-16 ${condition ? 'bg-em' : 'bg-gray'}`}>
```

---

## 📚 المراجع

- `resources/css/theme/modern-utilities.css` — كل الفئات المتوفرة
- `resources/css/theme/tokens.css` — كل المتغيرات المتاحة
- `resources/css/theme/components.css` — مكونات محددة مسبقاً

---

## ❓ أسئلة شائعة

**س: كيف أستخدم متغير CSS مع الفئات؟**
```tsx
<div style={{ color: 'var(--em)' }}>  {/* القديم */}
<div className="text-em">             {/* الجديد */}
```

**س: هل يمكن دمج عدة فئات؟**
```tsx
<div className="flex gap-12 items-center p-16 rounded-md">
```

**س: كيف أتعامل مع الفئات المشروطة؟**
```tsx
<div className={`flex gap-12 ${isActive ? 'bg-em' : 'bg-3'}`}>
```

**س: ماذا لو احتجت inline style استثنائي؟**
```tsx
{/* محاولة الفئة أولاً, ثم inline style */}
<div style={{ customProp: value }}>
```

---

**آخر تحديث**: يونيو 2026
