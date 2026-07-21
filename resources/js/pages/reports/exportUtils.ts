const FORMULA_CHARS = /^[=+\-@\t\r]/;

export function sanitizeCellValue(value: string | number): string | number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return String(value);
  if (FORMULA_CHARS.test(value)) return `'${value}`;
  return value;
}

export interface ExportSheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export async function exportToExcel(sheets: ExportSheet[], filename: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TegSystem';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);

    const headerRow = ws.addRow(sheet.headers);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B6B2B' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    for (const row of sheet.rows) {
      const sanitized = row.map(sanitizeCellValue);
      const r = ws.addRow(sanitized);
      r.eachCell((cell, colNumber) => {
        const original = row[colNumber - 1];
        cell.alignment = { horizontal: 'right' };
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        };
        if (typeof original === 'number') {
          cell.numFmt = '#,##0.00';
        }
      });
    }

    ws.columns.forEach((col, i) => {
      let maxLen = sheet.headers[i]?.length ?? 10;
      for (const row of sheet.rows) {
        const val = String(row[i] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      }
      col.width = Math.min(maxLen + 4, 40);
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
