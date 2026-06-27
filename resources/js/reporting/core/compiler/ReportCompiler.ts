import type { PrintTemplate } from '../domain/PrintTemplate';
import type { UniversalDocumentData, CompanyInfo, DocumentLine, Payment } from '../../data/UniversalDocumentData';

// ─── Compiled Report ─────────────────────────────────────────────────────────

export interface CompiledSection {
  id: string;
  type: 'header' | 'title' | 'docInfo' | 'party' | 'items' | 'totals' | 'payments' | 'footer' | 'signature' | 'barcode' | 'qr' | 'reportKpi' | 'reportChart' | 'reportTopProducts' | 'reportHeaderFooter';
  visible: boolean;
  order: number;
  constraints?: {
    minHeight?: number;
    maxHeight?: number;
    allowPageBreak?: boolean;
  };
}

export interface CompiledColumn {
  key: string;
  label: string;
  visible: boolean;
  width: number;
  align: 'left' | 'center' | 'right';
  formula?: string;
  format?: string;
}

export interface CompiledReport {
  version: 2;
  compiledAt: number;
  template: {
    id?: number | null;
    name: string;
    docTypeCode: string;
    paperSize: string;
    paperWidthMm: number;
    orientation: 'portrait' | 'landscape';
    marginTop: number;
    marginBottom: number;
    marginRight: number;
    marginLeft: number;
  };
  styles: {
    fontFamily: string;
    fontSize: number;
    color: string;
    backgroundColor: string;
    headerBackground: string;
    headerColor: string;
    tableBorder: string;
    altRowBackground: string;
  };
  sections: CompiledSection[];
  columns: CompiledColumn[];
  companyOverrides: Partial<CompanyInfo>;
  rules: unknown[];
  reportOptions: {
    showCharts: boolean;
    chartType: 'bar' | 'pie';
    groupBy: string;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    showReportHeader: boolean;
    showReportFooter: boolean;
    reportHeaderText: string;
    reportFooterText: string;
  };
  validation: {
    valid: boolean;
    errors: CompilerError[];
    warnings: CompilerWarning[];
  };
}

export interface CompilerError {
  code: string;
  section: string;
  message: string;
  field?: string;
}

export interface CompilerWarning {
  code: string;
  section: string;
  message: string;
}

// ─── Compiler ────────────────────────────────────────────────────────────────

export function compileReport(tpl: PrintTemplate): CompiledReport {
  const errors: CompilerError[] = [];
  const warnings: CompilerWarning[] = [];

  const sections = buildSections(tpl, errors);
  const columns = buildColumns(tpl, errors);

  if (tpl.paper_size === '80mm' && tpl.columns && tpl.columns.length > 3) {
    warnings.push({
      code: 'TOO_MANY_COLUMNS',
      section: 'columns',
      message: `80mm paper supports at most 3 columns; ${tpl.columns.length} configured`,
    });
  }

  return {
    version: 2,
    compiledAt: Date.now(),
    template: {
      id: tpl.id,
      name: tpl.name ?? 'Untitled',
      docTypeCode: tpl.doc_type_code,
      paperSize: tpl.paper_size ?? 'A4',
      paperWidthMm: tpl.paper_width_mm ?? 210,
      orientation: tpl.orientation ?? 'portrait',
      marginTop: tpl.margin_top ?? 10,
      marginBottom: tpl.margin_bottom ?? 10,
      marginRight: tpl.margin_right ?? 10,
      marginLeft: tpl.margin_left ?? 10,
    },
    styles: {
      fontFamily: tpl.font_family ?? 'Tajawal',
      fontSize: tpl.font_size ?? 10,
      color: tpl.color ?? '#111111',
      backgroundColor: tpl.background_color ?? '#ffffff',
      headerBackground: tpl.header_background ?? '#fafafa',
      headerColor: tpl.header_color ?? '#111111',
      tableBorder: tpl.table_border ?? '1px solid #999999',
      altRowBackground: tpl.alt_row_background ?? '#fafafa',
    },
    sections,
    columns,
    companyOverrides: {
      name: tpl.override_company_name ?? undefined,
      address: tpl.override_company_address ?? undefined,
      phone: tpl.override_company_phone ?? undefined,
      nif: tpl.override_company_nif ?? undefined,
      rc: tpl.override_company_rc ?? undefined,
      nis: tpl.override_company_nis ?? undefined,
      ice: tpl.override_company_ice ?? undefined,
      article: tpl.override_company_article ?? undefined,
      logoUrl: tpl.override_logo ?? undefined,
    },
    rules: (tpl as any).rules ?? [],
    reportOptions: {
      showCharts: (tpl as any).show_charts ?? false,
      chartType: (tpl as any).chart_type ?? 'bar',
      groupBy: (tpl as any).group_by ?? '',
      sortBy: (tpl as any).sort_by ?? '',
      sortDirection: (tpl as any).sort_direction ?? 'asc',
      showReportHeader: (tpl as any).show_report_header ?? false,
      showReportFooter: (tpl as any).show_report_footer ?? false,
      reportHeaderText: (tpl as any).report_header_text ?? '',
      reportFooterText: (tpl as any).report_footer_text ?? '',
    },
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
    },
  };
}

function buildSections(tpl: PrintTemplate, errors: CompilerError[]): CompiledSection[] {
  const s: CompiledSection[] = [];
  const order: Record<string, number> = {
    header: 0, title: 1, docInfo: 2, party: 3, items: 4,
    totals: 5, payments: 6, footer: 7, signature: 8, barcode: 9, qr: 10,
  };

  const sectionKeys = ['header', 'title', 'docInfo', 'party', 'items', 'totals', 'payments', 'footer', 'signature', 'barcode', 'qr', 'reportKpi', 'reportChart', 'reportTopProducts', 'reportHeaderFooter'] as const;

  for (const key of sectionKeys) {
    const showKey = `show_${key}_section` as keyof PrintTemplate;
    if (key === 'reportKpi' || key === 'reportChart' || key === 'reportTopProducts' || key === 'reportHeaderFooter') {
      const reportToggleKey = key === 'reportKpi' ? 'show_report_summary_cards' as any
        : key === 'reportChart' ? 'show_charts' as any
        : key === 'reportTopProducts' ? 'show_report_top_products' as any
        : 'show_report_header' as any;
      const visible = (tpl as any)[reportToggleKey] ?? false;
      s.push({ id: key, type: key, visible, order: order[key] ?? 99 });
      continue;
    }
    const visible = key === 'header' || key === 'title' || key === 'docInfo' || key === 'party' || key === 'items' || key === 'totals' ? true
      : (tpl[showKey] as boolean | undefined) ?? true;
    if (!visible && key !== 'header' && key !== 'title' && key !== 'docInfo' && key !== 'party' && key !== 'items' && key !== 'totals') continue;
    s.push({ id: key, type: key, visible, order: order[key] ?? 99 });
  }

  return s.sort((a, b) => a.order - b.order);
}

function buildColumns(tpl: PrintTemplate, errors: CompilerError[]): CompiledColumn[] {
  if (!tpl.columns) return [];
  return tpl.columns.map(col => {
    const visible = col.visible ?? true;
    return {
      key: col.key ?? col.label ?? 'col',
      label: col.label ?? '',
      visible,
      width: col.width ?? 30,
      align: col.align ?? 'right',
      formula: (col as any).formula ?? undefined,
      format: (col as any).format ?? undefined,
    };
  });
}

export const reportCompiler = { compile: compileReport };
