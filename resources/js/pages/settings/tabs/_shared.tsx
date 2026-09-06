// pages/settings/tabs/_shared.tsx — أدوات ومكوّنات مشتركة بين تبويبات الإعدادات
//
// كل ما يُستعمل في أكثر من تبويب يعيش هنا (TABS، hooks، أزرار الحفظ، البحث، التصدير...)
// التبويبات نفسها في ملفات <Tab>.tsx والـ shell في pages/settings/SettingsPage.tsx

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import {
    settingsApi,
    useSettingsByGroup,
} from "@/lib/api/endpoints/settings";
import { useActiveSlug } from "@/lib/store/appStore";
import { tenantKeys } from "@/lib/api/core/queryKeys";

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export const TABS = [
    { id: "company", label: "المؤسسة", icon: "ti-building" },
    { id: "invoice", label: "تصاميم الفاتورة", icon: "ti-file-invoice" },
    { id: "fiscal", label: "المالية والضرائب", icon: "ti-calculator" },
    { id: "inventory", label: "المخزون", icon: "ti-box" },
    { id: "import", label: "الاستيراد", icon: "ti-file-import" },
    { id: "alerts", label: "الإشعارات", icon: "ti-bell" },
    { id: "portal", label: "بوابة الزبائن", icon: "ti-world" },
    { id: "documents", label: "المستندات", icon: "ti-file-text" },
    { id: "conversions", label: "خريطة التحويل", icon: "ti-transfer" },
    { id: "users", label: "المستخدمون", icon: "ti-users" },
    { id: "security", label: "الأمان", icon: "ti-shield-lock" },
    { id: "printers", label: "الطابعات", icon: "ti-printer" },
    { id: "backup", label: "النسخ الاحتياطي", icon: "ti-database" },
    { id: "plan", label: "الخطة", icon: "ti-crown" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

// ─── helpers عامة ─────────────────────────────────────────────────────────────
export function extractList<T = any>(r: any): T[] {
    if (Array.isArray(r)) return r as T[];
    if (r?.data && Array.isArray(r.data)) return r.data as T[];
    return [];
}

export const str = (v: unknown): string => (v == null ? "" : String(v));

// يُطابق تطبيع الباك-إند Company::sanitizePortalSlug (أحرف صغيرة + شرطات)
export const slugifyPortal = (v: string): string =>
    v
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);

// ─── useDebounce ──────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay = 400): T {
    const [dv, setDv] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return dv;
}

// ─── useAutoSave ──────────────────────────────────────────────────────────────
export function useAutoSave(
    isDirty: boolean,
    onSave: () => Promise<void>,
    enabled: boolean,
    delay = 2000,
) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onSaveRef = useRef(onSave);
    const mountedRef = useRef(true);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!enabled || !isDirty) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            if (!mountedRef.current) return;
            try {
                await onSaveRef.current();
            } catch {
                /* errors shown in component */
            }
        }, delay);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isDirty, enabled, delay]);
}

// ─── useSettingsDiff ──────────────────────────────────────────────────────────
export function useSettingsDiff<T extends Record<string, unknown>>(initial: T) {
    const initialRef = useRef<T>(initial);
    const initializedRef = useRef(false);

    // ✅ نُحدِّث initialRef فقط مرة واحدة عند أول load حقيقي للبيانات
    // وليس عند كل تغيير — هذا يمنع reset الـ diff بعد الحفظ
    useEffect(() => {
        // تحقق أن البيانات ليست كلها defaults (rawSettings وصل)
        const hasData = Object.values(initial).some(
            (v) =>
                v !== null &&
                v !== undefined &&
                v !== "" &&
                v !== false &&
                v !== 0,
        );
        if (hasData && !initializedRef.current) {
            initialRef.current = initial;
            initializedRef.current = true;
        } else if (hasData) {
            // بعد حفظ ناجح، يُعاد استدعاؤه مع البيانات الجديدة من السيرفر
            initialRef.current = initial;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(initial)]);

    return useCallback((current: T): Partial<T> => {
        const diff: Partial<T> = {};
        for (const key of Object.keys(current) as Array<keyof T>) {
            if (
                JSON.stringify(current[key]) !==
                JSON.stringify(initialRef.current[key])
            ) {
                diff[key] = current[key];
            }
        }
        return diff;
    }, []);
}

// ─── useDirtyState ───────────────────────────────────────────────────────────
export function useDirtyState() {
    const [isDirty, setIsDirty] = useState(false);
    return {
        isDirty,
        markDirty: () => setIsDirty(true),
        markClean: () => setIsDirty(false),
    };
}

// ─── SettingsErrorBoundary ────────────────────────────────────────────────────
export class SettingsErrorBoundary extends React.Component<
    { children: React.ReactNode; tabLabel: string },
    { hasError: boolean; error: string }
> {
    state = { hasError: false, error: "" };
    static getDerivedStateFromError(e: Error) {
        return { hasError: true, error: e.message };
    }
    render() {
        if (this.state.hasError)
            return (
                <div className="p-10 text-center text-t4">
                    <i className="ti ti-alert-triangle block text-5xl text-red mb-3" />
                    <div className="font-bold text-lg text-t1 mb-2">
                        خطأ في تحميل إعدادات &ldquo;{this.props.tabLabel}&rdquo;
                    </div>
                    <div className="text-md text-t4 mb-4">
                        {this.state.error}
                    </div>
                    <button
                        onClick={() =>
                            this.setState({ hasError: false, error: "" })
                        }
                        className="px-5 py-2 rounded border border-b2 bg-3 cursor-pointer font-sans text-base hover:border-em transition"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            );
        return this.props.children;
    }
}

// ─── SettingsLastModified ─────────────────────────────────────────────────────
export function SettingsLastModified({ group }: { group: string }) {
    const { data: rawSettings = [] } = useSettingsByGroup(group);

    const last = rawSettings.reduce((latest: any, s: any) => {
        if (!latest) return s;
        return new Date(s.updated_at) > new Date(latest.updated_at)
            ? s
            : latest;
    }, null);

    if (!last?.updated_at) return null;
    return (
        <div className="flex items-center gap-1 mt-1 text-xs text-t4">
            <i className="ti ti-clock text-9" />
            آخر تعديل: {new Date(last.updated_at).toLocaleDateString("fr-DZ")}
        </div>
    );
}

// ─── SEARCH_INDEX ──────────────────────────────────────────────────────────────
export const SEARCH_INDEX = [
    {
        tab: "company" as TabId,
        label: "الاسم القانوني",
        keywords: ["اسم", "شركة", "مؤسسة", "legal name"],
    },
    {
        tab: "company" as TabId,
        label: "NIF — رقم التعريف الجبائي",
        keywords: ["nif", "جبائي", "ضريبي", "رقم"],
    },
    {
        tab: "company" as TabId,
        label: "NIS — الرقم الإحصائي",
        keywords: ["nis", "احصائي", "رقم"],
    },
    {
        tab: "company" as TabId,
        label: "AI — رقم المادة الجبائية",
        keywords: ["ai", "مادة", "جبائية"],
    },
    {
        tab: "company" as TabId,
        label: "RC — السجل التجاري",
        keywords: ["rc", "سجل", "تجاري", "registre"],
    },
    {
        tab: "company" as TabId,
        label: "العنوان والولاية",
        keywords: ["عنوان", "ولاية", "بلدية", "adresse"],
    },
    {
        tab: "company" as TabId,
        label: "البنك وRIB",
        keywords: ["بنك", "rib", "حساب", "bank"],
    },
    {
        tab: "company" as TabId,
        label: "الشعار",
        keywords: ["شعار", "logo", "صورة"],
    },
    {
        tab: "invoice" as TabId,
        label: "تصميم الفاتورة",
        keywords: ["تصميم", "فاتورة", "invoice", "design"],
    },
    {
        tab: "invoice" as TabId,
        label: "وضع الأسعار HT/TTC",
        keywords: ["ht", "ttc", "سعر", "ضريبة", "prix"],
    },
    {
        tab: "invoice" as TabId,
        label: "لون الترويسة",
        keywords: ["لون", "ترويسة", "couleur", "header"],
    },
    {
        tab: "invoice" as TabId,
        label: "النص القانوني الإلزامي",
        keywords: ["قانوني", "إلزامي", "mentions", "légales"],
    },
    {
        tab: "invoice" as TabId,
        label: "الختم والإمضاء",
        keywords: ["ختم", "إمضاء", "توقيع", "cachet", "signature"],
    },
    {
        tab: "fiscal" as TabId,
        label: "النظام الجزافي IFU",
        keywords: ["جزافي", "ifu", "forfaitaire", "g12"],
    },
    {
        tab: "fiscal" as TabId,
        label: "النظام الحقيقي G50",
        keywords: ["حقيقي", "réel", "g50", "tva", "ibs", "irg"],
    },
    {
        tab: "fiscal" as TabId,
        label: "الطابع الجبائي",
        keywords: ["طابع", "جبائي", "timbre", "fiscal"],
    },
    {
        tab: "fiscal" as TabId,
        label: "العملة الافتراضية",
        keywords: ["عملة", "دينار", "dzd", "currency"],
    },
    {
        tab: "inventory" as TabId,
        label: "طريقة تقييم المخزون PMP/FIFO/LIFO",
        keywords: ["pmp", "fifo", "lifo", "تقييم", "مخزون"],
    },
    {
        tab: "inventory" as TabId,
        label: "المخزون السالب",
        keywords: ["سالب", "stock", "négatif"],
    },
    {
        tab: "inventory" as TabId,
        label: "إدارة اللوطات",
        keywords: ["لوط", "lot", "دفعة", "numéro"],
    },
    {
        tab: "alerts" as TabId,
        label: "تنبيهات المخزون",
        keywords: ["تنبيه", "مخزون", "stock", "alerte"],
    },
    {
        tab: "alerts" as TabId,
        label: "تنبيهات الديون",
        keywords: ["دين", "ديون", "dette", "مستحق"],
    },
    {
        tab: "alerts" as TabId,
        label: "تنبيهات G50/G12",
        keywords: ["g50", "g12", "جبائي", "ضريبة", "fiscal"],
    },
    {
        tab: "alerts" as TabId,
        label: "إشعارات البريد",
        keywords: ["بريد", "email", "إشعار", "notification"],
    },
    {
        tab: "users" as TabId,
        label: "دعوة عضو جديد",
        keywords: ["دعوة", "عضو", "مستخدم", "invitation"],
    },
    {
        tab: "users" as TabId,
        label: "الأدوار والصلاحيات",
        keywords: ["دور", "صلاحية", "role", "permission"],
    },
    {
        tab: "plan" as TabId,
        label: "الخطة والاشتراك",
        keywords: ["خطة", "اشتراك", "plan", "abonnement"],
    },
    {
        tab: "printers" as TabId,
        label: "الطابعات المتصلة",
        keywords: ["طابعة", "printer", "usb", "حرارية", "thermal"],
    },
    {
        tab: "printers" as TabId,
        label: "طابعة الإيصال الافتراضية",
        keywords: ["إيصال", "receipt", "افتراضي", "default", "طابعة"],
    },
];

// ─── SettingsSearch ────────────────────────────────────────────────────────────
// visibleTabIds: اختياري — من يمرّره يقيّد البحث والشرائح بالتبويبات المتاحة فقط
// (تُستعمل من SettingsPage لقفل تبويبات المالك-فقط عن غيرهم)
export function SettingsSearch({
    onNavigate,
    visibleTabIds,
}: {
    onNavigate: (tab: TabId) => void;
    visibleTabIds?: ReadonlySet<TabId> | null;
}) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dq = useDebounce(q, 200);

    const results = useMemo(() => {
        if (!dq.trim() || dq.length < 2) return [];
        const lq = dq.toLowerCase();
        return SEARCH_INDEX.filter(
            (item) =>
                (!visibleTabIds || visibleTabIds.has(item.tab)) &&
                (item.label.includes(dq) ||
                    item.keywords.some((k) => k.includes(lq))),
        ).slice(0, 6);
    }, [dq, visibleTabIds]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
            }
            if (e.key === "Escape") {
                setOpen(false);
                setQ("");
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const tabLabel = (id: TabId) => TABS.find((t) => t.id === id)?.label ?? id;
    const tabIcon = (id: TabId) =>
        TABS.find((t) => t.id === id)?.icon ?? "ti-settings";

    return (
        <>
            <button
                onClick={() => {
                    setOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-b2 bg-3 cursor-pointer text-md text-t4 font-sans transition min-w-52 hover:border-em"
                onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--em)")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--b2)")
                }
            >
                <i className="ti ti-search text-base" />
                <span>ابحث في الإعدادات...</span>
                <span className="ml-auto text-8 px-1.5 py-0.5 rounded-sm border border-b2 bg-2">
                    ⌘K
                </span>
            </button>

            {open && (
                <div
                    className="fixed inset-0 flex items-start justify-center bg-black/50 z-50 pt-40"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setOpen(false);
                            setQ("");
                        }
                    }}
                >
                    <div className="bg-2 rounded-2xl w-520 max-w-90vw shadow-lg border border-b2 overflow-hidden">
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "12px 16px",
                                borderBottom: "1px solid var(--b1)",
                            }}
                        >
                            <i
                                className="ti ti-search"
                                style={{
                                    fontSize: 16,
                                    color: "var(--t4)",
                                    flexShrink: 0,
                                }}
                            />
                            <input
                                ref={inputRef}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="ابحث في كل الإعدادات..."
                                style={{
                                    flex: 1,
                                    border: "none",
                                    background: "transparent",
                                    fontSize: 14,
                                    color: "var(--t1)",
                                    outline: "none",
                                    fontFamily: "Tajawal, sans-serif",
                                }}
                            />
                            {q && (
                                <button
                                    onClick={() => setQ("")}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--t4)",
                                        fontSize: 13,
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                            <span
                                style={{
                                    fontSize: 10,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    border: "1px solid var(--b2)",
                                    background: "var(--bg3)",
                                    color: "var(--t4)",
                                }}
                            >
                                Esc
                            </span>
                        </div>

                        {results.length === 0 && q.length >= 2 && (
                            <div
                                style={{
                                    padding: "20px",
                                    textAlign: "center",
                                    color: "var(--t4)",
                                    fontSize: 13,
                                }}
                            >
                                <i
                                    className="ti ti-search-off"
                                    style={{
                                        fontSize: 24,
                                        display: "block",
                                        marginBottom: 8,
                                        opacity: 0.4,
                                    }}
                                />
                                لا نتائج لـ &ldquo;{q}&rdquo;
                            </div>
                        )}

                        {results.length === 0 && q.length < 2 && (
                            <div style={{ padding: "14px 16px" }}>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--t4)",
                                        marginBottom: 10,
                                        fontWeight: 600,
                                    }}
                                >
                                    الأقسام المتاحة
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 8,
                                    }}
                                >
                                    {TABS.filter(
                                        (t) =>
                                            !visibleTabIds ||
                                            visibleTabIds.has(t.id),
                                    ).map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                onNavigate(t.id);
                                                setOpen(false);
                                                setQ("");
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                                padding: "6px 12px",
                                                borderRadius: 8,
                                                border: "1px solid var(--b2)",
                                                background: "var(--bg3)",
                                                cursor: "pointer",
                                                fontSize: 12,
                                                color: "var(--t2)",
                                                fontFamily:
                                                    "Tajawal, sans-serif",
                                                transition: ".1s",
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.background =
                                                    "var(--emb)")
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.background =
                                                    "var(--bg3)")
                                            }
                                        >
                                            <i
                                                className={`ti ${t.icon}`}
                                                style={{
                                                    fontSize: 13,
                                                    color: "var(--em)",
                                                }}
                                            />
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.length > 0 && (
                            <div>
                                {results.map((r, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            onNavigate(r.tab);
                                            setOpen(false);
                                            setQ("");
                                        }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "11px 16px",
                                            width: "100%",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            fontFamily: "Tajawal, sans-serif",
                                            textAlign: "right",
                                            transition: "background .1s",
                                            borderBottom:
                                                i < results.length - 1
                                                    ? "1px solid var(--b1)"
                                                    : "none",
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.background =
                                                "var(--bg3)")
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.background =
                                                "transparent")
                                        }
                                    >
                                        <i
                                            className={`ti ${tabIcon(r.tab)}`}
                                            style={{
                                                fontSize: 16,
                                                color: "var(--em)",
                                                flexShrink: 0,
                                                width: 20,
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: "var(--t1)",
                                                }}
                                            >
                                                {r.label}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    color: "var(--t4)",
                                                    marginTop: 1,
                                                }}
                                            >
                                                في قسم: {tabLabel(r.tab)}
                                            </div>
                                        </div>
                                        <i
                                            className="ti ti-arrow-left"
                                            style={{
                                                fontSize: 12,
                                                color: "var(--t4)",
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

// ─── SettingsExportImport — مُصلَح ───────────────────────────────────────────
export function SettingsExportImport() {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    // ✅ استخدم list() الذي يُرجع dictionary
    const { data: allSettingsDict = {} } = useQuery({
        queryKey: tenantKeys.settings.current(slug),
        queryFn: settingsApi.list,
        enabled: !!slug,
        staleTime: 5 * 60_000,
    });

    const [importing, setImporting] = useState(false);
    const [msg, setMsg] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        // ✅ تحويل dictionary إلى array للتصدير
        const settingsArray = Object.entries(allSettingsDict).map(
            ([key, meta]) => ({
                key,
                value: (meta as any).value,
                group: (meta as any).group,
            }),
        );
        const data = {
            exported_at: new Date().toISOString(),
            slug,
            version: "2.0",
            settings: settingsArray,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `settings-${slug}-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMsg("تم تصدير الإعدادات بنجاح");
        setTimeout(() => setMsg(""), 3000);
    };

    const handleImport = async (file: File) => {
        setImporting(true);
        setMsg("");
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            if (!parsed.settings || !Array.isArray(parsed.settings))
                throw new Error("ملف غير صالح");
            // ✅ تحويل array → flat dict للإرسال
            const payload: Record<string, unknown> = {};
            for (const s of parsed.settings) {
                if (s.key && s.value !== undefined) payload[s.key] = s.value;
            }
            if (Object.keys(payload).length === 0)
                throw new Error("لا إعدادات صالحة في الملف");
            await settingsApi.update(payload);
            qc.invalidateQueries({
                queryKey: tenantKeys.settings.current(slug),
            });
            setMsg(`✅ تم استيراد ${Object.keys(payload).length} إعداد بنجاح`);
        } catch (e: unknown) {
            const err = e as Error;
            setMsg(`❌ فشل الاستيراد: ${err.message}`);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {msg && (
                <span
                    style={{
                        fontSize: 11,
                        color: msg.startsWith("✅")
                            ? "var(--em)"
                            : "var(--red)",
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "var(--bg3)",
                        border: "1px solid var(--b2)",
                    }}
                >
                    {msg}
                </span>
            )}
            <button
                onClick={handleExport}
                title="تصدير كل الإعدادات كـ JSON"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--b2)",
                    background: "var(--bg3)",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--t3)",
                    fontFamily: "Tajawal, sans-serif",
                    transition: ".15s",
                }}
                onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--em)")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--b2)")
                }
            >
                <i className="ti ti-download" style={{ fontSize: 13 }} />
                تصدير
            </button>
            <button
                onClick={() => fileRef.current?.click()}
                disabled={importing}
                title="استيراد إعدادات من JSON"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--b2)",
                    background: "var(--bg3)",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--t3)",
                    fontFamily: "Tajawal, sans-serif",
                    transition: ".15s",
                }}
                onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--em)")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--b2)")
                }
            >
                <i
                    className={`ti ${importing ? "ti-loader" : "ti-upload"}`}
                    style={{
                        fontSize: 13,
                        animation: importing
                            ? "spin .7s linear infinite"
                            : "none",
                    }}
                />
                {importing ? "استيراد..." : "استيراد"}
            </button>
            <input
                ref={fileRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                    e.target.value = "";
                }}
            />
        </div>
    );
}

// ─── DirtyBadge ───────────────────────────────────────────────────────────────
export function DirtyBadge({ show }: { show: boolean }) {
    if (!show) return null;
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 10,
                background: "color-mix(in srgb, var(--gold) 20%, transparent)",
                color: "var(--gold)",
                border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)",
            }}
        >
            <i className="ti ti-point-filled" style={{ fontSize: 8 }} />
            تغييرات غير محفوظة
        </span>
    );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
export function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = "تأكيد",
    confirmColor = "var(--red)",
    onConfirm,
    onCancel,
    warning,
}: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: string;
    onConfirm: () => void;
    onCancel: () => void;
    warning?: string;
}) {
    if (!open) return null;
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.55)",
                zIndex: 2000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
            }}
        >
            <div
                style={{
                    background: "var(--bg2)",
                    borderRadius: 16,
                    padding: 28,
                    width: 420,
                    maxWidth: "100%",
                    boxShadow: "0 20px 60px rgba(0,0,0,.4)",
                    border: "1px solid var(--b2)",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                        marginBottom: 16,
                    }}
                >
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: `color-mix(in srgb, ${confirmColor} 15%, transparent)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <i
                            className="ti ti-alert-triangle"
                            style={{ fontSize: 22, color: confirmColor }}
                        />
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: 15,
                                fontWeight: 800,
                                color: "var(--t1)",
                                marginBottom: 6,
                            }}
                        >
                            {title}
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: "var(--t3)",
                                lineHeight: 1.6,
                            }}
                        >
                            {message}
                        </div>
                    </div>
                </div>
                {warning && (
                    <div
                        style={{
                            padding: "10px 14px",
                            background: `color-mix(in srgb, ${confirmColor} 8%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${confirmColor} 25%, transparent)`,
                            borderRadius: 10,
                            fontSize: 12,
                            color: "var(--t2)",
                            marginBottom: 16,
                            display: "flex",
                            gap: 8,
                            alignItems: "flex-start",
                        }}
                    >
                        <i
                            className="ti ti-info-circle"
                            style={{
                                color: confirmColor,
                                flexShrink: 0,
                                marginTop: 1,
                            }}
                        />
                        {warning}
                    </div>
                )}
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                    }}
                >
                    <Button onClick={onCancel}>إلغاء</Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        style={{
                            background: confirmColor,
                            borderColor: confirmColor,
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── UnsavedChangesModal ──────────────────────────────────────────────────────
export function UnsavedChangesModal({
    open,
    onStay,
    onLeave,
}: {
    open: boolean;
    onStay: () => void;
    onLeave: () => void;
}) {
    return (
        <ConfirmModal
            open={open}
            title="لديك تغييرات غير محفوظة"
            message="إذا انتقلت لتبويب آخر ستُفقد التغييرات الحالية. هل تريد المتابعة؟"
            confirmLabel="المتابعة بدون حفظ"
            confirmColor="var(--gold)"
            warning="سيتم تجاهل كل التعديلات التي أجريتها في هذا التبويب."
            onConfirm={onLeave}
            onCancel={onStay}
        />
    );
}

// ─── SaveButton ───────────────────────────────────────────────────────────────
export function SaveButton({
    onClick,
    loading,
    isDirty,
    onClean,
}: {
    onClick: () => void | Promise<void>;
    loading?: boolean;
    isDirty?: boolean;
    onClean?: () => void;
}) {
    const [flash, setFlash] = useState(false);

    const handle = async () => {
        if (loading) return;
        try {
            await onClick();
            setFlash(true);
            onClean?.();
            setTimeout(() => setFlash(false), 2000);
        } catch {
            // errors already handled in the tab component
        }
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DirtyBadge show={!!isDirty} />
            <Button
                variant={flash ? ("success" as any) : "primary"}
                onClick={handle}
                disabled={loading}
                icon={
                    flash ? (
                        <i className="ti ti-check" />
                    ) : loading ? (
                        <i
                            className="ti ti-loader"
                            style={{ animation: "spin .7s linear infinite" }}
                        />
                    ) : (
                        <i className="ti ti-device-floppy" />
                    )
                }
            >
                {flash
                    ? "تم الحفظ!"
                    : loading
                      ? "جاري الحفظ..."
                      : "حفظ التغييرات"}
            </Button>
        </div>
    );
}

// ─── SecHead ──────────────────────────────────────────────────────────────────
export function SecHead({
    icon,
    label,
    color = "var(--em)",
    sub,
}: {
    icon: string;
    label: string;
    color?: string;
    sub?: string;
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
            }}
        >
            <i className={`ti ${icon}`} style={{ fontSize: 16, color }} />
            <div>
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "var(--t1)",
                    }}
                >
                    {label}
                </div>
                {sub && (
                    <div
                        style={{
                            fontSize: 11,
                            color: "var(--t4)",
                            marginTop: 1,
                        }}
                    >
                        {sub}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────
export function ToggleRow({
    label,
    hint,
    checked,
    onChange,
}: {
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 14px",
                background: "var(--bg3)",
                borderRadius: "var(--r2)",
                border: "1px solid var(--b2)",
                gap: 12,
            }}
        >
            <div>
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--t1)",
                    }}
                >
                    {label}
                </div>
                {hint && (
                    <div
                        style={{
                            fontSize: 11,
                            color: "var(--t4)",
                            marginTop: 2,
                        }}
                    >
                        {hint}
                    </div>
                )}
            </div>
            <Switch checked={checked} onChange={onChange} />
        </div>
    );
}
