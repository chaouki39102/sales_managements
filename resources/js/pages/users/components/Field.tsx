// resources/js/pages/users/components/Field.tsx
import type React from "react";

// ─── Form Field ─────────────────────────────────
export default function Field({
    label,
    req,
    children,
}: {
    label: string;
    req?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label
                style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--t4)",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                }}
            >
                {label}
                {req && (
                    <span style={{ color: "var(--red)", marginRight: 2 }}>
                        *
                    </span>
                )}
            </label>
            {children}
        </div>
    );
}
