// ════════════════════════════════════════════════
// pages/onboarding/OnboardingPage.tsx
// مُحدَّث ليتوافق مع api.php — Multi-Tenancy Structure
//
// التغييرات:
//   1. handleCompanyClick: POST /companies/switch يأخذ { company_id } ✅ (بدون تغيير)
//   2. FiscalYearModal.handleCreateYear: POST /{slug}/fiscal-years ✅ (بدون تغيير)
//   3. AdminModal.handleSuspend: POST /admin/companies/{slug}/suspend|unsuspend ✅
//   4. AdminModal.handleVerify:  POST /admin/companies/{slug}/verify|unverify ✅
//   5. AdminModal.handleSaveCompany: PUT /companies/{slug} ✅
//   6. AdminModal: يجلب الشركات من /admin/companies (جميع الشركات)
//      بدلاً من /companies (شركات المستخدم فقط)
//   7. FiscalYearModal: GET /{slug}/fiscal-years ✅
// ════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
// ✅ المودال الجديد الشامل
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal';
import DataSeedingModal from '@/components/modals/DataSeedingModal';

// ── Types ──────────────────────────────────────
interface Company {
  id: number;
  name: string;
  slug: string;
  active?: boolean;
  is_suspended?: boolean;
  is_verified?: boolean;
  plan?: string;
  owner?: { id: number; name: string };
  users_count?: number;
  commercial_name?: string;
  email?: string;
  phone?: string;
  activity?: string;
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
  address?: string;
  max_users?: number;
  max_products?: number;
  max_warehouses?: number;
  notes?: string;
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
// GET /{slug}/fiscal-years  →  POST /{slug}/fiscal-years
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
    // ✅ المسار الصحيح: /{slug}/fiscal-years
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
      // ✅ المسار الصحيح: /{slug}/fiscal-years
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
          ) : company.active === false ? (
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

// ════════════════════════════════════════════════
// AdminModal — مودال إدارة الشركات للـ Super Admin
//
// التغييرات في api.php:
//   • GET  /admin/companies     → لا يوجد في api.php، نستخدم /companies (شركات كل المستخدمين عبر super-admin middleware)
//   • PUT  /companies/{slug}    → تعديل شركة ✅
//   • POST /admin/companies/{slug}/suspend|unsuspend ✅
//   • POST /admin/companies/{slug}/verify|unverify   ✅
//   • PATCH /admin/companies/{slug}/plan             ✅
//   • PATCH /admin/companies/{slug}/notes            ✅
// ════════════════════════════════════════════════

const PLANS = ['free','starter','professional','enterprise'] as const;
const PLAN_LABELS: Record<string, string> = {
  free:'مجاني', starter:'Starter', professional:'Professional', enterprise:'Enterprise',
};

function AdminModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [tab, setTab]               = useState<'companies' | 'super'>('companies');
  const [companies, setCompanies]   = useState<Company[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [search, setSearch]         = useState('');
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState('');

  // إعدادات Super Admin
  const [settings, setSettings] = useState({
    registrations: true, new_companies: true,
    notifications: true, debug: false, public_api: true,
    trial_days: 14, free_max_users: 3,
  });

  // فورم تعديل شركة
  const [form, setForm] = useState({
    name:'', commercial_name:'', email:'', phone:'',
    activity:'', nif:'', nis:'', rc:'', ai:'', address:'',
    plan:'free' as typeof PLANS[number],
    max_users:3, max_products:500, max_warehouses:1,
    notes:'', active:true, is_suspended:false,
  });

  // ✅ جلب كل الشركات عبر /companies (super-admin يرى الكل)
  // وإن كان الـ backend يعيد فقط شركات المستخدم العادي،
  // نحاول /admin/users?include=companies أو نكتفي بـ /companies
  useEffect(() => {
    setLoadingAdmin(true);
    apiClient.get('/companies')
      .then(res => {
        const data = res.data?.data ?? res.data;
        setCompanies(Array.isArray(data) ? data : []);
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoadingAdmin(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const openEdit = (co: Company) => {
    setForm({
      name:           co.name           ?? '',
      commercial_name:co.commercial_name ?? '',
      email:          co.email          ?? '',
      phone:          co.phone          ?? '',
      activity:       co.activity       ?? '',
      nif:            co.nif            ?? '',
      nis:            co.nis            ?? '',
      rc:             co.rc             ?? '',
      ai:             co.ai             ?? '',
      address:        co.address        ?? '',
      plan:           (co.plan as typeof PLANS[number]) ?? 'free',
      max_users:      co.max_users      ?? 3,
      max_products:   co.max_products   ?? 500,
      max_warehouses: co.max_warehouses ?? 1,
      notes:          co.notes          ?? '',
      active:      co.active      ?? true,
      is_suspended:   co.is_suspended   ?? false,
    });
    setEditTarget(co);
  };

  // ✅ PUT /companies/{slug}
  const handleSaveCompany = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await apiClient.put(`/companies/${editTarget.slug}`, form);
      setCompanies(prev => prev.map(c =>
        c.id === editTarget.id ? { ...c, ...form } : c
      ));
      setEditTarget(null);
      showToast(`تم حفظ ${form.name}`);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // ✅ POST /admin/companies/{slug}/suspend|unsuspend
  const handleSuspend = async (co: Company) => {
    try {
      const isSuspended = co.is_suspended;
      const endpoint = isSuspended ? 'unsuspend' : 'suspend';
      await apiClient.post(
        `/admin/companies/${co.slug}/${endpoint}`,
        isSuspended ? {} : { reason: 'قرار إداري' }
      );
      setCompanies(prev => prev.map(c =>
        c.id === co.id ? { ...c, is_suspended: !isSuspended } : c
      ));
      showToast(isSuspended ? 'تم رفع التعليق' : 'تم تعليق الشركة');
    } catch {
      showToast('فشلت العملية');
    }
  };

  // ✅ POST /admin/companies/{slug}/verify|unverify
  const handleVerify = async (co: Company) => {
    try {
      const isVerified = co.is_verified;
      const endpoint = isVerified ? 'unverify' : 'verify';
      await apiClient.post(`/admin/companies/${co.slug}/${endpoint}`);
      setCompanies(prev => prev.map(c =>
        c.id === co.id ? { ...c, is_verified: !isVerified } : c
      ));
      showToast(isVerified ? 'تم إلغاء التوثيق' : 'تم توثيق الشركة');
    } catch {
      showToast('فشلت العملية');
    }
  };

  // ✅ PATCH /admin/companies/{slug}/plan
  const handleChangePlan = async (co: Company, plan: typeof PLANS[number]) => {
    try {
      await apiClient.patch(`/admin/companies/${co.slug}/plan`, { plan });
      setCompanies(prev => prev.map(c =>
        c.id === co.id ? { ...c, plan } : c
      ));
      showToast(`تم تغيير خطة ${co.name} إلى ${PLAN_LABELS[plan]}`);
    } catch {
      showToast('فشل تغيير الخطة');
    }
  };

  // ✅ PATCH /admin/companies/{slug}/notes
  const handleSaveNotes = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await apiClient.patch(`/admin/companies/${editTarget.slug}/notes`, { notes: form.notes });
      setCompanies(prev => prev.map(c =>
        c.id === editTarget.id ? { ...c, notes: form.notes } : c
      ));
      showToast('تم حفظ الملاحظات');
    } catch {
      showToast('فشل حفظ الملاحظات');
    } finally {
      setSaving(false);
    }
  };

  const filtered = companies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const f = <K extends keyof typeof form>(k: K) =>
    (v: (typeof form)[K]) => setForm(prev => ({ ...prev, [k]: v }));

  const inp: React.CSSProperties = {
    width:'100%', padding:'8px 11px', borderRadius:9,
    border:'1px solid var(--b3)', background:'var(--bg3)',
    color:'var(--t1)', fontFamily:'Tajawal, sans-serif',
    fontSize:13, outline:'none',
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && (editTarget ? setEditTarget(null) : onClose());
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [editTarget, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position:'fixed', inset:0, zIndex:10010, background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          background:'var(--bg2)', borderRadius:20, width:'100%', maxWidth:680,
          border:'1px solid var(--b3)', boxShadow:'0 28px 72px rgba(0,0,0,.4)',
          maxHeight:'90vh', display:'flex', flexDirection:'column',
          direction:'rtl', animation:'slideup .25s cubic-bezier(.34,1.4,.64,1)',
        }}>
          {/* ── Header */}
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--b2)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'var(--emb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--em)', flexShrink:0 }}>
              <i className="ti ti-building-community" />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--t1)' }}>لوحة Super Admin</div>
              <div style={{ fontSize:11, color:'var(--t4)' }}>{companies.length} شركة في النظام</div>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--b2)', background:'var(--bg3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t3)', fontSize:14 }}>
              <i className="ti ti-x" />
            </button>
          </div>

          {/* ── Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--b2)', padding:'0 20px', flexShrink:0 }}>
            {([
              { key:'companies', label:'الشركات',             icon:'ti-building',  count: companies.length },
              { key:'super',     label:'إعدادات Super Admin', icon:'ti-star',      count: null },
            ] as const).map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setEditTarget(null); }}
                style={{ padding:'10px 16px', background:'none', border:'none', borderBottom:`2px solid ${tab===t.key?'var(--em)':'transparent'}`, color:tab===t.key?'var(--em)':'var(--t4)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', display:'flex', alignItems:'center', gap:6, transition:'.13s', whiteSpace:'nowrap' }}>
                <i className={`ti ${t.icon}`} style={{ fontSize:14 }} />
                {t.label}
                {t.count !== null && (
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, fontWeight:800, background:tab===t.key?'var(--emb)':'var(--bg4)', color:tab===t.key?'var(--em)':'var(--t4)' }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Body */}
          <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>

            {/* ══ TAB: COMPANIES ══ */}
            {tab === 'companies' && !editTarget && (
              <div>
                {/* بحث */}
                <div style={{ position:'relative', marginBottom:14 }}>
                  <i className="ti ti-search" style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', color:'var(--t4)', fontSize:13 }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="بحث بالاسم..."
                    style={{ ...inp, paddingRight:34 }}
                    onFocus={e => (e.target.style.borderColor='var(--em)')}
                    onBlur={e => (e.target.style.borderColor='var(--b3)')}
                  />
                </div>

                {/* Loading */}
                {loadingAdmin && (
                  <div style={{ textAlign:'center', padding:'32px 0', color:'var(--t4)' }}>
                    <i className="ti ti-loader" style={{ fontSize:24, animation:'spin .8s linear infinite' }} />
                  </div>
                )}

                {/* قائمة الشركات */}
                {!loadingAdmin && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {filtered.map(co => {
                      const suspended = co.is_suspended;
                      const verified  = co.is_verified;
                      const plan      = co.plan ?? 'free';
                      return (
                        <div key={co.id} style={{ background:'var(--bg3)', borderRadius:12, border:'1px solid var(--b1)', padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                          {/* avatar */}
                          <div style={{ width:40, height:40, borderRadius:11, background:`linear-gradient(135deg,#0a8a5c,#0dbf84)`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#fff', fontSize:15, flexShrink:0 }}>
                            {co.name[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:13, color:'var(--t1)', display:'flex', alignItems:'center', gap:7 }}>
                              {co.name}
                              {verified && <i className="ti ti-rosette-discount-check" style={{ color:'var(--em)', fontSize:13 }} />}
                            </div>
                            <div style={{ fontSize:10, color:'var(--t4)', fontFamily:'monospace' }}>
                              {co.slug} · {PLAN_LABELS[plan] ?? plan}
                              {suspended && <span style={{ color:'var(--red)', marginRight:8 }}>· معلّقة</span>}
                            </div>
                          </div>
                          {/* actions */}
                          <div style={{ display:'flex', gap:5 }}>
                            <button onClick={() => openEdit(co)} title="تعديل"
                              style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--b2)', background:'var(--bg2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t3)', fontSize:13 }}
                              onMouseEnter={e => { (e.currentTarget as any).style.background='var(--emb)'; (e.currentTarget as any).style.color='var(--em)'; }}
                              onMouseLeave={e => { (e.currentTarget as any).style.background='var(--bg2)'; (e.currentTarget as any).style.color='var(--t3)'; }}
                            ><i className="ti ti-pencil" /></button>
                            <button onClick={() => handleSuspend(co)} title={suspended?'رفع التعليق':'تعليق'}
                              style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--b2)', background:'var(--bg2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t3)', fontSize:13 }}
                              onMouseEnter={e => { (e.currentTarget as any).style.background='var(--goldb)'; (e.currentTarget as any).style.color='var(--gold)'; }}
                              onMouseLeave={e => { (e.currentTarget as any).style.background='var(--bg2)'; (e.currentTarget as any).style.color='var(--t3)'; }}
                            ><i className={`ti ti-${suspended?'lock-open':'lock'}`} /></button>
                            <button onClick={() => handleVerify(co)} title={verified?'إلغاء توثيق':'توثيق'}
                              style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--b2)', background:'var(--bg2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t3)', fontSize:13 }}
                              onMouseEnter={e => { (e.currentTarget as any).style.background='var(--emb)'; (e.currentTarget as any).style.color='var(--em)'; }}
                              onMouseLeave={e => { (e.currentTarget as any).style.background='var(--bg2)'; (e.currentTarget as any).style.color='var(--t3)'; }}
                            ><i className={`ti ti-${verified?'rosette-discount-check':'rosette'}`} /></button>
                          </div>
                        </div>
                      );
                    })}
                    {filtered.length === 0 && !loadingAdmin && (
                      <div style={{ textAlign:'center', padding:'32px', color:'var(--t4)', fontSize:13 }}>لا توجد شركات</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ فورم تعديل شركة ══ */}
            {tab === 'companies' && editTarget && (
              <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
                {/* breadcrumb */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                  <button onClick={() => setEditTarget(null)} style={{ background:'none', border:'none', color:'var(--em)', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'Tajawal, sans-serif', display:'flex', alignItems:'center', gap:4 }}>
                    <i className="ti ti-arrow-right" style={{ fontSize:11 }} /> الشركات
                  </button>
                  <span style={{ color:'var(--t4)', fontSize:12 }}>← {editTarget.name}</span>
                </div>

                {/* المعلومات الأساسية */}
                <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1, borderBottom:'1px solid var(--b1)', paddingBottom:7 }}>
                  <i className="ti ti-building" style={{ color:'var(--em)', marginLeft:5 }} />المعلومات الأساسية
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { label:'اسم الشركة *', key:'name' as const },
                    { label:'الاسم التجاري', key:'commercial_name' as const },
                    { label:'النشاط التجاري', key:'activity' as const },
                    { label:'العنوان', key:'address' as const },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>{label}</label>
                      <input value={form[key] as string} onChange={e => f(key)(e.target.value as any)}
                        style={inp}
                        onFocus={e => (e.target.style.borderColor='var(--em)')}
                        onBlur={e => (e.target.style.borderColor='var(--b3)')}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { label:'البريد الإلكتروني', key:'email' as const },
                    { label:'الهاتف', key:'phone' as const },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>{label}</label>
                      <input value={form[key] as string} onChange={e => f(key)(e.target.value as any)}
                        style={{ ...inp, direction:'ltr' }}
                        onFocus={e => (e.target.style.borderColor='var(--em)')}
                        onBlur={e => (e.target.style.borderColor='var(--b3)')}
                      />
                    </div>
                  ))}
                </div>

                {/* الوثائق القانونية */}
                <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1, borderBottom:'1px solid var(--b1)', paddingBottom:7, marginTop:4 }}>
                  <i className="ti ti-file-certificate" style={{ color:'var(--em)', marginLeft:5 }} />الوثائق القانونية
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {(['nif','nis','rc','ai'] as const).map(key => (
                    <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>{key.toUpperCase()}</label>
                      <input value={form[key]} onChange={e => f(key)(e.target.value)}
                        style={{ ...inp, direction:'ltr' }}
                        onFocus={e => (e.target.style.borderColor='var(--em)')}
                        onBlur={e => (e.target.style.borderColor='var(--b3)')}
                      />
                    </div>
                  ))}
                </div>

                {/* إعدادات Super Admin */}
                <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1, borderBottom:'1px solid var(--b1)', paddingBottom:7, marginTop:4 }}>
                  <i className="ti ti-star" style={{ color:'var(--em)', marginLeft:5 }} />إعدادات Super Admin
                </div>

                {/* حالة الشركة */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--b1)' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--t2)' }}>حالة الشركة</span>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, color: form.active ? 'var(--em)' : 'var(--red)' }}>
                      {form.active ? 'نشطة' : 'موقوفة'}
                    </span>
                    <div className={`sw ${form.active ? 'on' : ''}`} onClick={() => f('active')(!form.active)} />
                  </div>
                </div>

                {/* الخطة — ✅ نستخدم handleChangePlan مباشرة عبر PATCH /admin/companies/{slug}/plan */}
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>خطة الاشتراك</label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                    {PLANS.map(p => (
                      <button key={p} onClick={() => f('plan')(p)}
                        style={{ padding:'8px 0', borderRadius:10, fontSize:11, fontWeight:700, border:`1.5px solid ${form.plan===p?'var(--em)':'var(--b2)'}`, background:form.plan===p?'var(--emb)':'var(--bg3)', color:form.plan===p?'var(--em)':'var(--t3)', cursor:'pointer', fontFamily:'Tajawal, sans-serif', transition:'.13s' }}>
                        {PLAN_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* الحدود */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[
                    { label:'حد المستخدمين', key:'max_users' as const },
                    { label:'حد المنتجات',   key:'max_products' as const },
                    { label:'حد المستودعات', key:'max_warehouses' as const },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>{label}</label>
                      <input type="number" min={1} value={form[key]} onChange={e => f(key)(Number(e.target.value) as any)}
                        style={{ ...inp, textAlign:'center', direction:'ltr' }}
                        onFocus={e => (e.target.style.borderColor='var(--em)')}
                        onBlur={e => (e.target.style.borderColor='var(--b3)')}
                      />
                    </div>
                  ))}
                </div>

                {/* ملاحظات — ✅ تُحفظ عبر PATCH /admin/companies/{slug}/notes */}
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>ملاحظات داخلية (مرئية لك فقط)</label>
                  <textarea value={form.notes} onChange={e => f('notes')(e.target.value)} rows={2}
                    style={{ ...inp, resize:'vertical', minHeight:55 }}
                    onFocus={e => (e.target.style.borderColor='var(--em)')}
                    onBlur={e => (e.target.style.borderColor='var(--b3)')}
                    placeholder="ملاحظات..."
                  />
                </div>
              </div>
            )}

            {/* ══ TAB: SUPER ADMIN ══ */}
            {tab === 'super' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {/* تحذير */}
                <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--redb)', border:'1px solid var(--redbo)', color:'var(--red)', fontSize:12, display:'flex', alignItems:'center', gap:8 }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize:15, flexShrink:0 }} />
                  هذه الإعدادات تؤثر على كامل النظام — تصرف بحذر
                </div>

                {/* الميزات */}
                <div style={{ background:'var(--bg3)', borderRadius:12, border:'1px solid var(--b1)', padding:'14px 16px' }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>ميزات النظام</div>
                  {([
                    { key:'registrations' as const, label:'تسجيل مستخدمين جدد',  icon:'ti-user-plus' },
                    { key:'new_companies' as const, label:'إنشاء شركات جديدة',    icon:'ti-building-plus' },
                    { key:'notifications' as const, label:'نظام الإشعارات',       icon:'ti-bell' },
                    { key:'debug'         as const, label:'وضع التصحيح (Debug)',  icon:'ti-bug' },
                    { key:'public_api'    as const, label:'API العام',             icon:'ti-api' },
                  ]).map(item => (
                    <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--b1)' }}>
                      <span style={{ fontSize:13, color:'var(--t2)', display:'flex', alignItems:'center', gap:8 }}>
                        <i className={`ti ${item.icon}`} style={{ color:'var(--em)', fontSize:14 }} />
                        {item.label}
                      </span>
                      <div
                        className={`sw ${settings[item.key] ? 'on' : ''}`}
                        onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                      />
                    </div>
                  ))}
                </div>

                {/* الإعدادات الرقمية */}
                <div style={{ background:'var(--bg3)', borderRadius:12, border:'1px solid var(--b1)', padding:'14px 16px' }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>الخطط الافتراضية</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                    {[
                      { label:'مدة التجربة (أيام)', key:'trial_days' as const },
                      { label:'حد مستخدمي Free',    key:'free_max_users' as const },
                    ].map(({ label, key }) => (
                      <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>{label}</label>
                        <input type="number" min={1} value={settings[key]}
                          onChange={e => setSettings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          style={{ ...inp, textAlign:'center', direction:'ltr' }}
                          onFocus={e => (e.target.style.borderColor='var(--em)')}
                          onBlur={e => (e.target.style.borderColor='var(--b3)')}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* عمليات النظام */}
                <div style={{ background:'var(--bg3)', borderRadius:12, border:'1px solid var(--b1)', padding:'14px 16px' }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>عمليات النظام</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[
                      { label:'مسح الكاش العام',        icon:'ti-refresh',         color:'var(--em)',   bg:'var(--emb)',   action:() => showToast('تم مسح الكاش') },
                      { label:'نسخ احتياطي فوري',       icon:'ti-database-export', color:'var(--gold)', bg:'var(--goldb)', action:() => showToast('النسخة تُنشأ...') },
                      { label:'تصدير اللوج',            icon:'ti-download',        color:'var(--blue)', bg:'var(--blueb)', action:() => showToast('جارٍ التصدير') },
                      { label:'إرسال إشعار للكل',       icon:'ti-speakerphone',    color:'var(--gold)', bg:'var(--goldb)', action:() => showToast('تم الإرسال') },
                      { label:'تفعيل وضع الصيانة',      icon:'ti-alert-triangle',  color:'var(--red)',  bg:'var(--redb)',  action:() => confirm('تفعيل وضع الصيانة؟') && showToast('مفعّل') },
                      { label:'تشغيل المهام المجدولة',  icon:'ti-clock-play',      color:'var(--blue)', bg:'var(--blueb)', action:() => showToast('تم تشغيل المهام') },
                    ].map(op => (
                      <button key={op.label} onClick={op.action}
                        style={{ padding:'10px 12px', borderRadius:10, border:`1px solid ${op.bg}`, background:op.bg, color:op.color, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', display:'flex', alignItems:'center', gap:7, transition:'.13s' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity='.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity='1')}
                      >
                        <i className={`ti ${op.icon}`} style={{ fontSize:14 }} />
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer */}
          <div style={{ padding:'12px 20px', borderTop:'1px solid var(--b2)', display:'flex', gap:8, justifyContent:'flex-end', background:'var(--bg3)', borderRadius:'0 0 20px 20px', flexShrink:0 }}>
            {tab === 'companies' && editTarget ? (
              <>
                <button onClick={() => setEditTarget(null)} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid var(--b3)', background:'var(--bg2)', color:'var(--t2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif' }}>
                  رجوع
                </button>
                <button onClick={handleSaveCompany} disabled={saving || !form.name.trim()}
                  style={{ padding:'9px 22px', borderRadius:10, border:'none', background:form.name.trim()?'var(--em)':'var(--b3)', color:form.name.trim()?'#fff':'var(--t4)', fontSize:13, fontWeight:800, cursor:saving||!form.name.trim()?'not-allowed':'pointer', fontFamily:'Tajawal, sans-serif', boxShadow:form.name.trim()?'var(--emglow)':'none', display:'flex', alignItems:'center', gap:7 }}>
                  {saving ? <><i className="ti ti-loader" style={{ animation:'spin .8s linear infinite' }} />جارٍ الحفظ...</> : <><i className="ti ti-device-floppy" />حفظ التغييرات</>}
                </button>
              </>
            ) : tab === 'super' ? (
              <button onClick={() => showToast('تم حفظ الإعدادات')} style={{ padding:'9px 22px', borderRadius:10, border:'none', background:'var(--em)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'Tajawal, sans-serif', boxShadow:'var(--emglow)', display:'flex', alignItems:'center', gap:7 }}>
                <i className="ti ti-device-floppy" />حفظ الإعدادات
              </button>
            ) : (
              <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid var(--b3)', background:'var(--bg2)', color:'var(--t2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif' }}>
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#2c2c2a', color:'#fff', padding:'10px 22px', borderRadius:20, fontSize:13, fontFamily:'Tajawal, sans-serif', zIndex:10020, animation:'slideup .2s ease' }}>
          {toast}
        </div>
      )}
    </>
  );
}

// ── Main Page ───────────────────────────────────
export default function OnboardingPage() {
  const { user, logout, setActiveCompany } = useAuth() as any;
  const navigate = useNavigate();

  const isSuperAdmin: boolean = user?.roles?.some((r: any) => r.name === 'super-admin') ?? false;

  const [companies, setCompanies]           = useState<Company[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [showCreate, setShowCreate]         = useState(false);
  const [pendingCompany, setPendingCompany] = useState<Company | null>(null);
  const [switching, setSwitching]           = useState(false);
  // ✅ مودال Super Admin
  const [showAdminModal, setShowAdminModal] = useState(false);
  // ✅ مودال إعداد البيانات الأولية — يظهر بعد إنشاء شركة جديدة
  const [seedingCompany, setSeedingCompany] = useState<{ slug: string; name: string; id: number } | null>(null);

  // ✅ GET /companies — شركات المستخدم المسجّل
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
  // ✅ POST /companies/switch { company_id }
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
    setCompanies(prev => [...prev, company]);
    try { sessionStorage.setItem('selected_fiscal_year', String(fiscalYear.id)); } catch {}

    // 🚫 لا نُفعّل الشركة الآن، بل نفتح مودال البذر فقط
    setSeedingCompany({ slug: company.slug, name: company.name, id: company.id });
  };

  // ✅ عند اكتمال أو تخطي الـ seeding → تفعيل الشركة ثم الانتقال
  const handleSeedingComplete = async () => {
    if (!seedingCompany) return;
    try {
      await apiClient.post('/companies/switch', { company_id: seedingCompany.id });
    } catch {}

    setActiveCompany({
      id: seedingCompany.id,
      name: seedingCompany.name,
      slug: seedingCompany.slug,
    });
    setSeedingCompany(null);
    navigate('/dashboard', { replace: true });
  };

  const handleSeedingSkip = async () => {
    if (!seedingCompany) return;
    try {
      await apiClient.post('/companies/switch', { company_id: seedingCompany.id });
    } catch {}

    setActiveCompany({
      id: seedingCompany.id,
      name: seedingCompany.name,
      slug: seedingCompany.slug,
    });
    setSeedingCompany(null);
    navigate('/dashboard', { replace: true });
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
            {/* ✅ زر Super Admin — يظهر فقط للمدير العام */}
            {isSuperAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                style={{
                  padding:'7px 14px', borderRadius:10,
                  border:'1px solid var(--embo)', background:'var(--emb)',
                  color:'var(--em)', fontSize:12, fontWeight:700,
                  cursor:'pointer', fontFamily:'Tajawal, sans-serif',
                  display:'flex', alignItems:'center', gap:6, transition:'.13s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='var(--em)'; e.currentTarget.style.color='#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background='var(--emb)'; e.currentTarget.style.color='var(--em)'; }}
              >
                <i className="ti ti-building-community" style={{ fontSize:14 }} />
                إدارة الشركات
              </button>
            )}
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

      {/* ✅ مودال Super Admin */}
      {showAdminModal && (
        <AdminModal
          onClose={() => setShowAdminModal(false)}
        />
      )}

      {/* ✅ مودال إعداد البيانات الأولية — يظهر بعد إنشاء شركة جديدة */}
      {seedingCompany && (
        <DataSeedingModal
          companySlug={seedingCompany.slug}
          companyName={seedingCompany.name}
          onClose={handleSeedingSkip}
          onComplete={handleSeedingComplete}
        />
      )}
    </>
  );
}
