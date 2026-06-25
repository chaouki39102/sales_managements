# دليل التوصيل — مركز التنبيهات الكامل

## ⚠️ ملفات افترضتُ وجودها ولم أتمكن من تأكيدها

هذه الملفات **استخدمتُها كما هي بدون تعديل**، استناداً لما ظهر في الكود المرفوع مسبقاً (imports وأمثلة استخدام)، لكنها لم تُرفَع بمحتواها الكامل. **تحقّق من توافق توقيعها قبل النشر:**

| الملف | كيف استنتجت شكله | الخطر إن اختلف |
|---|---|---|
| `lib/api/core/client.ts` | من `notifications.ts` الأصلي: `client.get<T>()`, `client.post<T>()` يُرجعون النتيجة مباشرة (لا `.data`) | إن كان يُرجع AxiosResponse، احذف `.data` إضافية أو أضفها بحسب الفعلي |
| `hooks/usePagination.ts` (`BackendMeta`) | من استخدامه في `Pagination.tsx`: `current_page, last_page, per_page, total, from, to, is_first_page, is_last_page` | لو الحقول مختلفة الأسماء، عدّل `meta` في `NotificationController::index()` |
| `hooks/useModal.ts` | من تعليق توضيحي داخل `ConfirmDeleteModal.tsx` | **لا تنسخ ملفي إن كان موجوداً مسبقاً** — استخدم نسختك |
| `routes/index.tsx` | غير مرفوع كلياً | راجع `ROUTE_NOTE.tsx` — لم أكتب route فعلي، فقط تعليمات |
| الموديل الكامل `Notification.php` مع `HasStandardizedConfiguration` | من `export_Notification.md` | لم أُعدّله، فقط اعتمدت على scopes الموجودة (`unread`, `read`) |

---

## الملفات المُسلَّمة

### Backend (معدّلة بالكامل — استبدل القديم)
| الملف | المسار |
|---|---|
| `NotificationService.php` | `app/Services/` |
| `NotificationController.php` | `app/Http/Controllers/Api/V1/` |
| `routes_notifications.php` | `routes/` |

> **لم يُعدَّل:** `NotificationPolicy.php`, `NotificationResource.php`, الموديل — تعمل كما هي مع الإضافات الجديدة.

### Frontend — جديد بالكامل
| الملف | المسار |
|---|---|
| `lib/constants/notification.constants.ts` | 🆕 مصدر موحّد للأيقونات/الألوان |
| `pages/notifications/NotificationsPage.tsx` | 🆕 الصفحة الكاملة |
| `notifications-page.css` | 🆕 **أضِفه لنهاية** `notifications.css` الموجود |

### Frontend — معدّلة (استبدل القديم)
| الملف | المسار | التعديل |
|---|---|---|
| `lib/api/endpoints/notifications.ts` | كما هو | + `getNotifications`, `deleteNotification`, `deleteMultipleNotifications` |
| `hooks/useNotificationsQuery.ts` | كما هو | + `useNotificationsQuery`, `useDeleteNotificationMutation`, `useDeleteMultipleNotificationsMutation` |
| `components/topbar/NotificationBell.tsx` | كما هو | يستورد الثوابت من `notification.constants.ts` بدل تكرارها + رابط `Link` بدل `<a>` |

### Frontend — احتياطي (فقط إن غير موجود)
| الملف | ملاحظة |
|---|---|
| `hooks/useModal.ts` | لا تنسخه إن كان لديك نسخة بنفس التوقيع `{open, openModal, closeModal}` |

---

## خطوات التنفيذ بالترتيب

### 1. Backend
```bash
cp NotificationService.php    app/Services/
cp NotificationController.php app/Http/Controllers/Api/V1/
cp routes_notifications.php   routes/
```
لا حاجة لأي migration جديدة — تستخدم الجدول الموجود.

### 2. Frontend
```bash
cp notifications.ts             lib/api/endpoints/
cp useNotificationsQuery.ts     hooks/
cp notification.constants.ts    lib/constants/
cp NotificationBell.tsx         components/topbar/   # استبدال
cp NotificationsPage.tsx        pages/notifications/
```

### 3. CSS
افتح `notifications.css` الموجود وألصق محتوى `notifications-page.css` في نهايته (أو `@import` ملف منفصل).

### 4. Route — **يتطلب تأكيدك**
أرسل محتوى `routes/index.tsx` لأكتب التعديل الدقيق، أو طبّق يدوياً:
```tsx
<Route path="notifications" element={<NotificationsPage />} />
```
ضمن نفس `<Route element={<DashboardLayout />}>` التي تحوي `dashboard`, `pos`, إلخ.

### 5. اختبار
- [ ] `GET /notifications?page=1&per_page=20` يُرجع `{ data, meta }`
- [ ] فلتر `type=success` و `is_read=true` يعملان
- [ ] `DELETE /notifications/{id}` يرفض حذف إشعار شركة أخرى (403)
- [ ] `POST /notifications/delete-multiple` بـ ids مختلطة (بعضها لشركة أخرى) يحذف فقط المملوكة
- [ ] الصفحة تعرض Skeleton ثم البيانات أو EmptyState
- [ ] التحديد الجماعي + شريط عائم يعملان فوق mobile bottom-nav بدون تعارض z-index
- [ ] RTL سليم بصرياً (الأزرار، الشريط العائم، الأيقونات)

---

## نقطة أمان مهمة تحتاج تأكيدك

في `NotificationPolicy.php` المرفوعة فعلياً، التحقق هو على مستوى **الصلاحية العامة فقط** (`$user->can('delete_notification')`) — وليس على ownership. هذا يعني:

- الـ **Service** هو خط الدفاع الوحيد لـ ownership (`assertOwnership`, `baseQuery`).
- إذا كانت الصلاحية `delete_notification` تُمنح لكل المستخدمين تلقائياً (غالباً الحال لإشعاراتهم الخاصة)، فالنظام سليم.
- لكن إن كانت `update_notification`/`delete_notification` تُمنح فقط لبعض الأدوار (مثل admin)، فمستخدم عادي بلا هذه الصلاحية **لن يستطيع تعليم إشعاراته الخاصة كمقروءة** — تحقق من تعريف هذه الصلاحيات في seeder الصلاحيات لديك.
