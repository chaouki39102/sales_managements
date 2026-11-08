// resources/js/pages/users/components/UserRow.tsx — صف مستخدم في الجدول
import { useConfirm } from "@/hooks/useConfirm";
import type { User } from "../types";
import { fmtDT } from "../utils";
import type { UsersPageData } from "../hooks/useUsersPageData";
import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";
import Btn from "./Btn";

export default function UserRow({
    u,
    i,
    filteredUsers,
    roles,
    assignRole,
    deleteUser,
    deleteConfirm,
    setViewUser,
    setEditUser,
}: {
    u: User;
    i: number;
    filteredUsers: User[];
    roles: UsersPageData["roles"];
    assignRole: UsersPageData["assignRole"];
    deleteUser: UsersPageData["deleteUser"];
    deleteConfirm: ReturnType<typeof useConfirm>;
    setViewUser: (u: User) => void;
    setEditUser: (u: User) => void;
}) {
    return (
        <div
            className="u-row"
            onClick={() => setViewUser(u)}
            style={{
                display: "grid",
                gridTemplateColumns:
                    "2fr 1.5fr 1fr 1fr 100px",
                padding: "12px 18px",
                cursor: "pointer",
                borderBottom:
                    i < filteredUsers.length - 1
                        ? "1px solid var(--b1)"
                        : "none",
                background: "var(--bg2)",
                transition: ".13s",
                animation: `slideIn .25s ease ${i * 0.03}s both`,
            }}
        >
            {/* Name */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                }}
            >
                <Avatar name={u.name} id={u.id} />
                <div>
                    <div
                        style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: "var(--t1)",
                        }}
                    >
                        {u.name}
                    </div>
                    <div
                        style={{
                            fontSize: 10,
                            color: "var(--t4)",
                            fontFamily: "monospace",
                        }}
                    >
                        {u.username
                            ? `@${u.username}`
                            : "—"}
                    </div>
                </div>
            </div>

            {/* Email */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 2,
                }}
            >
                <div
                    style={{
                        fontSize: 12,
                        color: "var(--t2)",
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {u.email}
                </div>
                {u.phone && (
                    <div
                        style={{
                            fontSize: 10,
                            color: "var(--t4)",
                            direction: "ltr",
                        }}
                    >
                        {u.phone}
                    </div>
                )}
            </div>

            {/* Role + 2FA */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    minWidth: 118,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <select
                    className="usr-role-assign"
                    value={u.roles?.[0]?.name ?? ""}
                    disabled={assignRole.isPending}
                    title="تعيين دور المستخدم داخل الشركة"
                    onChange={(e) => {
                        const rn = e.target.value;
                        if (!rn) return;
                        assignRole.mutate({
                            userId: u.id,
                            role: rn,
                        });
                    }}
                >
                    <option value="">
                        بدون دور
                    </option>
                    {roles.map((r) => (
                        <option
                            key={r.id}
                            value={r.name}
                        >
                            {r.display_name ??
                                r.name}
                        </option>
                    ))}
                </select>
                {u.two_factor_enabled ? (
                    <span
                        className="usr-2fa"
                        title="المصادقة الثنائية مفعّلة"
                    >
                        <i className="ti ti-shield-check" />
                        2FA مفعّلة
                    </span>
                ) : null}
            </div>

            {/* Last login */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: 11,
                    color: "var(--t4)",
                }}
            >
                {u.last_login_at
                    ? fmtDT(u.last_login_at)
                    : "لم يدخل بعد"}
            </div>

            {/* Actions */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <StatusBadge active={u.active} />
                <Btn
                    size="xs"
                    variant="ghost"
                    icon={
                        <i className="ti ti-pencil" />
                    }
                    onClick={() => setEditUser(u)}
                />
                <Btn
                    size="xs"
                    variant="ghost"
                    icon={
                        <i
                            className="ti ti-trash"
                            style={{
                                color: "var(--red)",
                            }}
                        />
                    }
                    onClick={async () => {
                        if (
                            await deleteConfirm.confirm(
                                `حذف "${u.name}"؟`,
                            )
                        )
                            deleteUser.mutate(u.id);
                    }}
                />
            </div>
        </div>
    );
}
