// resources/js/pages/users/constants.ts — ألوان وأنماط مشتركة
import type React from "react";

export const AV_COLORS = [
    "linear-gradient(135deg,#0a8a5c,#0dbf84)",
    "linear-gradient(135deg,#1a4fd6,#60a5fa)",
    "linear-gradient(135deg,#6920d4,#a78bfa)",
    "linear-gradient(135deg,#b87d0a,#fbbf24)",
    "linear-gradient(135deg,#0d7a8c,#22d3ee)",
    "linear-gradient(135deg,#c43a0a,#fb923c)",
];
export const avColor = (id: number) => AV_COLORS[id % AV_COLORS.length];

export const GROUP_COLORS = [
    "#0a8a5c",
    "#1a4fd6",
    "#6920d4",
    "#b87d0a",
    "#0d7a8c",
    "#c43a0a",
];
export const gColor = (i: number) => GROUP_COLORS[i % GROUP_COLORS.length];

export const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid var(--b3)",
    background: "var(--bg3)",
    color: "var(--t1)",
    fontFamily: "Tajawal, sans-serif",
    fontSize: 13,
    outline: "none",
    transition: ".14s",
};
