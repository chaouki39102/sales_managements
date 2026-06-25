// ─────────────────────────────────────────────────────────────
//  ⚠️  ملاحظة بخصوص routes/index.tsx
//
//  لم يُرفَق هذا الملف، وبنيته الداخلية غير مؤكدة (لا أعرف إن كانت
//  Route[] array أو JSX <Routes> مباشر). من DashboardLayout.tsx
//  تأكدتُ أن كل الصفحات الداخلية مُعرَّفة كمسارات نسبية تحت
//  DashboardLayout (مثل: 'dashboard', 'pos', 'documents/FV').
//
//  أضف نفس النمط — مثال إن كانت بصيغة JSX:
// ─────────────────────────────────────────────────────────────

import NotificationsPage from '@/pages/notifications/NotificationsPage';

// داخل <Route element={<DashboardLayout />}> الموجودة أصلاً:
// <Route path="notifications" element={<NotificationsPage />} />

// ─────────────────────────────────────────────────────────────
//  إن كانت بصيغة array (مثل react-router createBrowserRouter):
// ─────────────────────────────────────────────────────────────
// {
//   path: 'notifications',
//   element: <NotificationsPage />,
// }

// ⚠️  أرسل لي محتوى routes/index.tsx الفعلي للتأكيد النهائي
//     من المكان والصيغة الصحيحة بدل هذا التخمين.
