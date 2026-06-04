import { useMemo } from 'react';

/**
 * Dynamic style utilities for conditional className generation.
 * Use this for styles that depend on runtime values or conditions.
 * Prefer utility classes; use this only when dynamic values are unavoidable.
 */

export const fontWeightToClass = (weight: number): string => {
  switch (weight) {
    case 400: return 'font-normal';
    case 500: return 'font-medium';
    case 600: return 'font-semibold';
    case 700: return 'font-bold';
    case 800: return 'font-extrabold';
    case 900: return 'font-black';
    default: return '';
  }
};

export const fontSizeToClass = (size: number): string => {
  const sizeMap: Record<number, string> = {
    8: 'text-8',
    9: 'text-9',
    10: 'text-xs',
    11: 'text-sm',
    12: 'text-md',
    13: 'text-base',
    14: 'text-lg',
    15: 'text-xl',
    18: 'text-2xl',
    22: 'text-22',
    23: 'text-3xl',
    25: 'text-25',
    28: 'text-4xl',
    36: 'text-5xl',
  };
  return sizeMap[size] || '';
};

export const colorToClass = (color: string): string => {
  if (color.includes('var(--')) {
    const match = color.match(/var\(--(\w+)\)/);
    if (match) {
      const colorName = match[1];
      return `text-${colorName}`;
    }
  }
  return '';
};

export const backgroundToClass = (bg: string): string => {
  if (bg.includes('var(--')) {
    const match = bg.match(/var\(--(\w+)\)/);
    if (match) {
      const bgName = match[1];
      return `bg-${bgName}`;
    }
  }
  return '';
};

/**
 * Hook for converting pixel spacing values to utility scale (4px base).
 * 4px = 1 unit, 8px = 2 units, 12px = 3 units, etc.
 */
export const useSpacingClass = (pixels: number, prefix: string = 'p'): string => {
  return useMemo(() => {
    if (pixels === 0) return `${prefix}-0`;
    const units = Math.round(pixels / 4);
    return `${prefix}-${units * 4}`;
  }, [pixels, prefix]);
};

/**
 * Hook for merging base styles with conditional overrides.
 * Useful for complex components with multiple style variations.
 */
export const useMergedClasses = (...classes: (string | undefined | null | false)[]): string => {
  return useMemo(() => {
    return classes
      .filter((c): c is string => Boolean(c) && typeof c === 'string')
      .join(' ');
  }, [classes]);
};

/**
 * Hook for generating inline styles only when necessary (for truly dynamic values).
 * Prefer this over inline styles for performance and maintainability.
 */
export const useDynamicStyle = (
  values: Record<string, any>,
  dependencies: any[] = []
) => {
  return useMemo(() => {
    const style: React.CSSProperties = {};
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null) {
        style[key as keyof React.CSSProperties] = value;
      }
    }
    return style;
  }, [values, ...dependencies]);
};

/**
 * Conditional className builder (similar to clsx).
 * Usage: buildClasses('flex', { 'gap-2': isCompact, 'gap-4': !isCompact })
 */
export const buildClasses = (
  base: string,
  conditionals?: Record<string, boolean>
): string => {
  let result = base;
  if (conditionals) {
    for (const [cls, condition] of Object.entries(conditionals)) {
      if (condition) result += ` ${cls}`;
    }
  }
  return result;
};
