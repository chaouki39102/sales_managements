import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import type { ElementKey, PrintTemplate } from '../../types';
import {
  fixedBoxStyle,
  flowBoxStyle,
  normalizeElementGeometry,
  pageBoxMm,
  hasElementGeometry,
} from '../../services/freeformGeometry';
import { usePrintPage } from './PrintPageContext';

export interface PosProps {
  dragKey: ElementKey;
  tpl: PrintTemplate;
  children: ReactNode;
}

/**
 * Freeform mount point for one report element — the single place where a
 * template's stored geometry is turned into a box.
 *
 * Three outcomes:
 *  - no geometry            → the element stays in the normal document flow
 *                            (`display: contents`, so nothing is clipped)
 *  - `mode: 'flow'`         → stays in the flow at its natural position (shifted
 *                            by a `y` NUDGE) with the given width, but is allowed
 *                            to GROW and paginate
 *  - `mode: 'fixed'`        → an absolute millimetre box on the page, portalled
 *                            into the page-level `.ps-freeform-layer`
 *
 * The portal matters: an absolutely positioned element inside its section
 * would be clipped by the section's `overflow: hidden` and would collapse the
 * flow it left behind. The freeform layer sits directly on the paper instead.
 */
export function Pos({ dragKey, tpl, children }: PosProps) {
  const { box: ctxBox, layerEl } = usePrintPage();
  // ALWAYS computed (never conditionally) so the hook order is stable when a
  // `Pos` is rendered outside a provider and later inside one.
  const ownBox = useMemo(() => pageBoxMm(tpl), [tpl]);
  const box = ctxBox ?? ownBox;
  const geo = useMemo(
    () => normalizeElementGeometry(tpl.element_positions?.[dragKey], box),
    [tpl.element_positions, dragKey, box],
  );

  if (!geo) {
    return (
      <div data-drag-key={dragKey} data-ff-mode="auto" style={{ display: 'contents' }}>
        {children}
      </div>
    );
  }

  if (geo.mode === 'flow') {
    return (
      <div
        data-drag-key={dragKey}
        data-ff-mode="flow"
        style={{ boxSizing: 'border-box', ...flowBoxStyle(geo) }}
      >
        {children}
      </div>
    );
  }

  const node = (
    <div
      data-drag-key={dragKey}
      data-ff-mode="fixed"
      style={{ boxSizing: 'border-box', ...fixedBoxStyle(geo) }}
    >
      {children}
    </div>
  );

  // No layer (rendered outside a page, or before it mounted) → keep the box in
  // place rather than dropping the geometry on the floor.
  if (!layerEl) return node;

  return createPortal(node, layerEl);
}

/** Re-exported so consumers can ask "is this template in freeform mode?" without
 *  reaching into the geometry service. */
export { hasElementGeometry };
