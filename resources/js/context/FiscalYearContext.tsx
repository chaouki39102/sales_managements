// ════════════════════════════════════════════════════════════════════════════
// context/FiscalYearContext.tsx  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   FiscalYearProvider كان يُشغَّل دائماً بمجرد وجود slug في Zustand
//   حتى لو لم يكن المستخدم مسجّل دخوله بعد.
//
//   Zustand يحتفظ بالـ slug من الجلسة السابقة (persist) حتى بعد logout
//   → بمجرد تحميل الصفحة: slug موجود → useFiscalYears يُشغَّل
//   → يُرسل: GET /api/v1/el-houda.../fiscal-years?per_page=50
//   → الـ token منتهي أو 500 في الباكاند
//
// الحل:
//   1. FiscalYearContext يقرأ isAuthenticated من AuthContext
//   2. useFiscalYears لا يُشغَّل إلا بعد التحقق من Auth
//   3. إضافة enabled: !!slug && isAuthenticated في الـ query
//
// ملاحظة بخصوص 500 "Unclosed '{' on line 15":
//   هذا خطأ PHP syntax في الباكاند — ليس مشكلة frontend.
//   على الأرجح في BaseService.php من التعديلات الأخيرة.
//   الحل: تحقق من السطر 15 في BaseService.php وأصلح الـ syntax error.
// ════════════════════════════════════════════════════════════════════════════

import React, {
  createContext, useContext, useCallback,
  useState, useRef, useEffect,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { fiscalYearsApi }    from '@/lib/api/endpoints/fiscalYears';
import { tenantKeys }        from '@/lib/api/core/queryKeys';
import { useActiveSlug }     from '@/lib/store/appStore';
import { useAppStore }       from '@/lib/store/appStore';
import { useAuth }           from '@/context/AuthContext';  // ✅ نقرأ Auth
import type { FiscalYear }   from '@/lib/api/core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FiscalYearContextType {
  years:           FiscalYear[];
  selectedYear:    FiscalYear | null;
  currentYear:     FiscalYear | null;
  open:            FiscalYear[];
  closed:          FiscalYear[];
  setSelectedYear: (year: FiscalYear) => void;
  goToCurrentYear: () => void;
  isLoading:       boolean;
  hasMultipleOpen: boolean;
  refetch:         () => void;
}

const FiscalYearContext = createContext<FiscalYearContextType | undefined>(undefined);

// ─── useFiscalYears المُصلَح — لا يُشغَّل إلا بعد Auth ───────────────────────

function useFiscalYearsAuth() {
  const slug            = useActiveSlug();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ✅ الشرط المزدوج: يجب أن يكون هناك slug + مستخدم مصادق عليه
  const enabled = !!slug && isAuthenticated && !authLoading;

  return useQuery({
    queryKey:  tenantKeys.fiscalYears.all(slug ?? ''),
    queryFn:   () => fiscalYearsApi.list(),
    enabled,
    staleTime: 5 * 60_000,
    retry:     false,  // ✅ لا نُعيد المحاولة إذا فشل (يمنع loops)
    select: (years) => ({
      years,
      current: years.find(y => y.is_current) ??
               years.find(y => !y.is_closed)  ??
               years[0] ??
               null,
      open:    years.filter(y => !y.is_closed),
      closed:  years.filter(y => y.is_closed),
    }),
  });
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function FiscalYearProvider({ children }: { children: React.ReactNode }) {
  // ✅ استخدام useFiscalYearsAuth بدل useFiscalYears
  const { data, isLoading, refetch } = useFiscalYearsAuth();
  const selectedYearId    = useAppStore(s => s.selectedYearId);
  const setSelectedYearId = useAppStore(s => s.setSelectedYearId);

  const years   = data?.years   ?? [];
  const current = data?.current ?? null;
  const open    = data?.open    ?? [];
  const closed  = data?.closed  ?? [];

  // ─── selectedYear: من Zustand id → يبحث في القائمة ──────────────────────
  const selectedYear: FiscalYear | null = (() => {
    if (!data) return null;
    if (!selectedYearId) return current;
    return years.find(y => y.id === selectedYearId) ?? current;
  })();

  const setSelectedYear = useCallback((year: FiscalYear) => {
    setSelectedYearId(year.id);
  }, [setSelectedYearId]);

  const goToCurrentYear = useCallback(() => {
    if (current) setSelectedYearId(current.id);
  }, [current, setSelectedYearId]);

  return (
    <FiscalYearContext.Provider value={{
      years,
      selectedYear,
      currentYear:     current,
      open,
      closed,
      setSelectedYear,
      goToCurrentYear,
      isLoading,
      hasMultipleOpen: open.length > 1,
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

// ─── FiscalYearSelector ───────────────────────────────────────────────────────

export function FiscalYearSelector() {
  const { years, selectedYear, setSelectedYear, isLoading, open, closed } = useFiscalYear();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderRadius: 20,
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite', fontSize: 13 }} />
        تحميل...
      </div>
    );
  }

  if (!selectedYear && years.length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20,
          background: 'var(--bg3)', border: '1px solid var(--b2)',
          cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          transition: 'all .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--em)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--b2)')}
      >
        <i
          className={`ti ${selectedYear?.is_closed ? 'ti-lock' : 'ti-calendar-check'}`}
          style={{ color: selectedYear?.is_closed ? 'var(--t4)' : 'var(--em)', fontSize: 13 }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>
          {selectedYear?.name ?? 'اختر سنة'}
        </span>
        {selectedYear?.is_current && (
          <i className="ti ti-star-filled" style={{ color: 'var(--gold)', fontSize: 9 }} />
        )}
        <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`}
           style={{ fontSize: 11, color: 'var(--t4)' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          minWidth: 200, background: 'var(--bg2)',
          border: '1px solid var(--b2)', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,.2)',
          zIndex: 1000, overflow: 'hidden', direction: 'rtl',
        }}>
          {open.length > 0 && (
            <>
              <div style={{
                padding: '6px 12px', fontSize: 9.5, fontWeight: 800,
                color: 'var(--em)', textTransform: 'uppercase', letterSpacing: .5,
                background: 'var(--bg3)',
              }}>مفتوحة</div>
              {open.map(year => (
                <YearOption
                  key={year.id} year={year}
                  selected={selectedYear?.id === year.id}
                  onClick={() => { setSelectedYear(year); setIsOpen(false); }}
                />
              ))}
            </>
          )}

          {closed.length > 0 && (
            <>
              <div style={{
                padding: '6px 12px', fontSize: 9.5, fontWeight: 800,
                color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .5,
                borderTop: open.length ? '1px solid var(--b1)' : 'none',
                background: 'var(--bg3)',
              }}>مقفلة</div>
              {closed.slice(0, 3).map(year => (
                <YearOption
                  key={year.id} year={year}
                  selected={selectedYear?.id === year.id}
                  onClick={() => { setSelectedYear(year); setIsOpen(false); }}
                />
              ))}
              {closed.length > 3 && (
                <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--t4)', fontStyle: 'italic' }}>
                  + {closed.length - 3} سنوات أخرى...
                </div>
              )}
            </>
          )}

          <div style={{ borderTop: '1px solid var(--b1)' }}>
            <a
              href="/fiscalyears"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', fontSize: 12,
                color: 'var(--em)', fontWeight: 600,
                textDecoration: 'none', transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <i className="ti ti-settings" style={{ fontSize: 13 }} />
              إدارة السنوات المالية
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function YearOption({
  year, selected, onClick,
}: {
  year: FiscalYear; selected: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', cursor: 'pointer',
        background: selected ? 'var(--emb)' : 'transparent',
        transition: 'background .1s',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <i
          className={`ti ${year.is_closed ? 'ti-lock' : year.is_current ? 'ti-star-filled' : 'ti-calendar'}`}
          style={{
            fontSize: 13,
            color: year.is_closed ? 'var(--t4)' : year.is_current ? 'var(--gold)' : 'var(--em)',
          }}
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? 'var(--em)' : 'var(--t1)' }}>
            {year.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)' }}>
            {year.start_date?.split('-')[0]} — {year.end_date?.split('-')[0]}
          </div>
        </div>
      </div>
      {selected && <i className="ti ti-check" style={{ color: 'var(--em)', fontSize: 14 }} />}
    </div>
  );
}
