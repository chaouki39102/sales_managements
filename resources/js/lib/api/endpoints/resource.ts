// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/resource.ts
// Generic CRUD hook factory — يُنشئ hooks كاملة لأي resource
// يُستخدَم في: Products, Parties, Documents, Expenses, etc.
// ════════════════════════════════════════════════════════════════════════════

import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
    type UseQueryOptions,
} from "@tanstack/react-query";
import {
    apiGet,
    apiPost,
    apiPut,
    apiPatch,
    apiDelete,
    apiUpload,
} from "../core/client";
import { useActiveSlug } from "../../store/appStore";
import type { PaginatedResponse, ListParams, BaseModel } from "../core/types";


// ─── Types ────────────────────────────────────────────────────────────────────

interface ResourceConfig<T> {
    resource: string;
    /** * التعديل هنا: جعل params اختيارية في النوع ليتوافق مع تعريف queryKeys
     * واستخدام any لتجنب صرامة التوافق مع Record<string, unknown>
     */
    queryKey: (slug: string, params?: any) => readonly any[];
    staleTime?: number;
}

// ─── Hook Factory ─────────────────────────────────────────────────────────────

export function createResourceHooks<T extends BaseModel>(
    config: ResourceConfig<T>,
) {
    const { resource, queryKey, staleTime = 5 * 60_000 } = config;

    /**
     * قائمة مُقسَّمة مع Pagination
     */
    function useList(params?: ListParams) {
        const slug = useActiveSlug();

        return useQuery({
            queryKey: queryKey(slug ?? "", params),
            queryFn: () => apiGet<PaginatedResponse<T>>(`/${resource}`, params),
            enabled: !!slug,
            staleTime,
            placeholderData: keepPreviousData, // لا يختفي المحتوى عند تغيير الصفحة
        });
    }

    /**
     * عنصر واحد
     */
    function useDetail(id: number | null | undefined) {
        const slug = useActiveSlug();

        return useQuery({
            queryKey: [...queryKey(slug ?? ""), id],
            queryFn: () => apiGet<T>(`/${resource}/${id}`),
            enabled: !!slug && !!id,
            staleTime,
        });
    }

    /**
     * إنشاء عنصر جديد
     */
    function useCreate() {
        const slug = useActiveSlug();
        const qc = useQueryClient();

        return useMutation({
            mutationFn: (data: Partial<T>) => apiPost<T>(`/${resource}`, data),
            onSuccess: (created) => {
                if (slug) {
                    // Optimistic: أضف للكاش مباشرة بدلاً من إعادة الجلب
                    qc.invalidateQueries({ queryKey: queryKey(slug) });
                }
            },
        });
    }

    /**
     * تعديل عنصر
     */
    function useUpdate() {
        const slug = useActiveSlug();
        const qc = useQueryClient();

        return useMutation({
            mutationFn: ({ id, data }: { id: number; data: Partial<T> }) =>
                apiPut<T>(`/${resource}/${id}`, data),
            onSuccess: (updated) => {
                if (slug) {
                    // تحديث الكاش مباشرة
                    qc.setQueryData([...queryKey(slug), updated.id], updated);
                    qc.invalidateQueries({ queryKey: queryKey(slug) });
                }
            },
        });
    }

    /**
     * حذف عنصر
     */
    function useDelete() {
        const slug = useActiveSlug();
        const qc = useQueryClient();

        return useMutation({
            mutationFn: (id: number) => apiDelete(`/${resource}/${id}`),
            onSuccess: () => {
                if (slug) qc.invalidateQueries({ queryKey: queryKey(slug) });
            },
        });
    }

    /**
     * رفع ملف مرتبط بعنصر
     */
    function useUpload() {
        const slug = useActiveSlug();
        const qc = useQueryClient();

        return useMutation({
            mutationFn: ({
                id,
                formData,
                onProgress,
            }: {
                id: number;
                formData: FormData;
                onProgress?: (pct: number) => void;
            }) =>
                apiUpload<T>(`/${resource}/${id}/upload`, formData, onProgress),
            onSuccess: () => {
                if (slug) qc.invalidateQueries({ queryKey: queryKey(slug) });
            },
        });
    }

    return { useList, useDetail, useCreate, useUpdate, useDelete, useUpload };
}

// ─── Pre-built resource hooks ─────────────────────────────────────────────────

import { tenantKeys } from "../core/queryKeys";
import type { Party, Product } from "../core/types";

export const useParties = createResourceHooks<Party>({
    resource: "parties",
    queryKey: tenantKeys.parties.list,
});

export const useProducts = createResourceHooks<Product>({
    resource: "products",
    queryKey: tenantKeys.products.list,
    staleTime: 5 * 60_000,
});
