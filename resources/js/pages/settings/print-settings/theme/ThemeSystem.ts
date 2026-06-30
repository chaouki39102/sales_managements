export interface ThemeColors {
  primary: string;
  text: string;
  background: string;
  accent: string;
  muted: string;
  border: string;
  headerBg: string;
  headerText: string;
  alternatingRow: string;
  success: string;
  warning: string;
  danger: string;
}

export interface ThemeFonts {
  family: string;
  sizeBase: number;
  sizeSmall: number;
  sizeLarge: number;
  sizeTitle: number;
}

export interface ThemeSpacing {
  marginTop: number;
  marginBottom: number;
  marginSides: number;
  padding: number;
  lineHeight: number;
}

export interface ThemeBorders {
  style: 'solid' | 'dashed' | 'double' | 'none';
  color: string;
  width: number;
  radius: number;
}

export interface ThemeTable {
  headerBold: boolean;
  headerBg: string;
  headerText: string;
  borderStyle: 'solid' | 'dashed' | 'double' | 'none';
  alternatingRows: boolean;
  alternatingColor: string;
  cellPadding: number;
}

export interface ReportTheme {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  borders: ThemeBorders;
  table: ThemeTable;
  variables: Record<string, string>;
}

function cloneTheme(t: ReportTheme): ReportTheme {
  return {
    name: t.name,
    colors: { ...t.colors },
    fonts: { ...t.fonts },
    spacing: { ...t.spacing },
    borders: { ...t.borders },
    table: { ...t.table },
    variables: { ...t.variables },
  };
}

export class ThemeSystem {
  private themes = new Map<string, ReportTheme>();

  constructor() {
    for (const [name, theme] of Object.entries(PRESETS)) {
      this.themes.set(name, cloneTheme(theme));
    }
  }

  get(name: string): ReportTheme {
    const t = this.themes.get(name);
    if (!t) {
      throw new Error(`Theme "${name}" not found. Available themes: ${this.list().join(', ')}`);
    }
    return cloneTheme(t);
  }

  register(theme: ReportTheme): void {
    this.themes.set(theme.name, cloneTheme(theme));
  }

  list(): string[] {
    return Array.from(this.themes.keys());
  }

  toCSSVariables(theme: ReportTheme): Record<string, string> {
    const c = theme.colors;
    const f = theme.fonts;
    const s = theme.spacing;
    const b = theme.borders;
    const t = theme.table;

    return {
      '--color-primary': c.primary,
      '--color-text': c.text,
      '--color-background': c.background,
      '--color-accent': c.accent,
      '--color-muted': c.muted,
      '--color-border': c.border,
      '--color-header-bg': c.headerBg,
      '--color-header-text': c.headerText,
      '--color-alternating-row': c.alternatingRow,
      '--color-success': c.success,
      '--color-warning': c.warning,
      '--color-danger': c.danger,

      '--font-family': f.family,
      '--font-size-base': `${f.sizeBase}px`,
      '--font-size-small': `${f.sizeSmall}px`,
      '--font-size-large': `${f.sizeLarge}px`,
      '--font-size-title': `${f.sizeTitle}px`,

      '--margin-top': `${s.marginTop}mm`,
      '--margin-bottom': `${s.marginBottom}mm`,
      '--margin-sides': `${s.marginSides}mm`,
      '--padding': `${s.padding}px`,
      '--line-height': String(s.lineHeight),

      '--border-style': b.style,
      '--border-color': b.color,
      '--border-width': `${b.width}px`,
      '--border-radius': `${b.radius}px`,

      '--table-header-bold': String(t.headerBold),
      '--table-header-bg': t.headerBg,
      '--table-header-text': t.headerText,
      '--table-border-style': t.borderStyle,
      '--table-alternating-rows': String(t.alternatingRows),
      '--table-alternating-color': t.alternatingColor,
      '--table-cell-padding': `${t.cellPadding}px`,

      ...theme.variables,
    };
  }

  applyTemplateOverrides(
    baseTheme: ReportTheme,
    overrides: {
      fontFamily?: string;
      baseFontSize?: number;
      marginTop?: number;
      marginBottom?: number;
      marginSides?: number;
      lineSpacing?: number;
      tableBorderStyle?: string;
      alternatingRows?: boolean;
      alternatingColor?: string;
      tableHeaderBold?: boolean;
      tableHeaderBg?: boolean;
    },
  ): ReportTheme {
    const theme = cloneTheme(baseTheme);
    theme.name = `${baseTheme.name} (overridden)`;

    if (overrides.fontFamily !== undefined) {
      theme.fonts.family = overrides.fontFamily;
    }
    if (overrides.baseFontSize !== undefined) {
      theme.fonts.sizeBase = overrides.baseFontSize;
      theme.fonts.sizeSmall = Math.round(overrides.baseFontSize * 0.8);
      theme.fonts.sizeLarge = Math.round(overrides.baseFontSize * 1.25);
      theme.fonts.sizeTitle = Math.round(overrides.baseFontSize * 1.6);
    }
    if (overrides.marginTop !== undefined) {
      theme.spacing.marginTop = overrides.marginTop;
    }
    if (overrides.marginBottom !== undefined) {
      theme.spacing.marginBottom = overrides.marginBottom;
    }
    if (overrides.marginSides !== undefined) {
      theme.spacing.marginSides = overrides.marginSides;
    }
    if (overrides.lineSpacing !== undefined) {
      theme.spacing.lineHeight = overrides.lineSpacing;
    }
    if (overrides.tableBorderStyle !== undefined) {
      const valid = ['solid', 'dashed', 'double', 'none'] as const;
      if (valid.includes(overrides.tableBorderStyle as typeof valid[number])) {
        theme.table.borderStyle = overrides.tableBorderStyle as typeof valid[number];
        theme.borders.style = overrides.tableBorderStyle as typeof valid[number];
      }
    }
    if (overrides.alternatingRows !== undefined) {
      theme.table.alternatingRows = overrides.alternatingRows;
    }
    if (overrides.alternatingColor !== undefined) {
      theme.table.alternatingColor = overrides.alternatingColor;
    }
    if (overrides.tableHeaderBold !== undefined) {
      theme.table.headerBold = overrides.tableHeaderBold;
    }
    if (overrides.tableHeaderBg !== undefined) {
      if (overrides.tableHeaderBg) {
        theme.table.headerBg = theme.colors.headerBg;
        theme.table.headerText = theme.colors.headerText;
      } else {
        theme.table.headerBg = 'transparent';
        theme.table.headerText = theme.colors.text;
      }
    }

    return theme;
  }
}

export const PRESETS: Record<string, ReportTheme> = {
  'default-light': {
    name: 'default-light',
    colors: {
      primary: '#2563eb',
      text: '#111111',
      background: '#ffffff',
      accent: '#3b82f6',
      muted: '#6b7280',
      border: '#999999',
      headerBg: '#f3f4f6',
      headerText: '#111111',
      alternatingRow: '#fafafa',
      success: '#16a34a',
      warning: '#d97706',
      danger: '#dc2626',
    },
    fonts: {
      family: 'Tajawal, sans-serif',
      sizeBase: 10,
      sizeSmall: 8,
      sizeLarge: 12,
      sizeTitle: 16,
    },
    spacing: {
      marginTop: 10,
      marginBottom: 10,
      marginSides: 8,
      padding: 4,
      lineHeight: 1.4,
    },
    borders: {
      style: 'dashed',
      color: '#999999',
      width: 1,
      radius: 0,
    },
    table: {
      headerBold: true,
      headerBg: '#f3f4f6',
      headerText: '#111111',
      borderStyle: 'dashed',
      alternatingRows: true,
      alternatingColor: '#fafafa',
      cellPadding: 4,
    },
    variables: {},
  },

  minimal: {
    name: 'minimal',
    colors: {
      primary: '#000000',
      text: '#000000',
      background: '#ffffff',
      accent: '#000000',
      muted: '#555555',
      border: '#cccccc',
      headerBg: '#ffffff',
      headerText: '#000000',
      alternatingRow: '#ffffff',
      success: '#000000',
      warning: '#000000',
      danger: '#000000',
    },
    fonts: {
      family: 'Tajawal, sans-serif',
      sizeBase: 10,
      sizeSmall: 8,
      sizeLarge: 12,
      sizeTitle: 16,
    },
    spacing: {
      marginTop: 5,
      marginBottom: 5,
      marginSides: 5,
      padding: 2,
      lineHeight: 1.3,
    },
    borders: {
      style: 'none',
      color: 'transparent',
      width: 0,
      radius: 0,
    },
    table: {
      headerBold: true,
      headerBg: '#ffffff',
      headerText: '#000000',
      borderStyle: 'none',
      alternatingRows: false,
      alternatingColor: '#ffffff',
      cellPadding: 2,
    },
    variables: {},
  },

  compact: {
    name: 'compact',
    colors: {
      primary: '#111111',
      text: '#111111',
      background: '#ffffff',
      accent: '#333333',
      muted: '#666666',
      border: '#999999',
      headerBg: '#f3f4f6',
      headerText: '#111111',
      alternatingRow: '#fafafa',
      success: '#111111',
      warning: '#111111',
      danger: '#111111',
    },
    fonts: {
      family: 'Tajawal, sans-serif',
      sizeBase: 8,
      sizeSmall: 7,
      sizeLarge: 10,
      sizeTitle: 13,
    },
    spacing: {
      marginTop: 5,
      marginBottom: 5,
      marginSides: 4,
      padding: 2,
      lineHeight: 1.2,
    },
    borders: {
      style: 'solid',
      color: '#cccccc',
      width: 1,
      radius: 0,
    },
    table: {
      headerBold: false,
      headerBg: '#f3f4f6',
      headerText: '#111111',
      borderStyle: 'solid',
      alternatingRows: true,
      alternatingColor: '#fafafa',
      cellPadding: 2,
    },
    variables: {},
  },
};

export const themeSystem = new ThemeSystem();
