// pages/documents/components/list/ActionBtn.tsx
import React from "react";

const ActionBtn = React.memo(function ActionBtn({
    icon, title, onClick, color, disabled,
}: { icon: string; title: string; onClick: () => void; color?: string; disabled?: boolean }) {
    return (
        <button title={title} aria-label={title} disabled={disabled} onClick={onClick} style={{
            width: 28, height: 28, borderRadius: 6, border: "1px solid var(--b1)",
            background: "var(--bg2)", color: color ?? "var(--t3)", fontSize: 13,
            cursor: "pointer", display: "inline-flex", alignItems: "center",
            justifyContent: "center", transition: "all .15s", opacity: disabled ? 0.4 : 1,
        }}>
            <i className={`ti ${icon}`} aria-hidden="true" />
        </button>
    );
});

export default ActionBtn;
