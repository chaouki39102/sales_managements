// pages/documents/hooks/useDocumentListHeader.tsx
// أزرار رأس الجدول + عنوان الصفحة لقائمة المستندات
import type React from "react";
import { useMemo } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { DocumentType } from "@/lib/api/core/types";
import type { useConfirm } from "@/hooks/useConfirm";
import type { ColumnStateSnapshot } from "@/components/ui/DataTable/hooks/useColumnStatePersistence";
import { ICON_BTN_STYLE } from "../utils/documentList.constants";
import type { ModalMode } from "../components/list/documentList.types";

interface UseDocumentListHeaderArgs {
    isFetching: boolean;
    isLoading: boolean;
    isReadOnly: boolean | undefined;
    isSalable: boolean;
    isPurch: boolean;
    opColor: string;
    hiddenColumnKeys: string[];
    initialSnapshot: ColumnStateSnapshot | null;
    resetColState: () => void;
    navigate: NavigateFunction;
    typeCode: string | undefined;
    openScanner: () => void;
    confirm: ReturnType<typeof useConfirm>["confirm"];
    setModal: React.Dispatch<React.SetStateAction<ModalMode>>;
    docType: DocumentType | null | undefined;
    selectedYear: { id: number; name: string } | undefined;
}

export function useDocumentListHeader({
    isFetching, isLoading, isReadOnly, isSalable, isPurch, opColor, hiddenColumnKeys,
    initialSnapshot, resetColState, navigate, typeCode, openScanner, confirm, setModal,
    docType, selectedYear,
}: UseDocumentListHeaderArgs) {
    const headerActions = useMemo(() => (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {isFetching && !isLoading && (
                <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: 15, color: "var(--t4)", animation: "cdp-spin .8s linear infinite" }} />
            )}
            {isReadOnly && (
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--orange) 12%, transparent)", color: "var(--orange)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-lock" style={{ fontSize: 10 }} aria-hidden="true" />
                    للقراءة فقط
                </span>
            )}
            {/* مؤشر الأعمدة المخفية */}
            {hiddenColumnKeys.length > 0 && (
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-eye-off" style={{ fontSize: 10 }} aria-hidden="true" />
                    {hiddenColumnKeys.length} مخفي
                </span>
            )}
            {/* زر إعادة ضبط layout — يظهر فقط عند وجود snapshot محفوظ */}
            {initialSnapshot && (
                <button
                    title="إعادة ضبط تخطيط الأعمدة (الترتيب، العرض، المخفي، الفلاتر)"
                    onClick={async () => {
                        if (await confirm("إعادة ضبط تخطيط الجدول للإعدادات الافتراضية؟")) {
                            resetColState();
                            window.location.reload();
                        }
                    }}
                    style={ICON_BTN_STYLE}
                    aria-label="إعادة ضبط تخطيط الجدول"
                >
                    <i className="ti ti-layout-columns" aria-hidden="true" />
                </button>
            )}
            {/* B.3 — مسح QR الفاتورة المطبوع لفتح المستند مباشرة */}
            <button
                title="مسح QR الفاتورة لفتح المستند"
                onClick={openScanner}
                style={ICON_BTN_STYLE}
                aria-label="مسح QR الفاتورة لفتح المستند"
            >
                <i className="ti ti-camera" aria-hidden="true" />
            </button>
            {isSalable && !isReadOnly && (
                <button onClick={() => setModal("quick")} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid color-mix(in srgb, ${opColor} 35%, transparent)`, background: `color-mix(in srgb, ${opColor} 8%, transparent)`, color: opColor, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                    <i className="ti ti-bolt" style={{ fontSize: 14 }} aria-hidden="true" />
                    بيع سريع
                </button>
            )}
            {!isReadOnly && (
                <button onClick={() => navigate(`/documents/${typeCode}/new`)} style={{ height: 32, padding: "0 16px", borderRadius: 8, border: "none", background: opColor, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px color-mix(in srgb, ${opColor} 30%, transparent)`, fontFamily: "inherit" }}>
                    <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
                    مستند جديد
                </button>
            )}
        </div>
    ), [isFetching, isLoading, isReadOnly, isSalable, opColor, hiddenColumnKeys.length, initialSnapshot, resetColState, navigate, typeCode, openScanner]);

    // ── Page title ────────────────────────────────────────────────────────────
    const tableTitle = useMemo(() => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `color-mix(in srgb, ${opColor} 14%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${isPurch ? "ti-shopping-cart" : "ti-file-invoice"}`} style={{ fontSize: 16, color: opColor }} aria-hidden="true" />
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--t1)", lineHeight: 1.2 }}>{docType?.name ?? typeCode}</div>
                {selectedYear && <div style={{ fontSize: 10, color: "var(--t4)", marginTop: 1 }}>{selectedYear.name}</div>}
            </div>
        </div>
    ), [docType?.name, typeCode, isPurch, opColor, selectedYear]);

    return { headerActions, tableTitle };
}
