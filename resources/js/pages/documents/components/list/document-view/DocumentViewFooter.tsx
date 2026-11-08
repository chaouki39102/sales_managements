// pages/documents/components/list/document-view/DocumentViewFooter.tsx
// أزرار تذييل نافذة عرض المستند (حذف، مرتجع، تعديل، واتساب، إرسال، طباعة)
import Button from "@/components/ui/Button";
import { documentsApi } from "@/lib/api/endpoints/documents";
import { buildWhatsAppLink, waDocMessage } from '@/lib/wa';
import type { DocumentType, CommercialDocument } from "@/lib/api/core/types";
import { getPartyName } from "../../../utils/documentList.helpers";

interface DocumentViewFooterProps {
    d: Record<string, unknown>;
    data: CommercialDocument;
    docType: DocumentType | null;
    lines: Record<string, unknown>[];
    isReadOnly: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDeleteDoc?: () => void;
    onPrint?: () => void;
    onMail?: (opts: { id: number; documentNumber: string; partyName: string; partyEmail: string | null }) => void;
}

export default function DocumentViewFooter({
    d, data, docType, lines, isReadOnly, onClose, onEdit, onDeleteDoc, onPrint, onMail,
}: DocumentViewFooterProps) {
    return (
        <>
            <div className="m-foot-l flex gap-6">
                {!isReadOnly && (
                    <Button variant="danger" size="sm" icon={<i className="ti ti-trash" />} onClick={onDeleteDoc || onClose}>
                        حذف
                    </Button>
                )}
                <Button size="sm" icon={<i className="ti ti-corner-up-left" />} onClick={onClose}>
                    مرتجع
                </Button>
            </div>
            {!isReadOnly && d && !d.is_locked && (
                <Button variant="primary" size="sm" icon={<i className="ti ti-pencil" />} onClick={onEdit}>
                    تعديل
                </Button>
            )}
            <Button size="sm" variant="info" icon={<i className="ti ti-x" />} onClick={onClose}>
                إغلاق
            </Button>
            {(() => {
                const pty = d.party as Record<string, unknown> | undefined;
                const phone = String(pty?.phone ?? pty?.mobile ?? '');
                if (!phone) return null;
                const handleClick = async () => {
                    let shareUrl: string | null = null;
                    try {
                        const res = await documentsApi.share(d.id as number);
                        shareUrl = res.share_url;
                    } catch { /* share not critical */ }
                    const msg = waDocMessage({
                        document_number: d.document_number as string,
                        document_date: d.document_date as string,
                        document_type_name: docType?.name as string,
                        document_type_code: docType?.code as string,
                        party_name: getPartyName(data),
                        total_ht: d.total_ht as number,
                        total_tva: d.total_tva as number,
                        total_ttc: d.total_ttc as number,
                        total_discount: d.total_discount as number,
                        total_stamp: d.total_stamp as number,
                        net_to_pay: d.net_to_pay as number,
                        paid_amount: d.paid_amount as number,
                        remaining_amount: d.remaining_amount as number,
                        notes: d.notes as string,
                        lines_count: lines.length,
                    }, shareUrl);
                    const waLink = buildWhatsAppLink(phone, msg);
                    if (waLink) window.open(waLink, '_blank', 'noopener,noreferrer');
                };
                return (
                    <Button size="sm" variant="primary" icon={<i className="ti ti-brand-whatsapp" />} style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }} onClick={handleClick}>
                        واتساب
                    </Button>
                );
            })()}
            {!isReadOnly && (() => {
                const pty = d.party as Record<string, unknown> | undefined;
                return (
                    <Button size="sm" variant="info" icon={<i className="ti ti-mail" />} onClick={() => onMail?.({
                        id: d.id as number,
                        documentNumber: String(d.document_number ?? `#${d.id}`),
                        partyName: getPartyName(data),
                        partyEmail: (pty?.email as string) ?? null,
                    })}>
                        إرسال
                    </Button>
                );
            })()}
            <Button size="sm" variant="primary" icon={<i className="ti ti-printer" />} onClick={onPrint || onClose}>
                طباعة
            </Button>
        </>
    );
}
