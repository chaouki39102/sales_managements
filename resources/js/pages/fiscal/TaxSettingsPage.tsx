import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import { Input, Select, FormField } from '@/components/ui/FormInputs';
import { useModal } from '@/hooks/useModal';
import { useTaxConfig, useTaxConfigHistory, useTaxManagementMutations, useDocumentTypes } from '@/lib/api/endpoints/taxManagement';
import type { TaxConfig, DocumentType, IfuDocumentSource, TvaRate, TimbreBaremeItem } from '@/lib/api/endpoints/taxManagement';

const BASE_OPTIONS = [
  { value: 'purchases', label: 'المشتريات' },
  { value: 'margin',    label: 'الهامش' },
  { value: 'revenue',   label: 'الإيرادات' },
];

const CATEGORIES: Array<{ key: IfuDocumentSource['category']; label: string }> = [
  { key: 'subsidized',  label: 'المواد المدعمة' },
  { key: 'other_goods', label: 'البضائع الأخرى' },
  { key: 'services',    label: 'الخدمات' },
];

function DocCodeChips({
  selected, allCodes, onChange,
}: {
  selected: string[];
  allCodes: string[];
  onChange: (codes: string[]) => void;
}) {
  const toggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter(c => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {allCodes.map(code => (
        <button key={code} type="button"
          className={`btn btn-xs ${selected.includes(code) ? 'btn-primary' : 'btn-default'}`}
          style={{ borderRadius: 20, padding: '3px 12px', fontSize: 11, cursor: 'pointer', border: '1px solid var(--b3)' }}
          onClick={() => toggle(code)}>
          {code}
        </button>
      ))}
    </div>
  );
}

function defaultDocSources(regime: string): IfuDocumentSource[] {
  if (regime !== 'forfaitaire') return [];
  return [
    { category: 'subsidized',  base: 'purchases', require_locked: false, document_codes: ['FA', 'BR'] },
    { category: 'other_goods', base: 'purchases', require_locked: false, document_codes: ['FA', 'BR'] },
    { category: 'services',    base: 'purchases', require_locked: false, document_codes: ['FA'] },
  ];
}

function parseDocSources(config?: TaxConfig): IfuDocumentSource[] {
  if (!config?.ifu_document_sources) return defaultDocSources(config?.regime ?? 'reel');
  return config.ifu_document_sources.map(s => ({
    category: s.category,
    base: s.base,
    require_locked: s.require_locked,
    document_codes: (s as any).document_codes ?? [],
  }));
}

function TaxConfigModal({ open, config, regime, onClose }: { open: boolean; config?: TaxConfig; regime: string; onClose: () => void }) {
  const mutations = useTaxManagementMutations();
  const { data: purchaseDocTypes } = useDocumentTypes('purchase');
  const { data: saleDocTypes } = useDocumentTypes('sale');
  const [form, setForm] = useState({
    g50_deadline_day: 20,
    ifu_rate_goods: 5,
    ifu_rate_services: 12,
    ifu_rate_auto: 0.5,
    ifu_rate_subsidized: null as number | null,
    ifu_minimum: 30000,
    ifu_minimum_auto: 10000,
    ifu_ca_threshold: 8000000,
    g12_previsionnel_deadline: '30/06',
    g12_definitif_deadline: '20/01',
    g12_tranche1_pct: 50,
    g12_tranche2_pct: 25,
    g12_tranche3_pct: 25,
    g12_tranche2_deadline: '15/09',
    g12_tranche3_deadline: '15/12',
    ifu_require_locked: false,
    ifu_period_type: 'annual',
    timbre_fiscal_electronic_exempt: true,
    tva_rates: [] as TvaRate[],
    timbre_bareme: [] as TimbreBaremeItem[],
    ifu_document_sources: [] as IfuDocumentSource[],
  });
  const [saving, setSaving] = useState(false);

  const allDocCodes = Array.from(new Set([
    ...(purchaseDocTypes ?? []).map((d: DocumentType) => d.code),
    ...(saleDocTypes ?? []).map((d: DocumentType) => d.code),
  ]));

  useEffect(() => {
    if (open && config) {
      setForm({
        g50_deadline_day: config.g50_deadline_day ?? 20,
        ifu_rate_goods: config.ifu_rate_goods ?? 5,
        ifu_rate_services: config.ifu_rate_services ?? 12,
        ifu_rate_auto: config.ifu_rate_auto ?? 0.5,
        ifu_rate_subsidized: config.ifu_rate_subsidized ?? null,
        ifu_minimum: config.ifu_minimum ?? 30000,
        ifu_minimum_auto: config.ifu_minimum_auto ?? 10000,
        ifu_ca_threshold: config.ifu_ca_threshold ?? 8000000,
        g12_previsionnel_deadline: config.g12_previsionnel_deadline ?? '30/06',
        g12_definitif_deadline: config.g12_definitif_deadline ?? '20/01',
        g12_tranche1_pct: config.g12_tranche1_pct ?? 50,
        g12_tranche2_pct: config.g12_tranche2_pct ?? 25,
        g12_tranche3_pct: config.g12_tranche3_pct ?? 25,
        g12_tranche2_deadline: config.g12_tranche2_deadline ?? '15/09',
        g12_tranche3_deadline: config.g12_tranche3_deadline ?? '15/12',
        ifu_require_locked: config.ifu_require_locked ?? false,
        ifu_period_type: config.ifu_period_type ?? 'annual',
        timbre_fiscal_electronic_exempt: config.timbre_fiscal_electronic_exempt ?? true,
        tva_rates: ((config.tva_rates ?? []) as any[]).map((r: any) => ({ rate: r.rate, label: r.label })),
        timbre_bareme: ((config.timbre_bareme ?? []) as any[]).map((b: any) => ({
          from_amount: b.from_amount ?? 0,
          to_amount: b.to_amount ?? null,
          rate: b.rate ?? 0,
          type: b.type ?? 'percent_per_100',
          amount: b.amount ?? null,
        })),
        ifu_document_sources: parseDocSources(config),
      });
    }
  }, [open, config]);

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(prev => ({ ...prev, [k]: v }));

  const setCategoryDocCodes = (cat: string, codes: string[]) => {
    setField('ifu_document_sources', form.ifu_document_sources.map(s =>
      s.category === cat ? { ...s, document_codes: codes } : s
    ));
  };

  const setCategoryBase = (cat: string, base: string) => {
    setField('ifu_document_sources', form.ifu_document_sources.map(s =>
      s.category === cat ? { ...s, base: base as IfuDocumentSource['base'] } : s
    ));
  };

  const setCategoryLocked = (cat: string, v: boolean) => {
    setField('ifu_document_sources', form.ifu_document_sources.map(s =>
      s.category === cat ? { ...s, require_locked: v } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        tva_rates: form.tva_rates,
        timbre_bareme: form.timbre_bareme,
        timbre_fiscal_electronic_exempt: form.timbre_fiscal_electronic_exempt,
        g50_deadline_day: Number(form.g50_deadline_day),
        ifu_rate_goods: Number(form.ifu_rate_goods) / 100,
        ifu_rate_services: Number(form.ifu_rate_services) / 100,
        ifu_rate_auto: Number(form.ifu_rate_auto) / 100,
        ifu_rate_subsidized: form.ifu_rate_subsidized ? Number(form.ifu_rate_subsidized) / 100 : null,
        ifu_minimum: Number(form.ifu_minimum),
        ifu_minimum_auto: Number(form.ifu_minimum_auto),
        ifu_ca_threshold: Number(form.ifu_ca_threshold),
        ifu_require_locked: form.ifu_require_locked,
        ifu_period_type: form.ifu_period_type,
        ifu_document_sources: form.ifu_document_sources,
        g12_previsionnel_deadline: form.g12_previsionnel_deadline,
        g12_definitif_deadline: form.g12_definitif_deadline,
        g12_tranche1_pct: Number(form.g12_tranche1_pct),
        g12_tranche2_pct: Number(form.g12_tranche2_pct),
        g12_tranche3_pct: Number(form.g12_tranche3_pct),
        g12_tranche2_deadline: form.g12_tranche2_deadline,
        g12_tranche3_deadline: form.g12_tranche3_deadline,
      };
      await mutations.updateConfig.mutateAsync({ regime, data: payload });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={regime === 'reel' ? 'إعدادات النظام الحقيقي (G50)' : 'إعدادات النظام الجزافي (IFU/G12)'}
      footer={<><Button onClick={onClose}>إلغاء</Button><Button variant="primary" loading={saving} onClick={handleSave}>حفظ</Button></>}>
      <div className="fgrid">
        {regime === 'reel' && (
          <>
            <FormField span={2}>
              <label className="req">نسب TVA</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {form.tva_rates.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Input style={{ width: 70 }} value={r.label} onChange={e => {
                      const arr = [...form.tva_rates]; arr[i] = { ...arr[i], label: e.target.value }; setField('tva_rates', arr);
                    }} />
                    <Input style={{ width: 60 }} value={r.rate * 100} onChange={e => {
                      const arr = [...form.tva_rates]; arr[i] = { ...arr[i], rate: Number(e.target.value) / 100 }; setField('tva_rates', arr);
                    }} suffix="%" />
                  </div>
                ))}
              </div>
            </FormField>

            <FormField span={2}>
              <label className="req">شريحة الطابع المالي (Barème)</label>
              <div className="tw" style={{ marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th>من (دج)</th>
                      <th>إلى (دج)</th>
                      <th>النوع</th>
                      <th>النسبة / المبلغ</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.timbre_bareme.map((b, i) => (
                      <tr key={i}>
                        <td><Input type="number" style={{ width: 90 }} value={b.from_amount ?? 0} onChange={e => { const arr = [...form.timbre_bareme]; arr[i] = { ...arr[i], from_amount: Number(e.target.value) }; setField('timbre_bareme', arr); }} /></td>
                        <td><Input type="number" style={{ width: 90 }} value={b.to_amount ?? ''} placeholder="∞" onChange={e => { const arr = [...form.timbre_bareme]; arr[i] = { ...arr[i], to_amount: e.target.value ? Number(e.target.value) : null }; setField('timbre_bareme', arr); }} /></td>
                        <td><Select style={{ width: 120 }} value={b.type ?? 'percent_per_100'} onChange={e => { const arr = [...form.timbre_bareme]; arr[i] = { ...arr[i], type: e.target.value }; setField('timbre_bareme', arr); }}><option value="fixed">مبلغ ثابت</option><option value="percent_per_100">نسبة/100 دج</option></Select></td>
                        <td><Input type="number" step="0.001" style={{ width: 80 }} value={b.type === 'fixed' ? (b.amount ?? 0) : (b.rate ?? 0)} onChange={e => { const arr = [...form.timbre_bareme]; if (arr[i].type === 'fixed') { arr[i] = { ...arr[i], amount: Number(e.target.value) } } else { arr[i] = { ...arr[i], rate: Number(e.target.value) } }; setField('timbre_bareme', arr); }} /></td>
                        <td><Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => { setField('timbre_bareme', form.timbre_bareme.filter((_, idx) => idx !== i)); }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button size="xs" icon={<i className="ti ti-plus" />} style={{ marginTop: 8 }} onClick={() => { setField('timbre_bareme', [...form.timbre_bareme, { from_amount: 0, to_amount: null, rate: 0, type: 'percent_per_100', amount: null }]); }}>إضافة شريحة</Button>
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="elec-exempt" checked={form.timbre_fiscal_electronic_exempt} onChange={e => setField('timbre_fiscal_electronic_exempt', e.target.checked)} />
                <label htmlFor="elec-exempt" style={{ cursor: 'pointer', fontSize: 13 }}>الدفع الإلكتروني معفى من الطابع المالي</label>
              </div>
            </FormField>
          </>
        )}

        <FormField>
          <label className="req">اليوم الموعد النهائي G50</label>
          <Input type="number" value={form.g50_deadline_day} onChange={e => setField('g50_deadline_day', Number(e.target.value))} />
        </FormField>

        {regime === 'forfaitaire' && (
          <>
            <FormField>
              <label className="req">نسبة IFU على السلع (%)</label>
              <Input type="number" step="0.01" value={form.ifu_rate_goods} onChange={e => setField('ifu_rate_goods', Number(e.target.value))} suffix="%" />
            </FormField>
            <FormField>
              <label className="req">نسبة IFU على الخدمات (%)</label>
              <Input type="number" step="0.01" value={form.ifu_rate_services} onChange={e => setField('ifu_rate_services', Number(e.target.value))} suffix="%" />
            </FormField>
            <FormField>
              <label className="req">نسبة IFU على السيارات (%)</label>
              <Input type="number" step="0.01" value={form.ifu_rate_auto} onChange={e => setField('ifu_rate_auto', Number(e.target.value))} suffix="%" />
            </FormField>
            <FormField>
              <label className="req">نسبة IFU على المواد المدعمة (%)</label>
              <Input type="number" step="0.01" value={form.ifu_rate_subsidized ?? ''} onChange={e => setField('ifu_rate_subsidized', e.target.value ? Number(e.target.value) : null)} suffix="%" placeholder="مثل 5" />
            </FormField>
            <FormField>
              <label className="req">الحد الأدنى IFU تجاري (دج)</label>
              <Input type="number" value={form.ifu_minimum} onChange={e => setField('ifu_minimum', Number(e.target.value))} />
            </FormField>
            <FormField>
              <label className="req">الحد الأدنى IFU مستقل (دج)</label>
              <Input type="number" value={form.ifu_minimum_auto} onChange={e => setField('ifu_minimum_auto', Number(e.target.value))} />
            </FormField>
            <FormField>
              <label className="req">عتبة رقم الأعمال (دج)</label>
              <Input type="number" value={form.ifu_ca_threshold} onChange={e => setField('ifu_ca_threshold', Number(e.target.value))} />
            </FormField>

            <FormField span={2}>
              <label>إعدادات عامة</label>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={form.ifu_require_locked} onChange={e => setField('ifu_require_locked', e.target.checked)} />
                  اشتراط إغلاق المستند قبل الاحتساب
                </label>
                <Select style={{ width: 130 }} value={form.ifu_period_type} onChange={e => setField('ifu_period_type', e.target.value as 'annual' | 'monthly')}>
                  <option value="annual">سنوي</option>
                  <option value="monthly">شهري</option>
                </Select>
              </div>
            </FormField>

            {CATEGORIES.map(cat => {
              const src = form.ifu_document_sources.find(s => s.category === cat.key) ?? {
                category: cat.key, base: 'purchases' as const, require_locked: false, document_codes: [],
              };
              return (
                <FormField span={2} key={cat.key}>
                  <div style={{ border: '1px solid var(--b3)', borderRadius: 8, padding: 16 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>{`إعدادات حساب IFU — ${cat.label}`}</h4>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 12, color: 'var(--t4)' }}>المستندات المصدر</label>
                      <DocCodeChips selected={src.document_codes} allCodes={allDocCodes} onChange={codes => setCategoryDocCodes(cat.key, codes)} />
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                      <Select style={{ width: 140 }} value={src.base} onChange={e => setCategoryBase(cat.key, e.target.value)}>
                        {BASE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <input type="checkbox" checked={src.require_locked} onChange={e => setCategoryLocked(cat.key, e.target.checked)} />
                        يشترط الإغلاق
                      </label>
                    </div>
                  </div>
                </FormField>
              );
            })}

            <FormField span={2}>
              <label className="req">آخر أجل G12 تقديري</label>
              <Input value={form.g12_previsionnel_deadline} onChange={e => setField('g12_previsionnel_deadline', e.target.value)} />
            </FormField>
            <FormField span={2}>
              <label className="req">آخر أجل G12 مكرر (نهائي)</label>
              <Input value={form.g12_definitif_deadline} onChange={e => setField('g12_definitif_deadline', e.target.value)} />
            </FormField>
            <FormField>
              <label className="req">القسط الأول (%)</label>
              <Input type="number" value={form.g12_tranche1_pct} onChange={e => setField('g12_tranche1_pct', Number(e.target.value))} suffix="%" />
            </FormField>
            <FormField>
              <label className="req">القسط الثاني (%)</label>
              <Input type="number" value={form.g12_tranche2_pct} onChange={e => setField('g12_tranche2_pct', Number(e.target.value))} suffix="%" />
            </FormField>
            <FormField>
              <label className="req">القسط الثالث (%)</label>
              <Input type="number" value={form.g12_tranche3_pct} onChange={e => setField('g12_tranche3_pct', Number(e.target.value))} suffix="%" />
            </FormField>
            <FormField>
              <label className="req">آخر أجل القسط الثاني</label>
              <Input value={form.g12_tranche2_deadline} onChange={e => setField('g12_tranche2_deadline', e.target.value)} />
            </FormField>
            <FormField>
              <label className="req">آخر أجل القسط الثالث</label>
              <Input value={form.g12_tranche3_deadline} onChange={e => setField('g12_tranche3_deadline', e.target.value)} />
            </FormField>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function TaxSettingsPage() {
  const [regime, setRegime] = useState<'forfaitaire' | 'reel'>('reel');
  const editModal = useModal();

  const { data: config, isLoading } = useTaxConfig(regime);
  const { data: history } = useTaxConfigHistory(regime);
  const mutations = useTaxManagementMutations();

  if (isLoading) return <Skeleton variant="card" rows={6} />;

  const getSource = (cat: string) =>
    (config?.ifu_document_sources ?? []).find(s => s.category === cat);

  return (
    <div className="page on" id="p-tax-settings">
      <PageHeader
        title="إعدادات الجباية"
        subtitle={regime === 'reel' ? 'النظام الحقيقي (G50)' : 'النظام الجزافي (IFU/G12)'}
        actions={
          <>
            <Button size="sm" variant={regime === 'reel' ? 'primary' : 'default'} onClick={() => setRegime('reel')}>النظام الحقيقي</Button>
            <Button size="sm" variant={regime === 'forfaitaire' ? 'primary' : 'default'} onClick={() => setRegime('forfaitaire')}>النظام الجزافي</Button>
            <Button size="sm" icon={<i className="ti ti-edit" />} onClick={editModal.openModal}>تعديل</Button>
          </>
        }
      />

      <div className="g2" style={{ marginBottom: 20 }}>
        <Card title="معدلات TVA" subtitle={regime === 'reel' ? 'نسب الضريبة على القيمة المضافة' : 'غير مطبقة في النظام الجزافي'}>
          {regime === 'reel' && config?.tva_rates && config.tva_rates.length > 0 ? (
            <table className="tw"><thead><tr><th>النسبة</th><th>الوصف</th></tr></thead>
              <tbody>{(config.tva_rates as any[]).map((r, i) => <tr key={i}><td>{r.rate}%</td><td>{r.label}</td></tr>)}</tbody>
            </table>
          ) : <p style={{ color: 'var(--t4)' }}>—</p>}
        </Card>

        <Card title="الطابع الجبائي" subtitle="التصميم التدريجي">
          {config?.timbre_bareme && (config.timbre_bareme as any[]).length > 0 ? (
            <table className="tw"><thead><tr><th>من</th><th>إلى</th><th>النوع</th><th>القيمة</th></tr></thead>
              <tbody>{(config.timbre_bareme as any[]).map((t, i) => (
                <tr key={i}>
                  <td>{Number(t.from_amount).toLocaleString('fr-DZ')} دج</td>
                  <td>{t.to_amount ? `${Number(t.to_amount).toLocaleString('fr-DZ')} دج` : '∞'}</td>
                  <td>{t.type}</td>
                  <td>{t.amount ?? `${t.rate}%`}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p style={{ color: 'var(--t4)' }}>—</p>}
        </Card>
      </div>

      {regime === 'forfaitaire' && (
        <>
          <div className="g2" style={{ marginBottom: 20 }}>
            <Card title="معدلات IFU" subtitle="الضريبة الجزافية الوحيدة">
              <div className="sr"><span className="sr-l">نسبة IFU على السلع</span><span className="sr-v">{config?.ifu_rate_goods ?? '—'}%</span></div>
              <div className="sr"><span className="sr-l">نسبة IFU على الخدمات</span><span className="sr-v">{config?.ifu_rate_services ?? '—'}%</span></div>
              <div className="sr"><span className="sr-l">نسبة IFU على السيارات</span><span className="sr-v">{config?.ifu_rate_auto ?? '—'}%</span></div>
              <div className="sr"><span className="sr-l">نسبة IFU على المواد المدعمة</span><span className="sr-v">{config?.ifu_rate_subsidized ?? config?.ifu_rate_goods ?? '—'}%</span></div>
              <div className="sr"><span className="sr-l">الحد الأدنى لـ IFU (تجاري)</span><span className="sr-v">{config?.ifu_minimum?.toLocaleString('fr-DZ') ?? '—'} دج</span></div>
              <div className="sr"><span className="sr-l">الحد الأدنى (مستقل)</span><span className="sr-v">{config?.ifu_minimum_auto?.toLocaleString('fr-DZ') ?? '10,000'} دج</span></div>
              <div className="sr"><span className="sr-l">عتبة رقم الأعمال</span><span className="sr-v">{config?.ifu_ca_threshold?.toLocaleString('fr-DZ') ?? '—'} دج</span></div>
            </Card>
            <Card title="مواعيد G12" subtitle="G12 تقديري / G12 مكرر نهائي">
              <div className="sr"><span className="sr-l">آخر أجل G12 تقديري</span><span className="sr-v">{config?.g12_previsionnel_deadline ?? '—'}</span></div>
              <div className="sr"><span className="sr-l">آخر أجل G12 مكرر (نهائي)</span><span className="sr-v">{config?.g12_definitif_deadline ?? '—'}</span></div>
            </Card>
          </div>

          <Card title="إعدادات حساب IFU" subtitle="مصادر البيانات وأساس الحساب لكل فئة" style={{ marginBottom: 20 }}>
            <table className="tw">
              <thead>
                <tr><th>الفئة</th><th>المستندات المصدر</th><th>أساس الحساب</th><th>اشتراط الإغلاق</th><th>التعريفة</th></tr>
              </thead>
              <tbody>
                {([
                  { cat: 'subsidized',  label: 'مواد مدعمة', rate: config?.ifu_rate_subsidized ?? config?.ifu_rate_goods ?? 5 },
                  { cat: 'other_goods', label: 'بضائع أخرى', rate: config?.ifu_rate_goods ?? 5 },
                  { cat: 'services',    label: 'خدمات',      rate: config?.ifu_rate_services ?? 12 },
                ] as const).map(({ cat, label, rate }) => {
                  const src = getSource(cat);
                  return (
                    <tr key={cat}>
                      <td>{label}</td>
                      <td>{(src?.document_codes ?? []).join('، ') || '—'}</td>
                      <td>{BASE_OPTIONS.find(o => o.value === (src?.base ?? 'purchases'))?.label ?? 'المشتريات'}</td>
                      <td>{src?.require_locked ? 'نعم' : 'لا'}</td>
                      <td>{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {regime === 'reel' && (
        <Card title="موعد G50" subtitle="آخر يوم لتقديم التصريح">
          <div className="sr"><span className="sr-l">اليوم من الشهر</span><span className="sr-v">{config?.g50_deadline_day ?? '20'}</span></div>
        </Card>
      )}

      {history && history.length > 0 && (
        <Card title="سجل التعديلات" subtitle={`آخر ${history.length} تغيير`}>
          <table className="tw"><thead><tr><th>الإصدار</th><th>التاريخ</th><th>الملاحظات</th></tr></thead>
            <tbody>{(history as any[]).map((h) => (
              <tr key={h.id}>
                <td className="m">{h.version}</td>
                <td>{h.updated_at ? new Date(h.updated_at).toLocaleDateString('ar-DZ') : '—'}</td>
                <td style={{ color: 'var(--t4)' }}>{h.change_notes ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      <TaxConfigModal open={editModal.open} config={config} regime={regime} onClose={editModal.closeModal} />
    </div>
  );
}
