import React from 'react';
import type { CustomElement, PrintTemplate } from '../../types';
import { Pos } from './Pos';

export interface CustomElementLayerProps {
  tpl: PrintTemplate;
}

/** Content of ONE user-added element, with no geometry applied. */
function CustomElementBody({ el }: { el: CustomElement }) {
  // `pointerEvents: 'auto'` is required: the freeform layer itself is
  // pointer-transparent so the flow content beneath stays clickable, and the
  // designer must be able to grab a custom element to drag it.
  const base: React.CSSProperties = { pointerEvents: 'auto' };

  if (el.kind === 'spacer') {
    return <div style={{ ...base, width: '100%', height: '100%' }} />;
  }

  if (el.kind === 'divider') {
    const width = el.borderWidth ?? 1;
    return (
      <div
        style={{
          ...base,
          width: '100%',
          borderTop: `${width}px ${el.borderStyle ?? 'solid'} ${el.borderColor ?? '#111'}`,
        }}
      />
    );
  }

  if (el.kind === 'image') {
    if (!el.src) {
      return (
        <div
          style={{
            ...base,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed #c7c7c7',
            color: '#9a9a9a',
            fontSize: 10,
          }}
        >
          صورة
        </div>
      );
    }
    return (
      <img
        src={el.src}
        alt=""
        style={{ ...base, width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  // text
  return (
    <div
      style={{
        ...base,
        width: '100%',
        height: '100%',
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
        textAlign: el.align ?? 'right',
        fontSize: el.fontSize ?? 12,
        color: el.color ?? '#111',
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? 'italic' : 'normal',
      }}
    >
      {el.text ?? ''}
    </div>
  );
}

/**
 * User-added A4/A5 freeform elements (`tpl.custom_elements`).
 *
 * Each entry is mounted through `Pos` keyed by its own id, so it inherits the
 * exact millimetre geometry / mode rules of a built-in element and becomes
 * draggable in the designer (`data-drag-key={el.id}`).
 *
 * An entry with NO stored geometry is deliberately SKIPPED: a custom element
 * has no natural position in the document flow (unlike a header or the items
 * table), so falling back to `display: contents` would dump it at the bottom of
 * the sheet. Geometry is written the moment the element is added.
 */
export function CustomElementLayer({ tpl }: CustomElementLayerProps) {
  const elements = tpl.custom_elements ?? [];
  if (!elements.length) return null;

  const positioned = elements.filter((el) => !!tpl.element_positions?.[el.id]);
  if (!positioned.length) return null;

  return (
    <>
      {positioned.map((el) => (
        <Pos key={el.id} dragKey={el.id} tpl={tpl}>
          <CustomElementBody el={el} />
        </Pos>
      ))}
    </>
  );
}

export default React.memo(CustomElementLayer);
