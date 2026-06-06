/**
 * ══════════════════════════════════════════════════════════════
 * cn.ts — Class Name Utility
 * ══════════════════════════════════════════════════════════════
 */

// Install: npm i clsx tailwind-merge
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ══════════════════════════════════════════════════════════════
// 📦 Export point — استورد منه في كل المشروع
// ══════════════════════════════════════════════════════════════
// import { cn, Card, Button, Badge, ... } from '@/lib/ui'
