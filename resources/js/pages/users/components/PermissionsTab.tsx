// resources/js/pages/users/components/PermissionsTab.tsx — تبويب الصلاحيات (للعرض فقط)
import type { Permission } from "../types";
import { gColor } from "../constants";
import type { UsersPageData } from "../hooks/useUsersPageData";
import Badge from "./Badge";

export default function PermissionsTab({
    permissions,
    permsLoading,
}: {
    permissions: UsersPageData["permissions"];
    permsLoading: boolean;
}) {
    // ─── Permission groups for display ────────────
    const permGroups = permissions.reduce<Record<string, Permission[]>>(
        (acc, p) => {
            const g = p.group ?? "أخرى";
            if (!acc[g]) acc[g] = [];
            acc[g].push(p);
            return acc;
        },
        {},
    );

    return (
        <div style={{ animation: "slideIn .2s ease" }}>
            {permsLoading ? (
                <div className="empty">
                    <div className="empty-ic">
                        <i
                            className="ti ti-loader"
                            style={{
                                animation:
                                    "spin 1s linear infinite",
                            }}
                        />
                    </div>
                    <div className="empty-tx">جارٍ التحميل...</div>
                </div>
            ) : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    {/* Summary */}
                    <div
                        style={{
                            padding: "12px 16px",
                            borderRadius: 12,
                            background: "var(--emb)",
                            border: "1px solid var(--embo)",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        <i
                            className="ti ti-info-circle"
                            style={{
                                color: "var(--em)",
                                fontSize: 18,
                            }}
                        />
                        <span
                            style={{
                                fontSize: 13,
                                color: "var(--em)",
                                fontWeight: 600,
                            }}
                        >
                            {permissions.length} صلاحية مُعرَّفة في{" "}
                            {Object.keys(permGroups).length} مجموعة
                            — للعرض فقط، التعديل من الكود
                        </span>
                    </div>

                    {Object.entries(permGroups).map(
                        ([group, perms], gi) => (
                            <div
                                key={group}
                                style={{
                                    background: "var(--bg2)",
                                    borderRadius: 14,
                                    border: "1px solid var(--b2)",
                                    overflow: "hidden",
                                    animation: `slideIn .25s ease ${gi * 0.06}s both`,
                                }}
                            >
                                {/* Group header */}
                                <div
                                    style={{
                                        padding: "12px 18px",
                                        borderBottom:
                                            "1px solid var(--b1)",
                                        background: "var(--bg3)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        borderRight: `4px solid ${gColor(gi)}`,
                                    }}
                                >
                                    <i
                                        className="ti ti-folders"
                                        style={{
                                            color: gColor(gi),
                                            fontSize: 16,
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontWeight: 800,
                                            fontSize: 13,
                                            color: gColor(gi),
                                        }}
                                    >
                                        {group}
                                    </span>
                                    <Badge
                                        color={gColor(gi)}
                                        bg={`${gColor(gi)}18`}
                                    >
                                        {perms.length} صلاحية
                                    </Badge>
                                </div>

                                {/* Permissions grid */}
                                <div
                                    style={{
                                        padding: "12px 18px",
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 8,
                                    }}
                                >
                                    {perms.map((p) => (
                                        <div
                                            key={p.id}
                                            style={{
                                                padding: "6px 14px",
                                                borderRadius: 20,
                                                background: `${gColor(gi)}10`,
                                                border: `1px solid ${gColor(gi)}30`,
                                                display: "flex",
                                                alignItems:
                                                    "center",
                                                gap: 7,
                                            }}
                                        >
                                            <i
                                                className="ti ti-check"
                                                style={{
                                                    color: gColor(
                                                        gi,
                                                    ),
                                                    fontSize: 10,
                                                }}
                                            />
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: "var(--t2)",
                                                }}
                                            >
                                                {p.display_name ??
                                                    p.name}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 9,
                                                    color: "var(--t4)",
                                                    fontFamily:
                                                        "monospace",
                                                    opacity: 0.7,
                                                }}
                                            >
                                                {p.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}
