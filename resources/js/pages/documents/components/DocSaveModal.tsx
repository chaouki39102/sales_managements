// ════════════════════════════════════════════════════════════════════════════
// documents/components/DocSaveModal.tsx
//
// مودال الحفظ المخصص بمحرر المستند التجاري — نقطة التحكم الوحيدة للحفظ عبر
// الصفحة والشريط. يقدّم ثلاثة إجراءات ولكلٍّ اختصار خاص به:
//   S  حفظ                       → حفظ ثم الانتقال إلى القائمة
//   N  حفظ وجديد                 → حفظ ثم إعادة تعيين النموذج لمستند جديد من نفس النوع
//   C  حفظ وإغلاق                → حفظ ثم العودة للصفحة السابقة
//
// يُفتح عبر F9 / Ctrl+S (والصفحة والشريط يستخدمان نفس المودال)، فيبقى تسلسل
// الحفظ موحّداً. المودال لا ينفّذ الحفظ بنفسه — يحوّل الإجراء المختار إلى
// requestSaveAction في المتحكم الذي يضبط nextAction ثم يستدعي handleSave.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

export type DocSaveAction = 'list' | 'new' | 'close';

interface DocSaveModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (action: DocSaveAction) => void;
  isEdit: boolean;
  isPending: boolean;
  successMsg: string;
}

const SAVE_ACTIONS: Array<{
  action: DocSaveAction;
  key: string;
  label: string;
  hint: string;
  icon: string;
  className: string;
  shortcut: string;
}> = [
  {
    action: 'list',
    key: 's',
    label: 'حفظ',
    hint: 'احفظ المستند وارجع إلى قائمة المستندات',
    icon: 'ti-device-floppy',
    className: 'doc-save-btn doc-save-btn--primary',
    shortcut: 'S',
  },
  {
    action: 'new',
    key: 'n',
    label: 'حفظ وجديد',
    hint: 'احفظ ثم ابدأ مستنداً جديداً من نفس النوع',
    icon: 'ti-file-plus',
    className: 'doc-save-btn',
    shortcut: 'N',
  },
  {
    action: 'close',
    key: 'c',
    label: 'حفظ وإغلاق',
    hint: 'احفظ ثم عد إلى الصفحة السابقة',
    icon: 'ti-x',
    className: 'doc-save-btn',
    shortcut: 'C',
  },
];

const SAVE_KEY_MAP = Object.fromEntries(
  SAVE_ACTIONS.map((a) => [a.key, a.action])
) as Record<string, DocSaveAction>;

export default function DocSaveModal({
  open,
  onClose,
  onConfirm,
  isEdit,
  isPending,
  successMsg,
}: DocSaveModalProps) {
  const canSave = !isPending && !successMsg;

  const choose = useCallback(
    (action: DocSaveAction) => {
      if (!canSave) return;
      onConfirm(action);
    },
    [canSave, onConfirm]
  );

  // اختصارات لوحة المفاتيح داخل المودال: Esc إغلاق · S/N/C إجراء · Enter حفظ
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      const action = SAVE_KEY_MAP[k] ?? (e.key === 'Enter' ? 'list' : undefined);
      if (action) {
        e.preventDefault();
        choose(action);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, choose, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'حفظ المستند' : 'حفظ وإغلاق المستند'}
      subtitle="اختر ماذا تريد أن تفعل بعد الحفظ — أو استخدم الاختصارات (S / N / C)"
      size="sm"
      resizable={false}
      footer={
        <button className="btn" onClick={onClose} type="button">
          إلغاء
        </button>
      }
    >
      <div className="doc-save-actions">
        {SAVE_ACTIONS.map((a) => {
          const disabled = !canSave;
          return (
            <button
              key={a.action}
              type="button"
              className={`${a.className}${disabled ? ' is-disabled' : ''}`}
              onClick={() => choose(a.action)}
              disabled={disabled}
            >
              <span className="doc-save-btn-kbd">{a.shortcut}</span>
              <i className={`ti ${a.icon}`} />
              <span className="doc-save-btn-label">{a.label}</span>
              <span className="doc-save-btn-hint">{a.hint}</span>
            </button>
          );
        })}
      </div>
      {isPending && <p className="doc-save-note">جاري الحفظ…</p>}
      {successMsg && <p className="doc-save-note doc-save-note--ok">{successMsg}</p>}
    </Modal>
  );
}
