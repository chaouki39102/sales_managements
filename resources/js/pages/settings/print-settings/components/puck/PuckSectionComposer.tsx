import { useEffect, useMemo, useRef } from 'react';
import { Puck, type Data, type Config } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import type { PrintTemplate, SectionMeta, SectionTarget } from '../../types/domain';
import type { UniversalDocumentData } from '../../types/data';
import { SECTION_RENDERERS } from '../preview/UniversalPreview';
import { sectionAlign, sectionWidthPct } from '../preview/previewHelpers';
import { buildDefaultSectionsOrder } from '../../services/layoutMigration';
import {
  puckContentToSectionKeys, reorderSectionsPreservingMetas,
  type PuckDataLike,
} from './sectionsOrderAdapter';

/**
 * Editing-only section reorder shell.
 *
 * Puck is used as a PURE DRAG SURFACE over the template's `sections_order`.
 * It never renders the printed document itself — each card delegates to the
 * shared `SECTION_RENDERERS` (the exact renderer `UniversalPreview` uses), so
 * the on-canvas preview is byte-consistent with the final printable layout.
 *
 * Only ordering is authored here: every other `SectionMeta` field (visibility,
 * width/align, margins) is authored in the classic editor and preserved verbatim
 * by `reorderSectionsPreservingMetas`. No Puck data is stored — the page keeps
 * the authoritative `sections_order`.
 *
 * Lazy module: the whole Puck editor (core + css) only loads when this
 * component is mounted.
 */

export const ALL_TARGETS: SectionTarget[] = ['header', 'doc-info', 'items', 'totals', 'payments', 'footer'];

export const SECTION_LABELS: Record<SectionTarget, string> = {
  header: 'رأس المستند',
  'doc-info': 'معلومات المستند',
  items: 'المنتجات',
  totals: 'الإجماليات',
  payments: 'الدفعات',
  footer: 'التذييل',
};

export interface PuckSectionComposerProps {
  tpl: PrintTemplate;
  /** Real doc data for the section previews, or null to render label cards only. */
  data: UniversalDocumentData | null;
  onOrderChange: (next: SectionMeta[]) => void;
  onResetOrder: () => void;
}

const isEqualOrder = (a: readonly string[], b: readonly string[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

function SectionCard({ tpl, target, data }: {
  tpl: PrintTemplate;
  target: SectionTarget;
  data: UniversalDocumentData | null;
}) {
  const label = SECTION_LABELS[target];

  if (!data) {
    return (
      <div className="ps-puck-placeholder">
        <span className="ps-puck-placeholder-title">{label}</span>
        <span className="ps-puck-placeholder-hint">فعّل بيانات حقيقية لمعاينة القسم</span>
      </div>
    );
  }

  const renderer = SECTION_RENDERERS[target];
  if (!renderer) return null;

  const isThermal = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';
  const isA4 = tpl.paper_size === 'A4';
  const isLandscape = !isThermal && tpl.page_orientation === 'landscape';
  const portraitW = isA4 ? 794 : 559;
  const portraitH = isA4 ? 1123 : 794;
  const paperWidth = isThermal
    ? (tpl.paper_width_mm ?? 80) * 3.78
    : (isLandscape ? portraitH : portraitW);

  return (
    <div className="ps-puck-section" style={{ width: paperWidth, maxWidth: '100%' }}>
      {renderer({
        tpl,
        data,
        isThermal,
        paperWidth,
        widthPct: sectionWidthPct(tpl, target, isThermal),
        align: sectionAlign(tpl, target),
      })}
    </div>
  );
}

export default function PuckSectionComposer({ tpl, data, onOrderChange, onResetOrder }: PuckSectionComposerProps) {
  const ordered = tpl.sections_order ?? buildDefaultSectionsOrder();
  const defaults = useMemo(() => buildDefaultSectionsOrder(), []);
  const canReset = !isEqualOrder(ordered.map((s) => s.key), defaults.map((s) => s.key));

  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedKeys = useRef<string[]>(ordered.map((s) => s.key));
  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
  }, []);

  const handleChange = (puckData: Data) => {
    const keys = puckContentToSectionKeys((puckData as unknown as PuckDataLike).content);
    if (isEqualOrder(keys, lastCommittedKeys.current)) return;
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      lastCommittedKeys.current = keys;
      onOrderChange(reorderSectionsPreservingMetas(ordered, keys));
    }, 350);
  };

  const config = useMemo<Config>(() => ({
    root: { fields: {} },
    components: ALL_TARGETS.reduce<Config['components']>((acc, k) => {
      acc[k] = {
        render: () => <SectionCard tpl={tpl} target={k} data={data} />,
        label: SECTION_LABELS[k] ?? k,
        defaultProps: { id: k },
        fields: {},
      };
      return acc;
    }, {}),
  }), [tpl, data]);

  const sectionData = useMemo<PuckDataLike>(() => ({
    root: { props: {} },
    content: ordered.map((s) => ({ type: s.key, props: { id: s.key } })),
  }), [ordered]);

  return (
    <div className="ps-puck-composer">
      <Puck
        config={config}
        data={sectionData as unknown as Data}
        ui={{
          leftSideBarVisible: false,
          rightSideBarVisible: false,
          itemSelector: null,
          previewMode: 'edit',
        }}
        permissions={{ drag: true, insert: false, edit: false, delete: false, duplicate: false }}
        onChange={handleChange}
        renderHeader={({ children }) => (
          <div className="ps-puck-hd">
            <div className="ps-puck-hd-title">ترتيب الأقسام — اسحب لإعادة الترتيب</div>
            <button
              type="button"
              className="ps-puck-reset"
              disabled={!canReset}
              onClick={onResetOrder}
              title="استعادة الترتيب الافتراضي للأقسام"
            >
              <i className="ti ti-rotate-clockwise" />
              <span>استعادة افتراضي</span>
            </button>
            <div className="ps-puck-hd-actions">{children}</div>
          </div>
        )}
        height="100%"
      />
      <style>{`
        .ps-puck-composer { height: 100%; min-height: 0; display: flex; flex-direction: column; }
        .ps-puck-composer .Puck { flex: 1 1 auto; min-height: 0; }
        .ps-puck-hd { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 8px 12px; border-bottom: 1px solid var(--b1); background: var(--bg1); }
        .ps-puck-hd-title { font-weight: 600; color: var(--tx2); }
        .ps-puck-reset { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--b2); background: var(--bg2); color: var(--tx2); border-radius: var(--r2); padding: 4px 10px; font-size: 13px; cursor: pointer; }
        .ps-puck-reset:disabled { opacity: 0.4; cursor: default; }
        .ps-puck-hd-actions { margin-inline-start: auto; display: flex; align-items: center; gap: 4px; }
        .ps-puck-section { margin: 0 auto; overflow: hidden; background: #fff; }
        .ps-puck-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 72px; padding: 12px; border: 1px dashed var(--b2); border-radius: var(--r2); background: var(--bg1); }
        .ps-puck-placeholder-title { font-weight: 600; color: var(--tx2); }
        .ps-puck-placeholder-hint { font-size: 12px; color: var(--tx3); }
      `}</style>
    </div>
  );
}