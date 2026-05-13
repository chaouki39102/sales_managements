الخطأ واضح جداً:
Query data cannot be undefined.
Affected query key: ["document-types",""]
Affected query key: ["document-base-operations"]  
Affected query key: ["document-types-select"]
المشكلة ليست في OnboardingPage — بل في lib/api/endpoints/document.ts. الـ queryFn تُرجع undefined بدلاً من البيانات.Viewed 5 files, ran a commandViewed 5 files, ran a commandالآن المشكلة واضحة تماماً. إليك التشخيص الدقيق:

سبب الخطأ
الخطأ Query data cannot be undefined يأتي من 3 queries تُشغَّل قبل أن يكون slug جاهزاً:
["document-types", ""]          ← slug = "" وليس null
["document-base-operations"]    ← يُشغَّل بدون enabled guard
["document-types-select"]       ← نفس المشكلة
المشكلة في مكانين:
1. globalLookupsApi تُرجع undefined أحياناً
extractData يُرجع d as T وإذا كان الـ response من الباكند بشكل { success: true, data: [...] } بدلاً من { data: [...] } مباشرةً، يُرجع undefined.
2. useGlobalDocumentTypes يعمل بدون enabled guard
ts// الحالي — يعمل حتى لو لم يكن هناك slug أو token
export const useGlobalDocumentTypes = () =>
  useQuery({ queryKey: globalKeys.documentTypes, queryFn: globalLookupsApi.documentTypes, staleTime: GLOBAL_STALE });

الإصلاح في lib/api/endpoints/lookups.ts
أولاً — أضف select لضمان عدم إرجاع undefined
ts// ✅ الإصلاح: أضف select لكل global hook
export const useGlobalDocumentTypes = () =>
  useQuery({
    queryKey: globalKeys.documentTypes,
    queryFn:  globalLookupsApi.documentTypes,
    staleTime: GLOBAL_STALE,
    select: (data) => data ?? [],          // ← يمنع undefined
  });

export const useGlobalDocumentStatuses = () =>
  useQuery({
    queryKey: globalKeys.documentStatuses,
    queryFn:  globalLookupsApi.documentStatuses,
    staleTime: GLOBAL_STALE,
    select: (data) => data ?? [],
  });
ثانياً — أضف initialData أو placeholderData لكل global hook
ts// أو بشكل أشمل — wrapper مشترك لكل global hooks
function useGlobalLookup<T>(queryKey: readonly unknown[], queryFn: () => Promise<T[]>) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime:       GLOBAL_STALE,
    placeholderData: [] as unknown as T[],  // ← يمنع undefined
    select:          (data) => data ?? [],
  });
}

// ثم استخدمه:
export const useGlobalDocumentTypes       = () => useGlobalLookup(globalKeys.documentTypes,       globalLookupsApi.documentTypes);
export const useGlobalDocumentStatuses    = () => useGlobalLookup(globalKeys.documentStatuses,    globalLookupsApi.documentStatuses);
export const useGlobalCurrencies          = () => useGlobalLookup(globalKeys.currencies,          globalLookupsApi.currencies);
export const useGlobalTvas                = () => useGlobalLookup(globalKeys.tvas,                globalLookupsApi.tvas);
export const useGlobalLegalForms          = () => useGlobalLookup(globalKeys.legalForms,          globalLookupsApi.legalForms);
export const useGlobalFiscalStamps        = () => useGlobalLookup(globalKeys.fiscalStamps,        globalLookupsApi.fiscalStamps);
export const useGlobalWilayas             = () => useGlobalLookup(globalKeys.wilayas,             globalLookupsApi.wilayas);
export const useGlobalInventoryValuationMethods = () =>
  useGlobalLookup(globalKeys.inventoryValuationMethods, globalLookupsApi.inventoryValuationMethods);
ثالثاً — إصلاح extractData في client.ts
ts// ❌ الحالي — يُرجع undefined إذا كان d فارغاً
function extractData<T>(response: any): T {
  const d = response?.data;
  if (Array.isArray(d)) return d as T;
  if (d && typeof d === 'object' && 'data' in d) return d.data as T;
  return d as T;
}

// ✅ الإصلاح — أضف fallback
function extractData<T>(response: any): T {
  const d = response?.data;
  if (Array.isArray(d)) return d as T;
  if (d && typeof d === 'object' && 'data' in d) {
    // يدعم { data: [...] } و { data: { data: [...], meta: {} } }
    const inner = d.data;
    if (inner !== undefined) return inner as T;
  }
  // fallback — إذا كان d نفسه هو البيانات
  return (d ?? null) as T;
}

سبب ظهور ["document-types",""] بـ slug فارغ
في CommercialDocumentsPage أو DashboardLayout، يُستدعى useGlobalDocumentTypes() مباشرةً عند التحميل قبل جلب slug. أضف enabled في المكان الذي تستخدم فيه الـ hook:
ts// في الصفحة التي تستدعي الـ hook
const { isAuthenticated } = useAuth();
const { data: docTypes } = useGlobalDocumentTypes();
// ← هذا يعمل لأن globalKeys لا تحتاج slug
// لكن إذا كان الباكند يرفض الطلب بدون token → أضف enabled

// الحل في lookups.ts:
export const useGlobalDocumentTypes = () => {
  const { isAuthenticated } = useAuth(); // ← أضف هذا
  return useQuery({
    queryKey:  globalKeys.documentTypes,
    queryFn:   globalLookupsApi.documentTypes,
    staleTime: GLOBAL_STALE,
    enabled:   isAuthenticated,           // ← لا تجلب قبل تسجيل الدخول
    select:    (data) => data ?? [],
  });
};