// pages/documents/hooks/useHiddenColumns.ts
import { useState, useCallback, useMemo } from "react";
import type { Column } from "@/components/ui/DataTable";
import type { ColumnStateSnapshot } from "@/components/ui/DataTable/hooks/useColumnStatePersistence";
import type { CommercialDocument } from "@/lib/api/core/types";

export function useHiddenColumns({ allColumns, initialSnapshot, saveColState }: {
    allColumns: Column<CommercialDocument>[];
    initialSnapshot: ColumnStateSnapshot | null;
    saveColState: (patch: Partial<Omit<ColumnStateSnapshot, 'savedAt'>>) => void;
}) {
    // ── إدارة الأعمدة المخفية — مُفوَّضة بالكامل لـ DataTable الداخلي ──────────
    // DataTable يتولى: قائمة الأعمدة + toggle + عرض القائمة
    // هنا نحتفظ فقط بـ state للاستخدام في headerActions و contextMenu

    const initialHiddenKeys = useMemo(
        () => initialSnapshot?.hiddenColumns ?? allColumns.filter(c => c.defaultHidden).map(c => c.key),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [], // يُحسب مرة واحدة عند الـ mount فقط
    );

    const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>(initialHiddenKeys);

    // onHiddenColumnsChange الجديدة: تستقبل القائمة الكاملة دائماً (allHidden)
    // سواء كان toggle فردي أو batch (إخفاء الكل / تطبيق view)
    const handleHiddenColumnsChange = useCallback(
        (_key: string, _willBeHidden: boolean, allHidden: string[]) => {
            setHiddenColumnKeys(allHidden);
            saveColState({ hiddenColumns: allHidden });
        },
        [saveColState],
    );

    // Set سريع للبحث في contextMenu
    const hiddenColumnsSet = useMemo(() => new Set(hiddenColumnKeys), [hiddenColumnKeys]);

    return { hiddenColumnKeys, handleHiddenColumnsChange, hiddenColumnsSet };
}
