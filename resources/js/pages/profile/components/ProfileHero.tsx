// resources/js/pages/profile/components/ProfileHero.tsx — بطاقة الملف الشخصي العلوية
import type { Role, UserProfile } from "../types";
import { getRoleMeta } from "../constants";
import AvatarUpload from "./AvatarUpload";

export default function ProfileHero({
  profile,
  roleMeta,
  uniqueRoles,
}: {
  profile: UserProfile;
  roleMeta: ReturnType<typeof getRoleMeta> | null;
  uniqueRoles: Role[];
}) {
  return (
    <div style={{
      background: "var(--bg2)",
      borderRadius: 20,
      border: "1px solid var(--b2)",
      overflow: "hidden",
      marginBottom: 20,
    }}>
      {/* Banner */}
      <div style={{
        height: 100,
        background: roleMeta
          ? `linear-gradient(135deg, ${roleMeta.color}30, ${roleMeta.color}10)`
          : "linear-gradient(135deg, var(--emb), var(--bg3))",
        borderBottom: "1px solid var(--b1)",
        position: "relative",
      }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .08 }}
             viewBox="0 0 400 100" preserveAspectRatio="none">
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={i} cx={i * 45 + 20} cy={50} r={30 + i * 5}
                    fill="none" stroke={roleMeta?.color ?? "var(--em)"} strokeWidth="1" />
          ))}
        </svg>
      </div>

      {/* Profile section */}
      <div style={{ padding: "0 24px 24px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -36, marginBottom: 16 }}>
          <div style={{
            padding: 4,
            background: "var(--bg2)",
            borderRadius: 22,
            boxShadow: "0 4px 24px rgba(0,0,0,.12)",
          }}>
            <AvatarUpload profile={profile} />
          </div>

          <div style={{ paddingBottom: 4, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "var(--t1)", lineHeight: 1.2 }}>
              {profile.name}
            </div>
            {profile.job_title && (
              <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 2 }}>{profile.job_title}</div>
            )}
          </div>

          <div style={{ paddingBottom: 4 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: profile.active ? "var(--emb)" : "var(--redb)",
              color: profile.active ? "var(--em)" : "var(--red)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
              {profile.active ? "نشط" : "موقوف"}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 10,
            background: "var(--bg3)", border: "1px solid var(--b1)",
            fontSize: 13, color: "var(--t2)",
          }}>
            <i className="ti ti-mail" style={{ color: "var(--em)", fontSize: 14 }} />
            {profile.email}
          </div>

          {profile.phone && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 10,
              background: "var(--bg3)", border: "1px solid var(--b1)",
              fontSize: 13, color: "var(--t2)",
            }}>
              <i className="ti ti-phone" style={{ color: "var(--em)", fontSize: 14 }} />
              {profile.phone}
            </div>
          )}

          {/* ✅ FIX 2: عرض الأدوار بعد dedup فقط */}
          {uniqueRoles.map(r => {
            const m = getRoleMeta(r.name);
            return (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 10,
                background: m.bg, border: `1px solid ${m.color}30`,
                fontSize: 13, color: m.color, fontWeight: 700,
              }}>
                <i className={`ti ${m.icon}`} style={{ fontSize: 14 }} />
                {r.display_name ?? m.label}
              </div>
            );
          })}

          {(profile.wilaya || profile.commune) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 10,
              background: "var(--bg3)", border: "1px solid var(--b1)",
              fontSize: 13, color: "var(--t2)",
            }}>
              <i className="ti ti-map-pin" style={{ color: "var(--em)", fontSize: 14 }} />
              {[profile.commune?.arabic_name ?? profile.commune?.name,
                profile.wilaya?.arabic_name ?? profile.wilaya?.name]
                .filter(Boolean).join("، ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
