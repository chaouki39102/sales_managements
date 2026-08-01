// pages/settings/SettingsPage.tsx — النسخة المُصلحة والمكتملة
//
// ════════════════════════════════════════════════════════════════════════════
// الإصلاحات الجوهرية:
// ① استبدل settingsApi.byGroup() + gs() القديم بـ useSettingsByGroup() + makeGs()
//   - القديم: (rawSettings as any[]).find(s => s.key === key)?.value
//   - الجديد: makeGs(rawSettings)('key', default) — آمن ومكتوب بـ TypeScript
//
// ② doSave() في كل تبويب:
//   - يُرسل diff فقط (ما تغيّر) باستخدام useSettingsDiff
//   - يستدعي settingsApi.update(diff) → PATCH /settings
//
// ③ SettingsExportImport:
//   - يُحوِّل SettingsDict إلى array قبل التصدير
//   - يُرسل settings كـ flat dict عند الاستيراد
//
// ④ حذف كل استخدامات (rawSettings as any[]).find() المباشرة
// ════════════════════════════════════════════════════════════════════════════

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import Badge from "@/components/ui/Badge";
import AlertBar from "@/components/ui/AlertBar";
import {
    useUpdateCompany,
    useDeactivateCompany,
    useCompanyMemberMutations,
} from "@/lib/api/endpoints/companies";
import {
    settingsApi,
    useSettingsByGroup,
    useUpdateSettings,
    makeGs,
} from "@/lib/api/endpoints/settings";
import { apiGet, apiPost, apiUpload } from "@/lib/api/core/client";

function extractList<T = any>(r: any): T[] {
    if (Array.isArray(r)) return r as T[];
    if (r?.data && Array.isArray(r.data)) return r.data as T[];
    return [];
}
import { companyKeys, globalKeys, tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug, useAppStore } from "@/lib/store/appStore";
import { useFiscalYear } from "@/context/FiscalYearContext";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SimpleTable from "@/components/ui/SimpleTable";
import type { Company, ActiveCompany } from "@/lib/api/core/types";
import ImagePreviewModal from './print-settings/components/ImagePreviewModal';
import { isWebUsbSupported, getConnectedPrinters } from '@/pos/utils/printService';
import {
    deviceGetPrinters,
    deviceSavePrinters,
} from '@/pos/store/printStore';
import type { DetectedPrinter } from './print-settings/types';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
    { id: "company", label: "المؤسسة", icon: "ti-building" },
    { id: "invoice", label: "تصاميم الفاتورة", icon: "ti-file-invoice" },
    { id: "fiscal", label: "المالية والضرائب", icon: "ti-calculator" },
    { id: "inventory", label: "المخزون", icon: "ti-box" },
    { id: "alerts", label: "الإشعارات", icon: "ti-bell" },
    { id: "documents", label: "المستندات", icon: "ti-file-text" },
    { id: "conversions", label: "خريطة التحويل", icon: "ti-transfer" },
    { id: "users", label: "المستخدمون", icon: "ti-users" },
    { id: "printers", label: "الطابعات", icon: "ti-printer" },
    { id: "plan", label: "الخطة", icon: "ti-crown" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const str = (v: unknown): string => (v == null ? "" : String(v));

// ─── useDebounce ──────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 400): T {
    const [dv, setDv] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return dv;
}

// ─── useAutoSave ──────────────────────────────────────────────────────────────
function useAutoSave(
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
function useSettingsDiff<T extends Record<string, unknown>>(initial: T) {
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
function useDirtyState() {
    const [isDirty, setIsDirty] = useState(false);
    return {
        isDirty,
        markDirty: () => setIsDirty(true),
        markClean: () => setIsDirty(false),
    };
}

// ─── SettingsErrorBoundary ────────────────────────────────────────────────────
class SettingsErrorBoundary extends React.Component<
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
function SettingsLastModified({ group }: { group: string }) {
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
const SEARCH_INDEX = [
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
function SettingsSearch({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dq = useDebounce(q, 200);

    const results = useMemo(() => {
        if (!dq.trim() || dq.length < 2) return [];
        const lq = dq.toLowerCase();
        return SEARCH_INDEX.filter(
            (item) =>
                item.label.includes(dq) ||
                item.keywords.some((k) => k.includes(lq)),
        ).slice(0, 6);
    }, [dq]);

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
                                    {TABS.map((t) => (
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
function SettingsExportImport() {
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
function DirtyBadge({ show }: { show: boolean }) {
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
function ConfirmModal({
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
function UnsavedChangesModal({
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

// ════════════════════════════════════════════════════════════════════════════
// Root Component
// ════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
    const [tab, setTab] = useState<TabId>("company");
    const [pendingTab, setPendingTab] = useState<TabId | null>(null);
    const [dirtyTabs, setDirtyTabs] = useState<Set<TabId>>(new Set());

    const markTabDirty = (t: TabId) =>
        setDirtyTabs((prev) => new Set(prev).add(t));
    const markTabClean = (t: TabId) =>
        setDirtyTabs((prev) => {
            const s = new Set(prev);
            s.delete(t);
            return s;
        });

    const handleTabClick = (newTab: TabId) => {
        if (newTab === tab) return;
        if (dirtyTabs.has(tab)) {
            setPendingTab(newTab);
            return;
        }
        setTab(newTab);
    };

    const confirmLeave = () => {
        if (!pendingTab) return;
        markTabClean(tab);
        setTab(pendingTab);
        setPendingTab(null);
    };

    const currentTabLabel = TABS.find((t) => t.id === tab)?.label ?? "";

    return (
        <div className="page on" id="p-settings">
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 18,
                    flexWrap: "wrap",
                    gap: 10,
                }}
            >
                <PageHeader
                    title="الإعدادات"
                    subtitle="إعدادات المؤسسة والنظام"
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <SettingsSearch onNavigate={(t) => handleTabClick(t)} />
                    <SettingsExportImport />
                </div>
            </div>

            <UnsavedChangesModal
                open={!!pendingTab}
                onStay={() => setPendingTab(null)}
                onLeave={confirmLeave}
            />

            {/* Tab bar */}
            <div
                style={{
                    display: "flex",
                    gap: 0,
                    borderBottom: "1px solid var(--b2)",
                    marginBottom: 22,
                    overflowX: "auto",
                }}
            >
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => handleTabClick(t.id)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "9px 15px",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontFamily: "Tajawal, sans-serif",
                            fontSize: 12.5,
                            fontWeight: tab === t.id ? 700 : 500,
                            color: tab === t.id ? "var(--em)" : "var(--t3)",
                            borderBottom:
                                tab === t.id
                                    ? "2px solid var(--em)"
                                    : "2px solid transparent",
                            marginBottom: -1,
                            transition: "all .15s",
                            whiteSpace: "nowrap",
                            position: "relative",
                        }}
                    >
                        <i
                            className={`ti ${t.icon}`}
                            style={{ fontSize: 14 }}
                        />
                        {t.label}
                        {dirtyTabs.has(t.id) && (
                            <span
                                style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    background: "var(--gold)",
                                    position: "absolute",
                                    top: 6,
                                    right: 4,
                                }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <SettingsErrorBoundary tabLabel={currentTabLabel}>
                {tab === "company" && (
                    <CompanyTab
                        onDirty={() => markTabDirty("company")}
                        onClean={() => markTabClean("company")}
                    />
                )}
                {tab === "invoice" && (
                    <InvoiceTab
                        onDirty={() => markTabDirty("invoice")}
                        onClean={() => markTabClean("invoice")}
                    />
                )}
                {tab === "fiscal" && (
                    <FiscalTab
                        onDirty={() => markTabDirty("fiscal")}
                        onClean={() => markTabClean("fiscal")}
                    />
                )}
                {tab === "inventory" && (
                    <InventoryTab
                        onDirty={() => markTabDirty("inventory")}
                        onClean={() => markTabClean("inventory")}
                    />
                )}
                {tab === "alerts" && (
                    <AlertsTab
                        onDirty={() => markTabDirty("alerts")}
                        onClean={() => markTabClean("alerts")}
                    />
                )}
                {tab === "documents" && (
                    <DocumentsTab
                        onDirty={() => markTabDirty("documents")}
                        onClean={() => markTabClean("documents")}
                    />
                )}
                {tab === "users" && <UsersTab />}
                {tab === "conversions" && (
                    <ConversionsTab
                        onDirty={() => markTabDirty("conversions")}
                        onClean={() => markTabClean("conversions")}
                    />
                )}
                {tab === "plan" && <PlanTab />}
                {tab === "printers" && (
                    <PrintersTab
                        onDirty={() => markTabDirty("printers")}
                        onClean={() => markTabClean("printers")}
                    />
                )}
            </SettingsErrorBoundary>
        </div>
    );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function SaveButton({
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

function SecHead({
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

function ToggleRow({
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

// ════════════════════════════════════════════════════════════════════════════
// ① CompanyTab — بيانات الشركة (لا تستخدم settings API — تستخدم company API)
// ════════════════════════════════════════════════════════════════════════════
function CompanyTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const slug = useActiveSlug() ?? "";
    const { activeCompany: company, isLoading, setActiveCompany } = useAuth();
    const updateMutation = useUpdateCompany();
    const deactivateMutation = useDeactivateCompany();
    const navigate = useNavigate();
    const deleteConfirm = useConfirm();
    const _qc = useQueryClient();
    void _qc;
    const { isDirty, markDirty, markClean } = useDirtyState();

    const [form, setForm] = useState({
        name: "",
        commercial_name: "",
        activity: "",
        rc: "",
        rc_date: "",
        nif: "",
        nis: "",
        ai: "",
        legal_form_id: "" as string | number,
        capital_amount: "" as string | number,
        address: "",
        wilaya_id: "" as string | number,
        commune_id: "" as string | number,
        phone: "",
        mobile: "",
        fax: "",
        email: "",
        bank_name: "",
        rib: "",
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (!company) return;
        const co = company as any;
        setForm({
            name: str(company.name),
            commercial_name: str(company.commercial_name),
            activity: str(co.activity),
            rc: str(co.rc),
            rc_date: str(co.rc_date),
            nif: str(company.nif),
            nis: str(company.nis),
            ai: str(co.ai),
            legal_form_id: co.legal_form_id ?? "",
            capital_amount: co.capital_amount ?? "",
            address: str(company.address),
            wilaya_id: co.wilaya_id ?? "",
            commune_id: co.commune_id ?? "",
            phone: str(company.phone),
            mobile: str(co.mobile),
            fax: str(co.fax),
            email: str(company.email),
            bank_name: str(co.bank_name),
            rib: str(co.rib),
        });
    }, [company]);

    const set = (k: string, v: string | number) => {
        setForm((f) => ({ ...f, [k]: v }));
        setFieldErrors((p) => {
            const n = { ...p };
            delete n[k];
            return n;
        });
        markDirty();
        onDirty?.();
    };

    const { data: wilayas = [] } = useQuery({
        queryKey: globalKeys.wilayas,
        queryFn: () => apiGet<any>("/wilayas", { per_page: 60 }).then(r => r?.data ?? []),
        staleTime: 60 * 60_000,
    });
    const { data: communes = [] } = useQuery({
        queryKey: globalKeys.communes(Number(form.wilaya_id) || 0),
        queryFn: () => apiGet<any[]>(`/communes/by-wilaya/${form.wilaya_id}`),
        enabled: !!form.wilaya_id,
        staleTime: 30 * 60_000,
    });
    const { data: legalForms = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.legalForms(slug), 'settings-company-tab'],
        queryFn: () => apiGet<any>("/legal-forms", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 60 * 60_000,
        placeholderData: [],
    });

    const handleSave = async () => {
        setSaveError(null);
        setFieldErrors({});
        if (!slug) {
            setSaveError("لم يتم تحديد الشركة");
            return;
        }
        try {
            const updated = await updateMutation.mutateAsync({
                slug,
                data: {
                    ...form,
                    legal_form_id: form.legal_form_id
                        ? Number(form.legal_form_id)
                        : null,
                    wilaya_id: form.wilaya_id ? Number(form.wilaya_id) : null,
                    commune_id: form.commune_id
                        ? Number(form.commune_id)
                        : null,
                    capital_amount: form.capital_amount
                        ? Number(form.capital_amount)
                        : null,
                } as Partial<Company>,
            });

            // ✅ حدّث Zustand فوراً بالبيانات الجديدة
            if (updated) {
                setActiveCompany(updated as unknown as ActiveCompany);
            }

            markClean();
            onClean?.();
        } catch (err: unknown) {
            const e = err as any;
            // ✅ معالجة أخطاء الـ validation بشكل صحيح
            if (e?.errors) {
                const fe: Record<string, string> = {};
                for (const [k, v] of Object.entries(e.errors)) {
                    fe[k] = (v as string[])[0];
                }
                setFieldErrors(fe);
            } else {
                setSaveError(e?.message ?? "فشل حفظ البيانات");
            }
        }
    };

    if (isLoading)
        return (
            <div className="empty">
                <div className="empty-ic">
                    <i className="ti ti-loader" />
                </div>
                <div className="empty-tx">تحميل...</div>
            </div>
        );

    return (
        <div className="g65">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {saveError && (
                    <AlertBar variant="red" dismissible>
                        {saveError}
                    </AlertBar>
                )}

                <Card>
                    <SecHead icon="ti-building" label="البيانات الرسمية" />
                    <div className="fgrid c2" style={{ gap: 12 }}>
                        <div className="fg s2">
                            <label className="req">الاسم القانوني</label>
                            <input
                                value={form.name}
                                onChange={(e) => set("name", e.target.value)}
                                style={{
                                    borderColor: fieldErrors.name
                                        ? "var(--red)"
                                        : undefined,
                                }}
                            />
                            {fieldErrors.name && (
                                <span
                                    style={{
                                        color: "var(--red)",
                                        fontSize: 11,
                                    }}
                                >
                                    {fieldErrors.name}
                                </span>
                            )}
                        </div>
                        <div className="fg">
                            <label>الاسم التجاري</label>
                            <input
                                value={form.commercial_name}
                                onChange={(e) =>
                                    set("commercial_name", e.target.value)
                                }
                                placeholder="يظهر على الفواتير"
                            />
                        </div>
                        <div className="fg">
                            <label>الشكل القانوني</label>
                            <select
                                value={str(form.legal_form_id)}
                                onChange={(e) =>
                                    set("legal_form_id", e.target.value)
                                }
                            >
                                <option value="">— اختر —</option>
                                {(legalForms as any[]).map((lf: any) => (
                                    <option key={lf.id} value={lf.id}>
                                        {lf.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="fg">
                            <label>رأس المال (دج)</label>
                            <input
                                type="number"
                                value={str(form.capital_amount)}
                                onChange={(e) =>
                                    set("capital_amount", e.target.value)
                                }
                            />
                        </div>
                        <div className="fg s2">
                            <label>قطاع النشاط</label>
                            <input
                                value={form.activity}
                                onChange={(e) =>
                                    set("activity", e.target.value)
                                }
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-id-badge"
                        label="المعرّفات الجبائية"
                        color="var(--blue)"
                    />
                    <div className="fgrid c3" style={{ gap: 12 }}>
                        {[
                            { k: "nif", l: "NIF" },
                            { k: "nis", l: "NIS" },
                            { k: "ai", l: "AI" },
                        ].map(({ k, l }) => (
                            <div className="fg" key={k}>
                                <label>{l}</label>
                                <input
                                    value={(form as any)[k]}
                                    onChange={(e) => set(k, e.target.value)}
                                    style={{
                                        fontFamily: "monospace",
                                        letterSpacing: 1,
                                    }}
                                />
                            </div>
                        ))}
                        <div className="fg s2">
                            <label>RC — السجل التجاري</label>
                            <input
                                value={form.rc}
                                onChange={(e) => set("rc", e.target.value)}
                                style={{ fontFamily: "monospace" }}
                            />
                        </div>
                        <div className="fg">
                            <label>تاريخ RC</label>
                            <input
                                type="date"
                                value={form.rc_date}
                                onChange={(e) => set("rc_date", e.target.value)}
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-map-pin"
                        label="العنوان والاتصال"
                        color="var(--teal)"
                    />
                    <div className="fgrid c3" style={{ gap: 12 }}>
                        <div className="fg">
                            <label>الولاية</label>
                            <select
                                value={str(form.wilaya_id)}
                                onChange={(e) => {
                                    set("wilaya_id", e.target.value);
                                    set("commune_id", "");
                                }}
                            >
                                <option value="">— الولاية —</option>
                                {(wilayas as any[]).map((w: any) => (
                                    <option key={w.id} value={w.id}>
                                        {w.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="fg">
                            <label>البلدية</label>
                            <select
                                value={str(form.commune_id)}
                                onChange={(e) =>
                                    set("commune_id", e.target.value)
                                }
                                disabled={!form.wilaya_id}
                            >
                                <option value="">— البلدية —</option>
                                {(communes as any[]).map((c: any) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="fg s3">
                            <label>العنوان التفصيلي</label>
                            <input
                                value={form.address}
                                onChange={(e) => set("address", e.target.value)}
                            />
                        </div>
                        <div className="fg">
                            <label>الهاتف</label>
                            <input
                                value={form.phone}
                                onChange={(e) => set("phone", e.target.value)}
                            />
                        </div>
                        <div className="fg">
                            <label>الجوال</label>
                            <input
                                value={form.mobile}
                                onChange={(e) => set("mobile", e.target.value)}
                            />
                        </div>
                        <div className="fg">
                            <label>الفاكس</label>
                            <input
                                value={form.fax}
                                onChange={(e) => set("fax", e.target.value)}
                            />
                        </div>
                        <div className="fg s3">
                            <label>البريد الإلكتروني</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => set("email", e.target.value)}
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-building-bank"
                        label="المعلومات البنكية"
                        color="var(--gold)"
                    />
                    <div className="fgrid c2" style={{ gap: 12 }}>
                        <div className="fg">
                            <label>البنك</label>
                            <select
                                value={form.bank_name}
                                onChange={(e) =>
                                    set("bank_name", e.target.value)
                                }
                            >
                                <option value="">— اختر —</option>
                                {[
                                    "BNA",
                                    "BEA",
                                    "CPA",
                                    "BADR",
                                    "BDL",
                                    "CNEP",
                                    "AGB",
                                    "ABC",
                                    "Société Générale Algérie",
                                    "BNP Paribas El Djazaïr",
                                ].map((b) => (
                                    <option key={b} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="fg">
                            <label>رقم الحساب RIB</label>
                            <input
                                value={form.rib}
                                onChange={(e) => set("rib", e.target.value)}
                                style={{
                                    fontFamily: "monospace",
                                    letterSpacing: 1,
                                }}
                            />
                        </div>
                    </div>
                </Card>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <SettingsLastModified group="company" />
                    <SaveButton
                        onClick={handleSave}
                        loading={updateMutation.isPending}
                        isDirty={isDirty}
                        onClean={() => {
                            markClean();
                            onClean?.();
                        }}
                    />
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <LogoUpload company={company} />
                <InvoicePreviewCard form={form} company={company} />
                <CompanyStatusCard company={company} />
                <Card>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
                    <SecHead icon="ti-alert-triangle" label="إجراءات الحساب" color="var(--red)" />
                    <p style={{ fontSize: 12, color: "var(--t4)", lineHeight: 1.5 }}>
                      سيتم تعطيل الشركة ولن تظهر في قائمة الشركات. يمكنك التواصل مع الدعم لاستعادتها.
                    </p>
                    <Button variant="danger" fullWidth onClick={() => deleteConfirm.confirm(`هل تريد تعطيل الشركة «${company?.name}»؟`).then(ok => {
                      if (!ok) return;
                      deactivateMutation.mutateAsync(slug).then(() => {
                        useAppStore.getState().setActiveCompany(null);
                        navigate("/onboarding", { replace: true });
                      }).catch(() => {});
                    })}>
                      تعطيل الشركة
                    </Button>
                  </div>
                </Card>
                <ConfirmDialog {...deleteConfirm.confirmDialogProps} loading={deactivateMutation.isPending} />
            </div>
        </div>
    );
}

function LogoUpload({ company }: { company?: any }) {
    const slug = useActiveSlug() ?? "";
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [zoomImg, setZoomImg] = useState<string | null>(null);

    useEffect(() => {
        if (company?.avatar) setPreview(company.avatar);
    }, [company?.avatar]);

    const upload = async (file: File) => {
        if (!slug) return;
        setPreview(URL.createObjectURL(file));
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("avatar", file);
            const res: any = await apiUpload(`/companies/${slug}/avatar`, fd);
            const newAvatar = res?.avatar ?? res?.avatar_url ?? null;
            if (newAvatar) {
                useAppStore.getState().setActiveCompany({
                    ...useAppStore.getState().activeCompany,
                    avatar: newAvatar,
                } as ActiveCompany);
                setPreview(newAvatar);
            }
        } catch {
            setPreview(company?.avatar ?? null);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card>
            <SecHead icon="ti-photo" label="الشعار" color="var(--purple)" />
            <div
                style={{
                    border: "2px dashed var(--b3)",
                    borderRadius: 10,
                    padding: 20,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: ".15s",
                }}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) upload(f);
                }}
                onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--em)")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--b3)")
                }
            >
                {preview ? (
                    <img
                        src={preview}
                        alt="logo"
                        onClick={(e) => { e.stopPropagation(); setZoomImg(preview); }}
                        style={{
                            maxHeight: 70,
                            maxWidth: "100%",
                            objectFit: "contain",
                            marginBottom: 8,
                            cursor: 'zoom-in',
                        }}
                    />
                ) : (
                    <i
                        className="ti ti-cloud-upload"
                        style={{
                            fontSize: 30,
                            color: "var(--t4)",
                            display: "block",
                            marginBottom: 8,
                        }}
                    />
                )}
                <div
                    style={{
                        fontSize: 12,
                        color: "var(--t4)",
                        fontWeight: 600,
                    }}
                >
                    {uploading ? "جاري الرفع..." : "اضغط أو اسحب الشعار هنا"}
                </div>
                <div style={{ fontSize: 10, color: "var(--t4)", marginTop: 3 }}>
                    PNG, SVG, JPG — حد أقصى 2MB
                </div>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                }}
            />
            <ImagePreviewModal open={!!zoomImg} src={zoomImg ?? ''} onClose={() => setZoomImg(null)} />
        </Card>
    );
}

function InvoicePreviewCard({ form, company }: { form: any; company?: any }) {
    return (
        <Card>
            <SecHead
                icon="ti-receipt"
                label="معاينة رأس الفاتورة"
                color="var(--teal)"
            />
            <div
                style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "14px 16px",
                    direction: "rtl",
                    fontFamily: "Tajawal, sans-serif",
                }}
            >
                {company?.avatar && (
                    <img
                        src={company.avatar}
                        alt="logo"
                        style={{
                            height: 40,
                            objectFit: "contain",
                            marginBottom: 8,
                            display: "block",
                        }}
                    />
                )}
                <div
                    style={{
                        fontWeight: 900,
                        fontSize: 13,
                        color: "#0a7c52",
                        marginBottom: 3,
                    }}
                >
                    {form.commercial_name || form.name || "—"}
                </div>
                <div
                    style={{
                        fontSize: 10.5,
                        color: "#64748b",
                        lineHeight: 1.8,
                    }}
                >
                    {form.nif && (
                        <div style={{ fontFamily: "monospace" }}>
                            NIF: {form.nif}
                            {form.rc ? ` | RC: ${form.rc}` : ""}
                        </div>
                    )}
                    {form.ai && (
                        <div style={{ fontFamily: "monospace" }}>
                            AI: {form.ai}
                            {form.nis ? ` | NIS: ${form.nis}` : ""}
                        </div>
                    )}
                    {form.address && <div>{form.address}</div>}
                    {(form.phone || form.mobile) && (
                        <div>
                            Tél:{" "}
                            {[form.phone, form.mobile]
                                .filter(Boolean)
                                .join(" — ")}
                        </div>
                    )}
                    {form.email && <div>{form.email}</div>}
                    {form.rib && (
                        <div style={{ fontFamily: "monospace", fontSize: 9.5 }}>
                            RIB: {form.rib}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

function CompanyStatusCard({ company }: { company?: any }) {
    if (!company) return null;
    const rows = [
        {
            l: "الحالة",
            n: company.is_suspended ? (
                <Badge variant="danger">معلّق</Badge>
            ) : company.active ? (
                <Badge variant="success">نشط</Badge>
            ) : (
                <Badge variant="warning">غير نشط</Badge>
            ),
        },
        {
            l: "التوثيق",
            n: company.is_verified ? (
                <Badge variant="success">موثّق</Badge>
            ) : (
                <Badge variant="default">غير موثّق</Badge>
            ),
        },
        {
            l: "الخطة",
            n: (
                <span
                    style={{
                        fontWeight: 800,
                        color: "var(--em)",
                        textTransform: "uppercase",
                        fontSize: 12,
                    }}
                >
                    {company.plan}
                </span>
            ),
        },
        {
            l: "Slug",
            n: (
                <span
                    style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "var(--t4)",
                    }}
                >
                    {company.slug}
                </span>
            ),
        },
    ];
    if (company.trial_ends_at) {
        rows.push({
            l: "نهاية التجربة",
            n: (
                <span style={{ fontSize: 12, color: "var(--gold)" }}>
                    {new Date(company.trial_ends_at).toLocaleDateString(
                        "fr-DZ",
                    )}
                </span>
            ),
        });
    }
    return (
        <Card>
            <SecHead
                icon="ti-info-circle"
                label="حالة الحساب"
                color="var(--t4)"
            />
            {rows.map(({ l, n }) => (
                <div
                    key={l}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "7px 0",
                        borderBottom: "1px solid var(--b1)",
                    }}
                >
                    <span style={{ fontSize: 12, color: "var(--t4)" }}>
                        {l}
                    </span>
                    {n}
                </div>
            ))}
        </Card>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ② InvoiceTab — مُصلَح: يستخدم useSettingsByGroup + makeGs
// ════════════════════════════════════════════════════════════════════════════
const DESIGNS = [
    {
        id: "classic",
        label: "Classic",
        icon: "ti-template",
        desc: "ترويسة ملونة كاملة + جدول بسيط",
    },
    {
        id: "modern",
        label: "Modern",
        icon: "ti-layout-sidebar",
        desc: "خط جانبي ملون + بيانات منفصلة",
    },
    {
        id: "minimal",
        label: "Minimal",
        icon: "ti-minus",
        desc: "بدون ألوان — نص نظيف فقط",
    },
    {
        id: "professional",
        label: "Professional",
        icon: "ti-briefcase",
        desc: "ترويسة مزدوجة شركة + زبون",
    },
] as const;
type DesignId = (typeof DESIGNS)[number]["id"];

function InvoiceTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    // ✅ activeCompany من AuthContext بدل useCurrentCompany (يمنع 404)
    const { activeCompany: company } = useAuth();

    // ✅ useSettingsByGroup يُرجع Setting[] مباشرة
    const { data: rawSettings = [] } = useSettingsByGroup("invoice");
    const gs = makeGs(rawSettings);

    const { isDirty, markDirty, markClean } = useDirtyState();
    const { mutateAsync: saveSettings, isPending: saving } =
        useUpdateSettings();

    const [design, setDesign] = useState<DesignId>("classic");
    const [headerColor, setHeaderColor] = useState("#0a7c52");
    const [paperSize, setPaperSize] = useState("A4");
    const [fontSz, setFontSz] = useState("medium");
    const [priceMode, setPriceMode] = useState<"ht" | "ttc">("ttc");
    const [showLogo, setShowLogo] = useState(true);
    const [showStamp, setShowStamp] = useState(true);
    const [showSign, setShowSign] = useState(true);
    const [showWatermark, setShowWatermark] = useState(false);
    const [footerText, setFooterText] = useState("");
    const [legalText, setLegalText] = useState("");

    // ✅ initial state للـ diff
    const initialSettings = useMemo(
        () => ({
            invoice_design: gs<DesignId>("invoice_design", "classic"),
            invoice_header_color: gs<string>("invoice_header_color", "#0a7c52"),
            invoice_paper_size: gs<string>("invoice_paper_size", "A4"),
            invoice_font_size: gs<string>("invoice_font_size", "medium"),
            price_mode: gs<string>("price_mode", "ttc"),
            invoice_show_logo: gs<boolean>("invoice_show_logo", true),
            invoice_show_stamp: gs<boolean>("invoice_show_stamp", true),
            invoice_show_sign: gs<boolean>("invoice_show_sign", true),
            invoice_show_watermark: gs<boolean>(
                "invoice_show_watermark",
                false,
            ),
            invoice_footer_text: gs<string>("invoice_footer_text", ""),
            invoice_legal_text: gs<string>("invoice_legal_text", ""),
        }),
        [rawSettings],
    );

    const getDiff = useSettingsDiff(initialSettings);

    useEffect(() => {
        if (!rawSettings.length) return;
        setDesign(gs<DesignId>("invoice_design", "classic"));
        setHeaderColor(gs<string>("invoice_header_color", "#0a7c52"));
        setPaperSize(gs<string>("invoice_paper_size", "A4"));
        setFontSz(gs<string>("invoice_font_size", "medium"));
        setPriceMode(gs<"ht" | "ttc">("price_mode", "ttc"));
        setShowLogo(gs<boolean>("invoice_show_logo", true));
        setShowStamp(gs<boolean>("invoice_show_stamp", true));
        setShowSign(gs<boolean>("invoice_show_sign", true));
        setShowWatermark(gs<boolean>("invoice_show_watermark", false));
        setFooterText(gs<string>("invoice_footer_text", ""));
        setLegalText(gs<string>("invoice_legal_text", ""));
    }, [rawSettings]);

    const sd =
        <T,>(setter: (v: T) => void) =>
        (v: T) => {
            setter(v);
            markDirty();
            onDirty?.();
        };

    const doSave = async () => {
        const current = {
            invoice_design: design,
            invoice_header_color: headerColor,
            invoice_paper_size: paperSize,
            invoice_font_size: fontSz,
            price_mode: priceMode,
            invoice_show_logo: showLogo,
            invoice_show_stamp: showStamp,
            invoice_show_sign: showSign,
            invoice_show_watermark: showWatermark,
            invoice_footer_text: footerText,
            invoice_legal_text: legalText,
        };
        const diff = getDiff(current as any);
        if (Object.keys(diff).length === 0) {
            markClean();
            onClean?.();
            return;
        }
        await saveSettings(diff as Record<string, unknown>);
        qc.invalidateQueries({
            queryKey: [...tenantKeys.settings.current(slug), "invoice"],
        });
        markClean();
        onClean?.();
    };

    useAutoSave(isDirty, doSave, true, 2000);

    const fMap: Record<string, number> = {
        small: 10.5,
        medium: 12,
        large: 13.5,
    };
    const fontSize = fMap[fontSz] ?? 12;
    const companyName =
        (company as any)?.commercial_name ||
        (company as any)?.name ||
        "اسم المؤسسة";
    const companyLogo = (company as any)?.avatar ?? undefined;

    return (
        <div className="g65">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Card>
                    <SecHead icon="ti-template" label="اختيار تصميم الفاتورة" />
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                        }}
                    >
                        {DESIGNS.map((d) => (
                            <button
                                key={d.id}
                                onClick={() => {
                                    setDesign(d.id);
                                    markDirty();
                                    onDirty?.();
                                }}
                                style={{
                                    padding: "14px 16px",
                                    borderRadius: 10,
                                    cursor: "pointer",
                                    textAlign: "right",
                                    border:
                                        design === d.id
                                            ? "2px solid var(--em)"
                                            : "1px solid var(--b2)",
                                    background:
                                        design === d.id
                                            ? "var(--emb)"
                                            : "var(--bg3)",
                                    fontFamily: "Tajawal, sans-serif",
                                    transition: ".15s",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 4,
                                    }}
                                >
                                    <i
                                        className={`ti ${d.icon}`}
                                        style={{
                                            fontSize: 18,
                                            color:
                                                design === d.id
                                                    ? "var(--em)"
                                                    : "var(--t3)",
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontWeight: 700,
                                            fontSize: 13,
                                            color:
                                                design === d.id
                                                    ? "var(--em)"
                                                    : "var(--t1)",
                                        }}
                                    >
                                        {d.label}
                                    </span>
                                    {design === d.id && (
                                        <i
                                            className="ti ti-check"
                                            style={{
                                                color: "var(--em)",
                                                fontSize: 13,
                                                marginRight: "auto",
                                            }}
                                        />
                                    )}
                                </div>
                                <div
                                    style={{ fontSize: 11, color: "var(--t4)" }}
                                >
                                    {d.desc}
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-percentage"
                        label="وضع الأسعار الافتراضي"
                        color="var(--gold)"
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                        {[
                            {
                                v: "ht",
                                l: "HT — بدون TVA",
                                h: "أسعار خارج الضريبة",
                            },
                            {
                                v: "ttc",
                                l: "TTC — شامل TVA",
                                h: "أسعار شاملة الضريبة",
                            },
                        ].map(({ v, l, h }) => (
                            <button
                                key={v}
                                onClick={() => sd(setPriceMode)(v as any)}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    border:
                                        priceMode === v
                                            ? "2px solid var(--em)"
                                            : "1px solid var(--b2)",
                                    background:
                                        priceMode === v
                                            ? "var(--emb)"
                                            : "var(--bg3)",
                                    fontFamily: "Tajawal, sans-serif",
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 700,
                                        fontSize: 13,
                                        color:
                                            priceMode === v
                                                ? "var(--em)"
                                                : "var(--t1)",
                                    }}
                                >
                                    {l}
                                </div>
                                <div
                                    style={{
                                        fontSize: 10.5,
                                        color: "var(--t4)",
                                        marginTop: 2,
                                    }}
                                >
                                    {h}
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                <Card>
                    <SecHead icon="ti-printer" label="خيارات الطباعة" />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >
                        <ToggleRow
                            label="إظهار الشعار"
                            hint="في رأس كل مطبوع"
                            checked={showLogo}
                            onChange={sd(setShowLogo)}
                        />
                        <ToggleRow
                            label="خانة الختم والإمضاء"
                            hint="للمطبوعات الرسمية"
                            checked={showStamp}
                            onChange={sd(setShowStamp)}
                        />
                        <ToggleRow
                            label="التوقيع الرقمي"
                            hint="توقيع إلكتروني آلي"
                            checked={showSign}
                            onChange={sd(setShowSign)}
                        />
                        <ToggleRow
                            label="علامة مائية «نسخة»"
                            hint="على نسخ الأرشفة"
                            checked={showWatermark}
                            onChange={sd(setShowWatermark)}
                        />
                    </div>
                    <div
                        className="fgrid c2"
                        style={{ gap: 12, marginTop: 14 }}
                    >
                        <div className="fg">
                            <label>حجم الورق</label>
                            <select
                                value={paperSize}
                                onChange={(e) =>
                                    sd(setPaperSize)(e.target.value)
                                }
                            >
                                <option value="A4">A4 — قياسي</option>
                                <option value="A5">A5</option>
                                <option value="thermal">حراري 80mm</option>
                            </select>
                        </div>
                        <div className="fg">
                            <label>حجم الخط</label>
                            <select
                                value={fontSz}
                                onChange={(e) => sd(setFontSz)(e.target.value)}
                            >
                                <option value="small">صغير</option>
                                <option value="medium">متوسط</option>
                                <option value="large">كبير</option>
                            </select>
                        </div>
                        <div className="fg">
                            <label>لون الترويسة</label>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                }}
                            >
                                <input
                                    type="color"
                                    value={headerColor}
                                    onChange={(e) =>
                                        sd(setHeaderColor)(e.target.value)
                                    }
                                    style={{
                                        width: 40,
                                        height: 34,
                                        border: "1px solid var(--b2)",
                                        borderRadius: 6,
                                        padding: 2,
                                        cursor: "pointer",
                                    }}
                                />
                                <input
                                    value={headerColor}
                                    onChange={(e) =>
                                        sd(setHeaderColor)(e.target.value)
                                    }
                                    style={{ fontFamily: "monospace", flex: 1 }}
                                    maxLength={7}
                                />
                            </div>
                        </div>
                        <div className="fg" />
                        <div className="fg s2">
                            <label>نص التذييل</label>
                            <input
                                value={footerText}
                                onChange={(e) =>
                                    sd(setFooterText)(e.target.value)
                                }
                                placeholder="شكراً لثقتكم..."
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-gavel"
                        label="النص القانوني الإلزامي"
                        color="var(--red)"
                        sub="إلزامي قانونياً في كل فاتورة — يُطبع في أسفل المستند"
                    />
                    <textarea
                        value={legalText}
                        onChange={(e) => sd(setLegalText)(e.target.value)}
                        rows={4}
                        style={{
                            width: "100%",
                            fontFamily: "Tajawal, sans-serif",
                            fontSize: 12,
                            resize: "vertical",
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--b2)",
                            background: "var(--bg3)",
                            color: "var(--t1)",
                        }}
                    />
                </Card>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <SettingsLastModified group="invoice" />
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <span style={{ fontSize: 11, color: "var(--t4)" }}>
                            <i
                                className="ti ti-robot"
                                style={{ marginLeft: 4 }}
                            />
                            حفظ تلقائي مفعّل
                        </span>
                        <SaveButton
                            onClick={doSave}
                            loading={saving}
                            isDirty={isDirty}
                            onClean={() => {
                                markClean();
                                onClean?.();
                            }}
                        />
                    </div>
                </div>
            </div>

            <div>
                <Card>
                    <SecHead
                        icon="ti-eye"
                        label={`معاينة — ${DESIGNS.find((d) => d.id === design)?.label}`}
                        color="var(--teal)"
                    />
                    <InvoiceLivePreview
                        design={design}
                        color={headerColor}
                        fontSize={fontSize}
                        showLogo={showLogo}
                        showStamp={showStamp}
                        showWatermark={showWatermark}
                        priceMode={priceMode}
                        footerText={footerText}
                        legalText={legalText}
                        companyName={companyName}
                        logo={companyLogo}
                    />
                </Card>
            </div>
        </div>
    );
}

// InvoiceLivePreview — لم يتغير منطقياً، مُبسَّط هنا
function InvoiceLivePreview({
    design,
    color,
    fontSize,
    showLogo,
    showStamp,
    showWatermark,
    priceMode,
    footerText,
    legalText,
    companyName,
    logo,
}: any) {
    const base: React.CSSProperties = {
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        overflow: "hidden",
        fontFamily: "Tajawal, sans-serif",
        fontSize,
        direction: "rtl",
        boxShadow: "0 2px 8px rgba(0,0,0,.06)",
        position: "relative",
    };
    const tableBody = (
        <table
            style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: fontSize - 1,
            }}
        >
            <thead>
                <tr style={{ background: "#f1f5f9" }}>
                    {[
                        "المنتج",
                        "الكمية",
                        priceMode === "ht" ? "HT" : "TTC",
                        "TVA",
                        "الإجمالي",
                    ].map((h) => (
                        <th
                            key={h}
                            style={{
                                padding: "3px 6px",
                                borderBottom: "1px solid #e2e8f0",
                                textAlign: h === "المنتج" ? "right" : "center",
                                fontWeight: 600,
                            }}
                        >
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style={{ padding: "4px 6px" }}>منتج تجريبي</td>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        5
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        1,000
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        19%
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        5,950
                    </td>
                </tr>
            </tbody>
        </table>
    );
    const stampBox = showStamp && (
        <div
            style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 10,
            }}
        >
            <div
                style={{
                    textAlign: "center",
                    fontSize: fontSize - 2,
                    color: "#94a3b8",
                }}
            >
                <div
                    style={{
                        border: "1px dashed #cbd5e1",
                        width: 64,
                        height: 44,
                        borderRadius: 4,
                        marginBottom: 3,
                    }}
                />
                الختم والإمضاء
            </div>
        </div>
    );
    const watermark = showWatermark && (
        <div
            style={{
                position: "absolute",
                top: "40%",
                left: "50%",
                transform: "translate(-50%,-50%) rotate(-35deg)",
                fontSize: 32,
                color: "rgba(0,0,0,.06)",
                fontWeight: 900,
                pointerEvents: "none",
                whiteSpace: "nowrap",
            }}
        >
            نسخة
        </div>
    );
    const footer = (footerText || legalText) && (
        <div
            style={{
                background: "#f8fafc",
                padding: "6px 14px",
                fontSize: fontSize - 2,
                color: "#94a3b8",
                borderTop: "1px solid #e2e8f0",
            }}
        >
            {footerText && <div>{footerText}</div>}
            {legalText && (
                <div style={{ marginTop: 2, fontStyle: "italic" }}>
                    {legalText.slice(0, 80)}
                    {legalText.length > 80 ? "..." : ""}
                </div>
            )}
        </div>
    );

    if (design === "minimal")
        return (
            <div style={{ ...base, padding: "14px 16px" }}>
                {watermark}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "2px solid #1e293b",
                        paddingBottom: 8,
                        marginBottom: 10,
                    }}
                >
                    <div
                        style={{
                            fontWeight: 900,
                            fontSize: fontSize + 2,
                            color: "#1e293b",
                        }}
                    >
                        {companyName}
                    </div>
                    <div
                        style={{
                            fontSize: fontSize - 1,
                            color: "#64748b",
                            textAlign: "left",
                        }}
                    >
                        <div>FAC-2026-000001</div>
                        <div>{new Date().toLocaleDateString("fr-DZ")}</div>
                    </div>
                </div>
                <div
                    style={{
                        fontSize: fontSize - 1,
                        color: "#64748b",
                        marginBottom: 8,
                    }}
                >
                    الزبون: محمد بن علي
                </div>
                {tableBody}
                {stampBox}
            </div>
        );

    return (
        <div style={base}>
            {watermark}
            <div
                style={{
                    background: color,
                    color: "#fff",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                {showLogo && logo ? (
                    <img
                        src={logo}
                        alt=""
                        style={{ height: 32, objectFit: "contain" }}
                    />
                ) : (
                    <span style={{ fontWeight: 900, fontSize: fontSize + 2 }}>
                        {companyName}
                    </span>
                )}
                <span style={{ fontSize: fontSize - 1, opacity: 0.85 }}>
                    FAC-2026-000001
                </span>
            </div>
            <div style={{ padding: "10px 14px" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: fontSize - 1,
                        color: "#64748b",
                        marginBottom: 8,
                    }}
                >
                    <span>الزبون: محمد بن علي</span>
                    <span>{new Date().toLocaleDateString("fr-DZ")}</span>
                </div>
                {tableBody}
                {stampBox}
            </div>
            {footer}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ③ FiscalTab — مُصلَح: يستخدم useSettingsByGroup + makeGs
// ════════════════════════════════════════════════════════════════════════════
function FiscalTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { years, selectedYear, setSelectedYear } = useFiscalYear();
    const { isDirty, markDirty, markClean } = useDirtyState();
    const [confirmRegime, setConfirmRegime] = useState<{
        yearId: number;
        yearName: string;
    } | null>(null);

    // ✅ useSettingsByGroup يُرجع Setting[]
    const { data: rawSettings = [] } = useSettingsByGroup("fiscal");
    const gs = makeGs(rawSettings);
    const { mutateAsync: saveSettings, isPending: saving } =
        useUpdateSettings();

    const [regime, setRegime] = useState<"forfaitaire" | "reel">("reel");
    const [entityType, setEntityType] = useState<
        "pers_morale" | "pers_physique"
    >("pers_morale");
    const [ifuRate, setIfuRate] = useState<"5" | "12">("12");
    const [tvaRate, setTvaRate] = useState<"19" | "9">("19");
    const [fiscalStamp, setFiscalStamp] = useState(true);
    const [stampThreshold, setStampThreshold] = useState("30000");
    const [defaultCurrency, setDefaultCurrency] = useState("DZD");
    const [yearRegimes, setYearRegimes] = useState<
        Record<number, "forfaitaire" | "reel">
    >({});

    const { data: currencies = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.currencies(slug), 'settings-fiscal-tab'],
        queryFn: () => apiGet<any>("/currencies", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 60 * 60_000,
        placeholderData: [],
    });

    const initialSettings = useMemo(
        () => ({
            tax_regime: gs<string>("tax_regime", "reel"),
            entity_type: gs<string>("entity_type", "pers_morale"),
            ifu_rate: gs<string>("ifu_rate", "12"),
            default_tva_rate: gs<string>("default_tva_rate", "19"),
            fiscal_stamp_enabled: gs<boolean>("fiscal_stamp_enabled", true),
            fiscal_stamp_threshold: Number(gs("fiscal_stamp_threshold", 30000)),
            default_currency: gs<string>("default_currency", "DZD"),
            year_regimes: gs<Record<number, "forfaitaire" | "reel">>(
                "year_regimes",
                {},
            ),
        }),
        [rawSettings],
    );

    const getDiff = useSettingsDiff(initialSettings as Record<string, unknown>);

    useEffect(() => {
        if (!rawSettings.length) return;
        setRegime(gs<"forfaitaire" | "reel">("tax_regime", "reel"));
        setEntityType(
            gs<"pers_morale" | "pers_physique">("entity_type", "pers_morale"),
        );
        setIfuRate(gs<"5" | "12">("ifu_rate", "12"));
        setTvaRate(gs<"19" | "9">("default_tva_rate", "19"));
        setFiscalStamp(gs<boolean>("fiscal_stamp_enabled", true));
        setStampThreshold(str(gs("fiscal_stamp_threshold", 30000)));
        setDefaultCurrency(gs<string>("default_currency", "DZD"));
        setYearRegimes(
            gs<Record<number, "forfaitaire" | "reel">>("year_regimes", {}),
        );
    }, [rawSettings]);

    const currentYearRegime = selectedYear
        ? (yearRegimes[selectedYear.id] ?? regime)
        : regime;

    const setCurrentYearRegime = (r: "forfaitaire" | "reel") => {
        if (!selectedYear) return;
        const prev = yearRegimes[selectedYear.id] ?? regime;
        if (prev === "forfaitaire" && r === "reel") {
            setConfirmRegime({
                yearId: selectedYear.id,
                yearName: selectedYear.name,
            });
            return;
        }
        setYearRegimes((p) => ({ ...p, [selectedYear.id]: r }));
        markDirty();
        onDirty?.();
    };

    const doSave = async () => {
        const current = {
            tax_regime: regime,
            entity_type: entityType,
            ifu_rate: ifuRate,
            default_tva_rate: tvaRate,
            fiscal_stamp_enabled: fiscalStamp,
            fiscal_stamp_threshold: Number(stampThreshold),
            default_currency: defaultCurrency,
            year_regimes: yearRegimes as unknown,
        };
        const diff = getDiff(current as Record<string, unknown>);
        if (Object.keys(diff).length === 0) {
            markClean();
            onClean?.();
            return;
        }
        await saveSettings(diff as Record<string, unknown>);
        qc.invalidateQueries({
            queryKey: [...tenantKeys.settings.current(slug), "fiscal"],
        });
        markClean();
        onClean?.();
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                maxWidth: 760,
            }}
        >
            <ConfirmModal
                open={!!confirmRegime}
                title="تأكيد التحول إلى النظام الحقيقي"
                message={`هل تريد تحويل السنة "${confirmRegime?.yearName}" من الجزافي إلى الحقيقي؟`}
                confirmLabel="نعم، تحويل"
                confirmColor="#0a7c52"
                warning="التغيير مهم ولا يمكن التراجع تلقائياً. يُنصح بمراجعة المحاسب."
                onConfirm={() => {
                    if (confirmRegime) {
                        setYearRegimes((p) => ({
                            ...p,
                            [confirmRegime.yearId]: "reel",
                        }));
                        setConfirmRegime(null);
                        markDirty();
                        onDirty?.();
                    }
                }}
                onCancel={() => setConfirmRegime(null)}
            />

            {/* باقي محتوى FiscalTab بالكامل — مطابق للنسخة الأصلية لكن بـ gs() الصحيح */}
            <Card>
                <SecHead
                    icon="ti-calendar"
                    label="النظام الضريبي حسب السنة المالية"
                    color="var(--blue)"
                    sub="كل سنة مالية يمكن أن تخضع لنظام مختلف"
                />
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 14,
                        flexWrap: "wrap",
                    }}
                >
                    {years.map((y) => (
                        <button
                            key={y.id}
                            onClick={() => setSelectedYear(y)}
                            style={{
                                padding: "6px 14px",
                                borderRadius: 20,
                                cursor: "pointer",
                                fontSize: 12,
                                fontFamily: "Tajawal, sans-serif",
                                border:
                                    selectedYear?.id === y.id
                                        ? "2px solid var(--em)"
                                        : "1px solid var(--b2)",
                                background:
                                    selectedYear?.id === y.id
                                        ? "var(--emb)"
                                        : "var(--bg3)",
                                color:
                                    selectedYear?.id === y.id
                                        ? "var(--em)"
                                        : "var(--t2)",
                                fontWeight:
                                    selectedYear?.id === y.id ? 700 : 400,
                            }}
                        >
                            {y.name}
                            {(y as any).is_current && (
                                <i
                                    className="ti ti-star-filled"
                                    style={{
                                        color: "var(--gold)",
                                        fontSize: 9,
                                        marginRight: 4,
                                    }}
                                />
                            )}
                            {(y as any).is_closed && (
                                <i
                                    className="ti ti-lock"
                                    style={{
                                        color: "var(--t4)",
                                        fontSize: 9,
                                        marginRight: 4,
                                    }}
                                />
                            )}
                            {yearRegimes[y.id] && (
                                <span
                                    style={{
                                        marginRight: 6,
                                        fontSize: 10,
                                        padding: "1px 6px",
                                        borderRadius: 10,
                                        background:
                                            yearRegimes[y.id] === "reel"
                                                ? "color-mix(in srgb, var(--teal) 20%, transparent)"
                                                : "color-mix(in srgb, var(--gold) 20%, transparent)",
                                        color:
                                            yearRegimes[y.id] === "reel"
                                                ? "var(--teal)"
                                                : "var(--gold)",
                                    }}
                                >
                                    {yearRegimes[y.id] === "reel"
                                        ? "حقيقي"
                                        : "جزافي"}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {selectedYear && (
                    <div
                        style={{
                            padding: "14px 16px",
                            background: "var(--bg3)",
                            borderRadius: 10,
                            border: "1px solid var(--b2)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "var(--t2)",
                                marginBottom: 10,
                            }}
                        >
                            النظام الضريبي لـ{" "}
                            <span style={{ color: "var(--em)" }}>
                                {selectedYear.name}
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            {[
                                {
                                    v: "forfaitaire",
                                    l: "جزافي IFU",
                                    icon: "ti-leaf",
                                    color: "#d97706",
                                    desc: "رقم أعمال ≤ 8 مليون دج",
                                },
                                {
                                    v: "reel",
                                    l: "حقيقي Réel",
                                    icon: "ti-building",
                                    color: "#0a7c52",
                                    desc: "TVA + IBS/IRG + G50",
                                },
                            ].map(({ v, l, icon, color, desc }) => (
                                <button
                                    key={v}
                                    onClick={() =>
                                        !(selectedYear as any).is_closed &&
                                        setCurrentYearRegime(v as any)
                                    }
                                    disabled={(selectedYear as any).is_closed}
                                    style={{
                                        flex: 1,
                                        padding: "12px 16px",
                                        borderRadius: 10,
                                        cursor: (selectedYear as any).is_closed
                                            ? "not-allowed"
                                            : "pointer",
                                        border:
                                            currentYearRegime === v
                                                ? `2px solid ${color}`
                                                : "1px solid var(--b2)",
                                        background:
                                            currentYearRegime === v
                                                ? `${color}10`
                                                : "var(--bg2)",
                                        fontFamily: "Tajawal, sans-serif",
                                        opacity: (selectedYear as any).is_closed
                                            ? 0.6
                                            : 1,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            marginBottom: 4,
                                        }}
                                    >
                                        <i
                                            className={`ti ${icon}`}
                                            style={{ fontSize: 18, color }}
                                        />
                                        <span
                                            style={{
                                                fontWeight: 700,
                                                fontSize: 13,
                                                color:
                                                    currentYearRegime === v
                                                        ? color
                                                        : "var(--t1)",
                                            }}
                                        >
                                            {l}
                                        </span>
                                        {currentYearRegime === v && (
                                            <i
                                                className="ti ti-check"
                                                style={{
                                                    color,
                                                    fontSize: 12,
                                                    marginRight: "auto",
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "var(--t4)",
                                        }}
                                    >
                                        {desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            <Card>
                <SecHead
                    icon="ti-stamp"
                    label="الطابع الجبائي"
                    color="var(--purple)"
                    sub="Art. 2 du Code du Timbre / LF 2024"
                />
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                    }}
                >
                    <ToggleRow
                        label="تفعيل الطابع الجبائي"
                        hint="يُطبَّق على الفواتير التي تتجاوز الحد الأدنى"
                        checked={fiscalStamp}
                        onChange={(v) => {
                            setFiscalStamp(v);
                            markDirty();
                            onDirty?.();
                        }}
                    />
                    {fiscalStamp && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "4px 14px",
                            }}
                        >
                            <span style={{ fontSize: 12, color: "var(--t3)" }}>
                                الحد الأدنى
                            </span>
                            <input
                                type="number"
                                value={stampThreshold}
                                onChange={(e) => {
                                    setStampThreshold(e.target.value);
                                    markDirty();
                                    onDirty?.();
                                }}
                                style={{ width: 120, fontFamily: "monospace" }}
                            />
                            <span style={{ fontSize: 12, color: "var(--t3)" }}>
                                دج
                            </span>
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-currency-dollar"
                    label="العملة الافتراضية"
                    color="var(--gold)"
                />
                <div className="fg" style={{ maxWidth: 300 }}>
                    <select
                        value={defaultCurrency}
                        onChange={(e) => {
                            setDefaultCurrency(e.target.value);
                            markDirty();
                            onDirty?.();
                        }}
                    >
                        <option value="DZD">DZD — الدينار الجزائري</option>
                        {(currencies as any[])
                            .filter((c: any) => c.code !== "DZD")
                            .map((c: any) => (
                                <option key={c.id} value={c.code}>
                                    {c.code} — {c.name}
                                </option>
                            ))}
                    </select>
                </div>
            </Card>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <SettingsLastModified group="fiscal" />
                <SaveButton
                    onClick={doSave}
                    loading={saving}
                    isDirty={isDirty}
                    onClean={() => {
                        markClean();
                        onClean?.();
                    }}
                />
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ④ InventoryTab — مُصلَح
// ════════════════════════════════════════════════════════════════════════════
function InventoryTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();

    const { data: rawSettings = [] } = useSettingsByGroup("inventory");
    const gs = makeGs(rawSettings);
    const { mutateAsync: saveSettings, isPending: saving } =
        useUpdateSettings();

    const [valuationMethod, setValuationMethod] = useState<
        "fifo" | "lifo" | "weighted_average"
    >("weighted_average");
    const [allowNegativeStock, setAllowNegativeStock] = useState(false);
    const [manageLots, setManageLots] = useState(false);
    const [manageExpiry, setManageExpiry] = useState(false);
    const [lowStockDefault, setLowStockDefault] = useState("10");
    const [autoAdjust, setAutoAdjust] = useState(true);

    const { data: warehouses = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.warehouses(slug), 'inventory-tab'],
        queryFn: () => apiGet<any>("/warehouses", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });

    const initialSettings = useMemo(
        () => ({
            default_valuation_method: gs<string>(
                "default_valuation_method",
                "weighted_average",
            ),
            allow_negative_stock: gs<boolean>("allow_negative_stock", false),
            manage_lots: gs<boolean>("manage_lots", false),
            manage_expiry: gs<boolean>("manage_expiry", false),
            low_stock_default_threshold: Number(
                gs("low_stock_default_threshold", 10),
            ),
            auto_adjust_on_document: gs<boolean>(
                "auto_adjust_on_document",
                true,
            ),
        }),
        [rawSettings],
    );

    const getDiff = useSettingsDiff(initialSettings as Record<string, unknown>);

    useEffect(() => {
        if (!rawSettings.length) return;
        setValuationMethod(
            gs<"fifo" | "lifo" | "weighted_average">(
                "default_valuation_method",
                "weighted_average",
            ),
        );
        setAllowNegativeStock(gs<boolean>("allow_negative_stock", false));
        setManageLots(gs<boolean>("manage_lots", false));
        setManageExpiry(gs<boolean>("manage_expiry", false));
        setLowStockDefault(str(gs("low_stock_default_threshold", 10)));
        setAutoAdjust(gs<boolean>("auto_adjust_on_document", true));
    }, [rawSettings]);

    const doSave = async () => {
        const current = {
            default_valuation_method: valuationMethod,
            allow_negative_stock: allowNegativeStock,
            manage_lots: manageLots,
            manage_expiry: manageExpiry,
            low_stock_default_threshold: Number(lowStockDefault),
            auto_adjust_on_document: autoAdjust,
        };
        const diff = getDiff(current as Record<string, unknown>);
        if (Object.keys(diff).length === 0) {
            markClean();
            onClean?.();
            return;
        }
        await saveSettings(diff as Record<string, unknown>);
        qc.invalidateQueries({
            queryKey: [...tenantKeys.settings.current(slug), "inventory"],
        });
        // Sync POS negative-stock cache in localStorage
        if ("allow_negative_stock" in diff) {
            try {
                localStorage.setItem(
                    `pos-neg-stock-${slug}`,
                    allowNegativeStock ? "true" : "false",
                );
            } catch { /* ignore */ }
        }
        markClean();
        onClean?.();
    };

    const methods = [
        {
            id: "weighted_average",
            label: "PMP — المتوسط المرجح",
            desc: "Coût Moyen Pondéré — الأكثر شيوعاً في الجزائر",
            recommended: true,
        },
        {
            id: "fifo",
            label: "FIFO — الوارد أولاً يصدر أولاً",
            desc: "Premier Entré - Premier Sorti",
            recommended: false,
        },
        {
            id: "lifo",
            label: "LIFO — الوارد أخيراً يصدر أولاً",
            desc: "Dernier Entré - Premier Sorti",
            recommended: false,
        },
    ];

    const tr = (
        label: string,
        hint: string | undefined,
        checked: boolean,
        setter: (v: boolean) => void,
    ) => (
        <ToggleRow
            label={label}
            hint={hint}
            checked={checked}
            onChange={(v) => {
                setter(v);
                markDirty();
                onDirty?.();
            }}
        />
    );

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                maxWidth: 760,
            }}
        >
            <Card>
                <SecHead
                    icon="ti-calculator"
                    label="طريقة تقييم المخزون الافتراضية"
                    color="var(--blue)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {methods.map((m) => (
                        <div
                            key={m.id}
                            onClick={() => {
                                setValuationMethod(m.id as any);
                                markDirty();
                                onDirty?.();
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: "12px 16px",
                                borderRadius: 10,
                                cursor: "pointer",
                                border:
                                    valuationMethod === m.id
                                        ? "2px solid var(--em)"
                                        : "1px solid var(--b2)",
                                background:
                                    valuationMethod === m.id
                                        ? "var(--emb)"
                                        : "var(--bg3)",
                                transition: ".15s",
                            }}
                        >
                            <div
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: "50%",
                                    border: `2px solid ${valuationMethod === m.id ? "var(--em)" : "var(--b3)"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                {valuationMethod === m.id && (
                                    <div
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            background: "var(--em)",
                                        }}
                                    />
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color:
                                                valuationMethod === m.id
                                                    ? "var(--em)"
                                                    : "var(--t1)",
                                        }}
                                    >
                                        {m.label}
                                    </span>
                                    {m.recommended && (
                                        <span
                                            style={{
                                                fontSize: 9.5,
                                                padding: "2px 7px",
                                                borderRadius: 10,
                                                background:
                                                    "color-mix(in srgb, var(--em) 15%, transparent)",
                                                color: "var(--em)",
                                                fontWeight: 700,
                                            }}
                                        >
                                            مُوصى به
                                        </span>
                                    )}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--t4)",
                                        marginTop: 2,
                                    }}
                                >
                                    {m.desc}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {warehouses.length > 0 && (
                    <div
                        style={{
                            marginTop: 10,
                            padding: "8px 12px",
                            background:
                                "color-mix(in srgb, var(--blue) 8%, transparent)",
                            borderRadius: 8,
                            border: "1px solid color-mix(in srgb, var(--blue) 20%, transparent)",
                            fontSize: 11,
                            color: "var(--t2)",
                        }}
                    >
                        <i
                            className="ti ti-info-circle"
                            style={{ color: "var(--blue)", marginLeft: 4 }}
                        />
                        المستودعات:{" "}
                        {(warehouses as any[])
                            .map((w: any) => w.name)
                            .join(" — ")}
                    </div>
                )}
            </Card>

            <Card>
                <SecHead icon="ti-settings-2" label="إعدادات المخزون العامة" />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "السماح بالمخزون السالب",
                        "يسمح بالبيع حتى لو لا يوجد رصيد",
                        allowNegativeStock,
                        setAllowNegativeStock,
                    )}
                    {tr(
                        "إدارة اللوطات",
                        "تتبع دفعات الشراء وأرقام السلاسل",
                        manageLots,
                        setManageLots,
                    )}
                    {tr(
                        "إدارة تواريخ انتهاء الصلاحية",
                        "تنبيه عند اقتراب انتهاء صلاحية اللوط",
                        manageExpiry,
                        setManageExpiry,
                    )}
                    {tr(
                        "تحديث المخزون تلقائياً",
                        "يُحدِّث الرصيد لحظة التحقق من الوثيقة",
                        autoAdjust,
                        setAutoAdjust,
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-alert-triangle"
                    label="حد تنبيه المخزون الافتراضي"
                    color="var(--red)"
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: "var(--t2)" }}>
                        التنبيه عند وصول الكمية إلى أقل من
                    </span>
                    <input
                        type="number"
                        value={lowStockDefault}
                        onChange={(e) => {
                            setLowStockDefault(e.target.value);
                            markDirty();
                            onDirty?.();
                        }}
                        style={{
                            width: 90,
                            fontFamily: "monospace",
                            textAlign: "center",
                        }}
                        min={0}
                    />
                    <span style={{ fontSize: 13, color: "var(--t2)" }}>
                        وحدة
                    </span>
                </div>
            </Card>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <SettingsLastModified group="inventory" />
                <SaveButton
                    onClick={doSave}
                    loading={saving}
                    isDirty={isDirty}
                    onClean={() => {
                        markClean();
                        onClean?.();
                    }}
                />
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ⑤ DocumentsTab — إعدادات المستندات الافتراضية
// ════════════════════════════════════════════════════════════════════════════
function DocumentsTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();
    const { data: rawSettings = [] } = useSettingsByGroup("documents");
    const { data: rawInvSettings = [] } = useSettingsByGroup("inventory");
    const allSettings = useMemo(() => [...rawSettings, ...rawInvSettings], [rawSettings, rawInvSettings]);
    const gs = makeGs(allSettings);
    const { mutateAsync: saveSettings, isPending: saving } = useUpdateSettings();

    const [warehouseId, setWarehouseId] = useState("");
    const [currencyId, setCurrencyId] = useState("1");
    const [priceLevelId, setPriceLevelId] = useState("");
    const [paymentModeId, setPaymentModeId] = useState("");
    const [treasuryAccountId, setTreasuryAccountId] = useState("");
    const [fyBehavior, setFyBehavior] = useState("current");
    const [lineMode, setLineMode] = useState("table");
    const [visibleCols, setVisibleCols] = useState("");
    const [allowNegativeOnSale, setAllowNegativeOnSale] = useState(false);
    const [autoCreateLot, setAutoCreateLot] = useState(true);

    const { data: warehouses = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.warehouses(slug), 'settings-tab'],
        queryFn: () => apiGet<any>("/warehouses", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: currencies = [] } = useQuery({
        queryKey: [slug, "currencies", "settings-tab"],
        queryFn: () => apiGet<any>("/currencies", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: priceLevels = [] } = useQuery({
        queryKey: [slug, "price-levels", "settings-tab"],
        queryFn: () => apiGet<any>("/price-levels", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: paymentModes = [] } = useQuery({
        queryKey: [slug, "payment-modes", "settings-tab"],
        queryFn: () => apiGet<any>("/payment-modes", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });
    const { data: treasuryAccounts = [] } = useQuery({
        queryKey: [slug, "treasury-accounts", "settings-tab"],
        queryFn: () => apiGet<any>("/treasury-accounts", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 10 * 60_000,
        placeholderData: [],
    });

    const initialSettings = useMemo(
        () => ({
            default_warehouse_id: Number(gs("default_warehouse_id", "")),
            default_currency_id: Number(gs("default_currency_id", 1)),
            default_price_level_id: Number(gs("default_price_level_id", "")),
            default_payment_mode_id: Number(gs("default_payment_mode_id", "")),
            default_treasury_account_id: Number(gs("default_treasury_account_id", "")),
            default_fiscal_year_behavior: gs<string>("default_fiscal_year_behavior", "current"),
            documents_default_line_mode: gs<string>("documents_default_line_mode", "table"),
            documents_default_visible_cols: gs<string[]>("documents_default_visible_cols", []),
            allow_negative_stock_on_sale: gs<boolean>("allow_negative_stock_on_sale", false),
            auto_create_lot_on_purchase: gs<boolean>("auto_create_lot_on_purchase", true),
        }),
        [allSettings],
    );

    const getDiff = useSettingsDiff(initialSettings as Record<string, unknown>);

    useEffect(() => {
        if (!allSettings.length) return;
        setWarehouseId(str(gs("default_warehouse_id", "")));
        setCurrencyId(str(gs("default_currency_id", 1)));
        setPriceLevelId(str(gs("default_price_level_id", "")));
        setPaymentModeId(str(gs("default_payment_mode_id", "")));
        setTreasuryAccountId(str(gs("default_treasury_account_id", "")));
        setFyBehavior(gs<string>("default_fiscal_year_behavior", "current"));
        setLineMode(gs<string>("documents_default_line_mode", "table"));
        const cols = gs<string[]>("documents_default_visible_cols", []);
        setVisibleCols(Array.isArray(cols) ? cols.join(", ") : "");
        setAllowNegativeOnSale(gs<boolean>("allow_negative_stock_on_sale", false));
        setAutoCreateLot(gs<boolean>("auto_create_lot_on_purchase", true));
    }, [allSettings]);

    const doSave = async () => {
        const current = {
            default_warehouse_id: warehouseId ? Number(warehouseId) : null,
            default_currency_id: Number(currencyId),
            default_price_level_id: priceLevelId ? Number(priceLevelId) : null,
            default_payment_mode_id: paymentModeId ? Number(paymentModeId) : null,
            default_treasury_account_id: treasuryAccountId ? Number(treasuryAccountId) : null,
            default_fiscal_year_behavior: fyBehavior,
            documents_default_line_mode: lineMode,
            documents_default_visible_cols: visibleCols.split(",").map(s => s.trim()).filter(Boolean),
            allow_negative_stock_on_sale: allowNegativeOnSale,
            auto_create_lot_on_purchase: autoCreateLot,
        };
        const diff = getDiff(current as Record<string, unknown>);
        if (Object.keys(diff).length === 0) return;
        await saveSettings(diff);
        await qc.invalidateQueries({ queryKey: tenantKeys.settings.current(slug) });
        markClean();
        onClean?.();
    };

    return (
        <div>
            <Card>
                <SecHead icon="ti-archive" label="الافتراضيات الأساسية" />
                <div className="fgrid c2">
                    <div className="fg">
                        <label>المستودع الافتراضي</label>
                        <select value={warehouseId} onChange={e => { setWarehouseId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— اختر —</option>
                            {(warehouses as any[]).map((w: any) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>العملة الافتراضية</label>
                        <select value={currencyId} onChange={e => { setCurrencyId(e.target.value); markDirty(); onDirty?.(); }}>
                            {(currencies as any[]).map((c: any) => (
                                <option key={c.id} value={c.id}>{c.code ?? c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>فئة السعر الافتراضية</label>
                        <select value={priceLevelId} onChange={e => { setPriceLevelId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— بدون —</option>
                            {(priceLevels as any[]).map((pl: any) => (
                                <option key={pl.id} value={pl.id}>{pl.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>طريقة الدفع الافتراضية</label>
                        <select value={paymentModeId} onChange={e => { setPaymentModeId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— اختر —</option>
                            {(paymentModes as any[]).map((pm: any) => (
                                <option key={pm.id} value={pm.id}>{pm.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label>حساب الخزينة الافتراضي</label>
                        <select value={treasuryAccountId} onChange={e => { setTreasuryAccountId(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="">— اختر —</option>
                            {(treasuryAccounts as any[]).map((ta: any) => (
                                <option key={ta.id} value={ta.id}>{ta.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <Card>
                <SecHead icon="ti-settings" label="سلوك المستندات" />
                <div className="fgrid c2">
                    <div className="fg">
                        <label>سلوك السنة المالية</label>
                        <select value={fyBehavior} onChange={e => { setFyBehavior(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="current">تلقائي (current)</option>
                            <option value="prompt">طلب من المستخدم (prompt)</option>
                        </select>
                    </div>
                    <div className="fg">
                        <label>وضع عرض الأسطر الافتراضي</label>
                        <select value={lineMode} onChange={e => { setLineMode(e.target.value); markDirty(); onDirty?.(); }}>
                            <option value="table">جدول (table)</option>
                            <option value="card">بطاقات (card)</option>
                        </select>
                    </div>
                </div>
                <div style={{ marginTop: 12 }}>
                    <label>الأعمدة الظاهرة في جدول الأسطر (مفصولة بفاصلة)</label>
                    <input
                        type="text"
                        value={visibleCols}
                        onChange={e => { setVisibleCols(e.target.value); markDirty(); onDirty?.(); }}
                        placeholder="idx, product, packaging, quantity, ..."
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
                    />
                </div>
            </Card>

            <Card>
                <SecHead icon="ti-toggle-left" label="خيارات التبديل" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ToggleRow
                        label="منع البيع بدون مخزون كافٍ"
                        hint="تجاوز إعداد المنتج الفردي ومنع البيع نهائياً"
                        checked={!allowNegativeOnSale}
                        onChange={v => { setAllowNegativeOnSale(!v); markDirty(); onDirty?.(); }}
                    />
                    <ToggleRow
                        label="إنشاء دفعة (Lot) تلقائياً"
                        hint="عند شراء منتج يدير اللوطات"
                        checked={autoCreateLot}
                        onChange={v => { setAutoCreateLot(v); markDirty(); onDirty?.(); }}
                    />
                </div>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SettingsLastModified group="documents" />
                <SaveButton
                    onClick={doSave}
                    loading={saving}
                    isDirty={isDirty}
                    onClean={() => { markClean(); onClean?.(); }}
                />
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ⑥ AlertsTab — مُصلَح
// ════════════════════════════════════════════════════════════════════════════
function AlertsTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();

    const { data: rawSettings = [] } = useSettingsByGroup("alerts");
    const gs = makeGs(rawSettings);
    const { mutateAsync: saveSettings, isPending: saving } =
        useUpdateSettings();

    // ✅ نستخدم fiscalSettings للحصول على النظام الضريبي
    const { data: fiscalSettings = [] } = useSettingsByGroup("fiscal");
    const gsFiscal = makeGs(fiscalSettings);
    const { selectedYear } = useFiscalYear();
    const yearRegimes = gsFiscal<Record<number, "forfaitaire" | "reel">>(
        "year_regimes",
        {},
    );
    const defaultRegime = gsFiscal<"forfaitaire" | "reel">(
        "tax_regime",
        "reel",
    );
    const currentYearRegime = selectedYear
        ? (yearRegimes[selectedYear.id] ?? defaultRegime)
        : defaultRegime;

    const [alertLowStock, setAlertLowStock] = useState(true);
    const [alertOutOfStock, setAlertOutOfStock] = useState(true);
    const [lowStockThres, setLowStockThres] = useState("10");
    const [alertDebtDue, setAlertDebtDue] = useState(true);
    const [debtDueDays, setDebtDueDays] = useState("7");
    const [alertOverdue, setAlertOverdue] = useState(true);
    const [alertFiscalClose, setAlertFiscalClose] = useState(true);
    const [fiscalCloseDays, setFiscalCloseDays] = useState("30");
    const [alertG50, setAlertG50] = useState(true);
    const [g50Days, setG50Days] = useState("5");
    const [alertG12, setAlertG12] = useState(true);
    const [alertG12bis, setAlertG12bis] = useState(true);
    const [alertDraftDocs, setAlertDraftDocs] = useState(false);
    const [draftDocsDays, setDraftDocsDays] = useState("3");
    const [emailNotif, setEmailNotif] = useState(false);
    const [notifEmail, setNotifEmail] = useState("");

    useEffect(() => {
        if (!rawSettings.length) return;
        setAlertLowStock(gs<boolean>("alert_low_stock", true));
        setAlertOutOfStock(gs<boolean>("alert_out_of_stock", true));
        setLowStockThres(str(gs("low_stock_threshold", 10)));
        setAlertDebtDue(gs<boolean>("alert_debt_due", true));
        setDebtDueDays(str(gs("debt_due_days", 7)));
        setAlertOverdue(gs<boolean>("alert_overdue_debts", true));
        setAlertFiscalClose(gs<boolean>("alert_fiscal_close", true));
        setFiscalCloseDays(str(gs("fiscal_close_days", 30)));
        setAlertG50(gs<boolean>("alert_g50", true));
        setG50Days(str(gs("g50_days_before", 5)));
        setAlertG12(gs<boolean>("alert_g12", true));
        setAlertG12bis(gs<boolean>("alert_g12bis", true));
        setAlertDraftDocs(gs<boolean>("alert_draft_docs", false));
        setDraftDocsDays(str(gs("draft_docs_days", 3)));
        setEmailNotif(gs<boolean>("email_notifications", false));
        setNotifEmail(gs<string>("notif_email", ""));
    }, [rawSettings]);

    const doSave = async () => {
        const payload: Record<string, unknown> = {
            alert_low_stock: alertLowStock,
            alert_out_of_stock: alertOutOfStock,
            low_stock_threshold: Number(lowStockThres),
            alert_debt_due: alertDebtDue,
            debt_due_days: Number(debtDueDays),
            alert_overdue_debts: alertOverdue,
            alert_fiscal_close: alertFiscalClose,
            fiscal_close_days: Number(fiscalCloseDays),
            alert_g50: alertG50,
            g50_days_before: Number(g50Days),
            alert_g12: alertG12,
            alert_g12bis: alertG12bis,
            alert_draft_docs: alertDraftDocs,
            draft_docs_days: Number(draftDocsDays),
            email_notifications: emailNotif,
            notif_email: notifEmail,
        };
        await saveSettings(payload);
        qc.invalidateQueries({
            queryKey: [...tenantKeys.settings.current(slug), "alerts"],
        });
        markClean();
        onClean?.();
    };

    useAutoSave(isDirty, doSave, true, 2000);

    const tr = (
        label: string,
        hint: string | undefined,
        checked: boolean,
        setter: (v: boolean) => void,
    ) => (
        <ToggleRow
            label={label}
            hint={hint}
            checked={checked}
            onChange={(v) => {
                setter(v);
                markDirty();
                onDirty?.();
            }}
        />
    );

    const DInput = ({
        val,
        set: setFn,
        pre = "التنبيه قبل",
        suf = "يوم",
    }: {
        val: string;
        set: (v: string) => void;
        pre?: string;
        suf?: string;
    }) => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "2px 14px 8px",
            }}
        >
            <span style={{ fontSize: 12, color: "var(--t4)" }}>{pre}</span>
            <input
                type="number"
                value={val}
                onChange={(e) => {
                    setFn(e.target.value);
                    markDirty();
                    onDirty?.();
                }}
                style={{ width: 65 }}
                min={1}
                max={90}
            />
            <span style={{ fontSize: 12, color: "var(--t4)" }}>{suf}</span>
        </div>
    );

    return (
        <div
            style={{
                maxWidth: 680,
                display: "flex",
                flexDirection: "column",
                gap: 14,
            }}
        >
            <Card>
                <SecHead
                    icon="ti-box"
                    label="تنبيهات المخزون"
                    color="var(--blue)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "تنبيه عند انخفاض المخزون",
                        "عند الوصول للحد الأدنى",
                        alertLowStock,
                        setAlertLowStock,
                    )}
                    {alertLowStock && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "2px 14px 8px",
                            }}
                        >
                            <span style={{ fontSize: 12, color: "var(--t4)" }}>
                                الحد الأدنى
                            </span>
                            <input
                                type="number"
                                value={lowStockThres}
                                onChange={(e) => {
                                    setLowStockThres(e.target.value);
                                    markDirty();
                                    onDirty?.();
                                }}
                                style={{ width: 80 }}
                                min={1}
                            />
                            <span style={{ fontSize: 12, color: "var(--t4)" }}>
                                وحدة
                            </span>
                        </div>
                    )}
                    {tr(
                        "تنبيه عند نفاذ المخزون",
                        "عند الوصول إلى صفر",
                        alertOutOfStock,
                        setAlertOutOfStock,
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-coins"
                    label="تنبيهات الديون"
                    color="var(--red)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "تنبيه قبل استحقاق فاتورة",
                        "قبل تاريخ الاستحقاق",
                        alertDebtDue,
                        setAlertDebtDue,
                    )}
                    {alertDebtDue && (
                        <DInput val={debtDueDays} set={setDebtDueDays} />
                    )}
                    {tr(
                        "تنبيه عند الديون المتأخرة",
                        "الفواتير التي تجاوزت تاريخ استحقاقها",
                        alertOverdue,
                        setAlertOverdue,
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-calendar-event"
                    label="التنبيهات الجبائية"
                    color="var(--gold)"
                    sub={`النظام الضريبي الحالي: ${currentYearRegime === "reel" ? "حقيقي" : "جزافي"}`}
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "تنبيه قبل إقفال السنة المالية",
                        "لإتمام التسويات المحاسبية",
                        alertFiscalClose,
                        setAlertFiscalClose,
                    )}
                    {alertFiscalClose && (
                        <DInput
                            val={fiscalCloseDays}
                            set={setFiscalCloseDays}
                        />
                    )}
                    {currentYearRegime === "reel" && (
                        <>
                            {tr(
                                "تنبيه موعد G50 الشهري",
                                "قبل الـ 20 من كل شهر",
                                alertG50,
                                setAlertG50,
                            )}
                            {alertG50 && (
                                <DInput
                                    val={g50Days}
                                    set={setG50Days}
                                    suf="يوم من الاستحقاق"
                                />
                            )}
                        </>
                    )}
                    {currentYearRegime === "forfaitaire" && (
                        <>
                            {tr(
                                "تنبيه موعد G12 السنوي",
                                "الإقرار النهائي — قبل 20 يناير",
                                alertG12,
                                setAlertG12,
                            )}
                            {tr(
                                "تنبيه موعد G12bis",
                                "الدفع المجزأ — قبل 30 يونيو",
                                alertG12bis,
                                setAlertG12bis,
                            )}
                        </>
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-file-description"
                    label="تنبيهات المستندات"
                    color="var(--teal)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "تنبيه عند وجود مسودات قديمة",
                        "مستندات بقيت بدون معالجة",
                        alertDraftDocs,
                        setAlertDraftDocs,
                    )}
                    {alertDraftDocs && (
                        <DInput
                            val={draftDocsDays}
                            set={setDraftDocsDays}
                            pre="بعد"
                            suf="أيام بدون تحديث"
                        />
                    )}
                </div>
            </Card>

            <Card>
                <SecHead
                    icon="ti-mail"
                    label="إشعارات البريد"
                    color="var(--em)"
                />
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                    {tr(
                        "إرسال ملخص يومي بالبريد",
                        "يُرسَل كل صباح عند وجود تنبيهات",
                        emailNotif,
                        setEmailNotif,
                    )}
                    {emailNotif && (
                        <div style={{ padding: "2px 14px 8px" }}>
                            <label style={{ fontSize: 12, color: "var(--t4)" }}>
                                البريد المستقبِل
                            </label>
                            <input
                                type="email"
                                value={notifEmail}
                                onChange={(e) => {
                                    setNotifEmail(e.target.value);
                                    markDirty();
                                    onDirty?.();
                                }}
                                placeholder="alerts@example.com"
                                style={{ marginTop: 4, width: "100%" }}
                            />
                        </div>
                    )}
                </div>
            </Card>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <SettingsLastModified group="alerts" />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--t4)" }}>
                        <i className="ti ti-robot" style={{ marginLeft: 4 }} />
                        حفظ تلقائي
                    </span>
                    <SaveButton
                        onClick={doSave}
                        loading={saving}
                        isDirty={isDirty}
                        onClean={() => {
                            markClean();
                            onClean?.();
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// ⑥ UsersTab — لم يتغير (يستخدم companies API وليس settings)
// ════════════════════════════════════════════════════════════════════════════
function UsersTab() {
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

// ════════════════════════════════════════════════════════════════════════════
// ⑦ PlanTab — لم يتغير
// ════════════════════════════════════════════════════════════════════════════
const PLANS_META: Record<
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

// ════════════════════════════════════════════════════════════════════════════
// ⑨ ConversionsTab — خريطة التحويل بين أنواع المستندات
// ════════════════════════════════════════════════════════════════════════════
function ConversionsTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const qc = useQueryClient();
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();
    const [rules, setRules] = useState<Array<{ id?: number; source_code: string; target_code: string; display_order: number }>>([]);
    const [saveErr, setSaveErr] = useState("");
    const [saving, setSaving] = useState(false);

    const { data: docTypes = [], isLoading: loadingTypes } = useQuery({
        queryKey: [slug, 'document-type-conversions', 'document-types'],
        queryFn: () => apiGet<any[]>('/document-type-conversions/document-types'),
        enabled: !!slug,
        staleTime: 10 * 60_000,
    });

    const { data: fetchedRules = [], isLoading: loadingRules } = useQuery({
        queryKey: tenantKeys.conversions.all(slug),
        queryFn: () => apiGet<any[]>('/document-type-conversions'),
        enabled: !!slug,
    });

    useEffect(() => {
        if (fetchedRules.length > 0 && rules.length === 0) {
            setRules(fetchedRules.map(r => ({ id: r.id, source_code: r.source_code, target_code: r.target_code, display_order: r.display_order ?? 0 })));
        }
    }, [fetchedRules]);

    const seedDefaults = useCallback(() => {
        const defaults: Array<{ source_code: string; target_code: string; display_order: number }> = [
            { source_code: 'DEV', target_code: 'BCC', display_order: 1 },
            { source_code: 'DEV', target_code: 'BL',  display_order: 2 },
            { source_code: 'DEV', target_code: 'FV',  display_order: 3 },
            { source_code: 'BCC', target_code: 'BL',  display_order: 1 },
            { source_code: 'BCC', target_code: 'FV',  display_order: 2 },
            { source_code: 'BL',  target_code: 'FV',  display_order: 1 },
            { source_code: 'DDP', target_code: 'BCF', display_order: 1 },
            { source_code: 'BCF', target_code: 'BR',  display_order: 1 },
            { source_code: 'BCF', target_code: 'FA',  display_order: 2 },
            { source_code: 'BR',  target_code: 'FA',  display_order: 1 },
        ];
        setRules(defaults);
        markDirty();
        onDirty?.();
    }, [markDirty, onDirty]);

    const addRule = useCallback(() => {
        const firstType = docTypes[0]?.code ?? '';
        setRules(prev => [...prev, { source_code: firstType, target_code: firstType, display_order: prev.length }]);
        markDirty();
        onDirty?.();
    }, [docTypes, markDirty, onDirty]);

    const removeRule = useCallback((idx: number) => {
        setRules(prev => prev.filter((_, i) => i !== idx));
        markDirty();
        onDirty?.();
    }, [markDirty, onDirty]);

    const updateRule = useCallback((idx: number, field: string, value: string | number) => {
        setRules(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
        markDirty();
        onDirty?.();
    }, [markDirty, onDirty]);

    const handleSave = useCallback(async () => {
        setSaveErr("");
        setSaving(true);
        try {
            await apiPost('/document-type-conversions/bulk-update', { conversions: rules });
            await qc.invalidateQueries({ queryKey: tenantKeys.conversions.all(slug) });
            markClean();
            onClean?.();
        } catch (e: unknown) {
            setSaveErr(String((e as Record<string, unknown>)?.message ?? 'فشل الحفظ'));
        } finally {
            setSaving(false);
        }
    }, [rules, slug, qc, markClean, onClean]);

    const isLoading = loadingTypes || loadingRules;

    return (
        <div style={{ maxWidth: 760 }}>
            <Card>
                <SecHead icon="ti-transfer" label="خريطة التحويل بين أنواع المستندات" sub="حدد أنواع المستندات التي يمكن التحويل منها وإليها" />
                {saveErr && (
                    <div style={{ padding: '8px 12px', borderRadius: 'var(--r2)', marginBottom: 12, background: 'var(--redb)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>{saveErr}</div>
                )}
                {isLoading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
                        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', marginLeft: 6 }} />
                        جاري التحميل...
                    </div>
                ) : rules.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
                        لا توجد قواعد تحويل بعد.
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <Button size="sm" variant="outline" icon={<i className="ti ti-plus" />} onClick={addRule}>
                                إضافة قاعدة يدوياً
                            </Button>
                            <Button size="sm" variant="primary" icon={<i className="ti ti-refresh" />} onClick={seedDefaults}>
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
                                        <td style={{ color: 'var(--t4)', fontSize: 11 }}>{idx + 1}</td>
                                        <td>
                                            <select
                                                value={rule.source_code}
                                                onChange={e => updateRule(idx, 'source_code', e.target.value)}
                                                style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit' }}
                                            >
                                                {docTypes.map((dt: any) => (
                                                    <option key={dt.code} value={dt.code}>{dt.code} · {dt.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                value={rule.target_code}
                                                onChange={e => updateRule(idx, 'target_code', e.target.value)}
                                                style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit' }}
                                            >
                                                {docTypes.map((dt: any) => (
                                                    <option key={dt.code} value={dt.code}>{dt.code} · {dt.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min={0}
                                                value={rule.display_order}
                                                onChange={e => updateRule(idx, 'display_order', parseInt(e.target.value) || 0)}
                                                style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
                                            />
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => removeRule(idx)}
                                                style={{ padding: '4px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--red)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
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
                <Button size="sm" variant="outline" icon={<i className="ti ti-plus" />} onClick={addRule}>
                    إضافة قاعدة
                </Button>
            </Card>
            <SaveButton onClick={handleSave} loading={saving} isDirty={isDirty} onClean={() => { markClean(); onClean?.(); }} />
        </div>
    );
}

function PlanTab() {
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
                    background: "color-mix(in srgb, var(--em) 7%, transparent)",
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

// ─── PrintersTab ─────────────────────────────────────────────────────────────

function PrintersTab({ onDirty: _onDirty, onClean: _onClean }: { onDirty?: () => void; onClean?: () => void }) {
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();
    const [printers, setPrinters] = useState<DetectedPrinter[]>(() => deviceGetPrinters(slug));
    const [detecting, setDetecting] = useState(false);
    const [addModal, setAddModal] = useState(false);
    const [manualName, setManualName] = useState("");
    const [manualId, setManualId] = useState("");
    const [webUsbSupported] = useState(() => isWebUsbSupported());

    useEffect(() => {
        setPrinters(deviceGetPrinters(slug));
    }, [slug]);

    const defaultPrinterId = printers.find(p => p.isDefault)?.id ?? null;

    const save = useCallback((next: DetectedPrinter[]) => {
        setPrinters(next);
        deviceSavePrinters(slug, next);
        markDirty();
    }, [slug, markDirty]);

    const handleDetect = useCallback(async () => {
        setDetecting(true);
        try {
            const usbDevices = await getConnectedPrinters();
            const existing = deviceGetPrinters(slug);
            const existingIds = new Set(existing.map(p => p.id));

            const detected: DetectedPrinter[] = usbDevices.map((d: any) => ({
                id: `usb:${d.vendorId}:${d.productId}:${d.serialNumber ?? 'no-serial'}`,
                name: d.productName || d.manufacturerName || `USB Device ${d.vendorId}`,
                isDefault: false,
                status: 'ready' as const,
                source: 'usb' as const,
            }));

            const merged = [...existing];
            for (const d of detected) {
                if (!existingIds.has(d.id)) merged.push(d);
            }
            save(merged);
        } catch {
            /* ignore */
        } finally {
            setDetecting(false);
        }
    }, [slug, save]);

    const handlePairNew = useCallback(async () => {
        const usb = (navigator as any).usb;
        if (!usb) return;
        try {
            const device = await usb.requestDevice({ filters: [] });
            await device.open();
            const name = device.productName || device.manufacturerName || `USB Device`;
            const id = `usb:${device.vendorId}:${device.productId}:${device.serialNumber ?? 'no-serial'}`;
            await device.close();

            const existing = deviceGetPrinters(slug);
            if (existing.some(p => p.id === id)) return;
            save([...existing, { id, name, isDefault: false, status: 'ready', source: 'usb' }]);
        } catch {
            /* user cancelled */
        }
    }, [slug, save]);

    const handleAddManual = useCallback(() => {
        if (!manualName.trim()) return;
        const id = manualId.trim() || `manual:${Date.now()}`;
        const existing = deviceGetPrinters(slug);
        if (existing.some(p => p.id === id)) return;
        save([...existing, { id, name: manualName.trim(), isDefault: false, status: 'unknown', source: 'manual' }]);
        setManualName("");
        setManualId("");
        setAddModal(false);
    }, [slug, manualName, manualId, save]);

    const handleSetDefault = useCallback((id: string) => {
        save(printers.map(p => ({ ...p, isDefault: p.id === id })));
    }, [printers, save]);

    const handleRemove = useCallback((id: string) => {
        save(printers.filter(p => p.id !== id));
    }, [printers, save]);

    const handleTestPrint = useCallback(async (printer: DetectedPrinter) => {
        if (printer.source !== 'usb') return;
        try {
            const usb = (navigator as any).usb;
            const devices = await usb.getDevices();
            const device = devices.find((d: any) => {
                const did = `usb:${d.vendorId}:${d.productId}:${d.serialNumber ?? 'no-serial'}`;
                return did === printer.id;
            });
            if (!device) return;
            await device.open();
            if (device.configuration === null) await device.selectConfiguration(1);
            const config = device.configuration;
            let ifaceNum = 0;
            let epNum = 2;
            for (let i = 0; i < (config?.interfaces?.length ?? 0); i++) {
                const iface = config.interfaces[i];
                const alt = iface.alternates?.[0];
                if (!alt || alt.interfaceClass === 0x02) continue;
                const ep = alt.endpoints?.find((e: any) => e.direction === 'out' && (e.type === 'bulk' || e.type === 'interrupt'));
                if (ep) { ifaceNum = iface.interfaceNumber; epNum = ep.endpointNumber; break; }
            }
            await device.claimInterface(ifaceNum);
            const testBytes = new Uint8Array([0x1B, 0x40, 0x1B, 0x61, 0x01, ...new TextEncoder().encode('--- TEST ---\nPrinter OK\n'), 0x1D, 0x56, 0x00]);
            await device.transferOut(epNum, testBytes);
            await device.releaseInterface(ifaceNum);
            try { await device.close(); } catch {}
        } catch {}
    }, []);

    const webUsbLabel = webUsbSupported ? 'مدعوم' : 'غير مدعوم — يرجى استخدام Chrome أو Edge';
    const webUsbColor = webUsbSupported ? 'var(--em)' : 'var(--red)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>
            {/* WebUSB Status */}
            <Card title=".hardware" titleIcon="ti-chip">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <i className="ti ti-chip" style={{ fontSize: 18, color: webUsbColor }} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>WebUSB</div>
                        <div style={{ fontSize: 12, color: 'var(--t4)' }}>{webUsbLabel}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-xs"
                        onClick={handleDetect}
                        disabled={detecting}
                        type="button"
                    >
                        {detecting
                            ? <><i className="ti ti-loader-2 spin" /> جارٍ الكشف...</>
                            : <><i className="ti ti-refresh" /> كشف الطابعات المتصلة</>
                        }
                    </button>
                    {webUsbSupported && (
                        <button className="btn btn-xs" onClick={handlePairNew} type="button">
                            <i className="ti ti-plus" /> زوج طابعة جديدة (USB)
                        </button>
                    )}
                    <button className="btn btn-xs" onClick={() => setAddModal(true)} type="button">
                        <i className="ti ti-pencil" /> إضافة يدوية
                    </button>
                </div>
            </Card>

            {/* Printer list */}
            <Card title="الطابعات" titleIcon="ti-printer">
                {printers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--t4)', fontSize: 13 }}>
                        <i className="ti ti-printer-off" style={{ fontSize: 36, display: 'block', marginBottom: 8, opacity: 0.3 }} />
                        لا توجد طابعات مسجلة
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {printers.map(p => (
                            <div
                                key={p.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    border: `1.5px solid ${p.isDefault ? 'var(--em)' : 'var(--b2)'}`,
                                    background: p.isDefault ? 'color-mix(in srgb, var(--em) 5%, transparent)' : 'var(--b1)',
                                    transition: 'all .15s',
                                }}
                            >
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: p.status === 'ready' ? 'var(--em)' : p.status === 'offline' ? 'var(--red)' : 'var(--t4)',
                                        flexShrink: 0,
                                    }}
                                />
                                <i className={`ti ${p.source === 'usb' ? 'ti-plug-connected' : 'ti-device-desktop'}`}
                                    style={{ fontSize: 16, color: 'var(--t3)' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {p.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', gap: 8, marginTop: 2 }}>
                                        <span>{p.source === 'usb' ? 'USB' : 'يدوي'}</span>
                                        <span>{p.status === 'ready' ? 'جاهزة' : p.status === 'offline' ? 'غير متصلة' : 'غير معروفة'}</span>
                                        {p.isDefault && <span style={{ color: 'var(--em)', fontWeight: 600 }}>افتراضية</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    {p.source === 'usb' && (
                                        <button
                                            className="btn btn-xs"
                                            onClick={() => handleTestPrint(p)}
                                            title="طباعة تجريبية"
                                            type="button"
                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                        >
                                            <i className="ti ti-test-pipe" />
                                        </button>
                                    )}
                                    {!p.isDefault && (
                                        <button
                                            className="btn btn-xs"
                                            onClick={() => handleSetDefault(p.id)}
                                            title="تعيين كافتراضية"
                                            type="button"
                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                        >
                                            <i className="ti ti-star" />
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-xs"
                                        onClick={() => handleRemove(p.id)}
                                        title="حذف"
                                        type="button"
                                        style={{ padding: '4px 8px', fontSize: 11, color: 'var(--red)' }}
                                    >
                                        <i className="ti ti-trash" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Default receipt printer */}
            <Card title="طابعة الإيصال الافتراضية" titleIcon="ti-receipt">
                <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 10 }}>
                    الطابعة المستخدمة تلقائياً لطباعة إيصالات POS
                </div>
                {printers.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--t4)' }}>أضف طابعة أولاً</div>
                ) : (
                    <select
                        className="pay-v2-select"
                        value={defaultPrinterId ?? ''}
                        onChange={e => {
                            const val = e.target.value || null;
                            save(printers.map(p => ({ ...p, isDefault: p.id === val })));
                        }}
                    >
                        <option value="">— بدون افتراضي —</option>
                        {printers.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.source === 'usb' ? 'USB' : 'يدوي'})
                            </option>
                        ))}
                    </select>
                )}
            </Card>

            {/* Manual add modal */}
            {addModal && (
                <div className="ov on" onClick={() => setAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
                        <div className="m-hd">
                            <div className="m-title">إضافة طابعة يدوياً</div>
                            <div className="m-x" onClick={() => setAddModal(false)}><i className="ti ti-x" /></div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>اسم الطابعة</label>
                                <input
                                    type="text"
                                    className="pay-v2-select"
                                    value={manualName}
                                    onChange={e => setManualName(e.target.value)}
                                    placeholder="مثال: Epson TM-T20"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                    المعرف <span style={{ opacity: 0.5, fontWeight: 400 }}>(اختياري)</span>
                                </label>
                                <input
                                    type="text"
                                    className="pay-v2-select"
                                    value={manualId}
                                    onChange={e => setManualId(e.target.value)}
                                    placeholder="يُولَّد تلقائياً إن ترك فارغاً"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button className="btn" onClick={() => setAddModal(false)} type="button">إلغاء</button>
                                <button className="btn btn-p" onClick={handleAddManual} disabled={!manualName.trim()} type="button">إضافة</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Save button */}
            <SaveButton
                onClick={async () => {
                    deviceSavePrinters(slug, printers);
                    markClean();
                }}
                loading={false}
                isDirty={isDirty}
                onClean={markClean}
            />
        </div>
    );
}
