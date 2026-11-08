// resources/js/pages/profile/components/SectionCard.tsx
import type React from "react";

export default function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg2)",
      borderRadius: 16,
      border: "1px solid var(--b2)",
      overflow: "hidden",
      marginBottom: 16,
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--b1)",
        background: "var(--bg3)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <i className={`ti ${icon}`} style={{ color: "var(--em)", fontSize: 17 }} />
        <span style={{ fontWeight: 800, fontSize: 14, color: "var(--t1)" }}>{title}</span>
      </div>
      <div style={{ padding: "6px 18px 14px" }}>
        {children}
      </div>
    </div>
  );
}
