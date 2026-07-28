// pages/setup/SetupWizard.tsx
// ════════════════════════════════════════════════
// معالج الإعداد الأولي للمؤسسة — 4 خطوات
// ════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import { apiPost, apiUpload } from '@/lib/api/core/client';

// ── Types ──────────────────────────────────────────
interface CompanyForm {
  name: string; legal_form: string; sector: string;
  address: string; wilaya_id: string; phone1: string;
  phone2: string; email: string; website: string;
}

interface TaxForm {
  nif: string; nis: string; ai: string;
  rc: string; bank: string; rib: string;
}

interface FiscalForm {
  name: string; start_date: string; end_date: string;
}

// ── Constants ──────────────────────────────────────
const LEGAL_FORMS = ['SARL', 'EURL', 'SPA', 'SNC', 'Entreprise individuelle', 'Auto-entrepreneur'];
const SECTORS = [
  'تجارة التجزئة', 'تجارة الجملة', 'الصناعة والتصنيع',
  'الخدمات', 'البناء والأشغال', 'الفلاحة', 'النقل', 'الصحة والصيدلة',
];
const BANKS = [
  'BNA', 'BEA', 'CPA', 'BADR', 'BDL', 'CNEP',
  'AGB', 'ABC', 'Société Générale Algérie', 'Al Salam Bank',
];
const WILAYAS = [
  { id:1,name:'أدرار' },{ id:2,name:'الشلف' },{ id:3,name:'الأغواط' },
  { id:4,name:'أم البواقي' },{ id:5,name:'باتنة' },{ id:6,name:'بجاية' },
  { id:7,name:'بسكرة' },{ id:8,name:'بشار' },{ id:9,name:'البليدة' },
  { id:10,name:'البويرة' },{ id:11,name:'تمنراست' },{ id:12,name:'تبسة' },
  { id:13,name:'تلمسان' },{ id:14,name:'تيارت' },{ id:15,name:'تيزي وزو' },
  { id:16,name:'الجزائر' },{ id:17,name:'الجلفة' },{ id:18,name:'جيجل' },
  { id:19,name:'سطيف' },{ id:20,name:'سعيدة' },{ id:21,name:'سكيكدة' },
  { id:22,name:'سيدي بلعباس' },{ id:23,name:'عنابة' },{ id:24,name:'قالمة' },
  { id:25,name:'قسنطينة' },{ id:26,name:'المدية' },{ id:27,name:'مستغانم' },
  { id:28,name:'المسيلة' },{ id:29,name:'معسكر' },{ id:30,name:'ورقلة' },
  { id:31,name:'وهران' },{ id:32,name:'البيض' },{ id:33,name:'إليزي' },
  { id:34,name:'برج بوعريريج' },{ id:35,name:'بومرداس' },{ id:36,name:'الطارف' },
  { id:37,name:'تندوف' },{ id:38,name:'تيسمسيلت' },{ id:39,name:'الوادي' },
  { id:40,name:'خنشلة' },{ id:41,name:'سوق أهراس' },{ id:42,name:'تيبازة' },
  { id:43,name:'ميلة' },{ id:44,name:'عين الدفلى' },{ id:45,name:'النعامة' },
  { id:46,name:'عين تموشنت' },{ id:47,name:'غرداية' },{ id:48,name:'غليزان' },
  { id:49,name:'تيميمون' },{ id:50,name:'برج باجي مختار' },{ id:51,name:'أولاد جلال' },
  { id:52,name:'بني عباس' },{ id:53,name:'عين صالح' },{ id:54,name:'عين قزام' },
  { id:55,name:'توقرت' },{ id:56,name:'جانت' },{ id:57,name:'المغير' },{ id:58,name:'المنيعة' },
];

const currentYear = new Date().getFullYear();

// ── Step indicator ────────────────────────────────
function StepBar({ step, total }: { step: number; total: number }) {
  const labels = ['معلومات المؤسسة', 'المعرّفات الجبائية', 'الشعار', 'السنة المالية'];
  const icons  = ['ti-building', 'ti-id-badge', 'ti-photo', 'ti-calendar'];

  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:0, marginBottom:36, position:'relative' }}>
      {/* connector bg */}
      <div style={{ position:'absolute', top:20, left:'10%', right:'10%', height:2, background:'var(--b2)', zIndex:0 }} />
      {/* connector fill */}
      <div style={{ position:'absolute', top:20, left:'10%', height:2, zIndex:1, width:`${((step-1)/(total-1))*80}%`, background:'var(--em)', transition:'width .5s ease' }} />

      {Array.from({ length: total }, (_, i) => {
        const done   = i + 1 < step;
        const active = i + 1 === step;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8, position:'relative', zIndex:2 }}>
            <div style={{
              width:40, height:40, borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:16, transition:'all .3s',
              background: done || active ? 'var(--em)' : 'var(--bg2)',
              border: `2px solid ${done || active ? 'var(--em)' : 'var(--b3)'}`,
              color: done || active ? '#fff' : 'var(--t4)',
              boxShadow: active ? 'var(--emglow)' : 'none',
            }}>
              {done
                ? <i className="ti ti-check" style={{ fontSize:16 }} />
                : <i className={`ti ${icons[i]}`} style={{ fontSize:16 }} />
              }
            </div>
            <span style={{ fontSize:11, fontWeight: active ? 700 : 400, whiteSpace:'nowrap', color: active ? 'var(--em)' : done ? 'var(--t2)' : 'var(--t4)' }}>
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Field helper ──────────────────────────────────
function Field({ label, required, hint, children, span = 1 }: {
  label: string; required?: boolean; hint?: string;
  children: React.ReactNode; span?: number;
}) {
  return (
    <div className="fg" style={{ gridColumn: `span ${span}` }}>
      <label style={{ display:'flex', gap:4, alignItems:'center', marginBottom:6, fontSize:12, fontWeight:600, color:'var(--t2)' }}>
        {label}
        {required && <span style={{ color:'var(--red)', fontSize:14 }}>*</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize:10, color:'var(--t4)', marginTop:3, display:'block' }}>{hint}</span>}
    </div>
  );
}

// ── Nav buttons ───────────────────────────────────
function NavBtns({ step, total, onPrev, onNext, onFinish, loading, canNext }: {
  step:number; total:number; onPrev:()=>void; onNext:()=>void; onFinish:()=>void;
  loading?:boolean; canNext?:boolean;
}) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:28, paddingTop:20, borderTop:'1px solid var(--b2)' }}>
      <button className="btn" onClick={onPrev} disabled={step===1} style={{ opacity:step===1 ? 0.3 : 1 }}>
        <i className="ti ti-arrow-right" /> السابق
      </button>
      <span style={{ fontSize:12, color:'var(--t4)' }}>{step} / {total}</span>
      {step < total ? (
        <button className="btn btn-p" onClick={onNext} disabled={canNext === false}>
          التالي <i className="ti ti-arrow-left" />
        </button>
      ) : (
        <button className="btn btn-p" onClick={onFinish} disabled={loading} style={{ minWidth:140 }}>
          {loading
            ? <><i className="ti ti-loader" style={{ animation:'spin 1s linear infinite' }} /> جاري الحفظ...</>
            : <><i className="ti ti-check" /> إنهاء الإعداد</>
          }
        </button>
      )}
    </div>
  );
}

// ════ STEP 1 — معلومات المؤسسة ════════════════════
function Step1({ form, onChange }: { form: CompanyForm; onChange: (k: keyof CompanyForm, v: string) => void }) {
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>معلومات المؤسسة</h3>
        <p style={{ fontSize:13, color:'var(--t3)' }}>أدخل البيانات الرسمية للمؤسسة كما هي مسجلة قانونياً</p>
      </div>
      <div className="fgrid c3" style={{ gap:14 }}>
        <Field label="اسم المؤسسة / الشركة" required span={3}>
          <input value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="مثال: مؤسسة النور للتجارة العامة" autoFocus />
        </Field>
        <Field label="الشكل القانوني" required>
          <select value={form.legal_form} onChange={e => onChange('legal_form', e.target.value)}>
            <option value="">— اختر —</option>
            {LEGAL_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="قطاع النشاط" required span={2}>
          <select value={form.sector} onChange={e => onChange('sector', e.target.value)}>
            <option value="">— اختر —</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="العنوان الكامل" required span={2}>
          <input value={form.address} onChange={e => onChange('address', e.target.value)} placeholder="الحي، الشارع، الرمز البريدي" />
        </Field>
        <Field label="الولاية" required>
          <select value={form.wilaya_id} onChange={e => onChange('wilaya_id', e.target.value)}>
            <option value="">— اختر الولاية —</option>
            {WILAYAS.map(w => (
              <option key={w.id} value={String(w.id)}>
                {String(w.id).padStart(2,'0')} — {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الهاتف الرئيسي" required>
          <input value={form.phone1} onChange={e => onChange('phone1', e.target.value)} placeholder="029 XX XX XX" dir="ltr" />
        </Field>
        <Field label="الهاتف الثاني" hint="اختياري">
          <input value={form.phone2} onChange={e => onChange('phone2', e.target.value)} placeholder="055 XX XX XX" dir="ltr" />
        </Field>
        <Field label="البريد الإلكتروني">
          <input type="email" value={form.email} onChange={e => onChange('email', e.target.value)} placeholder="info@company.dz" dir="ltr" />
        </Field>
      </div>
    </div>
  );
}

// ════ STEP 2 — المعرّفات الجبائية ═══════════════
function Step2({ form, onChange }: { form: TaxForm; onChange: (k: keyof TaxForm, v: string) => void }) {
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>المعرّفات الجبائية والتجارية</h3>
        <p style={{ fontSize:13, color:'var(--t3)' }}>هذه المعلومات إلزامية وتظهر على جميع الوثائق التجارية</p>
      </div>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start', background:'var(--blueb)', border:'1px solid var(--bluebo)', borderRadius:'var(--r2)', padding:'10px 14px', marginBottom:20 }}>
        <i className="ti ti-info-circle" style={{ color:'var(--blue)', fontSize:16, marginTop:1 }} />
        <span style={{ fontSize:12, color:'var(--t2)', lineHeight:1.6 }}>
          تأكد من صحة هذه الأرقام — تُستخدم في الفواتير الرسمية وتقارير TVA
        </span>
      </div>
      <div className="fgrid c3" style={{ gap:14 }}>
        <Field label="NIF — رقم التعريف الجبائي" hint="15 خانة رقمية" required>
          <input value={form.nif} onChange={e => onChange('nif', e.target.value)} maxLength={15} placeholder="001234567890123" style={{ fontFamily:'monospace', letterSpacing:1 }} dir="ltr" />
        </Field>
        <Field label="NIS — الرقم الإحصائي" hint="مركز الإحصاء الوطني" required>
          <input value={form.nis} onChange={e => onChange('nis', e.target.value)} maxLength={15} placeholder="245103002000012" style={{ fontFamily:'monospace', letterSpacing:1 }} dir="ltr" />
        </Field>
        <Field label="AI — رقم المادة الجبائية" hint="مديرية الضرائب">
          <input value={form.ai} onChange={e => onChange('ai', e.target.value)} placeholder="29202400012" style={{ fontFamily:'monospace', letterSpacing:1 }} dir="ltr" />
        </Field>
        <Field label="RC — السجل التجاري" hint="المركز الوطني CNRC" required span={2}>
          <input value={form.rc} onChange={e => onChange('rc', e.target.value)} placeholder="29/00-0012345B05" style={{ fontFamily:'monospace', letterSpacing:1 }} dir="ltr" />
        </Field>
        <div style={{ gridColumn:'span 3', borderTop:'1px dashed var(--b2)', paddingTop:16, marginTop:4 }} />
        <Field label="البنك الرئيسي" hint="اختياري">
          <select value={form.bank} onChange={e => onChange('bank', e.target.value)}>
            <option value="">— اختر البنك —</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="رقم الحساب البنكي RIB / IBAN" hint="اختياري" span={2}>
          <input value={form.rib} onChange={e => onChange('rib', e.target.value)} placeholder="00799999000XXXXXXXX00" style={{ fontFamily:'monospace', letterSpacing:1 }} dir="ltr" />
        </Field>
      </div>
    </div>
  );
}

// ════ STEP 3 — الشعار ════════════════════════════
function Step3({ _logo, onLogo, companyName }: { _logo: File | null; onLogo: (f: File | null) => void; companyName: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    onLogo(file);
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>الشعار والهوية البصرية</h3>
        <p style={{ fontSize:13, color:'var(--t3)' }}>يظهر على الفواتير والوثائق — يمكن تعديله لاحقاً من الإعدادات</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => document.getElementById('logo-upload-wiz')?.click()}
            style={{
              border: `2px dashed ${dragging || preview ? 'var(--em)' : 'var(--b3)'}`,
              borderRadius:'var(--r3)', padding:32, textAlign:'center', cursor:'pointer',
              background: dragging ? 'var(--emb)' : 'var(--bg3)', transition:'all .2s',
              minHeight:180, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
            }}
          >
            {preview ? (
              <>
                <img src={preview} alt="logo" style={{ maxHeight:100, maxWidth:'100%', objectFit:'contain', borderRadius:8 }} />
                <span style={{ fontSize:12, color:'var(--em)' }}><i className="ti ti-check" /> تم رفع الشعار</span>
              </>
            ) : (
              <>
                <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--emb)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="ti ti-photo" style={{ fontSize:24, color:'var(--em)' }} />
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--t2)' }}>اسحب الشعار هنا أو اضغط للاختيار</div>
                <div style={{ fontSize:11, color:'var(--t4)' }}>PNG, SVG, JPG — 400×400 بكسل</div>
              </>
            )}
          </div>
          <input id="logo-upload-wiz" type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {preview && (
            <button className="btn" style={{ marginTop:8, width:'100%', color:'var(--red)' }} onClick={() => { onLogo(null); setPreview(null); }}>
              <i className="ti ti-trash" /> إزالة الشعار
            </button>
          )}
          <p style={{ fontSize:11, color:'var(--t4)', textAlign:'center', marginTop:10 }}>يمكنك تخطي هذه الخطوة وإضافة الشعار لاحقاً</p>
        </div>
        {/* Preview */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--t3)', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>معاينة رأس الفاتورة</div>
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:20, fontFamily:'serif', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center', borderBottom:'2px solid #0a9268', paddingBottom:14, marginBottom:12 }}>
              {preview && <img src={preview} alt="" style={{ height:48, width:48, objectFit:'contain', borderRadius:6 }} />}
              <div>
                <div style={{ fontWeight:900, fontSize:15, color:'#0a8a5c' }}>{companyName || 'اسم المؤسسة'}</div>
                <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>Entreprise Algérienne</div>
              </div>
            </div>
            <div style={{ fontSize:10, color:'#64748b', lineHeight:1.8, fontFamily:'monospace' }}>
              <div>NIF: 001234567890123</div>
              <div>RC: 29/00-0012345B05</div>
            </div>
            <div style={{ marginTop:14, borderTop:'1px dashed #e2e8f0', paddingTop:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:700 }}>
                <span>فاتورة بيع</span>
                <span style={{ fontFamily:'monospace', color:'#0a9268' }}>FAC-{currentYear}-000001</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════ STEP 4 — السنة المالية ══════════════════════
function Step4({ form, onChange }: { form: FiscalForm; onChange: (k: keyof FiscalForm, v: string) => void }) {
  const duration = form.start_date && form.end_date ? (() => {
    const months = Math.round((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000*60*60*24*30));
    return `${months} شهراً تقريباً`;
  })() : '—';

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>السنة المالية الأولى</h3>
        <p style={{ fontSize:13, color:'var(--t3)' }}>تُعيَّن كسنة مالية نشطة تلقائياً — لا يمكن حذف الأولى</p>
      </div>
      <div style={{ background:'var(--goldb)', border:'1px solid var(--goldbo)', borderRadius:'var(--r2)', padding:'12px 16px', marginBottom:24, display:'flex', gap:12, alignItems:'flex-start' }}>
        <i className="ti ti-calendar-event" style={{ color:'var(--gold)', fontSize:18, marginTop:1 }} />
        <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.7 }}>
          <strong>معلومة:</strong> السنة المالية في الجزائر تبدأ عادةً في <strong>01 يناير</strong> وتنتهي في <strong>31 ديسمبر</strong>.
        </div>
      </div>
      <div className="fgrid c3" style={{ gap:14 }}>
        <Field label="اسم السنة المالية" required span={3}>
          <input value={form.name} onChange={e => onChange('name', e.target.value)} placeholder={`السنة المالية ${currentYear}`} style={{ maxWidth:320 }} />
        </Field>
        <Field label="تاريخ البداية" required>
          <input type="date" value={form.start_date} onChange={e => onChange('start_date', e.target.value)} />
        </Field>
        <Field label="تاريخ النهاية" required>
          <input type="date" value={form.end_date} onChange={e => onChange('end_date', e.target.value)} min={form.start_date} />
        </Field>
        <Field label="المدة">
          <div style={{ padding:'9px 12px', background:'var(--bg3)', border:'1px solid var(--b2)', borderRadius:'var(--r1)', fontSize:13, color:'var(--t3)' }}>
            {duration}
          </div>
        </Field>
      </div>
      {form.name && form.start_date && form.end_date && (
        <div style={{ marginTop:24, padding:'14px 18px', background:'var(--emb)', border:'1px solid var(--embo)', borderRadius:'var(--r2)', display:'flex', alignItems:'center', gap:12 }}>
          <i className="ti ti-circle-check" style={{ color:'var(--em)', fontSize:20 }} />
          <div style={{ fontSize:13, color:'var(--t1)' }}>
            سيتم إنشاء <strong>&ldquo;{form.name}&rdquo;</strong> من{' '}
            <strong>{new Date(form.start_date).toLocaleDateString('ar-DZ')}</strong> إلى{' '}
            <strong>{new Date(form.end_date).toLocaleDateString('ar-DZ')}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// MAIN WIZARD
// ════════════════════════════════════════════════
export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const [company, setCompany] = useState<CompanyForm>({
    name:'', legal_form:'EURL', sector:'', address:'',
    wilaya_id:'', phone1:'', phone2:'', email:'', website:'',
  });
  const [tax, setTax] = useState<TaxForm>({ nif:'', nis:'', ai:'', rc:'', bank:'', rib:'' });
  const [logo, setLogo] = useState<File | null>(null);
  const [fiscal, setFiscal] = useState<FiscalForm>({
    name: `السنة المالية ${currentYear}`,
    start_date: `${currentYear}-01-01`,
    end_date:   `${currentYear}-12-31`,
  });

  const setC = useCallback((k: keyof CompanyForm, v: string) => setCompany(f => ({ ...f, [k]: v })), []);
  const setT = useCallback((k: keyof TaxForm, v: string)     => setTax(f => ({ ...f, [k]: v })),     []);
  const setF = useCallback((k: keyof FiscalForm, v: string)  => setFiscal(f => ({ ...f, [k]: v })),  []);

  const canNext = (() => {
    if (step === 1) return !!(company.name && company.legal_form && company.sector && company.address && company.wilaya_id && company.phone1);
    if (step === 2) return !!(tax.nif && tax.nis && tax.rc);
    if (step === 3) return true; // شعار اختياري
    if (step === 4) return !!(fiscal.name && fiscal.start_date && fiscal.end_date);
    return true;
  })();

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      // 1. حفظ إعدادات الشركة
      const settings = [
        { key:'company.name',       group:'company', value:company.name },
        { key:'company.legal_form', group:'company', value:company.legal_form },
        { key:'company.sector',     group:'company', value:company.sector },
        { key:'company.address',    group:'company', value:company.address },
        { key:'company.wilaya_id',  group:'company', value:company.wilaya_id },
        { key:'company.phone1',     group:'company', value:company.phone1 },
        { key:'company.phone2',     group:'company', value:company.phone2 },
        { key:'company.email',      group:'company', value:company.email },
        { key:'company.website',    group:'company', value:company.website },
        { key:'company.nif',        group:'company', value:tax.nif },
        { key:'company.nis',        group:'company', value:tax.nis },
        { key:'company.ai',         group:'company', value:tax.ai },
        { key:'company.rc',         group:'company', value:tax.rc },
        { key:'company.bank',       group:'company', value:tax.bank },
        { key:'company.rib',        group:'company', value:tax.rib },
      ];

      // نحفظ الإعدادات بشكل تسلسلي لتجنب race conditions
      for (const s of settings.filter(x => x.value)) {
        await apiPost('/settings', s);
      }

      // 2. رفع الشعار (اختياري — لا يوقف الإعداد)
      if (logo) {
        try {
          const fd = new FormData();
          fd.append('file', logo);
          fd.append('type', 'company_logo');
          await apiUpload('/attachments', fd);
        } catch { /* تجاهل خطأ الشعار */ }
      }

      // 3. إنشاء السنة المالية
      await apiPost('/fiscal-years', {
        name:       fiscal.name,
        start_date: fiscal.start_date,
        end_date:   fiscal.end_date,
      });

      // 4. الانتهاء
      onComplete();

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ. تحقق من الاتصال وأعد المحاولة.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg0)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px' }}>
      <div style={{ width:'100%', maxWidth:780 }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'var(--emb)', border:'1px solid var(--embo)', borderRadius:'var(--r4)', padding:'6px 18px', marginBottom:16 }}>
            <i className="ti ti-settings-2" style={{ color:'var(--em)', fontSize:16 }} />
            <span style={{ fontSize:12, fontWeight:700, color:'var(--em)', letterSpacing:0.5 }}>إعداد النظام</span>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'var(--t1)', marginBottom:8 }}>
            مرحباً بك في نظام إدارة المبيعات
          </h1>
          <p style={{ fontSize:14, color:'var(--t3)', maxWidth:460, margin:'0 auto' }}>
            سنقوم معاً بإعداد النظام في دقائق قليلة — يمكنك تعديل أي معلومة لاحقاً
          </p>
        </div>

        {/* Card */}
        <div style={{ background:'var(--bg2)', borderRadius:'var(--r4)', border:'1px solid var(--b2)', padding:'32px 36px', boxShadow:'var(--shadow2)' }}>
          <StepBar step={step} total={4} />

          <div style={{ minHeight:360 }}>
            {step === 1 && <Step1 form={company} onChange={setC} />}
            {step === 2 && <Step2 form={tax}     onChange={setT} />}
            {step === 3 && <Step3 logo={logo} onLogo={setLogo} companyName={company.name} />}
            {step === 4 && <Step4 form={fiscal}  onChange={setF} />}
          </div>

          {error && (
            <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:16, padding:'10px 14px', background:'var(--redb)', border:'1px solid var(--redbo)', borderRadius:'var(--r2)' }}>
              <i className="ti ti-alert-circle" style={{ color:'var(--red)', fontSize:16 }} />
              <span style={{ fontSize:13, color:'var(--red)' }}>{error}</span>
            </div>
          )}

          <NavBtns
            step={step} total={4}
            onPrev={() => setStep(s => Math.max(1, s-1))}
            onNext={() => { if (canNext) setStep(s => Math.min(4, s+1)); }}
            onFinish={handleFinish}
            loading={saving}
            canNext={canNext}
          />
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'var(--t4)', marginTop:20 }}>
          <i className="ti ti-lock" style={{ fontSize:12 }} /> بياناتك محفوظة محلياً وآمنة
        </p>
      </div>


    </div>
  );
}
