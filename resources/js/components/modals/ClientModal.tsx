// resources/js/components/modals/ClientModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import { useWilayas, useCommunes, useLegalForms, usePriceLevels } from '@/lib/api/endpoints/lookups';
import type { Party, Wilaya, LegalForm, PriceLevel } from '@/types';

/* ── UI atoms — same design language as ProductModal ────────────── */
const s = {
  field:   { display: 'flex' as const, flexDirection: 'column' as const, gap: 4 },
  label:   { fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.03em', textTransform: 'uppercase' as const },
  inp:     { padding: '8px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13, outline: 'none', fontFamily: 'Tajawal, inherit', transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box' as const, width: '100%' },
  sel:     { padding: '8px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13, outline: 'none', fontFamily: 'Tajawal, inherit', boxSizing: 'border-box' as const, width: '100%', cursor: 'pointer' },
  hint:    { fontSize: 11, color: 'var(--t4)', marginTop: 2, lineHeight: 1.5 },
  card:    { padding: '14px 16px', borderRadius: 'var(--r3)', border: '1px solid var(--b2)', background: 'var(--bg3)' },
  section: { display: 'flex' as const, flexDirection: 'column' as const, gap: 16 },
  divider: { height: 1, background: 'var(--b2)', margin: '4px 0' },
};

function Field({ label, children, hint, required }: {
  label: string; children: React.ReactNode; hint?: string; required?: boolean;
}) {
  return (
    <div style={s.field}>
      <label style={s.label}>
        {label}{required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
      </label>
      {children}
      {hint && <span style={s.hint}>{hint}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none', opacity: disabled ? 0.5 : 1 }}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, position: 'relative',
          background: checked ? 'var(--em)' : 'var(--b3)', transition: 'background .2s',
          flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      {label && <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>}
    </label>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--b2)', marginBottom: 4 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: 'var(--em)' }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

interface ClientModalProps {
  open: boolean;
  party: Party | null;
  onClose: () => void;
  onSaved: () => void;
  isSubmitting?: boolean;
  onSubmit: (data: any) => Promise<void>;
}

export default function ClientModal({ open, party, onClose, onSaved, isSubmitting, onSubmit }: ClientModalProps) {
  const isEdit = !!party;
  const [activeTab, setActiveTab]           = useState(0);
  const [selectedWilayaId, setSelectedWilayaId] = useState<number | null>(null);
  const [copied, setCopied]                     = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // ── Lookups ───────────────────────────────────────────────────────
  const { data: wilayasRaw  = [] } = useWilayas();
  const { data: legalForms  = [] } = useLegalForms();
  const { data: priceLevels = [] } = usePriceLevels();
  const { data: communes = [], isFetching: loadingCommunes } = useCommunes(selectedWilayaId);

  const wilayas: Wilaya[] = [...wilayasRaw].sort((a: any, b: any) => a.code - b.code);

  const defaultPriceLevelId = priceLevels.find(
    (pl: any) => (pl.name || '').toLowerCase().includes('tarif') && (pl.name || '').toLowerCase().includes('tail')
  )?.id ?? null;

  // ── Form state ────────────────────────────────────────────────────
  const emptyForm = {
    name: '', commercial_name: '', code: '', activity: '',
    rc: '', nif: '', nis: '', ai: '', legal_form_id: null as number | null,
    capital_amount: 0, rc_date: '', address: '',
    commune_id: null as number | null,
    wilaya_id:  null as number | null,
    phone: '', mobile: '', fax: '', email: '', bank_name: '', rib: '',
    credit_limit: 0, credit_days: 30, allow_credit_sale: true,
    default_price_level_id: null as number | null,
    is_tva_exempt: false, is_taxable: true, tax_option: null as string | null,
    cnas_number: '', tax_regime: null as string | null,
    is_final_consumer: true, is_vat_registered: false,
    vat_registration_date: '', active: true,
  };
  const [form, setForm] = useState(emptyForm);

  const buildFormFromParty = (p: Party) => {
    const ns = (v: any) => v == null ? '' : v;
    const nn = (v: any, d = 0) => v ?? d;

    const wId = p.wilaya_id ?? null;

    return {
      ...emptyForm,
      name:                   ns(p.name),
      commercial_name:        ns(p.commercial_name),
      code:                   ns(p.code),
      activity:               ns(p.activity),
      rc:                     ns(p.rc),
      nif:                    ns(p.nif),
      nis:                    ns(p.nis),
      ai:                     ns(p.ai),
      address:                ns(p.address),
      phone:                  ns(p.phone),
      mobile:                 ns(p.mobile),
      fax:                    ns(p.fax),
      email:                  ns(p.email),
      bank_name:              ns(p.bank_name),
      rib:                    ns(p.rib),
      rc_date:                ns(p.rc_date),
      vat_registration_date:  ns(p.vat_registration_date),
      cnas_number:            ns(p.cnas_number),
      tax_regime:             ns(p.tax_regime),
      tax_option:             p.tax_option ?? null,
      capital_amount:         nn(p.capital_amount),
      credit_limit:           nn(p.credit_limit),
      credit_days:            nn(p.credit_days, 30),
      allow_credit_sale:      p.allow_credit_sale ?? true,
      is_tva_exempt:          p.is_tva_exempt    ?? false,
      is_taxable:             p.is_taxable       ?? true,
      is_final_consumer:      p.is_final_consumer ?? true,
      is_vat_registered:      p.is_vat_registered ?? false,
      active:                 p.active !== false,
      wilaya_id:              wId,
      commune_id:             p.commune_id             ?? null,
      legal_form_id:          p.legal_form_id          ?? null,
      default_price_level_id: p.default_price_level_id ?? null,
    };
  };

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setSelectedWilayaId(null);
      setError('');
      setSuccess('');
      setCopied(false);
      setActiveTab(0);
      return;
    }

    setError('');
    setSuccess('');
    setActiveTab(0);

    if (party) {
      setSelectedWilayaId(party.wilaya_id ?? null);
      setForm(buildFormFromParty(party));
    } else {
      setForm(prev => ({ ...prev, default_price_level_id: defaultPriceLevelId }));
      setSelectedWilayaId(null);
    }
  }, [open, party, defaultPriceLevelId]);

  const set = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── Wilaya change ─────────────────────────────────────────────────
  const handleWilayaChange = (val: number | null) => {
    setSelectedWilayaId(val);
    set('wilaya_id', val);
    set('commune_id', null);
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { setError('اسم الزبون مطلوب'); return; }
    try {
      const n2 = (v: any) => v === '' ? null : v;
      await onSubmit({
        ...form,
        party_type_id: 1,
        commercial_name:       n2(form.commercial_name),
        code:                  n2(form.code),
        activity:              n2(form.activity),
        rc:                    n2(form.rc),
        nif:                   n2(form.nif),
        nis:                   n2(form.nis),
        ai:                    n2(form.ai),
        address:               n2(form.address),
        phone:                 n2(form.phone),
        mobile:                n2(form.mobile),
        fax:                   n2(form.fax),
        email:                 n2(form.email),
        bank_name:             n2(form.bank_name),
        rib:                   n2(form.rib),
        rc_date:               n2(form.rc_date),
        vat_registration_date: n2(form.vat_registration_date),
        cnas_number:           n2(form.cnas_number),
        tax_regime:            n2(form.tax_regime),
        tax_option:            n2(form.tax_option),
        legal_form_id:         form.legal_form_id,
        wilaya_id:             form.wilaya_id,
        commune_id:            form.commune_id,
        credit_limit:          form.credit_limit,
        credit_days:           form.credit_days,
        allow_credit_sale:     form.allow_credit_sale,
        default_price_level_id: form.default_price_level_id,
        is_tva_exempt:         form.is_tva_exempt,
        is_taxable:            form.is_taxable,
        is_final_consumer:     form.is_final_consumer,
        is_vat_registered:     form.is_vat_registered,
        capital_amount:        form.capital_amount,
      });
      setSuccess(isEdit ? 'تم تعديل الزبون بنجاح' : 'تم إضافة الزبون بنجاح');
      setTimeout(() => { onSaved(); onClose(); }, 300);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'فشل الحفظ');
    }
  };

  const tabs = [
    { label: 'المعلومات الأساسية', icon: 'ti-user' },
    { label: 'الوثائق القانونية',  icon: 'ti-file-text' },
    { label: 'المعلومات المالية',  icon: 'ti-wallet' },
    { label: 'إعدادات إضافية',     icon: 'ti-settings' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `تعديل — ${party?.name}` : 'إضافة زبون جديد'}
      footer={
        <>
          <Button onClick={onClose}>إلغاء</Button>
          <Button
            variant="primary"
            icon={<i className="ti ti-device-floppy" />}
            onClick={handleSave}
            disabled={isSubmitting || !form.name.trim()}
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      {error   && <AlertBar variant="red"   style={{ marginBottom: 12 }}>{error}</AlertBar>}
      {success && <AlertBar variant="green" style={{ marginBottom: 12 }}>{success}</AlertBar>}

      {/* Tab headers — flush with modal header, sticky on scroll */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid var(--b2)',
        marginBottom: 16, direction: 'rtl', background: 'var(--bg2)',
        position: 'sticky', top: -20, zIndex: 10,
      }}>
        {tabs.map((tab, idx) => {
          const isActive = activeTab === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '11px 16px', fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--em)' : 'var(--t3)',
                background: isActive ? 'var(--emb)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--em)' : 'transparent'}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color .15s, border-color .15s, background .15s',
                fontFamily: 'inherit',
              }}
            >
              <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

        {/* Tab content */}
        <div style={{ minHeight: 440 }}>

        {/* ── تبويب 0: المعلومات الأساسية ── */}
        {activeTab === 0 && (
          <div style={s.section}>

            {/* ── الهوية ── */}
            <div style={s.card}>
              <SectionHeader icon="ti-user" title="الهوية" subtitle="المعلومات الأساسية للزبون" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                <div className="fgrid c3">
                  <div className="fg">
                    <Field label="رمز الزبون" hint="يُولد تلقائياً">
                      <div style={{ position: 'relative' }}>
                        <input
                          style={{ ...s.inp, background: 'var(--bg1)', cursor: 'default', direction: 'ltr', textAlign: 'left', paddingRight: 34 }}
                          value={form.code || '—'}
                          readOnly
                          onFocus={e => e.target.select()}
                          title="انقر لتحديد ثم Ctrl+C للنسخ"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (form.code) {
                              navigator.clipboard.writeText(form.code);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1500);
                            }
                          }}
                          style={{
                            position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                            width: 26, height: 26, borderRadius: 6, border: 'none',
                            background: copied ? 'var(--em)' : 'var(--b3)',
                            color: copied ? '#fff' : 'var(--t3)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background .2s, color .2s',
                          }}
                          title={copied ? 'تم النسخ!' : 'نسخ الرمز'}
                        >
                          <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} style={{ fontSize: 14 }} />
                        </button>
                      </div>
                    </Field>
                  </div>
                  <div className="fg s2">
                    <Field label="الاسم الكامل / الشركة" required>
                      <input style={s.inp} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
                    </Field>
                  </div>
                </div>
                <div>
                  <Field label="الاسم التجاري">
                    <input style={s.inp} value={form.commercial_name || ''} onChange={e => set('commercial_name', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── العنوان ── */}
            <div style={s.card}>
              <SectionHeader icon="ti-map-pin" title="العنوان" subtitle="الموقع الجغرافي للزبون" />
              <div className="fgrid c3" style={{ marginTop: 14 }}>
                <div className="fg s3">
                  <Field label="العنوان">
                    <input style={s.inp} value={form.address || ''} onChange={e => set('address', e.target.value)} />
                  </Field>
                </div>
                <div className="fg">
                  <Field label="الولاية">
                    <select style={s.sel} value={form.wilaya_id ?? ''} onChange={e => handleWilayaChange(e.target.value ? parseInt(e.target.value) : null)}>
                      <option value="">-- اختر الولاية --</option>
                      {wilayas.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.arabic_name || w.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="fg">
                  <Field label="البلدية">
                    <select style={{ ...s.sel, opacity: (!selectedWilayaId || loadingCommunes) ? 0.55 : 1 }} value={form.commune_id ?? ''} onChange={e => set('commune_id', e.target.value ? parseInt(e.target.value) : null)} disabled={!selectedWilayaId || loadingCommunes}>
                      <option value="">{!selectedWilayaId ? '— اختر الولاية أولاً —' : loadingCommunes ? 'جاري التحميل...' : '-- اختر البلدية --'}</option>
                      {communes.map((c: any) => <option key={c.id} value={c.id}>{c.arabic_name || c.name}{c.post_code ? ` (${c.post_code})` : ''}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            {/* ── الاتصال ── */}
            <div style={s.card}>
              <SectionHeader icon="ti-phone" title="الاتصال" subtitle="معلومات الاتصال بالزبون" />
              <div className="fgrid c3" style={{ marginTop: 14 }}>
                <div className="fg">
                  <Field label="الهاتف">
                    <input style={s.inp} value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
                  </Field>
                </div>
                <div className="fg">
                  <Field label="الجوال">
                    <input style={s.inp} value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} />
                  </Field>
                </div>
                <div className="fg">
                  <Field label="الفاكس">
                    <input style={s.inp} value={form.fax || ''} onChange={e => set('fax', e.target.value)} />
                  </Field>
                </div>
                <div className="fg s2">
                  <Field label="البريد الإلكتروني">
                    <input style={s.inp} value={form.email || ''} onChange={e => set('email', e.target.value)} type="email" />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── حالة الزبون ── */}
            <div style={s.card}>
              <SectionHeader icon="ti-toggle-right" title="حالة الزبون" subtitle="تفعيل أو تعطيل حساب الزبون" />
              <div style={{ marginTop: 14 }}>
                <Toggle checked={form.active} onChange={v => set('active', v)} label={form.active ? 'نشط' : 'معطّل'} />
              </div>
            </div>

          </div>
        )}

        {/* ── تبويب 1: الوثائق القانونية ── */}
        {activeTab === 1 && (
          <div style={s.section}>

            {/* ── النشاط والشكل القانوني ── */}
            <div style={s.card}>
              <SectionHeader icon="ti-briefcase" title="النشاط والشكل القانوني" subtitle="المعلومات القانونية للزبون" />
              <div className="fgrid c3" style={{ marginTop: 14 }}>
                <div className="fg s3">
                  <Field label="النشاط" hint="مجال عمل الزبون">
                    <input style={s.inp} value={form.activity || ''} onChange={e => set('activity', e.target.value)} placeholder="مثال: تجارة التجزئة" />
                  </Field>
                </div>
                <div className="fg s2">
                  <Field label="الشكل القانوني">
                    <select style={s.sel} value={form.legal_form_id ?? ''} onChange={e => set('legal_form_id', e.target.value ? parseInt(e.target.value) : null)}>
                      <option value="">-- اختر --</option>
                      {legalForms.map((lf: LegalForm) => <option key={lf.id} value={lf.id}>{lf.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="fg">
                  <Field label="رأس المال (دج)">
                    <input style={s.inp} type="number" value={form.capital_amount} onChange={e => set('capital_amount', parseFloat(e.target.value) || 0)} min="0" />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── السجل التجاري والتعريف ── */}
            <div style={s.card}>
              <SectionHeader icon="ti-file-text" title="السجل التجاري والتعريف" subtitle="الأرقام الرسمية والتسجيلات" />
              <div className="fgrid c3" style={{ marginTop: 14 }}>
                <div className="fg">
                  <Field label="تاريخ السجل التجاري">
                    <input style={s.inp} type="date" value={form.rc_date || ''} onChange={e => set('rc_date', e.target.value)} />
                  </Field>
                </div>
                <div className="fg">
                  <Field label="RC (السجل التجاري)">
                    <input style={s.inp} value={form.rc || ''} onChange={e => set('rc', e.target.value)} />
                  </Field>
                </div>
                <div className="fg">
                  <Field label="NIF" hint="الرقم الجبائي الموحد">
                    <input style={s.inp} value={form.nif || ''} onChange={e => set('nif', e.target.value)} />
                  </Field>
                </div>
                <div className="fg">
                  <Field label="NIS" hint="رقم التعريف الإحصائي">
                    <input style={s.inp} value={form.nis || ''} onChange={e => set('nis', e.target.value)} />
                  </Field>
                </div>
                <div className="fg">
                  <Field label="AI (رقم المادة)">
                    <input style={s.inp} value={form.ai || ''} onChange={e => set('ai', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── تبويب 2: المعلومات المالية ── */}
        {activeTab === 2 && (
          <div style={s.section}>

            {/* ── الأسعار ── */}
            <div style={s.card}>
              <SectionHeader icon="ti-tag" title="الأسعار" subtitle="مستوى الأسعار الافتراضي للزبون" />
              <div className="fgrid c3" style={{ marginTop: 14 }}>
                <div className="fg">
                  <Field label="مستوى السعر الافتراضي">
                    <select style={s.sel} value={form.default_price_level_id ?? ''} onChange={e => set('default_price_level_id', e.target.value ? parseInt(e.target.value) : null)}>
                      <option value="">-- بدون --</option>
                      {priceLevels.map((pl: PriceLevel) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            {/* ── معلومات بنكية ── */}
            <div style={s.card}>
              <SectionHeader icon="ti-building-bank" title="معلومات بنكية" subtitle="الحساب البنكي للزبون" />
              <div className="fgrid c3" style={{ marginTop: 14 }}>
                <div className="fg s2">
                  <Field label="اسم البنك">
                    <input style={s.inp} value={form.bank_name || ''} onChange={e => set('bank_name', e.target.value)} />
                  </Field>
                </div>
                <div className="fg">
                  <Field label="RIB" hint="الحساب البنكي">
                    <input style={s.inp} value={form.rib || ''} onChange={e => set('rib', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── تبويب 3: إعدادات إضافية ── */}
        {activeTab === 3 && (
          <div style={s.section}>

            {/* ── قسم البيع بالدين ── */}
            <div style={s.card}>
              <SectionHeader icon="ti-credit-card" title="البيع بالدين (الائتمان)" subtitle="تفعيل أو تعطيل البيع بأجل الدفع لهذا الزبون" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                <Toggle checked={form.allow_credit_sale} onChange={v => set('allow_credit_sale', v)} label="السماح بالبيع بالدين" />
                {form.allow_credit_sale && (
                  <div className="fgrid c2" style={{ marginTop: 4 }}>
                    <div className="fg">
                      <Field label="الحد الائتماني (دج)" hint="أقصى مبلغ مسموح به">
                        <input style={s.inp} type="number" value={form.credit_limit} onChange={e => set('credit_limit', parseFloat(e.target.value) || 0)} min="0" step="1000" />
                      </Field>
                    </div>
                    <div className="fg">
                      <Field label="أجل الدفع (يوم)" hint="المدة الزمنية للسداد">
                        <input style={s.inp} type="number" value={form.credit_days} onChange={e => set('credit_days', parseInt(e.target.value) || 0)} min="0" />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── قسم الضريبة و TVA ── */}
            <div style={s.card}>
              <SectionHeader icon="ti-receipt" title="الضريبة و VAT" subtitle="إعدادات النظام الضريبي لهذا الزبون" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                <div className="fgrid c3">
                  <div className="fg">
                    <Field label="النظام الضريبي">
                      <select style={s.sel} value={form.tax_regime || ''} onChange={e => set('tax_regime', e.target.value || null)}>
                        <option value="">-- اختر النظام --</option>
                        <option value="reel">Réel (النظام الحقيقي)</option>
                        <option value="forfaitaire">Forfaitaire (النظام التقديري)</option>
                        <option value="micro">Micro (النظام المصغّر)</option>
                      </select>
                    </Field>
                  </div>
                  <div className="fg">
                    <Field label="تاريخ التسجيل في TVA">
                      <input style={s.inp} type="date" value={form.vat_registration_date || ''} onChange={e => set('vat_registration_date', e.target.value)} />
                    </Field>
                  </div>
                  <div className="fg">
                    <Field label="رقم CNAS">
                      <input style={s.inp} value={form.cnas_number || ''} onChange={e => set('cnas_number', e.target.value)} />
                    </Field>
                  </div>
                </div>
                <div style={s.divider} />
                <div className="fgrid c2">
                  <Toggle checked={form.is_tva_exempt} onChange={v => { set('is_tva_exempt', v); set('is_taxable', !v); }} label="معفى من TVA" />
                  <Toggle checked={form.is_vat_registered} onChange={v => set('is_vat_registered', v)} label="مسجّل في TVA" />
                  <Toggle checked={form.is_final_consumer} onChange={v => set('is_final_consumer', v)} label="مستهلك نهائي" />
                </div>
              </div>
            </div>

          </div>
        )}

        </div>
    </Modal>
  );
}
