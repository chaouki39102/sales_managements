// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/SendDocumentMailModal.tsx
// مودال إرسال المستند بالبريد الإلكتروني — قوالب بريد جاهزة + رموز ديناميكية + إرفاق PDF
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { apiPost } from '@/lib/api/core/client';
import { useNotification } from '@/hooks/useNotification';
import { useEmailTemplatesList, usePlaceholders } from '@/lib/api/endpoints/emailTemplates';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface SendDocumentMailModalProps {
  documentId:   number;
  documentNumber: string;
  partyName?:   string;
  partyEmail?:  string | null;
  docTypeCode?: string;
  onClose:      () => void;
}

type InsertTarget = 'subject' | 'body';

export function SendDocumentMailModal({
  documentId,
  documentNumber,
  partyName,
  partyEmail,
  docTypeCode,
  onClose,
}: SendDocumentMailModalProps) {
  const notify = useNotification();

  const templates = useEmailTemplatesList(docTypeCode);
  const placeholders = usePlaceholders();

  const templateList = templates.data ?? [];

  const [templateId, setTemplateId] = useState<number | ''>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [sending, setSending] = useState(false);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastTarget = useRef<InsertTarget>('body');

  // بِذر القالب الافتراضي عند تحميل قوالب نوع المستند (مرة واحدة فقط).
  useEffect(() => {
    const list = templates.data ?? [];
    if (!list.length || templateId !== '') return;
    const def = list.find(t => t.is_default) ?? list[0];
    if (def) {
      setTemplateId(def.id);
      setSubject(def.subject ?? '');
      setBody(def.body ?? '');
    }
  }, [templates.data, templateId]);

  const handleTemplateChange = (value: string) => {
    const id = value === '' ? ('' as const) : Number(value);
    setTemplateId(id);
    if (id === '') {
      setSubject('');
      setBody('');
      return;
    }
    const t = templateList.find(x => x.id === id);
    setSubject(t?.subject ?? '');
    setBody(t?.body ?? '');
  };

  const insertPlaceholder = (key: string) => {
    const token = `{{${key}}}`;
    const el = lastTarget.current === 'subject' ? subjectRef.current : bodyRef.current;

    if (!el) {
      if (lastTarget.current === 'subject') setSubject(s => s + token);
      else setBody(b => b + token);
      return;
    }

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const newValue = before + token + after;
    const cursorPos = start + token.length;

    if (lastTarget.current === 'subject') setSubject(newValue);
    else setBody(newValue);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await apiPost(`/documents/${documentId}/send-mail`, {
        template_id: templateId === '' ? undefined : templateId,
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
        attach_pdf: attachPdf,
      });
      notify.success(`تم إرسال المستند ${documentNumber} للزبون بنجاح`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل إرسال البريد';
      notify.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="إرسال بالبريد الإلكتروني"
      subtitle={`المستند: ${documentNumber}`}
      size="md"
      footer={
        <>
          <Button variant="gray" onClick={onClose}>إلغاء</Button>
          <Button
            variant="info"
            icon={<i className="ti ti-send" />}
            loading={sending}
            disabled={!partyEmail}
            onClick={handleSend}
          >
            إرسال
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* المستلم */}
        <div className="em-recipient">
          <div className="em-recipient-name">
            <i className="ti ti-user" style={{ fontSize: 14, color: 'var(--t3)' }} />
            {partyName || '—'}
          </div>
          <div className={partyEmail ? 'em-recipient-mail ok' : 'em-recipient-mail missing'}>
            <i className="ti ti-mail" style={{ fontSize: 14 }} />
            {partyEmail || 'الزبون لا يملك بريد إلكتروني'}
          </div>
        </div>

        {!partyEmail && (
          <div className="em-warn">
            <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} />
            لا يمكن إرسال البريد — الزبون لا يملك عنوان بريد إلكتروني.
            قم بتحديث بيانات الزبون أولاً.
          </div>
        )}

        {/* القالب */}
        <div className="fg">
          <label>القالب</label>
          <select
            value={templateId}
            onChange={e => handleTemplateChange(e.target.value)}
          >
            <option value="">قالب تلقائي (حسب نوع المستند)</option>
            {templateList.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.is_default ? ' ★' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* الموضوع */}
        <div className="fg">
          <label>الموضوع</label>
          <input
            ref={subjectRef}
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onFocus={() => { lastTarget.current = 'subject'; }}
            placeholder="مثال: فاتورتك {{doc_number}}"
            maxLength={200}
          />
        </div>

        {/* النص */}
        <div className="fg">
          <label>نص الرسالة</label>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            onFocus={() => { lastTarget.current = 'body'; }}
            placeholder="السيد {{party_name}}، مرفق لكم مستند {{doc_type}} رقم {{doc_number}}..."
            rows={6}
          />
        </div>

        {/* الرموز الديناميكية */}
        <div className="em-chips-wrap">
          <div className="em-note">
            <i className="ti ti-bolt" style={{ fontSize: 13 }} />
            إدراج رمز في {lastTarget.current === 'subject' ? 'الموضوع' : 'نص الرسالة'} — تُستبدل تلقائياً بقيم المستند عند الإرسال
          </div>
          <div className="em-chips">
            {(placeholders.data ?? []).map(p => (
              <button
                key={p.key}
                type="button"
                className="em-chip"
                title={p.label}
                onClick={() => insertPlaceholder(p.key)}
              >
                {`{{${p.key}}}`}
              </button>
            ))}
          </div>
        </div>

        {/* إرفاق PDF */}
        <label className="em-check">
          <input
            type="checkbox"
            checked={attachPdf}
            onChange={e => setAttachPdf(e.target.checked)}
          />
          إرفاق نسخة PDF من المستند
        </label>
      </div>
    </Modal>
  );
}