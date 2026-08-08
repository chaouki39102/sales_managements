import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiGet, apiPost } from "@/lib/api/core/client";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug } from "@/lib/store/appStore";
import { SecHead, SaveButton, useDirtyState } from "./_shared";

// ─── ConversionsTab — خريطة التحويل بين أنواع المستندات ──────────────────────
export function ConversionsTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();
    const [rules, setRules] = useState<
        Array<{
            id?: number;
            source_code: string;
            target_code: string;
            display_order: number;
        }>
    >([]);
    const [saveErr, setSaveErr] = useState("");
    const [saving, setSaving] = useState(false);

    const { data: docTypes = [], isLoading: loadingTypes } = useQuery({
        queryKey: [slug, "document-type-conversions", "document-types"],
        queryFn: () => apiGet<any[]>("/document-type-conversions/document-types"),
        enabled: !!slug,
        staleTime: 10 * 60_000,
    });

    const { data: fetchedRules = [], isLoading: loadingRules } = useQuery({
        queryKey: tenantKeys.conversions.all(slug),
        queryFn: () => apiGet<any[]>("/document-type-conversions"),
        enabled: !!slug,
    });

    useEffect(() => {
        if (fetchedRules.length > 0 && rules.length === 0) {
            setRules(
                fetchedRules.map((r) => ({
                    id: r.id,
                    source_code: r.source_code,
                    target_code: r.target_code,
                    display_order: r.display_order ?? 0,
                })),
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchedRules]);

    const seedDefaults = useCallback(() => {
        const defaults: Array<{
            source_code: string;
            target_code: string;
            display_order: number;
        }> = [
            { source_code: "DEV", target_code: "BCC", display_order: 1 },
            { source_code: "DEV", target_code: "BL", display_order: 2 },
            { source_code: "DEV", target_code: "FV", display_order: 3 },
            { source_code: "BCC", target_code: "BL", display_order: 1 },
            { source_code: "BCC", target_code: "FV", display_order: 2 },
            { source_code: "BL", target_code: "FV", display_order: 1 },
            { source_code: "DDP", target_code: "BCF", display_order: 1 },
            { source_code: "BCF", target_code: "BR", display_order: 1 },
            { source_code: "BCF", target_code: "FA", display_order: 2 },
            { source_code: "BR", target_code: "FA", display_order: 1 },
        ];
        setRules(defaults);
        markDirty();
        onDirty?.();
    }, [markDirty, onDirty]);

    const addRule = useCallback(() => {
        const firstType = docTypes[0]?.code ?? "";
        setRules((prev) => [
            ...prev,
            {
                source_code: firstType,
                target_code: firstType,
                display_order: prev.length,
            },
        ]);
        markDirty();
        onDirty?.();
    }, [docTypes, markDirty, onDirty]);

    const removeRule = useCallback(
        (idx: number) => {
            setRules((prev) => prev.filter((_, i) => i !== idx));
            markDirty();
            onDirty?.();
        },
        [markDirty, onDirty],
    );

    const updateRule = useCallback(
        (idx: number, field: string, value: string | number) => {
            setRules((prev) =>
                prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
            );
            markDirty();
            onDirty?.();
        },
        [markDirty, onDirty],
    );

    const handleSave = useCallback(async () => {
        setSaveErr("");
        setSaving(true);
        try {
            await apiPost("/document-type-conversions/bulk-update", {
                conversions: rules,
            });
            await qc.invalidateQueries({
                queryKey: tenantKeys.conversions.all(slug),
            });
            markClean();
            onClean?.();
        } catch (e: unknown) {
            setSaveErr(
                String(
                    (e as Record<string, unknown>)?.message ?? "فشل الحفظ",
                ),
            );
        } finally {
            setSaving(false);
        }
    }, [rules, slug, qc, markClean, onClean]);

    const isLoading = loadingTypes || loadingRules;

    return (
        <div style={{ maxWidth: 760 }}>
            <Card>
                <SecHead
                    icon="ti-transfer"
                    label="خريطة التحويل بين أنواع المستندات"
                    sub="حدد أنواع المستندات التي يمكن التحويل منها وإليها"
                />
                {saveErr && (
                    <div
                        style={{
                            padding: "8px 12px",
                            borderRadius: "var(--r2)",
                            marginBottom: 12,
                            background: "var(--redb)",
                            border: "1px solid var(--red)",
                            color: "var(--red)",
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    >
                        {saveErr}
                    </div>
                )}
                {isLoading ? (
                    <div
                        style={{
                            padding: 20,
                            textAlign: "center",
                            color: "var(--t4)",
                            fontSize: 13,
                        }}
                    >
                        <i
                            className="ti ti-loader"
                            style={{
                                animation: "spin 1s linear infinite",
                                marginLeft: 6,
                            }}
                        />
                        جاري التحميل...
                    </div>
                ) : rules.length === 0 ? (
                    <div
                        style={{
                            padding: "20px 0",
                            textAlign: "center",
                            color: "var(--t4)",
                            fontSize: 13,
                        }}
                    >
                        لا توجد قواعد تحويل بعد.
                        <div
                            style={{
                                marginTop: 10,
                                display: "flex",
                                gap: 8,
                                justifyContent: "center",
                            }}
                        >
                            <Button
                                size="sm"
                                variant="outline"
                                icon={<i className="ti ti-plus" />}
                                onClick={addRule}
                            >
                                إضافة قاعدة يدوياً
                            </Button>
                            <Button
                                size="sm"
                                variant="primary"
                                icon={<i className="ti ti-refresh" />}
                                onClick={seedDefaults}
                            >
                                استعادة الإعدادات الافتراضية
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="tw" style={{ marginBottom: 12 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>#</th>
                                    <th>من (المصدر)</th>
                                    <th>إلى (الهدف)</th>
                                    <th style={{ width: 80 }}>الترتيب</th>
                                    <th style={{ width: 50 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map((rule, idx) => (
                                    <tr key={idx}>
                                        <td
                                            style={{
                                                color: "var(--t4)",
                                                fontSize: 11,
                                            }}
                                        >
                                            {idx + 1}
                                        </td>
                                        <td>
                                            <select
                                                value={rule.source_code}
                                                onChange={(e) =>
                                                    updateRule(
                                                        idx,
                                                        "source_code",
                                                        e.target.value,
                                                    )
                                                }
                                                style={{
                                                    width: "100%",
                                                    padding: "5px 8px",
                                                    borderRadius: "var(--r1)",
                                                    border: "1px solid var(--b3)",
                                                    background: "var(--bg1)",
                                                    color: "var(--t1)",
                                                    fontSize: 12,
                                                    fontFamily: "inherit",
                                                }}
                                            >
                                                {docTypes.map((dt: any) => (
                                                    <option
                                                        key={dt.code}
                                                        value={dt.code}
                                                    >
                                                        {dt.code} · {dt.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                value={rule.target_code}
                                                onChange={(e) =>
                                                    updateRule(
                                                        idx,
                                                        "target_code",
                                                        e.target.value,
                                                    )
                                                }
                                                style={{
                                                    width: "100%",
                                                    padding: "5px 8px",
                                                    borderRadius: "var(--r1)",
                                                    border: "1px solid var(--b3)",
                                                    background: "var(--bg1)",
                                                    color: "var(--t1)",
                                                    fontSize: 12,
                                                    fontFamily: "inherit",
                                                }}
                                            >
                                                {docTypes.map((dt: any) => (
                                                    <option
                                                        key={dt.code}
                                                        value={dt.code}
                                                    >
                                                        {dt.code} · {dt.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min={0}
                                                value={rule.display_order}
                                                onChange={(e) =>
                                                    updateRule(
                                                        idx,
                                                        "display_order",
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                                style={{
                                                    width: "100%",
                                                    padding: "5px 8px",
                                                    borderRadius: "var(--r1)",
                                                    border: "1px solid var(--b3)",
                                                    background: "var(--bg1)",
                                                    color: "var(--t1)",
                                                    fontSize: 12,
                                                    fontFamily: "inherit",
                                                    boxSizing: "border-box",
                                                }}
                                            />
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => removeRule(idx)}
                                                style={{
                                                    padding: "4px 8px",
                                                    borderRadius: "var(--r1)",
                                                    border: "1px solid var(--red)",
                                                    background: "transparent",
                                                    color: "var(--red)",
                                                    cursor: "pointer",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                }}
                                                title="حذف"
                                            >
                                                <i className="ti ti-trash" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Button
                    size="sm"
                    variant="outline"
                    icon={<i className="ti ti-plus" />}
                    onClick={addRule}
                >
                    إضافة قاعدة
                </Button>
            </Card>
            <SaveButton
                onClick={handleSave}
                loading={saving}
                isDirty={isDirty}
                onClean={() => {
                    markClean();
                    onClean?.();
                }}
            />
        </div>
    );
}
