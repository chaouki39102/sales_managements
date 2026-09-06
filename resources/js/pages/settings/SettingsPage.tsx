// pages/settings/SettingsPage.tsx — الغلاف (Shell) للإعدادات
//
// ════════════════════════════════════════════════════════════════════════════
// هذا الملف هو مجرد غلاف نحيف: كل تبويب يعيش في ملفه الخاص داخل ./tabs/
//   - tabs/_shared.tsx      → TABS، TabId، SettingsSearch، SettingsExportImport،
//                             UnsavedChangesModal، SettingsErrorBoundary، ... إلخ
//   - tabs/CompanyTab.tsx   → بيانات المؤسسة (company API)
//   - tabs/InvoiceTab.tsx   → تصاميم الفاتورة
//   - tabs/FiscalTab.tsx    → المالية والضرائب
//   - tabs/InventoryTab.tsx → المخزون
//   - tabs/AlertsTab.tsx    → الإشعارات
//   - tabs/PortalTab.tsx    → بوابة الزبائن
//   - tabs/DocumentsTab.tsx → المستندات
//   - tabs/ConversionsTab.tsx → خريطة التحويل
//   - tabs/UsersTab.tsx     → المستخدمون
//   - tabs/PrintersTab.tsx  → الطابعات
//   - tabs/PlanTab.tsx      → الخطة
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import {
    TABS,
    type TabId,
    SettingsSearch,
    SettingsExportImport,
    SettingsErrorBoundary,
    UnsavedChangesModal,
} from "./tabs/_shared";
import { useMyRolesAndPermissions } from "@/lib/api/endpoints/roles";
import { useIsSuperAdmin } from "@/context/AuthContext";
import { CompanyTab } from "./tabs/CompanyTab";
import { InvoiceTab } from "./tabs/InvoiceTab";
import { FiscalTab } from "./tabs/FiscalTab";
import { InventoryTab } from "./tabs/InventoryTab";
import { ImportTab } from "./tabs/ImportTab";
import { AlertsTab } from "./tabs/AlertsTab";
import { PortalTab } from "./tabs/PortalTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { ConversionsTab } from "./tabs/ConversionsTab";
import { UsersTab } from "./tabs/UsersTab";
import { SecurityTab } from "./tabs/SecurityTab";
import { PrintersTab } from "./tabs/PrintersTab";
import { BackupTab } from "./tabs/BackupTab";
import { PlanTab } from "./tabs/PlanTab";

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

    // ── Gating: تبويبات المالك-فقط تُخفى عن الأعضاء غير المخوّلين ─────────────
    // SSOT: myRoles تُقيَّد بسياق الشركة الحالية من الباكند وتحمل صلاحيات كل دور.
    // نقرأ من roles[].permissions[].name (وليس القائمة العامة permissions[]
    // التي هي union عبر كل الشركات ولا تصلح لقفل الشركة الحالية).
    //   - users    ← view_any_user  (مالك/مدير)
    //   - backup   ← update_company (مالك فقط)
    //   - printers ← update_company (مالك فقط)
    const { data: myRolesData } = useMyRolesAndPermissions();
    const isSuperAdmin = useIsSuperAdmin();

    const settingsPermissions = useMemo(() => {
        const names = new Set<string>();
        for (const role of myRolesData?.roles ?? []) {
            for (const p of role.permissions ?? []) names.add(p.name);
        }
        return names;
    }, [myRolesData]);

    const visibleTabIds = useMemo(() => {
        const all = new Set(TABS.map((t) => t.id));
        // مسؤول عام → يرى كل شيء (قد لا يكون عضواً بالشركة أصلاً)
        // وقبل تحميل الصلاحيات، لا نخفي أي تبويب
        if (isSuperAdmin || !myRolesData) return all;
        return new Set(
            TABS.filter((t) => {
                if (t.id === "users") return settingsPermissions.has("view_any_user");
                if (t.id === "backup" || t.id === "printers") return settingsPermissions.has("update_company");
                return true;
            }).map((t) => t.id),
        );
    }, [isSuperAdmin, myRolesData, settingsPermissions]);

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
                    <SettingsSearch
                        visibleTabIds={visibleTabIds}
                        onNavigate={(t) => handleTabClick(t)}
                    />
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
                {TABS.filter((t) => visibleTabIds.has(t.id)).map((t) => (
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
                {tab === "import" && (
                    <ImportTab
                        onDirty={() => markTabDirty("import")}
                        onClean={() => markTabClean("import")}
                    />
                )}
                {tab === "alerts" && (
                    <AlertsTab
                        onDirty={() => markTabDirty("alerts")}
                        onClean={() => markTabClean("alerts")}
                    />
                )}
                {tab === "portal" && (
                    <PortalTab
                        onDirty={() => markTabDirty("portal")}
                        onClean={() => markTabClean("portal")}
                    />
                )}
                {tab === "documents" && (
                    <DocumentsTab
                        onDirty={() => markTabDirty("documents")}
                        onClean={() => markTabClean("documents")}
                    />
                )}
                {tab === "users" && <UsersTab />}
                {tab === "security" && <SecurityTab />}
                {tab === "conversions" && (
                    <ConversionsTab
                        onDirty={() => markTabDirty("conversions")}
                        onClean={() => markTabClean("conversions")}
                    />
                )}
                {tab === "plan" && <PlanTab />}
                {tab === "backup" && <BackupTab />}
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
