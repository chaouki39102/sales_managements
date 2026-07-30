import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { renderLogo } from './LogoRenderer';
import { align, formatDate, Separator, InfoRow, renderLayoutRows } from './shared';
import { printFieldResolver } from '../../services';
import { renderHeaderColumns } from './HeaderColumns';

function r(fieldId: string, data: UniversalDocumentData, tpl: PrintTemplate) {
  return printFieldResolver.resolve(fieldId, data, tpl);
}

function companyInfoStyle(tpl: PrintTemplate) {
  const ff = tpl.company_info_font_family === 'monospace'
    ? "'Courier New', monospace"
    : tpl.company_info_font_family === 'times'
      ? "'Times New Roman', serif"
      : tpl.company_info_font_family === 'arial'
        ? "'Arial', sans-serif"
        : "'Tajawal', sans-serif";
  return {
    fontSize: tpl.company_info_size,
    fontFamily: ff,
    fontWeight: tpl.company_info_bold ? 700 : 400,
    fontStyle: tpl.company_info_italic ? 'italic' : 'normal' as const,
  };
}

const COMPANY_FIELD_MAP: Record<string, { settingKey: string; label: string; rawField: string; simple?: boolean }> = {
  'co_commercial_name': { settingKey: 'show_commercial_name', label: 'الاسم التجاري', rawField: 'company.commercialName' },
  'co_address':         { settingKey: 'show_address',         label: 'العنوان',       rawField: 'company.address', simple: true },
  'co_phone':           { settingKey: 'show_phone',           label: 'الهاتف',        rawField: 'company.phone' },
  'co_mobile':          { settingKey: 'show_mobile',          label: 'المحمول',       rawField: 'company.mobile' },
  'co_fax':             { settingKey: 'show_fax',             label: 'الفاكس',        rawField: 'company.fax' },
  'co_email':           { settingKey: 'show_email',           label: 'البريد الإلكتروني', rawField: 'company.email' },
  'co_nif':             { settingKey: 'show_tax_id',          label: 'NIF',            rawField: 'company.nif' },
  'co_rc':              { settingKey: 'show_rc',              label: 'RC',             rawField: 'company.rc' },
  'co_nis':             { settingKey: 'show_nis',             label: 'NIS',            rawField: 'company.nis' },
  'co_article':         { settingKey: 'show_article',         label: 'المادة الجبائية', rawField: 'company.article' },
  'co_capital':         { settingKey: 'show_capital',         label: 'الرأس المال',    rawField: 'company.capital' },
  'co_bank_name':       { settingKey: 'show_bank_name',       label: 'اسم البنك',     rawField: 'company.bankName' },
  'co_rib':             { settingKey: 'show_rib',             label: 'RIB',            rawField: 'company.rib' },
  'co_activity':        { settingKey: 'show_activity',        label: 'النشاط',        rawField: 'company.activity' },
};

const COMPANY_LABEL_MAP: Record<string, string> = {
  'co_commercial_name': 'label_commercial_name',
  'co_address':         'label_address',
  'co_phone':           'label_phone',
  'co_mobile':          'label_mobile',
  'co_fax':             'label_fax',
  'co_email':           'label_email',
  'co_nif':             'label_nif',
  'co_rc':              'label_rc',
  'co_nis':             'label_nis',
  'co_article':         'label_article',
  'co_capital':         'label_capital',
  'co_bank_name':       'label_bank_name',
  'co_rib':             'label_rib',
  'co_activity':        'label_activity',
};

function renderCompanyInfo(tpl: PrintTemplate, data: UniversalDocumentData, _isThermal: boolean) {
  const st = companyInfoStyle(tpl);
  const rows = tpl.company_info_rows ?? [];

  if (rows.length > 0) {
    return (
      <div style={{ ...st, color: '#444' }}>
        {renderLayoutRows(rows, data, tpl, { sectionAlign: tpl.company_info_align })}
      </div>
    );
  }

  // Legacy fallback: no company_info_rows, show based on show_* toggles
  const color = '#444';
  const Label = ({ label, val }: { label: string; val: unknown }) => {
    if (!val) return null;
    const str = String(val);
    if (!str.trim()) return null;
    return <div><span style={{ fontWeight: 600 }}>{label}: </span>{str}</div>;
  };
  const SimpleField = ({ label: _label, val }: { label: string; val: unknown }) => {
    if (!val) return null;
    const str = String(val);
    if (!str.trim()) return null;
    return <div>{str}</div>;
  };

  const labelOf = (rowId: string) => {
    const labelKey = COMPANY_LABEL_MAP[rowId];
    return (labelKey ? (tpl as any)[labelKey] : '') || COMPANY_FIELD_MAP[rowId]?.label || '';
  };

  const entries = Object.entries(COMPANY_FIELD_MAP)
    .filter(([_id, meta]) => (tpl as any)[meta.settingKey])
    .map(([id, meta]) => ({ rowId: id, label: labelOf(id), simple: meta.simple }));

  return (
    <div style={{ ...st, color }}>
      {entries.map(({ rowId, label, simple }) => {
        const meta = COMPANY_FIELD_MAP[rowId];
        if (!meta) return null;
        const val = r(meta.rawField, data, tpl);
        if (simple) return <SimpleField key={rowId} label={label} val={val} />;
        return <Label key={rowId} label={label} val={val} />;
      })}
    </div>
  );
}

function renderThermalHeader(tpl: PrintTemplate, data: UniversalDocumentData) {
  return (
    <div style={{ textAlign: align(tpl.company_info_align), marginBottom: 5 }}>
        {/* logo removed from left column -- now rendered in logoAndTitle block above */}
      {tpl.show_company_name && (
        <div style={{
          textAlign: align(tpl.company_name_align),
          fontSize: tpl.company_name_size,
          fontWeight: tpl.company_name_bold ? 900 : 400,
          color: tpl.company_name_color,
          marginBottom: 3,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          {r('company.name', data, tpl)}
        </div>
      )}
      {renderCompanyInfo(tpl, data, true)}
      {tpl.header_custom_text && (
        <div style={{ fontSize: tpl.company_info_size, color: '#555', marginTop: 2 }}>
          {tpl.header_custom_text}
        </div>
      )}
      <Separator style={tpl.header_separator} />
    </div>
  );
}

function renderPageHeader(tpl: PrintTemplate, data: UniversalDocumentData, paperWidth: number) {
  const isA4 = tpl.paper_size === 'A4';
  const gap = (tpl.header_columns_gap ?? 30) as number;
  const clientCardW = (tpl.client_card_width ?? 50) as number;
  const docInfoW = 100 - clientCardW - (gap > 0 ? 1 : 0);

  const logoAndTitle = (
    <>
      {tpl.show_logo && renderLogo(tpl, data)}
      {tpl.title_text && (
      <div style={{
        fontSize: tpl.title_size + (isA4 ? 4 : 2),
        fontWeight: tpl.title_bold ? 900 : 400,
        color: tpl.title_color,
        textAlign: align(tpl.title_align),
        marginBottom: isA4 ? 12 : 8,
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}>
        {tpl.title_text}
      </div>
      )}
    </>
  );

  if (tpl.header_layout?.mode === 'columns') {
    const columns = renderHeaderColumns(tpl.header_layout, data, tpl, paperWidth);
    if (columns) {
      return (
        <div style={{ marginBottom: isA4 ? 30 : 16 }}>
          {logoAndTitle}
          {columns}
        </div>
      );
    }
  }

  return (
    <div style={{ marginBottom: isA4 ? 30 : 16 }}>
    {logoAndTitle}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: gap,
        paddingBottom: isA4 ? 20 : 10,
        borderBottom: tpl.header_separator === 'none' ? 'none'
          : `2px ${tpl.header_separator === 'double' ? 'double' : tpl.header_separator === 'dashed' ? 'dashed' : 'solid'} #111`,
      }}>
        <div style={{
          textAlign: align(tpl.company_info_align),
          width: `${clientCardW}%`,
          minWidth: 0,
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}>

        {tpl.show_company_name && (
          <div style={{
            fontSize: tpl.company_name_size + (isA4 ? 4 : 2),
            fontWeight: tpl.company_name_bold ? 900 : 400,
            color: tpl.company_name_color,
            textAlign: align(tpl.company_name_align),
            fontFamily: "'Tajawal', sans-serif",
            marginBottom: 4,
          }}>
            {r('company.name', data, tpl)}
          </div>
        )}
        {renderCompanyInfo(tpl, data, false)}
        {tpl.header_custom_text && (
          <div style={{ fontSize: tpl.company_info_size, color: '#555', marginTop: 4 }}>
            {tpl.header_custom_text}
          </div>
        )}
      </div>

      <div style={{
        textAlign: 'left',
        width: `${docInfoW}%`,
        minWidth: 0,
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}>
        <table style={{ fontSize: tpl.company_info_size, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {tpl.show_doc_number && <InfoRow label={isA4 ? 'رقم الفاتورة' : 'رقم'} value={r('document.number', data, tpl) as string} />}
            {tpl.show_date && <InfoRow label="التاريخ" value={formatDate(r('document.date', data, tpl) as string) + (tpl.show_time && r('document.time', data, tpl) ? ' ' + r('document.time', data, tpl) : '')} />}
            {tpl.show_due_date && r('document.dueDate', data, tpl) && <InfoRow label="تاريخ الاستحقاق" value={r('document.dueDate', data, tpl) as string} />}
            {tpl.show_cashier && (r('customer.cashierName', data, tpl)) && (
              <InfoRow label="الكاشير" value={r('customer.cashierName', data, tpl) as string} />
            )}
            {tpl.show_session && r('session.code', data, tpl) && <InfoRow label="الجلسة" value={r('session.code', data, tpl) as string} />}
            {tpl.show_payment_term && r('document.paymentTerm', data, tpl) && <InfoRow label="شروط الدفع" value={r('document.paymentTerm', data, tpl) as string} />}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}

export function renderHeader(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean, paperWidth: number) {
  if (isThermal) return renderThermalHeader(tpl, data);
  return renderPageHeader(tpl, data, paperWidth);
}
