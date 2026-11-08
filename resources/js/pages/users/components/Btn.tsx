// resources/js/pages/users/components/Btn.tsx
import type React from "react";

// ─── Button ─────────────────────────────────────
export default function Btn({
    children,
    onClick,
    variant = "default",
    size = "md",
    disabled,
    loading,
    icon,
    type = "button",
}: {
    children?: React.ReactNode;
    onClick?: () => void | Promise<void>;
    variant?: "default" | "primary" | "danger" | "ghost";
    size?: "sm" | "md" | "xs";
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    type?: "button" | "submit";
}) {
    const styles: Record<string, React.CSSProperties> = {
        default: {
            background: "var(--bg3)",
            border: "1px solid var(--b3)",
            color: "var(--t2)",
        },
        primary: {
            background: "var(--em)",
            border: "1px solid var(--em)",
            color: "#fff",
            boxShadow: "var(--emglow)",
        },
        danger: {
            background: "var(--redb)",
            border: "1px solid var(--redbo)",
            color: "var(--red)",
        },
        ghost: {
            background: "transparent",
            border: "1px solid transparent",
            color: "var(--t3)",
        },
    };
    const pads = { xs: "4px 10px", sm: "7px 14px", md: "9px 18px" };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            style={{
                ...styles[variant],
                padding: pads[size],
                borderRadius: 10,
                fontSize: size === "xs" ? 11 : 13,
                fontWeight: 700,
                cursor: disabled || loading ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "Tajawal, sans-serif",
                transition: ".14s",
                whiteSpace: "nowrap",
            }}
        >
            {loading ? (
                <i
                    className="ti ti-loader"
                    style={{ animation: "spin .8s linear infinite" }}
                />
            ) : (
                icon
            )}
            {children}
        </button>
    );
}
