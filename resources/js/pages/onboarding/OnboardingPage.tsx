// ════════════════════════════════════════════════
// pages/onboarding/OnboardingPage.tsx  — النسخة المحدّثة
// ════════════════════════════════════════════════
// التغييرات الرئيسية:
//   1. استبدال CreateCompanyModal البسيط بالمودال الشامل (CreateCompanyModal.tsx)
//   2. المودال يُنشئ الشركة + السنة المالية في خطوتين
//   3. بعد الإنشاء: switch مباشرة + حفظ السنة + navigate
//   4. إصلاح مشكلة "جارٍ تحميل بيانات السنة المالية":
//      - بعد الإنشاء من المودال الجديد نحفظ السنة فوراً في sessionStorage
//        قبل navigate ← يجد FiscalYearContext السنة دون انتظار
// ════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
// ✅ المودال الجديد الشامل
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal';

// ── Types ──────────────────────────────────────
interface Company {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean;
  is_suspended?: boolean;
  owner?: { id: number; name: string };
  users_count?: number;
}

interface FiscalYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
}

// ── Helpers ────────────────────────────────────
function fmtDate(date: string): string {
  const d = String(date).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
  if (!d) return '—';
  const [y, m] = d.split('-');
  const months = ['يناير','فبراير','مارس','أبريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── FiscalYearModal (للشركات القائمة التي لديها سنوات) ──────────
// يُعطى slug الشركة — يجلب السنوات من /{slug}/fiscal-years
function FiscalYearModal({
  company,
  onConfirm,
  onClose,
}: {
  company: Company;
  onConfirm: (yearId: number | null) => void;
  onClose: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const [years, setYears]       = useState<FiscalYear[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newYearName, setNewYearName] = useState(String(currentYear));
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchYears = () => {
    setLoading(true);
    setError(null);
    apiClient
      .get(`/${company.slug}/fiscal-years`, { params: { per_page: 50 } })
      .then(r => {
        const data: FiscalYear[] = r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
        setYears(data);
        const current = data.find(y => y.is_current) ?? data.find(y => !y.is_closed) ?? data[0] ?? null;
        if (current) setSelected(current.id);
      })
      .catch(e => setError(e?.response?.data?.message ?? 'تعذّر جلب السنوات المالية'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchYears(); }, [company.slug]);

  const canProceed = selected !== null;

  const handleCreateYear = async () => {
    const name = newYearName.trim();
    const year = parseInt(name);
    if (isNaN(year) || year < 2000 || year > 2100) {
      setCreateError('أدخل سنة صحيحة (مثال: 2025)');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await apiClient.post(`/${company.slug}/fiscal-years`, {
        name,
        start_date: `${year}-01-01`,
        end_date:   `${year}-12-31`,
        is_current: true,
      });
      fetchYears();
    } catch (e: any) {
      setCreateError(e?.response?.data?.message ?? 'فشل إنشاء السنة المالية');
    } finally {
      setCreating(false);
    }
  };

  const openYears   = years.filter(y => !y.is_closed);
  const closedYears = years.filter(y => y.is_closed);

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:10002,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)',
        padding:16, animation:'fadein .2s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background:'var(--bg2)', borderRadius:20, width:'100%', maxWidth:460,
        border:'1px solid var(--b3)', boxShadow:'0 24px 64px rgba(0,0,0,.35)',
        overflow:'hidden', animation:'slideup .25s cubic-bezier(.34,1.4,.64,1)',
        direction:'rtl',
      }}>
        {/* Header */}
        <div style={{
          padding:'20px 24px 16px',
          background:'linear-gradient(135deg, var(--em), var(--em3))',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:-40, left:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.07)' }} />
          <div style={{ position:'relative' }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:'rgba(255,255,255,.2)', backdropFilter:'blur(8px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22, marginBottom:10,
            }}>🗓️</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:3 }}>اختر السنة المالية</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.75)' }}>
              للدخول إلى <strong style={{ color:'#fff' }}>{company.name}</strong>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'16px 20px 8px', maxHeight:360, overflowY:'auto' }}>
          {loading && (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--t4)' }}>
              <div style={{ fontSize:28, marginBottom:8, display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</div>
              <div style={{ fontSize:13 }}>جارٍ تحميل السنوات...</div>
            </div>
          )}

          {error && (
            <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:12, background:'var(--redb)', border:'1px solid var(--redbo)', color:'var(--red)', fontSize:13 }}>
              ⚠️ {error}
            </div>
          )}

          {/* إذا لا توجد سنوات → نموذج إنشاء إجباري */}
          {!loading && years.length === 0 && !error && (
            <div style={{ padding:'8px 0 4px' }}>
              <div style={{ textAlign:'center', padding:'16px 0 20px', borderBottom:'1px solid var(--b1)', marginBottom:16 }}>
                <div style={{ fontSize:32, marginBottom:8, opacity:.4 }}>📅</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>لا توجد سنوات مالية</div>
                <div style={{ fontSize:12, color:'var(--t4)' }}>أنشئ سنة مالية للمتابعة</div>
              </div>

              {createError && (
                <div style={{ padding:'8px 12px', borderRadius:8, marginBottom:12, background:'var(--redb)', border:'1px solid var(--redbo)', color:'var(--red)', fontSize:12 }}>
                  ⚠️ {createError}
                </div>
              )}

              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--t3)', marginBottom:6 }}>السنة المالية</label>
              <input
                type="text" value={newYearName}
                onChange={e => { setNewYearName(e.target.value); setCreateError(null); }}
                placeholder="مثال: 2025"
                style={{
                  width:'100%', padding:'11px 14px', borderRadius:10,
                  border:'1.5px solid var(--b3)', background:'var(--bg3)',
                  color:'var(--t1)', fontFamily:'Tajawal, sans-serif',
                  fontSize:15, fontWeight:700, textAlign:'center',
                  outline:'none', marginBottom:10, direction:'ltr',
                }}
                onFocus={e => (e.target.style.borderColor='var(--em)')}
                onBlur={e => (e.target.style.borderColor='var(--b3)')}
              />
              <div style={{ fontSize:11, color:'var(--t4)', marginBottom:14, textAlign:'center' }}>
                من 01 يناير إلى 31 ديسمبر {newYearName}
              </div>
              <button
                onClick={handleCreateYear} disabled={creating}
                style={{
                  width:'100%', padding:'11px', borderRadius:10,
                  border:'none', background:'var(--em)', color:'#fff',
                  fontSize:13, fontWeight:800, cursor:creating ? 'wait' : 'pointer',
                  fontFamily:'Tajawal, sans-serif', boxShadow:'var(--emglow)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}
              >
                {creating
                  ? <><span style={{ display:'inline-block', width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', animation:'spin .7s linear infinite' }} />جارٍ الإنشاء...</>
                  : 'إنشاء السنة المالية'
                }
              </button>
            </div>
          )}

          {!loading && openYears.length > 0 && (
            <>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--em)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>سنوات مفتوحة</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                {openYears.map(y => (
                  <YearItem key={y.id} year={y} selected={selected === y.id} onClick={() => setSelected(y.id)} />
                ))}
              </div>
            </>
          )}

          {!loading && closedYears.length > 0 && (
            <div style={{ borderTop:'1px solid var(--b1)', paddingTop:12 }}>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>سنوات مقفلة</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                {closedYears.map(y => (
                  <YearItem key={y.id} year={y} selected={selected === y.id} onClick={() => setSelected(y.id)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px 20px', borderTop:'1px solid var(--b1)', display:'flex', gap:10 }}>
          <button onClick={onClose} style={btnSecStyle}>إلغاء</button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={!canProceed}
            style={{ ...btnPrimStyle, opacity: canProceed ? 1 : .5, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            <span>دخول</span>
            <span style={{ fontSize:16 }}>←</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function YearItem({ year, selected, onClick }: { year: FiscalYear; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12,
        border:`1.5px solid ${selected ? 'var(--em)' : 'var(--b2)'}`,
        background: selected ? 'var(--emb)' : 'var(--bg3)',
        cursor:'pointer', transition:'all .14s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background='var(--bg4)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background='var(--bg3)'; }}
    >
      <div style={{
        width:36, height:36, borderRadius:10, flexShrink:0,
        background: year.is_closed ? 'var(--bg4)' : year.is_current
          ? 'linear-gradient(135deg,var(--em),var(--em3))' : 'var(--emb)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
      }}>
        {year.is_closed ? '🔒' : year.is_current ? '⭐' : '📅'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight: selected ? 700 : 600, color: selected ? 'var(--em)' : 'var(--t1)', display:'flex', alignItems:'center', gap:6 }}>
          {year.name}
          {year.is_current && !year.is_closed && (
            <span style={{ fontSize:9, fontWeight:800, padding:'1px 7px', borderRadius:20, background:'var(--em)', color:'#fff' }}>الحالية</span>
          )}
          {year.is_closed && (
            <span style={{ fontSize:9, fontWeight:700, padding:'1px 7px', borderRadius:20, background:'var(--bg5)', color:'var(--t4)' }}>مقفلة</span>
          )}
        </div>
        <div style={{ fontSize:11, color:'var(--t4)', marginTop:2 }}>
          {fmtDate(year.start_date)} — {fmtDate(year.end_date)}
        </div>
      </div>
      {selected && (
        <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--em)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800 }}>✓</div>
      )}
    </div>
  );
}

const btnSecStyle: React.CSSProperties = {
  flex:1, padding:'11px 0', borderRadius:12, border:'1px solid var(--b3)', background:'var(--bg3)',
  color:'var(--t2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', transition:'.13s',
};
const btnPrimStyle: React.CSSProperties = {
  flex:2, padding:'11px 0', borderRadius:12, border:'none', background:'var(--em)', color:'#fff',
  fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'Tajawal, sans-serif', boxShadow:'var(--emglow)',
  display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'.13s',
};

// ── CompanyCard ─────────────────────────────────
const CARD_COLORS = [
  { bg:'linear-gradient(135deg,var(--em),var(--em3))',   glow:'var(--emglow)' },
  { bg:'linear-gradient(135deg,var(--blue),#60a5fa)',    glow:'0 4px 20px rgba(26,79,214,.3)' },
  { bg:'linear-gradient(135deg,var(--purple),#a78bfa)', glow:'0 4px 20px rgba(105,32,212,.3)' },
  { bg:'linear-gradient(135deg,var(--gold),#fbbf24)',    glow:'0 4px 20px rgba(184,125,10,.3)' },
  { bg:'linear-gradient(135deg,var(--teal),#22d3ee)',    glow:'0 4px 20px rgba(13,122,140,.3)' },
  { bg:'linear-gradient(135deg,var(--orange),#fb923c)', glow:'0 4px 20px rgba(196,58,10,.3)' },
];

function CompanyCard({ company, index, onClick }: { company: Company; index: number; onClick: () => void }) {
  const c = CARD_COLORS[index % CARD_COLORS.length];
  const suspended = company.is_suspended;

  return (
    <div
      onClick={suspended ? undefined : onClick}
      style={{
        background:'var(--bg2)', border:'1.5px solid var(--b2)',
        borderRadius:16, padding:'18px 20px',
        cursor: suspended ? 'not-allowed' : 'pointer',
        transition:'all .18s cubic-bezier(.34,1,.64,1)',
        display:'flex', alignItems:'center', gap:16,
        position:'relative', overflow:'hidden',
        opacity: suspended ? .6 : 1,
        animation:`slideup .3s ease ${index * .07}s both`,
      }}
      onMouseEnter={e => {
        if (suspended) return;
        e.currentTarget.style.transform='translateY(-2px)';
        e.currentTarget.style.boxShadow='var(--shadow2)';
        e.currentTarget.style.borderColor='var(--b3)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform='none';
        e.currentTarget.style.boxShadow='none';
        e.currentTarget.style.borderColor='var(--b2)';
      }}
    >
      <div style={{ position:'absolute', top:0, right:0, width:80, height:80, borderRadius:'50%', background:c.bg, opacity:.05, transform:'translate(20px,-20px)', pointerEvents:'none' }} />
      <div style={{ width:50, height:50, borderRadius:14, background:c.bg, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff', boxShadow:c.glow, letterSpacing:-1 }}>
        {getInitials(company.name)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:800, color:'var(--t1)', marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {company.name}
        </div>
        <div style={{ fontSize:11, color:'var(--t4)', display:'flex', alignItems:'center', gap:8 }}>
          {suspended ? (
            <span style={{ color:'var(--red)', fontWeight:700 }}>🔴 معلّقة</span>
          ) : company.is_active === false ? (
            <span style={{ color:'var(--t4)' }}>غير نشطة</span>
          ) : (
            <span style={{ color:'var(--em)', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--em)', display:'inline-block' }} />
              نشطة
            </span>
          )}
          {company.slug && (
            <span style={{ fontFamily:'monospace', fontSize:10, opacity:.6 }}>{company.slug}</span>
          )}
        </div>
      </div>
      {!suspended && (
        <div style={{ width:30, height:30, borderRadius:8, background:'var(--bg3)', border:'1px solid var(--b2)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t4)', fontSize:14, flexShrink:0 }}>
          ←
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────
export default function OnboardingPage() {
  const { user, logout, setActiveCompany } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies]           = useState<Company[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  // ✅ showCreate يفتح المودال الشامل (شركة + سنة مالية)
  const [showCreate, setShowCreate]         = useState(false);
  const [pendingCompany, setPendingCompany] = useState<Company | null>(null);
  const [switching, setSwitching]           = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/companies');
      const data = res.data?.data ?? res.data;
      setCompanies(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'فشل جلب الشركات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user, fetchCompanies]);

  // ── الضغط على شركة قائمة → switch + مودال السنة
  const handleCompanyClick = async (company: Company) => {
    if (company.is_suspended || switching) return;
    setSwitching(true);
    setError(null);
    try {
      await apiClient.post('/companies/switch', { company_id: company.id });
      setPendingCompany(company);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'فشل الدخول إلى الشركة');
    } finally {
      setSwitching(false);
    }
  };

  // ── بعد اختيار السنة (للشركات القائمة)
  const handleFiscalConfirm = (yearId: number | null) => {
    if (!pendingCompany) return;
    if (yearId) {
      try { sessionStorage.setItem('selected_fiscal_year', String(yearId)); } catch {}
    }
    // ✅ تحديث AuthContext بالشركة النشطة
    setActiveCompany({
      id:   pendingCompany.id,
      name: pendingCompany.name,
      slug: pendingCompany.slug,
    });
    setPendingCompany(null);
    navigate('/dashboard', { replace: true });
  };

  // ✅ بعد إنشاء شركة جديدة + سنة مالية من المودال الشامل
  const handleNewCompanyCreated = (company: Company, fiscalYear: { id: number }) => {
    setShowCreate(false);
    // إضافة الشركة للقائمة
    setCompanies(prev => [...prev, company]);
    // ✅ إصلاح مشكلة "جارٍ تحميل": حفظ السنة قبل navigate
    try { sessionStorage.setItem('selected_fiscal_year', String(fiscalYear.id)); } catch {}
    // switch context
    apiClient.post('/companies/switch', { company_id: company.id })
      .then(() => {
        // ✅ تحديث AuthContext
        setActiveCompany({
          id:   company.id,
          name: company.name,
          slug: company.slug,
        });
        navigate('/dashboard', { replace: true });
      })
      .catch(e => {
        // حتى لو فشل الـ switch، نذهب للـ dashboard والـ context سيُصحح من API
        setActiveCompany({
          id:   company.id,
          name: company.name,
          slug: company.slug,
        });
        navigate('/dashboard', { replace: true });
      });
  };

  if (!user) return null;

  return (
    <>
      <style>{`
        @keyframes fadein  { from{opacity:0} to{opacity:1} }
        @keyframes slideup { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{
        minHeight:'100vh', background:'var(--bg0)',
        display:'flex', flexDirection:'column',
        direction:'rtl', animation:'fadein .3s ease',
      }}>
        {/* ── Topbar ── */}
        <div style={{
          height:60, background:'var(--bg2)', borderBottom:'1px solid var(--b2)',
          display:'flex', alignItems:'center', padding:'0 24px', gap:14,
          boxShadow:'var(--shadow)',
        }}>
          <div style={{
            width:36, height:36, borderRadius:10, background:'var(--grad-em)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:16, fontWeight:900, color:'#fff', boxShadow:'var(--emglow)',
          }}>ص</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--t1)', lineHeight:1.2 }}>نظام المبيعات</div>
            <div style={{ fontSize:10, color:'var(--t4)' }}>الإدارة المتكاملة</div>
          </div>
          <div style={{ marginRight:'auto', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--b2)' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--grad-em)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' }}>
                {user.name?.[0]?.toUpperCase() ?? 'م'}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{user.name}</div>
                <div style={{ fontSize:10, color:'var(--t4)' }}>{(user as any).email}</div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              style={{ padding:'7px 14px', borderRadius:10, border:'1px solid var(--b2)', background:'var(--bg3)', color:'var(--t3)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', transition:'.13s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--redbo)'; e.currentTarget.style.color='var(--red)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--b2)'; e.currentTarget.style.color='var(--t3)'; }}
            >
              تسجيل خروج
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ flex:1, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'48px 24px' }}>
          <div style={{ width:'100%', maxWidth:560 }}>

            {/* Title */}
            <div style={{ marginBottom:32, animation:'slideup .3s ease' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--em)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 }}>
                مرحباً، {user.name}
              </div>
              <h1 style={{ fontSize:28, fontWeight:900, color:'var(--t1)', margin:'0 0 8px', lineHeight:1.2 }}>
                اختر شركتك
              </h1>
              <p style={{ fontSize:14, color:'var(--t4)', margin:0 }}>
                حدد الشركة التي تريد العمل عليها اليوم
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding:'11px 14px', borderRadius:12, marginBottom:16, background:'var(--redb)', border:'1px solid var(--redbo)', color:'var(--red)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer', fontSize:16 }}>×</button>
              </div>
            )}

            {/* Switching overlay */}
            {switching && (
              <div style={{ padding:'14px', borderRadius:12, marginBottom:16, background:'var(--emb)', border:'1px solid var(--embo)', color:'var(--em)', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</span>
                جارٍ الدخول إلى الشركة...
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign:'center', padding:'60px 0', color:'var(--t4)' }}>
                <div style={{ fontSize:32, marginBottom:12, display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</div>
                <div style={{ fontSize:14 }}>جارٍ تحميل الشركات...</div>
              </div>
            )}

            {/* Company list */}
            {!loading && companies.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                {companies.map((company, i) => (
                  <CompanyCard key={company.id} company={company} index={i} onClick={() => handleCompanyClick(company)} />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && companies.length === 0 && (
              <div style={{
                textAlign:'center', padding:'60px 24px',
                background:'var(--bg2)', borderRadius:20,
                border:'1.5px dashed var(--b3)', marginBottom:16,
                animation:'slideup .3s ease .1s both',
              }}>
                <div style={{ fontSize:52, marginBottom:12, opacity:.3 }}>🏢</div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--t2)', marginBottom:6 }}>لا توجد شركات بعد</div>
                <div style={{ fontSize:13, color:'var(--t4)' }}>أنشئ شركتك الأولى للبدء</div>
              </div>
            )}

            {/* Add company */}
            <button
              onClick={() => setShowCreate(true)}
              style={{
                width:'100%', padding:'13px 20px', borderRadius:14,
                border:'1.5px dashed var(--b3)', background:'transparent',
                color:'var(--t4)', fontSize:13, fontWeight:700,
                cursor:'pointer', fontFamily:'Tajawal, sans-serif',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'all .15s', animation:'slideup .3s ease .15s both',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background='var(--emb)';
                e.currentTarget.style.borderColor='var(--embo)';
                e.currentTarget.style.color='var(--em)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background='transparent';
                e.currentTarget.style.borderColor='var(--b3)';
                e.currentTarget.style.color='var(--t4)';
              }}
            >
              <span style={{ fontSize:18, lineHeight:1 }}>+</span>
              إضافة شركة جديدة
            </button>

            <p style={{ textAlign:'center', fontSize:11, color:'var(--t4)', marginTop:20, animation:'slideup .3s ease .2s both' }}>
              {companies.length > 0
                ? 'عند الدخول ستُطلب منك تحديد السنة المالية الخاصة بالشركة'
                : 'أنشئ شركتك وستُطلب منك إضافة السنة المالية تلقائياً'
              }
            </p>
          </div>
        </div>
      </div>

      {/* ✅ المودال الشامل: شركة + سنة مالية */}
      {showCreate && (
        <CreateCompanyModal
          onCreated={handleNewCompanyCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* مودال السنة للشركات القائمة */}
      {pendingCompany && (
        <FiscalYearModal
          company={pendingCompany}
          onConfirm={handleFiscalConfirm}
          onClose={() => setPendingCompany(null)}
        />
      )}
    </>
  );
}
