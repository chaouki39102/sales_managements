// pages/settings/SettingsPage.tsx
// ════════════════════════════════════════════════════════════════════════════
// التبويبات:
//   ① المؤسسة     — بيانات رسمية + جبائية + عنوان + بنك + شعار
//   ② الطباعة     — تصميم الفاتورة + معاينة حية
//   ③ الإشعارات   — تنبيهات المخزون + الديون + الانتهاءات
//   ④ الخطة       — عرض الخطة الحالية + الحدود
//
// مصادر البيانات:
//   useCurrentCompany()   → GET /api/v1/companies/current  (companyKeys.current)
//   useUpdateCompany()    → PUT /api/v1/companies/{slug}
//   settingsApi.update()  → PUT /api/v1/{slug}/settings
//   settingsApi.byGroup() → GET /api/v1/{slug}/settings/group/{group}
//   apiGet /wilayas       → GET /api/v1/wilayas (بدون slug — public)
//   apiGet /communes      → GET /api/v1/communes/by-wilaya/{id} (بدون slug)
//   apiGet /legal-forms   → GET /api/v1/{slug}/legal-forms
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader   from '@/components/ui/PageHeader';
import Card         from '@/components/ui/Card';
import Button       from '@/components/ui/Button';
import Switch       from '@/components/ui/Switch';
import Badge        from '@/components/ui/Badge';
import AlertBar     from '@/components/ui/AlertBar';
import { useCurrentCompany, useUpdateCompany } from '@/lib/api/endpoints/companies';
import { settingsApi }  from '@/lib/api/endpoints/settings';
import { apiGet, apiUpload } from '@/lib/api/core/client';
import { companyKeys, globalKeys, tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import type { Company } from '@/lib/api/core/types';

// ─── Tabs definition ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'company',   label: 'المؤسسة',           icon: 'ti-building'        },
  { id: 'print',     label: 'الطباعة',             icon: 'ti-printer'         },
  { id: 'alerts',    label: 'الإشعارات',           icon: 'ti-bell'            },
  { id: 'plan',      label: 'الخطة والاشتراك',    icon: 'ti-crown'           },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const str = (v: unknown): string => (v == null ? '' : String(v));

// ════════════════════════════════════════════════════════════════════════════
// Root
// ════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('company');

  return (
    <div className="page on" id="p-settings">
      <PageHeader
        title="الإعدادات"
        subtitle="إعدادات المؤسسة والنظام"
      />

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2, borderBottom: '1px solid var(--b2)',
        marginBottom: 22, overflowX: 'auto', flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--em)' : 'var(--t3)',
              borderBottom: tab === t.id ? '2px solid var(--em)' : '2px solid transparent',
              marginBottom: -1, transition: 'all .15s', whiteSpace: 'nowrap',
            }}
          >
            <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'company' && <CompanyTab />}
      {tab === 'print'   && <PrintTab   />}
      {tab === 'alerts'  && <AlertsTab  />}
      {tab === 'plan'    && <PlanTab    />}
    </div>
  );
}

// ─── Shared: SaveButton ───────────────────────────────────────────────────────
function SaveButton({
  onClick, loading, disabled,
}: { onClick: () => void; loading?: boolean; disabled?: boolean }) {
  const [flash, setFlash] = useState(false);

  const handle = async () => {
    if (loading || disabled) return;
    await onClick();
    setFlash(true);
    setTimeout(() => setFlash(false), 2200);
  };

  return (
    <Button
      variant={flash ? 'success' as any : 'primary'}
      icon={
        flash    ? <i className="ti ti-check" /> :
        loading  ? <i className="ti ti-loader" style={{ animation: 'spin .7s linear infinite' }} /> :
                   <i className="ti ti-device-floppy" />
      }
      onClick={handle}
      disabled={loading || disabled}
    >
      {flash ? 'تم الحفظ!' : loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
    </Button>
  );
}

// ─── Shared: SectionTitle ────────────────────────────────────────────────────
function SectionTitle({ icon, label, color = 'var(--em)' }: { icon: string; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 16, color }}><i className={`ti ${icon}`} /></span>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>{label}</span>
    </div>
  );
}

// ─── Shared: ToggleRow ───────────────────────────────────────────────────────
function ToggleRow({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 14px', background: 'var(--bg3)',
      borderRadius: 'var(--r2)', border: '1px solid var(--b2)', gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{hint}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ① CompanyTab
// ════════════════════════════════════════════════════════════════════════════
function CompanyTab() {
  const qc   = useQueryClient();
  const slug = useActiveSlug() ?? '';

  const { data: company, isLoading } = useCurrentCompany();
  const updateMutation = useUpdateCompany();

  const [form, setForm] = useState({
    name: '', commercial_name: '', activity: '',
    rc: '', rc_date: '', nif: '', nis: '', ai: '',
    legal_form_id: '' as string | number,
    capital_amount: '' as string | number,
    address: '', wilaya_id: '' as string | number, commune_id: '' as string | number,
    phone: '', mobile: '', fax: '', email: '',
    bank_name: '', rib: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError,   setSaveError]   = useState<string | null>(null);

  // Populate form from API
  useEffect(() => {
    if (!company) return;
    setForm({
      name:            str(company.name),
      commercial_name: str(company.commercial_name),
      activity:        str(company.activity),
      rc:              str((company as any).rc),
      rc_date:         str((company as any).rc_date),
      nif:             str(company.nif),
      nis:             str(company.nis),
      ai:              str((company as any).ai),
      legal_form_id:   (company as any).legal_form_id  ?? '',
      capital_amount:  (company as any).capital_amount ?? '',
      address:         str(company.address),
      wilaya_id:       (company as any).wilaya_id  ?? '',
      commune_id:      (company as any).commune_id ?? '',
      phone:           str(company.phone),
      mobile:          str((company as any).mobile),
      fax:             str((company as any).fax),
      email:           str(company.email),
      bank_name:       str((company as any).bank_name),
      rib:             str((company as any).rib),
    });
  }, [company]);

  const set = (k: string, v: string | number) => {
    setForm(f => ({ ...f, [k]: v }));
    if (fieldErrors[k]) setFieldErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  // Lookups
  const { data: wilayas = [] } = useQuery({
    queryKey: globalKeys.wilayas,
    queryFn:  () => apiGet<any[]>('/wilayas', { per_page: 60 }),
    staleTime: 60 * 60_000,
  });
  const { data: communes = [] } = useQuery({
    queryKey: globalKeys.communes(Number(form.wilaya_id)),
    queryFn:  () => apiGet<any[]>(`/communes/by-wilaya/${form.wilaya_id}`),
    enabled:  !!form.wilaya_id,
    staleTime: 30 * 60_000,
  });
  const { data: legalForms = [] } = useQuery({
    queryKey: tenantKeys.lookups.legalForms(slug),
    queryFn:  () => apiGet<any[]>('/legal-forms', { per_page: 50 }),
    enabled:  !!slug,
    staleTime: 60 * 60_000,
  });

  const handleSave = async () => {
    setSaveError(null);
    setFieldErrors({});
    try {
      await updateMutation.mutateAsync({
        slug: company!.slug,
        data: {
          ...form,
          legal_form_id:  form.legal_form_id  ? Number(form.legal_form_id)  : null,
          wilaya_id:      form.wilaya_id       ? Number(form.wilaya_id)       : null,
          commune_id:     form.commune_id      ? Number(form.commune_id)      : null,
          capital_amount: form.capital_amount  ? Number(form.capital_amount)  : null,
        } as Partial<Company>,
      });
    } catch (err: any) {
      const data = err?.errors ?? err?.response?.data;
      if (data?.errors) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.errors)) fe[k] = (v as string[])[0];
        setFieldErrors(fe);
      } else {
        setSaveError(data?.message ?? 'فشل حفظ البيانات');
      }
    }
  };

  if (isLoading) return (
    <div className="empty">
      <div className="empty-ic"><i className="ti ti-loader" /></div>
      <div className="empty-tx">تحميل...</div>
    </div>
  );

  return (
    <div className="g65">
      {/* ── الجانب الرئيسي ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {saveError && <AlertBar variant="red" dismissible>{saveError}</AlertBar>}

        {/* البيانات الرسمية */}
        <Card>
          <SectionTitle icon="ti-building" label="البيانات الرسمية" />
          <div className="fgrid c2" style={{ gap: 12 }}>
            <div className="fg s2">
              <label className="req">الاسم القانوني للمؤسسة</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                style={{ borderColor: fieldErrors.name ? 'var(--red)' : undefined }}
              />
              {fieldErrors.name && <span style={{ color: 'var(--red)', fontSize: 11 }}>{fieldErrors.name}</span>}
            </div>
            <div className="fg">
              <label>الاسم التجاري</label>
              <input value={form.commercial_name} onChange={e => set('commercial_name', e.target.value)}
                placeholder="يظهر على الفواتير" />
            </div>
            <div className="fg">
              <label>الشكل القانوني</label>
              <select value={str(form.legal_form_id)} onChange={e => set('legal_form_id', e.target.value)}>
                <option value="">— اختر —</option>
                {legalForms.map((lf: any) => (
                  <option key={lf.id} value={lf.id}>{lf.name}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>رأس المال (دج)</label>
              <input type="number" value={str(form.capital_amount)}
                onChange={e => set('capital_amount', e.target.value)} placeholder="0.00" />
            </div>
            <div className="fg s2">
              <label>قطاع النشاط</label>
              <input value={form.activity} onChange={e => set('activity', e.target.value)}
                placeholder="تجارة، خدمات، صناعة، بناء..." />
            </div>
          </div>
        </Card>

        {/* المعرّفات الجبائية */}
        <Card>
          <SectionTitle icon="ti-id-badge" label="المعرّفات الجبائية والتجارية" color="var(--blue)" />
          <div className="fgrid c3" style={{ gap: 12 }}>
            <div className="fg">
              <label>NIF — رقم التعريف الجبائي</label>
              <input value={form.nif} onChange={e => set('nif', e.target.value)}
                style={{ fontFamily: 'monospace', letterSpacing: 1,
                  borderColor: fieldErrors.nif ? 'var(--red)' : undefined }} />
              {fieldErrors.nif && <span style={{ color: 'var(--red)', fontSize: 11 }}>{fieldErrors.nif}</span>}
            </div>
            <div className="fg">
              <label>NIS — الرقم الإحصائي</label>
              <input value={form.nis} onChange={e => set('nis', e.target.value)}
                style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
            </div>
            <div className="fg">
              <label>AI — رقم المادة الجبائية</label>
              <input value={form.ai} onChange={e => set('ai', e.target.value)}
                style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
            </div>
            <div className="fg s2">
              <label>RC — رقم السجل التجاري</label>
              <input value={form.rc} onChange={e => set('rc', e.target.value)}
                style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
            </div>
            <div className="fg">
              <label>تاريخ السجل التجاري</label>
              <input type="date" value={form.rc_date} onChange={e => set('rc_date', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* العنوان والاتصال */}
        <Card>
          <SectionTitle icon="ti-map-pin" label="العنوان ومعلومات الاتصال" color="var(--teal)" />
          <div className="fgrid c3" style={{ gap: 12 }}>
            <div className="fg">
              <label>الولاية</label>
              <select value={str(form.wilaya_id)} onChange={e => { set('wilaya_id', e.target.value); set('commune_id', ''); }}>
                <option value="">— الولاية —</option>
                {wilayas.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>البلدية</label>
              <select value={str(form.commune_id)} onChange={e => set('commune_id', e.target.value)}
                disabled={!form.wilaya_id}>
                <option value="">— البلدية —</option>
                {communes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="fg s3">
              <label>العنوان التفصيلي</label>
              <input value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="حي، شارع، رقم..." />
            </div>
            <div className="fg">
              <label>الهاتف الثابت</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="023XXXXXX" />
            </div>
            <div className="fg">
              <label>الهاتف المحمول</label>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                placeholder="06XXXXXXXX" />
            </div>
            <div className="fg">
              <label>الفاكس</label>
              <input value={form.fax} onChange={e => set('fax', e.target.value)} />
            </div>
            <div className="fg s3">
              <label>البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="contact@example.com" />
            </div>
          </div>
        </Card>

        {/* البنك */}
        <Card>
          <SectionTitle icon="ti-building-bank" label="المعلومات البنكية" color="var(--gold)" />
          <div className="fgrid c2" style={{ gap: 12 }}>
            <div className="fg">
              <label>البنك</label>
              <select value={form.bank_name} onChange={e => set('bank_name', e.target.value)}>
                <option value="">— اختر البنك —</option>
                {['BNA','BEA','CPA','BADR','BDL','CNEP','AGB','ABC',
                  'Société Générale Algérie','BNP Paribas El Djazaïr',
                  'Citibank Algeria','HSBC Algeria'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>رقم الحساب البنكي (RIB)</label>
              <input value={form.rib} onChange={e => set('rib', e.target.value)}
                style={{ fontFamily: 'monospace', letterSpacing: 1 }}
                placeholder="00799999000XXXXXXXXXX00" />
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>20 خانة رقمية</span>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SaveButton onClick={handleSave} loading={updateMutation.isPending} />
        </div>
      </div>

      {/* ── الجانب الأيمن ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <LogoUpload company={company} />
        <CompanyPreviewCard form={form} company={company} />
        <CompanyStatusCard company={company} />
      </div>
    </div>
  );
}

// ─── Logo Upload ──────────────────────────────────────────────────────────────
function LogoUpload({ company }: { company?: Company }) {
  const qc      = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (company?.avatar) setPreview(company.avatar); }, [company?.avatar]);

  const upload = async (file: File) => {
    if (!company) return;
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await apiUpload(`/companies/${company.slug}/avatar`, fd);
      qc.invalidateQueries({ queryKey: companyKeys.current });
    } catch {
      setPreview(company.avatar ?? null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <SectionTitle icon="ti-photo" label="الشعار" color="var(--purple)" />
      <div
        style={{
          border: '2px dashed var(--b3)', borderRadius: 10, padding: 20,
          textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--em)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--b3)')}
      >
        {preview
          ? <img src={preview} alt="logo" style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain', marginBottom: 8 }} />
          : <i className="ti ti-cloud-upload" style={{ fontSize: 32, color: 'var(--t4)', marginBottom: 8, display: 'block' }} />
        }
        <div style={{ fontSize: 12, color: 'var(--t4)', fontWeight: 600 }}>
          {uploading ? 'جاري الرفع...' : 'اضغط أو اسحب الشعار هنا'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 3 }}>PNG, SVG, JPG — حد أقصى 2MB</div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
    </Card>
  );
}

// ─── Company Preview Card ─────────────────────────────────────────────────────
function CompanyPreviewCard({ form, company }: { form: any; company?: Company }) {
  return (
    <Card>
      <SectionTitle icon="ti-receipt" label="معاينة رأس الفاتورة" color="var(--teal)" />
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 8, padding: '14px 16px', direction: 'rtl',
        fontFamily: 'Tajawal, Arial, sans-serif',
      }}>
        {company?.avatar && (
          <img src={company.avatar} alt="logo"
            style={{ height: 44, objectFit: 'contain', marginBottom: 8, display: 'block' }} />
        )}
        <div style={{ fontWeight: 900, fontSize: 14, color: '#0a7c52', marginBottom: 3 }}>
          {form.commercial_name || form.name || '—'}
        </div>
        <div style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.8 }}>
          {form.nif && <div style={{ fontFamily: 'monospace' }}>NIF: {form.nif}{form.rc ? ` | RC: ${form.rc}` : ''}</div>}
          {form.address && <div>{form.address}</div>}
          {(form.phone || form.mobile) && (
            <div>Tél: {[form.phone, form.mobile].filter(Boolean).join(' — ')}</div>
          )}
          {form.email && <div>{form.email}</div>}
          {form.rib && <div style={{ fontFamily: 'monospace', fontSize: 9.5 }}>RIB: {form.rib}</div>}
        </div>
      </div>
    </Card>
  );
}

// ─── Company Status Card ──────────────────────────────────────────────────────
function CompanyStatusCard({ company }: { company?: Company }) {
  if (!company) return null;
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'الحالة',
      value: company.is_suspended
        ? <Badge variant="danger">معلّق</Badge>
        : company.active
          ? <Badge variant="success">نشط</Badge>
          : <Badge variant="warning">غير نشط</Badge>,
    },
    {
      label: 'التوثيق',
      value: company.is_verified
        ? <Badge variant="success"><i className="ti ti-rosette-discount-check" /> موثّق</Badge>
        : <Badge variant="default">غير موثّق</Badge>,
    },
    {
      label: 'الخطة',
      value: <span style={{ fontWeight: 800, color: 'var(--em)', textTransform: 'uppercase', fontSize: 12 }}>{company.plan}</span>,
    },
    {
      label: 'Slug',
      value: <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--t4)' }}>{company.slug}</span>,
    },
  ];
  if (company.trial_ends_at) {
    rows.push({
      label: 'نهاية التجربة',
      value: <span style={{ fontSize: 12, color: 'var(--gold)' }}>
        {new Date(company.trial_ends_at).toLocaleDateString('fr-DZ')}
      </span>,
    });
  }

  return (
    <Card>
      <SectionTitle icon="ti-info-circle" label="حالة الحساب" color="var(--t4)" />
      {rows.map(({ label, value }) => (
        <div key={label} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 0', borderBottom: '1px solid var(--b1)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--t4)' }}>{label}</span>
          {value}
        </div>
      ))}
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ② PrintTab
// ════════════════════════════════════════════════════════════════════════════
function PrintTab() {
  const qc   = useQueryClient();
  const slug = useActiveSlug() ?? '';

  const { data: rawSettings = [] } = useQuery({
    queryKey: [...tenantKeys.settings.current(slug), 'print'],
    queryFn:  () => settingsApi.byGroup('print'),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });

  const getSetting = (key: string, def: any) =>
    (rawSettings as any[]).find(s => s.key === key)?.value ?? def;

  const [showLogo,      setShowLogo]      = useState(true);
  const [showStamp,     setShowStamp]     = useState(true);
  const [showSign,      setShowSign]      = useState(true);
  const [showWatermark, setShowWatermark] = useState(false);
  const [paperSize,     setPaperSize]     = useState('A4');
  const [fontSz,        setFontSz]        = useState('medium');
  const [headerColor,   setHeaderColor]   = useState('#0a7c52');
  const [footerText,    setFooterText]    = useState('');
  const [priceMode,     setPriceMode]     = useState<'ht' | 'ttc'>('ttc');

  useEffect(() => {
    if (!rawSettings.length) return;
    setShowLogo(getSetting('print_show_logo', true));
    setShowStamp(getSetting('print_show_stamp', true));
    setShowSign(getSetting('print_show_sign', true));
    setShowWatermark(getSetting('print_show_watermark', false));
    setPaperSize(getSetting('print_paper_size', 'A4'));
    setFontSz(getSetting('print_font_size', 'medium'));
    setHeaderColor(getSetting('print_header_color', '#0a7c52'));
    setFooterText(getSetting('print_footer_text', ''));
    setPriceMode(getSetting('price_mode', 'ttc'));
  }, [rawSettings]);

  const { update } = useQuery({ queryKey: [], enabled: false }) as any; // just to satisfy TS
  const saveMutation = useMutation({
    mutationFn: () => settingsApi.update({
      print_show_logo:      showLogo,
      print_show_stamp:     showStamp,
      print_show_sign:      showSign,
      print_show_watermark: showWatermark,
      print_paper_size:     paperSize,
      print_font_size:      fontSz,
      print_header_color:   headerColor,
      print_footer_text:    footerText,
      price_mode:           priceMode,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.settings.current(slug) });
    },
  });

  const fSizeMap: Record<string, number> = { small: 10.5, medium: 12, large: 13.5 };
  const fontSize = fSizeMap[fontSz] ?? 12;

  return (
    <div className="g65">
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* وضع الأسعار */}
        <Card>
          <SectionTitle icon="ti-percentage" label="وضع الأسعار الافتراضي" color="var(--gold)" />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {[
              { val: 'ht',  label: 'HT — بدون TVA',   hint: 'الأسعار خارج الضريبة' },
              { val: 'ttc', label: 'TTC — شامل TVA',  hint: 'الأسعار شاملة الضريبة' },
            ].map(({ val, label, hint }) => (
              <button key={val} onClick={() => setPriceMode(val as any)}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  border: priceMode === val ? '2px solid var(--em)' : '1px solid var(--b2)',
                  background: priceMode === val ? 'var(--emb)' : 'var(--bg3)',
                  fontFamily: 'Tajawal, sans-serif', transition: '.15s',
                }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: priceMode === val ? 'var(--em)' : 'var(--t1)' }}>
                  {label}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 2 }}>{hint}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* خيارات الطباعة */}
        <Card>
          <SectionTitle icon="ti-printer" label="محتوى المطبوعات" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ToggleRow label="إظهار الشعار"              hint="شعار الشركة في رأس كل مطبوع"          checked={showLogo}      onChange={setShowLogo} />
            <ToggleRow label="خانة الختم والإمضاء"       hint="للمطبوعات الرسمية"                    checked={showStamp}     onChange={setShowStamp} />
            <ToggleRow label="التوقيع الرقمي"             hint="إضافة توقيع إلكتروني آلي"            checked={showSign}      onChange={setShowSign} />
            <ToggleRow label="علامة مائية «نسخة»"        hint="على نسخ الأرشفة والمسودات"           checked={showWatermark} onChange={setShowWatermark} />
          </div>
        </Card>

        {/* تصميم الطباعة */}
        <Card>
          <SectionTitle icon="ti-palette" label="تصميم الطباعة" color="var(--purple)" />
          <div className="fgrid c2" style={{ gap: 12 }}>
            <div className="fg">
              <label>حجم الورق</label>
              <select value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                <option value="A4">A4 — قياسي (21×29.7 cm)</option>
                <option value="A5">A5 — نصف قياسي</option>
                <option value="thermal">حراري 80mm</option>
              </select>
            </div>
            <div className="fg">
              <label>حجم الخط</label>
              <select value={fontSz} onChange={e => setFontSz(e.target.value)}>
                <option value="small">صغير</option>
                <option value="medium">متوسط (افتراضي)</option>
                <option value="large">كبير</option>
              </select>
            </div>
            <div className="fg">
              <label>لون ترويسة الفاتورة</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={headerColor} onChange={e => setHeaderColor(e.target.value)}
                  style={{ width: 40, height: 34, border: '1px solid var(--b2)', borderRadius: 6,
                    padding: 2, cursor: 'pointer', flexShrink: 0 }} />
                <input value={headerColor} onChange={e => setHeaderColor(e.target.value)}
                  style={{ fontFamily: 'monospace', flex: 1 }} maxLength={7} />
              </div>
            </div>
            <div className="fg">
              {/* spacer */}
            </div>
            <div className="fg s2">
              <label>نص تذييل الفاتورة</label>
              <input value={footerText} onChange={e => setFooterText(e.target.value)}
                placeholder="مثال: شكراً لثقتكم — RIB: 00799..." />
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>يظهر في أسفل كل مطبوع</span>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SaveButton onClick={() => saveMutation.mutateAsync()} loading={saveMutation.isPending} />
        </div>
      </div>

      {/* Live preview */}
      <div>
        <Card>
          <SectionTitle icon="ti-eye" label="معاينة حية" color="var(--teal)" />
          <div style={{
            background: '#f8fafc', padding: 12, borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}>
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 6, overflow: 'hidden', fontFamily: 'Tajawal, sans-serif',
              fontSize, direction: 'rtl', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
            }}>
              {/* Header */}
              <div style={{ background: headerColor, color: '#fff', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {showLogo && <span style={{ fontWeight: 900, fontSize: fontSize + 2 }}>اسم المؤسسة</span>}
                <span style={{ fontSize: fontSize - 1, opacity: .85 }}>FAC-2026-000001</span>
              </div>
              {/* Body */}
              <div style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSize - 1, color: '#64748b', marginBottom: 10 }}>
                  <span>العميل: محمد بن علي</span>
                  <span>{new Date().toLocaleDateString('fr-DZ')}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize - 1 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      {['المنتج','الكمية','السعر','المجموع'].map(h => (
                        <th key={h} style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', textAlign: h === 'المنتج' ? 'right' : 'center', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 8px' }}>منتج تجريبي</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>5</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>{priceMode === 'ht' ? 'HT' : 'TTC'} 1,000</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>{priceMode === 'ht' ? 'HT' : 'TTC'} 5,000</td>
                    </tr>
                  </tbody>
                </table>
                {showStamp && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <div style={{ textAlign: 'center', fontSize: fontSize - 2, color: '#94a3b8' }}>
                      <div style={{ border: '1px dashed #cbd5e1', width: 70, height: 50, borderRadius: 4, marginBottom: 3 }} />
                      الختم والإمضاء
                    </div>
                  </div>
                )}
                {showWatermark && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%) rotate(-30deg)', fontSize: 28, color: 'rgba(0,0,0,.08)', fontWeight: 900, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                      نسخة
                    </div>
                  </div>
                )}
              </div>
              {/* Footer */}
              {footerText && (
                <div style={{ background: '#f8fafc', padding: '5px 14px', fontSize: fontSize - 2, color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
                  {footerText}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ③ AlertsTab
// ════════════════════════════════════════════════════════════════════════════
function AlertsTab() {
  const qc   = useQueryClient();
  const slug = useActiveSlug() ?? '';

  const { data: rawSettings = [] } = useQuery({
    queryKey: [...tenantKeys.settings.current(slug), 'alerts'],
    queryFn:  () => settingsApi.byGroup('alerts'),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });

  const getSetting = (key: string, def: any) =>
    (rawSettings as any[]).find(s => s.key === key)?.value ?? def;

  // Stock
  const [alertLowStock,      setAlertLowStock]      = useState(true);
  const [alertOutOfStock,    setAlertOutOfStock]     = useState(true);
  const [lowStockThreshold,  setLowStockThreshold]   = useState('10');
  // Debts
  const [alertDebtDue,       setAlertDebtDue]        = useState(true);
  const [debtDueDays,        setDebtDueDays]         = useState('7');
  const [alertOverdueDebts,  setAlertOverdueDebts]   = useState(true);
  // Fiscal
  const [alertFiscalClose,   setAlertFiscalClose]    = useState(true);
  const [fiscalCloseDays,    setFiscalCloseDays]     = useState('30');
  const [alertG50,           setAlertG50]            = useState(true);
  const [g50DaysBefore,      setG50DaysBefore]       = useState('5');
  // Documents
  const [alertDraftDocs,     setAlertDraftDocs]      = useState(false);
  const [draftDocsDays,      setDraftDocsDays]       = useState('3');
  // Email
  const [emailNotifications, setEmailNotifications]  = useState(false);
  const [notifEmail,         setNotifEmail]          = useState('');

  useEffect(() => {
    if (!rawSettings.length) return;
    setAlertLowStock(getSetting('alert_low_stock', true));
    setAlertOutOfStock(getSetting('alert_out_of_stock', true));
    setLowStockThreshold(str(getSetting('low_stock_threshold', '10')));
    setAlertDebtDue(getSetting('alert_debt_due', true));
    setDebtDueDays(str(getSetting('debt_due_days', '7')));
    setAlertOverdueDebts(getSetting('alert_overdue_debts', true));
    setAlertFiscalClose(getSetting('alert_fiscal_close', true));
    setFiscalCloseDays(str(getSetting('fiscal_close_days', '30')));
    setAlertG50(getSetting('alert_g50', true));
    setG50DaysBefore(str(getSetting('g50_days_before', '5')));
    setAlertDraftDocs(getSetting('alert_draft_docs', false));
    setDraftDocsDays(str(getSetting('draft_docs_days', '3')));
    setEmailNotifications(getSetting('email_notifications', false));
    setNotifEmail(str(getSetting('notif_email', '')));
  }, [rawSettings]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.update({
      alert_low_stock:       alertLowStock,
      alert_out_of_stock:    alertOutOfStock,
      low_stock_threshold:   Number(lowStockThreshold),
      alert_debt_due:        alertDebtDue,
      debt_due_days:         Number(debtDueDays),
      alert_overdue_debts:   alertOverdueDebts,
      alert_fiscal_close:    alertFiscalClose,
      fiscal_close_days:     Number(fiscalCloseDays),
      alert_g50:             alertG50,
      g50_days_before:       Number(g50DaysBefore),
      alert_draft_docs:      alertDraftDocs,
      draft_docs_days:       Number(draftDocsDays),
      email_notifications:   emailNotifications,
      notif_email:           notifEmail,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenantKeys.settings.current(slug) }),
  });

  return (
    <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* المخزون */}
      <Card>
        <SectionTitle icon="ti-box" label="تنبيهات المخزون" color="var(--blue)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ToggleRow label="تنبيه عند انخفاض المخزون" hint="عند وصول الكمية للحد الأدنى"
            checked={alertLowStock} onChange={setAlertLowStock} />
          {alertLowStock && (
            <div style={{ padding: '0 14px 4px' }}>
              <label style={{ fontSize: 12, color: 'var(--t3)' }}>الحد الأدنى (وحدات)</label>
              <input type="number" value={lowStockThreshold}
                onChange={e => setLowStockThreshold(e.target.value)}
                style={{ width: 100, marginTop: 4 }} min={1} />
            </div>
          )}
          <ToggleRow label="تنبيه عند نفاذ المخزون كلياً" hint="عند الوصول إلى صفر"
            checked={alertOutOfStock} onChange={setAlertOutOfStock} />
        </div>
      </Card>

      {/* الديون */}
      <Card>
        <SectionTitle icon="ti-coins" label="تنبيهات الديون والمستحقات" color="var(--red)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ToggleRow label="تنبيه قبل استحقاق فاتورة" hint="قبل تاريخ الاستحقاق"
            checked={alertDebtDue} onChange={setAlertDebtDue} />
          {alertDebtDue && (
            <div style={{ padding: '0 14px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>تنبيه قبل</span>
              <input type="number" value={debtDueDays}
                onChange={e => setDebtDueDays(e.target.value)}
                style={{ width: 70 }} min={1} max={60} />
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>يوم</span>
            </div>
          )}
          <ToggleRow label="تنبيه عند الديون المتأخرة" hint="الفواتير التي تجاوزت تاريخ استحقاقها"
            checked={alertOverdueDebts} onChange={setAlertOverdueDebts} />
        </div>
      </Card>

      {/* الجبائي */}
      <Card>
        <SectionTitle icon="ti-calendar-event" label="التنبيهات الجبائية والمالية" color="var(--gold)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ToggleRow label="تنبيه قبل إقفال السنة المالية"
            hint="لإتمام التسويات قبل الإقفال"
            checked={alertFiscalClose} onChange={setAlertFiscalClose} />
          {alertFiscalClose && (
            <div style={{ padding: '0 14px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>تنبيه قبل</span>
              <input type="number" value={fiscalCloseDays}
                onChange={e => setFiscalCloseDays(e.target.value)}
                style={{ width: 70 }} min={1} max={90} />
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>يوم</span>
            </div>
          )}
          <ToggleRow label="تنبيه موعد تقديم G50"
            hint="الإقرار الشهري بالضريبة على القيمة المضافة"
            checked={alertG50} onChange={setAlertG50} />
          {alertG50 && (
            <div style={{ padding: '0 14px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>تنبيه قبل</span>
              <input type="number" value={g50DaysBefore}
                onChange={e => setG50DaysBefore(e.target.value)}
                style={{ width: 70 }} min={1} max={20} />
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>يوم من الاستحقاق</span>
            </div>
          )}
        </div>
      </Card>

      {/* المستندات */}
      <Card>
        <SectionTitle icon="ti-file-description" label="تنبيهات المستندات" color="var(--teal)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ToggleRow label="تنبيه عند وجود مسودات قديمة"
            hint="مستندات في حالة مسودة منذ مدة"
            checked={alertDraftDocs} onChange={setAlertDraftDocs} />
          {alertDraftDocs && (
            <div style={{ padding: '0 14px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>تنبيه بعد</span>
              <input type="number" value={draftDocsDays}
                onChange={e => setDraftDocsDays(e.target.value)}
                style={{ width: 70 }} min={1} />
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>أيام بدون تحديث</span>
            </div>
          )}
        </div>
      </Card>

      {/* البريد الإلكتروني */}
      <Card>
        <SectionTitle icon="ti-mail" label="إشعارات البريد الإلكتروني" color="var(--em)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ToggleRow label="إرسال إشعارات بالبريد الإلكتروني"
            hint="استقبال ملخص يومي للتنبيهات النشطة"
            checked={emailNotifications} onChange={setEmailNotifications} />
          {emailNotifications && (
            <div style={{ padding: '0 14px 4px' }}>
              <label style={{ fontSize: 12, color: 'var(--t3)' }}>البريد المستقبِل للإشعارات</label>
              <input type="email" value={notifEmail}
                onChange={e => setNotifEmail(e.target.value)}
                placeholder="alerts@example.com"
                style={{ marginTop: 4, width: '100%' }} />
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton onClick={() => saveMutation.mutateAsync()} loading={saveMutation.isPending} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ④ PlanTab
// ════════════════════════════════════════════════════════════════════════════
const PLANS: Record<string, {
  label: string; labelAr: string; color: string; icon: string;
  maxUsers: number | null; maxWarehouses: number | null; maxProducts: number | null;
  features: string[];
}> = {
  free: {
    label: 'FREE', labelAr: 'مجاني', color: '#64748b', icon: 'ti-leaf',
    maxUsers: 3, maxWarehouses: 1, maxProducts: 500,
    features: ['وظائف أساسية', 'فاتورة يدوية', 'تقارير محدودة'],
  },
  starter: {
    label: 'STARTER', labelAr: 'ستارتر', color: '#3b82f6', icon: 'ti-rocket',
    maxUsers: 10, maxWarehouses: 3, maxProducts: 2000,
    features: ['كل وظائف Free', 'تقارير متقدمة', 'مستودعات متعددة', 'دعم البريد'],
  },
  professional: {
    label: 'PRO', labelAr: 'احترافي', color: '#0a7c52', icon: 'ti-crown',
    maxUsers: 50, maxWarehouses: 10, maxProducts: null,
    features: ['كل وظائف Starter', 'منتجات غير محدودة', 'API كامل', 'تكاملات خارجية'],
  },
  enterprise: {
    label: 'ENTERPRISE', labelAr: 'مؤسسي', color: '#d97706', icon: 'ti-building-skyscraper',
    maxUsers: null, maxWarehouses: null, maxProducts: null,
    features: ['كل شيء في Pro', 'دعم مخصص 24/7', 'نسخ احتياطية يومية', 'SLA مضمون'],
  },
};

function PlanTab() {
  const { data: company } = useCurrentCompany();
  const plan    = company?.plan ?? 'free';
  const details = PLANS[plan] ?? PLANS.free;

  const usageItems = [
    { label: 'المستخدمون',   icon: 'ti-users',              current: null, max: company?.max_users      },
    { label: 'المستودعات',   icon: 'ti-building-warehouse', current: null, max: company?.max_warehouses },
    { label: 'المنتجات',     icon: 'ti-box',                current: null, max: company?.max_products   },
  ];

  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* بطاقة الخطة */}
      <Card>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 14, flexShrink: 0,
            background: `${details.color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`ti ${details.icon}`} style={{ fontSize: 26, color: details.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: details.color }}>
                {details.labelAr}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 8px',
                borderRadius: 20, background: `${details.color}18`,
                color: details.color, letterSpacing: .5,
              }}>{details.label}</span>
              <Badge variant="success">الخطة النشطة</Badge>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {details.features.map(f => (
                <div key={f} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: 'var(--t2)',
                }}>
                  <i className="ti ti-check" style={{ color: details.color, fontSize: 12 }} />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* حدود الاستخدام */}
      <Card>
        <SectionTitle icon="ti-chart-bar" label="الحدود المتاحة" color="var(--blue)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {usageItems.map(({ label, icon, max }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', background: 'var(--bg3)',
              borderRadius: 'var(--r2)', border: '1px solid var(--b2)',
            }}>
              <i className={`ti ${icon}`} style={{ fontSize: 16, color: 'var(--em)', width: 20 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{label}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>
                {max == null ? '∞ غير محدود' : `الحد: ${max.toLocaleString('fr-DZ')}`}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* التجربة */}
      {company?.trial_ends_at && (
        <div style={{
          padding: '14px 16px', borderRadius: 12,
          background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <i className="ti ti-clock-hour-4" style={{ fontSize: 24, color: 'var(--gold)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>فترة التجربة نشطة</div>
            <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 2 }}>
              تنتهي في {new Date(company.trial_ends_at).toLocaleDateString('ar-DZ')} — استفد من كل الميزات قبل انتهائها
            </div>
          </div>
        </div>
      )}

      {/* مقارنة الخطط الأخرى */}
      <Card>
        <SectionTitle icon="ti-stack" label="مقارنة الخطط" color="var(--t3)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(PLANS).map(([key, p]) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 14px', borderRadius: 8,
              background: key === plan ? `${p.color}10` : 'var(--bg3)',
              border: `1px solid ${key === plan ? p.color + '40' : 'var(--b2)'}`,
            }}>
              <i className={`ti ${p.icon}`} style={{ fontSize: 15, color: p.color, width: 18 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: key === plan ? 700 : 500, color: 'var(--t1)' }}>
                {p.labelAr}
              </span>
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                {p.maxUsers == null ? '∞' : p.maxUsers} مستخدم
                {' · '}
                {p.maxProducts == null ? '∞' : p.maxProducts.toLocaleString()} منتج
              </span>
              {key === plan && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${p.color}20`, color: p.color }}>
                  خطتك الحالية
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* تنبيه الترقية */}
      <div style={{
        padding: '12px 16px', borderRadius: 10,
        background: 'color-mix(in srgb, var(--em) 7%, transparent)',
        border: '1px solid color-mix(in srgb, var(--em) 20%, transparent)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <i className="ti ti-info-circle" style={{ fontSize: 17, color: 'var(--em)', marginTop: 1, flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>
          لترقية خطتك أو تعديل الحدود، تواصل مع مدير النظام.{' '}
          <strong style={{ color: 'var(--em)' }}>تغيير الخطة متاح من لوحة تحكم المدير فقط.</strong>
        </p>
      </div>
    </div>
  );
}
