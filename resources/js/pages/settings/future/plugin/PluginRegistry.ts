// ظ¤ظ¤ظ¤ Plugin Types ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  dependencies?: string[];
}

export interface PluginHooks {
  onRegister?: () => void;
  onUnregister?: () => void;
  onTemplateCompile?: (template: unknown) => unknown;
  onRenderStart?: (ctx: unknown) => void;
  onRenderComplete?: (ctx: unknown, output: unknown) => void;
}

export interface ReportPlugin {
  manifest: PluginManifest;
  hooks: PluginHooks;
}

// ظ¤ظ¤ظ¤ Extension Points ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

export interface FormulaFunctionRegistration {
  name: string;
  fn: (...args: unknown[]) => unknown;
  category: string;
  description: string;
  args: string[];
}

export interface ExporterRegistration {
  format: string;
  label: string;
  export: (data: unknown, options?: Record<string, unknown>) => Promise<Blob | string>;
}

export interface ThemeRegistration {
  id: string;
  label: string;
  cssVariables: Record<string, string>;
}

export interface BarcodeTypeRegistration {
  type: string;
  label: string;
  generate: (value: string, options?: Record<string, unknown>) => string;
}

export interface ChartTypeRegistration {
  type: string;
  label: string;
  component: React.ComponentType<any>;
}

export interface ComponentRegistration {
  type: string;
  label: string;
  defaultProps: Record<string, unknown>;
  component: React.ComponentType<any>;
  icon?: string;
}

export interface PaperSizeRegistration {
  code: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

// ظ¤ظ¤ظ¤ Registry ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

class PluginRegistryService {
  private _plugins = new Map<string, ReportPlugin>();
  private _formulaFunctions = new Map<string, FormulaFunctionRegistration>();
  private _exporters = new Map<string, ExporterRegistration>();
  private _themes = new Map<string, ThemeRegistration>();
  private _barcodeTypes = new Map<string, BarcodeTypeRegistration>();
  private _chartTypes = new Map<string, ChartTypeRegistration>();
  private _components = new Map<string, ComponentRegistration>();
  private _paperSizes = new Map<string, PaperSizeRegistration>();

  // ظ¤ظ¤ Plugin lifecycle ظ¤ظ¤

  register(plugin: ReportPlugin): void {
    if (this._plugins.has(plugin.manifest.id)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.manifest.id}" already registered`);
      return;
    }
    this._plugins.set(plugin.manifest.id, plugin);
    plugin.hooks.onRegister?.();
  }

  unregister(id: string): void {
    const plugin = this._plugins.get(id);
    if (plugin) {
      plugin.hooks.onUnregister?.();
      this._plugins.delete(id);
    }
  }

  getPlugin(id: string): ReportPlugin | undefined {
    return this._plugins.get(id);
  }

  plugins(): ReportPlugin[] {
    return Array.from(this._plugins.values());
  }

  // ظ¤ظ¤ Formula Functions ظ¤ظ¤

  registerFormulaFunction(reg: FormulaFunctionRegistration): void {
    this._formulaFunctions.set(reg.name, reg);
  }

  getFormulaFunction(name: string): FormulaFunctionRegistration | undefined {
    return this._formulaFunctions.get(name);
  }

  formulaFunctions(): FormulaFunctionRegistration[] {
    return Array.from(this._formulaFunctions.values());
  }

  // ظ¤ظ¤ Exporters ظ¤ظ¤

  registerExporter(reg: ExporterRegistration): void {
    this._exporters.set(reg.format, reg);
  }

  getExporter(format: string): ExporterRegistration | undefined {
    return this._exporters.get(format);
  }

  exporters(): ExporterRegistration[] {
    return Array.from(this._exporters.values());
  }

  // ظ¤ظ¤ Themes ظ¤ظ¤

  registerTheme(reg: ThemeRegistration): void {
    this._themes.set(reg.id, reg);
  }

  getTheme(id: string): ThemeRegistration | undefined {
    return this._themes.get(id);
  }

  themes(): ThemeRegistration[] {
    return Array.from(this._themes.values());
  }

  // ظ¤ظ¤ Barcode Types ظ¤ظ¤

  registerBarcodeType(reg: BarcodeTypeRegistration): void {
    this._barcodeTypes.set(reg.type, reg);
  }

  getBarcodeType(type: string): BarcodeTypeRegistration | undefined {
    return this._barcodeTypes.get(type);
  }

  barcodeTypes(): BarcodeTypeRegistration[] {
    return Array.from(this._barcodeTypes.values());
  }

  // ظ¤ظ¤ Chart Types ظ¤ظ¤

  registerChartType(reg: ChartTypeRegistration): void {
    this._chartTypes.set(reg.type, reg);
  }

  getChartType(type: string): ChartTypeRegistration | undefined {
    return this._chartTypes.get(type);
  }

  chartTypes(): ChartTypeRegistration[] {
    return Array.from(this._chartTypes.values());
  }

  // ظ¤ظ¤ Custom Components ظ¤ظ¤

  registerComponent(reg: ComponentRegistration): void {
    this._components.set(reg.type, reg);
  }

  getComponent(type: string): ComponentRegistration | undefined {
    return this._components.get(type);
  }

  components(): ComponentRegistration[] {
    return Array.from(this._components.values());
  }

  // ظ¤ظ¤ Paper Sizes ظ¤ظ¤

  registerPaperSize(reg: PaperSizeRegistration): void {
    this._paperSizes.set(reg.code, reg);
  }

  getPaperSize(code: string): PaperSizeRegistration | undefined {
    return this._paperSizes.get(code);
  }

  paperSizes(): PaperSizeRegistration[] {
    return Array.from(this._paperSizes.values());
  }

  // ظ¤ظ¤ Utilities ظ¤ظ¤

  reset(): void {
    this._plugins.clear();
    this._formulaFunctions.clear();
    this._exporters.clear();
    this._themes.clear();
    this._barcodeTypes.clear();
    this._chartTypes.clear();
    this._components.clear();
    this._paperSizes.clear();
  }
}

export const pluginRegistry = new PluginRegistryService();
