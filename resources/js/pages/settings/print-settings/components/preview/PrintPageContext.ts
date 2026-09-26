/**
 * Print page context — hands the page box (paper + margins, in millimetres) and
 * the freeform layer node down to every `Pos` wrapper in the preview tree.
 *
 * Why a context instead of computing the box inside each `Pos`: the box must be
 * derived from the SAME template instance the page renders, and the layer node
 * only exists once `UniversalPreview` has mounted. A context keeps that single
 * source of truth without threading props through six section renderers.
 */
import { createContext, useContext } from 'react';
import type { PageBox } from '../../services/freeformGeometry';

export type PrintPageValue = {
  /** Paper + margins in mm. `null` until the provider computes it. */
  box: PageBox | null;
  /** The `.ps-freeform-layer` node fixed elements portal into. */
  layerEl: HTMLElement | null;
  setLayerEl: (el: HTMLElement | null) => void;
};

const EMPTY: PrintPageValue = { box: null, layerEl: null, setLayerEl: () => {} };

const PrintPageContext = createContext<PrintPageValue>(EMPTY);

export const PrintPageProvider = PrintPageContext.Provider;

export function usePrintPage(): PrintPageValue {
  return useContext(PrintPageContext);
}
