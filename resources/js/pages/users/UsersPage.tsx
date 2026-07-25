// resources/js/pages/users/UsersPage.tsx
// ════════════════════════════════════════════════
// إدارة المستخدمين + الأدوار + الصلاحيات — واجهة متكاملة
// ════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRoles } from "@/lib/api/endpoints/roles";
import { usersApi, rolesApi, usePermissions } from "@/lib/api/endpoints/users";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useTenantQuery, useTenantMutation } from "@/hooks/useTenantQuery";
import { useNotification } from '@/hooks/useNotification';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui';
import Modal from '@/components/ui/Modal';

// ─── Types ─────────────────────────────────────
interface Permission {
    id: number;
    name: string;
    display_name?: string;
    group?: string;
    description?: string;
}
interface Role {
    id: number;
    name: string;
    display_name?: string;
    description?: string;
    permissions?: Permission[];
    relations?: {
        permissions?: { id: number; name: string; display_name?: string }[];
    };
}
interface User {
    id: number;
    name: string;
    email: string;
    username?: string;
    phone?: string;
    job_title?: string;
    active: boolean;
    last_login_at?: string;
    created_at: string;
    roles?: Role[];
    permissions?: Permission[];
}

// ─── Helpers ────────────────────────────────────
const err2str = (e: unknown, fb = "حدث خطأ") =>
    (e as any)?.response?.data?.message ?? (e as any)?.message ?? fb;
const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-DZ") : "—";
const fmtDT = (d?: string | null) =>
    d
        ? `${fmtDate(d)} ${new Date(d).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`
        : "—";

const AV_COLORS = [
    "linear-gradient(135deg,#0a8a5c,#0dbf84)",
    "linear-gradient(135deg,#1a4fd6,#60a5fa)",
    "linear-gradient(135deg,#6920d4,#a78bfa)",
    "linear-gradient(135deg,#b87d0a,#fbbf24)",
    "linear-gradient(135deg,#0d7a8c,#22d3ee)",
    "linear-gradient(135deg,#c43a0a,#fb923c)",
];
const avColor = (id: number) => AV_COLORS[id % AV_COLORS.length];

const GROUP_COLORS = [
    "#0a8a5c",
    "#1a4fd6",
    "#6920d4",
    "#b87d0a",
    "#0d7a8c",
    "#c43a0a",
];
const gColor = (i: number) => GROUP_COLORS[i % GROUP_COLORS.length];

function Avatar({
    name,
    id,
    size = 38,
}: {
    name: string;
    id: number;
    size?: number;
}) {
    const initials = name
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: size * 0.28,
                flexShrink: 0,
                background: avColor(id),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: size * 0.36,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: -1,
            }}
        >
            {initials}
        </div>
    );
}

function Badge({
    children,
    color = "var(--em)",
    bg = "var(--emb)",
}: {
    children: React.ReactNode;
    color?: string;
    bg?: string;
}) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 9px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                color,
                background: bg,
                whiteSpace: "nowrap",
            }}
        >
            {children}
        </span>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return active ? (
        <Badge color="var(--em)" bg="var(--emb)">
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--em)",
                    display: "inline-block",
                }}
            />
            نشط
        </Badge>
    ) : (
        <Badge color="var(--red)" bg="var(--redb)">
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--red)",
                    display: "inline-block",
                }}
            />
            موقوف
        </Badge>
    );
}

// ─── Button ─────────────────────────────────────
function Btn({
    children,
    onClick,
    variant = "default",
    size = "md",
    disabled,
    loading,
    icon,
    type = "button",
}: {
    children?: React.ReactNode;
    onClick?: () => void | Promise<void>;
    variant?: "default" | "primary" | "danger" | "ghost";
    size?: "sm" | "md" | "xs";
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    type?: "button" | "submit";
}) {
    const styles: Record<string, React.CSSProperties> = {
        default: {
            background: "var(--bg3)",
            border: "1px solid var(--b3)",
            color: "var(--t2)",
        },
        primary: {
            background: "var(--em)",
            border: "1px solid var(--em)",
            color: "#fff",
            boxShadow: "var(--emglow)",
        },
        danger: {
            background: "var(--redb)",
            border: "1px solid var(--redbo)",
            color: "var(--red)",
        },
        ghost: {
            background: "transparent",
            border: "1px solid transparent",
            color: "var(--t3)",
        },
    };
    const pads = { xs: "4px 10px", sm: "7px 14px", md: "9px 18px" };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            style={{
                ...styles[variant],
                padding: pads[size],
                borderRadius: 10,
                fontSize: size === "xs" ? 11 : 13,
                fontWeight: 700,
                cursor: disabled || loading ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "Tajawal, sans-serif",
                transition: ".14s",
                whiteSpace: "nowrap",
            }}
        >
            {loading ? (
                <i
                    className="ti ti-loader"
                    style={{ animation: "spin .8s linear infinite" }}
                />
            ) : (
                icon
            )}
            {children}
        </button>
    );
}

// ─── Form Field ─────────────────────────────────
function Field({
    label,
    req,
    children,
}: {
    label: string;
    req?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label
                style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--t4)",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                }}
            >
                {label}
                {req && (
                    <span style={{ color: "var(--red)", marginRight: 2 }}>
                        *
                    </span>
                )}
            </label>
            {children}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid var(--b3)",
    background: "var(--bg3)",
    color: "var(--t1)",
    fontFamily: "Tajawal, sans-serif",
    fontSize: 13,
    outline: "none",
    transition: ".14s",
};

// ─── Permissions Matrix ──────────────────────────
function PermMatrix({
    permissions,
    selected,
    onChange,
}: {
    permissions: Permission[];
    selected: number[];
    onChange: (ids: number[]) => void;
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
                                return (
                                    <label
                                        key={p.id}
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
                                                ? `${color}15`
                                                : "var(--bg4)",
                                            border: `1px solid ${on ? color + "50" : "transparent"}`,
                                            color: on ? color : "var(--t3)",
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
                                        <i
                                            className={`ti ti-${on ? "check" : "plus"}`}
                                            style={{ fontSize: 9 }}
                                        />
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

// ════════════════════════════════════════════════
// USER DETAIL MODAL
// ════════════════════════════════════════════════
function UserDetailModal({
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
                        onClick={() => toggleActive.mutate()}
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

// ════════════════════════════════════════════════
// USER FORM MODAL
// ════════════════════════════════════════════════
function UserFormModal({
    user,
    roles,
    permissions,
    onClose,
}: {
    user: User | null;
    roles: Role[];
    permissions: Permission[];
    onClose: () => void;
}) {
    const isEdit = !!user;
    const nameRef = useRef<HTMLInputElement>(null);
    const [tab, setTab] = useState<"info" | "perms">("info");
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: "",
        email: "",
        username: "",
        phone: "",
        job_title: "",
        password: "",
        role: "",
        permission_ids: [] as number[],
        active: true,
    });

    useEffect(() => {
        setError("");
        setTab("info");
        if (user) {
            setForm({
                name: user.name ?? "",
                email: user.email ?? "",
                username: user.username ?? "",
                phone: user.phone ?? "",
                job_title: user.job_title ?? "",
                password: "",
                role: user.roles?.[0]?.name ?? "",
                // نجمع: الصلاحيات المباشرة + صلاحيات الدور المُعيَّن
                // user.permissions = Direct Permissions (objects مع id)
                // user.role_permissions = صلاحيات الدور (يرجعها UserResource)
                permission_ids: [
                    ...(user.permissions?.map((p: any) => p.id) ?? []),
                    ...(user.role_permissions?.map((p: any) => p.id) ?? []),
                ],
                active: user.active ?? true,
            });
        } else {
            setForm({
                name: "",
                email: "",
                username: "",
                phone: "",
                job_title: "",
                password: "",
                role: "",
                permission_ids: [],
                active: true,
            });
        }
        setTimeout(() => nameRef.current?.focus(), 80);
    }, [user]);

    const mutation = useTenantMutation(
        (formData: typeof form) =>
            isEdit
                ? usersApi.update(user!.id, formData)
                : usersApi.create(formData),
        (slug) => tenantKeys.users.all(slug),
        {
            onSuccess: () => onClose(),
            onError: (e: any) =>
                setError(err2str(e, isEdit ? "فشل التحديث" : "فشل إنشاء المستخدم")),
        },
    );

    const f =
        <T extends keyof typeof form>(k: T) =>
        (v: (typeof form)[T]) =>
            setForm((prev) => ({ ...prev, [k]: v }));

    const sel_perm_count = form.permission_ids.length;

    return (
        <Modal open onClose={onClose} title={isEdit ? `تعديل: ${user?.name}` : "مستخدم جديد"}
                subtitle={
                    isEdit ? "تحديث بيانات المستخدم" : "إضافة مستخدم إلى الشركة"
                } size="md"
                footer={<>
                    <Btn onClick={onClose}>إلغاء</Btn>
                    <Btn
                        variant="primary"
                        icon={
                            <i
                                className={`ti ti-${isEdit ? "device-floppy" : "user-plus"}`}
                            />
                        }
                        loading={mutation.isPending}
                        onClick={() => mutation.mutate(form)}
                    >
                        {isEdit ? "حفظ التغييرات" : "إنشاء المستخدم"}
                    </Btn>
                </>}>

            {/* Tabs */}
            <div
                style={{
                    display: "flex",
                    borderBottom: "1px solid var(--b2)",
                    padding: "0 20px",
                }}
            >
                {(
                    [
                        {
                            key: "info",
                            label: "المعلومات الأساسية",
                            icon: "ti-user",
                        },
                        {
                            key: "perms",
                            label: `الصلاحيات${sel_perm_count > 0 ? ` (${sel_perm_count})` : ""}`,
                            icon: "ti-lock",
                        },
                    ] as const
                ).map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            padding: "10px 16px",
                            borderBottom: `2px solid ${tab === t.key ? "var(--em)" : "transparent"}`,
                            color: tab === t.key ? "var(--em)" : "var(--t4)",
                            background: "none",
                            borderTop: 0,
                            borderLeft: 0,
                            borderRight: 0,
                            borderBottom: `2px solid ${tab === t.key ? "var(--em)" : "transparent"}`,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "Tajawal, sans-serif",
                            transition: ".13s",
                        }}
                    >
                        <i
                            className={`ti ${t.icon}`}
                            style={{ fontSize: 14 }}
                        />
                        {t.label}
                    </button>
                ))}
            </div>

                {error && (
                    <div
                        style={{
                            padding: "9px 14px",
                            borderRadius: 10,
                            marginBottom: 14,
                            background: "var(--redb)",
                            border: "1px solid var(--redbo)",
                            color: "var(--red)",
                            fontSize: 12,
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                        }}
                    >
                        <i
                            className="ti ti-alert-circle"
                            style={{ flexShrink: 0 }}
                        />
                        {error}
                    </div>
                )}

                {tab === "info" && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12,
                            }}
                        >
                            <Field label="الاسم الكامل" req>
                                <input
                                    ref={nameRef}
                                    value={form.name}
                                    onChange={(e) => f("name")(e.target.value)}
                                    style={inputStyle}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--em)")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--b3)")
                                    }
                                    placeholder="أحمد محمد"
                                />
                            </Field>
                            <Field label="اسم المستخدم">
                                <input
                                    value={form.username}
                                    onChange={(e) =>
                                        f("username")(e.target.value)
                                    }
                                    style={{ ...inputStyle, direction: "ltr" }}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--em)")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--b3)")
                                    }
                                    placeholder="ahmed.mohammed"
                                />
                            </Field>
                        </div>

                        <Field label="البريد الإلكتروني" req>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => f("email")(e.target.value)}
                                style={{ ...inputStyle, direction: "ltr" }}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = "var(--em)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "var(--b3)")
                                }
                                placeholder="ahmed@example.com"
                            />
                        </Field>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12,
                            }}
                        >
                            <Field label="رقم الهاتف">
                                <input
                                    value={form.phone}
                                    onChange={(e) => f("phone")(e.target.value)}
                                    style={{ ...inputStyle, direction: "ltr" }}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--em)")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--b3)")
                                    }
                                    placeholder="0550 000 000"
                                />
                            </Field>
                            <Field label="المسمى الوظيفي">
                                <input
                                    value={form.job_title}
                                    onChange={(e) =>
                                        f("job_title")(e.target.value)
                                    }
                                    style={inputStyle}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--em)")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--b3)")
                                    }
                                    placeholder="محاسب / مدير المبيعات..."
                                />
                            </Field>
                        </div>

                        <Field
                            label={
                                isEdit
                                    ? "كلمة المرور (اتركها فارغة للإبقاء)"
                                    : "كلمة المرور"
                            }
                            req={!isEdit}
                        >
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => f("password")(e.target.value)}
                                style={{ ...inputStyle, direction: "ltr" }}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = "var(--em)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "var(--b3)")
                                }
                                placeholder={
                                    isEdit ? "••••••••" : "كلمة مرور قوية"
                                }
                            />
                        </Field>

                        <Field label="الدور">
                            <select
                                value={form.role}
                                onChange={(e) => f("role")(e.target.value)}
                                style={{ ...inputStyle, cursor: "pointer" }}
                            >
                                <option value="">بدون دور</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.name}>
                                        {r.display_name ?? r.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 14px",
                                borderRadius: 10,
                                background: "var(--bg3)",
                                border: "1px solid var(--b1)",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "var(--t2)",
                                    flex: 1,
                                }}
                            >
                                حالة الحساب
                            </span>
                            <div
                                className={`sw ${form.active ? "on" : ""}`}
                                onClick={() => f("active")(!form.active)}
                            />
                            <span
                                style={{
                                    fontSize: 12,
                                    color: form.active
                                        ? "var(--em)"
                                        : "var(--red)",
                                    fontWeight: 700,
                                    minWidth: 40,
                                }}
                            >
                                {form.active ? "نشط" : "موقوف"}
                            </span>
                        </div>
                    </div>
                )}

                {tab === "perms" && (
                    <div>
                        <div
                            style={{
                                marginBottom: 12,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <span style={{ fontSize: 12, color: "var(--t4)" }}>
                                صلاحيات مباشرة — {sel_perm_count} محدد من{" "}
                                {permissions.length}
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                                <Btn
                                    size="xs"
                                    onClick={() =>
                                        f("permission_ids")(
                                            permissions.map((p) => p.id),
                                        )
                                    }
                                >
                                    تحديد الكل
                                </Btn>
                                <Btn
                                    size="xs"
                                    onClick={() => f("permission_ids")([])}
                                >
                                    إلغاء الكل
                                </Btn>
                            </div>
                        </div>
                        <PermMatrix
                            permissions={permissions}
                            selected={form.permission_ids}
                            onChange={(ids) => f("permission_ids")(ids)}
                        />
                    </div>
                )}
        </Modal>
    );
}

// ════════════════════════════════════════════════
// ROLE FORM MODAL
// ════════════════════════════════════════════════
function RoleFormModal({
    role,
    permissions,
    onClose,
}: {
    role: Role | null;
    permissions: Permission[];
    onClose: () => void;
}) {
    const isEdit = !!role;
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: "",
        display_name: "",
        description: "",
        permission_ids: [] as number[],
    });

    useEffect(() => {
        setError("");
        if (role) {
            const perms = role.permissions ?? role.relations?.permissions ?? [];
            setForm({
                name: role.name ?? "",
                display_name: role.display_name ?? "",
                description: role.description ?? "",
                permission_ids: perms.map((p) => p.id),
            });
        } else {
            setForm({
                name: "",
                display_name: "",
                description: "",
                permission_ids: [],
            });
        }
    }, [role]);

    const mutation = useTenantMutation(
        () => {
            const payload = {
                name: form.name,
                display_name: form.display_name,
                description: form.description,
                permission_ids: form.permission_ids,
            };
            return isEdit
                ? rolesApi.update(role!.id, payload)
                : rolesApi.create(payload);
        },
        (slug) => tenantKeys.lookups.roles(slug),
        {
            onSuccess: () => onClose(),
            onError: (e: any) => setError(err2str(e, "فشل الحفظ")),
        },
    );

    return (
        <Modal open onClose={onClose} title={
                    isEdit
                        ? `تعديل الدور: ${role?.display_name ?? role?.name}`
                        : "دور جديد"
                } subtitle="تحديد الصلاحيات المرتبطة بالدور" size="md"
                footer={<>
                    <Btn onClick={onClose}>إلغاء</Btn>
                    <Btn
                        variant="primary"
                        icon={
                            <i
                                className={`ti ti-${isEdit ? "device-floppy" : "shield-plus"}`}
                            />
                        }
                        loading={mutation.isPending}
                        onClick={() => mutation.mutate()}
                    >
                        {isEdit ? "حفظ التغييرات" : "إنشاء الدور"}
                    </Btn>
                </>}>
                {error && (
                    <div
                        style={{
                            padding: "9px 14px",
                            borderRadius: 10,
                            marginBottom: 14,
                            background: "var(--redb)",
                            border: "1px solid var(--redbo)",
                            color: "var(--red)",
                            fontSize: 12,
                        }}
                    >
                        {error}
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                        }}
                    >
                        <Field label="الاسم التقني" req>
                            <input
                                value={form.name}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        name: e.target.value,
                                    }))
                                }
                                style={{ ...inputStyle, direction: "ltr" }}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = "var(--em)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "var(--b3)")
                                }
                                placeholder="sales-manager"
                                disabled={isEdit}
                            />
                        </Field>
                        <Field label="الاسم المعروض">
                            <input
                                value={form.display_name}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        display_name: e.target.value,
                                    }))
                                }
                                style={inputStyle}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = "var(--em)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "var(--b3)")
                                }
                                placeholder="مدير المبيعات"
                            />
                        </Field>
                    </div>

                    <Field label="الوصف">
                        <textarea
                            value={form.description}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    description: e.target.value,
                                }))
                            }
                            style={{
                                ...inputStyle,
                                resize: "vertical",
                                minHeight: 60,
                            }}
                            onFocus={(e) =>
                                (e.target.style.borderColor = "var(--em)")
                            }
                            onBlur={(e) =>
                                (e.target.style.borderColor = "var(--b3)")
                            }
                            placeholder="وصف مختصر للدور ومهامه..."
                        />
                    </Field>

                    <div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 10,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: "var(--t4)",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                }}
                            >
                                الصلاحيات — {form.permission_ids.length} محدد
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <Btn
                                    size="xs"
                                    onClick={() =>
                                        setForm((f) => ({
                                            ...f,
                                            permission_ids: permissions.map(
                                                (p) => p.id,
                                            ),
                                        }))
                                    }
                                >
                                    تحديد الكل
                                </Btn>
                                <Btn
                                    size="xs"
                                    onClick={() =>
                                        setForm((f) => ({
                                            ...f,
                                            permission_ids: [],
                                        }))
                                    }
                                >
                                    إلغاء الكل
                                </Btn>
                            </div>
                        </div>
                        <PermMatrix
                            permissions={permissions}
                            selected={form.permission_ids}
                            onChange={(ids) =>
                                setForm((f) => ({ ...f, permission_ids: ids }))
                            }
                        />
                    </div>
                </div>
        </Modal>
    );
}

// ════════════════════════════════════════════════
// ROLE DETAIL DRAWER
// ════════════════════════════════════════════════
function RoleDetailModal({
    role,
    onClose,
    onEdit,
}: {
    role: Role | null;
    onClose: () => void;
    onEdit: (r: Role) => void;
}) {
    const notify = useNotification();
    const deleteConfirm = useConfirm();
    const deleteRole = useTenantMutation(
        () => rolesApi.delete(role!.id),
        (slug) => tenantKeys.lookups.roles(slug),
        {
            onSuccess: () => {
                onClose();
                notify.success('تم الحذف');
            },
        },
    );

    if (!role) return null;
    const perms = role.permissions ?? role.relations?.permissions ?? [];
    const groups = perms.reduce<Record<string, typeof perms>>((acc, p) => {
        const g = (p as any).group ?? "عامة";
        if (!acc[g]) acc[g] = [];
        acc[g].push(p);
        return acc;
    }, {});

    return (
        <Modal open onClose={onClose} title={role.display_name ?? role.name} subtitle={role.description ?? "تفاصيل الدور"} size="sm"
            footer={<>
                <Btn
                    variant="danger"
                    icon={<i className="ti ti-trash" />}
                    loading={deleteRole.isPending}
                    onClick={async () => {
                        if (
                            await deleteConfirm.confirm(
                                `حذف دور "${role.display_name ?? role.name}"؟`,
                            )
                        )
                            deleteRole.mutate();
                    }}
                >
                    حذف
                </Btn>
                <Btn onClick={onClose}>إغلاق</Btn>
                <Btn
                    variant="primary"
                    icon={<i className="ti ti-pencil" />}
                    onClick={() => onEdit(role)}
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
                    {/* Info */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                background: "var(--emb)",
                                border: "1px solid var(--embo)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 10,
                                    color: "var(--em)",
                                    fontWeight: 800,
                                    marginBottom: 3,
                                }}
                            >
                                الاسم التقني
                            </div>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "var(--em)",
                                    fontFamily: "monospace",
                                }}
                            >
                                {role.name}
                            </div>
                        </div>
                        <div
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                background: "var(--bg3)",
                                border: "1px solid var(--b1)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 10,
                                    color: "var(--t4)",
                                    fontWeight: 800,
                                    marginBottom: 3,
                                }}
                            >
                                عدد الصلاحيات
                            </div>
                            <div
                                style={{
                                    fontSize: 18,
                                    fontWeight: 900,
                                    color: "var(--t1)",
                                }}
                            >
                                {perms.length}
                            </div>
                        </div>
                    </div>

                    {/* Permissions */}
                    {Object.keys(groups).length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "24px",
                                background: "var(--bg3)",
                                borderRadius: 12,
                                color: "var(--t4)",
                                fontSize: 13,
                            }}
                        >
                            لا توجد صلاحيات مرتبطة
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: "var(--t4)",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                }}
                            >
                                الصلاحيات المرتبطة
                            </div>
                            {Object.entries(groups).map(([grp, ps], gi) => (
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
                                        {grp}{" "}
                                        <span
                                            style={{
                                                opacity: 0.6,
                                                fontWeight: 600,
                                            }}
                                        >
                                            ({ps.length})
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 5,
                                        }}
                                    >
                                        {ps.map((p) => (
                                            <span
                                                key={p.id}
                                                style={{
                                                    fontSize: 11,
                                                    padding: "2px 9px",
                                                    borderRadius: 20,
                                                    background: `${gColor(gi)}18`,
                                                    color: gColor(gi),
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {(p as any).display_name ??
                                                    p.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </Modal>
    );
}

// ════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════
export default function UsersPage() {
    const { activeCompany } = useAuth() as any;
    const slug = activeCompany?.slug as string | undefined;

    const [mainTab, setMainTab] = useState<"users" | "roles" | "permissions">(
        "users",
    );
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

    // User modals
    const [viewUser, setViewUser] = useState<User | null>(null);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [showAdd, setShowAdd] = useState(false);

    // Role modals
    const [viewRole, setViewRole] = useState<Role | null>(null);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [showAddRole, setShowAddRole] = useState(false);

    const notify = useNotification();
    const deleteConfirm = useConfirm();

    // ─── Queries ───────────────────────────────────
    const {
        data: users = [],
        isLoading: usersLoading,
    } = useTenantQuery<User[]>(
        (slug) => tenantKeys.users.list(slug, { search: search || undefined, per_page: 100, include: 'roles,permissions' }),
        () => usersApi.list({ search: search || undefined, per_page: 100, include: 'roles,permissions' } as any).then(
            (res: any) => res?.data ?? [],
        ),
        { staleTime: 30_000 },
    );

    const { data: roles = [], isLoading: rolesLoading } = useRoles();

    const { data: permsData, isLoading: permsLoading } = usePermissions();
    const permissions = Array.isArray(permsData) ? permsData : [];

    // ─── Mutations ─────────────────────────────────
    const deleteUser = useTenantMutation(
        (id: number) => usersApi.delete(id),
        (slug) => tenantKeys.users.all(slug),
        {
            onSuccess: () => notify.success('تم الحذف'),
        },
    );

    // ─── Filtered users ────────────────────────────
    const filteredUsers = users.filter((u) => {
        if (filter === "active" && !u.active) return false;
        if (filter === "inactive" && u.active) return false;
        return true;
    });

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

    if (!slug)
        return (
            <div className="page on">
                <div className="empty">
                    <div className="empty-tx">تحميل...</div>
                </div>
            </div>
        );

    return (
        <>


            <div
                className="page on"
                id="p-users"
                style={{ animation: "slideIn .25s ease" }}
            >
                {/* ── Header ── */}
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

                {/* ── Main Tabs ── */}
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

                {/* ══════════ USERS TAB ══════════ */}
                {mainTab === "users" && (
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
                                    <div
                                        key={u.id}
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

                                        {/* Role */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                            }}
                                        >
                                            {u.roles?.[0] ? (
                                                <Badge
                                                    color="var(--purple)"
                                                    bg="var(--purb)"
                                                >
                                                    <i
                                                        className="ti ti-shield-half"
                                                        style={{ fontSize: 9 }}
                                                    />
                                                    {u.roles[0].display_name ??
                                                        u.roles[0].name}
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    color="var(--t4)"
                                                    bg="var(--bg4)"
                                                >
                                                    بدون دور
                                                </Badge>
                                            )}
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
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════ ROLES TAB ══════════ */}
                {mainTab === "roles" && (
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
                                        role.relations?.permissions ??
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
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
                )}

                {/* ══════════ PERMISSIONS TAB ══════════ */}
                {mainTab === "permissions" && (
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
                )}
            </div>

            {/* ── Modals ── */}
            {viewUser && (
                <UserDetailModal
                    user={viewUser}
                    onClose={() => setViewUser(null)}
                    onEdit={(u) => {
                        setViewUser(null);
                        setEditUser(u);
                    }}
                />
            )}
            {(showAdd || editUser) && (
                <UserFormModal
                    user={editUser}
                    roles={roles}
                    permissions={permissions}
                    onClose={() => {
                        setShowAdd(false);
                        setEditUser(null);
                    }}
                />
            )}
            {viewRole && (
                <RoleDetailModal
                    role={viewRole}
                    onClose={() => setViewRole(null)}
                    onEdit={(r) => {
                        setViewRole(null);
                        setEditRole(r);
                    }}
                />
            )}
            {(showAddRole || editRole) && (
                <RoleFormModal
                    role={editRole}
                    permissions={permissions}
                    onClose={() => {
                        setShowAddRole(false);
                        setEditRole(null);
                    }}
                />
            )}
            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </>
    );
}
