// DocumentAuditPanel — سجل تدقيق المستند (من غيّر ماذا ومتى)
// Read-only panel fed by GET /documents/{id}/audit-log
import { useDocumentAuditLog } from '@/lib/api/endpoints/documents';
import type { DocumentAuditAction, DocumentAuditLogEntry, DocumentAuditValueRow } from '@/lib/api/core/types';

interface ActionMeta { label: string; icon: string; tone: 'em' | 'red' | 'muted'; }

// التسميات النصية مصدرها الخادم (action_label / action_summary) — هذه الخريطة
// للشارة (الأيقونة + اللون) فقط، مع لاحق لتسمية قديمة عند غياب الحقل.
const ACTION_META: Record<DocumentAuditAction, ActionMeta> = {
  created:           { label: 'إنشاء المستند',     icon: 'ti-plus',              tone: 'em' },
  updated:           { label: 'تعديل المستند',     icon: 'ti-pencil',            tone: 'muted' },
  line_added:        { label: 'إضافة بند',         icon: 'ti-list-plus',         tone: 'em' },
  line_removed:      { label: 'حذف بند',           icon: 'ti-list-x',            tone: 'red' },
  line_modified:     { label: 'تعديل بند',         icon: 'ti-edit',              tone: 'muted' },
  price_changed:     { label: 'تغيير السعر',       icon: 'ti-tag',               tone: 'muted' },
  discount_changed:  { label: 'تغيير الخصم',       icon: 'ti-percentage',        tone: 'muted' },
  status_changed:    { label: 'تغيير الحالة',      icon: 'ti-switch-horizontal', tone: 'muted' },
  locked:            { label: 'قفل المستند',       icon: 'ti-lock',              tone: 'red' },
  unlocked:          { label: 'فتح المستند',       icon: 'ti-lock-open',         tone: 'em' },
  cancelled:         { label: 'إلغاء المستند',     icon: 'ti-circle-x',          tone: 'red' },
  deleted:           { label: 'حذف المستند',       icon: 'ti-trash',             tone: 'red' },
  payment_added:     { label: 'إضافة دفعة',        icon: 'ti-wallet',            tone: 'em' },
  payment_removed:   { label: 'حذف دفعة',          icon: 'ti-wallet-off',        tone: 'red' },
  converted:         { label: 'تحويل المستند',     icon: 'ti-exchange',          tone: 'em' },
  returned:          { label: 'مبيوع مرتجع',       icon: 'ti-arrow-back-up',     tone: 'muted' },
  cloned:            { label: 'نسخ المستند',       icon: 'ti-copy',              tone: 'muted' },
  stock_override:    { label: 'تصحيح المخزون',     icon: 'ti-archive',           tone: 'muted' },
};

const TONE_CLS: Record<ActionMeta['tone'], string> = {
  em:     'text-em bg-emb',
  red:    'text-red bg-redb',
  muted:  'text-t3 bg-3',
};

function ActionBadge({ entry }: { entry: DocumentAuditLogEntry }) {
  const meta = ACTION_META[entry.action] ?? { label: entry.action, icon: 'ti-info-circle', tone: 'muted' as const };
  return (
    <span className={`inline-flex items-center gap-4 px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap ${TONE_CLS[meta.tone]}`}>
      <i className={`ti ${meta.icon}`} />
      {entry.action_label ?? meta.label}
    </span>
  );
}

function isValueRow(v: unknown): v is DocumentAuditValueRow[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === 'object'
    && v[0] !== null && 'label' in v[0] && 'value' in v[0];
}

function ValueView({ v }: { v: unknown }) {
  if (v === null || v === undefined || v === '—') {
    return <span className="text-t4">—</span>;
  }
  if (isValueRow(v)) {
    return (
      <table className="audit-value-rows mt-4 w-full">
        <tbody>
          {v.map((row) => (
            <tr key={row.key}>
              <td className="text-xs text-t4 py-2 pe-6 whitespace-nowrap">{row.label}</td>
              <td className="text-xs text-t2 py-2">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return <span className="text-t2">{String(v)}</span>;
}

export default function DocumentAuditPanel({ docId }: { docId: number }) {
  const { data, isLoading, isError } = useDocumentAuditLog(docId, { per_page: 50 });
  const entries = data?.data ?? [];
  const count = data?.meta?.total ?? entries.length;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-6 mb-8">
        <span className="font-bold text-base">سجل التدقيق</span>
        <span className="text-xs text-t4 bg-3 px-8 py-2 rounded-md">{count} حدث</span>
      </div>

      {isLoading && (
        <div className="p-12 text-center text-sm text-t4">جارٍ تحميل سجل التدقيق…</div>
      )}
      {!isLoading && isError && (
        <div className="p-12 text-center text-sm text-red">تعذّر تحميل سجل التدقيق</div>
      )}
      {!isLoading && !isError && count === 0 && (
        <div className="p-12 text-center text-sm text-t4">لا يوجد نشاط مسجّل على هذا المستند</div>
      )}
      {!isLoading && count > 0 && (
        <div className="flex flex-col gap-6">
          {entries.map((e) => {
            const hasValue = e.humanized_old_value != null || e.humanized_new_value != null
              || e.old_value != null || e.new_value != null;
            return (
              <div key={e.id} className="flex items-start gap-8 p-10 rounded-lg bg-3">
                <ActionBadge entry={e} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-6 flex-wrap">
                    <span className="text-sm font-bold flex items-center gap-4">
                      <i className="ti ti-user text-t4" />
                      {e.user_label ?? e.user?.name ?? 'النظام'}
                    </span>
                    {e.field_label && (
                      <span className="text-xs text-t3 bg-2 px-6 py-2 rounded-md flex items-center gap-3">
                        <i className="ti ti-list-details" />
                        {e.field_label}
                      </span>
                    )}
                    <span className="text-xs text-t4 flex items-center gap-4">
                      <i className="ti ti-clock" />
                      {new Date(e.created_at).toLocaleString('ar-DZ', {
                        year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {e.ip_address && (
                      <span className="text-xs text-t4 flex items-center gap-4">
                        <i className="ti ti-world" />
                        {e.ip_address}
                      </span>
                    )}
                  </div>

                  {e.action_summary && (
                    <div className="mt-6 text-sm font-medium text-t1">{e.action_summary}</div>
                  )}

                  {hasValue && (
                    <div className="mt-4 flex flex-col gap-2">
                      {e.humanized_old_value != null && (
                        <div className="flex items-start gap-4">
                          <span className="text-xs font-bold text-t4 mt-4 shrink-0">قبل</span>
                          <div className="flex-1 min-w-0">
                            <ValueView v={e.humanized_old_value} />
                          </div>
                        </div>
                      )}
                      {e.humanized_new_value != null && (
                        <div className="flex items-start gap-4">
                          <span className="text-xs font-bold text-em mt-4 shrink-0">بعد</span>
                          <div className="flex-1 min-w-0">
                            <ValueView v={e.humanized_new_value} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}