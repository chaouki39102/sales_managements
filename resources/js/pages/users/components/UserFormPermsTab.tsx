// resources/js/pages/users/components/UserFormPermsTab.tsx — تبويب الصلاحيات المباشرة
import type { Permission, Role, UserFormState } from "../types";
import Btn from "./Btn";
import PermMatrix from "./PermMatrix";

export default function UserFormPermsTab({
    form,
    f,
    isEdit,
    roles,
    permissions,
    roleDerivedPerms,
    roleDerivedIds,
    sel_perm_count,
}: {
    form: UserFormState;
    f: <T extends keyof UserFormState>(k: T) => (v: UserFormState[T]) => void;
    isEdit: boolean;
    roles: Role[];
    permissions: Permission[];
    roleDerivedPerms: Permission[];
    roleDerivedIds: Set<number>;
    sel_perm_count: number;
}) {
    return (
        <div>
            {/* ── صلاحيات الدور (للعرض فقط) ── */}
            {isEdit && roleDerivedPerms.length > 0 && (
                <div
                    style={{
                        marginBottom: 14,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "var(--bg3)",
                        border: "1px solid var(--b1)",
                    }}
                >
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--t3)",
                            display: "block",
                            marginBottom: 8,
                        }}
                    >
                        <i className="ti ti-shield" style={{ marginInlineEnd: 4 }} />
                        صلاحيات ممنوحة عبر الدور —{" "}
                        {roles.find((r) => r.name === form.role)?.display_name ??
                            form.role}{" "}
                        ({roleDerivedPerms.length})
                    </span>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 5,
                        }}
                    >
                        {roleDerivedPerms.map((p) => (
                            <span
                                key={p.id}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "3px 9px",
                                    borderRadius: 16,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    background: "var(--bg4)",
                                    color: "var(--t4)",
                                    border: "1px solid var(--b2)",
                                }}
                            >
                                <i className="ti ti-lock" style={{ fontSize: 8 }} />
                                {p.display_name ?? p.name}
                            </span>
                        ))}
                    </div>
                    <span
                        style={{
                            fontSize: 10,
                            color: "var(--t4)",
                            display: "block",
                            marginTop: 6,
                        }}
                    >
                        تُدار من محرر الأدوار — الإضافة أدناه تُنشئ صلاحية مباشرة إضافية
                    </span>
                </div>
            )}

            {/* ── مصفوفة الصلاحيات المباشرة ── */}
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
                    {roleDerivedIds.size > 0 && (
                        <> (+{roleDerivedIds.size} من الدور)</>
                    )}
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
                roleDerivedIds={isEdit ? roleDerivedIds : undefined}
            />
        </div>
    );
}
