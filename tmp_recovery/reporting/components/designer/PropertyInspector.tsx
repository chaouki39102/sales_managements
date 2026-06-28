import React, { useCallback, useMemo, useState } from 'react';
import { useDesignerStore, useSelectedElements } from './useDesignerStore';
import type { ComponentStyle } from '../../core/theme/StyleSystem';

// ظ¤ظ¤ظ¤ Collapsible Section ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

const Section: React.FC<{ label: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ label, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #f0f0f0' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '6px 8px',
          fontSize: 11,
          fontWeight: 600,
          color: '#333',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafafa',
          userSelect: 'none',
        }}
      >
        {label}
        <span style={{ fontSize: 10, color: '#999' }}>{open ? 'ظû╝' : 'ظû╢'}</span>
      </div>
      {open && <div style={{ padding: '6px 8px' }}>{children}</div>}
    </div>
  );
};

// ظ¤ظ¤ظ¤ Property Input ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

const PropRow: React.FC<{
  label: string;
  value: string | number | undefined;
  type?: 'text' | 'number' | 'color' | 'select';
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: any) => void;
  onReset?: () => void;
}> = ({ label, value, type = 'text', options, min, max, step, onChange, onReset }) => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    fontSize: 11,
    padding: '2px 4px',
    border: '1px solid #d9d9d9',
    borderRadius: 3,
    background: '#fff',
    outline: 'none',
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    if (type === 'number') onChange(raw === '' ? undefined : parseFloat(raw));
    else onChange(raw);
  }, [type, onChange]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, gap: 4 }}>
      <div style={{ flex: '0 0 70px', fontSize: 10, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        {type === 'select' && options ? (
          <select value={String(value ?? '')} onChange={handleChange} style={inputStyle}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input
            type={type === 'color' ? 'color' : type === 'number' ? 'number' : 'text'}
            value={value ?? ''}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            style={{
              ...inputStyle,
              width: type === 'color' ? 28 : '100%',
              padding: type === 'color' ? 0 : '2px 4px',
              height: type === 'color' ? 20 : undefined,
            }}
          />
        )}
        {onReset && (
          <button
            onClick={onReset}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 10,
              color: '#999',
              padding: '0 2px',
            }}
            title="Reset to default"
          >
            ظ║
          </button>
        )}
      </div>
    </div>
  );
};

// ظ¤ظ¤ظ¤ PropertyInspector ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

export const PropertyInspector: React.FC = () => {
  const selectedElements = useSelectedElements();
  const updateElement = useDesignerStore(s => s.updateElement);

  const element = selectedElements[0] ?? null;

  const handleStyleChange = useCallback((key: keyof ComponentStyle, value: any) => {
    if (!element) return;
    updateElement(element.id, {
      styles: { ...element.styles, [key]: value },
    });
  }, [element, updateElement]);

  const handleChange = useCallback((key: string, value: any) => {
    if (!element) return;
    updateElement(element.id, { [key]: value } as any);
  }, [element, updateElement]);

  const resetStyle = useCallback((key: keyof ComponentStyle) => {
    if (!element) return;
    const newStyles = { ...element.styles };
    delete newStyles[key];
    updateElement(element.id, { styles: newStyles });
  }, [element, updateElement]);

  if (!element) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 12 }}>
        Select an element to edit its properties
      </div>
    );
  }

  const s = element.styles;

  return (
    <div style={{ height: '100%', overflow: 'auto', fontSize: 12 }}>
      {/* Element info */}
      <div style={{ padding: '8px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>{element.label}</div>
        <div style={{ fontSize: 10, color: '#999' }}>Type: {element.type} ┬╖ ID: {element.id.slice(0, 12)}</div>
      </div>

      {/* General */}
      <Section label="General">
        <PropRow label="Label" value={element.label} onChange={v => handleChange('label', v)} />
        <PropRow label="Type" value={element.type} type="select" options={[
          { label: 'Label', value: 'label' },
          { label: 'Text', value: 'text' },
          { label: 'Image', value: 'image' },
          { label: 'Barcode', value: 'barcode' },
          { label: 'Line', value: 'line' },
          { label: 'Rectangle', value: 'rectangle' },
        ]} onChange={v => handleChange('type', v)} />
        <PropRow label="Section" value={element.sectionType ?? ''} type="select" options={[
          { label: 'None', value: '' },
          { label: 'Header', value: 'header' },
          { label: 'Title', value: 'title' },
          { label: 'Doc Info', value: 'docInfo' },
          { label: 'Party', value: 'party' },
          { label: 'Items', value: 'items' },
          { label: 'Totals', value: 'totals' },
          { label: 'Payments', value: 'payments' },
          { label: 'Footer', value: 'footer' },
        ]} onChange={v => handleChange('sectionType', v)} />
      </Section>

      {/* Position */}
      <Section label="Position">
        <PropRow label="X" value={Math.round(element.x)} type="number" onChange={v => handleChange('x', v ?? 0)} />
        <PropRow label="Y" value={Math.round(element.y)} type="number" onChange={v => handleChange('y', v ?? 0)} />
        <PropRow label="Width" value={Math.round(element.width)} type="number" min={10} onChange={v => handleChange('width', v ?? 10)} />
        <PropRow label="Height" value={Math.round(element.height)} type="number" min={10} onChange={v => handleChange('height', v ?? 10)} />
        <PropRow label="Rotation" value={element.rotation} type="number" min={-360} max={360} step={1} onChange={v => handleChange('rotation', v ?? 0)} />
        <PropRow label="Visible" value={element.visible ? 'true' : 'false'} type="select" options={[{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }]} onChange={v => handleChange('visible', v === 'true')} />
        <PropRow label="Locked" value={element.locked ? 'true' : 'false'} type="select" options={[{ label: 'No', value: 'false' }, { label: 'Yes', value: 'true' }]} onChange={v => handleChange('locked', v === 'true')} />
      </Section>

      {/* Typography */}
      <Section label="Typography">
        <PropRow label="Font" value={s.fontFamily ?? ''} type="select" options={[
          { label: 'Default', value: '' },
          { label: 'Tajawal', value: 'Tajawal' },
          { label: 'Arial', value: 'Arial, sans-serif' },
          { label: 'Times New Roman', value: '"Times New Roman", serif' },
          { label: 'Courier New', value: '"Courier New", monospace' },
        ]} onChange={v => handleStyleChange('fontFamily', v || undefined)} onReset={() => resetStyle('fontFamily')} />
        <PropRow label="Size" value={s.fontSize ?? ''} type="number" min={6} max={72} onChange={v => handleStyleChange('fontSize', v)} onReset={() => resetStyle('fontSize')} />
        <PropRow label="Weight" value={s.fontWeight ?? ''} type="select" options={[
          { label: 'Normal', value: '' },
          { label: 'Bold', value: 'bold' },
          { label: '100', value: '100' },
          { label: '300', value: '300' },
          { label: '500', value: '500' },
          { label: '700', value: '700' },
          { label: '900', value: '900' },
        ]} onChange={v => handleStyleChange('fontWeight', v || undefined)} onReset={() => resetStyle('fontWeight')} />
        <PropRow label="Color" value={s.color ?? '#000000'} type="color" onChange={v => handleStyleChange('color', v)} onReset={() => resetStyle('color')} />
        <PropRow label="Align" value={s.textAlign ?? ''} type="select" options={[
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
          { label: 'Justify', value: 'justify' },
        ]} onChange={v => handleStyleChange('textAlign', v || undefined)} onReset={() => resetStyle('textAlign')} />
      </Section>

      {/* Border / Background */}
      <Section label="Border / Background">
        <PropRow label="Bg Color" value={s.backgroundColor ?? '#ffffff'} type="color" onChange={v => handleStyleChange('backgroundColor', v)} onReset={() => resetStyle('backgroundColor')} />
        <PropRow label="Border" value={s.borderStyle ?? ''} type="select" options={[
          { label: 'None', value: '' },
          { label: 'Solid', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'Dotted', value: 'dotted' },
          { label: 'Double', value: 'double' },
        ]} onChange={v => handleStyleChange('borderStyle', v || undefined)} onReset={() => resetStyle('borderStyle')} />
        <PropRow label="Border W" value={(s as any).borderWidth ?? ''} type="number" min={0} max={10} step={0.5} onChange={v => handleStyleChange('borderWidth', v)} onReset={() => resetStyle('borderWidth')} />
        <PropRow label="Border Color" value={(s as any).borderColor ?? '#000000'} type="color" onChange={v => handleStyleChange('borderColor', v)} onReset={() => resetStyle('borderColor')} />
        <PropRow label="Radius" value={s.borderRadius ?? ''} type="number" min={0} max={50} onChange={v => handleStyleChange('borderRadius', v)} onReset={() => resetStyle('borderRadius')} />
      </Section>

      {/* Data */}
      <Section label="Data" defaultOpen={false}>
        <PropRow label="Field" value={element.data?.field as string ?? ''} onChange={v => handleChange('data', { ...element.data, field: v })} />
        <PropRow label="Formula" value={element.data?.formula as string ?? ''} onChange={v => handleChange('data', { ...element.data, formula: v })} />
      </Section>

      {/* Behavior */}
      <Section label="Behavior" defaultOpen={false}>
        <PropRow label="Z-Index" value={s.zIndex ?? ''} type="number" onChange={v => handleStyleChange('zIndex', v)} onReset={() => resetStyle('zIndex')} />
        <PropRow label="Opacity" value={s.opacity ?? ''} type="number" min={0} max={1} step={0.05} onChange={v => handleStyleChange('opacity', v)} onReset={() => resetStyle('opacity')} />
        <PropRow label="Cursor" value={s.cursor ?? ''} type="select" options={[
          { label: 'Default', value: '' },
          { label: 'Pointer', value: 'pointer' },
          { label: 'Move', value: 'move' },
          { label: 'Crosshair', value: 'crosshair' },
          { label: 'Text', value: 'text' },
        ]} onChange={v => handleStyleChange('cursor', v || undefined)} onReset={() => resetStyle('cursor')} />
      </Section>

      {/* Metadata */}
      <Section label="Metadata" defaultOpen={false}>
        <PropRow label="Parent" value={element.parentId ?? '(root)'} onChange={() => {}} />
        <PropRow label="Children" value={String(element.children.length)} type="number" onChange={() => {}} />
      </Section>
    </div>
  );
};
