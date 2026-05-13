// ════════════════════════════════════════════════════════════════════════════
// context/FiscalYearContext.tsx
// Fiscal Year Context — متكامل مع Zustand + React Query
// ════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import { useFiscalYears, useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { useAppStore } from '@/lib/store/appStore';
import type { FiscalYear } from '@/lib/api/core/types';

// ─── نوع السياق ─────────────────────────────────────────────────────────────

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

// ─── Provider ────────────────────────────────────────────────────────────────

export function FiscalYearProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, refetch } = useFiscalYears();
  const selectedYear    = useSelectedFiscalYear();
  const setSelectedYearId = useAppStore((s) => s.setSelectedYearId);

  const years   = data?.years   ?? [];
  const current = data?.current ?? null;
  const open    = data?.open    ?? [];
  const closed  = data?.closed  ?? [];

  const setSelectedYear = useCallback((year: FiscalYear) => {
    setSelectedYearId(year.id);
  }, [setSelectedYearId]);

  const goToCurrentYear = useCallback(() => {
    if (current) setSelectedYearId(current.id);
  }, [current, setSelectedYearId]);

  return (
    <FiscalYearContext.Provider
      value={{
        years,
        selectedYear,
        currentYear: current,
        open,
        closed,
        setSelectedYear,
        goToCurrentYear,
        isLoading,
        hasMultipleOpen: open.length > 1,
        refetch,
      }}
    >
      {children}
    </FiscalYearContext.Provider>
  );
}

// ─── Hook للوصول إلى السياق ─────────────────────────────────────────────────

export function useFiscalYear(): FiscalYearContextType {
  const ctx = useContext(FiscalYearContext);
  if (!ctx) throw new Error('useFiscalYear must be used within FiscalYearProvider');
  return ctx;
}

// ════════════════════════════════════════════════════════════════════════════
// FiscalYearSelector – منتقي السنة المالية (متوافق مع الهيكل الجديد)
// ════════════════════════════════════════════════════════════════════════════

export function FiscalYearSelector() {
  const { years, selectedYear, setSelectedYear, isLoading } = useFiscalYear();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (isLoading) {
    return (
      <div className="ib" style={{ opacity: 0.6 }}>
        <span className="ic ic-sm"><i className="ti ti-calendar" /></span>
        <span style={{ marginRight: 6, fontSize: 12 }}>...</span>
      </div>
    );
  }

  if (!selectedYear && years.length === 0) {
    return null;
  }

  const handleSelect = (year: FiscalYear) => {
    setSelectedYear(year);
    setOpen(false);
  };

  // ترتيب السنوات: المفتوحة أولاً (غير المغلقة) ثم المغلقة
  const openYears = years.filter((y) => !y.is_closed);
  const closedYears = years.filter((y) => y.is_closed);
  const sortedYears = [...openYears, ...closedYears];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="ib"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--bg3, rgba(255,255,255,.05))',
          border: '1px solid var(--b2, rgba(255,255,255,.1))',
          borderRadius: 20,
          padding: '4px 12px',
          cursor: 'pointer',
          fontFamily: 'Tajawal, sans-serif',
        }}
      >
        <span className="ic ic-sm">
          <i className="ti ti-calendar" />
        </span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {selectedYear?.name ?? 'اختر سنة'}
        </span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 12 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            background: 'var(--bg2)',
            border: '1px solid var(--b2)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,.3)',
            zIndex: 1000,
            minWidth: 160,
            overflow: 'hidden',
            direction: 'rtl',
          }}
        >
          {sortedYears.map((year) => (
            <button
              key={year.id}
              onClick={() => handleSelect(year)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 14px',
                background:
                  selectedYear?.id === year.id
                    ? 'var(--emb, rgba(13,191,132,.15))'
                    : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--b1)',
                cursor: 'pointer',
                fontFamily: 'Tajawal, sans-serif',
                textAlign: 'right',
                transition: 'background .1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
              onMouseLeave={(e) => {
                if (selectedYear?.id !== year.id)
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>{year.name}</span>
              {selectedYear?.id === year.id && (
                <i className="ti ti-check" style={{ color: 'var(--em)', fontSize: 14 }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
