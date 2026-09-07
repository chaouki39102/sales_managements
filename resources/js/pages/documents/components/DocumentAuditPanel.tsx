// DocumentAuditPanel — سجل تدقيق المستند (من غيّر ماذا ومتى)
// Read-only panel fed by GET /documents/{id}/audit-log
import { useDocumentAuditLog } from '@/lib/api/endpoints/documents';
import type { DocumentAuditAction, DocumentAuditLogEntry } from '@/lib/api/core/types';

interface ActionMeta { label: string; icon: string; tone: 'em' | 'red' | 'muted'; }

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
};

const TONE_CLS: Record<ActionMeta['tone'], string> = {
  em:     'text-em bg-emb',
  red:    'text-red bg-redb',
  muted:  'text-t3 bg-3',
};

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

function ActionBadge({ action }: { action: DocumentAuditAction }) {
  const meta = ACTION_META[action] ?? { label: action, icon: 'ti-info-circle', tone: 'muted' as const };
  return (
    <span className={`inline-flex items-center gap-4 px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap ${TONE_CLS[meta.tone]}`}>
      <i className={`ti ${meta.icon}`} />
      {meta.label}
    </span>
  );
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
          {entries.map((e: DocumentAuditLogEntry) => {
            const hasField = !!e.field_name || !!(e.old_value ?? e.new_value);
            return (
              <div key={e.id} className="flex items-start gap-8 p-10 rounded-lg bg-3">
                <ActionBadge action={e.action} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-6 flex-wrap">
                    <span className="text-sm font-bold flex items-center gap-4">
                      <i className="ti ti-user text-t4" />
                      {e.user?.name ?? 'النظام'}
                    </span>
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
                  {hasField && (
                    <div className="mt-6 text-xs text-t4 font-mono break-all leading-loose">
                      {e.field_name && <span className="font-bold text-t3">{e.field_name}: </span>}
                      {!!e.old_value && <span className="line-through opacity-50">{fmtVal(e.old_value)}</span>}
                      {!!e.old_value && !!e.new_value && <span style={{ margin: '0 4px', opacity: 0.5 }}>←</span>}
                      {!!e.new_value && <span className="text-t2">{fmtVal(e.new_value)}</span>}
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