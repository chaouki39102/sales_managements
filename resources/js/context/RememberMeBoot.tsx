// ════════════════════════════════════════════════════════════════════════════
// context/RememberMeBoot.tsx
//
// "تذكر اختياري" — استعادة الشركة + السنة المالية من localStorage قبل رسم
// الـ routes، حتى يعمل أي رابط عميق مباشرةً:
//
// المشكلة التي يُحلها:
//   appStore يحفظ activeCompany/slug في sessionStorage، و sessionStorage خاص
//   بكل تبويب — عند فتح رابط في تبويب جديد (أو لصق URL) يكون sessionStorage
//   فارغاً → RequireCompany يحوّل إلى /onboarding → rememberMe كان يوجّه إلى
//   /dashboard. النتيجة: أي رابط في التبويب الجديد يفتح اللوحة بدل الصفحة.
//
// الحل:
//   هذا المكوّن يسبق رسم الـ routes. عندما يكتمل تحميل المستخدم ولا توجد
//   شركة نشطة، يستعيد لقطة { شركة + سنة } المحفوظة من localStorage فوراً
//   (بدون انتظار شبكة) ثم يركّب الـ routes. بذلك يُركّب RequireCompany
//   ويرى الشركة النشطة → يُعرض الرابط العميق المطلوب مباشرة.
//
//   - توجد لقطة سليمة → استعادة + فتح مباشر + مزامنة في الخلفية
//     (POST /companies/switch). فشل 4xx (شركة محذوفة/معلقة/لا عضوية) → reset.
//   - لا توجد لقطة أو ناقصة → نحتفظ بالسلوك العادي (شاشة اختيار الشركة).
//   - خطأ شبكة (offline) → لا نتحرك (المستخدم يبقى داخل الشركة المستعادة).
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useAuth }            from '@/context/AuthContext';
import { useActiveCompany, appActions } from '@/lib/store/appStore';
import { getRememberPref, getSavedSession } from '@/lib/store/rememberMe';
import { apiPost }            from '@/lib/api/core/client';

export function RememberMeBoot({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  const activeCompany = useActiveCompany();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    if (isLoading) return; // انتظار تحميل المستخدم

    // حالات لا نستعيد فيها شيئاً
    if (!isAuthenticated || !user || isSuperAdmin || activeCompany?.slug) {
      setHydrated(true);
      return;
    }

    // لا لقطة محفوظة (أو ناقصة) → شاشة اختيار الشركة العادية
    const saved = getRememberPref(user.id) ? getSavedSession(user.id) : null;
    if (!saved?.company?.slug || !saved.yearId) {
      setHydrated(true);
      return;
    }

    // استعادة فورية محلية → فتح مباشر للصفحة المطلوبة (بدون شبكة)
    appActions.setActiveCompany(saved.company);
    appActions.setSelectedYearId(saved.yearId);

    // مزامنة/تحقق في الخلفية مع الباكند (لا تحجب الرسم)
    apiPost('/companies/switch', { company_id: saved.company.id })
      .catch((e: any) => {
        const status = e?.response?.status;
        if (status && status >= 400 && status < 500) {
          // الشركة لم تعد صالحة → نعود لشاشة اختيار الشركة
          appActions.reset();
        }
      });

    setHydrated(true);
  }, [hydrated, isLoading, isAuthenticated, user, isSuperAdmin, activeCompany?.slug]);

  if (!hydrated) {
    return (
      <div className="page-loader">
        <span className="ic ic-xl text-em">
          <i className="ti ti-loader animate-spin" />
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
