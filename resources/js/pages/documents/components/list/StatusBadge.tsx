// pages/documents/components/list/StatusBadge.tsx
import { STATUS_CFG } from "../../utils/documentList.constants";
import type { StatusKey } from "../../utils/documentList.constants";

export default function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status as StatusKey] ?? STATUS_CFG.draft;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            color: cfg.color, background: cfg.bg,
            border: `1px solid color-mix(in srgb, ${cfg.color} 22%, transparent)`,
            whiteSpace: "nowrap",
        }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
            {cfg.label}
        </span>
    );
}
