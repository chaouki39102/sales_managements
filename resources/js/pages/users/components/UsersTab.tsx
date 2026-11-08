// resources/js/pages/users/components/UsersTab.tsx — تبويب المستخدمين (بحث + جدول)
import { useConfirm } from "@/hooks/useConfirm";
import type { User, UsersFilter } from "../types";
import { inputStyle } from "../constants";
import type { UsersPageData } from "../hooks/useUsersPageData";
import UserRow from "./UserRow";

export default function UsersTab({
    search,
    setSearch,
    filter,
    setFilter,
    users,
    usersLoading,
    roles,
    assignRole,
    deleteUser,
    deleteConfirm,
    setViewUser,
    setEditUser,
}: {
    search: string;
    setSearch: (v: string) => void;
    filter: UsersFilter;
    setFilter: (v: UsersFilter) => void;
    users: User[];
    usersLoading: boolean;
    roles: UsersPageData["roles"];
    assignRole: UsersPageData["assignRole"];
    deleteUser: UsersPageData["deleteUser"];
    deleteConfirm: ReturnType<typeof useConfirm>;
    setViewUser: (u: User) => void;
    setEditUser: (u: User) => void;
}) {
    // ─── Filtered users ────────────────────────────
    const filteredUsers = users.filter((u) => {
        if (filter === "active" && !u.active) return false;
        if (filter === "inactive" && u.active) return false;
        return true;
    });

    return (
        <div style={{ animation: "slideIn .2s ease" }}>
            {/* Toolbar */}
            <div
                style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 14,
                    flexWrap: "wrap",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        flex: 1,
                        minWidth: 200,
                    }}
                >
                    <i
                        className="ti ti-search"
                        style={{
                            position: "absolute",
                            right: 11,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--t4)",
                            fontSize: 13,
                        }}
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالاسم أو البريد..."
                        style={{ ...inputStyle, paddingRight: 34 }}
                    />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    {(["all", "active", "inactive"] as const).map(
                        (f) => {
                            const labels = {
                                all: "الكل",
                                active: "نشطون",
                                inactive: "موقوفون",
                            };
                            return (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    style={{
                                        padding: "7px 14px",
                                        borderRadius: 10,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        fontFamily:
                                            "Tajawal, sans-serif",
                                        transition: ".13s",
                                        background:
                                            filter === f
                                                ? "var(--em)"
                                                : "var(--bg3)",
                                        border: `1px solid ${filter === f ? "var(--em)" : "var(--b2)"}`,
                                        color:
                                            filter === f
                                                ? "#fff"
                                                : "var(--t3)",
                                    }}
                                >
                                    {labels[f]}
                                </button>
                            );
                        },
                    )}
                </div>
            </div>

            {usersLoading ? (
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
            ) : filteredUsers.length === 0 ? (
                <div className="empty">
                    <div className="empty-ic">
                        <i className="ti ti-users" />
                    </div>
                    <div className="empty-tx">
                        {search
                            ? "لا توجد نتائج"
                            : "لا يوجد مستخدمون"}
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        background: "var(--bg2)",
                        borderRadius: 14,
                        border: "1px solid var(--b2)",
                        overflow: "hidden",
                    }}
                >
                    {/* Table header */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "2fr 1.5fr 1fr 1fr 100px",
                            padding: "10px 18px",
                            borderBottom: "1px solid var(--b2)",
                            background: "var(--bg3)",
                        }}
                    >
                        {[
                            "المستخدم",
                            "البريد / الهاتف",
                            "الدور",
                            "آخر دخول",
                            "",
                        ].map((h, i) => (
                            <div
                                key={i}
                                style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: "var(--t4)",
                                    textTransform: "uppercase",
                                    letterSpacing: 0.8,
                                }}
                            >
                                {h}
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    {filteredUsers.map((u, i) => (
                        <UserRow
                            key={u.id}
                            u={u}
                            i={i}
                            filteredUsers={filteredUsers}
                            roles={roles}
                            assignRole={assignRole}
                            deleteUser={deleteUser}
                            deleteConfirm={deleteConfirm}
                            setViewUser={setViewUser}
                            setEditUser={setEditUser}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
