// InputField — labelled text input used by the create-company steps
import { useState } from "react";

export default function Field({
    label,
    icon,
    value,
    onChange,
    placeholder,
    type = "text",
    required = false,
    hint,
    dir = "rtl",
}: {
    label: string;
    icon: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    hint?: string;
    dir?: string;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ marginBottom: 12 }}>
            <label
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--t3)",
                    marginBottom: 5,
                    letterSpacing: 0.3,
                }}
            >
                <i
                    className={`ti ${icon}`}
                    style={{ fontSize: 12, color: "var(--em)", opacity: 0.8 }}
                />
                {label}
                {required && (
                    <span style={{ color: "var(--red)", fontSize: 13 }}>*</span>
                )}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                dir={dir}
                style={{
                    width: "100%",
                    padding: "10px 13px",
                    borderRadius: 10,
                    outline: "none",
                    border: `1.5px solid ${focused ? "var(--em)" : "var(--b2)"}`,
                    background: focused ? "var(--bg1)" : "var(--bg3)",
                    color: "var(--t1)",
                    fontFamily: "Tajawal, sans-serif",
                    fontSize: 13,
                    transition: "all .15s",
                    boxShadow: focused ? "0 0 0 3px var(--emb)" : "none",
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {hint && (
                <div
                    style={{
                        fontSize: 10,
                        color: "var(--t4)",
                        marginTop: 3,
                        paddingRight: 2,
                    }}
                >
                    {hint}
                </div>
            )}
        </div>
    );
}
