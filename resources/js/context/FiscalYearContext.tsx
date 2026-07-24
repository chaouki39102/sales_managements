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
    select: (response) => {
      const years = response.data;
      return {
        years,
        current: years.find(y => y.is_current) ??
                 years.find(y => !y.is_closed)  ??
                 years[0] ??
                 null,
        open:    years.filter(y => !y.is_closed),
        closed:  years.filter(y => y.is_closed),
      };
    },
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

  // ✅ Auto-select: إذا لم يُختر سنة بعد، نختار السنة الحالية
  useEffect(() => {
    if (!selectedYearId && current) {
      setSelectedYearId(current.id);
    }
  }, [selectedYearId, current, setSelectedYearId]);

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
      <div className="flex items-center gap-6 px-12 py-4 rounded-full bg-3 border border-b2 text-sm text-t4">
        <i className="ti ti-loader-2 animate-spin-slow text-base" />
        تحميل...
      </div>
    );
  }

  if (!selectedYear && years.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-6 px-12 py-5 rounded-full bg-3 border border-b2 cursor-pointer transition font-sans"
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--em)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--b2)')}
      >
        <i
          className={`ti ${selectedYear?.is_closed ? 'ti-lock' : 'ti-calendar-check'} text-base`}
          style={{ color: selectedYear?.is_closed ? 'var(--t4)' : 'var(--em)' }}
        />
        <span className="text-sm font-semibold text-t1">
          {selectedYear?.name ?? 'اختر سنة'}
        </span>
        {selectedYear?.is_current && (
          <i className="ti ti-star-filled text-gold text-9" />
        )}
        <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'} text-sm text-t4`} />
      </button>

      {isOpen && (
        <div className="absolute top-0 left-0 mt-6 min-w-52 bg-2 border border-b2 rounded-lg shadow-md z-1000 overflow-hidden rtl">
          {open.length > 0 && (
            <>
              <div className="px-12 py-6 text-xs font-extrabold text-em uppercase tracking-widest bg-3">
                مفتوحة
              </div>
              {open.map(year => (
                <YearOption
                  key={year.id}
                  year={year}
                  selected={selectedYear?.id === year.id}
                  onClick={() => {
                    setSelectedYear(year);
                    setIsOpen(false);
                  }}
                />
              ))}
            </>
          )}

          {closed.length > 0 && (
            <>
              <div className={`px-12 py-6 text-xs font-extrabold text-t4 uppercase tracking-widest bg-3 ${
                open.length ? 'border-t border-b1' : ''
              }`}>
                مقفلة
              </div>
              {closed.slice(0, 3).map(year => (
                <YearOption
                  key={year.id}
                  year={year}
                  selected={selectedYear?.id === year.id}
                  onClick={() => {
                    setSelectedYear(year);
                    setIsOpen(false);
                  }}
                />
              ))}
              {closed.length > 3 && (
                <div className="px-12 py-6 text-sm text-t4 italic">
                  + {closed.length - 3} سنوات أخرى...
                </div>
              )}
            </>
          )}

          <div className="border-t border-b1">
            <a
              href="/fiscalyears"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-6 px-12 py-8 text-sm text-em font-semibold no-underline transition hover:bg-3"
            >
              <i className="ti ti-settings text-base" />
              إدارة السنوات المالية
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function YearOption({
  year,
  selected,
  onClick,
}: {
  year: FiscalYear;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-14 py-8 cursor-pointer transition ${
        selected ? 'bg-emb' : 'hover:bg-3'
      }`}
    >
      <div className="flex items-center gap-8">
        <i
          className={`ti ${
            year.is_closed ? 'ti-lock' : year.is_current ? 'ti-star-filled' : 'ti-calendar'
          } text-base`}
          style={{
            color: year.is_closed ? 'var(--t4)' : year.is_current ? 'var(--gold)' : 'var(--em)',
          }}
        />
        <div>
          <div className={`text-base ${selected ? 'font-bold text-em' : 'font-medium text-t1'}`}>
            {year.name}
          </div>
          <div className="text-xs text-t4">
            {year.start_date?.split('-')[0]} — {year.end_date?.split('-')[0]}
          </div>
        </div>
      </div>
      {selected && <i className="ti ti-check text-em text-lg" />}
    </div>
  );
}
