import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  COMMERCIAL_DOCUMENT_ATTACHABLE,
  ATTACHMENT_ALLOWED_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
  attachmentsApi,
  useAttachmentsByAttachable,
  useAttachmentMutations,
} from '@/lib/api/endpoints/attachments';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useNotification } from '@/hooks/useNotification';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ar-DZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function extIcon(ext: string): string {
  const e = ext.toLowerCase();
  if (IMAGE_TYPES.some(() => e === 'png' || e === 'jpg' || e === 'jpeg' || e === 'gif' || e === 'webp')) return 'ti-photo';
  if (e === 'pdf') return 'ti-file-text';
  if (e === 'doc' || e === 'docx') return 'ti-file-text';
  if (e === 'xls' || e === 'xlsx') return 'ti-table';
  if (e === 'txt') return 'ti-file';
  return 'ti-paperclip';
}

/** Fetches an image via the authenticated blob pipeline and renders it as a thumbnail. */
function AttachmentThumb({ id, alt }: { id: number; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objUrl = '';
    attachmentsApi
      .view(id)
      .then((blob) => {
        if (cancelled) {
          URL.revokeObjectURL(objUrl);
          return;
        }
        objUrl = URL.createObjectURL(blob);
        setUrl(objUrl);
      })
      .catch(() => {
        /* thumbnail failure → fall back to the extension icon */
      });
    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [id]);

  if (!url) return null;
  return (
    <img
      src={url}
      alt={alt}
      style={{
        width: 34, height: 34, borderRadius: 6, objectFit: 'cover',
        flexShrink: 0, border: '1px solid var(--b1)', background: 'var(--bg1)',
      }}
    />
  );
}

interface Props {
  docId: number;
  readOnly?: boolean;
}

export default function DocumentAttachmentsPanel({ docId, readOnly }: Props) {
  const { confirm, confirmDialogProps } = useConfirm();
  const notify = useNotification();
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('doc_attachments_open') !== '0'; }
    catch { return true; }
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useAttachmentsByAttachable(COMMERCIAL_DOCUMENT_ATTACHABLE, docId);
  const mutations = useAttachmentMutations();
  const attachments = data?.data ?? [];

  const toggleOpen = () => {
    setOpen((v) => {
      const next = !v;
      try { localStorage.setItem('doc_attachments_open', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!(ATTACHMENT_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      notify.error('صيغة غير مسموحة', 'الصيغ المقبولة: ' + ATTACHMENT_ALLOWED_EXTENSIONS.join('، '));
      return;
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      notify.error('حجم كبير', 'حجم الملف يتجاوز الحد الأقصى (10 ميجابايت).');
      return;
    }

    setUploading(true);
    setProgress(0);
    const fd = attachmentsApi.buildUploadFormData(COMMERCIAL_DOCUMENT_ATTACHABLE, docId, file);
    mutations.upload.mutate(
      { formData: fd, onProgress: setProgress },
      {
        onSuccess: () => { setUploading(false); notify.success('تم رفع الملف', `${file.name} أُرفق بالمستند.`); },
        onError: (err) => {
          setUploading(false);
          const msg = err instanceof Error && (err as { message?: string }).message
            ? (err as { message: string }).message
            : 'تعذر رفع الملف.';
          notify.error('تعذر الرفع', msg);
        },
      },
    );
  };

  const handleDownload = async (id: number, name: string) => {
    try {
      const blob = await attachmentsApi.download(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      const msg = err instanceof Error && (err as { message?: string }).message
        ? (err as { message: string }).message
        : 'تعذر تحميل الملف.';
      notify.error('تعذر التحميل', msg);
    }
  };

  const handleDelete = useCallback(
    async (id: number, name: string) => {
      const ok = await confirm(`حذف المرفق «${name}» نهائياً؟`, {
        variant: 'danger',
        title: 'حذف المرفق',
        confirmText: 'حذف',
      });
      if (!ok) return;
      mutations.remove.mutate(id, {
        onSuccess: () => notify.success('تم الحذف', `حُذف المرفق «${name}».`),
        onError: (err) => {
          const msg = err instanceof Error && (err as { message?: string }).message
            ? (err as { message: string }).message
            : 'تعذر حذف الملف.';
          notify.error('تعذر الحذف', msg);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [confirm, mutations.remove, notify],
  );

  return (
    <div style={{
      flexShrink: 0, borderTop: '1px solid var(--b1)', background: 'var(--bg2)',
      maxHeight: open ? '30vh' : undefined, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
        <button
          onClick={toggleOpen}
          title={open ? 'إخفاء المرفقات' : 'إظهار المرفقات'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, flex: 1,
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 11, fontWeight: 700, color: 'var(--em)', padding: 0,
          }}
        >
          <i className={`ti ${open ? 'ti-chevron-down' : 'ti-chevron-up'}`} style={{ fontSize: 12 }} />
          <span>المرفقات</span>
          {attachments.length > 0 && (
            <span style={{
              background: 'var(--em)', color: '#fff', borderRadius: 999,
              fontSize: 9, fontWeight: 700, padding: '1px 6px',
            }}>{attachments.length}</span>
          )}
        </button>
        {!readOnly && (
          <button
            onClick={() => inputRef.current?.click()}
            title="إرفاق ملف (صورة، مستند موقّع…)"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              border: '1px dashed var(--b1)', background: 'transparent',
              color: 'var(--em)', borderRadius: 6, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, padding: '3px 8px',
            }}
          >
            <i className="ti ti-upload" style={{ fontSize: 12 }} />
            <span>رفع</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ATTACHMENT_ALLOWED_EXTENSIONS.map((e) => '.' + e).join(',')}
        style={{ display: 'none' }}
        onChange={handlePick}
      />

      {uploading && (
        <div style={{ padding: '0 10px 6px' }}>
          <div style={{
            height: 4, borderRadius: 999, background: 'var(--b1)', overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: 'var(--em)', transition: 'width 120ms linear',
            }} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2, textAlign: 'center' }}>
            جارٍ رفع الملف… {progress}%
          </div>
        </div>
      )}

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 10px 8px' }}>
          {isLoading && (
            <div style={{ fontSize: 10, color: 'var(--t3)', padding: '4px 0' }}>جارٍ تحميل المرفقات…</div>
          )}
          {!isLoading && attachments.length === 0 && (
            <div style={{ fontSize: 10, color: 'var(--t3)', padding: '4px 0' }}>
              لا توجد مرفقات بعد.
            </div>
          )}
          {attachments.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 6px', borderRadius: 6, background: 'var(--bg1)',
                border: '1px solid var(--b1)',
              }}
            >
              {a.file_type && IMAGE_TYPES.includes(a.file_type) ? (
                <AttachmentThumb id={a.id} alt={a.file_name} />
              ) : (
                <div style={{
                  width: 34, height: 34, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, background: 'var(--b1)',
                }}>
                  <i className={`ti ${extIcon(a.file_extension)}`} style={{ color: 'var(--em)' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--t1)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }} title={a.file_name}>{a.file_name}</div>
                <div style={{ fontSize: 9, color: 'var(--t3)', display: 'flex', gap: 6 }}>
                  <span>{formatBytes(a.file_size)}</span>
                  <span>{formatDate(a.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => handleDownload(a.id, a.file_name)}
                title="تحميل"
                style={iconBtnStyle}
              ><i className="ti ti-download" /></button>
              {!readOnly && (
                <button
                  onClick={() => handleDelete(a.id, a.file_name)}
                  title="حذف"
                  style={{ ...iconBtnStyle, color: 'var(--r)' }}
                ><i className="ti ti-trash" /></button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 22, height: 22, flexShrink: 0,
  border: 'none', background: 'transparent',
  color: 'var(--t3)', borderRadius: 4, cursor: 'pointer',
};