// pages/documents/hooks/useDocumentSmartFilter.ts
import type React from "react";
import { useCallback } from "react";
import type { useNotification } from '@/hooks/useNotification';

export function useDocumentSmartFilter({ setServerFilters, setPage, notify }: {
    setServerFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    notify: ReturnType<typeof useNotification>;
}) {
    // ════════════════════════════════════════════════════════════════════════
    // SMART FILTER CALLBACK
    // ════════════════════════════════════════════════════════════════════════

    const handleSmartFilterApply = useCallback((query: string, result: { success: boolean; filters: Record<string, string> }) => {
        if (result.success && Object.keys(result.filters).length > 0) {
            setServerFilters(prev => ({ ...prev, ...result.filters }));
            setPage(1);
            const count = Object.keys(result.filters).length;
            notify.success(`✓ ${count} فلتر من: "${query}"`);
        } else if (result.success) {
            // تطابق نمط بدون فلاتر (مثل sort فقط)
            notify.info(`✓ فُرِّز حسب: "${query}"`);
        } else {
            notify.info(`لم يُتعرف على: "${query}"`);
        }
    }, []);

    return handleSmartFilterApply;
}
