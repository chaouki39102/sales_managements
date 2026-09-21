import type { ReactNode } from 'react';
import type { ElementKey, ElementPosition, PrintTemplate } from '../../types';

export interface PosProps {
  dragKey: ElementKey;
  tpl: PrintTemplate;
  children: ReactNode;
}

export function Pos({ dragKey, tpl, children }: PosProps) {
  const pos: ElementPosition | undefined = tpl.element_positions?.[dragKey];

  if (!pos) {
    return (
      <div data-drag-key={dragKey} style={{ display: 'contents' }}>
        {children}
      </div>
    );
  }

  return (
    <div
      data-drag-key={dragKey}
      style={{
        position: 'absolute',
        top: `${pos.y}%`,
        right: `${pos.x}%`,
        width: `${pos.width}%`,
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}