import React, { useCallback, useState } from 'react';
import { useDesignerStore } from './useDesignerStore';

interface TreeNodeProps {
  id: string;
  depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ id, depth }) => {
  const element = useDesignerStore(s => s.elements[id]);
  const selectedIds = useDesignerStore(s => s.selectedIds);
  const selectElement = useDesignerStore(s => s.selectElement);
  const hideElement = useDesignerStore(s => s.hideElement);
  const showElement = useDesignerStore(s => s.showElement);
  const lockElement = useDesignerStore(s => s.lockElement);
  const unlockElement = useDesignerStore(s => s.unlockElement);
  const addElement = useDesignerStore(s => s.addElement);
  const deleteSelected = useDesignerStore(s => s.deleteSelected);

  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const isSelected = selectedIds.includes(id);
  const hasChildren = element.children.length > 0;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement(id, e.shiftKey || e.ctrlKey);
  }, [id, selectElement]);

  const handleToggleVisibility = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (element.visible) hideElement(id);
    else showElement(id);
  }, [id, element.visible, hideElement, showElement]);

  const handleToggleLock = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (element.locked) unlockElement(id);
    else lockElement(id);
  }, [id, element.locked, unlockElement, lockElement]);

  const handleAddChild = useCallback(() => {
    addElement({
      id: `el_${Date.now()}`,
      type: 'label',
      label: 'New Element',
      x: 10,
      y: 10,
      width: 80,
      height: 24,
      rotation: 0,
      locked: false,
      visible: true,
      parentId: id,
      children: [],
      styles: {},
    });
    setShowMenu(false);
  }, [id, addElement]);

  const handleDuplicate = useCallback(() => {
    useDesignerStore.getState().copySelected();
    useDesignerStore.getState().pasteClipboard();
    setShowMenu(false);
  }, []);

  if (!element) return null;

  const iconMap: Record<string, string> = {
    group: '⊞',
    label: 'T',
    text: '¶',
    image: '🖼',
    barcode: '⊟',
    line: '━',
    rectangle: '▬',
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={e => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setShowMenu(!showMenu); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '3px 4px',
          paddingLeft: 12 + depth * 14,
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: 11,
          background: isSelected ? '#e6f7ff' : 'transparent',
          borderLeft: isSelected ? '2px solid #1890ff' : '2px solid transparent',
          gap: 4,
        }}
      >
        {/* Expand/collapse */}
        <span
          onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
          style={{ width: 12, fontSize: 8, color: '#999', cursor: hasChildren ? 'pointer' : 'default' }}
        >
          {hasChildren ? (expanded ? '▼' : '▶') : ''}
        </span>

        {/* Type icon */}
        <span style={{ fontSize: 11 }}>{iconMap[element.type] ?? '?'}</span>

        {/* Name */}
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: element.locked ? '#999' : '#333',
          textDecoration: element.visible ? 'none' : 'line-through',
          opacity: element.visible ? 1 : 0.5,
        }}>
          {element.label}
        </span>

        {/* Visibility toggle */}
        <span
          onClick={handleToggleVisibility}
          style={{ cursor: 'pointer', fontSize: 10, color: element.visible ? '#666' : '#ccc', padding: '0 2px' }}
          title={element.visible ? 'Hide' : 'Show'}
        >
          {element.visible ? '👁' : '👁‍🗨'}
        </span>

        {/* Lock toggle */}
        <span
          onClick={handleToggleLock}
          style={{ cursor: 'pointer', fontSize: 10, color: element.locked ? '#666' : '#ccc', padding: '0 2px' }}
          title={element.locked ? 'Unlock' : 'Lock'}
        >
          {element.locked ? '🔒' : '🔓'}
        </span>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            top: menuPos.y,
            left: menuPos.x,
            background: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            fontSize: 11,
          }}
          onClick={() => setShowMenu(false)}
        >
          <div onClick={handleAddChild} style={{ padding: '4px 12px', cursor: 'pointer', ':hover': { background: '#f5f5f5' } }}>Add child</div>
          <div onClick={handleDuplicate} style={{ padding: '4px 12px', cursor: 'pointer' }}>Duplicate</div>
          <div onClick={() => { deleteSelected(); setShowMenu(false); }} style={{ padding: '4px 12px', cursor: 'pointer', color: '#ff4d4f' }}>Delete</div>
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && element.children.map(childId => (
        <TreeNode key={childId} id={childId} depth={depth + 1} />
      ))}
    </div>
  );
};

export const ComponentTree: React.FC = () => {
  const rootIds = useDesignerStore(s => s.rootIds);
  const elements = useDesignerStore(s => s.elements);

  if (rootIds.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 12 }}>
        No elements yet. Use the toolbar to add elements.
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, color: '#333', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
        Report Structure ({Object.keys(elements).length} elements)
      </div>
      {rootIds.map(id => (
        <TreeNode key={id} id={id} depth={0} />
      ))}
    </div>
  );
};
