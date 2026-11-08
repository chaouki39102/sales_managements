// resources/js/pages/profile/constants.ts — ألوان وبيانات الأدوار

export const AV_COLORS = [
  "linear-gradient(135deg,#0a8a5c,#0dbf84)",
  "linear-gradient(135deg,#1a4fd6,#60a5fa)",
  "linear-gradient(135deg,#6920d4,#a78bfa)",
  "linear-gradient(135deg,#b87d0a,#fbbf24)",
  "linear-gradient(135deg,#0d7a8c,#22d3ee)",
  "linear-gradient(135deg,#c43a0a,#fb923c)",
];
export const avColor = (id: number) => AV_COLORS[id % AV_COLORS.length];

export const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  "super-admin": { label: "مدير النظام",  color: "#c43a0a", bg: "#c43a0a18", icon: "ti-crown"      },
  "admin":        { label: "مدير الشركة", color: "#6920d4", bg: "#6920d418", icon: "ti-shield"     },
  "manager":      { label: "مشرف",        color: "#1a4fd6", bg: "#1a4fd618", icon: "ti-user-star"  },
  "accountant":   { label: "محاسب",       color: "#0d7a8c", bg: "#0d7a8c18", icon: "ti-calculator" },
  "seller":       { label: "بائع",        color: "#0a8a5c", bg: "#0a8a5c18", icon: "ti-receipt"    },
  "cashier":      { label: "أمين صندوق",  color: "#b87d0a", bg: "#b87d0a18", icon: "ti-cash"       },
  "viewer":       { label: "مشاهد",       color: "#666",    bg: "#66666618", icon: "ti-eye"        },
};
export const getRoleMeta = (name: string) =>
  ROLE_META[name] ?? { label: name, color: "var(--em)", bg: "var(--emb)", icon: "ti-user" };
