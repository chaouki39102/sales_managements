# دليل تنفيذ وحدة الإشعارات

## الملفات المُسلَّمة

```
notifications/
│
├── Backend (Laravel)
│   ├── NotificationService.php     → app/Services/
│   ├── NotificationController.php  → app/Http/Controllers/Api/V1/
│   ├── NotificationResource.php    → app/Http/Resources/
│   └── routes_notifications.php    → routes/
│
└── Frontend (React/TS)
    ├── store/
    │   └── notificationStore.ts    → resources/js/lib/store/
    ├── api/
    │   └── notifications.ts        → resources/js/lib/api/endpoints/
    ├── hooks/
    │   ├── useNotification.ts      → resources/js/hooks/
    │   ├── useNotificationsQuery.ts→ resources/js/hooks/
    │   └── useOnClickOutside.ts    → resources/js/hooks/  (إذا لم يوجد)
    └── components/
        ├── NotificationToast.tsx   → resources/js/components/notifications/
        ├── NotificationContainer.tsx
        ├── NotificationBell.tsx    → resources/js/components/topbar/
        └── notifications.css       → resources/css/theme/  (أو import في app.css)
```

---

## خطوات التنفيذ

### 1. Backend

#### 1.1 نسخ الملفات
```bash
cp NotificationService.php   app/Services/
cp NotificationController.php app/Http/Controllers/Api/V1/
cp NotificationResource.php  app/Http/Resources/
```

#### 1.2 إضافة Routes في `routes/api.php`
```php
Route::middleware(['auth:sanctum', 'set.company'])->group(function () {
    require __DIR__ . '/notifications.php';
    // ...
});
```

#### 1.3 تسجيل Policy في `AppServiceProvider.php`
```php
// في boot()
Gate::policy(\App\Models\Notification::class, \App\Policies\NotificationPolicy::class);
```

#### 1.4 إضافة علاقة في User model
```php
// app/Models/User.php
public function notifications()
{
    return $this->morphMany(\App\Models\Notification::class, 'notifiable');
}
```

---

### 2. Frontend

#### 2.1 نسخ الملفات
```
lib/store/notificationStore.ts
lib/api/endpoints/notifications.ts
hooks/useNotification.ts
hooks/useNotificationsQuery.ts
hooks/useOnClickOutside.ts
components/notifications/NotificationToast.tsx
components/notifications/NotificationContainer.tsx
components/topbar/NotificationBell.tsx
```

#### 2.2 استيراد CSS
في `resources/css/app.css` أضف:
```css
@import './theme/notifications.css';
```

#### 2.3 إضافة `<NotificationContainer />` في `App.tsx`
```tsx
import NotificationContainer from '@/components/notifications/NotificationContainer';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <FiscalYearProvider>
            <AppRoutes />
          </FiscalYearProvider>
        </AuthProvider>
      </BrowserRouter>
      <NotificationContainer />   {/* ← هنا */}
    </QueryClientProvider>
  );
}
```

#### 2.4 إضافة `<NotificationBell />` في `Topbar.tsx`
```tsx
import NotificationBell from '@/components/topbar/NotificationBell';

// داخل JSX الـ Topbar
<NotificationBell />
```

---

## الاستخدام

### تنبيه فوري (Client-side)
```tsx
const notify = useNotification();

notify.success('تم الحفظ', 'تم حفظ البيانات بنجاح');
notify.error('خطأ', 'فشل الاتصال بالخادم');
notify.warning('تحذير', 'المخزون منخفض');
notify.info('معلومة', 'يتوفر تحديث جديد');

// مع زر إجراء
notify.success('تم الحفظ', 'تم إنشاء الفاتورة', {
  action: {
    label: 'عرض الفاتورة',
    onClick: () => navigate('/documents/123'),
  },
});

// تنبيه دائم لا يختفي تلقائياً
notify.error('خطأ حرج', 'انتهت صلاحية الجلسة', { persistent: true });
```

### إرسال من Laravel (Backend)
```php
// في أي Controller
public function store(Request $request)
{
    // ... منطق العمل

    $this->notificationService->success('تم الحفظ', 'تم إنشاء المنتج بنجاح');
    // أو
    $this->notificationService->sendToUser($user, 'info', 'تنبيه جديد', 'تم تعيينك في مهمة');
}
```

---

## ملاحظات مهمة

1. **`useOnClickOutside`** — إذا كان موجوداً في المشروع بالفعل، لا تنسخه.
2. **CSS** — الملف يعتمد على `tokens.css` الذي هو موجود بالفعل؛ تأكد من ترتيب الاستيراد.
3. **الـ `data` field** — نموذج Notification يخزّن type/title/message داخل حقل `data` (JSON). الـ Resource يفككها تلقائياً.
4. **RTL** — الـ CSS يدعم RTL/LTR تلقائياً عبر `inset-inline-*`.


أريد بناء صفحة "مركز التنبيهات" الكاملة (/notifications) لمشروع بيزنس بلاس — Laravel + React/TypeScript، multi-tenant.

## ما هو موجود حالياً (لا تُعد بناءه — اعتمد عليه واقرأه أولاً)

### Backend
- NotificationService.php (app/Services/) — فيه: getUnread(), markAsRead(), markAllAsRead(), sendToUser(), success()/error()/warning()/info() — مُصفَّى بـ company_id + notifiable_id بالفعل.
- NotificationController.php (app/Http/Controllers/Api/V1/) — endpoints: GET /notifications/unread, POST /notifications/{id}/read, POST /notifications/read-all.
- NotificationPolicy.php — تتحقق من company_id + notifiable_id.
- NotificationResource.php — يحوّل النموذج لـ: id, type, title, message, action_url, icon, is_read, created_at, created_at_human.
- نموذج Notification يخزّن type/title/message داخل حقل data (JSON)، ويستخدم notifiable polymorphic + company_id.

### Frontend
- notificationStore.ts (Zustand) — toasts المحلية فقط (success/error/warning/info فورية).
- useNotification.ts — hook لإرسال toasts فورية.
- useNotificationsQuery.ts — يحتوي حالياً: useUnreadNotificationsQuery (staleTime 30s)، useMarkAsReadMutation، useMarkAllAsReadMutation. مبني على notificationKeys = { all, unread }.
- lib/api/endpoints/notifications.ts — getUnreadNotifications(), markNotificationAsRead(id), markAllNotificationsAsRead(). لا يوجد حالياً أي endpoint لجلب القائمة الكاملة (paginated) أو للحذف.
- NotificationToast.tsx / NotificationContainer.tsx / NotificationBell.tsx — جاهزة وتعمل في الـ Topbar.
- notifications.css — يستخدم نمط BEM بالـ prefix ntf-* (ntf-toast, ntf-bell, ...). أي كلاس جديد يجب أن يلتزم بهذا النمط: ntf-page-*.

### مكتبة UI الموحدة (استخدمها حرفياً، لا بدائل)
من @/components/ui:
- Card, Badge, Button, EmptyState, Skeleton, Pagination, ConfirmDeleteModal, Tooltip, Dropdown
من @/components/ui/DataTable (إن كان العرض كجدول مناسب): DataTable, FilterPopup, MultiSelect

### نظام التصميم
- tokens.css فقط: --em, --red, --gold, --blue, --bg1..5, --t1..4, --b1..4, --r1..5, --shadow, --shadow2, --shadow3. ممنوع أي hex/px خارج هذا.
- RTL عربي كامل، خط Tajawal، اختبار بصري بـ RTL.
- متجاوب: يوجد mobile bottom-nav (#mob-nav) — الصفحة يجب أن تعمل تحته بدون تعارض z-index.

## ما يجب إنجازه من الصفر (بالتفصيل الدقيق)

### 1) Backend — توسعة مطلوبة قبل البدء بالواجهة
- **إضافة endpoint**: `GET /notifications` (paginated) في NotificationController — يدعم: page, per_page, type (filter), is_read (filter). يُبنى داخل NotificationService كدالة `getPaginated(array $filters)` بنفس منطق تصفية company_id + notifiable_id المستخدم في getUnread().
- **إضافة endpoint**: `DELETE /notifications/{id}` — مع فحص Policy->delete (موجودة الدالة في Policy، تحتاج تفعيل في الكنترولر فقط).
- **إضافة endpoint**: `POST /notifications/delete-multiple` — body: { ids: string[] } — يتحقق من ملكية company_id لكل id قبل الحذف الجماعي (لا تحذف بدون فحص ownership لكل عنصر فردياً).
- **تحديث routes_notifications.php** بالـ routes الجديدة.

### 2) Frontend API layer — توسعة
- في `lib/api/endpoints/notifications.ts` أضف: `getNotifications(params)`, `deleteNotification(id)`, `deleteMultipleNotifications(ids)`. اتبع نفس توقيع الدوال الموجودة (async + client.get/post/delete من @/lib/api/core/client).

### 3) Frontend React Query — توسعة
- في `useNotificationsQuery.ts` أضف: `useNotificationsQuery(filters)` (query)، `useDeleteNotificationMutation()`, `useDeleteMultipleNotificationsMutation()`. حدّث `notificationKeys` ليشمل `list(filters)`. كل mutation تستدعي invalidateQueries على notificationKeys.all بعد النجاح — اتبع نفس نمط onSuccess الموجود في useMarkAsReadMutation حرفياً.

### 4) الصفحة نفسها — pages/notifications/NotificationsPage.tsx
ابنِ صفحة كاملة بالعناصر التالية، كل عنصر يستخدم مكوّن UI موجود ما لم يُذكر خلاف ذلك:

- **رأس الصفحة**: عنوان "مركز التنبيهات" + Badge بعدد غير المقروء (Badge من @/components/ui) + Button "تحديد الكل كمقروء" (يُعطّل إن unread_count=0).
- **شريط فلاتر**: مجموعة أزرار Toggle (Button variant) لـ: الكل/غير مقروء/مقروء، ومجموعة أخرى لـ النوع (الكل/success/error/warning/info) — state محلي بـ useState، يُمرَّر كـ filters لـ useNotificationsQuery.
- **منطقة القائمة**:
  - Loading → استخدم Skeleton (عدة بطاقات placeholder).
  - Empty → EmptyState بنص "لا توجد إشعارات" وأيقونة جرس.
  - Data → بطاقات Card واحدة لكل إشعار، تحتوي: checkbox تحديد (state محلي Set<string>)، أيقونة بحسب النوع (نفس خريطة الألوان الموجودة في NotificationToast/Bell: TYPE_ICON/TYPE_COLOR — أعد استخدامها كملف مشترك بدلاً من تكرارها)، العنوان والرسالة، created_at_human، رابط action_url إن وُجد (Button صغير "عرض").
- **شريط إجراءات عائم**: يظهر فقط عند تحديد ≥1 بطاقة، ثابت أسفل الشاشة فوق mobile bottom-nav، يحتوي: عدد المحدد + Button "تحديد كمقروء" + Button خطر "حذف" (يفتح ConfirmDeleteModal الموجود).
- **Pagination**: استخدم مكوّن Pagination الموجود — اسألني فقط إن كان الباك إند سيُرجع cursor-based أو offset-based قبل ربطه.

### 5) CSS
أضف فقط ما لا يغطيه @/components/ui — كلاسات بالـ prefix `ntf-page-*` في notifications.css (مثل ntf-page-header, ntf-page-filters, ntf-page-floating-bar) — لا تكرر أنماط البطاقة/الزر الموجودة فعلياً في Card.tsx/Button.tsx.

### 6) Route
أضف `/notifications` في ملف routes (resources/js/routes/index.tsx) ضمن نفس بنية الـ Route الموجودة لباقي الصفحات.

## قيود غير قابلة للتفاوض
- لا تخترع اسم endpoint أو حقل لم يُذكر أعلاه — إن احتجت شيئاً غير موجود، اسأل قبل الكتابة.
- كل فحص ownership (حذف/تحديث) يتم في Service + Policy في الباك إند، الفرونت إند لا يُعتمد عليه أمنياً أبداً.
- لا تُعد إنشاء أيقونات الأنواع/الألوان من جديد — استخرجها لملف مشترك (مثلاً notification.constants.ts) يُستورد في NotificationToast وNotificationBell والصفحة الجديدة معاً، حتى لا تتكرر.

## المخرجات
1. أولاً: قائمة بالملفات Backend/Frontend الموجودة التي ستقرأها (اطلب رفعها إن لم تكن متوفرة في المحادثة).
2. ثانياً: التعديلات على الملفات الموجودة (diff واضح: ماذا أضيف وأين).
3. ثالثاً: الملفات الجديدة كاملة.
4. أخيراً: checklist تنفيذ (نسخ → routes → اختبار).
