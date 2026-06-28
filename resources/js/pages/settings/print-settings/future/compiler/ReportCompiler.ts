import type { PrintTemplate } from '../../../../reporting/core/domain/PrintTemplate';
import type { UniversalDocumentData, CompanyInfo, DocumentLine, Payment } from '../../../../reporting/data/UniversalDocumentData';

// â”€â”€â”€ Compiled Report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Compiler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      marginRight: tpl.margin_sides ?? 10,
      marginLeft: tpl.margin_sides ?? 10,
    },
    styles: {
      fontFamily: tpl.font_family ?? 'Tajawal',
      fontSize: tpl.base_font_size ?? 10,
      color: tpl.company_name_color ?? '#111111',
      backgroundColor: '#ffffff',
      headerBackground: '#fafafa',
      headerColor: tpl.table_header_color ?? '#111111',
      tableBorder: tpl.table_border_style === 'none' ? 'none' : '1px solid #999999',
      altRowBackground: tpl.alternating_color ?? '#fafafa',
    },
    sections,
    columns,
    companyOverrides: {
      name: undefined,
      address: tpl.override_address || undefined,
      phone: tpl.override_phone || undefined,
      nif: tpl.override_nif || undefined,
      rc: tpl.override_rc || undefined,
      nis: tpl.override_nis || undefined,
      ice: tpl.override_ice || undefined,
      article: tpl.override_article || undefined,
      logoUrl: undefined,
    },
    rules: tpl.rules ?? [],
    reportOptions: {
      showCharts: tpl.show_charts ?? false,
      chartType: tpl.chart_type ?? 'bar',
      groupBy: tpl.group_by ?? '',
      sortBy: tpl.sort_by ?? '',
      sortDirection: tpl.sort_direction ?? 'asc',
      showReportHeader: tpl.show_report_header ?? false,
      showReportFooter: tpl.show_report_footer ?? false,
      reportHeaderText: tpl.report_header_text ?? '',
      reportFooterText: tpl.report_footer_text ?? '',
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

