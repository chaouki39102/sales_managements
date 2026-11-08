// resources/js/pages/profile/components/TabBar.tsx
import type { Tab } from "../types";

export default function TabBar({ active, onChange, canSeePermissions }: {
  active: Tab; onChange: (t: Tab) => void; canSeePermissions: boolean
}) {
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "info",        label: "المعلومات الشخصية", icon: "ti-user"        },
    { key: "security",    label: "الأمان",             icon: "ti-lock"        },
    ...(canSeePermissions ? [{ key: "permissions" as Tab, label: "الصلاحيات", icon: "ti-shield-check" }] : []),
  ];
  return (
    <div style={{
      display: "flex",
      gap: 4,
      background: "var(--bg3)",
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
      border: "1px solid var(--b1)",
    }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all .15s",
            background: active === t.key ? "var(--em)" : "transparent",
            color: active === t.key ? "#fff" : "var(--t3)",
          }}
        >
          <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />
          {t.label}
        </button>
      ))}
    </div>
  );
}
