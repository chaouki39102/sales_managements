// pages/documents/components/list/document-view/DocumentViewDocTab.tsx
// تبويب «المستند» في نافذة العرض: الرأس، بطاقات المعلومات، البنود، المدفوعات، الإجماليات
import type React from "react";
import SimpleTable from "@/components/ui/SimpleTable";
import type { SimpleColumn } from "@/components/ui/SimpleTable";
import { buildWhatsAppLink } from '@/lib/wa';
import type { CommercialDocument } from "@/lib/api/core/types";
import { getPartyName, getWarehouseName } from "../../../utils/documentList.helpers";
import StatusBadge from "../StatusBadge";

interface DocumentViewDocTabProps {
    d: Record<string, unknown>;
    data: CommercialDocument;
    isPurch: boolean;
    status: string;
    lines: Record<string, unknown>[];
    payments: Record<string, unknown>[];
    bal: Record<string, unknown> | undefined;
    lineColumns: SimpleColumn[];
    fmt: (n: number) => string;
    dtf: (d: string | null | undefined) => string;
}

export default function DocumentViewDocTab({
    d, data, isPurch, status, lines, payments, bal, lineColumns, fmt, dtf,
}: DocumentViewDocTabProps) {
    return (
        <div className="doc-view-tab-content animate-in">
            {/* Header icon + status */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-6">
                    <div className="ic ic-md rounded-lg" style={{ background: isPurch ? 'var(--em3)' : 'var(--em)', color: '#fff' }}>
                        <i className={isPurch ? 'ti ti-shopping-cart' : 'ti ti-receipt'} />
                    </div>
                    <div className="flex items-center gap-6">
                        <StatusBadge status={status} />
                        {!!d.is_locked && <span className="bx bp no-dot">مقفل</span>}
                        {Number(d.remaining_amount ?? 0) > 0 && (
                            <span className="text-red font-bold text-sm">متبقي: {fmt(Number(d.remaining_amount))} دج</span>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-t4">
                    <span>{getWarehouseName(data) || "—"}</span>
                    <span>•</span>
                    <span>{(d.fiscalYear as Record<string, unknown> | undefined)?.name as string ?? "—"}</span>
                    {data.createdBy && (
                        <>
                            <span>•</span>
                            <span className="text-em" title="أنشأه"><i className="ti ti-user-check inline-block" /> {data.createdBy.name}</span>
                        </>
                    )}
                    {data.updatedBy && (
                        <>
                            <span>•</span>
                            <span className="text-em" title="آخر تعديل"><i className="ti ti-user-edit inline-block" /> {data.updatedBy.name}</span>
                        </>
                    )}
                </div>
            </div>

            {/* 4-card info grid */}
            <div className="g4 mb-12">
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">{isPurch ? "المورد" : "الزبون"}</div>
                    <div className="font-bold truncate">{getPartyName(data) || "عابر"}</div>
                    {(() => {
                        const pty = d.party as Record<string, unknown> | undefined;
                        if (!pty) return null;
                        return <>
                            {pty.phone && (() => {
                                const phone = String(pty.phone);
                                const waLink = buildWhatsAppLink(phone, '');
                                return waLink
                                    ? <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-xs text-t4 mt-2 ltr" style={{ color: '#25D366' }} title="مراسلة واتساب">{phone} <i className="ti ti-brand-whatsapp" style={{ fontSize: 10 }} /></a>
                                    : <div className="text-xs text-t4 mt-2 ltr">{phone}</div>;
                            })()}
                            {pty.nif && <div className="text-xs text-t4">NIF: {String(pty.nif)}</div>}
                            {pty.rc && <div className="text-xs text-t4">RC: {String(pty.rc)}</div>}
                        </>;
                    })()}
                </div>
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">التواريخ</div>
                    <div className="font-bold text-sm">{dtf(d.document_date as string)}</div>
                    {!!d.due_date && <div className="text-xs text-t4 mt-2">استحقاق: {dtf(d.due_date as string)}</div>}
                    {!!d.delivery_date && <div className="text-xs text-t4 mt-1">تسليم: {dtf(d.delivery_date as string)}</div>}
                    {!!(d as Record<string, unknown>).currency && <div className="text-xs text-t4 mt-2">{(d.currency as Record<string, unknown>).name as string}</div>}
                </div>
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">الحالة</div>
                    <StatusBadge status={status} />
                    <div className="text-xs text-t4 mt-2">{(d.user as Record<string, unknown> | undefined)?.name as string ?? "—"}</div>
                    {!!d.validatedBy && <div className="text-xs text-t4">اعتمد: {(d.validatedBy as Record<string, unknown>).name as string}</div>}
                    {!!d.notes && <div className="text-xs text-t4 mt-1 truncate">{String(d.notes)}</div>}
                </div>
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">الرصيد</div>
                    {bal ? (
                        <>
                            <div className="text-sm font-bold">
                                {fmt(Number(bal.previous_balance ?? 0))} <span className="text-xs text-t4 font-normal">→</span> {fmt(Number(bal.new_balance ?? 0))} <span className="text-xs text-t4">دج</span>
                            </div>
                            {Number(d.remaining_amount ?? 0) > 0 && (
                                <div className="text-xs text-red mt-2">متبقي: {fmt(Number(d.remaining_amount))} دج</div>
                            )}
                        </>
                    ) : (
                        <div className="text-sm font-bold">{fmt(Number(d.total_ttc ?? 0))} <span className="text-xs text-t4">دج</span></div>
                    )}
                </div>
            </div>

            {/* Lines Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                        <span className="font-bold text-base">بنود المستند</span>
                        <span className="text-xs text-t4 bg-3 px-8 py-2 rounded-md">{lines.length} بند</span>
                    </div>
                </div>
                <SimpleTable
                    columns={lineColumns}
                    data={lines.map((line, i) => ({ ...line, _key: `l-${i}`, _idx: i + 1 })) as unknown as Record<string, unknown>[]}
                    rowKey="_key"
                    className="border border-b1 rounded-lg"
                />
            </div>

            {/* Payments Section */}
            {payments.length > 0 && (
                <div className="mb-12">
                    <div className="flex items-center gap-6 mb-8">
                        <span className="font-bold text-base">المدفوعات</span>
                        <span className="text-xs text-t4 bg-3 px-8 py-2 rounded-md">{payments.length} دفعة</span>
                    </div>
                    {payments.map((p, i) => {
                        const pm = p.paymentMode as Record<string, unknown> | undefined;
                        const iconMap: Record<string, string> = { cash: "ti-cash", bank: "ti-building-bank", ccp: "ti-mail", cib: "ti-credit-card", check: "ti-checks" };
                        const icon = iconMap[pm?.code as string] ?? "ti-cash";
                        return (
                            <div key={p.id as number ?? i} className="flex items-center justify-between p-10 mb-4 rounded-md bg-3">
                                <div className="flex items-center gap-8">
                                    <div className="ic ic-sm text-t4"><i className={`ti ${icon}`} /></div>
                                    <div>
                                        <div className="font-bold text-sm">{pm?.name as string ?? "—"}</div>
                                        <div className="text-xs text-t4">{p.reference ? String(p.reference) : ""} {p.payment_date ? `• ${dtf(p.payment_date as string)}` : ""}</div>
                                    </div>
                                </div>
                                <div className="font-extrabold font-mono">{fmt(Number(p.amount ?? 0))} <span className="text-t4">دج</span></div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Totals — 3-card grid */}
            <div className="g3 mb-4">
                {(Number(d.total_discount ?? 0) > 0 || Number(d.total_stamp ?? 0) > 0) && (
                    <div className="p-10 rounded-lg bg-3">
                        <div className="text-xs text-t4 font-bold mb-6">التخفيضات</div>
                        {Number(d.total_discount ?? 0) > 0 && (
                            <div className="sr">
                                <span className="sr-l">الخصم</span>
                                <span className="sr-v text-red">-{fmt(Number(d.total_discount))} دج</span>
                            </div>
                        )}
                        {Number(d.total_stamp ?? 0) > 0 && (
                            <div className="sr">
                                <span className="sr-l">الطابع الجبائي</span>
                                <span className="sr-v">{fmt(Number(d.total_stamp))} دج</span>
                            </div>
                        )}
                    </div>
                )}
                <div className="p-10 rounded-lg bg-3">
                    <div className="text-xs text-t4 font-bold mb-6">الإجمالي</div>
                    <div className="sr">
                        <span className="sr-l">المجموع HT</span>
                        <span className="sr-v">{fmt(Number(d.total_ht ?? 0))} دج</span>
                    </div>
                    <div className="sr">
                        <span className="sr-l">TVA</span>
                        <span className="sr-v">{fmt(Number(d.total_tva ?? 0))} دج</span>
                    </div>
                    <div className="flex items-center justify-between pt-6 mt-6 border-t border-b3">
                        <span className="font-black text-lg">TTC</span>
                        <span className="font-black text-lg text-em">{fmt(Number(d.total_ttc ?? 0))} دج</span>
                    </div>
                </div>
                <div className="p-10 rounded-lg bg-3">
                    <div className="text-xs text-t4 font-bold mb-6">الرصيد</div>
                    <div className="sr">
                        <span className="sr-l">المدفوع</span>
                        <span className="sr-v text-em">{fmt(Number(d.paid_amount ?? 0))} دج</span>
                    </div>
                    <div className="sr">
                        <span className="sr-l">المتبقي</span>
                        <span className="sr-v font-bold" style={Number(d.remaining_amount ?? 0) > 0 ? { color: 'var(--red)' } as React.CSSProperties : {}}>
                            {fmt(Number(d.remaining_amount ?? 0))} دج
                        </span>
                    </div>
                    {bal && (
                        <div className="pt-6 mt-6 border-t border-b3">
                            <div className="sr">
                                <span className="sr-l">الرصيد السابق</span>
                                <span className="sr-v">{fmt(Number(bal.previous_balance ?? 0))} دج</span>
                            </div>
                            <div className="sr">
                                <span className="sr-l">الرصيد الجديد</span>
                                <span className="sr-v font-bold">{fmt(Number(bal.new_balance ?? 0))} دج</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
