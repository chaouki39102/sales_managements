// ════════════════════════════════════════════════════════════════════════════
// components/PortalAccessModal.tsx — إدارة حساب بوابة الزبائن (إنشاء/تعديل/حذف)
// يستعمل الواجهة الإدارية: portal-access (داخل نطاق {company})
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import {
  usePortalAccessForParty,
  usePortalAccessMutations,
} from '@/lib/api/endpoints/portalAccess';
import { getErrorMessage } from '@/lib/utils';

interface PortalAccessModalProps {
  open: boolean;
  onClose: () => void;
  partyId: number | null;
  partyName?: string;
  partyEmail?: string | null;
}

export default function PortalAccessModal({
  open, onClose, partyId, partyName, partyEmail,
}: PortalAccessModalProps) {
  const { data: account, isLoading, refetch } = usePortalAccessForParty(open ? partyId : null);
  const mutations = usePortalAccessMutations();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editing = !!account;

  // تحميل قيم الحساب الحالي عند الفتح / عند وصول البيانات
  useEffect(() => {
    if (!open) return;
    setError('');
    setConfirmDelete(false);
    if (account) {
      setName(account.name);
      setEmail(account.email);
      setIsActive(account.is_active);
      setPassword('');
    } else {
      setName(partyName ?? '');
      setEmail(partyEmail ?? '');
      setPassword('');
      setIsActive(true);
    }
  }, [open, account, partyName, partyEmail]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) return;

    if (!email.trim()) { setError('البريد الإلكتروني مطلوب'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('البريد الإلكتروني غير صالح'); return; }
    if (!editing && password.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    if (editing && password && password.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }

    setError('');
    setBusy(true);
    try {
      if (editing) {
        const data: { name: string; email: string; password?: string; is_active: boolean } = {
          name: name.trim(),
          email: email.trim(),
          is_active: isActive,
        };
        if (password) data.password = password;
        await mutations.update.mutateAsync({ id: account.id, data, partyId });
      } else {
        await mutations.create.mutateAsync({
          party_id: partyId,
          name: name.trim(),
          email: email.trim(),
          password,
          is_active: isActive,
        });
      }
      await refetch();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!account || !partyId) return;
    setError('');
    setBusy(true);
    try {
      await mutations.remove.mutateAsync({ id: account.id, partyId });
      await refetch();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'حساب بوابة الزبائن' : 'إنشاء حساب بوابة'}
      subtitle={partyName || `الزبون #${partyId ?? ''}`}
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-p" type="submit" form="portal-access-form" disabled={busy}>
            <i className={`ti ${busy ? 'ti-loader animate-spin' : 'ti-device-floppy'}`} />
            {editing ? 'حفظ التعديلات' : 'إنشاء الحساب'}
          </button>
          <button className="btn btn-b" type="button" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
        </div>
      }
      footerLeft={
        editing && !confirmDelete ? (
          <button
            className="btn btn-r"
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            <i className="ti ti-trash" />
            حذف
          </button>
        ) : editing && confirmDelete ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--red)' }}>
            متأكد؟
            <button className="btn btn-r btn-xs" type="button" onClick={handleDelete} disabled={busy}>
              نعم، احذف
            </button>
            <button className="btn btn-b btn-xs" type="button" onClick={() => setConfirmDelete(false)} disabled={busy}>
              لا
            </button>
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="portal-loading" style={{ padding: 30 }}>
          <i className="ti ti-loader animate-spin" style={{ fontSize: 22, color: 'var(--em)' }} />
          جاري التحقق من الحساب...
        </div>
      ) : (
        <form id="portal-access-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <div className="portal-err" style={{ margin: 0 }}>
              <i className="ti ti-alert-circle" />
              {error}
            </div>
          )}

          <div className="fg">
            <label>اسم الزبون في البوابة</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم العرض" />
          </div>

          <div className="fg">
            <label className="req">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>

          <div className="fg">
            <label className={editing ? '' : 'req'}>
              {editing ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editing ? 'اتركها فارغة للإبقاء على الحالية' : '8 أحرف على الأقل'}
              dir="ltr"
            />
          </div>

          <div className="fg">
            <label>الحالة</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className={`sw ${isActive ? 'on' : ''}`}
                onClick={() => setIsActive((v) => !v)}
                role="switch"
                aria-checked={isActive}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsActive((v) => !v); } }}
              />
              <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>
                {isActive ? 'مفعّل — يمكن للزبون تسجيل الدخول' : 'معطّل — لا يمكن للزبون تسجيل الدخول'}
              </span>
            </div>
          </div>

          {editing && account.last_login_at && (
            <div style={{ fontSize: 11.5, color: 'var(--t4)' }}>
              آخر دخول: {new Date(account.last_login_at).toLocaleString('ar-DZ')}
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
