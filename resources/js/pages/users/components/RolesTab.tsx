// resources/js/pages/users/components/RolesTab.tsx — تبويب الأدوار
import type { Role } from "../types";
import { gColor } from "../constants";
import type { UsersPageData } from "../hooks/useUsersPageData";
import Badge from "./Badge";
import Btn from "./Btn";

export default function RolesTab({
    roles,
    rolesLoading,
    setViewRole,
    setEditRole,
}: {
    roles: UsersPageData["roles"];
    rolesLoading: boolean;
    setViewRole: (r: Role) => void;
    setEditRole: (r: Role) => void;
}) {
    return (
        <div style={{ animation: "slideIn .2s ease" }}>
            {rolesLoading ? (
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
            ) : roles.length === 0 ? (
                <div className="empty">
                    <div className="empty-ic">
                        <i className="ti ti-shield" />
                    </div>
                    <div className="empty-tx">لا توجد أدوار</div>
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fill,minmax(300px,1fr))",
                        gap: 12,
                    }}
                >
                    {roles.map((role, i) => {
                        const perms =
                            role.permissions ??
                            (role as any).relations?.permissions ??
                            [];
                        const groups = [
                            ...new Set(
                                perms.map(
                                    (p: any) => p.group ?? "أخرى",
                                ),
                            ),
                        ];
                        return (
                            <div
                                key={role.id}
                                className="r-card"
                                onClick={() => setViewRole(role)}
                                style={{
                                    background: "var(--bg2)",
                                    borderRadius: 14,
                                    border: "1px solid var(--b2)",
                                    padding: 16,
                                    cursor: "pointer",
                                    transition: "all .18s",
                                    animation: `slideIn .25s ease ${i * 0.05}s both`,
                                }}
                            >
                                {/* Card head */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: 12,
                                        marginBottom: 14,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: 12,
                                            background:
                                                "var(--emb)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent:
                                                "center",
                                            fontSize: 20,
                                            color: "var(--em)",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <i className="ti ti-shield-half" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{
                                                fontWeight: 800,
                                                fontSize: 14,
                                                color: "var(--t1)",
                                            }}
                                        >
                                            {role.display_name ??
                                                role.name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 10,
                                                color: "var(--t4)",
                                                fontFamily:
                                                    "monospace",
                                                marginTop: 2,
                                            }}
                                        >
                                            {role.name}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 4,
                                        }}
                                    >
                                        <Btn
                                            size="xs"
                                            variant="ghost"
                                            icon={
                                                <i className="ti ti-pencil" />
                                            }
                                            onClick={() => {
                                                setEditRole(role);
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Permission count */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        flexWrap: "wrap",
                                        marginBottom: 10,
                                    }}
                                >
                                    <Badge
                                        color="var(--em)"
                                        bg="var(--emb)"
                                    >
                                        <i
                                            className="ti ti-lock"
                                            style={{ fontSize: 9 }}
                                        />
                                        {perms.length} صلاحية
                                    </Badge>
                                    {groups
                                        .slice(0, 2)
                                        .map((g, gi) => (
                                            <Badge
                                                key={g}
                                                color={gColor(gi)}
                                                bg={`${gColor(gi)}15`}
                                            >
                                                {g}
                                            </Badge>
                                        ))}
                                    {groups.length > 2 && (
                                        <Badge
                                            color="var(--t4)"
                                            bg="var(--bg4)"
                                        >
                                            +{groups.length - 2}
                                        </Badge>
                                    )}
                                </div>

                                {role.description && (
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "var(--t4)",
                                            borderTop:
                                                "1px solid var(--b1)",
                                            paddingTop: 10,
                                            marginTop: 4,
                                        }}
                                    >
                                        {role.description}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
