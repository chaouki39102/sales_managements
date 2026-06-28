import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDesignerStore, useElementAtPosition } from './useDesignerStore';
import { DesignerElement as ElementComponent } from './DesignerElement';

interface RubberBand {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const DesignerCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const elements = useDesignerStore(s => s.elements);
  const rootIds = useDesignerStore(s => s.rootIds);
  const zoom = useDesignerStore(s => s.zoom);
  const panX = useDesignerStore(s => s.panX);
  const panY = useDesignerStore(s => s.panY);
  const showGrid = useDesignerStore(s => s.showGrid);
  const gridSize = useDesignerStore(s => s.gridSize);
  const snapToGrid = useDesignerStore(s => s.snapToGrid);
  const showRulers = useDesignerStore(s => s.showRulers);
  const showSafeArea = useDesignerStore(s => s.showSafeArea);
  const selectedIds = useDesignerStore(s => s.selectedIds);
  const isDragging = useDesignerStore(s => s.isDragging);
  const selectElement = useDesignerStore(s => s.selectElement);
  const clearSelection = useDesignerStore(s => s.clearSelection);
  const selectElements = useDesignerStore(s => s.selectElements);
  const setPan = useDesignerStore(s => s.setPan);
  const setDragging = useDesignerStore(s => s.setDragging);
  const setDragStart = useDesignerStore(s => s.setDragStart);
  const updateElement = useDesignerStore(s => s.updateElement);
  const moveElement = useDesignerStore(s => s.moveElement);

  const [rubberBand, setRubberBand] = useState<RubberBand | null>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // ظ¤ظ¤ Grid rendering ظ¤ظ¤
  const gridPattern = showGrid ? (
    <defs>
      <pattern id="grid" width={gridSize * zoom} height={gridSize * zoom} patternUnits="userSpaceOnUse">
        <path d={`M ${gridSize * zoom} 0 L 0 0 0 ${gridSize * zoom}`} fill="none" stroke="#e0e0e0" strokeWidth={0.5 / zoom} />
      </pattern>
    </defs>
  ) : null;

  // ظ¤ظ¤ Ruler rendering ظ¤ظ¤
  const renderRuler = (horizontal: boolean) => {
    const length = horizontal ? 800 : 594;
    const marks: React.ReactNode[] = [];
    const step = 10;
    const majorStep = 50;

    for (let i = 0; i <= length; i += step) {
      const isMajor = i % majorStep === 0;
      const pos = i * zoom;
      marks.push(
        <line
          key={`${horizontal ? 'h' : 'v'}_${i}`}
          x1={horizontal ? pos : 0}
          y1={horizontal ? 0 : pos}
          x2={horizontal ? pos : step * zoom / 2}
          y2={horizontal ? step * zoom / 2 : pos}
          stroke="#999"
          strokeWidth={isMajor ? 1 : 0.5}
        />,
      );
      if (isMajor) {
        marks.push(
          <text
            key={`${horizontal ? 'h' : 'v'}_txt_${i}`}
            x={horizontal ? pos + 2 : 12}
            y={horizontal ? 14 : pos + 10}
            fontSize={8}
            fill="#666"
          >
            {i}
          </text>,
        );
      }
    }
    return marks;
  };

  // ظ¤ظ¤ Mouse handlers ظ¤ظ¤
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).closest('.canvas-background')) {
      // Middle mouse or space+click for pan
      if (e.button === 1 || e.altKey) {
        setPanning(true);
        panStart.current = { x: e.clientX - panX, y: e.clientY - panY };
        return;
      }

      // Rubber band selection
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      setRubberBand({ startX: x, startY: y, endX: x, endY: y });
      clearSelection();
    }
  }, [panX, panY, zoom, clearSelection]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) {
      setPan(e.clientX - panStart.current.x, e.clientY - panStart.current.y);
      return;
    }

    if (rubberBand) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setRubberBand({
        ...rubberBand,
        endX: (e.clientX - rect.left) / zoom,
        endY: (e.clientY - rect.top) / zoom,
      });
    }
  }, [panning, rubberBand, zoom, setPan]);

  const handleMouseUp = useCallback(() => {
    if (panning) {
      setPanning(false);
      return;
    }

    if (rubberBand) {
      const minX = Math.min(rubberBand.startX, rubberBand.endX);
      const maxX = Math.max(rubberBand.startX, rubberBand.endX);
      const minY = Math.min(rubberBand.startY, rubberBand.endY);
      const maxY = Math.max(rubberBand.startY, rubberBand.endY);

      const ids = Object.values(elements)
        .filter(el =>
          el.x >= minX && el.x + el.width <= maxX &&
          el.y >= minY && el.y + el.height <= maxY
        )
        .map(el => el.id);

      if (ids.length > 0) selectElements(ids);
      setRubberBand(null);
    }
  }, [panning, rubberBand, elements, selectElements]);

  // ظ¤ظ¤ Snap to grid helper ظ¤ظ¤
  const snap = useCallback((val: number) => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // ظ¤ظ¤ Keyboard shortcuts ظ¤ظ¤
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        useDesignerStore.getState().deleteSelected();
      }
      if (e.key === 'Escape') {
        useDesignerStore.getState().clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rubberBandRect = rubberBand ? {
    left: Math.min(rubberBand.startX, rubberBand.endX),
    top: Math.min(rubberBand.startY, rubberBand.endY),
    width: Math.abs(rubberBand.endX - rubberBand.startX),
    height: Math.abs(rubberBand.endY - rubberBand.startY),
  } : null;

  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#f0f0f0' }}>
      {/* Rulers */}
      {showRulers && (
        <>
          <svg
            style={{ position: 'absolute', top: 0, left: 20, height: 20, right: 0, zIndex: 10 }}
            width="100%"
            height={20}
          >
            {renderRuler(true)}
          </svg>
          <svg
            style={{ position: 'absolute', top: 20, left: 0, width: 20, bottom: 0, zIndex: 10 }}
            width={20}
            height="100%"
          >
            {renderRuler(false)}
          </svg>
        </>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="canvas-background"
        style={{
          position: 'absolute',
          top: showRulers ? 20 : 0,
          left: showRulers ? 20 : 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          cursor: panning ? 'grabbing' : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: 800,
            height: 594,
            position: 'relative',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {/* Grid */}
          {showGrid && (
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              width={800}
              height={594}
            >
              {gridPattern}
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          )}

          {/* Safe area / margins */}
          {showSafeArea && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                right: 10,
                bottom: 10,
                border: '1px dashed rgba(255,0,0,0.3)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          )}

          {/* Render elements */}
          {rootIds.map(id => {
            const el = elements[id];
            if (!el || !el.visible) return null;
            return (
              <ElementComponent
                key={id}
                element={el}
                isSelected={selectedIds.includes(id)}
                snap={snap}
                zoom={zoom}
              />
            );
          })}

          {/* Rubber band */}
          {rubberBandRect && (
            <div
              style={{
                position: 'absolute',
                left: rubberBandRect.left,
                top: rubberBandRect.top,
                width: rubberBandRect.width,
                height: rubberBandRect.height,
                border: '1px solid #1890ff',
                background: 'rgba(24,144,255,0.1)',
                pointerEvents: 'none',
                zIndex: 100,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
