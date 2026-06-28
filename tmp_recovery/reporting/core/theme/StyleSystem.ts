import type { PrintTemplate } from '../domain/PrintTemplate';
import { themeSystem, type ReportTheme } from './ThemeSystem';

// â”€â”€â”€ Style Layers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type StyleLayer = 'global' | 'section' | 'component' | 'local';

export interface ComponentStyle {
  // Layout
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  position?: 'absolute' | 'relative' | 'static';
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  zIndex?: number;
  overflow?: 'visible' | 'hidden' | 'auto';
  display?: 'block' | 'flex' | 'inline' | 'none';

  // Typography
  fontFamily?: string;
  fontSize?: number | string;
  fontWeight?: 'normal' | 'bold' | number;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'line-through';
  letterSpacing?: number | string;
  lineHeight?: number | string;
  whiteSpace?: 'normal' | 'nowrap' | 'pre';
  wordBreak?: 'normal' | 'break-all' | 'keep-all';
  direction?: 'ltr' | 'rtl';
  color?: string;

  // Background & Border
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundRepeat?: 'repeat' | 'no-repeat';
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderRadius?: number | string;
  borderColor?: string;
  borderWidth?: number | string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';

  // Spacing
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  margin?: number | string;
  marginTop?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;

  // Effects
  opacity?: number;
  transform?: string;
  transformOrigin?: string;
  transition?: string;
  boxShadow?: string;
  cursor?: string;

  // Print-specific
  pageBreakBefore?: 'always' | 'avoid';
  pageBreakAfter?: 'always' | 'avoid';
  pageBreakInside?: 'avoid';
  printColorAdjust?: 'exact' | 'economy';

  // Custom CSS variables
  [key: `--${string}`]: string | number | undefined;
}

export interface SectionStyle {
  type: string;
  styles: ComponentStyle;
  componentDefaults?: ComponentStyle;
}

export interface StylePreset {
  id: string;
  name: string;
  description?: string;
  theme: string;
  overrides: ComponentStyle;
  sections?: Record<string, ComponentStyle>;
}

// â”€â”€â”€ StyleSystem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class StyleSystemService {
  private _presets = new Map<string, StylePreset>();
  private _currentThemePreset = 'default-light';
  private _themeMode: 'light' | 'dark' = 'light';

  constructor() {
    this._registerDefaultPresets();
  }

  // â”€â”€ Preset Management â”€â”€

  registerPreset(preset: StylePreset): void {
    this._presets.set(preset.id, preset);
  }

  unregisterPreset(id: string): void {
    this._presets.delete(id);
  }

  getPreset(id: string): StylePreset | undefined {
    return this._presets.get(id);
  }

  presets(): StylePreset[] {
    return Array.from(this._presets.values());
  }

  setCurrentPreset(id: string): void {
    if (this._presets.has(id)) {
      this._currentThemePreset = id;
    }
  }

  get currentPreset(): string {
    return this._currentThemePreset;
  }

  // â”€â”€ Theme Mode â”€â”€

  get themeMode(): 'light' | 'dark' {
    return this._themeMode;
  }

  setThemeMode(mode: 'light' | 'dark'): void {
    this._themeMode = mode;
    document.documentElement.setAttribute('data-theme', mode);
  }

  toggleThemeMode(): void {
    this.setThemeMode(this._themeMode === 'light' ? 'dark' : 'light');
  }

  // â”€â”€ Style Resolution â”€â”€

  resolveStyle(
    componentStyles: ComponentStyle,
    sectionType?: string,
    template?: PrintTemplate,
  ): ComponentStyle {
    const layers: ComponentStyle[] = [];

    // 1. Global theme layer
    const preset = this._presets.get(this._currentThemePreset);
    if (preset && this._themeMode === 'light') {
      layers.push(preset.overrides);
    } else if (preset) {
      // Dark mode adjustments
      layers.push(this._darkOverrides(preset));
    }

    // 2. Section layer
    if (sectionType && preset?.sections?.[sectionType]) {
      layers.push(preset.sections[sectionType]);
    }

    // 3. Component defaults (from section)
    const sectionDefaults = this._getSectionDefaults(sectionType);
    if (sectionDefaults) layers.push(sectionDefaults);

    // 4. Template overrides
    if (template) {
      layers.push(this._templateToStyle(template));
    }

    // 5. Local component styles (highest priority)
    layers.push(componentStyles);

    // Merge all layers
    return Object.assign({}, ...layers) as ComponentStyle;
  }

  cssVariables(template?: PrintTemplate): Record<string, string> {
    const preset = this._presets.get(this._currentThemePreset);
    const theme = preset ? themeSystem.get(preset.theme) : themeSystem.get('default-light');
    if (!theme) return {};

    const vars: Record<string, string> = {};
    const addVar = (key: string, val: string) => { vars[`--${key}`] = val; };

    addVar('report-font-family', theme.fonts.family);
    addVar('report-font-size', `${theme.fonts.sizeBase}px`);
    addVar('report-color', theme.colors.text);
    addVar('report-background', theme.colors.background);
    addVar('report-header-bg', theme.colors.headerBg);
    addVar('report-header-color', theme.colors.headerText);
    addVar('report-border', theme.colors.border);
    addVar('report-primary', theme.colors.primary);
    addVar('report-accent', theme.colors.accent);
    addVar('report-success', theme.colors.success);
    addVar('report-warning', theme.colors.warning);
    addVar('report-danger', theme.colors.danger);
    addVar('report-alt-row', theme.colors.alternatingRow);

    if (template) {
      if (template.font_family) vars['--report-font-family'] = template.font_family;
      if (template.font_size) vars['--report-font-size'] = `${template.font_size}px`;
      if (template.color) vars['--report-color'] = template.color;
      if (template.background_color) vars['--report-background'] = template.background_color;
    }

    return vars;
  }

  // â”€â”€ Private â”€â”€

  private _registerDefaultPresets(): void {
    this.registerPreset({
      id: 'standard',
      name: 'Standard',
      theme: 'default-light',
      overrides: {
        fontFamily: 'Tajawal',
        fontSize: 10,
        color: '#111111',
        lineHeight: 1.5,
        direction: 'rtl',
      },
      sections: {
        header: { backgroundColor: '#fafafa', padding: '8px', borderBottom: '1px solid #e0e0e0' },
        items: { fontSize: 9 },
        totals: { fontWeight: 'bold', borderTop: '2px solid #111' },
      },
    });

    this.registerPreset({
      id: 'compact',
      name: 'Compact',
      theme: 'compact',
      overrides: {
        fontFamily: 'Tajawal',
        fontSize: 8,
        color: '#222',
        lineHeight: 1.2,
        direction: 'rtl',
        padding: '2px',
      },
      sections: {
        header: { padding: '4px', fontSize: 7 },
        items: { fontSize: 7, lineHeight: 1.1 },
        totals: { fontSize: 8, borderTop: '1px solid #666' },
      },
    });

    this.registerPreset({
      id: 'minimal',
      name: 'Minimal',
      theme: 'minimal',
      overrides: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 10,
        color: '#000',
        lineHeight: 1.4,
        direction: 'rtl',
      },
      sections: {
        header: { borderBottom: '1px solid #000', padding: '4px 0' },
        items: { borderCollapse: 'collapse' as any },
        totals: { borderTop: '1px solid #000' },
      },
    });
  }

  private _getSectionDefaults(_sectionType?: string): ComponentStyle | null {
    return null;
  }

  private _templateToStyle(tpl: PrintTemplate): ComponentStyle {
    const style: ComponentStyle = {};
    if (tpl.font_family) style.fontFamily = tpl.font_family;
    if (tpl.font_size) style.fontSize = tpl.font_size;
    if (tpl.color) style.color = tpl.color;
    if (tpl.background_color) style.backgroundColor = tpl.background_color;
    if (tpl.margin_top != null) style.marginTop = `${tpl.margin_top}mm`;
    if (tpl.margin_bottom != null) style.marginBottom = `${tpl.margin_bottom}mm`;
    if (tpl.margin_left != null) style.marginLeft = `${tpl.margin_left}mm`;
    if (tpl.margin_right != null) style.marginRight = `${tpl.margin_right}mm`;
    return style;
  }

  private _darkOverrides(_preset: StylePreset): ComponentStyle {
    return {
      color: '#e0e0e0',
      backgroundColor: '#1a1a1a',
    };
  }
}

export const styleSystem = new StyleSystemService();
