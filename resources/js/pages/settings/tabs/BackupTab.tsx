// pages/settings/tabs/BackupTab.tsx — النسخ الاحتياطي واستعادة قاعدة البيانات
//
// ════════════════════════════════════════════════════════════════════════════
// يعرض تبويب "النسخ الاحتياطي" في الإعدادات:
//   - إنشاء نسخة احتياطية جديدة (مع تسمية اختيارية)
//   - قائمة النسخ الحالية (الاسم / الحجم / التاريخ / نوع قاعدة البيانات)
//   - تنزيل نسخة، التحقق من سلامتها (sha256)، استعادتها، أو حذفها
//
// كل العمليات عبر lib/api/endpoints/backups.ts (الوحيدة التي تتعامل مع
// storage/app/backups عبر BackupController). الاستعادة تحذيرية وتتطلب تأكيداً.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ConfirmModal } from "./_shared";
import {
    useBackups,
    useBackupMutations,
    backupsApi,
    type BackupFile,
} from "@/lib/api/endpoints/backups";
import { useNotification } from "@/hooks/useNotification";

const driverLabel = (d: string) =>
    d === "sqlite" ? "SQLite" : d === "mysql" ? "MySQL" : d;

const fmtBytes = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) return "0";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
    return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? iso
        : d.toLocaleString("fr-DZ", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
          });
};

export function BackupTab() {
    const notify = useNotification();
    const { data: backups = [], isLoading, refetch } = useBackups();
    const { create, verify, restore, remove } = useBackupMutations();

    const [label, setLabel] = useState("");
    const [busy, setBusy] = useState(false);
    const [confirmRestore, setConfirmRestore] = useState<BackupFile | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<BackupFile | null>(null);
    const [restoreBusy, setRestoreBusy] = useState(false);

    const handleCreate = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await create.mutateAsync({ label: label.trim() || undefined });
            notify.success(
                "تم إنشاء النسخة الاحتياطية",
                "يمكنك تنزيلها أو استعادتها من القائمة أدناه.",
            );
            setLabel("");
        } catch (e: unknown) {
            const err = e as Error;
            notify.error("فشل إنشاء النسخة", err?.message ?? "حدث خطأ");
        } finally {
            setBusy(false);
        }
    };

    const handleDownload = async (b: BackupFile) => {
        try {
            const blob = await backupsApi.download(b.name);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = b.name;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch (e: unknown) {
            const err = e as Error;
            notify.error("تعذر تنزيل النسخة", err?.message ?? "حدث خطأ");
        }
    };

    const handleVerify = async (b: BackupFile) => {
        try {
            const res = await verify.mutateAsync(b.name);
            notify.success(
                "النسخة سليمة",
                `sha256 مطابق — ${fmtBytes(res.size)}`,
            );
        } catch (e: unknown) {
            const err = e as Error;
            notify.error("النسخة تالفة", err?.message ?? "حدث خطأ");
        }
    };

    const doRestore = async () => {
        if (!confirmRestore || restoreBusy) return;
        setRestoreBusy(true);
        try {
            await restore.mutateAsync(confirmRestore.name);
            notify.success(
                "تمت الاستعادة بنجاح",
                "سيتم إعادة تحميل التطبيق لسحب البيانات المستعادة.",
            );
            setConfirmRestore(null);
            setTimeout(() => window.location.reload(), 1200);
        } catch (e: unknown) {
            const err = e as Error;
            notify.error("فشلت الاستعادة", err?.message ?? "حدث خطأ");
        } finally {
            setRestoreBusy(false);
        }
    };

    const doDelete = async () => {
        if (!confirmDelete) return;
        try {
            await remove.mutateAsync(confirmDelete.name);
            notify.success("تم حذف النسخة الاحتياطية");
            setConfirmDelete(null);
        } catch (e: unknown) {
            const err = e as Error;
            notify.error("فشل الحذف", err?.message ?? "حدث خطأ");
        }
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                maxWidth: 860,
            }}
        >
            {/* ─── إنشاء نسخة احتياطية ─────────────────────────────────────── */}
            <Card title="إنشاء نسخة احتياطية" titleIcon="ti-database-plus">
                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                    }}
                >
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="تسمية اختيارية (مثال: قبل تحديث النظام)"
                        style={{
                            flex: 1,
                            minWidth: 220,
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--b2)",
                            background: "var(--bg3)",
                            color: "var(--t1)",
                            fontFamily: "Tajawal, sans-serif",
                            fontSize: 13,
                        }}
                    />
                    <Button
                        variant="primary"
                        onClick={handleCreate}
                        disabled={busy}
                        icon={
                            busy ? (
                                <i
                                    className="ti ti-loader"
                                    style={{
                                        animation: "spin .7s linear infinite",
                                    }}
                                />
                            ) : (
                                <i className="ti ti-database-plus" />
                            )
                        }
                    >
                        {busy ? "جارٍ الإنشاء..." : "إنشاء نسخة الآن"}
                    </Button>
                </div>
                <div
                    style={{
                        marginTop: 12,
                        fontSize: 12,
                        color: "var(--t4)",
                        lineHeight: 1.7,
                    }}
                >
                    <div>
                        • يتم حفظ النسخ في مجلد التخزين الخاص بالتطبيق
                        (storage/app/backups).
                    </div>
                    <div>
                        • تُحتفظ بأحدث{" "}
                        <strong style={{ color: "var(--t2)" }}>20 نسخة</strong>{" "}
                        ولمدة{" "}
                        <strong style={{ color: "var(--t2)" }}>14 يوماً</strong>{" "}
                        ثم تُحذف الأقدم تلقائياً.
                    </div>
                    <div>
                        • يمكن تنزيل النسخة والاحتفاظ بها خارج الجهاز كنسخة أمان.
                    </div>
                </div>
            </Card>

            {/* ─── قائمة النسخ ─────────────────────────────────────────────── */}
            <Card
                title="النسخ المتوفرة"
                titleIcon="ti-database"
                actions={
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch()}
                        icon={<i className="ti ti-refresh" />}
                    >
                        تحديث
                    </Button>
                }
            >
                {isLoading ? (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "30px 0",
                            color: "var(--t4)",
                            fontSize: 13,
                        }}
                    >
                        جارٍ تحميل القائمة...
                    </div>
                ) : backups.length === 0 ? (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "30px 0",
                            color: "var(--t4)",
                            fontSize: 13,
                        }}
                    >
                        <i
                            className="ti ti-database-off"
                            style={{
                                fontSize: 36,
                                display: "block",
                                marginBottom: 8,
                                opacity: 0.3,
                            }}
                        />
                        لا توجد نسخ احتياطية بعد
                    </div>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >
                        {backups.map((b) => (
                            <div
                                key={b.name}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "10px 14px",
                                    borderRadius: 8,
                                    border: "1px solid var(--b2)",
                                    background: "var(--b1)",
                                    flexWrap: "wrap",
                                }}
                            >
                                <i
                                    className={`ti ${b.encrypted ? "ti-lock" : "ti-database"}`}
                                    style={{
                                        fontSize: 16,
                                        color: b.encrypted
                                            ? "var(--gold)"
                                            : "var(--em)",
                                        flexShrink: 0,
                                    }}
                                />
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: 12.5,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            direction: "ltr",
                                            textAlign: "right",
                                        }}
                                        title={b.name}
                                    >
                                        {b.name}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "var(--t4)",
                                            display: "flex",
                                            gap: 10,
                                            marginTop: 2,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <span>
                                            {fmtBytes(b.size)} ·{" "}
                                            {fmtDate(b.date)}
                                        </span>
                                        <span
                                            style={{
                                                color:
                                                    b.driver === "sqlite"
                                                        ? "var(--em)"
                                                        : "var(--b4)",
                                            }}
                                        >
                                            {driverLabel(b.driver)}
                                        </span>
                                        {b.encrypted && (
                                            <span
                                                style={{
                                                    color: "var(--gold)",
                                                }}
                                            >
                                                مشفرة
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 4,
                                        flexShrink: 0,
                                    }}
                                >
                                    <button
                                        className="btn btn-xs"
                                        onClick={() => handleDownload(b)}
                                        title="تنزيل النسخة"
                                        type="button"
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: 11,
                                        }}
                                    >
                                        <i className="ti ti-download" />
                                    </button>
                                    <button
                                        className="btn btn-xs"
                                        onClick={() => handleVerify(b)}
                                        title="التحقق من السلامة (sha256)"
                                        type="button"
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: 11,
                                        }}
                                    >
                                        <i className="ti ti-shield-check" />
                                    </button>
                                    <button
                                        className="btn btn-xs"
                                        onClick={() => setConfirmRestore(b)}
                                        title="استعادة هذه النسخة"
                                        type="button"
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: 11,
                                            color: "var(--em)",
                                        }}
                                    >
                                        <i className="ti ti-history" />
                                    </button>
                                    <button
                                        className="btn btn-xs"
                                        onClick={() => setConfirmDelete(b)}
                                        title="حذف النسخة"
                                        type="button"
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: 11,
                                            color: "var(--red)",
                                        }}
                                    >
                                        <i className="ti ti-trash" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* ─── تأكيد الاستعادة ─────────────────────────────────────────── */}
            <ConfirmModal
                open={!!confirmRestore}
                title="استعادة نسخة احتياطية"
                message={
                    confirmRestore
                        ? `سيتم استبدال قاعدة البيانات الحالية بالكامل بمحتويات النسخة "${confirmRestore.name}".`
                        : ""
                }
                confirmLabel="استعادة الآن"
                confirmColor="var(--em)"
                warning="هذه العملية لا رجوع فيها — تُنشئ نسخة أمان تلقائية من البيانات الحالية قبل الاستبدال، لكن كل التغييرات التي أُدخلت بعد تاريخ هذه النسخة ستُفقد."
                onConfirm={doRestore}
                onCancel={() => setConfirmRestore(null)}
            />

            {/* ─── تأكيد الحذف ─────────────────────────────────────────────── */}
            <ConfirmModal
                open={!!confirmDelete}
                title="حذف النسخة الاحتياطية"
                message={
                    confirmDelete
                        ? `سيتم حذف "${confirmDelete.name}" نهائياً.`
                        : ""
                }
                confirmLabel="حذف"
                confirmColor="var(--red)"
                warning="لا يمكن التراجع عن هذا الحذف — إذا كنت تريد الاحتفاظ بها خارجياً فحمّلها أولاً."
                onConfirm={doDelete}
                onCancel={() => setConfirmDelete(null)}
            />

            {/* منع تكرار الضغط على تأكيد الاستعادة أثناء التنفيذ */}
            {restoreBusy && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,.35)",
                        zIndex: 2500,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                    }}
                >
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "12px 20px",
                            borderRadius: 12,
                            background: "var(--bg2)",
                            border: "1px solid var(--b2)",
                            boxShadow: "0 10px 40px rgba(0,0,0,.35)",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--t1)",
                        }}
                    >
                        <i
                            className="ti ti-loader"
                            style={{ animation: "spin .7s linear infinite" }}
                        />
                        جارٍ استعادة قاعدة البيانات...
                    </span>
                </div>
            )}
        </div>
    );
}
