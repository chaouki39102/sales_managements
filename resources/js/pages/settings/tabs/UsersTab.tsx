import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import SimpleTable from "@/components/ui/SimpleTable";
import { useCompanyMemberMutations } from "@/lib/api/endpoints/companies";
import { apiGet } from "@/lib/api/core/client";
import { companyKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug } from "@/lib/store/appStore";
import { useAuth } from "@/context/AuthContext";
import { SecHead } from "./_shared";

export function UsersTab() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    // ✅ activeCompany من AuthContext بدل useCurrentCompany (يمنع 404)
    const { activeCompany: company } = useAuth();
    const mutations = useCompanyMemberMutations(slug);

    const { data: members = [], isLoading } = useQuery({
        queryKey: ["companies", slug, "members"],
        queryFn: () => apiGet<any[]>(`/companies/${slug}/members`),
        enabled: !!slug,
        staleTime: 2 * 60_000,
    });

    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [inviteError, setInviteError] = useState("");
    const [inviting, setInviting] = useState(false);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) {
            setInviteError("البريد الإلكتروني مطلوب");
            return;
        }
        setInviting(true);
        setInviteError("");

        try {
            const users = await apiGet<any[]>(
                `/companies/${slug}/users/search`,
                { email: inviteEmail.trim() } as any,
            );

            // ✅ تأكد من أن الـ response array
            const list = Array.isArray(users)
                ? users
                : ((users as any)?.data ?? []);
            const found = list[0];

            if (!found) {
                setInviteError("لم يُعثر على مستخدم بهذا البريد");
                setInviting(false);
                return;
            }

            // ✅ استخرج id بأمان من أي صيغة محتملة
            const userId = Number(
                found.id ?? found.user_id ?? found.pivot?.user_id,
            );

            if (!userId || isNaN(userId)) {
                setInviteError("تعذّر تحديد هوية المستخدم");
                setInviting(false);
                return;
            }

            await mutations.add.mutateAsync({ userId, role: inviteRole });
            qc.invalidateQueries({ queryKey: companyKeys.members(slug) });
            setShowInvite(false);
            setInviteEmail("");
            setInviteRole("member");
        } catch (err: unknown) {
            const e = err as any;
            // ✅ اعرض رسالة الـ validation إذا وجدت
            const msg =
                e?.errors?.user_id?.[0] ?? e?.message ?? "فشل إضافة العضو";
            setInviteError(msg);
        } finally {
            setInviting(false);
        }
    };

    const roleLabel: Record<string, { label: string; color: string }> = {
        owner: { label: "مالك", color: "var(--gold)" },
        admin: { label: "مدير", color: "var(--em)" },
        manager: { label: "مشرف", color: "var(--blue)" },
        member: { label: "عضو", color: "var(--t3)" },
        viewer: { label: "مُشاهد", color: "var(--t4)" },
    };

    const totalMembers = (members as any[]).length;
    const activeMembers = (members as any[]).filter(
        (m: any) => m.active,
    ).length;
    const maxUsers = (company as any)?.max_users;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                maxWidth: 760,
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 12,
                }}
            >
                {[
                    {
                        label: "إجمالي الأعضاء",
                        value: totalMembers,
                        icon: "ti-users",
                        color: "var(--blue)",
                        max: maxUsers,
                    },
                    {
                        label: "الأعضاء النشطون",
                        value: activeMembers,
                        icon: "ti-user-check",
                        color: "var(--em)",
                        max: null,
                    },
                    {
                        label: "الحد الأقصى",
                        value: maxUsers == null ? "∞" : maxUsers,
                        icon: "ti-lock",
                        color: "var(--t3)",
                        max: null,
                    },
                ].map(({ label, value, icon, color, max }) => (
                    <div
                        key={label}
                        style={{
                            padding: "14px 16px",
                            background: "var(--bg3)",
                            borderRadius: 12,
                            border: "1px solid var(--b2)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 6,
                            }}
                        >
                            <i
                                className={`ti ${icon}`}
                                style={{ fontSize: 16, color }}
                            />
                            <span style={{ fontSize: 11, color: "var(--t4)" }}>
                                {label}
                            </span>
                        </div>
                        <div
                            style={{
                                fontSize: 22,
                                fontWeight: 900,
                                color,
                                fontFamily: "monospace",
                            }}
                        >
                            {value}
                        </div>
                        {max != null && (
                            <div
                                style={{
                                    marginTop: 4,
                                    height: 4,
                                    background: "var(--b2)",
                                    borderRadius: 2,
                                }}
                            >
                                <div
                                    style={{
                                        height: "100%",
                                        width: `${Math.min(100, (totalMembers / (max as number)) * 100)}%`,
                                        background: color,
                                        borderRadius: 2,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Card>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 14,
                    }}
                >
                    <SecHead icon="ti-users" label="أعضاء الشركة" />
                    <Button
                        variant="primary"
                        size="sm"
                        icon={
                            <i
                                className={`ti ${showInvite ? "ti-x" : "ti-user-plus"}`}
                            />
                        }
                        onClick={() => {
                            setShowInvite((v) => !v);
                            setInviteError("");
                        }}
                    >
                        {showInvite ? "إلغاء" : "دعوة عضو جديد"}
                    </Button>
                </div>

                {showInvite && (
                    <div
                        style={{
                            marginBottom: 16,
                            padding: "14px 16px",
                            background: "var(--bg3)",
                            borderRadius: 10,
                            border: "1px solid var(--b2)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                alignItems: "flex-end",
                            }}
                        >
                            <div
                                className="fg"
                                style={{ flex: 2, minWidth: 200 }}
                            >
                                <label
                                    style={{ fontSize: 11, color: "var(--t4)" }}
                                >
                                    البريد الإلكتروني
                                </label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => {
                                        setInviteEmail(e.target.value);
                                        setInviteError("");
                                    }}
                                    placeholder="user@example.com"
                                    style={{ marginTop: 4 }}
                                />
                            </div>
                            <div
                                className="fg"
                                style={{ flex: 1, minWidth: 140 }}
                            >
                                <label
                                    style={{ fontSize: 11, color: "var(--t4)" }}
                                >
                                    الدور
                                </label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) =>
                                        setInviteRole(e.target.value)
                                    }
                                    style={{ marginTop: 4 }}
                                >
                                    <option value="admin">مدير</option>
                                    <option value="manager">مشرف</option>
                                    <option value="member">عضو</option>
                                    <option value="viewer">مُشاهد</option>
                                </select>
                            </div>
                            <Button
                                variant="primary"
                                onClick={handleInvite}
                                disabled={inviting}
                            >
                                {inviting ? "جاري الإضافة..." : "إضافة"}
                            </Button>
                        </div>
                        {inviteError && (
                            <div
                                style={{
                                    marginTop: 8,
                                    fontSize: 11,
                                    color: "var(--red)",
                                }}
                            >
                                {inviteError}
                            </div>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div
                        style={{
                            textAlign: "center",
                            padding: 20,
                            color: "var(--t4)",
                        }}
                    >
                        <i className="ti ti-loader" /> تحميل...
                    </div>
                ) : (
                    <SimpleTable
                        columns={[
                            {
                                key: "name",
                                label: "المستخدم",
                                render: (_v, row) => {
                                    const m = row as any;
                                    return (
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--emb)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "var(--em)", flexShrink: 0 }}>
                                                {(m.user?.name ?? m.name ?? "?")[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.user?.name ?? m.name}</div>
                                                <div style={{ fontSize: 11, color: "var(--t4)" }}>{m.user?.email ?? m.email}</div>
                                            </div>
                                        </div>
                                    );
                                },
                            },
                            {
                                key: "role",
                                label: "الدور",
                                render: (v) => {
                                    const role = roleLabel[v as string] ?? { label: v as string, color: "var(--t3)" };
                                    return (
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: `color-mix(in srgb, ${role.color} 15%, transparent)`, color: role.color }}>
                                            {role.label}
                                        </span>
                                    );
                                },
                            },
                            {
                                key: "joined_at",
                                label: "انضم في",
                                render: (v) => (
                                    <span style={{ fontSize: 12, color: "var(--t4)" }}>
                                        {v ? new Date(v as string).toLocaleDateString("fr-DZ") : "—"}
                                    </span>
                                ),
                            },
                            {
                                key: "active",
                                label: "الحالة",
                                render: (v) => (
                                    <Badge variant={v ? "success" : "danger"}>
                                        {v ? "نشط" : "معطّل"}
                                    </Badge>
                                ),
                            },
                            {
                                key: "id",
                                label: "",
                                render: (_v, row) => {
                                    const m = row as any;
                                    const userId = m.user?.id ?? m.id;
                                    return (
                                        <div style={{ display: "flex", gap: 4 }}>
                                            {m.active ? (
                                                <Button size="xs" variant="warning" icon={<i className="ti ti-user-off" />} onClick={() => mutations.deactivate.mutateAsync(userId)} />
                                            ) : (
                                                <Button size="xs" variant="success" icon={<i className="ti ti-user-check" />} onClick={() => mutations.activate.mutateAsync(userId)} />
                                            )}
                                            {m.role !== "owner" && (
                                                <Button size="xs" variant="danger" icon={<i className="ti ti-user-minus" />} onClick={() => mutations.remove.mutateAsync(userId)} />
                                            )}
                                        </div>
                                    );
                                },
                            },
                        ]}
                        data={(members as any[])}
                        rowKey={(row) => String(row.id ?? row.user_id)}
                        emptyText="لا يوجد أعضاء"
                    />
                )}
            </Card>

            <Card>
                <SecHead
                    icon="ti-external-link"
                    label="روابط سريعة"
                    color="var(--t3)"
                />
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                    }}
                >
                    {[
                        {
                            label: "إدارة المستخدمين",
                            icon: "ti-users",
                            path: "/users",
                        },
                        {
                            label: "الأدوار والصلاحيات",
                            icon: "ti-shield-check",
                            path: "/roles",
                        },
                        {
                            label: "إدارة الموظفين",
                            icon: "ti-id-badge",
                            path: "/employees",
                        },
                        {
                            label: "سجل النشاطات",
                            icon: "ti-history",
                            path: "/activity",
                        },
                    ].map(({ label, icon, path }) => (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 14px",
                                borderRadius: 10,
                                border: "1px solid var(--b2)",
                                background: "var(--bg3)",
                                cursor: "pointer",
                                fontFamily: "Tajawal, sans-serif",
                                transition: ".15s",
                            }}
                            onMouseEnter={(e) => {
                                (
                                    e.currentTarget as HTMLElement
                                ).style.borderColor = "var(--em)";
                            }}
                            onMouseLeave={(e) => {
                                (
                                    e.currentTarget as HTMLElement
                                ).style.borderColor = "var(--b2)";
                            }}
                        >
                            <i
                                className={`ti ${icon}`}
                                style={{ fontSize: 18, color: "var(--em)" }}
                            />
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "var(--t1)",
                                }}
                            >
                                {label}
                            </span>
                            <i
                                className="ti ti-chevron-left"
                                style={{
                                    fontSize: 12,
                                    color: "var(--t4)",
                                    marginRight: "auto",
                                }}
                            />
                        </button>
                    ))}
                </div>
            </Card>
        </div>
    );
}
