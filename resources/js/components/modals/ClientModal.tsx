// resources/js/components/modals/ClientModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import { useWilayas, useCommunes, useLegalForms, usePriceLevels } from '@/lib/api/endpoints/lookups';
import type { Party, Wilaya, Commune, LegalForm, PriceLevel } from '@/types';

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
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // ── Lookups ───────────────────────────────────────────────────────
  const { data: wilayasRaw  = [] } = useWilayas();
  const { data: legalForms  = [] } = useLegalForms();
  const { data: priceLevels = [] } = usePriceLevels();
  const { data: communes = [], isFetching: loadingCommunes } = useCommunes(selectedWilayaId);

  const wilayas: Wilaya[] = [...wilayasRaw].sort((a: any, b: any) => a.code - b.code);

  // ── Form state ────────────────────────────────────────────────────
  const emptyForm = {
    name: '', commercial_name: '', code: '', activity: '',
    rc: '', nif: '', nis: '', ai: '', legal_form_id: null as number | null,
    capital_amount: 0, rc_date: '', address: '',
    commune_id: null as number | null,
    wilaya_id:  null as number | null,
    phone: '', mobile: '', fax: '', email: '', bank_name: '', rib: '',
    initial_balance: 0, credit_limit: 0, credit_days: 30,
    default_price_level_id: null as number | null,
    is_tva_exempt: false, is_taxable: true, tax_option: null as string | null,
    cnas_number: '', tax_regime: null as string | null,
    is_final_consumer: false, is_vat_registered: false,
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
      initial_balance:        nn(p.initial_balance),
      credit_limit:           nn(p.credit_limit),
      credit_days:            nn(p.credit_days, 30),
      is_tva_exempt:          p.is_tva_exempt    ?? false,
      is_taxable:             p.is_taxable       ?? true,
      is_final_consumer:      p.is_final_consumer ?? false,
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
      setForm(emptyForm);
      setSelectedWilayaId(null);
    }
  }, [open, party]);

  const set = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── Wilaya change ─────────────────────────────────────────────────
  const handleWilayaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value) : null;
    setSelectedWilayaId(id);
    set('wilaya_id', id);
    set('commune_id', null);   // ✅ إعادة تعيين البلدية عند تغيير الولاية
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
        default_price_level_id: form.default_price_level_id,
        is_tva_exempt:         form.is_tva_exempt,
        is_taxable:            form.is_taxable,
        is_final_consumer:     form.is_final_consumer,
        is_vat_registered:     form.is_vat_registered,
        capital_amount:        form.capital_amount,
        initial_balance:       form.initial_balance,
      });
      setSuccess(isEdit ? 'تم تعديل الزبون بنجاح' : 'تم إضافة الزبون بنجاح');
      setTimeout(() => { onSaved(); onClose(); }, 300);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'فشل الحفظ');
    }
  };

  const tabs = ['المعلومات الأساسية', 'الوثائق القانونية', 'المعلومات المالية', 'إعدادات إضافية'];

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

      {/* Tab headers */}
      <div style={{
        display: 'flex', gap: 4, borderBottom: '1px solid var(--b2)',
        marginBottom: 16, direction: 'rtl', flexWrap: 'wrap',
      }}>
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            style={{
              padding: '8px 16px', border: 'none', background: 'none',
              cursor: 'pointer', fontWeight: activeTab === idx ? 800 : 500,
              borderBottom: activeTab === idx ? '2px solid var(--em)' : '2px solid transparent',
              color: activeTab === idx ? 'var(--em)' : 'var(--t2)',
              transition: 'all .15s', fontFamily: 'inherit', fontSize: 13,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ minHeight: 440, overflowY: 'auto' }}>

        {/* ── تبويب 0: المعلومات الأساسية ── */}
        {activeTab === 0 && (
          <div className="fgrid c3">
            <div className="fg s2">
              <label className="req">الاسم الكامل / الشركة</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
            </div>
            <div className="fg">
              <label>الاسم التجاري</label>
              <input value={form.commercial_name || ''} onChange={e => set('commercial_name', e.target.value)} />
            </div>

            <div className="fg s3">
              <label>العنوان</label>
              <input value={form.address || ''} onChange={e => set('address', e.target.value)} />
            </div>

            {/* ✅ Wilaya: select عادي مُرتَّب برقم الولاية */}
            <div className="fg">
              <label>الولاية</label>
              <select
                value={form.wilaya_id ?? ''}
                onChange={handleWilayaChange}
              >
                <option value="">-- اختر الولاية --</option>
                {wilayas.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.arabic_name || w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Commune: تنشط بعد اختيار ولاية + تُظهر loading */}
            <div className="fg">
              <label>
                البلدية
                {loadingCommunes && selectedWilayaId && (
                  <i className="ti ti-loader-2" style={{
                    marginRight: 6, fontSize: 11,
                    animation: 'spin .7s linear infinite', color: 'var(--t4)',
                  }} />
                )}
              </label>
              <select
                value={form.commune_id ?? ''}
                onChange={e => set('commune_id', e.target.value ? parseInt(e.target.value) : null)}
                disabled={!selectedWilayaId || loadingCommunes}
              >
                <option value="">
                  {!selectedWilayaId
                    ? '— اختر الولاية أولاً —'
                    : loadingCommunes
                      ? 'جاري التحميل...'
                      : '-- اختر البلدية --'}
                </option>
                {communes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.arabic_name || c.name}
                    {c.post_code ? ` (${c.post_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label>رمز الزبون</label>
              <input
                value={form.code || ''}
                onChange={e => set('code', e.target.value)}
                placeholder="يُولد تلقائياً"
              />
            </div>

            <div className="fg">
              <label>الهاتف</label>
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="fg">
              <label>الجوال</label>
              <input value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} />
            </div>
            <div className="fg">
              <label>الفاكس</label>
              <input value={form.fax || ''} onChange={e => set('fax', e.target.value)} />
            </div>
            <div className="fg s2">
              <label>البريد الإلكتروني</label>
              <input value={form.email || ''} onChange={e => set('email', e.target.value)} type="email" />
            </div>
            <div className="fg" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label className="flex between" style={{ width: '100%' }}>
                نشط
                <Switch checked={form.active} onChange={v => set('active', v)} />
              </label>
            </div>
          </div>
        )}

        {/* ── تبويب 1: الوثائق القانونية ── */}
        {activeTab === 1 && (
          <div className="fgrid c3">
            <div className="fg s3">
              <label>النشاط</label>
              <input value={form.activity || ''} onChange={e => set('activity', e.target.value)} placeholder="مثال: تجارة التجزئة" />
            </div>
            <div className="fg s2">
              <label>الشكل القانوني</label>
              <select value={form.legal_form_id ?? ''} onChange={e => set('legal_form_id', e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">-- اختر --</option>
                {legalForms.map((lf: LegalForm) => <option key={lf.id} value={lf.id}>{lf.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>رأس المال (دج)</label>
              <input type="number" value={form.capital_amount} onChange={e => set('capital_amount', parseFloat(e.target.value) || 0)} min="0" />
            </div>
            <div className="fg">
              <label>تاريخ السجل التجاري</label>
              <input type="date" value={form.rc_date || ''} onChange={e => set('rc_date', e.target.value)} />
            </div>
            <div className="fg">
              <label>RC (السجل التجاري)</label>
              <input value={form.rc || ''} onChange={e => set('rc', e.target.value)} />
            </div>
            <div className="fg">
              <label>NIF</label>
              <input value={form.nif || ''} onChange={e => set('nif', e.target.value)} />
            </div>
            <div className="fg">
              <label>NIS</label>
              <input value={form.nis || ''} onChange={e => set('nis', e.target.value)} />
            </div>
            <div className="fg">
              <label>AI (رقم المادة)</label>
              <input value={form.ai || ''} onChange={e => set('ai', e.target.value)} />
            </div>
          </div>
        )}

        {/* ── تبويب 2: المعلومات المالية ── */}
        {activeTab === 2 && (
          <div className="fgrid c3">
            <div className="fg">
              <label>مستوى السعر الافتراضي</label>
              <select value={form.default_price_level_id ?? ''} onChange={e => set('default_price_level_id', e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">-- بدون --</option>
                {priceLevels.map((pl: PriceLevel) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>الحد الائتماني (دج)</label>
              <input type="number" value={form.credit_limit} onChange={e => set('credit_limit', parseFloat(e.target.value) || 0)} min="0" step="1000" />
            </div>
            <div className="fg">
              <label>أجل الدفع (يوم)</label>
              <input type="number" value={form.credit_days} onChange={e => set('credit_days', parseInt(e.target.value) || 0)} min="0" />
            </div>
            <div className="fg">
              <label>الرصيد الافتتاحي (دج)</label>
              <input type="number" value={form.initial_balance} onChange={e => set('initial_balance', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="fg s2">
              <label>اسم البنك</label>
              <input value={form.bank_name || ''} onChange={e => set('bank_name', e.target.value)} />
            </div>
            <div className="fg">
              <label>RIB</label>
              <input value={form.rib || ''} onChange={e => set('rib', e.target.value)} />
            </div>
          </div>
        )}

        {/* ── تبويب 3: إعدادات إضافية ── */}
        {activeTab === 3 && (
          <div className="fgrid c3">
            <div className="fg">
              <label>رقم CNAS</label>
              <input value={form.cnas_number || ''} onChange={e => set('cnas_number', e.target.value)} />
            </div>
            <div className="fg">
              <label>النظام الضريبي</label>
              <input value={form.tax_regime || ''} onChange={e => set('tax_regime', e.target.value)} placeholder="réel, forfaitaire..." />
            </div>
            <div className="fg">
              <label>تاريخ التسجيل في TVA</label>
              <input type="date" value={form.vat_registration_date || ''} onChange={e => set('vat_registration_date', e.target.value)} />
            </div>
            <div className="fg">
              <label className="flex between">
                معفى من TVA
                <Switch checked={form.is_tva_exempt} onChange={v => set('is_tva_exempt', v)} />
              </label>
            </div>
            <div className="fg">
              <label className="flex between">
                خاضع للضريبة
                <Switch checked={form.is_taxable} onChange={v => set('is_taxable', v)} />
              </label>
            </div>
            <div className="fg">
              <label className="flex between">
                مستهلك نهائي
                <Switch checked={form.is_final_consumer} onChange={v => set('is_final_consumer', v)} />
              </label>
            </div>
            <div className="fg">
              <label className="flex between">
                مسجل في TVA
                <Switch checked={form.is_vat_registered} onChange={v => set('is_vat_registered', v)} />
              </label>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
