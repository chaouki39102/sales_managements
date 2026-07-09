import React from 'react';

interface PanelResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export default function PanelResizer({ onMouseDown }: PanelResizerProps) {
  return (
    <div
      className="pos-resizer"
      onMouseDown={onMouseDown}
    >
      <div className="pos-resizer-line" />
    </div>
  );
}
