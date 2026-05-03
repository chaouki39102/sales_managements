// resources/js/context/FiscalYearContext.tsx
// ════════════════════════════════════════════════
import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useMemo,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import type { FiscalYear } from '@/types';

// ── Types ───────────────────────────────────────
interface FiscalYearContextType {
  years:           FiscalYear[];
  selectedYear:    FiscalYear | null;
  currentYear:     FiscalYear | null;
  setSelectedYear: (year: FiscalYear) => void;
  goToCurrentYear: () => void;
  isLoading:       boolean;
  hasMultipleOpen: boolean;
  refetch:         () => void;   // ✅ لإعادة الجلب بعد إنشاء سنة
}

const FiscalYearContext = createContext<FiscalYearContextType | undefined>(undefined);

// ── Provider ────────────────────────────────────
export function FiscalYearProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, activeCompany } = useAuth();
  const [selectedYear, setSelectedYearState] = useState<FiscalYear | null>(null);
  const qc = useQueryClient();

  // ✅ المفتاح يحتوي slug الشركة → يُبطَل تلقائياً عند تغيير الشركة
  const queryKey = ['fiscal-years', activeCompany?.slug ?? null];

  const { data: years = [], isLoading, refetch } = useQuery<FiscalYear[]>({
    queryKey,
    queryFn: async () => {
      // ✅ نستخدم /{slug}/fiscal-years مثل بقية الكود
      const slug = activeCompany?.slug;
      if (!slug) return [];
      const res = await apiClient.get(`/${slug}/fiscal-years`, { params: { per_page: 50 } });
      // دفاعي: يدعم r.data.data و r.data مباشرة
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
    // ✅ لا نجلب إلا بعد تسجيل الدخول وتحديد الشركة
    enabled: isAuthenticated && !authLoading && !!activeCompany?.slug,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const currentYear = useMemo(
    () => years.find(y => y.is_current) ?? years.find(y => !y.is_closed) ?? years[0] ?? null,
    [years]
  );

  // ✅ إعادة ضبط selectedYear عند تغيير الشركة
  useEffect(() => {
    setSelectedYearState(null);
  }, [activeCompany?.slug]);

  // تعيين السنة: sessionStorage أولاً ثم الحالية
  useEffect(() => {
    if (years.length === 0 || selectedYear) return;

    try {
      const saved = sessionStorage.getItem('selected_fiscal_year');
      if (saved) {
        const found = years.find(y => y.id === Number(saved));
        if (found) { setSelectedYearState(found); return; }
      }
    } catch {}

    setSelectedYearState(currentYear);
  }, [years, currentYear, selectedYear]);

  const setSelectedYear = useCallback((year: FiscalYear) => {
    setSelectedYearState(year);
    try { sessionStorage.setItem('selected_fiscal_year', String(year.id)); } catch {}
  }, []);

  const goToCurrentYear = useCallback(() => {
    if (currentYear) setSelectedYearState(currentYear);
  }, [currentYear]);

  const hasMultipleOpen = useMemo(
    () => years.filter(y => !y.is_closed).length > 1,
    [years]
  );

  return (
    <FiscalYearContext.Provider value={{
      years, selectedYear, currentYear,
      setSelectedYear, goToCurrentYear,
      isLoading, hasMultipleOpen,
      refetch,
    }}>
      {children}
    </FiscalYearContext.Provider>
  );
}

export function useFiscalYear(): FiscalYearContextType {
  const ctx = useContext(FiscalYearContext);
  if (!ctx) throw new Error('useFiscalYear must be used within FiscalYearProvider');
  return ctx;
}

// ── FiscalYearSelector (Topbar) ─────────────────
export function FiscalYearSelector() {
  const { years, selectedYear, setSelectedYear, isLoading } = useFiscalYear();
  const [open, setOpen] = useState(false);

  const openYears   = years.filter(y => !y.is_closed);
  const closedYears = years.filter(y => y.is_closed);

  if (isLoading) {
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:6, padding:'5px 10px',
        background:'var(--bg3)', border:'1px solid var(--b2)', borderRadius:'var(--r2)',
        fontSize:12, color:'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation:'spin .8s linear infinite' }} />
        تحميل...
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!selectedYear) return null;

  return (
    <div style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display:'flex', alignItems:'center', gap:6, padding:'5px 10px',
          borderRadius:'var(--r2)', border:'1px solid var(--b2)', background:'var(--bg3)',
          cursor:'pointer', transition:'.15s', fontFamily:'Tajawal,sans-serif',
        }}
      >
        <i className={`ti ${selectedYear.is_closed ? 'ti-lock' : 'ti-calendar-check'}`}
           style={{ color: selectedYear.is_closed ? 'var(--t4)' : 'var(--em)', fontSize:14 }} />
        <span style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{selectedYear.name}</span>
        {selectedYear.is_current && <i className="ti ti-star-filled" style={{ color:'var(--gold)', fontSize:10 }} />}
        {selectedYear.is_closed && <span style={{ fontSize:9, color:'var(--t4)' }}>مقفلة</span>}
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize:11, color:'var(--t4)' }} />
      </button>

      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:10000 }} onClick={() => setOpen(false)} />
          <div style={{
            position:'absolute', top:'calc(100% + 6px)', left:0, minWidth:240,
            background:'var(--bg2)', border:'1px solid var(--b2)',
            borderRadius:'var(--r3)', boxShadow:'var(--shadow2)', zIndex:10001, overflow:'hidden',
          }}>
            <div style={{ padding:'8px 12px', background:'var(--bg3)', borderBottom:'1px solid var(--b1)' }}>
              <span style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1 }}>
                السنوات المالية
              </span>
            </div>
            {openYears.length > 0 && (
              <>
                <div style={{ padding:'4px 12px 2px', fontSize:9, fontWeight:700, color:'var(--em)', textTransform:'uppercase', letterSpacing:1 }}>مفتوحة</div>
                {openYears.map(y => <YearOption key={y.id} year={y} selected={selectedYear?.id === y.id} onClick={() => { setSelectedYear(y); setOpen(false); }} />)}
              </>
            )}
            {closedYears.length > 0 && (
              <>
                <div style={{ padding:'6px 12px 2px', borderTop:'1px solid var(--b1)', fontSize:9, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1 }}>مقفلة</div>
                {closedYears.slice(0, 3).map(y => <YearOption key={y.id} year={y} selected={selectedYear?.id === y.id} onClick={() => { setSelectedYear(y); setOpen(false); }} />)}
                {closedYears.length > 3 && <div style={{ padding:'6px 12px', fontSize:11, color:'var(--t4)', fontStyle:'italic' }}>+ {closedYears.length - 3} سنوات أخرى...</div>}
              </>
            )}
            <div style={{ padding:'6px 12px', borderTop:'1px solid var(--b1)' }}>
              <a href="/fiscalyears" style={{ fontSize:12, color:'var(--em)', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }} onClick={() => setOpen(false)}>
                <i className="ti ti-settings" style={{ fontSize:13 }} />إدارة السنوات المالية
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function YearOption({ year, selected, onClick }: { year: FiscalYear; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', cursor:'pointer', transition:'.13s', background: selected ? 'var(--emb)' : 'transparent' }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg3)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
      <i className={`ti ${year.is_closed ? 'ti-lock' : year.is_current ? 'ti-star-filled' : 'ti-calendar'}`}
         style={{ fontSize:14, color: year.is_closed ? 'var(--t4)' : year.is_current ? 'var(--gold)' : 'var(--em)', flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight: selected ? 700 : 500, color: selected ? 'var(--em)' : 'var(--t1)' }}>
          {year.name}
          {year.is_current && <span style={{ fontSize:9, color:'var(--gold)', marginRight:6 }}>★ حالية</span>}
        </div>
        <div style={{ fontSize:10, color:'var(--t4)' }}>{_fmt(year.start_date)} — {_fmt(year.end_date)}</div>
      </div>
      {selected && <i className="ti ti-check" style={{ color:'var(--em)', fontSize:14 }} />}
    </div>
  );
}

function _fmt(date: unknown): string {
  const d = String(date).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
  if (!d) return '—';
  const [y, m] = d.split('-');
  const months = ['يناير','فبراير','مارس','أبريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return `${months[parseInt(m) - 1]} ${y}`;
}
