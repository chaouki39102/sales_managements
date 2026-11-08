// resources/js/pages/users/components/UsersPageHeader.tsx — العنوان + مؤشرات KPI
import type { User, UsersMainTab } from "../types";
import type { UsersPageData } from "../hooks/useUsersPageData";
import Btn from "./Btn";

export default function UsersPageHeader({
    users,
    roles,
    permissions,
    mainTab,
    setShowAdd,
    setShowAddRole,
}: {
    users: User[];
    roles: UsersPageData["roles"];
    permissions: UsersPageData["permissions"];
    mainTab: UsersMainTab;
    setShowAdd: (v: boolean) => void;
    setShowAddRole: (v: boolean) => void;
}) {
    return (
        <div style={{ marginBottom: 22 }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: 22,
                            fontWeight: 900,
                            color: "var(--t1)",
                            margin: 0,
                            marginBottom: 3,
                        }}
                    >
                        إدارة المستخدمين
                    </h1>
                    <p
                        style={{
                            fontSize: 12,
                            color: "var(--t4)",
                            margin: 0,
                        }}
                    >
                        الأدوار · الصلاحيات · الحسابات — {users.length}{" "}
                        مستخدم · {roles.length} دور ·{" "}
                        {permissions.length} صلاحية
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    {mainTab === "users" && (
                        <Btn
                            variant="primary"
                            icon={<i className="ti ti-user-plus" />}
                            onClick={() => setShowAdd(true)}
                        >
                            مستخدم جديد
                        </Btn>
                    )}
                    {mainTab === "roles" && (
                        <Btn
                            variant="primary"
                            icon={<i className="ti ti-shield-plus" />}
                            onClick={() => setShowAddRole(true)}
                        >
                            دور جديد
                        </Btn>
                    )}
                </div>
            </div>

            {/* KPIs */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 10,
                    marginTop: 18,
                }}
            >
                {[
                    {
                        label: "المستخدمون",
                        value: users.length,
                        icon: "ti-users",
                        color: "var(--em)",
                        bg: "var(--emb)",
                    },
                    {
                        label: "نشطون",
                        value: users.filter((u) => u.active).length,
                        icon: "ti-user-check",
                        color: "var(--blue)",
                        bg: "var(--blueb)",
                    },
                    {
                        label: "موقوفون",
                        value: users.filter((u) => !u.active).length,
                        icon: "ti-user-x",
                        color: "var(--red)",
                        bg: "var(--redb)",
                    },
                    {
                        label: "الأدوار",
                        value: roles.length,
                        icon: "ti-shield",
                        color: "var(--purple)",
                        bg: "var(--purb)",
                    },
                ].map((k, i) => (
                    <div
                        key={i}
                        style={{
                            background: "var(--bg2)",
                            borderRadius: 14,
                            padding: "14px 16px",
                            border: "1px solid var(--b2)",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            transition: ".15s",
                            animation: `slideIn .3s ease ${i * 0.05}s both`,
                        }}
                    >
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: k.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                                color: k.color,
                                flexShrink: 0,
                            }}
                        >
                            <i className={`ti ${k.icon}`} />
                        </div>
                        <div>
                            <div
                                style={{
                                    fontSize: 22,
                                    fontWeight: 900,
                                    color: "var(--t1)",
                                    lineHeight: 1,
                                }}
                            >
                                {k.value}
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: "var(--t4)",
                                    marginTop: 2,
                                }}
                            >
                                {k.label}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
