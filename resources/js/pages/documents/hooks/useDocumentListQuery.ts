// pages/documents/hooks/useDocumentListQuery.ts
// حالة الخادم لقائمة المستندات: الصفحة، الفلاتر، الترتيب، نوع المستند، الجلب
import { useState, useCallback, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/core/client";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import type { MultiSortState } from "@/components/ui/DataTable";
import type { ColumnStateSnapshot } from "@/components/ui/DataTable/hooks/useColumnStatePersistence";
import type { DocumentType, CommercialDocument, PaginatedResponse } from "@/lib/api/core/types";

interface UseDocumentListQueryArgs {
    slug: string | null | undefined;
    typeCode: string | undefined;
    selectedYear: { id: number; name: string } | undefined;
    saveColState: (patch: Partial<ColumnStateSnapshot>) => void;
}

export function useDocumentListQuery({ slug, typeCode, selectedYear, saveColState }: UseDocumentListQueryArgs) {
    // ── Server-side state ─────────────────────────────────────────────────────
    const [page, setPage]               = useState(1);
    const [perPage, setPerPage]         = useState(15);
    const [serverFilters, setServerFilters] = useState<Record<string, string>>({});
    const [multiSort, setMultiSort]     = useState<MultiSortState>([{ key: 'document_number', dir: 'desc' }]);

    // ── Sort → server param ───────────────────────────────────────────────────
    const sortParam = useMemo(() => {
        if (!multiSort.length) return "-document_number";
        return multiSort.map(s => `${s.dir === "desc" ? "-" : ""}${s.key}`).join(",");
    }, [multiSort]);

    // ── Filter change ─────────────────────────────────────────────────────────
    const handleFilterChange = useCallback((filters: Record<string, string>) => {
        const converted: Record<string, string> = {};

        // حقول النطاق (تاريخ / رقم) — DataTable يُرسل "min|max" → Backend يتوقع "min,max"
        const rangeFields = new Set([
            "document_date","due_date","delivery_date","total_ht","total_tva","total_ttc",
            "net_to_pay","paid_amount","total_discount","total_stamp","remaining_amount",
            "validated_at","created_at","updated_at",
        ]);

        // حقول العلاقات (dynamic-multiselect CSV) — Backend يُقسّمها بنفسه
        const csvRelationFields = new Set(["party.name","warehouse.name"]);

        for (const [key, val] of Object.entries(filters)) {
            // تخطى القيم الفارغة
            if (!val || val === "|") continue;

            if (rangeFields.has(key) && val.includes("|")) {
                // "min|max" → "min,max"
                const rangeVal = val.replace(/\|/g, ",");
                if (rangeVal !== "," && rangeVal !== "") {
                    converted[key] = rangeVal;
                }
            } else if (csvRelationFields.has(key) && val.includes(",")) {
                // CSV من multiselect — نُرسله كما هو
                converted[key] = val;
            } else {
                converted[key] = val;
            }
        }
        setServerFilters(converted);
        setPage(1);
        const toSave = Object.fromEntries(
            Object.entries(converted).filter(([, v]) => v != null && v !== "")
        );
        saveColState({ activeFilters: toSave });
    }, [saveColState]);

    // ── Fetch document type ───────────────────────────────────────────────────
    const { data: docType } = useQuery<DocumentType | null>({
        queryKey: [slug, "document-type-by-code", typeCode],
        queryFn: () =>
            apiGet<DocumentType[]>("/document-types", { per_page: 500 }).then(res => {
                const list = Array.isArray(res) ? res : ((res as Record<string,unknown>)?.data as DocumentType[]) ?? [];
                return list.find(dt => dt.code === typeCode) ?? null;
            }),
        enabled: !!slug && !!typeCode,
        staleTime: 10 * 60_000,
    });

    // ── Fetch documents ───────────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        // نبني الـ params بدون أي مفتاح قيمته undefined أو null
        // لأن بعض HTTP clients تُرسلها كـ "undefined" string → Backend يُرجع []
        const params: Record<string, unknown> = {
            include: "party,documentStatus,warehouse,validatedBy,user",
            sort: sortParam,
            per_page: perPage,
            page,
        };

        // نُضيف filter[document_type_id] فقط إذا كانت القيمة موجودة
        if (docType?.id != null)       params["filter[document_type_id]"] = docType.id;
        if (selectedYear?.id != null)  params["filter[fiscal_year_id]"]   = selectedYear.id;

        const filterMap: Record<string, string> = {
            search:                   "filter[search]",
            document_number:          "filter[document_number]",
            "party.name":             "filter[party.name]",
            "warehouse.name":         "filter[warehouse.name]",
            "document_status.name":   "filter[document_status.name]",
            is_locked:                "filter[is_locked]",
            document_date:            "filter[document_date]",
            due_date:                 "filter[due_date]",
            delivery_date:            "filter[delivery_date]",
            total_ht:                 "filter[total_ht]",
            total_tva:                "filter[total_tva]",
            total_ttc:                "filter[total_ttc]",
            net_to_pay:               "filter[net_to_pay]",
            paid_amount:              "filter[paid_amount]",
            total_discount:           "filter[total_discount]",
            total_stamp:              "filter[total_stamp]",
            remaining_amount:         "filter[remaining_amount]",
            reference:                "filter[reference]",
            notes:                    "filter[notes]",
            payment_terms:            "filter[payment_terms]",
            validated_at:             "filter[validated_at]",
            created_at:               "filter[created_at]",
            updated_at:               "filter[updated_at]",
            // ✅ إضافة: فلتر باسم المستخدم الذي اعتمد / أنشأ المستند
            validated_by:             "filter[validatedBy.name]",
            created_by:               "filter[user.name]",
        };
        for (const [fk, pk] of Object.entries(filterMap)) {
            if (serverFilters[fk]) params[pk] = serverFilters[fk];
        }
        return params;
    }, [docType?.id, selectedYear?.id, serverFilters, sortParam, perPage, page]);

    const { data: docsRaw, isLoading, isFetching } = useQuery({
        queryKey: tenantKeys.documents.byType(slug ?? "", typeCode ?? "", queryParams),
        queryFn: () => {
            return apiGet<PaginatedResponse<CommercialDocument>>("/documents", queryParams);
        },
        enabled: !!slug && !!typeCode && !!selectedYear?.id && !!docType?.id,
        placeholderData: keepPreviousData,
        staleTime: 2 * 60_000,
    });

    const items = useMemo((): CommercialDocument[] => {
        if (!docsRaw) return [];
        // extractData returns PaginatedResponse { data: T[], meta } or T[]
        if (Array.isArray(docsRaw)) return docsRaw as CommercialDocument[];
        const raw = docsRaw as unknown as Record<string, unknown>;
        if (Array.isArray(raw.data)) return raw.data as CommercialDocument[];
        return [];
    }, [docsRaw]);

    const meta = useMemo(() => {
        if (!docsRaw || Array.isArray(docsRaw)) return { total: 0, last_page: 1, current_page: 1, per_page: perPage };

        const raw = docsRaw as unknown as Record<string, unknown>;
        const m = raw.meta as Record<string, number> | undefined;

        if (m && (m.total != null || m.last_page != null)) {
            return {
                total:        Number(m.total        ?? 0),
                last_page:    Number(m.last_page    ?? 1),
                current_page: Number(m.current_page ?? 1),
                per_page:     Number(m.per_page     ?? perPage),
            };
        }

        return { total: 0, last_page: 1, current_page: 1, per_page: perPage };
    }, [docsRaw, perPage]);

    const handleMultiSortChange = useCallback((sorts: MultiSortState) => {
        setMultiSort(sorts);
        setPage(1);
    }, []);

    return {
        page, setPage,
        perPage, setPerPage,
        serverFilters, setServerFilters,
        multiSort,
        handleFilterChange,
        handleMultiSortChange,
        docType,
        queryParams,
        isLoading,
        isFetching,
        items,
        meta,
    };
}
