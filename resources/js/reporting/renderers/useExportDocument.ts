import { useCallback } from 'react';
import type { UniversalDocumentData } from '../data/UniversalDocumentData';
import { RendererRegistry } from './IRenderer';

/**
 * Triggers a file download from a Blob/string payload.
 */
function download(payload: string, filename: string, mimeType: string): void {
  const blob = new Blob([payload], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * React hook: returns export functions for CSV and Excel.
 *
 * Usage:
 *   const { exportCsv, exportXlsx } = useExportDocument();
 *   await exportCsv(data, template);
 */
export function useExportDocument() {
  const exportCsv = useCallback(async (data: UniversalDocumentData) => {
    const renderer = RendererRegistry.get('csv');
    if (!renderer) throw new Error('CSV renderer not registered');
    const result = await renderer.render({
      data,
      template: { paper_size: 'A4' } as any,
    });
    download(result.payload as string, result.filename ?? 'export.csv', result.mimeType ?? 'text/csv');
  }, []);

  const exportXlsx = useCallback(async (data: UniversalDocumentData) => {
    const renderer = RendererRegistry.get('xlsx');
    if (!renderer) throw new Error('Excel renderer not registered');
    const result = await renderer.render({
      data,
      template: { paper_size: 'A4' } as any,
    });
    download(result.payload as string, result.filename ?? 'export.xlsx', result.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }, []);

  return { exportCsv, exportXlsx };
}

/**
 * Standalone function (non-hook) for use outside React components.
 */
export async function exportDocumentCsv(data: UniversalDocumentData): Promise<void> {
  const renderer = RendererRegistry.get('csv');
  if (!renderer) throw new Error('CSV renderer not registered');
  const result = await renderer.render({
    data,
    template: { paper_size: 'A4' } as any,
  });
  download(result.payload as string, result.filename ?? 'export.csv', result.mimeType ?? 'text/csv');
}

export async function exportDocumentXlsx(data: UniversalDocumentData): Promise<void> {
  const renderer = RendererRegistry.get('xlsx');
  if (!renderer) throw new Error('Excel renderer not registered');
  const result = await renderer.render({
    data,
    template: { paper_size: 'A4' } as any,
  });
  download(result.payload as string, result.filename ?? 'export.xlsx', result.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
