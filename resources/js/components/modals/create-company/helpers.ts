// Helpers for CreateCompanyModal
export const currentYear = new Date().getFullYear();

// تحويل YYYY-MM-DD إلى تاريخ جميل
export function fmtDate(date: string): string {
    const d = date.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    const months = [
        "يناير",
        "فبراير",
        "مارس",
        "أبريل",
        "ماي",
        "جوان",
        "جويلية",
        "أوت",
        "سبتمبر",
        "أكتوبر",
        "نوفمبر",
        "ديسمبر",
    ];
    return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}
