// resources/js/pages/users/components/Badge.tsx
import type React from "react";

export default function Badge({
    children,
    color = "var(--em)",
    bg = "var(--emb)",
}: {
    children: React.ReactNode;
    color?: string;
    bg?: string;
}) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 9px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                color,
                background: bg,
                whiteSpace: "nowrap",
            }}
        >
            {children}
        </span>
    );
}
