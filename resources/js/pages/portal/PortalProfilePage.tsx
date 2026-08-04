// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalProfilePage.tsx — ملف الزبون الشخصي (عرض كامل)
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalApi, type PortalProfile, type PortalParty } from '@/lib/api/portal/portal';
import { usePortalStore } from '@/lib/store/portalStore';
import { fmtMoney, PortalLoading, PortalError } from './portalUtils';

function Row({ label, value, dir }: { label: string; value: React.ReactNode; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="pr-row">
      <span className="pr-row-lb">{label}</span>
      <span className="pr-row-val" dir={dir || 'rtl'}>{value || '—'}</span>
    </div>
  );
}

function BoolRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="pr-row">
      <span className="pr-row-lb">{label}</span>
      <span className={`pr-badge ${value ? 'pr-badge--g' : 'pr-badge--z'}`}>
        <i className={`ti ${value ? 'ti-check' : 'ti-x'}`} />
        {value ? 'نعم' : 'لا'}
      </span>
    </div>
  );
}

function Section({ icon, title, children, className = '' }: { icon: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`pr-sec ${className}`}>
      <div className="pr-sec-hd">
        <i className={`ti ${icon}`} />
        <h4>{title}</h4>
      </div>
      <div className="pr-sec-bd">{children}</div>
    </section>
  );
}

export default function PortalProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const setPortalUser = usePortalStore((s) => s.setPortalUser);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'account' | 'password'>('info');

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ['portal', slug, 'profile'],
    queryFn: portalApi.profile,
    staleTime: 60_000,
  });

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editReady, setEditReady] = useState(false);

  const profileMut = useMutation({
    mutationFn: () => portalApi.updateProfile({ name: editName, email: editEmail }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['portal', slug, 'profile'] });
      setPortalUser({ ...data });
      showToast('تم تحديث الملف الشخصي بنجاح');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر التحديث'),
  });

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const passMut = useMutation({
    mutationFn: () => portalApi.updatePassword({
      current_password: currentPass,
      password: newPass,
      password_confirmation: confirmPass,
    }),
    onSuccess: () => {
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      showToast('تم تغيير كلمة المرور بنجاح');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر تغيير كلمة المرور'),
  });

  if (profile && !editReady) {
    setEditName(profile.name);
    setEditEmail(profile.email);
    setEditReady(true);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  if (isLoading) return <PortalLoading />;
  if (isError || !profile) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل الملف الشخصي'} />;

  const p = profile as PortalProfile;
  const party: PortalParty | null = p.party;
  const initials = p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="pr-page">
      {/* Hero header */}
      <div className="pr-hero">
        <div className="pr-hero-av">
          <span>{initials}</span>
        </div>
        <div className="pr-hero-txt">
          <h2>{p.name}</h2>
          <p>{p.email}</p>
          {party && (
            <div className="pr-hero-tags">
              {party.code && <span className="pr-tag">{party.code}</span>}
              {party.nif && <span className="pr-tag">NIF: {party.nif}</span>}
              {party.is_tva_exempt && <span className="pr-tag pr-tag--gold">معفى من TVA</span>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="pr-tabs">
        <button className={`pr-tab ${activeTab === 'info' ? 'on' : ''}`} onClick={() => setActiveTab('info')}>
          <i className="ti ti-id" /> معلومات الزبون
        </button>
        <button className={`pr-tab ${activeTab === 'account' ? 'on' : ''}`} onClick={() => setActiveTab('account')}>
          <i className="ti ti-user-circle" /> الحساب
        </button>
        <button className={`pr-tab ${activeTab === 'password' ? 'on' : ''}`} onClick={() => setActiveTab('password')}>
          <i className="ti ti-lock" /> كلمة المرور
        </button>
      </div>

      {/* Tab: Customer info */}
      {activeTab === 'info' && party && (
        <div className="pr-body">
          <Section icon="ti-building-store" title="المعلومات الأساسية">
            <div className="pr-grid">
              <Row label="الاسم" value={party.name} />
              <Row label="الاسم التجاري" value={party.commercial_name} />
              <Row label="الكود" value={party.code} />
              <Row label="النشاط التجاري" value={party.activity} />
            </div>
          </Section>

          <Section icon="ti-id" title="المعلومات القانونية والضريبية">
            <div className="pr-grid">
              <Row label="رقم التعريف NIF" value={party.nif} />
              <Row label="رقم السجل التجاري RC" value={party.rc} />
              <Row label="رقم الإحصاء NIS" value={party.nis} />
              <Row label="الرقم الجبائي CNAS" value={party.cnas_number} />
              <Row label="النظام الضريبي" value={party.tax_regime} />
              <Row label="الخيار الضريبي" value={party.tax_option} />
              <BoolRow label="خاضع للضريبة" value={party.is_taxable} />
              <BoolRow label="مسجل في TVA" value={party.is_vat_registered} />
              <BoolRow label="معفى من TVA" value={party.is_tva_exempt} />
            </div>
          </Section>

          <Section icon="ti-phone" title="معلومات الاتصال">
            <div className="pr-grid">
              <Row label="الهاتف الأرضي" value={party.phone} />
              <Row label="الموبايل" value={party.mobile} />
              <Row label="الفакс" value={party.fax} />
              <Row label="البريد الإلكتروني" value={party.email} dir="ltr" />
              <Row label="العنوان" value={party.full_address || party.address} />
            </div>
          </Section>

          <Section icon="ti-building-bank" title="المعلومات البنكية">
            <div className="pr-grid">
              <Row label="اسم البنك" value={party.bank_name} />
              <Row label="الحساب البنكي (RIB)" value={party.rib} dir="ltr" />
            </div>
          </Section>

          <Section icon="ti-credit-card" title="شروط الائتمان">
            <div className="pr-grid">
              <Row label="سقف الائتمان" value={party.credit_limit > 0 ? fmtMoney(party.credit_limit) : null} />
              <Row label=" أيام الدفع" value={party.credit_days ? `${party.credit_days} يوم` : null} />
              <BoolRow label="يسمح بالبيع الآجل" value={party.allow_credit_sale} />
              <BoolRow label="الحساب نشط" value={party.active} />
            </div>
          </Section>
        </div>
      )}

      {/* Tab: Account */}
      {activeTab === 'account' && (
        <div className="pr-body">
          <Section icon="ti-user-circle" title="تعديل معلومات الحساب">
            <form className="pr-form" onSubmit={(e) => { e.preventDefault(); profileMut.mutate(); }}>
              <div className="pr-form-row">
                <div className="fg">
                  <label>الاسم</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
                <div className="fg">
                  <label>البريد الإلكتروني</label>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required dir="ltr" style={{ textAlign: 'right' }} />
                </div>
              </div>
              <div className="pr-form-foot">
                <button type="submit" className="portal-btn portal-btn--em" disabled={profileMut.isPending}>
                  {profileMut.isPending ? <><i className="ti ti-loader animate-spin" /> جاري الحفظ...</> : <><i className="ti ti-check" /> حفظ التعديلات</>}
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* Tab: Password */}
      {activeTab === 'password' && (
        <div className="pr-body">
          <Section icon="ti-lock" title="تغيير كلمة المرور">
            <form className="pr-form" onSubmit={(e) => { e.preventDefault(); passMut.mutate(); }}>
              <div className="fg">
                <label>كلمة المرور الحالية</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    required dir="ltr" style={{ textAlign: 'right', paddingLeft: 36 }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 0, fontSize: 15 }}>
                    <i className={`ti ${showPass ? 'ti-eye-off' : 'ti-eye'}`} />
                  </button>
                </div>
              </div>
              <div className="pr-form-row">
                <div className="fg">
                  <label>كلمة المرور الجديدة</label>
                  <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required minLength={8} dir="ltr" style={{ textAlign: 'right' }} />
                </div>
                <div className="fg">
                  <label>تأكيد كلمة المرور</label>
                  <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} required minLength={8} dir="ltr" style={{ textAlign: 'right' }} />
                </div>
              </div>
              <div className="pr-form-foot">
                <button type="submit" className="portal-btn portal-btn--em" disabled={passMut.isPending}>
                  {passMut.isPending ? <><i className="ti ti-loader animate-spin" /> جاري التغيير...</> : <><i className="ti ti-key" /> تغيير كلمة المرور</>}
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {toast && <div className="portal-toast">{toast}</div>}
    </div>
  );
}
