import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { isWebUsbSupported, getConnectedPrinters } from "@/pos/utils/printService";
import { deviceGetPrinters, deviceSavePrinters } from "@/pos/store/printStore";
import {
    useSystemPrinters,
    useTestSystemPrint,
} from "@/lib/api/endpoints/systemPrinters";
import type { SystemPrinter } from "@/lib/api/endpoints/systemPrinters";
import type { DetectedPrinter } from "../print-settings/types";
import { useActiveSlug } from "@/lib/store/appStore";
import { SaveButton, useDirtyState } from "./_shared";

// ─── PrintersTab — كشف وإدارة طابعات WebUSB ──────────────────────────────────
export function PrintersTab({
    onDirty: _onDirty,
    onClean: _onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const slug = useActiveSlug() ?? "";
    const { isDirty, markDirty, markClean } = useDirtyState();
    const [printers, setPrinters] = useState<DetectedPrinter[]>(() =>
        deviceGetPrinters(slug),
    );
    const [detecting, setDetecting] = useState(false);
    const [addModal, setAddModal] = useState(false);
    const [manualName, setManualName] = useState("");
    const [manualId, setManualId] = useState("");
    const [webUsbSupported] = useState(() => isWebUsbSupported());

    // ─── طابعات ويندوز (النظام) ────────────────────────────────────────────
    const {
        data: sysData,
        isLoading: sysLoading,
        refetch: refetchSystem,
        isRefetching: sysRefetching,
    } = useSystemPrinters();
    const testMut = useTestSystemPrint();
    const [testingName, setTestingName] = useState<string | null>(null);
    const [sysMsg, setSysMsg] = useState<{ ok: boolean; text: string } | null>(
        null,
    );

    const sysPrinters = sysData?.printers ?? [];
    const savedNames = new Set(printers.map((p) => p.name.toLowerCase()));

    useEffect(() => {
        setPrinters(deviceGetPrinters(slug));
    }, [slug]);

    const defaultPrinterId =
        printers.find((p) => p.isDefault)?.id ?? null;

    const save = useCallback(
        (next: DetectedPrinter[]) => {
            setPrinters(next);
            deviceSavePrinters(slug, next);
            markDirty();
        },
        [slug, markDirty],
    );

    const handleDetect = useCallback(async () => {
        setDetecting(true);
        try {
            const usbDevices = await getConnectedPrinters();
            const existing = deviceGetPrinters(slug);
            const existingIds = new Set(existing.map((p) => p.id));

            const detected: DetectedPrinter[] = usbDevices.map((d: any) => ({
                id: `usb:${d.vendorId}:${d.productId}:${d.serialNumber ?? "no-serial"}`,
                name:
                    d.productName ||
                    d.manufacturerName ||
                    `USB Device ${d.vendorId}`,
                isDefault: false,
                status: "ready" as const,
                source: "usb" as const,
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
            const name =
                device.productName ||
                device.manufacturerName ||
                `USB Device`;
            const id = `usb:${device.vendorId}:${device.productId}:${device.serialNumber ?? "no-serial"}`;
            await device.close();

            const existing = deviceGetPrinters(slug);
            if (existing.some((p) => p.id === id)) return;
            save([
                ...existing,
                {
                    id,
                    name,
                    isDefault: false,
                    status: "ready",
                    source: "usb",
                },
            ]);
        } catch {
            /* user cancelled */
        }
    }, [slug, save]);

    const handleAddManual = useCallback(() => {
        if (!manualName.trim()) return;
        const id = manualId.trim() || `manual:${Date.now()}`;
        const existing = deviceGetPrinters(slug);
        if (existing.some((p) => p.id === id)) return;
        save([
            ...existing,
            {
                id,
                name: manualName.trim(),
                isDefault: false,
                status: "unknown",
                source: "manual",
            },
        ]);
        setManualName("");
        setManualId("");
        setAddModal(false);
    }, [slug, manualName, manualId, save]);

    const handleSetDefault = useCallback(
        (id: string) => {
            save(
                printers.map((p) => ({ ...p, isDefault: p.id === id })),
            );
        },
        [printers, save],
    );

    const handleRemove = useCallback(
        (id: string) => {
            save(printers.filter((p) => p.id !== id));
        },
        [printers, save],
    );

    const handleTestPrint = useCallback(async (printer: DetectedPrinter) => {
        if (printer.source !== "usb") return;
        try {
            const usb = (navigator as any).usb;
            const devices = await usb.getDevices();
            const device = devices.find((d: any) => {
                const did = `usb:${d.vendorId}:${d.productId}:${d.serialNumber ?? "no-serial"}`;
                return did === printer.id;
            });
            if (!device) return;
            await device.open();
            if (device.configuration === null)
                await device.selectConfiguration(1);
            const config = device.configuration;
            let ifaceNum = 0;
            let epNum = 2;
            for (let i = 0; i < (config?.interfaces?.length ?? 0); i++) {
                const iface = config.interfaces[i];
                const alt = iface.alternates?.[0];
                if (!alt || alt.interfaceClass === 0x02) continue;
                const ep = alt.endpoints?.find(
                    (e: any) =>
                        e.direction === "out" &&
                        (e.type === "bulk" || e.type === "interrupt"),
                );
                if (ep) {
                    ifaceNum = iface.interfaceNumber;
                    epNum = ep.endpointNumber;
                    break;
                }
            }
            await device.claimInterface(ifaceNum);
            const testBytes = new Uint8Array([
                0x1b, 0x40, 0x1b, 0x61, 0x01,
                ...new TextEncoder().encode("--- TEST ---\nPrinter OK\n"),
                0x1d, 0x56, 0x00,
            ]);
            await device.transferOut(epNum, testBytes);
            await device.releaseInterface(ifaceNum);
            try {
                await device.close();
            } catch {
                /* ignore */
            }
        } catch {
            /* ignore */
        }
    }, []);

    const webUsbLabel = webUsbSupported
        ? "مدعوم"
        : "غير مدعوم — يرجى استخدام Chrome أو Edge";
    const webUsbColor = webUsbSupported ? "var(--em)" : "var(--red)";

    // ─── طابعات ويندوز: تحديث / اختبار / إضافة للقائمة ─────────────────────
    const handleSysRefresh = useCallback(() => {
        refetchSystem();
    }, [refetchSystem]);

    const handleSysTest = useCallback(
        async (p: SystemPrinter) => {
            setTestingName(p.name);
            setSysMsg(null);
            try {
                await testMut.mutateAsync(p.name);
                setSysMsg({
                    ok: true,
                    text: `تم إرسال صفحة اختبار إلى «${p.name}»`,
                });
            } catch (e: unknown) {
                const err = e as { message?: string };
                setSysMsg({
                    ok: false,
                    text:
                        err.message ||
                        `فشلت الطباعة التجريبية على «${p.name}»`,
                });
            } finally {
                setTestingName(null);
                setTimeout(() => setSysMsg(null), 5000);
            }
        },
        [testMut],
    );

    const handleSysAdd = useCallback(
        (p: SystemPrinter) => {
            const id = `sys:${p.name}`;
            const existing = deviceGetPrinters(slug);
            if (existing.some((x) => x.id === id)) return;
            save([
                ...existing,
                {
                    id,
                    name: p.name,
                    isDefault: false,
                    status:
                        p.status === "offline"
                            ? ("offline" as const)
                            : p.status === "unknown"
                              ? ("unknown" as const)
                              : ("ready" as const),
                    source: "system" as const,
                },
            ]);
        },
        [slug, save],
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
            {/* طابعات ويندوز المثبتة (من النظام) */}
            <Card
                title="طابعات ويندوز المثبتة"
                titleIcon="ti-devices-2"
                actions={
                    <button
                        className="btn btn-xs"
                        onClick={handleSysRefresh}
                        disabled={sysLoading || sysRefetching}
                        type="button"
                    >
                        {sysLoading || sysRefetching ? (
                            <>
                                <i className="ti ti-loader-2 spin" /> جارٍ
                                الكشف...
                            </>
                        ) : (
                            <>
                                <i className="ti ti-refresh" /> تحديث
                            </>
                        )}
                    </button>
                }
            >
                {sysData?.platform && sysData.platform !== "Windows" && (
                    <div
                        style={{
                            fontSize: 12,
                            color: "var(--gold)",
                            padding: "8px 12px",
                            borderRadius: 8,
                            background:
                                "color-mix(in srgb, var(--gold) 10%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)",
                            marginBottom: 10,
                        }}
                    >
                        كشف طابعات النظام متاح على خوادم ويندوز فقط (المنصة
                        الحالية: {sysData.platform}).
                    </div>
                )}

                {sysData?.error && (
                    <div
                        style={{
                            fontSize: 12,
                            color: "var(--red)",
                            padding: "8px 12px",
                            borderRadius: 8,
                            background:
                                "color-mix(in srgb, var(--red) 8%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)",
                            marginBottom: 10,
                        }}
                    >
                        تعذر قراءة طابعات النظام: {sysData.error}
                    </div>
                )}

                {!(
                    sysLoading ||
                    sysRefetching ||
                    sysData?.error ||
                    sysData?.platform !== "Windows"
                ) && sysPrinters.length === 0 ? (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "18px 0",
                            color: "var(--t4)",
                            fontSize: 13,
                        }}
                    >
                        لم يُعثر على أي طابعة مثبتة في ويندوز
                    </div>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >
                        {sysPrinters.map((p) => {
                            const inList = savedNames.has(p.name.toLowerCase());
                            const dotColor =
                                p.status === "ready"
                                    ? "var(--em)"
                                    : p.status === "printing"
                                      ? "var(--gold)"
                                      : p.status === "offline"
                                        ? "var(--red)"
                                        : "var(--t4)";
                            return (
                                <div
                                    key={p.name}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "10px 14px",
                                        borderRadius: 8,
                                        border: `1.5px solid ${p.is_default ? "var(--em)" : "var(--b2)"}`,
                                        background: p.is_default
                                            ? "color-mix(in srgb, var(--em) 5%, transparent)"
                                            : "var(--b1)",
                                        transition: "all .15s",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            background: dotColor,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <i
                                        className="ti ti-printer"
                                        style={{
                                            fontSize: 16,
                                            color: "var(--t3)",
                                        }}
                                    />
                                    <div
                                        style={{ flex: 1, minWidth: 0 }}
                                    >
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: 13,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {p.name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: "var(--t4)",
                                                display: "flex",
                                                gap: 8,
                                                marginTop: 2,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <span>{p.status_label}</span>
                                            {p.driver && (
                                                <span
                                                    style={{
                                                        overflow: "hidden",
                                                        textOverflow:
                                                            "ellipsis",
                                                        whiteSpace: "nowrap",
                                                        maxWidth: 220,
                                                    }}
                                                    title={p.driver}
                                                >
                                                    {p.driver}
                                                </span>
                                            )}
                                            {p.port && <span>{p.port}</span>}
                                            {p.is_default && (
                                                <span
                                                    style={{
                                                        color: "var(--em)",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    افتراضية
                                                </span>
                                            )}
                                            {p.local ? (
                                                <span>محلية</span>
                                            ) : (
                                                <span>شبكية</span>
                                            )}
                                            {p.shared && <span>مشتركة</span>}
                                            {inList && (
                                                <span
                                                    style={{
                                                        color: "var(--em)",
                                                    }}
                                                >
                                                    ✓ مُضافة للقائمة
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
                                            onClick={() => handleSysTest(p)}
                                            disabled={
                                                testingName !== null ||
                                                p.work_offline
                                            }
                                            title={
                                                p.work_offline
                                                    ? "الطابعة في وضع عدم الاتصال"
                                                    : "طباعة صفحة اختبار"
                                            }
                                            type="button"
                                            style={{
                                                padding: "4px 8px",
                                                fontSize: 11,
                                            }}
                                        >
                                            {testingName === p.name ? (
                                                <i className="ti ti-loader-2 spin" />
                                            ) : (
                                                <i className="ti ti-test-pipe" />
                                            )}
                                        </button>
                                        {!inList && (
                                            <button
                                                className="btn btn-xs"
                                                onClick={() =>
                                                    handleSysAdd(p)
                                                }
                                                title="إضافة إلى قائمة الطابعات المحفوظة"
                                                type="button"
                                                style={{
                                                    padding: "4px 8px",
                                                    fontSize: 11,
                                                }}
                                            >
                                                <i className="ti ti-plus" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {sysMsg && (
                    <div
                        style={{
                            marginTop: 10,
                            fontSize: 12,
                            fontWeight: 600,
                            color: sysMsg.ok ? "var(--em)" : "var(--red)",
                        }}
                    >
                        {sysMsg.text}
                    </div>
                )}

                <div
                    style={{
                        fontSize: 11,
                        color: "var(--t4)",
                        marginTop: 10,
                    }}
                >
                    تُقرأ هذه القائمة مباشرة من نظام ويندوز (نفسها في إعدادات
                    الطابعات والماسحات). زر الاختبار يطبع صفحة تجريبية عبر
                    Windows Print Spooler.
                </div>
            </Card>

            {/* WebUSB Status */}
            <Card title=".hardware" titleIcon="ti-chip">
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 4,
                    }}
                >
                    <i
                        className="ti ti-chip"
                        style={{ fontSize: 18, color: webUsbColor }}
                    />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                            WebUSB
                        </div>
                        <div style={{ fontSize: 12, color: "var(--t4)" }}>
                            {webUsbLabel}
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 12,
                        flexWrap: "wrap",
                    }}
                >
                    <button
                        className="btn btn-xs"
                        onClick={handleDetect}
                        disabled={detecting}
                        type="button"
                    >
                        {detecting ? (
                            <>
                                <i className="ti ti-loader-2 spin" /> جارٍ
                                الكشف...
                            </>
                        ) : (
                            <>
                                <i className="ti ti-refresh" /> كشف الطابعات
                                المتصلة
                            </>
                        )}
                    </button>
                    {webUsbSupported && (
                        <button
                            className="btn btn-xs"
                            onClick={handlePairNew}
                            type="button"
                        >
                            <i className="ti ti-plus" /> زوج طابعة جديدة (USB)
                        </button>
                    )}
                    <button
                        className="btn btn-xs"
                        onClick={() => setAddModal(true)}
                        type="button"
                    >
                        <i className="ti ti-pencil" /> إضافة يدوية
                    </button>
                </div>
            </Card>

            {/* Printer list */}
            <Card title="الطابعات" titleIcon="ti-printer">
                {printers.length === 0 ? (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "30px 0",
                            color: "var(--t4)",
                            fontSize: 13,
                        }}
                    >
                        <i
                            className="ti ti-printer-off"
                            style={{
                                fontSize: 36,
                                display: "block",
                                marginBottom: 8,
                                opacity: 0.3,
                            }}
                        />
                        لا توجد طابعات مسجلة
                    </div>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >
                        {printers.map((p) => (
                            <div
                                key={p.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "10px 14px",
                                    borderRadius: 8,
                                    border: `1.5px solid ${p.isDefault ? "var(--em)" : "var(--b2)"}`,
                                    background: p.isDefault
                                        ? "color-mix(in srgb, var(--em) 5%, transparent)"
                                        : "var(--b1)",
                                    transition: "all .15s",
                                }}
                            >
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background:
                                            p.status === "ready"
                                                ? "var(--em)"
                                                : p.status === "offline"
                                                  ? "var(--red)"
                                                  : "var(--t4)",
                                        flexShrink: 0,
                                    }}
                                />
                                <i
                                    className={`ti ${p.source === "usb" ? "ti-plug-connected" : p.source === "system" ? "ti-printer" : "ti-device-desktop"}`}
                                    style={{ fontSize: 16, color: "var(--t3)" }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {p.name}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "var(--t4)",
                                            display: "flex",
                                            gap: 8,
                                            marginTop: 2,
                                        }}
                                    >
                                        <span>
                                            {p.source === "usb"
                                                ? "USB"
                                                : p.source === "system"
                                                  ? "نظام ويندوز"
                                                  : "يدوي"}
                                        </span>
                                        <span>
                                            {p.status === "ready"
                                                ? "جاهزة"
                                                : p.status === "offline"
                                                  ? "غير متصلة"
                                                  : "غير معروفة"}
                                        </span>
                                        {p.isDefault && (
                                            <span
                                                style={{
                                                    color: "var(--em)",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                افتراضية
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
                                    {p.source === "usb" && (
                                        <button
                                            className="btn btn-xs"
                                            onClick={() => handleTestPrint(p)}
                                            title="طباعة تجريبية"
                                            type="button"
                                            style={{
                                                padding: "4px 8px",
                                                fontSize: 11,
                                            }}
                                        >
                                            <i className="ti ti-test-pipe" />
                                        </button>
                                    )}
                                    {!p.isDefault && (
                                        <button
                                            className="btn btn-xs"
                                            onClick={() =>
                                                handleSetDefault(p.id)
                                            }
                                            title="تعيين كافتراضية"
                                            type="button"
                                            style={{
                                                padding: "4px 8px",
                                                fontSize: 11,
                                            }}
                                        >
                                            <i className="ti ti-star" />
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-xs"
                                        onClick={() => handleRemove(p.id)}
                                        title="حذف"
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

            {/* Default receipt printer */}
            <Card
                title="طابعة الإيصال الافتراضية"
                titleIcon="ti-receipt"
            >
                <div
                    style={{
                        fontSize: 12,
                        color: "var(--t4)",
                        marginBottom: 10,
                    }}
                >
                    الطابعة المستخدمة تلقائياً لطباعة إيصالات POS
                </div>
                {printers.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--t4)" }}>
                        أضف طابعة أولاً
                    </div>
                ) : (
                    <select
                        className="pay-v2-select"
                        value={defaultPrinterId ?? ""}
                        onChange={(e) => {
                            const val = e.target.value || null;
                            save(
                                printers.map((p) => ({
                                    ...p,
                                    isDefault: p.id === val,
                                })),
                            );
                        }}
                    >
                        <option value="">— بدون افتراضي —</option>
                        {printers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} (
                                    {p.source === "usb"
                                        ? "USB"
                                        : p.source === "system"
                                          ? "نظام ويندوز"
                                          : "يدوي"}
                                )
                            </option>
                        ))}
                    </select>
                )}
            </Card>

            {/* Manual add modal */}
            {addModal && (
                <div className="ov on" onClick={() => setAddModal(false)}>
                    <div
                        className="modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: 400, padding: 24 }}
                    >
                        <div className="m-hd">
                            <div className="m-title">إضافة طابعة يدوياً</div>
                            <div
                                className="m-x"
                                onClick={() => setAddModal(false)}
                            >
                                <i className="ti ti-x" />
                            </div>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                                marginTop: 16,
                            }}
                        >
                            <div>
                                <label
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        display: "block",
                                        marginBottom: 4,
                                    }}
                                >
                                    اسم الطابعة
                                </label>
                                <input
                                    type="text"
                                    className="pay-v2-select"
                                    value={manualName}
                                    onChange={(e) =>
                                        setManualName(e.target.value)
                                    }
                                    placeholder="مثال: Epson TM-T20"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        display: "block",
                                        marginBottom: 4,
                                    }}
                                >
                                    المعرف{" "}
                                    <span
                                        style={{
                                            opacity: 0.5,
                                            fontWeight: 400,
                                        }}
                                    >
                                        (اختياري)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    className="pay-v2-select"
                                    value={manualId}
                                    onChange={(e) => setManualId(e.target.value)}
                                    placeholder="يُولَّد تلقائياً إن ترك فارغاً"
                                />
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    justifyContent: "flex-end",
                                    marginTop: 8,
                                }}
                            >
                                <button
                                    className="btn"
                                    onClick={() => setAddModal(false)}
                                    type="button"
                                >
                                    إلغاء
                                </button>
                                <button
                                    className="btn btn-p"
                                    onClick={handleAddManual}
                                    disabled={!manualName.trim()}
                                    type="button"
                                >
                                    إضافة
                                </button>
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
