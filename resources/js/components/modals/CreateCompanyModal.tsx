// ════════════════════════════════════════════════
// components/modals/CreateCompanyModal.tsx
// مودال إنشاء شركة متكامل بخطوتين:
//   الخطوة 1: معلومات الشركة (اسم إلزامي، باقي اختياري)
//   الخطوة 2: السنة المالية الأولى (إلزامية)
// ════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────
interface Company {
  id: number;
  name: string;
  slug: string;
  commercial_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
  activity?: string;
  is_active?: boolean;
  is_suspended?: boolean;
}

interface FiscalYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
}

interface CreateCompanyModalProps {
  onCreated: (company: Company, fiscalYear: FiscalYear) => void;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────
const currentYear = new Date().getFullYear();

// تحويل YYYY-MM-DD إلى تاريخ جميل
function fmtDate(date: string): string {
  const d = date.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['يناير','فبراير','مارس','أبريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
}

// ── InputField ────────────────────────────────────────────────────
function Field({
  label, icon, value, onChange, placeholder, type = 'text',
  required = false, hint, dir = 'rtl',
}: {
  label: string; icon: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; hint?: string; dir?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 700, color: 'var(--t3)',
        marginBottom: 5, letterSpacing: .3,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 12, color: 'var(--em)', opacity: .8 }} />
        {label}
        {required && <span style={{ color: 'var(--red)', fontSize: 13 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        dir={dir}
        style={{
          width: '100%', padding: '10px 13px',
          borderRadius: 10, outline: 'none',
          border: `1.5px solid ${focused ? 'var(--em)' : 'var(--b2)'}`,
          background: focused ? 'var(--bg1)' : 'var(--bg3)',
          color: 'var(--t1)', fontFamily: 'Tajawal, sans-serif',
          fontSize: 13, transition: 'all .15s',
          boxShadow: focused ? '0 0 0 3px var(--emb)' : 'none',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && (
        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 3, paddingRight: 2 }}>{hint}</div>
      )}
    </div>
  );
}

// ── SectionTitle ──────────────────────────────────────────────────
function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 11, fontWeight: 800, color: 'var(--t4)',
      textTransform: 'uppercase', letterSpacing: 1.2,
      marginBottom: 12, marginTop: 4,
      paddingBottom: 8, borderBottom: '1px solid var(--b1)',
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 13, color: 'var(--em)', opacity: .7 }} />
      {label}
    </div>
  );
}

// ── Step 1: Company Info ──────────────────────────────────────────
function StepCompany({
  onNext, onClose,
}: {
  onNext: (company: Company) => void;
  onClose: () => void;
}) {
  // بيانات أساسية (إلزامي: name فقط)
  const [name, setName]               = useState('');
  const [commercialName, setCommercialName] = useState('');
  const [activity, setActivity]       = useState('');
  const [phone, setPhone]             = useState('');
  const [mobile, setMobile]           = useState('');
  const [email, setEmail]             = useState('');
  const [address, setAddress]         = useState('');
  // وثائق قانونية
  const [nif, setNif]                 = useState('');
  const [nis, setNis]                 = useState('');
  const [rc, setRc]                   = useState('');
  const [ai, setAi]                   = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) { setError('اسم الشركة إلزامي'); return; }

    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, string> = { name: n };
      if (commercialName.trim()) payload.commercial_name = commercialName.trim();
      if (activity.trim())       payload.activity        = activity.trim();
      if (phone.trim())          payload.phone           = phone.trim();
      if (mobile.trim())         payload.mobile          = mobile.trim();
      if (email.trim())          payload.email           = email.trim();
      if (address.trim())        payload.address         = address.trim();
      if (nif.trim())            payload.nif             = nif.trim();
      if (nis.trim())            payload.nis             = nis.trim();
      if (rc.trim())             payload.rc              = rc.trim();
      if (ai.trim())             payload.ai              = ai.trim();

      const res = await apiClient.post('/companies', payload);
      const company: Company = res.data?.data ?? res.data;
      onNext(company);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.response?.data?.error ?? 'فشل إنشاء الشركة';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)',
        padding: '22px 24px 18px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-50, left:-50, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.06)' }} />
        <div style={{ position:'absolute', bottom:-30, right:10, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />
        <button
          onClick={onClose}
          style={{
            position:'absolute', top:14, left:16, width:30, height:30,
            borderRadius:'50%', border:'none', background:'rgba(255,255,255,.15)',
            color:'#fff', cursor:'pointer', fontSize:16, display:'flex',
            alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)',
          }}
        >×</button>

        <div style={{ position:'relative' }}>
          <div style={{
            width:46, height:46, borderRadius:13, background:'rgba(255,255,255,.2)',
            backdropFilter:'blur(8px)', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:22, marginBottom:10,
          }}>🏢</div>
          <div style={{ fontSize:17, fontWeight:900, color:'#fff', marginBottom:3 }}>إنشاء شركة جديدة</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.75)' }}>
            أدخل بيانات شركتك — حقل الاسم إلزامي فقط
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ display:'flex', gap:6, marginTop:14, position:'relative' }}>
          <div style={{ flex:1, height:3, borderRadius:3, background:'rgba(255,255,255,.9)' }} />
          <div style={{ flex:1, height:3, borderRadius:3, background:'rgba(255,255,255,.3)' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
          <span style={{ fontSize:9, color:'rgba(255,255,255,.9)', fontWeight:700 }}>معلومات الشركة</span>
          <span style={{ fontSize:9, color:'rgba(255,255,255,.5)' }}>السنة المالية</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'20px 22px', overflowY:'auto', maxHeight:'calc(85vh - 200px)' }}>

        {error && (
          <div style={{
            padding:'9px 13px', borderRadius:10, marginBottom:14,
            background:'var(--redb)', border:'1px solid var(--redbo)',
            color:'var(--red)', fontSize:12, display:'flex', alignItems:'center', gap:8,
          }}>
            <i className="ti ti-alert-circle" style={{ fontSize:14 }} />
            {error}
          </div>
        )}

        {/* ── المعلومات الأساسية */}
        <SectionTitle icon="ti-building" label="المعلومات الأساسية" />

        {/* اسم الشركة — مميز وإلزامي */}
        <div style={{ marginBottom: 14 }}>
          <label style={{
            display:'flex', alignItems:'center', gap:6,
            fontSize:12, fontWeight:800, color:'var(--t2)', marginBottom:6,
          }}>
            <i className="ti ti-building-store" style={{ color:'var(--em)', fontSize:13 }} />
            اسم الشركة
            <span style={{ color:'var(--red)', fontSize:14 }}>*</span>
            <span style={{
              fontSize:9, padding:'1px 8px', borderRadius:20,
              background:'var(--emb)', color:'var(--em)', fontWeight:700, marginRight:2,
            }}>إلزامي</span>
          </label>
          <input
            ref={nameRef}
            value={name}
            onChange={e => { setName(e.target.value); setError(null); }}
            placeholder="مثال: شركة الأمل للتجارة والخدمات"
            dir="rtl"
            style={{
              width:'100%', padding:'12px 14px',
              borderRadius:11, outline:'none',
              border:`2px solid ${name.trim() ? 'var(--em)' : 'var(--b2)'}`,
              background: name.trim() ? 'var(--emb)' : 'var(--bg3)',
              color:'var(--t1)', fontFamily:'Tajawal, sans-serif',
              fontSize:14, fontWeight:700, transition:'all .15s',
              boxShadow: name.trim() ? '0 0 0 3px var(--emb)' : 'none',
            }}
            onFocus={e => { e.target.style.borderColor='var(--em)'; e.target.style.background='var(--emb)'; }}
            onBlur={e => { if (!e.target.value.trim()) { e.target.style.borderColor='var(--b2)'; e.target.style.background='var(--bg3)'; }}}
          />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
          <Field label="الاسم التجاري" icon="ti-certificate" value={commercialName}
            onChange={setCommercialName} placeholder="الاسم التجاري (اختياري)" />
          <Field label="النشاط / القطاع" icon="ti-briefcase" value={activity}
            onChange={setActivity} placeholder="مثال: تجارة جملة" />
        </div>

        {/* ── معلومات التواصل */}
        <SectionTitle icon="ti-phone" label="معلومات التواصل" />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
          <Field label="الهاتف" icon="ti-phone" value={phone}
            onChange={setPhone} placeholder="023 xx xx xx" type="tel" dir="ltr" />
          <Field label="الجوال" icon="ti-device-mobile" value={mobile}
            onChange={setMobile} placeholder="06 xx xx xx xx" type="tel" dir="ltr" />
        </div>

        <Field label="البريد الإلكتروني" icon="ti-mail" value={email}
          onChange={setEmail} placeholder="contact@company.dz" type="email" dir="ltr" />

        <Field label="العنوان" icon="ti-map-pin" value={address}
          onChange={setAddress} placeholder="الشارع، البلدية، الولاية" />

        {/* ── الوثائق القانونية (قابلة للطي) */}
        <button
          onClick={() => setShowDocs(v => !v)}
          style={{
            width:'100%', padding:'9px 12px', borderRadius:10,
            border:'1px dashed var(--b3)', background:'transparent',
            color:'var(--t4)', fontSize:12, fontWeight:700,
            cursor:'pointer', fontFamily:'Tajawal, sans-serif',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom: showDocs ? 14 : 4, transition:'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.color='var(--t2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--t4)'; }}
        >
          <span style={{ display:'flex', alignItems:'center', gap:7 }}>
            <i className="ti ti-file-text" style={{ fontSize:13 }} />
            الوثائق القانونية والجبائية
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:10, background:'var(--bg4)', color:'var(--t4)' }}>
              اختياري
            </span>
          </span>
          <i className={`ti ti-chevron-${showDocs ? 'up' : 'down'}`} style={{ fontSize:12 }} />
        </button>

        {showDocs && (
          <div style={{
            background:'var(--bg3)', borderRadius:12,
            border:'1px solid var(--b1)', padding:'14px 14px 4px',
            marginBottom:14, animation:'slidedown .2s ease',
          }}>
            <SectionTitle icon="ti-license" label="الأرقام الجبائية" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
              <Field label="رقم NIF" icon="ti-hash" value={nif}
                onChange={setNif} placeholder="NIF" dir="ltr"
                hint="رقم التعريف الجبائي" />
              <Field label="رقم NIS" icon="ti-hash" value={nis}
                onChange={setNis} placeholder="NIS" dir="ltr"
                hint="رقم التعريف الإحصائي" />
              <Field label="رقم RC" icon="ti-building-community" value={rc}
                onChange={setRc} placeholder="السجل التجاري" dir="ltr" />
              <Field label="رقم AI" icon="ti-receipt-2" value={ai}
                onChange={setAi} placeholder="مقالة الضريبة" dir="ltr" />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 22px 20px', borderTop:'1px solid var(--b1)', display:'flex', gap:10 }}>
        <button
          onClick={onClose}
          style={{
            flex:1, padding:'11px', borderRadius:12,
            border:'1px solid var(--b3)', background:'var(--bg3)',
            color:'var(--t3)', fontSize:13, fontWeight:700,
            cursor:'pointer', fontFamily:'Tajawal, sans-serif', transition:'.13s',
          }}
        >
          إلغاء
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          style={{
            flex:2, padding:'11px', borderRadius:12,
            border:'none', background: name.trim() ? 'var(--em)' : 'var(--b2)',
            color: name.trim() ? '#fff' : 'var(--t4)',
            fontSize:13, fontWeight:800,
            cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
            fontFamily:'Tajawal, sans-serif',
            boxShadow: name.trim() ? 'var(--emglow)' : 'none',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            transition:'all .15s',
          }}
        >
          {loading ? (
            <>
              <span style={{
                display:'inline-block', width:14, height:14, borderRadius:'50%',
                border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff',
                animation:'spin .7s linear infinite',
              }} />
              جارٍ الإنشاء...
            </>
          ) : (
            <>
              <span>التالي: السنة المالية</span>
              <i className="ti ti-arrow-left" style={{ fontSize:14 }} />
            </>
          )}
        </button>
      </div>
    </>
  );
}

// ── Step 2: Fiscal Year ───────────────────────────────────────────
function StepFiscalYear({
  company,
  onDone,
  onBack,
}: {
  company: Company;
  onDone: (fy: FiscalYear) => void;
  onBack: () => void;
}) {
  const [yearNum, setYearNum]   = useState(String(currentYear));
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate]   = useState(`${currentYear}-12-31`);
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // تحديث التواريخ تلقائياً عند تغيير السنة
  useEffect(() => {
    const y = parseInt(yearNum);
    if (!isNaN(y) && y >= 2000 && y <= 2100 && !useCustom) {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    }
  }, [yearNum, useCustom]);

  const handleCreate = async () => {
    const y = parseInt(yearNum);
    if (isNaN(y) || y < 2000 || y > 2100) {
      setError('أدخل سنة صحيحة بين 2000 و 2100');
      return;
    }
    if (startDate >= endDate) {
      setError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post(`/${company.slug}/fiscal-years`, {
        name:       yearNum,
        start_date: startDate,
        end_date:   endDate,
        is_current: true,
      });
      const fy: FiscalYear = res.data?.data ?? res.data;
      onDone(fy);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'فشل إنشاء السنة المالية');
    } finally {
      setLoading(false);
    }
  };

  const validYear = !isNaN(parseInt(yearNum)) && parseInt(yearNum) >= 2000 && parseInt(yearNum) <= 2100;

  return (
    <>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)',
        padding: '22px 24px 18px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-50, left:-50, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.06)' }} />
        <div style={{ position:'absolute', bottom:-30, right:10, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />

        <button
          onClick={onBack}
          style={{
            position:'absolute', top:14, left:16, display:'flex', alignItems:'center', gap:4,
            padding:'4px 10px', borderRadius:20, border:'1px solid rgba(255,255,255,.25)',
            background:'rgba(255,255,255,.1)', color:'#fff', cursor:'pointer',
            fontSize:11, fontWeight:700, fontFamily:'Tajawal, sans-serif',
          }}
        >
          <i className="ti ti-arrow-right" style={{ fontSize:11 }} />
          رجوع
        </button>

        <div style={{ position:'relative' }}>
          <div style={{
            width:46, height:46, borderRadius:13, background:'rgba(255,255,255,.2)',
            backdropFilter:'blur(8px)', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:22, marginBottom:10,
          }}>🗓️</div>
          <div style={{ fontSize:17, fontWeight:900, color:'#fff', marginBottom:3 }}>السنة المالية الأولى</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.75)' }}>
            لـ <strong style={{ color:'#fff' }}>{company.name}</strong>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display:'flex', gap:6, marginTop:14, position:'relative' }}>
          <div style={{ flex:1, height:3, borderRadius:3, background:'rgba(255,255,255,.4)' }} />
          <div style={{ flex:1, height:3, borderRadius:3, background:'rgba(255,255,255,.9)' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
          <span style={{ fontSize:9, color:'rgba(255,255,255,.5)' }}>معلومات الشركة ✓</span>
          <span style={{ fontSize:9, color:'rgba(255,255,255,.9)', fontWeight:700 }}>السنة المالية</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'20px 22px' }}>

        {/* Notice */}
        <div style={{
          padding:'10px 14px', borderRadius:10, marginBottom:16,
          background:'var(--emb)', border:'1px solid var(--embo)',
          color:'var(--em)', fontSize:12, display:'flex', alignItems:'flex-start', gap:8,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize:15, marginTop:1, flexShrink:0 }} />
          <span>السنة المالية ضرورية للبدء بتسجيل الفواتير والحركات المالية. يمكنك إضافة سنوات أخرى لاحقاً.</span>
        </div>

        {error && (
          <div style={{
            padding:'9px 13px', borderRadius:10, marginBottom:14,
            background:'var(--redb)', border:'1px solid var(--redbo)',
            color:'var(--red)', fontSize:12, display:'flex', alignItems:'center', gap:8,
          }}>
            <i className="ti ti-alert-circle" />
            {error}
          </div>
        )}

        {/* السنة */}
        <div style={{ marginBottom:16 }}>
          <label style={{
            display:'flex', alignItems:'center', gap:5,
            fontSize:11, fontWeight:700, color:'var(--t3)', marginBottom:6,
          }}>
            <i className="ti ti-calendar" style={{ color:'var(--em)', fontSize:12 }} />
            السنة
            <span style={{ color:'var(--red)', fontSize:13 }}>*</span>
          </label>

          {/* Quick year picker */}
          <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <button
                key={y}
                onClick={() => { setYearNum(String(y)); setError(null); }}
                style={{
                  padding:'7px 16px', borderRadius:20, fontSize:13, fontWeight:800,
                  border:`2px solid ${yearNum === String(y) ? 'var(--em)' : 'var(--b2)'}`,
                  background: yearNum === String(y) ? 'var(--em)' : 'var(--bg3)',
                  color: yearNum === String(y) ? '#fff' : 'var(--t2)',
                  cursor:'pointer', fontFamily:'Tajawal, sans-serif', transition:'all .13s',
                  boxShadow: yearNum === String(y) ? 'var(--emglow)' : 'none',
                }}
              >
                {y}
                {y === currentYear && (
                  <span style={{ fontSize:8, marginRight:4, opacity:.8 }}>الحالية</span>
                )}
              </button>
            ))}
            <input
              type="number"
              value={yearNum}
              onChange={e => { setYearNum(e.target.value); setError(null); }}
              min={2000} max={2100}
              dir="ltr"
              style={{
                width:90, padding:'7px 10px', borderRadius:20,
                border:`2px solid ${![String(currentYear-1),String(currentYear),String(currentYear+1)].includes(yearNum) && validYear ? 'var(--em)' : 'var(--b2)'}`,
                background:'var(--bg3)', color:'var(--t1)',
                fontFamily:'Tajawal, sans-serif', fontSize:13, fontWeight:700,
                outline:'none', textAlign:'center',
              }}
              placeholder="أخرى"
              onFocus={e => e.target.style.borderColor='var(--em)'}
              onBlur={e => { if (!validYear) e.target.style.borderColor='var(--red)'; }}
            />
          </div>
        </div>

        {/* Toggle custom dates */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 14px', borderRadius:10,
          background:'var(--bg3)', border:'1px solid var(--b1)',
          marginBottom: useCustom ? 14 : 0, cursor:'pointer',
        }} onClick={() => setUseCustom(v => !v)}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--t2)', display:'flex', alignItems:'center', gap:7 }}>
            <i className="ti ti-calendar-event" style={{ color:'var(--em)', fontSize:13 }} />
            تواريخ مخصصة
          </span>
          <div style={{
            width:36, height:20, borderRadius:20, position:'relative',
            background: useCustom ? 'var(--em)' : 'var(--b3)', transition:'all .2s',
            boxShadow: useCustom ? 'var(--emglow)' : 'none',
          }}>
            <div style={{
              position:'absolute', top:2, width:16, height:16, borderRadius:'50%',
              background:'#fff', transition:'all .2s',
              left: useCustom ? 18 : 2, boxShadow:'0 1px 4px rgba(0,0,0,.2)',
            }} />
          </div>
        </div>

        {useCustom && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px', animation:'slidedown .2s ease' }}>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--t3)', marginBottom:5 }}>
                <i className="ti ti-calendar-plus" style={{ color:'var(--em)', fontSize:11, marginLeft:4 }} />
                تاريخ البداية
              </label>
              <input type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', borderRadius:10, outline:'none', border:'1.5px solid var(--b2)', background:'var(--bg3)', color:'var(--t1)', fontFamily:'Tajawal, sans-serif', fontSize:12 }}
                onFocus={e => e.target.style.borderColor='var(--em)'}
                onBlur={e => e.target.style.borderColor='var(--b2)'}
              />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--t3)', marginBottom:5 }}>
                <i className="ti ti-calendar-minus" style={{ color:'var(--em)', fontSize:11, marginLeft:4 }} />
                تاريخ النهاية
              </label>
              <input type="date" value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', borderRadius:10, outline:'none', border:'1.5px solid var(--b2)', background:'var(--bg3)', color:'var(--t1)', fontFamily:'Tajawal, sans-serif', fontSize:12 }}
                onFocus={e => e.target.style.borderColor='var(--em)'}
                onBlur={e => e.target.style.borderColor='var(--b2)'}
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {validYear && (
          <div style={{
            marginTop:14, padding:'12px 14px', borderRadius:12,
            background:'var(--bg3)', border:'1px solid var(--b1)',
            display:'flex', alignItems:'center', gap:12,
            animation:'fadeup .2s ease',
          }}>
            <div style={{
              width:42, height:42, borderRadius:11, flexShrink:0,
              background:'linear-gradient(135deg, var(--em), var(--em3))',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, boxShadow:'var(--emglow)',
            }}>📅</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--em)' }}>
                السنة المالية {yearNum}
                <span style={{
                  fontSize:9, marginRight:8, padding:'2px 8px', borderRadius:20,
                  background:'var(--em)', color:'#fff', fontWeight:700,
                }}>الحالية</span>
              </div>
              <div style={{ fontSize:11, color:'var(--t4)', marginTop:2 }}>
                {fmtDate(startDate)} — {fmtDate(endDate)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 22px 20px', borderTop:'1px solid var(--b1)', display:'flex', gap:10 }}>
        <button
          onClick={onBack}
          style={{
            flex:1, padding:'11px', borderRadius:12,
            border:'1px solid var(--b3)', background:'var(--bg3)',
            color:'var(--t3)', fontSize:13, fontWeight:700,
            cursor:'pointer', fontFamily:'Tajawal, sans-serif', transition:'.13s',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}
        >
          <i className="ti ti-arrow-right" style={{ fontSize:13 }} />
          رجوع
        </button>
        <button
          onClick={handleCreate}
          disabled={loading || !validYear}
          style={{
            flex:2, padding:'11px', borderRadius:12,
            border:'none', background: validYear ? 'var(--em)' : 'var(--b2)',
            color: validYear ? '#fff' : 'var(--t4)',
            fontSize:13, fontWeight:800,
            cursor: loading || !validYear ? 'not-allowed' : 'pointer',
            fontFamily:'Tajawal, sans-serif',
            boxShadow: validYear ? 'var(--emglow)' : 'none',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            transition:'all .15s',
          }}
        >
          {loading ? (
            <>
              <span style={{
                display:'inline-block', width:14, height:14, borderRadius:'50%',
                border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff',
                animation:'spin .7s linear infinite',
              }} />
              جارٍ الإنشاء...
            </>
          ) : (
            <>
              <i className="ti ti-check" style={{ fontSize:15 }} />
              إنشاء والدخول
            </>
          )}
        </button>
      </div>
    </>
  );
}

// ── Step 3: Success ───────────────────────────────────────────────
function StepSuccess({ company, fiscalYear }: { company: Company; fiscalYear: FiscalYear }) {
  return (
    <div style={{ padding:'40px 24px', textAlign:'center' }}>
      <div style={{
        width:72, height:72, borderRadius:20, margin:'0 auto 16px',
        background:'linear-gradient(135deg, var(--em), var(--em3))',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:32, boxShadow:'var(--emglow)', animation:'popIn .5s cubic-bezier(.34,1.6,.64,1)',
      }}>✓</div>
      <div style={{ fontSize:20, fontWeight:900, color:'var(--t1)', marginBottom:6 }}>
        تم إنشاء الشركة! 🎉
      </div>
      <div style={{ fontSize:13, color:'var(--t4)', marginBottom:20, lineHeight:1.7 }}>
        <strong style={{ color:'var(--em)' }}>{company.name}</strong>
        <br/>السنة المالية <strong style={{ color:'var(--t2)' }}>{fiscalYear.name}</strong> جاهزة
      </div>
      <div style={{
        padding:'10px 14px', borderRadius:12,
        background:'var(--emb)', border:'1px solid var(--embo)',
        color:'var(--em)', fontSize:12, fontWeight:700,
        display:'flex', alignItems:'center', gap:8,
      }}>
        <span style={{ display:'inline-block', animation:'spin .8s linear infinite', fontSize:16 }}>⟳</span>
        جارٍ تحويلك...
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────
export function CreateCompanyModal({ onCreated, onClose }: CreateCompanyModalProps) {
  type Step = 'company' | 'fiscal' | 'success';
  const [step, setStep] = useState<Step>('company');
  const [company, setCompany] = useState<Company | null>(null);
  const [fiscalYear, setFiscalYear] = useState<FiscalYear | null>(null);

  const handleCompanyCreated = useCallback((c: Company) => {
    setCompany(c);
    setStep('fiscal');
  }, []);

  const handleFiscalDone = useCallback((fy: FiscalYear) => {
    setFiscalYear(fy);
    setStep('success');
    // نستدعي onCreated فوراً — التأخير كان يسبب فقدان navigate state في SetupHub
    // StepSuccess تعرض رسالة النجاح لكن onCreated يُطلق الـ navigate فوراً
    if (company) onCreated(company, fy);
  }, [company, onCreated]);

  return (
    <>
      <style>{`
        @keyframes fadein  { from{opacity:0} to{opacity:1} }
        @keyframes slideup { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes slidedown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        @keyframes fadeup  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes popIn   { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position:'fixed', inset:0, zIndex:10010,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,.72)', backdropFilter:'blur(8px)',
          padding:16, animation:'fadein .18s ease',
        }}
        onClick={e => {
          if (e.target === e.currentTarget && step !== 'success') onClose();
        }}
      >
        {/* Modal */}
        <div style={{
          background:'var(--bg2)', borderRadius:20, width:'100%', maxWidth:520,
          border:'1px solid var(--b3)', boxShadow:'0 28px 72px rgba(0,0,0,.4)',
          overflow:'hidden', animation:'slideup .25s cubic-bezier(.34,1.4,.64,1)',
          direction:'rtl',
        }}>
          {step === 'company' && (
            <StepCompany onNext={handleCompanyCreated} onClose={onClose} />
          )}
          {step === 'fiscal' && company && (
            <StepFiscalYear
              company={company}
              onDone={handleFiscalDone}
              onBack={() => setStep('company')}
            />
          )}
          {step === 'success' && company && fiscalYear && (
            <StepSuccess company={company} fiscalYear={fiscalYear} />
          )}
        </div>
      </div>
    </>
  );
}

export default CreateCompanyModal;
