// ════════════════════════════════════════════════════════════════════════════
// TemplateResolver — pure functions for template resolution
//
// No hooks, no context — just logic.
// ════════════════════════════════════════════════════════════════════════════
import type { PrintTemplate, PaperSize } from '@/pages/settings/print-settings/types';

/**
 * Find the first active template matching docTypeCode and optionally paperSize.
 * Returns undefined if no match.
 */
export function resolveTemplate(
  templates: PrintTemplate[],
  docTypeCode: string,
  paperSize?: PaperSize,
): PrintTemplate | undefined {
  if (!templates || templates.length === 0) return undefined;

  const matching = templates.filter(
    t => t.doc_type_code === docTypeCode && t.is_active,
  );
  if (matching.length === 0) return undefined;

  if (paperSize) {
    return matching.find(t => t.paper_size === paperSize) ?? matching[0];
  }
  return matching[0];
}

/**
 * Find a template by ID.
 */
export function resolveTemplateById(
  templates: PrintTemplate[],
  id: number | null | undefined,
): PrintTemplate | undefined {
  if (!id || !templates || templates.length === 0) return undefined;
  return templates.find(t => t.id === id);
}
