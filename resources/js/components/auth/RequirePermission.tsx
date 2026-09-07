import React from 'react';
import { usePermissions } from '@/lib/permissions';
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage';

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
}

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { can, isReady } = usePermissions();

  if (!isReady) return null;

  if (!can(permission)) return <ForbiddenPage />;

  return <>{children}</>;
}