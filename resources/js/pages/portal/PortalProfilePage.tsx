// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalProfilePage.tsx — ملف الزبون الشخصي (عرض كامل)
// ════════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalApi, type PortalProfile, type PortalParty } from '@/lib/api/portal/portal';
import { usePortalStore } from '@/lib/store/portalStore';
import {
  fmtMoney, AnimatedCounter, CreditBar,
  ProgressBar, PortalLoading, PortalError,
} from './portalUtils';

/* ─── helpers ──────────────────────────────────────────────────────────────── */
function Row({ label, value, dir, icon }: { label: string; value: React.ReactNode; dir?: 'ltr' | 'rtl'; icon?: string }) {
  return (
    <div className="pr-row">
      <span className="pr-row-lb">
        {icon && <i className={`ti ${icon} pr-row-ic`} />}
        {label}
      </span>
      <span className="pr-row-val" dir={dir || 'rtl'}>{value || '—'}</span>
    </div>
  );
}

function BoolRow({ label, value, icon }: { label: string; value: boolean; icon?: string }) {
  return (
    <div className="pr-row">
      <span className="pr-row-lb">
        {icon && <i className={`ti ${icon} pr-row-ic`} />}
        {label}
      </span>
      <span className={`pr-badge ${value ? 'pr-badge--g' : 'pr-badge--z'}`}>
        <i className={`ti ${value ? 'ti-check' : 'ti-x'}`} />
        {value ? 'نعم' : 'لا'}
      </span>
    </div>
  );
}

function Section({ icon, title, children, className = '', accent }: {
  icon: string; title: string; children: React.ReactNode; className?: string; accent?: boolean;
}) {
  return (
    <section className={`pr-sec ${accent ? 'pr-sec--accent' : ''} ${className}`}>
      <div className="pr-sec-hd">
        <div className="pr-sec-icon"><i className={`ti ${icon}`} /></div>
        <h4>{title}</h4>
      </div>
      <div className="pr-sec-bd">{children}</div>
    </section>
  );
}

function passwordStrength(pw: string): { pct: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const pct = Math.min((score / 5) * 100, 100);
  if (pct <= 20) return { pct, label: 'ضعيفة جداً', color: 'var(--red)' };
  if (pct <= 40) return { pct, label: 'ضعيفة', color: '#f97316' };
  if (pct <= 60) return { pct, label: 'مقبولة', color: 'var(--gold)' };
  if (pct <= 80) return { pct, label: 'جيدة', color: '#0ea5e9' };
  return { pct, label: 'قوية', color: 'var(--em)' };
}

/* ─── page ─────────────────────────────────────────────────────────────────── */
export default function PortalProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const setPortalUser = usePortalStore((s) => s.setPortalUser);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'account' | 'password'>('info');

  /* profile query */
  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ['portal', slug, 'profile'],
    queryFn: portalApi.profile,
    staleTime: 60_000,
  });

  /* dashboard query for balance data */
  const { data: dashboard } = useQuery({
    queryKey: ['portal', slug, 'dashboard'],
    queryFn: portalApi.dashboard,
    staleTime: 30_000,
  });

  /* ─── account edit state ─── */
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editReady, setEditReady] = useState(false);

  const profileMut = useMutation({
    mutationFn: () => portalApi.updateProfile({ name: editName, email: editEmail }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['portal', slug, 'profile'] });
      setPortalUser(prev => prev ? { ...prev, ...data } : null);
      showToast('تم تحديث الملف الشخصي بنجاح');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر التحديث'),
  });

  /* ─── password state ─── */
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  /* password strength */
  const pwStr = useMemo(() => passwordStrength(newPass), [newPass]);
  const pwMatch = confirmPass.length > 0 && newPass === confirmPass;

  if (isLoading) return <PortalLoading />;
  if (isError || !profile) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل الملف الشخصي'} />;

  const p = profile as PortalProfile;
  const party: PortalParty | null = p.party;
  const balance = dashboard?.balance?.current_balance ?? 0;
  const initials = p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  /* profile completeness */
  const fields = party ? [
    !!party.name, !!party.commercial_name, !!party.nif, !!party.phone,
    !!party.email, !!party.address || !!party.full_address, !!party.rc,
  ] : [];
  const filled = fields.filter(Boolean).length;
  const completeness = fields.length > 0 ? Math.round((filled / fields.length) * 100) : 0;

  return (
    <div className="pr-page">
      {/* ── Hero header ── */}
      <div className="pr-hero">
        <div className="pr-hero-av">
          <span>{initials}</span>
        </div>
        <div className="pr-hero-txt">
          <h2>{p.name}</h2>
          <p>{p.email}</p>
          {party && (
            <div className="pr-hero-tags">
              {party.code && <span className="pr-tag"><i className="ti ti-hashtag" /> {party.code}</span>}
              {party.nif && <span className="pr-tag"><i className="ti ti-id" /> NIF: {party.nif}</span>}
              {party.is_tva_exempt && <span className="pr-tag pr-tag--gold"><i className="ti ti-star" /> معفى من TVA</span>}
              {party.active && <span className="pr-tag pr-tag--ok">
                <i className="ti ti-circle-check" /> نشط
              </span>}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
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

      {/* ═══ Tab: Customer info ═══ */}
      {activeTab === 'info' && party && (
        <div className="pr-body">
          {/* Credit overview card */}
          {party.credit_limit > 0 && (
            <div className="pr-credit-card">
              <div className="pr-credit-hd">
                <i className="ti ti-credit-card" />
                <span>الائتمان المتاح</span>
              </div>
              <div className="pr-credit-amounts">
                <div className="pr-credit-used">
                  <span className="pr-credit-num"><AnimatedCounter value={party.credit_limit - Math.abs(balance)} /></span>
                  <span className="pr-credit-lbl">المتبقي</span>
                </div>
                <div className="pr-credit-sep" />
                <div className="pr-credit-used">
                  <span className="pr-credit-num portal-muted"><AnimatedCounter value={party.credit_limit} /></span>
                  <span className="pr-credit-lbl">السقف</span>
                </div>
              </div>
              <CreditBar used={Math.abs(balance)} limit={party.credit_limit} />
            </div>
          )}

          {/* Profile completeness */}
          {completeness < 100 && (
            <div className="pr-completeness">
              <div className="pr-completeness-hd">
                <i className="ti ti-chart-dots-3" />
                <span>اكتمال الملف الشخصي</span>
                <span className="pr-completeness-pct">{completeness}%</span>
              </div>
              <ProgressBar value={completeness} max={100} color={completeness >= 80 ? 'var(--em)' : 'var(--gold)'} />
            </div>
          )}

          <Section icon="ti-building-store" title="المعلومات الأساسية" accent>
            <div className="pr-grid">
              <Row label="الاسم" value={party.name} icon="ti-user" />
              <Row label="الاسم التجاري" value={party.commercial_name} icon="ti-store" />
              <Row label="الكود" value={party.code} icon="ti-hashtag" />
              <Row label="النشاط التجاري" value={party.activity} icon="ti-briefcase" />
            </div>
          </Section>

          <Section icon="ti-id" title="المعلومات القانونية والضريبية">
            <div className="pr-grid">
              <Row label="رقم التعريف NIF" value={party.nif} icon="ti-id" />
              <Row label="رقم السجل التجاري RC" value={party.rc} icon="ti-file-text" />
              <Row label="رقم الإحصاء NIS" value={party.nis} icon="ti-chart-bar" />
              <Row label="الرقم الجبائي CNAS" value={party.cnas_number} icon="ti-building-bank" />
              <Row label="النظام الضريبي" value={party.tax_regime} icon="ti-report-money" />
              <Row label="الخيار الضريبي" value={party.tax_option} icon="ti-tax" />
              <BoolRow label="خاضع للضريبة" value={party.is_taxable} icon="ti-alert-triangle" />
              <BoolRow label="مسجل في TVA" value={party.is_vat_registered} icon="ti-file-check" />
              <BoolRow label="معفى من TVA" value={party.is_tva_exempt} icon="ti-star" />
            </div>
          </Section>

          <Section icon="ti-phone" title="معلومات الاتصال">
            <div className="pr-grid">
              <Row label="الهاتف الأرضي" value={party.phone} icon="ti-phone" />
              <Row label="الموبايل" value={party.mobile} icon="ti-device-mobile" />
              <Row label="الفакс" value={party.fax} icon="ti-printer" />
              <Row label="البريد الإلكتروني" value={party.email} dir="ltr" icon="ti-mail" />
              <Row label="العنوان" value={party.full_address || party.address} icon="ti-map-pin" />
            </div>
          </Section>

          <Section icon="ti-building-bank" title="المعلومات البنكية">
            <div className="pr-grid">
              <Row label="اسم البنك" value={party.bank_name} icon="ti-building-bank" />
              <Row label="الحساب البنكي (RIB)" value={party.rib} dir="ltr" icon="ti-credit-card" />
            </div>
          </Section>

          <Section icon="ti-credit-card" title="شروط الائتمان">
            <div className="pr-grid">
              <Row
                label="سقف الائتمان"
                value={party.credit_limit > 0 ? <strong className="portal-em">{fmtMoney(party.credit_limit)}</strong> : null}
                icon="ti-coins"
              />
              <Row
                label="أيام الدفع"
                value={party.credit_days ? <strong>{party.credit_days} يوم</strong> : null}
                icon="ti-calendar"
              />
              <BoolRow label="يسمح بالبيع الآجل" value={party.allow_credit_sale} icon="ti-clock" />
              <BoolRow label="الحساب نشط" value={party.active} icon="ti-toggle-right" />
            </div>
          </Section>
        </div>
      )}

      {/* ═══ Tab: Account ═══ */}
      {activeTab === 'account' && (
        <div className="pr-body">
          {/* Account stats */}
          <div className="pr-acct-stats">
            <div className="pr-acct-stat">
              <div className="pr-acct-stat-icon pr-acct-stat-icon--g">
                <i className="ti ti-user-check" />
              </div>
              <div>
                <div className="pr-acct-stat-val">{p.name}</div>
                <div className="pr-acct-stat-lbl">اسم المستخدم</div>
              </div>
            </div>
            <div className="pr-acct-stat">
              <div className="pr-acct-stat-icon pr-acct-stat-icon--b">
                <i className="ti ti-mail" />
              </div>
              <div>
                <div className="pr-acct-stat-val pr-acct-stat-val--r" dir="ltr">{p.email}</div>
                <div className="pr-acct-stat-lbl">البريد الإلكتروني</div>
              </div>
            </div>
            {party && (
              <div className="pr-acct-stat">
                <div className="pr-acct-stat-icon pr-acct-stat-icon--y">
                  <i className="ti ti-building-store" />
                </div>
                <div>
                  <div className="pr-acct-stat-val">{party.name}</div>
                  <div className="pr-acct-stat-lbl">الزبون المرتبط</div>
                </div>
              </div>
            )}
          </div>

          <Section icon="ti-user-circle" title="تعديل معلومات الحساب">
            <form className="pr-form" onSubmit={(e) => { e.preventDefault(); profileMut.mutate(); }}>
              <div className="pr-form-row">
                <div className="fg pr-fg--icon">
                  <label><i className="ti ti-user" /> الاسم</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    placeholder="أدخل الاسم الكامل"
                  />
                </div>
                <div className="fg pr-fg--icon">
                  <label><i className="ti ti-mail" /> البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="portal-form-input--r"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="pr-form-foot">
                <button
                  type="submit"
                  className="portal-btn portal-btn--em"
                  disabled={profileMut.isPending || (editName === p.name && editEmail === p.email)}
                >
                  {profileMut.isPending
                    ? <><i className="ti ti-loader animate-spin" /> جاري الحفظ...</>
                    : <><i className="ti ti-check" /> حفظ التعديلات</>}
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ═══ Tab: Password ═══ */}
      {activeTab === 'password' && (
        <div className="pr-body">
          {/* Security tips */}
          <div className="pr-security-tips">
            <div className="pr-security-tip pr-security-tip--em">
              <i className="ti ti-shield-check" />
              <span>استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز</span>
            </div>
            <div className="pr-security-tip pr-security-tip--b">
              <i className="ti ti-lock" />
              <span>لا تشارك كلمة المرور مع أي شخص آخر</span>
            </div>
          </div>

          <Section icon="ti-lock" title="تغيير كلمة المرور" accent>
            <form className="pr-form" onSubmit={(e) => { e.preventDefault(); passMut.mutate(); }}>
              <div className="fg pr-fg--icon pr-fg--pass">
                <label><i className="ti ti-key" /> كلمة المرور الحالية</label>
                <div className="pr-pass-wrap">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    required
                    dir="ltr"
                    placeholder="••••••••"
                  />
                  <button type="button" className="pr-pass-eye" onClick={() => setShowCurrent(v => !v)}>
                    <i className={`ti ${showCurrent ? 'ti-eye-off' : 'ti-eye'}`} />
                  </button>
                </div>
              </div>

              <div className="pr-form-row">
                <div className="fg pr-fg--icon pr-fg--pass">
                  <label><i className="ti ti-lock" /> كلمة المرور الجديدة</label>
                  <div className="pr-pass-wrap">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      required
                      minLength={8}
                      dir="ltr"
                      placeholder="٨ أحرف على الأقل"
                    />
                    <button type="button" className="pr-pass-eye" onClick={() => setShowNew(v => !v)}>
                      <i className={`ti ${showNew ? 'ti-eye-off' : 'ti-eye'}`} />
                    </button>
                  </div>
                  {/* Strength meter */}
                  {newPass.length > 0 && (
                    <div className="pr-strength">
                      <div className="pr-strength-bar">
                        <div className="pr-strength-fill" style={{ width: `${pwStr.pct}%`, background: pwStr.color }} />
                      </div>
                      <span className="pr-strength-label" style={{ color: pwStr.color }}>
                        <i className={`ti ${pwStr.pct >= 80 ? 'ti-shield-check' : pwStr.pct >= 60 ? 'ti-shield' : 'ti-alert-triangle'}`} />
                        {pwStr.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="fg pr-fg--icon pr-fg--pass">
                  <label><i className="ti ti-lock-check" /> تأكيد كلمة المرور</label>
                  <div className="pr-pass-wrap">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      required
                      minLength={8}
                      dir="ltr"
                      placeholder="أعد إدخال كلمة المرور"
                    />
                    <button type="button" className="pr-pass-eye" onClick={() => setShowConfirm(v => !v)}>
                      <i className={`ti ${showConfirm ? 'ti-eye-off' : 'ti-eye'}`} />
                    </button>
                  </div>
                  {/* Match indicator */}
                  {confirmPass.length > 0 && (
                    <div className={`pr-pass-match ${pwMatch ? 'pr-pass-match--ok' : 'pr-pass-match--no'}`}>
                      <i className={`ti ${pwMatch ? 'ti-circle-check' : 'ti-circle-x'}`} />
                      {pwMatch ? 'متطابقتان' : 'غير متطابقتين'}
                    </div>
                  )}
                </div>
              </div>

              <div className="pr-form-foot">
                <button
                  type="submit"
                  className="portal-btn portal-btn--em"
                  disabled={passMut.isPending || !currentPass || !newPass || !confirmPass || newPass !== confirmPass || newPass.length < 8}
                >
                  {passMut.isPending
                    ? <><i className="ti ti-loader animate-spin" /> جاري التغيير...</>
                    : <><i className="ti ti-key" /> تغيير كلمة المرور</>}
                </button>
              </div>
            </form>
          </Section>
        </div>
      )}

      {toast && <div className="portal-toast"><i className="ti ti-circle-check" /> {toast}</div>}
    </div>
  );
}
