// ════════════════════════════════════════════════
// resources/js/context/useSetupWizard.ts
// الإصدار المُصلح: يعمل فقط بعد التوثيق
// ════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api/client';
import { getAuthToken } from '@/lib/api/client';

const SETUP_KEY = 'setup_completed';

export function useSetupRequired() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    // ❌ لا تفحص Setup قبل وجود token
    const token = getAuthToken();
    if (!token) {
      setNeedsSetup(false); // لا redirect للـ settings إذا لم يكن مسجل دخول
      return;
    }

    // ✅ إذا كان الـ setup مكتمل سابقاً
    if (localStorage.getItem(SETUP_KEY) === 'true') {
      setNeedsSetup(false);
      return;
    }

    // ✅ تحقق من الـ API بعد التوثيق
    Promise.allSettled([
      apiClient.get('/settings/key/company.name/value'),
      apiClient.get('/fiscal-years/current'),
    ]).then(([companyRes, fiscalRes]) => {
      const hasCompany =
        companyRes.status === 'fulfilled' &&
        !!companyRes.value?.data?.data?.value;

      const hasFiscalYear =
        fiscalRes.status === 'fulfilled' &&
        !!fiscalRes.value?.data?.data;

      const done = hasCompany && hasFiscalYear;

      if (done) localStorage.setItem(SETUP_KEY, 'true');

      setNeedsSetup(!done);
    }).catch(() => {
      // في حالة خطأ غير متوقع، لا نوجّه للـ setup
      setNeedsSetup(false);
    });
  }, []); // يعمل مرة واحدة عند التحميل

  const markComplete = () => {
    localStorage.setItem(SETUP_KEY, 'true');
    setNeedsSetup(false);
  };

  return { needsSetup, markComplete };
}
