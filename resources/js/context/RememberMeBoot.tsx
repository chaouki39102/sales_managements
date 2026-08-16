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
//   - توجد شركة نشطة مسبقاً → تحقق خلفي دائم (لا يحجب الرسم).
//   - لا توجد شركة نشطة + توجد لقطة سليمة → استعادة + فتح مباشر + تحقق خلفي.
//   - لا توجد لقطة أو ناقصة → نحتفظ بالسلوك العادي (شاشة اختيار الشركة).
//   - خطأ شبكة (offline) → لا نتحرك (المستخدم يبقى داخل الشركة المستعادة).
//
// التحقق الخلفي (تحقق من الشركة الفعّالة):
//   POST /companies/switch يحل بالـ company_id الثابت (لا يتأثر بالـ slug).
//   إذا غيّرت إعادة البذر slug الشركة يعيد السيرفر الشركة بالـ slug الحالي →
//   نعيد مزامنة slug الشركة (appStore + اللقطة) بدل إبقاء slug قديم ينتج
//   404 على كل طلبات الإيجار. فشل 4xx (شركة محذوفة/معلقة/لا عضوية) → reset.
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useAuth }            from '@/context/AuthContext';
import { useActiveCompany, appActions } from '@/lib/store/appStore';
import { getRememberPref, getSavedSession, setSavedSession } from '@/lib/store/rememberMe';
import { apiPost }            from '@/lib/api/core/client';

export function RememberMeBoot({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  const activeCompany = useActiveCompany();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    if (isLoading) return; // انتظار تحميل المستخدم

    // حالات لا نستعيد فيها شيئاً ولا نتحقق
    if (!isAuthenticated || !user || isSuperAdmin) {
      setHydrated(true);
      return;
    }

    // الشركة الفعّالة: إمّا موجودة مسبقاً في الـ store (sessionStorage)،
    // أو تُستعاد من اللقطة المحفوظة إن وُجدت (استعادة فورية محلية).
    let effectiveCompany = activeCompany?.slug ? activeCompany : null;

    if (!effectiveCompany) {
      const saved = getRememberPref(user.id) ? getSavedSession(user.id) : null;
      if (saved?.company?.slug && saved.yearId) {
        appActions.setActiveCompany(saved.company);
        appActions.setSelectedYearId(saved.yearId);
        effectiveCompany = saved.company;
      }
    }

    // تحقق خلفي دائم (لا يحجب الرسم): /companies/switch يحل بالـ company_id
    // الثابت، فإذا غيّرت إعادة البذر slug الشركة يعيد السيرفر الحقيقة →
    // نعيد مزامنة slug الشركة (appStore + اللقطة) بدل إبقاء slug قديم
    // ينتج 404 على كل طلبات الإيجار. لو أُلغيت العضوية → 4xx → إعادة تعيين.
    if (effectiveCompany) {
      const { slug: storedSlug, id: companyId } = effectiveCompany;
      const yearId = appActions.getSelectedYearId();
      apiPost<any>('/companies/switch', { company_id: companyId })
        .then((fresh) => {
          if (fresh?.slug && fresh.slug !== storedSlug) {
            appActions.setActiveCompany(fresh);
            if (getRememberPref(user.id) && yearId != null) {
              setSavedSession(user.id, { company: fresh, yearId });
            }
          }
        })
        .catch((e: any) => {
          const status = e?.response?.status;
          if (status && status >= 400 && status < 500) {
            // الشركة لم تعد صالحة → نعود لشاشة اختيار الشركة
            appActions.reset();
          }
        });
    }

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
