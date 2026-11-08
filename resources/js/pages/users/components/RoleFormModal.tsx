// resources/js/pages/users/components/RoleFormModal.tsx
import { useState, useEffect } from "react";
import { rolesApi } from "@/lib/api/endpoints/users";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useTenantMutation } from "@/hooks/useTenantQuery";
import Modal from "@/components/ui/Modal";
import type { Permission, Role } from "../types";
import { err2str } from "../utils";
import { inputStyle } from "../constants";
import Btn from "./Btn";
import Field from "./Field";
import PermMatrix from "./PermMatrix";

// ════════════════════════════════════════════════
// ROLE FORM MODAL
// ════════════════════════════════════════════════
export default function RoleFormModal({
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
                        onClick={() => mutation.mutate(undefined)}
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
