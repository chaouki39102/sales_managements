// pages/documents/components/list/UserChip.tsx
/** Avatar بسيط + اسم — لعرض المستخدم في أعمدة created_by / validated_by */
export default function UserChip({ name, color = "var(--primary)" }: { name: string; color?: string }) {
    if (!name) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color, flexShrink: 0,
            }}>
                {name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "var(--t2)" }}>{name}</span>
        </div>
    );
}
