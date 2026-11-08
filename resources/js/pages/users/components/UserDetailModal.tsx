// resources/js/pages/users/components/UserDetailModal.tsx
import { usersApi } from "@/lib/api/endpoints/users";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useTenantMutation } from "@/hooks/useTenantQuery";
import Modal from "@/components/ui/Modal";
import type { Permission, User } from "../types";
import { fmtDate, fmtDT } from "../utils";
import { gColor } from "../constants";
import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";
import Btn from "./Btn";

// ════════════════════════════════════════════════
// USER DETAIL MODAL
// ════════════════════════════════════════════════
export default function UserDetailModal({
    user,
    onClose,
    onEdit,
}: {
    user: User | null;
    onClose: () => void;
    onEdit: (u: User) => void;
}) {
    const toggleActive = useTenantMutation(
        () => usersApi.toggleActive(user!.id),
        (slug) => tenantKeys.users.all(slug),
    );

    if (!user) return null;
    const permissions = user.permissions ?? [];
    const groups = permissions.reduce<Record<string, Permission[]>>(
        (acc, p) => {
            const g = p.group ?? "عامة";
            if (!acc[g]) acc[g] = [];
            acc[g].push(p);
            return acc;
        },
        {},
    );

    return (
        <Modal open onClose={onClose} title={user.name} subtitle={user.job_title ?? user.email} size="md"
                footer={<>
                    <Btn
                        variant="danger"
                        icon={
                            <i
                                className={`ti ti-${user.active ? "user-x" : "user-check"}`}
                            />
                        }
                        loading={toggleActive.isPending}
                        onClick={() => toggleActive.mutate(undefined)}
                    >
                        {user.active ? "إيقاف" : "تفعيل"}
                    </Btn>
                    <Btn onClick={onClose}>إغلاق</Btn>
                    <Btn
                        variant="primary"
                        icon={<i className="ti ti-pencil" />}
                        onClick={() => onEdit(user)}
                    >
                        تعديل
                    </Btn>
                </>}>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                    }}
                >
                    {/* Profile card */}
                    <div
                        style={{
                            display: "flex",
                            gap: 16,
                            alignItems: "center",
                            padding: "14px 16px",
                            borderRadius: 14,
                            background: user.active
                                ? "var(--emb)"
                                : "var(--redb)",
                            border: `1px solid ${user.active ? "var(--embo)" : "var(--redbo)"}`,
                        }}
                    >
                        <Avatar name={user.name} id={user.id} size={56} />
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 17,
                                    color: "var(--t1)",
                                    marginBottom: 3,
                                }}
                            >
                                {user.name}
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "var(--t4)",
                                    fontFamily: "monospace",
                                }}
                            >
                                {user.email}
                            </div>
                            {user.username && (
                                <div
                                    style={{ fontSize: 11, color: "var(--t4)" }}
                                >
                                    @{user.username}
                                </div>
                            )}
                            {user.phone && (
                                <div
                                    style={{ fontSize: 11, color: "var(--t4)" }}
                                >
                                    {user.phone}
                                </div>
                            )}
                        </div>
                        <StatusBadge active={user.active} />
                    </div>

                    {/* Meta grid */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                        }}
                    >
                        {[
                            {
                                label: "تاريخ التسجيل",
                                value: fmtDate(user.created_at),
                                icon: "ti-calendar",
                            },
                            {
                                label: "آخر دخول",
                                value: fmtDT(user.last_login_at),
                                icon: "ti-clock",
                            },
                        ].map((m) => (
                            <div
                                key={m.label}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    background: "var(--bg3)",
                                    border: "1px solid var(--b1)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                }}
                            >
                                <i
                                    className={`ti ${m.icon}`}
                                    style={{
                                        color: "var(--em)",
                                        fontSize: 16,
                                        flexShrink: 0,
                                    }}
                                />
                                <div>
                                    <div
                                        style={{
                                            fontSize: 10,
                                            color: "var(--t4)",
                                            marginBottom: 1,
                                        }}
                                    >
                                        {m.label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: "var(--t1)",
                                        }}
                                    >
                                        {m.value}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Roles */}
                    {(user.roles?.length ?? 0) > 0 && (
                        <div>
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: "var(--t4)",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                    marginBottom: 8,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <i
                                    className="ti ti-shield"
                                    style={{ color: "var(--em)" }}
                                />
                                الأدوار
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                }}
                            >
                                {user.roles!.map((r) => (
                                    <div
                                        key={r.id}
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: 20,
                                            background: "var(--emb)",
                                            border: "1px solid var(--embo)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <i
                                            className="ti ti-shield-half"
                                            style={{
                                                color: "var(--em)",
                                                fontSize: 12,
                                            }}
                                        />
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: "var(--em)",
                                            }}
                                        >
                                            {r.display_name ?? r.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Permissions by group */}
                    {Object.keys(groups).length > 0 && (
                        <div>
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: "var(--t4)",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                    marginBottom: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <i
                                    className="ti ti-lock-open"
                                    style={{ color: "var(--em)" }}
                                />
                                الصلاحيات ({permissions.length})
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                }}
                            >
                                {Object.entries(groups).map(
                                    ([grp, perms], gi) => (
                                        <div
                                            key={grp}
                                            style={{
                                                background: "var(--bg3)",
                                                borderRadius: 10,
                                                padding: "10px 12px",
                                                borderRight: `3px solid ${gColor(gi)}`,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    color: gColor(gi),
                                                    marginBottom: 7,
                                                }}
                                            >
                                                {grp}
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 5,
                                                }}
                                            >
                                                {perms.map((p) => (
                                                    <span
                                                        key={p.id}
                                                        style={{
                                                            fontSize: 11,
                                                            padding: "2px 9px",
                                                            borderRadius: 20,
                                                            background:
                                                                "var(--bg4)",
                                                            color: "var(--t2)",
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {p.display_name ??
                                                            p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    )}
                </div>
        </Modal>
    );
}
