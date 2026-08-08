import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { SecHead } from "./_shared";

// ─── PLANS_META — خطة الشركة الحالية ─────────────────────────────────────────
export const PLANS_META: Record<
    string,
    {
        labelAr: string;
        code: string;
        color: string;
        icon: string;
        features: string[];
    }
> = {
    free: {
        labelAr: "مجاني",
        code: "FREE",
        color: "#64748b",
        icon: "ti-leaf",
        features: ["وظائف أساسية", "فاتورة يدوية", "تقارير محدودة"],
    },
    starter: {
        labelAr: "ستارتر",
        code: "STARTER",
        color: "#3b82f6",
        icon: "ti-rocket",
        features: ["كل وظائف Free", "تقارير متقدمة", "مستودعات متعددة"],
    },
    professional: {
        labelAr: "احترافي",
        code: "PRO",
        color: "#0a7c52",
        icon: "ti-crown",
        features: ["كل وظائف Starter", "منتجات غير محدودة", "API كامل"],
    },
    enterprise: {
        labelAr: "مؤسسي",
        code: "ENTERPRISE",
        color: "#d97706",
        icon: "ti-building-skyscraper",
        features: ["كل شيء في Pro", "دعم 24/7", "SLA مضمون"],
    },
};

// ─── PlanTab — عرض الخطة الحالية والحدود المتاحة ─────────────────────────────
export function PlanTab() {
    // ✅ activeCompany من AuthContext بدل useCurrentCompany (يمنع 404)
    const { activeCompany: company } = useAuth();
    const plan = (company as any)?.plan ?? "free";
    const details = PLANS_META[plan] ?? PLANS_META.free;

    return (
        <div
            style={{
                maxWidth: 640,
                display: "flex",
                flexDirection: "column",
                gap: 14,
            }}
        >
            <Card>
                <div
                    style={{
                        display: "flex",
                        gap: 16,
                        alignItems: "flex-start",
                    }}
                >
                    <div
                        style={{
                            width: 58,
                            height: 58,
                            borderRadius: 14,
                            flexShrink: 0,
                            background: `${details.color}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <i
                            className={`ti ${details.icon}`}
                            style={{ fontSize: 25, color: details.color }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 6,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 20,
                                    fontWeight: 900,
                                    color: details.color,
                                }}
                            >
                                {details.labelAr}
                            </span>
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: "2px 8px",
                                    borderRadius: 20,
                                    background: `${details.color}18`,
                                    color: details.color,
                                }}
                            >
                                {details.code}
                            </span>
                            <Badge variant="success">الخطة النشطة</Badge>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                            }}
                        >
                            {details.features.map((f) => (
                                <span
                                    key={f}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        fontSize: 12,
                                        color: "var(--t2)",
                                    }}
                                >
                                    <i
                                        className="ti ti-check"
                                        style={{
                                            color: details.color,
                                            fontSize: 12,
                                        }}
                                    />
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-chart-bar"
                    label="الحدود المتاحة"
                    color="var(--blue)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {[
                        {
                            label: "المستخدمون",
                            icon: "ti-users",
                            max: company?.max_users,
                        },
                        {
                            label: "المستودعات",
                            icon: "ti-building-warehouse",
                            max: company?.max_warehouses,
                        },
                        {
                            label: "المنتجات",
                            icon: "ti-box",
                            max: company?.max_products,
                        },
                    ].map(({ label, icon, max }) => (
                        <div
                            key={label}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 14px",
                                background: "var(--bg3)",
                                borderRadius: "var(--r2)",
                                border: "1px solid var(--b2)",
                            }}
                        >
                            <i
                                className={`ti ${icon}`}
                                style={{
                                    fontSize: 16,
                                    color: "var(--em)",
                                    width: 20,
                                }}
                            />
                            <span
                                style={{
                                    flex: 1,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "var(--t1)",
                                }}
                            >
                                {label}
                            </span>
                            <span
                                style={{
                                    fontFamily: "monospace",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "var(--t2)",
                                }}
                            >
                                {max == null
                                    ? "∞ غير محدود"
                                    : `الحد: ${max.toLocaleString("fr-DZ")}`}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>

            {company?.trial_ends_at && (
                <div
                    style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        background:
                            "color-mix(in srgb, var(--gold) 10%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    <i
                        className="ti ti-clock-hour-4"
                        style={{
                            fontSize: 22,
                            color: "var(--gold)",
                            flexShrink: 0,
                        }}
                    />
                    <div>
                        <div
                            style={{
                                fontWeight: 700,
                                fontSize: 13,
                                color: "var(--t1)",
                            }}
                        >
                            فترة التجربة نشطة
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--t4)",
                                marginTop: 2,
                            }}
                        >
                            تنتهي في{" "}
                            {new Date(company.trial_ends_at).toLocaleDateString(
                                "fr-DZ",
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div
                style={{
                    padding: "11px 15px",
                    borderRadius: 10,
                    background:
                        "color-mix(in srgb, var(--em) 7%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--em) 20%, transparent)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                }}
            >
                <i
                    className="ti ti-info-circle"
                    style={{
                        fontSize: 16,
                        color: "var(--em)",
                        marginTop: 1,
                        flexShrink: 0,
                    }}
                />
                <p
                    style={{
                        margin: 0,
                        fontSize: 12,
                        color: "var(--t2)",
                        lineHeight: 1.6,
                    }}
                >
                    لترقية خطتك أو تعديل الحدود، تواصل مع مدير النظام.{" "}
                    <strong style={{ color: "var(--em)" }}>
                        تغيير الخطة متاح من لوحة تحكم المدير فقط.
                    </strong>
                </p>
            </div>
        </div>
    );
}
