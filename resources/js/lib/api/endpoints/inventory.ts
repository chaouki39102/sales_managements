// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/inventory.ts
// ════════════════════════════════════════════════════════════════════════════

import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../core/client";
import { tenantKeys, invalidatePosQueries } from "../core/queryKeys";
import { notifyOtherTabs } from "../core/crossTab";
import { useActiveSlug, useSelectedYearId } from "../../store/appStore";
import type {
    StockMovement,
    ProductLot,
    PaginatedResponse,
    ListParams,
} from "../core/types";

// ─── Types ────────────────────────────────────────────────────────────────────

/** منتج مبسّط لعرض المخزون — يعكس Product model في الـ Backend */
export interface InventoryProduct {
    id: number;
    name: string;
    ref?: string | null;
    current_stock: number;
    min_stock_alert: number;
    max_stock_alert?: number | null;
    current_cost_price: number;
    purchase_price_ht: number;
    manages_stock: boolean;
    family_id?: number | null;
    brand_id?: number | null;
    unit_id?: number | null;
    tva_id?: number | null;
    active: boolean;
    company_id: number;
    // Relations
    family?: { id: number; name: string } | null;
    brand?: { id: number; name: string } | null;
    unit?: { id: number; name: string; symbol: string } | null;
    tva?: { id: number; rate: number } | null;
}

export interface StockMovementCreateInput {
    product_id: number;
    warehouse_id: number;
    fiscal_year_id: number;
    stock_movement_type_id: number;
    movement_date: string;
    quantity: number;
    unit_price: number;
    cost_price?: number;
    total_price?: number;
    price_source?: string;
    is_validated?: boolean;
    reason?: string | null;
    notes?: string | null;
    lot_number?: string | null;
}

export interface StockMovementListParams extends ListParams {
    product_id?: number;
    warehouse_id?: number;
    stock_movement_type_id?: number;
    fiscal_year_id?: number;
    date_from?: string;
    date_to?: string;
    is_validated?: boolean;
}

export interface InventoryProductListParams extends ListParams {
    family_id?: number;
    brand_id?: number;
    warehouse_id?: number;
    /** low = أقل من min_stock_alert, out = نفد, ok = جيد */
    status?: "low" | "out" | "ok";
}

export interface StockSummary {
    total_products: number;
    out_of_stock: number;
    low_stock: number;
    total_value: number;
}

export interface StockAtRow {
    id: number;
    name: string;
    ref?: string | null;
    opening_quantity: number;
    total_in: number;
    total_out: number;
    current_stock: number;
    min_stock_alert: number;
    current_cost_price: number;
    total_value: number;
    manages_stock: boolean;
    lots_count?: number;
    family?: { name: string } | null;
    unit?: { name: string; symbol: string } | null;
}

export interface StockAtParams {
    date?: string;
    warehouse_id?: number | null;
    search?: string;
    fiscal_year_id?: number;
}
// ─── API ──────────────────────────────────────────────────────────────────────

export const inventoryApi = {
    // ── Products (for inventory view) ─────────────────────────────────────────
    products: (params?: InventoryProductListParams) =>
        apiGet<PaginatedResponse<InventoryProduct>>("/products", {
            ...params,
            include: "family,brand,unit,tva",
        }),

    lowStockProducts: () => apiGet<InventoryProduct[]>("/inventory/low-stock"),

    stockSummary: () => apiGet<StockSummary>("/inventory/summary"),

    // ── Stock Movements ────────────────────────────────────────────────────────
    movements: (params?: StockMovementListParams) =>
        apiGet<PaginatedResponse<StockMovement>>("/stock-movements", {
            ...params,
            include: "product,warehouse,stockMovementType",
        }),

    createMovement: (data: StockMovementCreateInput) =>
        apiPost<StockMovement>("/stock-movements", data),

    deleteMovement: (id: number) => apiDelete(`/stock-movements/${id}`),

    // ── Product Lots ───────────────────────────────────────────────────────────
    lots: (params?: ListParams) =>
        apiGet<PaginatedResponse<ProductLot>>("/product-lots", {
            ...params,
            include: "product,warehouse",
        }),

    lotsAvailable: () => apiGet<ProductLot[]>("/product-lots/available"),

    lotsExpiring: (days = 30) =>
        apiGet<ProductLot[]>("/product-lots/expiring", { days }),

    createLot: (data: Partial<ProductLot>) =>
        apiPost<ProductLot>("/product-lots", data),

    updateLot: (id: number, data: Partial<ProductLot>) =>
        apiPut<ProductLot>(`/product-lots/${id}`, data),

    deleteLot: (id: number) => apiDelete(`/product-lots/${id}`),

    stockAt: (params?: StockAtParams) =>
        apiGet<StockAtRow[]>(
            "/inventory/stock-at",
            params as Record<string, unknown>,
        ),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** قائمة المنتجات مع بيانات المخزون */
export function useInventoryProducts(params?: InventoryProductListParams) {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: tenantKeys.inventory.list(slug ?? "", params),
        queryFn: () => inventoryApi.products(params),
        enabled: !!slug,
        staleTime: 2 * 60_000,
        placeholderData: keepPreviousData,
    });
}

/** منتجات منخفضة أو نافدة المخزون */
export function useLowStockProducts() {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: [slug, "inventory", "low-stock"],
        queryFn: () => inventoryApi.lowStockProducts(),
        enabled: !!slug,
        staleTime: 5 * 60_000,
    });
}

/** ملخص المخزون للـ KPIs */
export function useStockSummary() {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: [slug, "inventory", "summary"],
        queryFn: () => inventoryApi.stockSummary(),
        enabled: !!slug,
        staleTime: 5 * 60_000,
    });
}

/** قائمة حركات المخزون */
export function useStockMovements(params?: StockMovementListParams) {
    const slug   = useActiveSlug();
    const yearId = useSelectedYearId();
    return useQuery({
        queryKey: tenantKeys.inventory.movements(slug ?? "", { ...params, fiscal_year_id: yearId }),
        queryFn: () => inventoryApi.movements({ ...params, 'filter[fiscal_year_id]': yearId ?? undefined } as StockMovementListParams),
        enabled: !!slug,
        staleTime: 2 * 60_000,
        placeholderData: keepPreviousData,
    });
}

/** دفعات المخزون */
export function useProductLots(params?: ListParams) {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: tenantKeys.inventory.lots(slug ?? "", params),
        queryFn: () => inventoryApi.lots(params),
        enabled: !!slug,
        staleTime: 3 * 60_000,
        placeholderData: keepPreviousData,
    });
}

/** دفعات قاربت الانتهاء */
export function useExpiringLots(days = 30) {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: [slug, "product-lots", "expiring", days],
        queryFn: () => inventoryApi.lotsExpiring(days),
        enabled: !!slug,
        staleTime: 10 * 60_000,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useInventoryMutations() {
    const slug = useActiveSlug();
    const qc = useQueryClient();

    const invalidate = () => {
        if (!slug) return;
        // إبطال المخزون
        qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        // إبطال المنتجات — الحركات تغير current_stock
        qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
        // إبطال بيانات POS — المخزون والمنتجات تظهر مباشرة في نقاط البيع
        invalidatePosQueries(qc, slug);
        // مزامنة التبويبات الأخرى (POS مفتوح في تبويب ثاني)
        notifyOtherTabs(slug);
    };

    return {
        createMovement: useMutation({
            mutationFn: inventoryApi.createMovement,
            onSuccess: invalidate,
        }),
        deleteMovement: useMutation({
            mutationFn: inventoryApi.deleteMovement,
            onSuccess: invalidate,
        }),
        createLot: useMutation({
            mutationFn: inventoryApi.createLot,
            onSuccess: invalidate,
        }),
        updateLot: useMutation({
            mutationFn: ({
                id,
                data,
            }: {
                id: number;
                data: Partial<ProductLot>;
            }) => inventoryApi.updateLot(id, data),
            onSuccess: invalidate,
        }),
        deleteLot: useMutation({
            mutationFn: inventoryApi.deleteLot,
            onSuccess: invalidate,
        }),
    };
}
export function useStockAt(params?: StockAtParams) {
    const slug   = useActiveSlug();
    const yearId = useSelectedYearId();
    return useQuery({
        queryKey: [slug, "inventory", "stock-at", yearId, params],
        queryFn: () => inventoryApi.stockAt({ ...params, fiscal_year_id: yearId ?? undefined } as Record<string, unknown>),
        enabled: !!slug,
        staleTime: 2 * 60_000,
        placeholderData: keepPreviousData,
    });
}
