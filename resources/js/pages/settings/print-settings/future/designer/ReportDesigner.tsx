import React, { useEffect } from 'react';
import { DesignerToolbar } from './DesignerToolbar';
import { DesignerCanvas } from './DesignerCanvas';
import { PropertyInspector } from './PropertyInspector';
import { ComponentTree } from './ComponentTree';
import { useDesignerStore } from './useDesignerStore';

export interface ReportDesignerProps {
  initialElements?: Record<string, any>;
  onSave?: (elements: Record<string, any>) => void;
}

export const ReportDesigner: React.FC<ReportDesignerProps> = ({ initialElements, onSave }) => {
  const reset = useDesignerStore(s => s.reset);
  const addElement = useDesignerStore(s => s.addElement);

  // Load initial elements
  useEffect(() => {
    if (initialElements && Object.keys(initialElements).length > 0) {
      reset();
      // Add elements with a small delay to ensure store is ready
      const timer = setTimeout(() => {
        Object.values(initialElements).forEach((el: any) => {
          addElement({
            id: el.id,
            type: el.type ?? 'label',
            label: el.label ?? 'Element',
            x: el.x ?? 50,
            y: el.y ?? 50,
            width: el.width ?? 100,
            height: el.height ?? 30,
            rotation: el.rotation ?? 0,
            locked: el.locked ?? false,
            visible: el.visible ?? true,
            parentId: el.parentId ?? null,
            children: el.children ?? [],
            styles: el.styles ?? {},
            data: el.data,
            sectionType: el.sectionType,
          });
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialElements]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#f5f5f5',
      fontFamily: 'Tajawal, sans-serif',
    }}>
      {/* Toolbar */}
      <DesignerToolbar />

      {/* Main content: 3-panel layout */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* Left panel - Component Tree */}
        <div style={{
          width: 220,
          minWidth: 220,
          background: '#fff',
          borderRight: '1px solid #e0e0e0',
          overflow: 'auto',
        }}>
          <ComponentTree />
        </div>

        {/* Center - Canvas */}
        <DesignerCanvas />

        {/* Right panel - Properties */}
        <div style={{
          width: 240,
          minWidth: 240,
          background: '#fff',
          borderLeft: '1px solid #e0e0e0',
          overflow: 'auto',
        }}>
          <PropertyInspector />
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '2px 8px',
        background: '#fafafa',
        borderTop: '1px solid #e0e0e0',
        fontSize: 10,
        color: '#999',
        gap: 16,
      }}>
        <span>Designer v2</span>
        {onSave && (
          <button
            onClick={() => onSave(useDesignerStore.getState().elements)}
            style={{
              marginLeft: 'auto',
              padding: '2px 12px',
              background: '#1890ff',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
};
