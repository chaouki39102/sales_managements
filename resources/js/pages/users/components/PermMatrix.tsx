// resources/js/pages/users/components/PermMatrix.tsx
import type { Permission } from "../types";
import { gColor } from "../constants";

// ─── Permissions Matrix ──────────────────────────
export default function PermMatrix({
    permissions,
    selected,
    onChange,
    roleDerivedIds,
}: {
    permissions: Permission[];
    selected: number[];
    onChange: (ids: number[]) => void;
    roleDerivedIds?: Set<number>;
}) {
    const groups = permissions.reduce<Record<string, Permission[]>>(
        (acc, p) => {
            const g = p.group || "أخرى";
            if (!acc[g]) acc[g] = [];
            acc[g].push(p);
            return acc;
        },
        {},
    );

    const toggleOne = (id: number) =>
        onChange(
            selected.includes(id)
                ? selected.filter((i) => i !== id)
                : [...selected, id],
        );

    const toggleGroup = (perms: Permission[]) => {
        const ids = perms.map((p) => p.id);
        const allOn = ids.every((id) => selected.includes(id));
        if (allOn) onChange(selected.filter((id) => !ids.includes(id)));
        else onChange([...new Set([...selected, ...ids])]);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(groups).map(([group, perms], gi) => {
                const color = gColor(gi);
                const ids = perms.map((p) => p.id);
                const allOn = ids.every((id) => selected.includes(id));
                const someOn = ids.some((id) => selected.includes(id));
                return (
                    <div
                        key={group}
                        style={{
                            borderRadius: 12,
                            border: "1px solid var(--b2)",
                            overflow: "hidden",
                        }}
                    >
                        {/* Group header */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 14px",
                                cursor: "pointer",
                                background: allOn ? `${color}15` : "var(--bg3)",
                                borderBottom: "1px solid var(--b1)",
                            }}
                            onClick={() => toggleGroup(perms)}
                        >
                            <div
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 5,
                                    border: `2px solid ${allOn ? color : someOn ? color : "var(--b3)"}`,
                                    background: allOn
                                        ? color
                                        : someOn
                                          ? `${color}40`
                                          : "transparent",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    transition: ".13s",
                                }}
                            >
                                {(allOn || someOn) && (
                                    <i
                                        className="ti ti-check"
                                        style={{
                                            fontSize: 10,
                                            color: allOn ? "#fff" : color,
                                        }}
                                    />
                                )}
                            </div>
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color,
                                    flex: 1,
                                }}
                            >
                                {group}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--t4)" }}>
                                {
                                    ids.filter((id) => selected.includes(id))
                                        .length
                                }
                                /{ids.length}
                            </span>
                        </div>
                        {/* Permissions */}
                        <div
                            style={{
                                padding: "10px 14px",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                background: "var(--bg2)",
                            }}
                        >
                            {perms.map((p) => {
                                const on = selected.includes(p.id);
                                const fromRole = roleDerivedIds?.has(p.id) ?? false;
                                return (
                                    <label
                                        key={p.id}
                                        title={fromRole ? "ممنوحة عبر الدور — تغييرها يُضيف صلاحية مباشرة" : undefined}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 5,
                                            padding: "4px 10px",
                                            borderRadius: 20,
                                            cursor: "pointer",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: on
                                                ? fromRole
                                                    ? `${color}25`
                                                    : `${color}15`
                                                : fromRole
                                                    ? "var(--bg3)"
                                                    : "var(--bg4)",
                                            border: `1px solid ${on ? color + "50" : fromRole ? "var(--b2)" : "transparent"}`,
                                            color: on ? color : fromRole ? "var(--t4)" : "var(--t3)",
                                            transition: "all .13s",
                                            userSelect: "none",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={on}
                                            onChange={() => toggleOne(p.id)}
                                            style={{ display: "none" }}
                                        />
                                        {fromRole && !on ? (
                                            <i
                                                className="ti ti-shield"
                                                style={{ fontSize: 9, opacity: 0.6 }}
                                            />
                                        ) : (
                                            <i
                                                className={`ti ti-${on ? "check" : "plus"}`}
                                                style={{ fontSize: 9 }}
                                            />
                                        )}
                                        {p.display_name ?? p.name}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
