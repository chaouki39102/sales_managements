// resources/js/pages/users/components/UsersMainTabs.tsx — تبويبات الصفحة الرئيسية
import type { User, UsersMainTab } from "../types";
import type { UsersPageData } from "../hooks/useUsersPageData";

export default function UsersMainTabs({
    mainTab,
    setMainTab,
    users,
    roles,
    permissions,
}: {
    mainTab: UsersMainTab;
    setMainTab: (t: UsersMainTab) => void;
    users: User[];
    roles: UsersPageData["roles"];
    permissions: UsersPageData["permissions"];
}) {
    return (
        <div
            style={{
                display: "flex",
                borderBottom: "1px solid var(--b2)",
                marginBottom: 18,
                gap: 0,
                overflowX: "auto",
            }}
        >
            {(
                [
                    {
                        key: "users",
                        label: "المستخدمون",
                        icon: "ti-users",
                        count: users.length,
                    },
                    {
                        key: "roles",
                        label: "الأدوار",
                        icon: "ti-shield",
                        count: roles.length,
                    },
                    {
                        key: "permissions",
                        label: "الصلاحيات",
                        icon: "ti-lock",
                        count: permissions.length,
                    },
                ] as const
            ).map((t) => (
                <button
                    key={t.key}
                    onClick={() => setMainTab(t.key)}
                    style={{
                        padding: "10px 20px",
                        background: "none",
                        border: "none",
                        borderBottom: `2px solid ${mainTab === t.key ? "var(--em)" : "transparent"}`,
                        color:
                            mainTab === t.key
                                ? "var(--em)"
                                : "var(--t4)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontFamily: "Tajawal, sans-serif",
                        transition: ".13s",
                        whiteSpace: "nowrap",
                    }}
                >
                    <i
                        className={`ti ${t.icon}`}
                        style={{ fontSize: 15 }}
                    />
                    {t.label}
                    <span
                        style={{
                            fontSize: 10,
                            padding: "1px 7px",
                            borderRadius: 20,
                            background:
                                mainTab === t.key
                                    ? "var(--emb)"
                                    : "var(--bg4)",
                            color:
                                mainTab === t.key
                                    ? "var(--em)"
                                    : "var(--t4)",
                            fontWeight: 800,
                        }}
                    >
                        {t.count}
                    </span>
                </button>
            ))}
        </div>
    );
}
