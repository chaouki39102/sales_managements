// ════════════════════════════════════════════════════════════
// resources/js/pages/users/RolesPage.tsx
// عرض الأدوار والصلاحيات المرتبطة بها
// ════════════════════════════════════════════════════════════
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import AlertBar from '@/components/ui/AlertBar';
import EmptyState from '@/components/ui/EmptyState';

// ── Types ──────────────────────────────────────
interface Permission {
  id: number;
  name: string;
  display_name?: string;
  group?: string;
}

interface Role {
  id: number;
  name: string;
  display_name?: string;
  permissions?: Permission[];
}

// ── ألوان المجموعات ────────────────────────────
const GROUP_COLORS = [
  'var(--em)',
  'var(--blue)',
  'var(--purple)',
  'var(--gold)',
  'var(--teal)',
  'var(--orange)',
];

// ── تجميع الصلاحيات حسب group ──────────────────
function groupPermissions(permissions: Permission[]) {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const group = p.group || 'أخرى';
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});
}

// ── مكوّن الصفحة الرئيسي ───────────────────────
export default function RolesPage() {
  const { data: roles = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles', {
        params: { include: 'permissions', per_page: 100 },
      });
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
    staleTime: 60_000,
  });

  return (
    <div className="page on">
      <PageHeader
        title="الأدوار والصلاحيات"
        subtitle="الصلاحيات المرتبطة بكل دور في النظام"
      />

      {/* تحميل */}
      {isLoading && (
        <div className="empty">
          <div className="empty-ic">
            <i className="ti ti-loader" />
          </div>
          <div className="empty-tx">جارٍ تحميل الأدوار...</div>
        </div>
      )}

      {/* خطأ */}
      {isError && (
        <AlertBar variant="red">
          فشل تحميل الأدوار.{' '}
          <button
            onClick={() => refetch()}
            style={{
              fontWeight: 700,
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            إعادة المحاولة
          </button>
        </AlertBar>
      )}

      {/* لا توجد أدوار */}
      {!isLoading && roles.length === 0 && (
        <EmptyState
          icon="ti-shield"
          text="لا توجد أدوار"
          sub="لم يتم إنشاء أي دور بعد"
        />
      )}

      {/* عرض الأدوار */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
        {roles.map((role: Role) => {
          const groups = groupPermissions(role.permissions ?? []);
          const hasPermissions = Object.keys(groups).length > 0;

          return (
            <Card key={role.id} padding={18}>
              {/* رأس البطاقة */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <i
                  className="ti ti-shield"
                  style={{ fontSize: 20, color: 'var(--em)' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--t1)' }}>
                    {role.display_name || role.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: 'var(--t4)',
                    }}
                  >
                    ({role.name})
                  </div>
                </div>
              </div>

              {/* صلاحيات الدور */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--t4)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i
                  className="ti ti-lock-open"
                  style={{ color: 'var(--em)' }}
                />
                الصلاحيات المرتبطة
              </div>

              {hasPermissions ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(groups).map(([group, perms], gi) => (
                    <div
                      key={group}
                      style={{
                        background: 'var(--bg3)',
                        borderRadius: 'var(--r3)',
                        border: '1px solid var(--b1)',
                        padding: '12px 14px',
                        borderRight: `3px solid ${GROUP_COLORS[gi % GROUP_COLORS.length]}`,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: GROUP_COLORS[gi % GROUP_COLORS.length],
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <i className="ti ti-folders" />
                        {group}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {perms.map((p) => (
                          <span
                            key={p.id}
                            style={{
                              fontSize: 11,
                              padding: '3px 10px',
                              borderRadius: 20,
                              background: 'var(--bg4)',
                              color: 'var(--t2)',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              borderBottom: `2px solid ${GROUP_COLORS[gi % GROUP_COLORS.length]}`,
                            }}
                          >
                            <i
                              className="ti ti-check"
                              style={{
                                color: GROUP_COLORS[gi % GROUP_COLORS.length],
                                fontSize: 10,
                              }}
                            />
                            {p.display_name || p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    color: 'var(--t4)',
                    fontSize: 12,
                    padding: '8px 12px',
                    background: 'var(--bg3)',
                    borderRadius: 'var(--r2)',
                  }}
                >
                  لا توجد صلاحيات مرتبطة بهذا الدور
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
