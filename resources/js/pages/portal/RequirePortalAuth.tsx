// ════════════════════════════════════════════════════════════════════════════
// pages/portal/RequirePortalAuth.tsx — حارس بوابة الزبائن
// يعيد التوجيه إلى /portal/login إذا لم يكن هناك رمز portal_token
// ════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';
import { portalTokenStorage } from '@/lib/api/portal/client';
import { usePortalStore } from '@/lib/store/portalStore';
import { PortalLoading } from './portalUtils';

export default function RequirePortalAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const portalUser = usePortalStore((s) => s.portalUser);
  const [checked, setChecked] = useState(false);
  const [valid, setValid] = useState(true);

  const hasToken = !!portalTokenStorage.get();

  useQuery({
    queryKey: ['portal', 'me'],
    queryFn: async () => {
      try {
        const me = await portalApi.me();
        usePortalStore.getState().setPortalUser(me);
        setValid(true);
      } catch {
        portalTokenStorage.clear();
        usePortalStore.getState().clearSession();
        setValid(false);
      } finally {
        setChecked(true);
      }
      return null;
    },
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
  });

  if (!hasToken) return <Navigate to="/portal/login" replace state={{ from: location }} />;

  // إذا كان المستخدم معرّفاً أصلاً فلا داعي لانتظار الفحص
  if (portalUser) return <>{children}</>;

  if (!checked) return <PortalLoading text="جاري التحقق من الجلسة..." />;
  if (!valid) return <Navigate to="/portal/login" replace state={{ from: location }} />;

  return <>{children}</>;
}
