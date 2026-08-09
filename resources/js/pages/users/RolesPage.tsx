// pages/users/RolesPage.tsx
// ════════════════════════════════════════════════════════════════════════════
// عرض الأدوار وصلاحياتها — مُصلح
//
// الإصلاحات:
// ① التكرار: useRoles() يُزيل المكررات + الباكاند يُضيف distinct()
// ② الصلاحيات: يُجلب مباشرة من كل role.permissions (مُحمَّلة من الباكاند)
// ③ صلاحيات المستخدم: قسم منفصل يعرض صلاحيات المستخدم الحالي
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, Fragment, useMemo } from 'react';
import PageHeader  from '@/components/ui/PageHeader';
import Card        from '@/components/ui/Card';
import Badge       from '@/components/ui/Badge';
import AlertBar    from '@/components/ui/AlertBar';
import EmptyState  from '@/components/ui/EmptyState';
import { useRoles, useMyRolesAndPermissions, usePermissionsGrouped } from '@/lib/api/endpoints/roles';
import type { RoleWithPermissions, PermissionsGrouped } from '@/lib/api/endpoints/roles';
import type { Permission } from '@/lib/api/core/types';

// ─── ألوان المجموعات ──────────────────────────────────────────────────────────
const GROUP_COLORS = [
  'var(--em)',
  'var(--blue)',
  'var(--purple)',
  'var(--gold)',
  'var(--teal)',
  'var(--orange, #f97316)',
  'var(--red)',
];

function groupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

// ─── تجميع الصلاحيات حسب group ───────────────────────────────────────────────
function groupPermissions(permissions: Permission[]): PermissionsGrouped {
  return permissions.reduce<PermissionsGrouped>((acc, p) => {
    const g = p.group ?? 'أخرى';
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});
}

// ─── بادج اسم الدور ───────────────────────────────────────────────────────────
const ROLE_BADGE_COLORS: Record<string, string> = {
  'owner':       'var(--gold)',
  'manager':     'var(--blue)',
  'cashier':     'var(--purple)',
  'viewer':      'var(--t3)',
};

function roleBadgeColor(name: string): string {
  return ROLE_BADGE_COLORS[name] ?? 'var(--t3)';
}

// ─── مكوّن: صلاحيات المستخدم الحالي ─────────────────────────────────────────
function MyPermissionsSection() {
  const { data, isLoading } = useMyRolesAndPermissions();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return null;
  if (!data?.roles?.length && !data?.permissions?.length) return null;

  const roles       = data.roles ?? [];
  const permissions = data.permissions ?? [];

  // تجميع الصلاحيات حسب prefix (الجزء قبل أول _)
  const _grouped = permissions.reduce<Record<string, string[]>>((acc, p) => {
    const parts = p.split('_');
    const group = parts.slice(1).join('_') || 'أخرى';
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});
  void _grouped;;

  return (
    <Card style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(v => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-user-check" style={{ fontSize: 18, color: 'var(--em)' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)' }}>
              صلاحياتي الحالية
            </div>
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
              {roles.map(r => r.display_name || r.name).join('، ')} —{' '}
              {permissions.length} صلاحية
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {roles.map(r => (
            <span
              key={r.id}
              style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: `color-mix(in srgb, ${roleBadgeColor(r.name)} 15%, transparent)`,
                color: roleBadgeColor(r.name),
              }}
            >
              {r.display_name || r.name}
            </span>
          ))}
          <i
            className={`ti ti-chevron-${expanded ? 'up' : 'down'}`}
            style={{ fontSize: 14, color: 'var(--t4)', marginRight: 4 }}
          />
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--b1)', paddingTop: 14 }}>
          {permissions.length === 0 ? (
            <div style={{ color: 'var(--t4)', fontSize: 12 }}>لا توجد صلاحيات مخصصة</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {permissions.map((p, _i) => (
                <span
                  key={p}
                  style={{
                    fontSize: 10.5, padding: '2px 9px', borderRadius: 20,
                    background: 'var(--bg3)', color: 'var(--t2)',
                    border: '1px solid var(--b2)', fontFamily: 'monospace',
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── ترتيب الأدوار القياسي في المصفوفة ──────────────────────────────────────
const STANDARD_ROLE_ORDER = ['owner', 'manager', 'cashier', 'viewer'];
// دور مالك الشركة مقفول: يُمنح تلقائياً لمالك الشركة فقط (قاعدة في الباكاند)
const LOCKED_ROLES = new Set(['owner']);

// ─── مكوّن: مصفوفة صلاحيات الأدوار (عرض) ─────────────────────────────────────
function RoleMatrix({ roles, grouped }: { roles: RoleWithPermissions[]; grouped: PermissionsGrouped }) {
  const ordered = useMemo(() => {
    const ranked = roles
      .map((role, i) => {
        const idx = STANDARD_ROLE_ORDER.indexOf(role.name);
        return { role, rank: idx === -1 ? 99 : idx, i };
      })
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .map(r => r.role);
    return ranked;
  }, [roles]);

  const entries = useMemo(() => Object.entries(grouped), [grouped]);

  return (
    <div className="rm-wrap">
      <table className="rm-table">
        <thead>
          <tr>
            <th className="rm-perm-col">الصلاحية</th>
            {ordered.map(role => {
              const locked = LOCKED_ROLES.has(role.name);
              return (
                <th key={role.id} className={`rm-role-hd${locked ? ' rm-role-hd--locked' : ''}`}>
                  <div className="rm-role-name">
                    {locked && <i className="ti ti-lock" />}
                    <strong>{role.display_name || role.name}</strong>
                    <span className="rm-role-count">{(role.permissions ?? []).length}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td className="rm-empty" colSpan={ordered.length + 1}>لا توجد صلاحيات لعرضها</td>
            </tr>
          )}
          {entries.map(([group, perms]) => (
            <Fragment key={group}>
              <tr className="rm-group">
                <td colSpan={ordered.length + 1}>
                  {group}
                  <span>({perms.length})</span>
                </td>
              </tr>
              {perms.map(p => {
                const permId = Number(p.id);
                return (
                  <tr key={permId}>
                    <td className="rm-perm">
                      {p.display_name || p.name}
                      <small>{p.name}</small>
                    </td>
                    {ordered.map(role => {
                      const locked = LOCKED_ROLES.has(role.name);
                      const has = (role.permissions ?? []).some(pp => Number(pp.id) === permId);
                      return (
                        <td key={role.id} className={`rm-cell${locked ? ' rm-cell--locked' : ''}`}>
                          {locked ? (
                            <i className="ti ti-lock" />
                          ) : has ? (
                            <i className="ti ti-check" style={{ color: 'var(--em)' }} />
                          ) : (
                            <i className="ti ti-minus" style={{ color: 'var(--t4)' }} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── مكوّن: بطاقة دور واحد ────────────────────────────────────────────────────
function RoleCard({ role }: { role: RoleWithPermissions }) {
  const permissions = role.permissions ?? [];
  const grouped     = groupPermissions(permissions);
  const groups      = Object.entries(grouped);

  return (
    <Card>
      {/* رأس البطاقة */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `color-mix(in srgb, ${roleBadgeColor(role.name)} 12%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-shield" style={{ fontSize: 20, color: roleBadgeColor(role.name) }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>
              {role.display_name || role.name}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
              {role.name}
            </div>
            {role.description && (
              <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 3 }}>
                {role.description}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {role.users_count != null && (
            <span style={{ fontSize: 11, color: 'var(--t4)' }}>
              <i className="ti ti-users" style={{ marginLeft: 4, fontSize: 12 }} />
              {role.users_count} مستخدم
            </span>
          )}
          <Badge variant="default">
            {permissions.length} صلاحية
          </Badge>
        </div>
      </div>

      {/* الصلاحيات مجمّعة */}
      {groups.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(([group, perms], gi) => (
            <div
              key={group}
              style={{
                background: 'var(--bg3)', borderRadius: 'var(--r2)',
                border: '1px solid var(--b1)', padding: '10px 12px',
                borderRight: `3px solid ${groupColor(gi)}`,
              }}
            >
              {/* عنوان المجموعة */}
              <div style={{
                fontWeight: 700, fontSize: 12,
                color: groupColor(gi),
                marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <i className="ti ti-folder" style={{ fontSize: 12 }} />
                {group}
                <span style={{
                  marginRight: 4, fontSize: 10, fontWeight: 500,
                  color: 'var(--t4)',
                }}>
                  ({perms.length})
                </span>
              </div>

              {/* الصلاحيات */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {perms.map((p) => (
                  <span
                    key={p.id}
                    title={p.name}
                    style={{
                      fontSize: 11, padding: '2px 9px', borderRadius: 20,
                      background: 'var(--bg2)', color: 'var(--t2)',
                      borderBottom: `2px solid ${groupColor(gi)}`,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <i
                      className="ti ti-check"
                      style={{ color: groupColor(gi), fontSize: 10 }}
                    />
                    {p.display_name || p.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          color: 'var(--t4)', fontSize: 12, padding: '8px 12px',
          background: 'var(--bg3)', borderRadius: 'var(--r2)',
          border: '1px solid var(--b1)',
        }}>
          <i className="ti ti-lock-open" style={{ marginLeft: 6, opacity: .5 }} />
          لا توجد صلاحيات مرتبطة بهذا الدور
        </div>
      )}
    </Card>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────
export default function RolesPage() {
  const { data: roles = [], isLoading, isError, refetch } = useRoles();
  const { data: groupedPermissions } = usePermissionsGrouped();
  const [view, setView] = useState<'cards' | 'matrix'>('cards');

  // ✅ إزالة التكرار — defensive (الباكاند يحله أصلاً)
  const uniqueRoles = React.useMemo(() => {
    const seen = new Set<number>();
    return roles.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [roles]);

  return (
    <div className="page on" id="p-roles">
      <PageHeader
        title="الأدوار والصلاحيات"
        subtitle={`${uniqueRoles.length} دور في النظام`}
      />

      {/* صلاحيات المستخدم الحالي */}
      <MyPermissionsSection />

      {/* مبدّل العرض */}
      {!isLoading && uniqueRoles.length > 0 && (
        <div className="rm-toggle">
          <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>
            <i className="ti ti-cards" /> البطاقات
          </button>
          <button className={view === 'matrix' ? 'on' : ''} onClick={() => setView('matrix')}>
            <i className="ti ti-grid-3x3" /> المصفوفة
          </button>
        </div>
      )}

      {/* تحميل */}
      {isLoading && (
        <div className="empty">
          <div className="empty-ic">
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
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
              fontWeight: 700, textDecoration: 'underline',
              background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
            }}
          >
            إعادة المحاولة
          </button>
        </AlertBar>
      )}

      {/* لا أدوار */}
      {!isLoading && !isError && uniqueRoles.length === 0 && (
        <EmptyState
          icon="ti-shield-off"
          text="لا توجد أدوار"
          sub="لم يتم إنشاء أي دور بعد"
        />
      )}

      {/* المصفوفة */}
      {!isLoading && uniqueRoles.length > 0 && view === 'matrix' && (
        <>
          <div className="rm-matrix-info">
            <i className="ti ti-shield-lock" />
            <span>
              مصفوفة صلاحيات الأدوار — <b>ملاحظة</b>: عمود «مالك الشركة» مقفول
              ويُمنح تلقائياً لمالك الشركة فقط.
            </span>
          </div>
          {groupedPermissions && Object.keys(groupedPermissions).length > 0 ? (
            <RoleMatrix roles={uniqueRoles} grouped={groupedPermissions} />
          ) : (
            <div className="rm-empty">لا توجد صلاحيات لعرضها في المصفوفة</div>
          )}
        </>
      )}

      {/* قائمة الأدوار */}
      {!isLoading && uniqueRoles.length > 0 && view === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {uniqueRoles.map(role => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
