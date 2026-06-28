import React, { useCallback } from 'react';
import { useDesignerStore } from './useDesignerStore';

const btn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  color: '#333',
  marginRight: 4,
};

const activeBtn: React.CSSProperties = {
  ...btn,
  background: '#e6f7ff',
  borderColor: '#1890ff',
  color: '#1890ff',
};

const separator: React.CSSProperties = {
  width: 1,
  height: 20,
  background: '#e0e0e0',
  margin: '0 6px',
  display: 'inline-block',
};

export const DesignerToolbar: React.FC = () => {
  const zoom = useDesignerStore(s => s.zoom);
  const showGrid = useDesignerStore(s => s.showGrid);
  const snapToGrid = useDesignerStore(s => s.snapToGrid);
  const showRulers = useDesignerStore(s => s.showRulers);
  const showSafeArea = useDesignerStore(s => s.showSafeArea);
  const selectedIds = useDesignerStore(s => s.selectedIds);
  const rootIds = useDesignerStore(s => s.rootIds);
  const elements = useDesignerStore(s => s.elements);
  const history = useDesignerStore(s => s.history);

  const setZoom = useDesignerStore(s => s.setZoom);
  const toggleGrid = useDesignerStore(s => s.toggleGrid);
  const toggleSnapToGrid = useDesignerStore(s => s.toggleSnapToGrid);
  const toggleRulers = useDesignerStore(s => s.toggleRulers);
  const toggleSafeArea = useDesignerStore(s => s.toggleSafeArea);
  const undo = useDesignerStore(s => s.undo);
  const redo = useDesignerStore(s => s.redo);
  const copySelected = useDesignerStore(s => s.copySelected);
  const pasteClipboard = useDesignerStore(s => s.pasteClipboard);
  const duplicateSelected = useDesignerStore(s => s.duplicateSelected);
  const deleteSelected = useDesignerStore(s => s.deleteSelected);
  const groupSelected = useDesignerStore(s => s.groupSelected);
  const ungroupSelected = useDesignerStore(s => s.ungroupSelected);
  const lockElement = useDesignerStore(s => s.lockElement);
  const unlockElement = useDesignerStore(s => s.unlockElement);
  const bringForward = useDesignerStore(s => s.bringForward);
  const sendBackward = useDesignerStore(s => s.sendBackward);
  const addElement = useDesignerStore(s => s.addElement);

  const hasSelection = selectedIds.length > 0;
  const hasGroup = selectedIds.some(id => elements[id]?.type === 'group');
  const allLocked = selectedIds.every(id => elements[id]?.locked);

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setZoom(parseFloat(e.target.value));
  }, [setZoom]);

  const handleAddElement = useCallback((type: string, label: string) => {
    addElement({
      id: `el_${Date.now()}`,
      type,
      label,
      x: 50,
      y: 50,
      width: 100,
      height: 30,
      rotation: 0,
      locked: false,
      visible: true,
      parentId: null,
      children: [],
      styles: {},
    });
  }, [addElement]);

  const canUndo = history.canUndo;
  const canRedo = history.canRedo;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '4px 8px',
      background: '#fafafa',
      borderBottom: '1px solid #e0e0e0',
      gap: 2,
      flexWrap: 'wrap',
      minHeight: 40,
    }}>
      {/* Undo/Redo */}
      <button style={{ ...btn, opacity: canUndo ? 1 : 0.4 }} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">ظر</button>
      <button style={{ ...btn, opacity: canRedo ? 1 : 0.4 }} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">ظز</button>

      <span style={separator} />

      {/* Add elements */}
      <button style={btn} onClick={() => handleAddElement('label', 'Label')} title="Add label">T</button>
      <button style={btn} onClick={() => handleAddElement('text', 'Text')} title="Add text">┬╢</button>
      <button style={btn} onClick={() => handleAddElement('image', 'Image')} title="Add image">≡اû╝</button>
      <button style={btn} onClick={() => handleAddElement('barcode', 'Barcode')} title="Add barcode">ظèئ</button>
      <button style={btn} onClick={() => handleAddElement('line', 'Line')} title="Add line">ظ¤</button>
      <button style={btn} onClick={() => handleAddElement('rectangle', 'Rectangle')} title="Add rectangle">ظûش</button>

      <span style={separator} />

      {/* Clipboard */}
      <button style={{ ...btn, opacity: hasSelection ? 1 : 0.4 }} onClick={copySelected} disabled={!hasSelection} title="Copy (Ctrl+C)">≡اôï</button>
      <button style={btn} onClick={pasteClipboard} title="Paste (Ctrl+V)">≡اô</button>
      <button style={{ ...btn, opacity: hasSelection ? 1 : 0.4 }} onClick={duplicateSelected} disabled={!hasSelection} title="Duplicate (Ctrl+D)">ظدë</button>
      <button style={{ ...btn, opacity: hasSelection ? 1 : 0.4 }} onClick={deleteSelected} disabled={!hasSelection} title="Delete (Del)">ظ£ـ</button>

      <span style={separator} />

      {/* Layer */}
      <button style={{ ...btn, opacity: hasSelection ? 1 : 0.4 }} onClick={() => selectedIds.forEach(id => bringForward(id))} disabled={!hasSelection} title="Bring forward">ظّ</button>
      <button style={{ ...btn, opacity: hasSelection ? 1 : 0.4 }} onClick={() => selectedIds.forEach(id => sendBackward(id))} disabled={!hasSelection} title="Send backward">ظô</button>

      <span style={separator} />

      {/* Lock */}
      <button style={{ ...btn, opacity: hasSelection ? 1 : 0.4 }}
        onClick={() => { if (allLocked) selectedIds.forEach(id => unlockElement(id)); else selectedIds.forEach(id => lockElement(id)); }}
        disabled={!hasSelection}
        title={allLocked ? 'Unlock' : 'Lock'}
      >
        {allLocked ? '≡ا¤ô' : '≡ا¤ْ'}
      </button>

      {/* Group */}
      <button style={{ ...btn, opacity: hasSelection && selectedIds.length > 1 ? 1 : 0.4 }}
        onClick={groupSelected}
        disabled={!(hasSelection && selectedIds.length > 1)}
        title="Group (Ctrl+G)"
      >
        ظèئ
      </button>
      <button style={{ ...btn, opacity: hasGroup ? 1 : 0.4 }}
        onClick={ungroupSelected}
        disabled={!hasGroup}
        title="Ungroup (Ctrl+Shift+G)"
      >
        ظèا
      </button>

      <span style={separator} />

      {/* View toggles */}
      <button style={showGrid ? activeBtn : btn} onClick={toggleGrid} title="Toggle grid">#</button>
      <button style={snapToGrid ? activeBtn : btn} onClick={toggleSnapToGrid} title="Snap to grid">ظأة</button>
      <button style={showRulers ? activeBtn : btn} onClick={toggleRulers} title="Toggle rulers">≡اô</button>
      <button style={showSafeArea ? activeBtn : btn} onClick={toggleSafeArea} title="Toggle safe area">ظûص</button>

      {/* Zoom */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: '#666' }}>Zoom:</span>
        <select
          value={String(zoom)}
          onChange={handleZoomChange}
          style={{
            fontSize: 11,
            padding: '2px 4px',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            background: '#fff',
          }}
        >
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map(z => (
            <option key={z} value={String(z)}>{Math.round(z * 100)}%</option>
          ))}
        </select>
      </div>
    </div>
  );
};
