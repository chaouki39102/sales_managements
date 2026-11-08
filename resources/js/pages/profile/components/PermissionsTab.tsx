// resources/js/pages/profile/components/PermissionsTab.tsx
import React from "react";
import type { Permission, UserProfile } from "../types";
import { dedup, extractPermissionGroup } from "../utils";
import { getRoleMeta } from "../constants";
import SectionCard from "./SectionCard";

// ─────────────────────────────────────────────────────────────
// Permissions Tab — FIX: dedup الأدوار + إظهار الصلاحيات دائماً
// ─────────────────────────────────────────────────────────────
export default function PermissionsTab({ profile }: { profile: UserProfile }) {
  // ✅ FIX 2: dedup الأدوار بالـ id
  const roles = React.useMemo(() => dedup(profile.roles ?? []), [profile.roles]);
  const permissions = React.useMemo(() => dedup(profile.permissions ?? []), [profile.permissions]);

  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const g = extractPermissionGroup(p);
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  const GC = ["#0a8a5c","#1a4fd6","#6920d4","#b87d0a","#0d7a8c","#c43a0a"];
  const gc = (i: number) => GC[i % GC.length];

  return (
    <div>
      {/* Roles */}
      <SectionCard title="الأدوار المُعيَّنة" icon="ti-shield">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 10 }}>
          {roles.length === 0 ? (
            <div style={{ color: "var(--t4)", fontSize: 13, padding: "8px 0" }}>لا توجد أدوار معيّنة</div>
          ) : roles.map(r => {
            const meta = getRoleMeta(r.name);
            return (
              <div key={r.id} style={{
                padding: "10px 16px",
                borderRadius: 12,
                background: meta.bg,
                border: `1px solid ${meta.color}30`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <i className={`ti ${meta.icon}`} style={{ color: meta.color, fontSize: 18 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: meta.color }}>{r.display_name ?? meta.label}</div>
                  <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: "monospace" }}>{r.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ✅ FIX 3: إذا لم تكن هناك صلاحيات مباشرة — اعرض رسالة واضحة */}
      {permissions.length > 0 ? (
        <SectionCard title={`الصلاحيات المباشرة — ${permissions.length} صلاحية`} icon="ti-lock-open">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 10 }}>
            {Object.entries(grouped).map(([group, perms], gi) => (
              <div key={group} style={{
                background: "var(--bg3)",
                borderRadius: 12,
                border: "1px solid var(--b1)",
                overflow: "hidden",
                borderRight: `3px solid ${gc(gi)}`,
              }}>
                <div style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--b1)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <i className="ti ti-folders" style={{ color: gc(gi), fontSize: 15 }} />
                  <span style={{ fontWeight: 800, fontSize: 13, color: gc(gi) }}>{group}</span>
                  <span style={{
                    marginRight: "auto",
                    fontSize: 11, padding: "1px 8px", borderRadius: 20,
                    background: `${gc(gi)}18`, color: gc(gi), fontWeight: 700,
                  }}>{perms.length}</span>
                </div>
                <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {perms.map(p => (
                    <span key={p.id} style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
                      background: "var(--bg4, var(--bg2))",
                      border: `1px solid ${gc(gi)}30`,
                      color: "var(--t2)", fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <i className="ti ti-check" style={{ color: gc(gi), fontSize: 10 }} />
                      {p.display_name ?? p.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        <div style={{
          padding: "20px 24px",
          borderRadius: 14,
          border: "1px dashed var(--b2)",
          background: "var(--bg3)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "var(--t3)",
        }}>
          <i className="ti ti-shield-check" style={{ fontSize: 28, color: "var(--em)", opacity: .6, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t2)", marginBottom: 3 }}>
              الصلاحيات مُدارة عبر الأدوار
            </div>
            <div style={{ fontSize: 12 }}>
              جميع صلاحياتك تأتي من {roles.length > 0
                ? `الدور «${roles[0].display_name ?? getRoleMeta(roles[0].name).label}»`
                : "الأدوار المُعيَّنة"}. لا توجد صلاحيات مباشرة مُضافة.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
