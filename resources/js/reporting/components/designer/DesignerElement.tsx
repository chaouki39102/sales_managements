import React, { useCallback, useRef, useState } from 'react';
import { useDesignerStore, type DesignerElement as DesignerElementType } from './useDesignerStore';

interface Props {
  element: DesignerElementType;
  isSelected: boolean;
  snap: (val: number) => number;
  zoom: number;
}

const HANDLE_SIZE = 8;

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type Handle = typeof HANDLES[number];

export const DesignerElement: React.FC<Props> = ({ element, isSelected, snap, zoom }) => {
  const selectElement = useDesignerStore(s => s.selectElement);
  const moveElement = useDesignerStore(s => s.moveElement);
  const resizeElement = useDesignerStore(s => s.resizeElement);
  const updateElement = useDesignerStore(s => s.updateElement);
  const clearSelection = useDesignerStore(s => s.clearSelection);
  const setDragging = useDesignerStore(s => s.setDragging);
  const setDragStart = useDesignerStore(s => s.setDragStart);
  const bringToFront = useDesignerStore(s => s.bringToFront);

  const dragRef = useRef<{ startX: number; startY: number; elX: number; elY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; elX: number; elY: number; elW: number; elH: number; handle: Handle } | null>(null);

  // ── Drag ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (element.locked) return;
    e.stopPropagation();
    selectElement(element.id, e.shiftKey || e.ctrlKey);
    bringToFront(element.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, elX: element.x, elY: element.y };
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
      moveElement(element.id, snap(dragRef.current.elX + dx), snap(dragRef.current.elY + dy));
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      setDragging(false);
      setDragStart(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [element.id, element.locked, element.x, element.y, zoom, snap, selectElement, moveElement, setDragging, setDragStart, bringToFront]);

  // ── Resize ──
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: Handle) => {
    if (element.locked) return;
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, elX: element.x, elY: element.y, elW: element.width, elH: element.height, handle };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = (ev.clientX - resizeRef.current.startX) / zoom;
      const dy = (ev.clientY - resizeRef.current.startY) / zoom;
      const { elX, elY, elW, elH } = resizeRef.current;

      let newX = elX;
      let newY = elY;
      let newW = elW;
      let newH = elH;

      switch (handle) {
        case 'nw': newX = snap(elX + dx); newY = snap(elY + dy); newW = snap(elW - dx); newH = snap(elH - dy); break;
        case 'n': newY = snap(elY + dy); newH = snap(elH - dy); break;
        case 'ne': newY = snap(elY + dy); newW = snap(elW + dx); newH = snap(elH - dy); break;
        case 'e': newW = snap(elW + dx); break;
        case 'se': newW = snap(elW + dx); newH = snap(elH + dy); break;
        case 's': newH = snap(elH + dy); break;
        case 'sw': newX = snap(elX + dx); newW = snap(elW - dx); newH = snap(elH + dy); break;
        case 'w': newX = snap(elX + dx); newW = snap(elW - dx); break;
      }

      if (newW < 10) { newW = 10; newX = handle.includes('w') ? elX + elW - 10 : elX; }
      if (newH < 10) { newH = 10; newY = handle.includes('n') ? elY + elH - 10 : elY; }

      updateElement(element.id, { x: newX, y: newY, width: newW, height: newH });
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [element, zoom, snap, updateElement]);

  // ── Double-click to edit label ──
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(element.label);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setEditLabel(element.label);
  }, [element.label]);

  const handleLabelSubmit = useCallback(() => {
    if (editLabel.trim()) {
      updateElement(element.id, { label: editLabel.trim() });
    }
    setEditing(false);
  }, [editLabel, element.id, updateElement]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    cursor: element.locked ? 'default' : 'move',
    opacity: element.visible ? 1 : 0.3,
    userSelect: 'none',
    boxSizing: 'border-box',
    ...element.styles,
  };

  return (
    <div
      style={style}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Selection outline */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
          border: '2px solid #1890ff',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}

      {/* Element content */}
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontSize: 10,
        color: '#666',
        background: element.type === 'group' ? 'rgba(24,144,255,0.05)' : undefined,
        border: element.type === 'group' ? '1px dashed #1890ff' : undefined,
      }}>
        {editing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleLabelSubmit(); if (e.key === 'Escape') setEditing(false); }}
            style={{
              width: '90%',
              border: '1px solid #1890ff',
              padding: '2px 4px',
              fontSize: 10,
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span style={{
            fontSize: 10,
            color: '#999',
            textAlign: 'center',
            padding: 2,
            wordBreak: 'break-word',
            lineHeight: 1.2,
          }}>
            {element.label}
            {element.type === 'group' && ` (${element.children.length})`}
          </span>
        )}
      </div>

      {/* Resize handles */}
      {isSelected && !element.locked && HANDLES.map(handle => {
        const handleStyle: React.CSSProperties = {
          position: 'absolute',
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          background: '#fff',
          border: '2px solid #1890ff',
          zIndex: 2,
          cursor: `${handle}${handle.length === 1 ? '-' : ''}resize`,
        };

        switch (handle) {
          case 'nw': handleStyle.top = -HANDLE_SIZE / 2; handleStyle.left = -HANDLE_SIZE / 2; break;
          case 'n': handleStyle.top = -HANDLE_SIZE / 2; handleStyle.left = '50%'; handleStyle.marginLeft = -HANDLE_SIZE / 2; break;
          case 'ne': handleStyle.top = -HANDLE_SIZE / 2; handleStyle.right = -HANDLE_SIZE / 2; break;
          case 'e': handleStyle.top = '50%'; handleStyle.marginTop = -HANDLE_SIZE / 2; handleStyle.right = -HANDLE_SIZE / 2; break;
          case 'se': handleStyle.bottom = -HANDLE_SIZE / 2; handleStyle.right = -HANDLE_SIZE / 2; break;
          case 's': handleStyle.bottom = -HANDLE_SIZE / 2; handleStyle.left = '50%'; handleStyle.marginLeft = -HANDLE_SIZE / 2; break;
          case 'sw': handleStyle.bottom = -HANDLE_SIZE / 2; handleStyle.left = -HANDLE_SIZE / 2; break;
          case 'w': handleStyle.top = '50%'; handleStyle.marginTop = -HANDLE_SIZE / 2; handleStyle.left = -HANDLE_SIZE / 2; break;
        }

        return (
          <div
            key={handle}
            style={handleStyle}
            onMouseDown={e => handleResizeStart(e, handle)}
          />
        );
      })}
    </div>
  );
};
