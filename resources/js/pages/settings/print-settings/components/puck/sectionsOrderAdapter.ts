import type { SectionMeta, SectionTarget } from '../../types/domain';
import { buildDefaultSectionsOrder } from '../../services/layoutMigration';

/**
 * Bridge between the print-template `sections_order: SectionMeta[]` and the
 * Puck drop-zone state. Kept PURE (no `@puckeditor/core` import) so it is
 * unit-testable without the heavy types and so wiring is a single seam.
 *
 * Metadata authored elsewhere (visible/order/width/align/margins/minHeight)
 * is NEVER authored here — this adapter only carries the section KEY through
 * the drag surface (`props.id`) and re-produces the full metas via
 * `reorderSectionsPreservingMetas`.
 */

/** Structural subset of Puck's `Data.content` entry that we read back. */
export type PuckContentItem = {
  type: string;
  props?: { id?: string | null } | null;
};

/** Structural subset of Puck's `Data` — enough for the section drop zone. */
export type PuckDataLike = {
  root: { props: Record<string, never> };
  content: PuckContentItem[];
};

/** Convert the template's ordered sections into Puck drop-zone content. */
export function sectionsToPuckData(ordered: SectionMeta[]): PuckDataLike {
  return {
    root: { props: {} },
    content: ordered.map((s) => ({ type: s.key, props: { id: s.key } })),
  };
}

/**
 * Read the section keys back out of Puck's `data.content`.
 * Any entry without a usable `props.id` is skipped.
 */
export function puckContentToSectionKeys(content: readonly PuckContentItem[] | null | undefined): string[] {
  if (!Array.isArray(content)) return [];
  const keys: string[] = [];
  for (const c of content) {
    const id = c?.props?.id;
    if (typeof id === 'string' && id.length > 0) keys.push(id);
  }
  return keys;
}

const isSectionTarget = (k: unknown): k is SectionTarget =>
  k === 'header' || k === 'doc-info' || k === 'items' || k === 'totals' || k === 'payments' || k === 'footer';

/**
 * Produce a new `sections_order` whose key sequence matches the dragged
 * order. Every `SectionMeta` field is preserved: existing metas are matched
 * by `key`; keys missing from `current` (defensive) fall back to the default
 * section entry. Keys dropped on the floor by Puck (never happens with
 * drag-only permissions, but cheap insurance) are re-appended at the end
 * so no section silently disappears.
 */
export function reorderSectionsPreservingMetas(
  current: readonly SectionMeta[],
  orderedKeys: readonly string[],
): SectionMeta[] {
  const defaults = buildDefaultSectionsOrder();
  const byKey = new Map<string, SectionMeta>();
  for (const s of current) byKey.set(s.key, s);
  for (const d of defaults) if (!byKey.has(d.key)) byKey.set(d.key, d);

  const seen = new Set<string>();
  const ordered: SectionMeta[] = [];

  for (const k of orderedKeys) {
    if (!isSectionTarget(k)) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    const meta = byKey.get(k);
    if (meta) ordered.push({ ...meta, order: ordered.length });
  }

  // Re-append anything the adapter dropped, keeping its original order.
  for (const s of current) {
    if (seen.has(s.key)) continue;
    seen.add(s.key);
    ordered.push({ ...s, order: ordered.length });
  }

  // Nothing usable came out of the drag surface — never let a template's
  // sections_order collapse to an empty list (that would wipe the layout).
  return ordered.length > 0 ? ordered : buildDefaultSectionsOrder();
}