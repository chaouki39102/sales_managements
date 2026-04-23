// ════════════════════════════════════════════════
// context/useSetupWizard.ts
// منطق الـ first-run wizard
// ════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api/client';

const SETUP_KEY = 'setup_completed';

export function useSetupRequired() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    if (localStorage.getItem(SETUP_KEY) === 'true') {
      setNeedsSetup(false);
      return;
    }

    Promise.allSettled([
      apiClient.get('/settings/key/company.name/value'),
      apiClient.get('/fiscal-years/current'),
    ]).then(([companyRes, fiscalRes]) => {
      // fulfilled + data موجود = تم الإعداد
      const hasCompany =
        companyRes.status === 'fulfilled' &&
        !!(companyRes.value?.data?.data?.value);

      const hasFiscalYear =
        fiscalRes.status === 'fulfilled' &&
        !!(fiscalRes.value?.data?.data);

      const done = hasCompany && hasFiscalYear;
      if (done) localStorage.setItem(SETUP_KEY, 'true');
      setNeedsSetup(!done);
    });
  }, []);

  const markComplete = () => {
    localStorage.setItem(SETUP_KEY, 'true');
    setNeedsSetup(false);
  };

  return { needsSetup, markComplete };
}
