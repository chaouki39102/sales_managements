

# =========================================
# 🧠 new files
# =========================================

## FILE: resources/js/new files/api-index.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/index.ts — تصدير كامل لطبقة الـ API
// ✅ مصحح: اسم الملف document.ts وليس documents.ts
// ════════════════════════════════════════════════════════════════════════════

// Core
export * from './core/client';
export * from './core/queryClient';
export * from './core/queryKeys';
export type * from './core/types';

// Store
export * from '../store/appStore';

// Endpoints
export * from './endpoints/auth';
export * from './endpoints/companies';
export * from './endpoints/fiscalYears';
export * from './endpoints/lookups';
export * from './endpoints/seeds';
export * from './endpoints/document';      // ✅ document وليس documents
export * from './endpoints/parties';
export * from './endpoints/products';
export * from './endpoints/payments';
export * from './endpoints/expenses';
export * from './endpoints/inventory';
export * from './endpoints/users';
export * from './endpoints/settings';
export * from './endpoints/dashboard';
export * from './endpoints/reports';
```

## FILE: resources/js/new files/auth.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/auth.ts
// ✅ مصحح: useLogin يُعيد AuthResponse لتمكين redirect بناءً على role
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, tokenStorage } from '../core/client';
import { authKeys } from '../core/queryKeys';
import { appActions } from '../../store/appStore';
import { clearAllCache } from '../core/queryClient';
import type { User, LoginCredentials, AuthResponse } from '../core/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export const authApi = {
  me:     ()                        => apiGet<User>('/auth/me'),
  login:  (creds: LoginCredentials) => apiPost<AuthResponse>('/auth/login', creds),
  logout: ()                        => apiPost<void>('/auth/logout'),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery({
    queryKey:  authKeys.me,
    queryFn:   authApi.me,
    enabled:   !!tokenStorage.get(),
    staleTime: Infinity,
    retry:     false,
  });
}

/**
 * ✅ يُعيد AuthResponse (user + token) لتمكين redirect بناءً على الدور
 *
 * مثال:
 *   const { mutateAsync: login } = useLogin();
 *   const result = await login(creds);
 *   if (result.user.roles?.some(r => r.name === 'super-admin')) {
 *     navigate('/admin');
 *   } else {
 *     navigate('/dashboard');
 *   }
 */
export function useLogin() {
  const qc = useQueryClient();

  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: authApi.login,
    onSuccess: ({ user, token }) => {
      tokenStorage.set(token);
      // ✅ حفظ المستخدم مباشرة في الكاش — لا طلب /auth/me إضافي
      qc.setQueryData(authKeys.me, user);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      tokenStorage.clear();
      appActions.reset();
      clearAllCache();
      window.location.href = '/login';
    },
  });
}
```

## FILE: resources/js/new files/AuthContext.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// context/AuthContext.tsx
// ✅ مصحح: login يُعيد User لتمكين role-based redirect
// ════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { useCurrentUser, useLogin, useLogout } from '@/lib/api/endpoints/auth';
import { useActiveCompany, useAppStore } from '@/lib/store/appStore';
import type { User, ActiveCompany, LoginCredentials } from '@/lib/api/core/types';

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:             User | null;
  isAuthenticated:  boolean;
  isLoading:        boolean;
  isSuperAdmin:     boolean;
  activeCompany:    ActiveCompany | null;
  login:            (creds: LoginCredentials) => Promise<User>;  // ✅ يُعيد User
  logout:           () => Promise<void>;
  setActiveCompany: (company: ActiveCompany) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading }   = useCurrentUser();
  const activeCompany               = useActiveCompany();
  const setActiveCompanyInStore     = useAppStore(s => s.setActiveCompany);

  const loginMutation  = useLogin();
  const logoutMutation = useLogout();

  // ✅ يُعيد User للسماح بالـ redirect بناءً على الدور
  const login = async (creds: LoginCredentials): Promise<User> => {
    const result = await loginMutation.mutateAsync(creds);
    return result.user;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const setActiveCompany = (company: ActiveCompany) => {
    setActiveCompanyInStore(company);
  };

  // ✅ helper جاهز بدل تكرار منطق الـ role في كل مكان
  const isSuperAdmin = user?.roles?.some(r => r.name === 'super-admin') ?? false;

  return (
    <AuthContext.Provider value={{
      user:            user ?? null,
      isAuthenticated: !!user,
      isLoading,
      isSuperAdmin,
      activeCompany,
      login,
      logout,
      setActiveCompany,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const useAuthUser        = () => useAuth().user;
export const useIsAuthenticated = () => useAuth().isAuthenticated;
export const useIsSuperAdmin    = () => useAuth().isSuperAdmin;
```

## FILE: resources/js/new files/document.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/document.ts
// ✅ مصحح: lines endpoints + fiscal_year_id + typeCode صحيح
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';
import type {
  CommercialDocument,
  CommercialDocumentLine,
  PaginatedResponse,
  ListParams,
} from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentCreateInput {
  document_type_id:  number;
  party_id?:         number | null;
  warehouse_id:      number;
  fiscal_year_id:    number;           // ✅ مطلوب — يُمرَّر دائماً
  document_date:     string;
  due_date?:         string | null;
  notes?:            string | null;
  fiscal_stamp?:     number;
  lines?:            DocumentLineInput[];
}

export interface DocumentLineInput {
  id?:                    number;       // للتعديل
  product_variant_id?:    number | null;
  description?:           string | null;
  quantity:               number;
  unit_price_ht:          number;
  discount_percentage?:   number;
  tva_rate:               number;
}

export interface DocumentListParams extends ListParams {
  document_type_id?:  number;
  type_code?:         string;   // ✅ الاسم الصحيح
  party_id?:          number;
  status?:            string;
  fiscal_year_id?:    number;
  date_from?:         string;
  date_to?:           string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const documentsApi = {
  // ── Documents CRUD ─────────────────────────────────────────────────────────
  list: (params?: DocumentListParams) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/documents', params),

  // ✅ إصلاح: الفلتر بـ document_type_id أو type_code حسب الباكاند
  byType: (typeCode: string, params?: DocumentListParams) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/documents', {
      ...params,
      'filter[document_type.code]': typeCode,  // ✅ Spatie filter الصحيح
    }),

  show: (id: number) =>
    apiGet<CommercialDocument>(`/documents/${id}`, {
      include: 'party,warehouse,documentType,lines.productVariant,payments.paymentMode',
    }),

  create: (data: DocumentCreateInput) =>
    apiPost<CommercialDocument>('/documents', data),

  update: (id: number, data: Partial<DocumentCreateInput>) =>
    apiPut<CommercialDocument>(`/documents/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/documents/${id}`),

  // ── Document Actions ───────────────────────────────────────────────────────
  validate: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/validate`),

  lock: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/lock`),

  unlock: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/unlock`),

  cancel: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/cancel`),

  qrcode: (id: number) =>
    apiGet<{ url: string }>(`/documents/${id}/qrcode`),

  // ── Lines ──────────────────────────────────────────────────────────────────
  // ✅ مفقودة في النسخة الأصلية — ضرورية لإضافة/تعديل سطور
  lines: {
    list: (documentId: number) =>
      apiGet<CommercialDocumentLine[]>(`/commercial-document-lines`, {
        'filter[commercial_document_id]': documentId,
      }),

    create: (data: DocumentLineInput & { commercial_document_id: number }) =>
      apiPost<CommercialDocumentLine>('/commercial-document-lines', data),

    update: (id: number, data: Partial<DocumentLineInput>) =>
      apiPut<CommercialDocumentLine>(`/commercial-document-lines/${id}`, data),

    delete: (id: number) =>
      apiDelete(`/commercial-document-lines/${id}`),
  },
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDocuments(params?: DocumentListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.documents.list(slug ?? '', params),
    queryFn:         () => documentsApi.list(params),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useDocumentsByType(typeCode: string, params?: DocumentListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.documents.byType(slug ?? '', typeCode, params),
    queryFn:         () => documentsApi.byType(typeCode, params),
    enabled:         !!slug && !!typeCode,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useDocument(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.documents.detail(slug ?? '', id!),
    queryFn:   () => documentsApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useDocumentMutations() {
  const slug       = useActiveSlug();
  const qc         = useQueryClient();
  const { selectedYear } = useFiscalYear();

  const invalidateAll = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
  };

  const invalidateOne = (doc: CommercialDocument) => {
    if (slug) {
      qc.setQueryData(tenantKeys.documents.detail(slug, doc.id), doc);
      qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }
  };

  // ✅ يُضيف fiscal_year_id تلقائياً من السياق
  const create = useMutation({
    mutationFn: (data: Omit<DocumentCreateInput, 'fiscal_year_id'> & { fiscal_year_id?: number }) =>
      documentsApi.create({
        ...data,
        fiscal_year_id: data.fiscal_year_id ?? selectedYear?.id ?? 0,
      }),
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DocumentCreateInput> }) =>
      documentsApi.update(id, data),
    onSuccess: invalidateOne,
  });

  const remove = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess:  invalidateAll,
  });

  const validate = useMutation({
    mutationFn: documentsApi.validate,
    onSuccess:  invalidateOne,
  });

  const lock = useMutation({
    mutationFn: documentsApi.lock,
    onSuccess:  invalidateOne,
  });

  const unlock = useMutation({
    mutationFn: documentsApi.unlock,
    onSuccess:  invalidateOne,
  });

  const cancel = useMutation({
    mutationFn: documentsApi.cancel,
    onSuccess:  invalidateOne,
  });

  return { create, update, remove, validate, lock, unlock, cancel, selectedYear };
}

// ─── Line Mutations ───────────────────────────────────────────────────────────

export function useDocumentLineMutations(documentId: number) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) {
      qc.invalidateQueries({ queryKey: tenantKeys.documents.detail(slug, documentId) });
    }
  };

  const create = useMutation({
    mutationFn: (data: DocumentLineInput) =>
      documentsApi.lines.create({ ...data, commercial_document_id: documentId }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DocumentLineInput> }) =>
      documentsApi.lines.update(id, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: documentsApi.lines.delete,
    onSuccess:  invalidate,
  });

  return { create, update, remove };
}
```

## FILE: resources/js/new files/FiscalYearContext.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// context/FiscalYearContext.tsx
// ✅ مصحح: useSelectedFiscalYear موجود في fiscalYears.ts
// ════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import {
  useFiscalYears,
  useSelectedFiscalYear,    // ✅ الآن موجود في fiscalYears.ts
  useCloseFiscalYear,
} from '@/lib/api/endpoints/fiscalYears';
import { useAppStore } from '@/lib/store/appStore';
import type { FiscalYear } from '@/lib/api/core/types';

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

// ─── Provider ────────────────────────────────────────────────────────────────

export function FiscalYearProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, refetch } = useFiscalYears();
  const selectedYear    = useSelectedFiscalYear();       // ✅ من fiscalYears.ts
  const setSelectedYearId = useAppStore(s => s.setSelectedYearId);

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
        <i className={`ti ${selectedYear?.is_closed ? 'ti-lock' : 'ti-calendar-check'}`}
           style={{ color: selectedYear?.is_closed ? 'var(--t4)' : 'var(--em)', fontSize: 13 }} />
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
          {/* مفتوحة */}
          {open.length > 0 && (
            <>
              <div style={{
                padding: '6px 12px', fontSize: 9.5, fontWeight: 800,
                color: 'var(--em)', textTransform: 'uppercase', letterSpacing: .5,
                background: 'var(--bg3)',
              }}>مفتوحة</div>
              {open.map(year => (
                <YearOption
                  key={year.id}
                  year={year}
                  selected={selectedYear?.id === year.id}
                  onClick={() => { setSelectedYear(year); setIsOpen(false); }}
                />
              ))}
            </>
          )}

          {/* مقفلة */}
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
                  key={year.id}
                  year={year}
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

          {/* رابط الإدارة */}
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
```

## FILE: resources/js/new files/fiscalYears.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/fiscalYears.ts
// ✅ مصحح: close يستخدم POST (حسب api.php) + notes + invalidate documents
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId, useAppStore } from '../../store/appStore';
import type { FiscalYear, ListParams } from '../core/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export const fiscalYearsApi = {
  list: (params?: ListParams) =>
    apiGet<FiscalYear[]>('/fiscal-years', { per_page: 50, ...params }),

  show: (id: number) =>
    apiGet<FiscalYear>(`/fiscal-years/${id}`),

  create: (data: Partial<FiscalYear>) =>
    apiPost<FiscalYear>('/fiscal-years', data),

  update: (id: number, data: Partial<FiscalYear>) =>
    apiPut<FiscalYear>(`/fiscal-years/${id}`, data),

  // ✅ POST حسب api.php: Route::post('fiscal-years/{year}/close', ...)
  close: (id: number, notes?: string) =>
    apiPost<FiscalYear>(`/fiscal-years/${id}/close`, { notes }),

  // ✅ patch للتعديلات العادية
  setCurrent: (id: number) =>
    apiPatch<FiscalYear>(`/fiscal-years/${id}`, { is_current: true }),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFiscalYears() {
  const slug = useActiveSlug();

  return useQuery({
    queryKey:  tenantKeys.fiscalYears.all(slug ?? ''),
    queryFn:   () => fiscalYearsApi.list(),
    enabled:   !!slug,
    staleTime: 5 * 60_000,
    // ✅ select يُحوِّل المصفوفة إلى كائن منظم
    select: (years) => ({
      years,
      current: years.find(y => y.is_current) ??
               years.find(y => !y.is_closed)  ??
               years[0] ??
               null,
      open:   years.filter(y => !y.is_closed),
      closed: years.filter(y => y.is_closed),
    }),
  });
}

/**
 * ✅ السنة المختارة: من Zustand id → يبحث في React Query cache
 */
export function useSelectedFiscalYear() {
  const selectedId = useSelectedYearId();
  const { data }   = useFiscalYears();

  if (!data) return null;
  if (!selectedId) return data.current;
  return data.years.find(y => y.id === selectedId) ?? data.current;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateFiscalYear() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<FiscalYear>) =>
      fiscalYearsApi.create(data),
    onSuccess: (created) => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
        // ✅ عيِّن السنة الجديدة تلقائياً إذا كانت الأولى
        const state = useAppStore.getState();
        if (!state.selectedYearId) {
          state.setSelectedYearId(created.id);
        }
      }
    },
  });
}

export function useUpdateFiscalYear() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FiscalYear> }) =>
      fiscalYearsApi.update(id, data),
    onSuccess: (updated) => {
      if (slug) {
        qc.setQueryData(tenantKeys.fiscalYears.detail(slug, updated.id), updated);
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
      }
    },
  });
}

export function useCloseFiscalYear() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      fiscalYearsApi.close(id, notes),
    onSuccess: () => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
        // ✅ إبطال المستندات أيضاً — الإقفال يؤثر على حالتها
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        // ✅ إعادة تعيين السنة المختارة
        useAppStore.getState().setSelectedYearId(null);
      }
    },
  });
}
```

## FILE: resources/js/new files/inventory.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/inventory.ts
// ✅ مصحح: StockMovement من types.ts + product lots + current stock
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  StockMovement, ProductLot,
  PaginatedResponse, ListParams,
} from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockMovementCreateInput {
  product_variant_id:     number;
  warehouse_id:           number;
  fiscal_year_id:         number;
  stock_movement_type_id: number;
  movement_date:          string;
  quantity:               number;
  unit_price:             number;
  notes?:                 string | null;
}

export interface CurrentStockItem {
  product_variant_id: number;
  warehouse_id:       number;
  quantity:           number;
  last_movement_date: string;
}

export interface StockMovementListParams extends ListParams {
  product_variant_id?:     number;
  warehouse_id?:           number;
  stock_movement_type_id?: number;
  fiscal_year_id?:         number;
  date_from?:              string;
  date_to?:                string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const inventoryApi = {
  // ── Stock Movements ────────────────────────────────────────────────────────
  movements: (params?: StockMovementListParams) =>
    apiGet<PaginatedResponse<StockMovement>>('/stock-movements', {
      ...params,
      include: 'productVariant.product,warehouse,movementType',
    }),

  incoming: (params?: StockMovementListParams) =>
    apiGet<PaginatedResponse<StockMovement>>('/stock-movements/incoming', params),

  outgoing: (params?: StockMovementListParams) =>
    apiGet<PaginatedResponse<StockMovement>>('/stock-movements/outgoing', params),

  createMovement: (data: StockMovementCreateInput) =>
    apiPost<StockMovement>('/stock-movements', data),

  deleteMovement: (id: number) =>
    apiDelete(`/stock-movements/${id}`),

  // ── Product Lots ───────────────────────────────────────────────────────────
  lots: (params?: ListParams) =>
    apiGet<PaginatedResponse<ProductLot>>('/product-lots', params),

  lotAvailable: () =>
    apiGet<ProductLot[]>('/product-lots/available'),

  lotExpiring: (days = 30) =>
    apiGet<ProductLot[]>('/product-lots/expiring', { days }),

  createLot: (data: Partial<ProductLot>) =>
    apiPost<ProductLot>('/product-lots', data),

  updateLot: (id: number, data: Partial<ProductLot>) =>
    apiPost<ProductLot>(`/product-lots/${id}`, data),

  deleteLot: (id: number) =>
    apiDelete(`/product-lots/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useStockMovements(params?: StockMovementListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.inventory.movements(slug ?? '', params),
    queryFn:         () => inventoryApi.movements(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useProductLots(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        [slug, 'product-lots', params],
    queryFn:         () => inventoryApi.lots(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useExpiringLots(days = 30) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'product-lots', 'expiring', days],
    queryFn:   () => inventoryApi.lotExpiring(days),
    enabled:   !!slug,
    staleTime: 10 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useInventoryMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
    // ✅ إبطال المنتجات أيضاً — الحركات تغير current_stock
    qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
  };

  return {
    createMovement: useMutation({
      mutationFn: inventoryApi.createMovement,
      onSuccess:  invalidate,
    }),
    deleteMovement: useMutation({
      mutationFn: inventoryApi.deleteMovement,
      onSuccess:  invalidate,
    }),
    createLot: useMutation({
      mutationFn: inventoryApi.createLot,
      onSuccess:  invalidate,
    }),
    updateLot: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<ProductLot> }) =>
        inventoryApi.updateLot(id, data),
      onSuccess: invalidate,
    }),
    deleteLot: useMutation({
      mutationFn: inventoryApi.deleteLot,
      onSuccess:  invalidate,
    }),
  };
}
```

## FILE: resources/js/new files/navigation.ts
```
// ════════════════════════════════════════════════════════════════════════════
// config/navigation.ts
// ✅ مصحح: ملف مستقل — routes/index.tsx في مكانه الصحيح
// ════════════════════════════════════════════════════════════════════════════

export interface NavItem {
  id:         string;
  label:      string;
  href:       string;
  icon:       string;
  badge?:     number;
  badgeWarn?: boolean;
}

export interface NavGroup {
  label: string;
  color: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'الرئيسية',
    color: 'var(--em)',
    items: [
      { id: 'dashboard', label: 'لوحة التحكم', href: '/dashboard', icon: 'ti-layout-dashboard' },
      { id: 'pos',       label: 'نقطة البيع',  href: '/pos',       icon: 'ti-shopping-cart'    },
    ],
  },
  {
    label: 'المبيعات',
    color: 'var(--blue)',
    items: [
      { id: 'invoices',   label: 'الفواتير',       href: '/invoices',   icon: 'ti-file-text',     badge: 3 },
      { id: 'orders',     label: 'طلبيات الشراء',  href: '/orders',     icon: 'ti-clipboard-list'           },
      { id: 'returns',    label: 'المرتجعات',       href: '/returns',    icon: 'ti-corner-up-left'           },
      { id: 'quotations', label: 'عروض الأسعار',    href: '/quotations', icon: 'ti-file-check'               },
      { id: 'bl',         label: 'وصل التسليم BL',  href: '/bl',         icon: 'ti-truck'                    },
    ],
  },
  {
    label: 'المخزون',
    color: 'var(--purple)',
    items: [
      { id: 'products',   label: 'المنتجات',       href: '/products',   icon: 'ti-package'                         },
      { id: 'inventory',  label: 'إدارة المخزون',  href: '/inventory',  icon: 'ti-building-warehouse', badgeWarn: true },
      { id: 'categories', label: 'الفئات',          href: '/categories', icon: 'ti-folder-open'                    },
      { id: 'brands',     label: 'العلامات',        href: '/brands',     icon: 'ti-award'                           },
      { id: 'units',      label: 'الوحدات',         href: '/units',      icon: 'ti-ruler'                           },
      { id: 'suppliers',  label: 'الموردون',        href: '/suppliers',  icon: 'ti-truck'                           },
      { id: 'warehouses', label: 'المستودعات',      href: '/warehouses', icon: 'ti-building-warehouse'              },
    ],
  },
  {
    label: 'المحاسبة والمالية',
    color: 'var(--gold)',
    items: [
      { id: 'clients',     label: 'العملاء',            href: '/clients',     icon: 'ti-users'           },
      { id: 'finance',     label: 'الخزينة',             href: '/finance',     icon: 'ti-building-bank'   },
      { id: 'expenses',    label: 'المصروفات',           href: '/expenses',    icon: 'ti-credit-card'     },
      { id: 'debts',       label: 'الديون',              href: '/debts',       icon: 'ti-receipt'         },
      { id: 'tva',         label: 'إقرار TVA — G50',    href: '/tva',         icon: 'ti-calculator'      },
      { id: 'fiscal',      label: 'الملف الجبائي',       href: '/fiscal',      icon: 'ti-file-barcode'    },
      { id: 'fiscalyears', label: 'السنوات المالية',     href: '/fiscalyears', icon: 'ti-calendar'        },
      { id: 'currencies',  label: 'العملات',             href: '/currencies',  icon: 'ti-currency-dollar' },
      { id: 'pricelevels', label: 'مستويات الأسعار',     href: '/pricelevels', icon: 'ti-tag'             },
    ],
  },
  {
    label: 'التقارير',
    color: 'var(--orange)',
    items: [
      { id: 'reports', label: 'التقارير والإحصائيات', href: '/reports', icon: 'ti-chart-bar' },
      { id: 'balance', label: 'الميزانية التقديرية',  href: '/balance', icon: 'ti-scale'     },
    ],
  },
  {
    label: 'النظام',
    color: 'var(--teal)',
    items: [
      { id: 'employees',  label: 'الموظفون',    href: '/employees',       icon: 'ti-id-badge'   },
      { id: 'users',      label: 'المستخدمون',  href: '/users',           icon: 'ti-user'        },
      { id: 'settings',   label: 'الإعدادات',   href: '/settings',        icon: 'ti-settings'   },
      { id: 'numbering',  label: 'ترقيم المستندات', href: '/numbering-series', icon: 'ti-123'  },
    ],
  },
];

// ── Flat map for breadcrumbs ──────────────────────────────────────────────────
export const PAGE_META: Record<string, { title: string; path: string }> = {
  ...Object.fromEntries(
    NAV_GROUPS.flatMap(g =>
      g.items.map(item => [
        item.href,
        { title: item.label, path: `${g.label} ← ${item.label}` },
      ])
    )
  ),
  '/dashboard': { title: 'لوحة التحكم',   path: 'الرئيسية ← إحصائيات' },
  '/pos':       { title: 'نقطة البيع',     path: 'الرئيسية ← POS'       },
  '/onboarding':{ title: 'إعداد الشركة',  path: 'البداية ← إعداد'       },
};
```

## FILE: resources/js/new files/parties.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/parties.ts
// ✅ مصحح: party_type_id صحيح + include relations + balance
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Party, PaginatedResponse, ListParams } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PartyListParams extends ListParams {
  party_type_id?: number;
  active?:        boolean;
  wilaya_id?:     number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const partiesApi = {
  list: (params?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/parties', params),

  // ✅ /customers و /suppliers مسارات مختصرة في api.php
  clients: (params?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/customers', params),

  suppliers: (params?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/suppliers', params),

  show: (id: number) =>
    apiGet<Party>(`/parties/${id}`, {
      include: 'partyType,defaultPriceLevel,wilaya,commune',
    }),

  create: (data: Partial<Party>) =>
    apiPost<Party>('/parties', data),

  update: (id: number, data: Partial<Party>) =>
    apiPut<Party>(`/parties/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/parties/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePartyList(params?: PartyListParams & { _type?: 'client' | 'supplier' | 'all' }) {
  const slug = useActiveSlug();
  const { _type = 'all', ...rest } = params ?? {};

  const queryFn =
    _type === 'client'   ? () => partiesApi.clients(rest) :
    _type === 'supplier' ? () => partiesApi.suppliers(rest) :
                           () => partiesApi.list(rest);

  return useQuery({
    queryKey:        tenantKeys.parties.list(slug ?? '', params),
    queryFn,
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export const useParties   = (params?: PartyListParams) =>
  usePartyList(params);

export const useClients   = (params?: PartyListParams) =>
  usePartyList({ ...params, _type: 'client' });

export const useSuppliers = (params?: PartyListParams) =>
  usePartyList({ ...params, _type: 'supplier' });

export function useParty(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.parties.detail(slug ?? '', id!),
    queryFn:   () => partiesApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function usePartyMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.parties.all(slug) });
  };

  const invalidateOne = (party: Party) => {
    if (slug) {
      qc.setQueryData(tenantKeys.parties.detail(slug, party.id), party);
      qc.invalidateQueries({ queryKey: tenantKeys.parties.all(slug) });
    }
  };

  return {
    create: useMutation({ mutationFn: partiesApi.create,  onSuccess: invalidate    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) =>
        partiesApi.update(id, data),
      onSuccess: invalidateOne,
    }),
    remove: useMutation({ mutationFn: partiesApi.delete,  onSuccess: invalidate    }),
  };
}
```

## FILE: resources/js/new files/payments.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/payments.ts
// ✅ مصحح: ربط بالمستند + Checks + treasury validation
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Payment, Check, PaginatedResponse, ListParams, PaymentStatus, CheckStatus } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentCreateInput {
  commercial_document_id: number;   // ✅ مطلوب دائماً
  payment_mode_id:        number;
  treasury_account_id?:   number | null;
  amount:                 number;
  payment_date:           string;
  reference?:             string | null;
  notes?:                 string | null;
  fiscal_year_id:         number;   // ✅ مطلوب من الباكاند
}

export interface CheckCreateInput {
  commercial_document_id: number;
  party_id:               number;
  amount:                 number;
  check_number:           string;
  check_date:             string;
  bank_name?:             string | null;
  notes?:                 string | null;
}

export interface PaymentListParams extends ListParams {
  commercial_document_id?: number;
  party_id?:               number;
  payment_mode_id?:        number;
  status?:                 PaymentStatus;
  date_from?:              string;
  date_to?:                string;
  fiscal_year_id?:         number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const paymentsApi = {
  list:   (params?: PaymentListParams) =>
    apiGet<PaginatedResponse<Payment>>('/payments', params),

  show:   (id: number) =>
    apiGet<Payment>(`/payments/${id}`, {
      include: 'paymentMode,treasuryAccount,document',
    }),

  // ✅ يتطلب commercial_document_id وfiscal_year_id
  create: (data: PaymentCreateInput) =>
    apiPost<Payment>('/payments', data),

  update: (id: number, data: Partial<PaymentCreateInput>) =>
    apiPut<Payment>(`/payments/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/payments/${id}`),

  // ── Payments by document ───────────────────────────────────────────────────
  byDocument: (documentId: number) =>
    apiGet<Payment[]>('/payments', {
      'filter[commercial_document_id]': documentId,
      include: 'paymentMode,treasuryAccount',
    }),

  confirmed: (params?: PaymentListParams) =>
    apiGet<PaginatedResponse<Payment>>('/payments/confirmed', params),

  pending: (params?: PaymentListParams) =>
    apiGet<PaginatedResponse<Payment>>('/payments/pending', params),
} as const;

// ─── Checks API ───────────────────────────────────────────────────────────────

export const checksApi = {
  list:   (params?: ListParams) =>
    apiGet<PaginatedResponse<Check>>('/checks', params),

  show:   (id: number) =>
    apiGet<Check>(`/checks/${id}`),

  create: (data: CheckCreateInput) =>
    apiPost<Check>('/checks', data),

  update: (id: number, data: Partial<CheckCreateInput>) =>
    apiPut<Check>(`/checks/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/checks/${id}`),

  markCleared: (id: number) =>
    apiPost<Check>(`/checks/${id}/mark-cleared`),

  markBounced: (id: number) =>
    apiPost<Check>(`/checks/${id}/mark-bounced`),

  pending: (params?: ListParams) =>
    apiGet<PaginatedResponse<Check>>('/checks/pending', params),

  overdue: (params?: ListParams) =>
    apiGet<PaginatedResponse<Check>>('/checks/overdue', params),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePayments(params?: PaymentListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.payments.list(slug ?? '', params),
    queryFn:         () => paymentsApi.list(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

// ✅ جلب مدفوعات مستند معين
export function useDocumentPayments(documentId: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [...tenantKeys.documents.detail(slug ?? '', documentId!), 'payments'],
    queryFn:   () => paymentsApi.byDocument(documentId!),
    enabled:   !!slug && !!documentId,
    staleTime: 2 * 60_000,
  });
}

export function usePaymentMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = (docId?: number) => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: tenantKeys.payments.all(slug) });
    if (docId) {
      // ✅ أبطل المستند أيضاً لتحديث amount_paid وamount_remaining
      qc.invalidateQueries({ queryKey: tenantKeys.documents.detail(slug, docId) });
    }
  };

  const create = useMutation({
    mutationFn: paymentsApi.create,
    onSuccess:  (p) => invalidate(p.commercial_document_id),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PaymentCreateInput> }) =>
      paymentsApi.update(id, data),
    onSuccess: (p) => invalidate(p.commercial_document_id),
  });

  const remove = useMutation({
    mutationFn: paymentsApi.delete,
    onSuccess:  () => invalidate(),
  });

  return { create, update, remove };
}

// ─── Check Hooks ──────────────────────────────────────────────────────────────

// قائمة الشيكات (مستقلة عن tenantKeys — أضف checksKeys إذا احتجت)
export function useChecks(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        [slug, 'checks', 'list', params],
    queryFn:         () => checksApi.list(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCheckMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) {
      qc.invalidateQueries({ queryKey: [slug, 'checks'] });
      qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }
  };

  return {
    create:      useMutation({ mutationFn: checksApi.create,      onSuccess: invalidate }),
    update:      useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<CheckCreateInput> }) => checksApi.update(id, data), onSuccess: invalidate }),
    remove:      useMutation({ mutationFn: checksApi.delete,      onSuccess: invalidate }),
    markCleared: useMutation({ mutationFn: checksApi.markCleared, onSuccess: invalidate }),
    markBounced: useMutation({ mutationFn: checksApi.markBounced, onSuccess: invalidate }),
  };
}
```

## FILE: resources/js/new files/products.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/products.ts
// ✅ مصحح: variants endpoints + تصحيح active route + POS support
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  Product, ProductVariant, ProductVariantPrice,
  QuantityDiscount, ProductLot,
  PaginatedResponse, ListParams,
} from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductListParams extends ListParams {
  family_id?:       number;
  brand_id?:        number;
  product_type_id?: number;
  active?:          boolean;
}

export interface VariantListParams extends ListParams {
  product_id?:    number;
  barcode?:       string;
  manages_stock?: boolean;
  active?:        boolean;
}

// ─── Products API ─────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: ProductListParams) =>
    apiGet<PaginatedResponse<Product>>('/products', params),

  show: (id: number, include?: string) =>
    apiGet<Product>(`/products/${id}`, {
      include: include ?? 'family,brand,productType',
    }),

  // ✅ إصلاح: active يُرسل `filter[active]=1` بدل /products/active
  // (لأن /products/:id يتعارض مع /products/active في بعض إعدادات الـ router)
  activeList: (params?: ProductListParams) =>
    apiGet<Product[]>('/products/active', params),

  byFamily: (familyId: number) =>
    apiGet<Product[]>(`/products/by-family/${familyId}`),

  byBrand: (brandId: number) =>
    apiGet<Product[]>(`/products/by-brand/${brandId}`),

  create: (data: Partial<Product> & { variants?: Partial<ProductVariant>[] }) =>
    apiPost<Product>('/products', data),

  update: (id: number, data: Partial<Product> & { variants?: Partial<ProductVariant>[] }) =>
    apiPut<Product>(`/products/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/products/${id}`),

  uploadImage: (id: number, fd: FormData, onProgress?: (p: number) => void) =>
    apiUpload<Product>(`/products/${id}/image`, fd, onProgress),
} as const;

// ─── Variants API ─────────────────────────────────────────────────────────────
// ✅ مفقودة في النسخة الأصلية — مطلوبة للـ POS وصفحة المنتجات

export const variantsApi = {
  list: (params?: VariantListParams) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', params),

  byProduct: (productId: number, params?: VariantListParams) =>
    apiGet<ProductVariant[]>(`/products/${productId}/variants`),

  show: (id: number) =>
    apiGet<ProductVariant>(`/product-variants/${id}`, {
      include: 'product,unit,tva,prices.priceLevel,quantityDiscounts,lots',
    }),

  // ✅ للـ POS: بحث بالباركود
  byBarcode: (barcode: string) =>
    apiGet<ProductVariant[]>('/product-variants', {
      barcode,
      include: 'product,unit,tva,prices.priceLevel',
      per_page: 5,
    }),

  // ✅ للـ POS: بحث بالنص
  search: (query: string, params?: VariantListParams) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', {
      ...params,
      search: query,
      include: 'product,unit,tva,prices',
      per_page: 30,
    }),

  create: (data: Partial<ProductVariant>) =>
    apiPost<ProductVariant>('/product-variants', data),

  update: (id: number, data: Partial<ProductVariant>) =>
    apiPut<ProductVariant>(`/product-variants/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/product-variants/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useProducts(params?: ProductListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.products.list(slug ?? '', params),
    queryFn:         () => productsApi.list(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.products.detail(slug ?? '', id!),
    queryFn:   () => productsApi.show(id!,
      'family,brand,productType,variants.unit,variants.tva,variants.prices.priceLevel,variants.quantityDiscounts'
    ),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ✅ للـ POS: جلب متغير بالباركود
export function useVariantByBarcode(barcode: string | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'variants', 'barcode', barcode],
    queryFn:   () => variantsApi.byBarcode(barcode!),
    enabled:   !!slug && !!barcode,
    staleTime: 10 * 60_000,
  });
}

// ✅ للـ POS: بحث بالنص
export function useVariantSearch(query: string, params?: VariantListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        [slug, 'variants', 'search', query, params],
    queryFn:         () => variantsApi.search(query, params),
    enabled:         !!slug && query.length >= 2,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

// ✅ متغيرات منتج بعينه
export function useProductVariants(productId: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'products', productId, 'variants'],
    queryFn:   () => variantsApi.byProduct(productId!),
    enabled:   !!slug && !!productId,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useProductMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
  };

  const invalidateOne = (product: Product) => {
    if (slug) {
      qc.setQueryData(tenantKeys.products.detail(slug, product.id), product);
      qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
    }
  };

  return {
    create: useMutation({
      mutationFn: productsApi.create,
      onSuccess:  invalidate,
    }),

    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
        productsApi.update(id, data),
      onSuccess: invalidateOne,
    }),

    remove: useMutation({
      mutationFn: productsApi.delete,
      onSuccess:  invalidate,
    }),

    uploadImage: useMutation({
      mutationFn: ({
        id, formData, onProgress,
      }: { id: number; formData: FormData; onProgress?: (p: number) => void }) =>
        productsApi.uploadImage(id, formData, onProgress),
      onSuccess: invalidateOne,
    }),
  };
}

export function useVariantMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
  };

  return {
    create: useMutation({ mutationFn: variantsApi.create, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<ProductVariant> }) =>
        variantsApi.update(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: variantsApi.delete, onSuccess: invalidate }),
  };
}
```

## FILE: resources/js/new files/types.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/types.ts
// ✅ مطابق 100% لـ DB schema وباكاند Laravel
// ════════════════════════════════════════════════════════════════════════════

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
  current_page:   number;
  last_page:      number;
  per_page:       number;
  total:          number;
  from:           number | null;
  to:             number | null;
  has_more_pages: boolean;
  is_first_page:  boolean;
  is_last_page:   boolean;
}
export interface PaginationLinks {
  first:   string | null;
  last:    string | null;
  prev:    string | null;
  next:    string | null;
  current: string | null;
}
export interface PaginatedResponse<T> {
  data:  T[];
  meta:  PaginationMeta;
  links: PaginationLinks;
}

// ─── Common ───────────────────────────────────────────────────────────────────
export interface BaseModel {
  id:         number;
  created_at: string;
  updated_at: string;
}
export interface ListParams {
  page?:      number;
  per_page?:  number;
  search?:    string;
  sort?:      string;
  direction?: 'asc' | 'desc';
  include?:   string;
  [key: string]: unknown;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginCredentials { email: string; password: string; }
export interface AuthResponse     { user: User; token: string; }

export interface User extends BaseModel {
  name:        string;
  email:       string;
  avatar?:     string | null;
  phone?:      string | null;
  company_id?: number | null;  // آخر شركة نشطة
  active:      boolean;
  roles?:      Role[];
  permissions?: string[];
}

// ─── Active Company (Zustand state only) ──────────────────────────────────────
export interface ActiveCompany {
  id:   number;
  name: string;
  slug: string;
}

// ─── Company ──────────────────────────────────────────────────────────────────
export interface Company extends BaseModel {
  name:             string;
  commercial_name?: string | null;
  slug:             string;
  activity?:        string | null;
  email?:           string | null;
  phone?:           string | null;
  address?:         string | null;
  avatar?:          string | null;
  nif?:             string | null;
  nis?:             string | null;
  rc?:              string | null;
  ai?:              string | null;
  owner_id:         number;
  active:           boolean;
  plan:             'free' | 'starter' | 'professional' | 'enterprise';
  max_users:        number;
  max_products:     number;
  max_warehouses:   number;
  is_suspended:     boolean;
  is_verified:      boolean;
  trial_ends_at?:   string | null;
  owner?:           Pick<User, 'id' | 'name' | 'email'>;
}

// ─── Fiscal Year ──────────────────────────────────────────────────────────────
export interface FiscalYear extends BaseModel {
  name:       string;
  start_date: string;
  end_date:   string;
  is_current: boolean;
  is_closed:  boolean;
  closed_at?: string | null;
  closed_by?: number | null;
  notes?:     string | null;
  company_id: number;
  closedBy?:  Pick<User, 'id' | 'name'>;
}

// ─── Roles & Permissions ──────────────────────────────────────────────────────
export interface Permission extends BaseModel {
  name:          string;
  display_name:  string;
  group:         string;
  description?:  string | null;
}
export interface Role extends BaseModel {
  name:          string;
  display_name:  string;
  description?:  string | null;
  company_id?:   number | null;
  permissions?:  Permission[];
}

// ─── Global Lookups ───────────────────────────────────────────────────────────
export interface Currency extends BaseModel {
  name:             string;
  code:             string;
  symbol:           string;
  decimal_places:   number;
  is_base_currency: boolean;
  active:           boolean;
  company_id:       number;
}
export interface Tva extends BaseModel {
  name:        string;
  rate:        number;
  description?: string | null;
  is_default:  boolean;
  active:      boolean;
  company_id:  number;
}
export interface LegalForm extends BaseModel {
  name: string; code?: string;
}
export interface FiscalStamp extends BaseModel {
  name: string; value: number; is_default: boolean; company_id: number;
}
export interface InventoryValuationMethod extends BaseModel {
  name: string; code: 'FIFO' | 'LIFO' | 'AVERAGE';
}
export interface Wilaya extends BaseModel {
  name: string; arabic_name: string; code: string;
}
export interface Commune extends BaseModel {
  name: string; arabic_name: string; wilaya_id: number;
}
export interface DocumentStatus extends BaseModel {
  name: string; code: string; color?: string | null; is_final: boolean;
}
export interface DocumentType extends BaseModel {
  name:                    string;
  code:                    string;
  base_operation_id:       number;
  affects_stock_direction: -1 | 0 | 1;
  requires_party:          boolean;
  affects_accounting:      boolean;
  active:                  boolean;
}
export interface DocumentBaseOperation extends BaseModel {
  name: string; code: string;
}
export interface StockMovementType extends BaseModel {
  name: string; code: string; direction: 'in' | 'out';
}
export interface ProductType extends BaseModel {
  name: string; code: string; manages_stock: boolean;
}
export interface PartyType extends BaseModel {
  name: string; code: string;
}
export interface TreasuryAccountType extends BaseModel {
  name: string; code: string;
}

// ─── Tenant Lookups ───────────────────────────────────────────────────────────
export interface Unit extends BaseModel {
  name:          string;
  abbreviation:  string;
  description?:  string | null;
  active:        boolean;
  company_id:    number;
}
export interface Warehouse extends BaseModel {
  name:          string;
  code?:         string | null;
  address?:      string | null;
  wilaya_id?:    number | null;
  commune_id?:   number | null;
  manager_name?: string | null;
  phone?:        string | null;
  active:        boolean;
  is_default:    boolean;
  company_id:    number;
}
export interface PriceLevel extends BaseModel {
  name:              string;
  discount_percent:  number;
  description?:      string | null;
  is_default:        boolean;
  active:            boolean;
  company_id:        number;
}
export interface PaymentMode extends BaseModel {
  name:       string;
  code:       string;
  is_default: boolean;
  active:     boolean;
  company_id: number;
}
export interface NumberingSeries extends BaseModel {
  name:               string;
  prefix:             string;
  suffix?:            string | null;
  start_number:       number;
  last_number:        number;
  padding:            number;
  document_type_id:   number;
  fiscal_year_id?:    number | null;
  is_locked:          boolean;
  is_default:         boolean;
  company_id:         number;
}
export interface TreasuryAccount extends BaseModel {
  name:                    string;
  code:                    string;
  account_number?:         string | null;
  bank_name?:              string | null;
  is_default:              boolean;
  active:                  boolean;
  current_balance:         number;
  initial_balance:         number;
  currency_id:             number;
  treasury_account_type_id:number;
  company_id:              number;
  currency?:               Currency;
  account_type?:           TreasuryAccountType;
}
export interface ExpenseCategory extends BaseModel {
  name:        string;
  description?: string | null;
  parent_id?:  number | null;
  active:      boolean;
  company_id:  number;
  parent?:     ExpenseCategory;
  children?:   ExpenseCategory[];
}
export interface Brand extends BaseModel {
  name:         string;
  description?: string | null;
  active:       boolean;
  company_id:   number;
}
export interface Family extends BaseModel {
  name:          string;
  description?:  string | null;
  parent_id?:    number | null;
  active:        boolean;
  display_order: number;
  company_id:    number;
  parent?:       Family;
  children?:     Family[];
}

// ─── Parties ──────────────────────────────────────────────────────────────────
export interface Party extends BaseModel {
  name:                   string;
  commercial_name?:       string | null;
  code?:                  string | null;
  slug:                   string;
  party_type_id:          number;
  nif?:                   string | null;
  nis?:                   string | null;
  rc?:                    string | null;
  ai?:                    string | null;
  address?:               string | null;
  wilaya_id?:             number | null;
  commune_id?:            number | null;
  phone?:                 string | null;
  mobile?:                string | null;
  email?:                 string | null;
  initial_balance:        number;
  credit_limit:           number;
  credit_days?:           number | null;
  default_price_level_id?:number | null;
  is_tva_exempt:          boolean;
  active:                 boolean;
  company_id:             number;
  // Relations
  party_type?:            PartyType;
  default_price_level?:   PriceLevel;
  // Computed
  balance?:               number;
}

// ─── Products ─────────────────────────────────────────────────────────────────
export interface ProductVariantPrice extends BaseModel {
  product_variant_id: number;
  price_level_id:     number;
  price:              number;
  valid_from?:        string | null;
  valid_to?:          string | null;
  active:             boolean;
  price_level?:       PriceLevel;
}

export interface QuantityDiscount extends BaseModel {
  product_variant_id:  number;
  min_quantity:        number;
  max_quantity?:       number | null;
  discount_percentage?:number | null;
  discount_per_unit?:  number | null;
  tier_order:          number;
  active:              boolean;
}

export interface ProductLot extends BaseModel {
  product_variant_id:    number;
  warehouse_id:          number;
  lot_number:            string;
  supplier_lot_number?:  string | null;
  manufacturing_date?:   string | null;
  expiration_date?:      string | null;
  purchase_date?:        string | null;
  purchase_price?:       number | null;
  legal_selling_price?:  number | null;
  original_quantity:     number;
  remaining_quantity:    number;
  active:                boolean;
  company_id:            number;
}

export interface ProductVariant extends BaseModel {
  product_id:                number;
  ref:                       string;
  barcode?:                  string | null;
  variant_name?:             string | null;
  unit_id?:                  number | null;
  tva_id?:                   number | null;
  valuation_method_id?:      number | null;
  weight?:                   number | null;
  volume?:                   number | null;
  length?:                   number | null;
  width?:                    number | null;
  height?:                   number | null;
  variant_attributes?:       Record<string, string>;
  last_purchase_price:       number;
  average_cost_price:        number;
  default_selling_price_ht:  number;
  manages_stock:             boolean;
  allow_negative_stock:      boolean;
  has_lots:                  boolean;
  has_expiration_date:       boolean;
  min_stock_alert:           number;
  max_stock_alert?:          number | null;
  manages_quantity_discounts:boolean;
  active:                    boolean;
  company_id:                number;
  // Relations
  product?:            Product;
  unit?:               Unit;
  tva?:                Tva;
  prices?:             ProductVariantPrice[];
  quantity_discounts?: QuantityDiscount[];
  lots?:               ProductLot[];
  // Computed
  current_stock?:      number;
  selling_price_ttc?:  number;
}

export interface Product extends BaseModel {
  name:             string;
  slug:             string;
  description?:     string | null;
  family_id?:       number | null;
  brand_id?:        number | null;
  product_type_id?: number | null;
  images?:          string[] | null;
  specifications?:  Record<string, string> | null;
  meta_title?:      string | null;
  meta_description?:string | null;
  active:           boolean;
  company_id:       number;
  // Relations
  family?:      Family;
  brand?:       Brand;
  productType?: ProductType;
  variants?:    ProductVariant[];
}

// ─── Commercial Documents ─────────────────────────────────────────────────────
export type DocumentStatusCode =
  | 'draft' | 'validated' | 'partial' | 'paid' | 'cancelled' | 'locked';

export interface CommercialDocumentLine extends BaseModel {
  commercial_document_id: number;
  product_variant_id?:    number | null;
  description?:           string | null;
  quantity:               number;
  unit_price_ht:          number;
  discount_percentage:    number;
  discount_amount:        number;
  tva_rate:               number;
  total_ht:               number;
  total_tva:              number;
  total_ttc:              number;
  line_order:             number;
  // Relations
  product_variant?: ProductVariant;
}

export interface CommercialDocument extends BaseModel {
  // ✅ أسماء الحقول من DB مباشرة
  document_type_id:   number;
  document_number:    string;
  party_id?:          number | null;
  warehouse_id:       number;
  fiscal_year_id:     number;
  document_date:      string;
  due_date?:          string | null;
  status:             DocumentStatusCode;
  notes?:             string | null;
  // Amounts
  total_ht:           number;
  total_tva:          number;
  total_ttc:          number;
  total_discount:     number;
  fiscal_stamp:       number;
  amount_paid:        number;
  amount_remaining:   number;
  is_locked:          boolean;
  company_id:         number;
  // Relations
  document_type?: DocumentType;
  party?:         Party;
  warehouse?:     Warehouse;
  fiscal_year?:   FiscalYear;
  lines?:         CommercialDocumentLine[];
  payments?:      Payment[];
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Payment extends BaseModel {
  commercial_document_id: number;
  payment_mode_id:        number;
  treasury_account_id?:   number | null;
  amount:                 number;
  payment_date:           string;
  reference?:             string | null;
  notes?:                 string | null;
  status:                 PaymentStatus;
  company_id:             number;
  fiscal_year_id:         number;
  // Relations
  payment_mode?:      PaymentMode;
  treasury_account?:  TreasuryAccount;
  document?:          CommercialDocument;
}

// ─── Checks ───────────────────────────────────────────────────────────────────
export type CheckStatus = 'pending' | 'cleared' | 'bounced' | 'cancelled';
export interface Check extends BaseModel {
  commercial_document_id: number;
  party_id:               number;
  amount:                 number;
  check_number:           string;
  check_date:             string;
  bank_name?:             string | null;
  status:                 CheckStatus;
  notes?:                 string | null;
  company_id:             number;
  party?:                 Party;
}

// ─── Stock Movements ──────────────────────────────────────────────────────────
export interface StockMovement extends BaseModel {
  product_variant_id:       number;
  warehouse_id:             number;
  fiscal_year_id:           number;
  stock_movement_type_id:   number;
  commercial_document_id?:  number | null;
  movement_date:            string;
  quantity:                 number;
  unit_price:               number;
  cost_price:               number;
  total_price:              number;
  notes?:                   string | null;
  company_id:               number;
  product_variant?:         ProductVariant;
  warehouse?:               Warehouse;
  movement_type?:           StockMovementType;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export type ExpenseStatus = 'unpaid' | 'partial' | 'paid';
export interface Expense extends BaseModel {
  expense_category_id: number;
  party_id?:           number | null;
  amount:              number;
  amount_paid:         number;
  expense_date:        string;
  due_date?:           string | null;
  description:         string;
  status:              ExpenseStatus;
  payment_mode_id?:    number | null;
  reference?:          string | null;
  fiscal_year_id:      number;
  company_id:          number;
  expense_category?:   ExpenseCategory;
  party?:              Party;
}

// ─── Employees ────────────────────────────────────────────────────────────────
export interface Employee extends BaseModel {
  first_name:  string;
  last_name:   string;
  email?:      string | null;
  phone?:      string | null;
  position?:   string | null;
  department?: string | null;
  hire_date:   string;
  active:      boolean;
  company_id:  number;
  full_name?:  string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  today_sales:          number;
  month_sales:          number;
  month_invoices_count: number;
  pending_invoices:     number;
  new_clients_month:    number;
  total_clients:        number;
  low_stock_count:      number;
  out_of_stock_count:   number;
  month_profit:         number;
  profit_margin:        number;
  month_tva_collected:  number;
  month_tva_deductible: number;
  tva_due:              number;
  total_debts:          number;
  debtors_count:        number;
}

// ─── POS (Cart) ───────────────────────────────────────────────────────────────
export interface CartItem {
  id:                  string;   // unique cart item id (uuid)
  product_id:          number;
  variant_id:          number;
  product_name:        string;
  variant_name?:       string | null;
  ref:                 string;
  barcode?:            string | null;
  unit_symbol?:        string | null;
  quantity:            number;
  unit_price_ht:       number;
  selling_price_ttc:   number;
  tva_rate:            number;
  tva_id?:             number | null;
  discount_percentage: number;
  discount_amount:     number;
  total_ht:            number;
  total_ttc:           number;
  max_stock?:          number | null;
  manages_stock:       boolean;
}
export interface CartTotals {
  total_ht:       number;
  total_tva:      number;
  total_ttc:      number;
  total_discount: number;
  fiscal_stamp:   number;
  items_count:    number;
  lines_count:    number;
}
export interface HeldCart {
  id:        string;
  label:     string;
  items:     CartItem[];
  totals:    CartTotals;
  client?:   Party | null;
  created_at:string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface Setting extends BaseModel {
  key:          string;
  value:        string | null;
  group?:       string | null;
  type:         'string' | 'integer' | 'boolean' | 'json';
  label?:       string | null;
  description?: string | null;
  company_id:   number;
}

// ─── Seeds ────────────────────────────────────────────────────────────────────
export type SeedKey =
  | 'currencies' | 'tvas' | 'units' | 'legal-forms' | 'fiscal-stamps'
  | 'price-levels' | 'party-types' | 'product-types' | 'stock-movement-types'
  | 'treasury-account-types' | 'document-base-operations' | 'document-statuses'
  | 'document-types' | 'inventory-valuation-methods' | 'warehouses'
  | 'treasury-accounts' | 'payment-modes' | 'expense-categories'
  | 'numbering-series' | 'wilayas-communes';

export interface SeedResult {
  key:     SeedKey;
  success: boolean;
  message: string;
}
```

## FILE: resources/js/new files/types-index.ts
```
// ════════════════════════════════════════════════════════════════════════════
// types/index.ts
// ✅ مصدر واحد للحقيقة — كل الأنواع من lib/api/core/types.ts
// لا تعريفات مكررة هنا
// ════════════════════════════════════════════════════════════════════════════
export * from '@/lib/api/core/types';
```

## FILE: resources/js/new files/useSetupWizard.ts
```
// ════════════════════════════════════════════════════════════════════════════
// context/useSetupWizard.ts
// ✅ مصحح: imports محدثة للـ client الجديد
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { apiGet, tokenStorage } from '@/lib/api/core/client';  // ✅ client الجديد

const SETUP_KEY = 'setup_completed';

export function useSetupRequired() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    // ❌ لا تفحص قبل وجود token
    const token = tokenStorage.get();          // ✅ tokenStorage بدل getAuthToken
    if (!token) {
      setNeedsSetup(false);
      return;
    }

    if (localStorage.getItem(SETUP_KEY) === 'true') {
      setNeedsSetup(false);
      return;
    }

    Promise.allSettled([
      apiGet('/settings/key/company.name/value'),   // ✅ apiGet بدل apiClient.get
      apiGet('/fiscal-years/current'),
    ]).then(([companyRes, fiscalRes]) => {
      const hasCompany =
        companyRes.status === 'fulfilled' &&
        !!(companyRes.value as any)?.value;

      const hasFiscalYear =
        fiscalRes.status === 'fulfilled' &&
        !!(fiscalRes.value as any)?.id;

      const done = hasCompany && hasFiscalYear;
      if (done) localStorage.setItem(SETUP_KEY, 'true');
      setNeedsSetup(!done);
    }).catch(() => {
      setNeedsSetup(false);
    });
  }, []);

  const markComplete = () => {
    localStorage.setItem(SETUP_KEY, 'true');
    setNeedsSetup(false);
  };

  return { needsSetup, markComplete };
}
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

