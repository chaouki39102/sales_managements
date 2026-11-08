// ════════════════════════════════════════════════════════════
// resources/js/pages/profile/ProfilePage.tsx
// ════════════════════════════════════════════════════════════
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/core/client";
import type { UserProfile, Tab } from "./types";
import { dedup } from "./utils";
import { getRoleMeta } from "./constants";
import TabBar from "./components/TabBar";
import InfoTab from "./components/InfoTab";
import SecurityTab from "./components/SecurityTab";
import PermissionsTab from "./components/PermissionsTab";
import ProfileHero from "./components/ProfileHero";

// ─────────────────────────────────────────────────────────────
// Main ProfilePage
// ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("info");

  const { data: profile, isLoading, isError, refetch } = useQuery<UserProfile>({
    queryKey: ["profile"],
    // GET /{company}/me → UserController::profile() يُحمّل roles+permissions
    // الـ interceptor يُضيف slug تلقائياً لأن /me ليست public path
    queryFn: () => apiGet<UserProfile>("/me", {
      include: "roles,permissions,gender,commune,wilaya",
    }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="page on">
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 0", gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--emb)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-loader" style={{ color: "var(--em)", fontSize: 24, animation: "spin 1s linear infinite" }} />
          </div>
          <span style={{ color: "var(--t4)", fontSize: 13 }}>جاري تحميل الملف الشخصي...</span>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="page on">
        <div style={{
          padding: "40px", borderRadius: 16, border: "1px solid var(--b2)",
          background: "var(--bg2)", textAlign: "center",
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 36, color: "var(--red)", display: "block", marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", marginBottom: 8 }}>فشل تحميل الملف الشخصي</div>
          <button
            onClick={() => refetch()}
            style={{
              padding: "8px 20px", borderRadius: 10, border: "none",
              background: "var(--em)", color: "#fff", fontWeight: 700, cursor: "pointer",
            }}
          >
            <i className="ti ti-refresh" /> إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // ✅ FIX 2: dedup الأدوار في الـ hero card أيضاً
  const uniqueRoles = dedup(profile.roles ?? []);
  const primaryRole = uniqueRoles[0];
  const roleMeta    = primaryRole ? getRoleMeta(primaryRole.name) : null;
  const canEdit     = true;
  // ✅ FIX 3: إظهار تبويب الصلاحيات دائماً إذا كان لدى المستخدم أدوار
  const canSeePerms = (profile.roles?.length ?? 0) > 0 || (profile.permissions?.length ?? 0) > 0;

  return (
    <div className="page on" style={{ maxWidth: 800, margin: "0 auto" }}>

      {/* Hero Card */}
      <ProfileHero profile={profile} roleMeta={roleMeta} uniqueRoles={uniqueRoles} />

      {/* Tabs + Content */}
      <TabBar active={tab} onChange={setTab} canSeePermissions={canSeePerms} />

      {tab === "info"        && <InfoTab        profile={profile} canEdit={canEdit} />}
      {tab === "security"    && <SecurityTab    profile={profile} canEdit={canEdit} />}
      {tab === "permissions" && <PermissionsTab profile={profile}                   />}

    </div>
  );
}
