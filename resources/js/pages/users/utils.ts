// resources/js/pages/users/utils.ts — دوال مساعدة

// ─── Helpers ────────────────────────────────────
export const err2str = (e: unknown, fb = "حدث خطأ") =>
    (e as any)?.response?.data?.message ?? (e as any)?.message ?? fb;
export const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-DZ") : "—";
export const fmtDT = (d?: string | null) =>
    d
        ? `${fmtDate(d)} ${new Date(d).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`
        : "—";
