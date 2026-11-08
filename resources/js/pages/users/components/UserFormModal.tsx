// resources/js/pages/users/components/UserFormModal.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { usersApi } from "@/lib/api/endpoints/users";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useTenantMutation } from "@/hooks/useTenantQuery";
import Modal from "@/components/ui/Modal";
import type { Permission, Role, User } from "../types";
import { err2str } from "../utils";
import Btn from "./Btn";
import UserFormInfoTab from "./UserFormInfoTab";
import UserFormPermsTab from "./UserFormPermsTab";

// ════════════════════════════════════════════════
// USER FORM MODAL
// ════════════════════════════════════════════════
export default function UserFormModal({
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
                // الصلاحيات المباشرة فقط (غير ممنوحة عبر الدور)
                permission_ids: [
                    ...(user.permissions?.map((p: any) => p.id) ?? []),
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

    // صلاحيات الدور المُعيَّن (للعرض فقط — غير قابلة للتعديل)
    const roleDerivedPerms = useMemo(() => {
        if (!isEdit || !form.role) return [] as Permission[];
        const selectedRole = roles.find((r) => r.name === form.role);
        return selectedRole?.permissions ?? [];
    }, [isEdit, form.role, roles]);

    const roleDerivedIds = useMemo(
        () => new Set(roleDerivedPerms.map((p) => p.id)),
        [roleDerivedPerms],
    );

    return (
        <Modal open onClose={onClose} closeOnBackdrop={false} title={isEdit ? `تعديل: ${user?.name}` : "مستخدم جديد"}
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
                            color: tab === t.key ? "var(--em)" : "var(--t4)",
                            background: "none",
                            border: 0,
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
                    <UserFormInfoTab
                        form={form}
                        f={f}
                        nameRef={nameRef}
                        isEdit={isEdit}
                        roles={roles}
                    />
                )}

                {tab === "perms" && (
                    <UserFormPermsTab
                        form={form}
                        f={f}
                        isEdit={isEdit}
                        roles={roles}
                        permissions={permissions}
                        roleDerivedPerms={roleDerivedPerms}
                        roleDerivedIds={roleDerivedIds}
                        sel_perm_count={sel_perm_count}
                    />
                )}
        </Modal>
    );
}
