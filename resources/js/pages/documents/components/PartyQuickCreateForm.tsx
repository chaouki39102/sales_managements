import React, { useState } from 'react';
import type { PartyType } from '@/lib/api/core/types';
import { Label, FieldError } from '../components/DocumentUIPrimitives';

export interface PartyQuickCreatePayload {
  name: string;
  phone?: string;
  nif?: string;
  party_type_id: number;
}

const fieldInputStyle = (isReadOnly: boolean, hasError?: boolean): React.CSSProperties => ({
  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
  border: `1px solid ${hasError ? 'var(--red)' : 'var(--b3)'}`,
  background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
  color: 'var(--t1)', fontSize: 13,
  fontFamily: 'Tajawal, sans-serif', outline: 'none',
  boxSizing: 'border-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

interface PartyQuickCreateFormProps {
  /** مؤشّر لربط المتعامل النَصّي بعد فتح النموذج (يبقى قابلاً للتعديل). */
  initialName?: string;
  isPurchase: boolean;
  partyTypes?: PartyType[];
  creatingParty?: boolean;
  onCancel: () => void;
  onSubmit: (payload: PartyQuickCreatePayload) => void;
}

/**
 * نموذج الإنشاء السريع لمتعامل جديد — مُستخدم من شريط معلومات المستند
 * (DocumentHeaderBand) ومن المجموعة الأساسية للنافذة المنبثقة
 * (DocumentInfoSection). يملك حالته الداخلية كاملةً؛ تكرار الإنشاء عبر
 * العرض الشرطي `creating` + مفتاح `key` لفرض إعادة التركيب ببيانات جديدة.
 */
export default function PartyQuickCreateForm({
  initialName = '',
  isPurchase, partyTypes, creatingParty, onCancel, onSubmit,
}: PartyQuickCreateFormProps) {
  const [name, setName] = useState(initialName.trim());
  const [phone, setPhone] = useState('');
  const [nif, setNif] = useState('');
  const [partyTypeId, setPartyTypeId] = useState<number | ''>(partyTypes?.[0]?.id ?? '');
  const [err, setErr] = useState('');

  const reset = () => {
    setName('');
    setPhone('');
    setNif('');
    setPartyTypeId('');
    setErr('');
  };

  const submit = () => {
    if (!name.trim()) { setErr('اسم المتعامل مطلوب'); return; }
    if (!partyTypeId) { setErr('نوع المتعامل مطلوب'); return; }
    onSubmit({
      name: name.trim(),
      phone: phone.trim() || undefined,
      nif: nif.trim() || undefined,
      party_type_id: Number(partyTypeId),
    });
  };

  return (
    <div style={{
      marginTop: 8, padding: '10px 12px', border: '1px dashed var(--em)',
      borderRadius: 'var(--r2)', background: 'var(--bg3)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--em)', marginBottom: 8 }}>
        إنشاء {isPurchase ? 'مورد' : 'زبون'} جديد
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        <div>
          <Label>الاسم *</Label>
          <input
            type="text"
            value={name}
            disabled={creatingParty}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            style={fieldInputStyle(false)}
            placeholder="اسم المتعامل..."
          />
        </div>
        <div>
          <Label>الهاتف</Label>
          <input
            type="text"
            value={phone}
            disabled={creatingParty}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            style={fieldInputStyle(false)}
            placeholder="الهاتف..."
          />
        </div>
        <div>
          <Label>NIF</Label>
          <input
            type="text"
            value={nif}
            disabled={creatingParty}
            onChange={(e) => setNif(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            style={fieldInputStyle(false)}
            placeholder="رقم التعريف الجبائي..."
          />
        </div>
        <div>
          <Label>النوع *</Label>
          <select
            value={partyTypeId}
            disabled={creatingParty}
            onChange={(e) => setPartyTypeId(e.target.value ? Number(e.target.value) : '')}
            style={fieldInputStyle(false)}
          >
            {!partyTypes?.length && <option value="">— لا توجد أنواع —</option>}
            {(partyTypes ?? []).map((pt) => (
              <option key={pt.id} value={pt.id}>{pt.name}</option>
            ))}
          </select>
        </div>
      </div>
      {err && <FieldError msg={err} />}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          disabled={creatingParty}
          onClick={() => { reset(); onCancel(); }}
        >
          إلغاء
        </button>
        <button
          type="button"
          className="btn btn-p btn-xs"
          disabled={creatingParty || !name.trim() || !partyTypeId}
          onClick={submit}
        >
          {creatingParty ? 'يتم الإنشاء...' : 'إنشاء وتحديد'}
        </button>
      </div>
    </div>
  );
}