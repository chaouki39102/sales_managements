// resources/js/pages/users/components/RoleDetailModal.tsx
import { rolesApi } from "@/lib/api/endpoints/users";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useTenantMutation } from "@/hooks/useTenantQuery";
import { useNotification } from "@/hooks/useNotification";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "@/components/ui";
import Modal from "@/components/ui/Modal";
import type { Role } from "../types";
import { gColor } from "../constants";
import Btn from "./Btn";

// ════════════════════════════════════════════════
// ROLE DETAIL DRAWER
// ════════════════════════════════════════════════
export default function RoleDetailModal({
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
                            deleteRole.mutate(undefined);
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
