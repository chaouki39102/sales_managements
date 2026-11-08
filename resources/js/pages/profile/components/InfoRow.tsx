// resources/js/pages/profile/components/InfoRow.tsx
import type React from "react";

export default function InfoRow({ icon, label, value }: { icon: string; label: string; value?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "10px 0",
      borderBottom: "1px solid var(--b1)",
    }}>
      <div style={{
        width: 32, height: 32,
        borderRadius: 8,
        background: "var(--emb)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <i className={`ti ${icon}`} style={{ color: "var(--em)", fontSize: 15 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--t4)", fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: "var(--t1)", fontWeight: 600, wordBreak: "break-word" }}>
          {value ?? <span style={{ color: "var(--t4)", fontStyle: "italic" }}>غير محدد</span>}
        </div>
      </div>
    </div>
  );
}
