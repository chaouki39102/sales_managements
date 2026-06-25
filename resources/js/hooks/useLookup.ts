// ════════════════════════════════════════════════════════════════════════════
// hooks/useLookup.ts — FIXED
// ════════════════════════════════════════════════════════════════════════════
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api/core/client";
import { useActiveSlug } from "@/lib/store/appStore";

// ✅ FIXED: فقط المسارات الموجودة خارج /{company}/ في api.php
// /wilayas  → Route::apiResource('wilayas'...)  خارج {company}
// /communes → Route::apiResource('communes'...) خارج {company}
//
// ❌ تمت إزالة كل lookups الأخرى من هنا لأنها جميعاً داخل /{company}/
//    وكانت تُسبب 405 عند POST/PUT لأن الـ interceptor لا يُضيف slug لها
const GLOBAL_ENDPOINTS = ["/wilayas", "/communes"];

function isGlobal(endpoint: string): boolean {
    return GLOBAL_ENDPOINTS.some(
        (e) => endpoint === e || endpoint.startsWith(e + "/"),
    );
}

export interface UseLookupReturn<T> {
    items: T[];
    loading: boolean;
    error: string | null;
    saving: boolean;
    refetch: () => void;
    create: (data: Partial<T>) => Promise<void>;
    update: (id: number, data: Partial<T>) => Promise<void>;
    remove: (id: number) => Promise<void>;
}

/**
 * useLookup — يُستخدم في LookupPage
 *
 * Global  (/wilayas, /communes):
 *   queryKey = ['global', endpoint]
 *   الـ interceptor لا يُضيف slug → /api/v1/wilayas
 *
 * Tenant (كل شيء آخر: /currencies, /tvas, /units, ...):
 *   queryKey = [slug, 'lookups', endpoint]
 *   الـ interceptor يُضيف slug → /api/v1/{slug}/currencies
 */
export function useLookup<T extends { id: number; name: string }>(
    endpoint: string,
): UseLookupReturn<T> {
    const slug = useActiveSlug();
    const qc = useQueryClient();
    const global = isGlobal(endpoint);

    const queryKey = global
        ? ["global", endpoint]
        : [slug ?? "", "lookups", endpoint];

    const { data, isLoading, error, refetch } = useQuery<T[]>({
        queryKey,
        queryFn: () => apiGet<any>(endpoint, { per_page: 500 }).then(r => r?.data ?? []),
        enabled: global ? true : !!slug,
        staleTime: global
            ? Infinity // wilayas/communes لا تتغير أبداً
            : 30 * 60_000, // lookups tenant: 30 دقيقة
        gcTime: 24 * 60 * 60_000, // يبقى في الذاكرة 24 ساعة
    });

    const [saving, setSaving] = useState(false);

    const invalidate = useCallback(() => {
        qc.invalidateQueries({ queryKey });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qc, JSON.stringify(queryKey)]);

    const createMutation = useMutation({
        mutationFn: (body: Partial<T>) => apiPost<T>(endpoint, body),
        onSuccess: invalidate,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<T> }) =>
            apiPut<T>(`${endpoint}/${id}`, data),
        onSuccess: invalidate,
    });

    const removeMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`${endpoint}/${id}`),
        onSuccess: invalidate,
    });

    const create = useCallback(
        async (body: Partial<T>) => {
            setSaving(true);
            try {
                await createMutation.mutateAsync(body);
            } finally {
                setSaving(false);
            }
        },
        [createMutation],
    );

    const update = useCallback(
        async (id: number, body: Partial<T>) => {
            setSaving(true);
            try {
                await updateMutation.mutateAsync({ id, data: body });
            } finally {
                setSaving(false);
            }
        },
        [updateMutation],
    );

    const remove = useCallback(
        async (id: number) => {
            setSaving(true);
            try {
                await removeMutation.mutateAsync(id);
            } finally {
                setSaving(false);
            }
        },
        [removeMutation],
    );

    return {
        items: data ?? [],
        loading: isLoading,
        error: error ? (error as Error).message : null,
        saving,
        refetch: () => refetch(),
        create,
        update,
        remove,
    };
}
