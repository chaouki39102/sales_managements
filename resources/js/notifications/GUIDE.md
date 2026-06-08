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
