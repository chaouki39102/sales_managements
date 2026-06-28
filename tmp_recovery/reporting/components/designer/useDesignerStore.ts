import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { CommandHistory, type Command } from '../../core/history/CommandHistory';
import type { ComponentStyle } from '../../core/theme/StyleSystem';

// ظ¤ظ¤ظ¤ Types ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

export interface DesignerElement {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  visible: boolean;
  parentId: string | null;
  children: string[];
  styles: ComponentStyle;
  data?: Record<string, unknown>;
  sectionType?: string;
}

export interface DesignerState {
  // Elements
  elements: Record<string, DesignerElement>;
  rootIds: string[];
  selectedIds: string[];

  // Canvas
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  showRulers: boolean;
  showSafeArea: boolean;

  // Clipboard
  clipboard: DesignerElement[] | null;

  // Interaction state
  isDragging: boolean;
  isResizing: boolean;
  resizeHandle: string | null;
  dragStart: { x: number; y: number } | null;

  // History
  history: CommandHistory;
}

export interface DesignerActions {
  // Element operations
  addElement: (element: DesignerElement) => void;
  updateElement: (id: string, changes: Partial<DesignerElement>) => void;
  removeElement: (id: string) => void;
  moveElement: (id: string, x: number, y: number) => void;
  resizeElement: (id: string, width: number, height: number) => void;
  rotateElement: (id: string, rotation: number) => void;

  // Selection
  selectElement: (id: string, addToSelection?: boolean) => void;
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Layer operations
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Grouping
  groupSelected: () => void;
  ungroupSelected: () => void;

  // Lock/Visibility
  lockElement: (id: string) => void;
  unlockElement: (id: string) => void;
  hideElement: (id: string) => void;
  showElement: (id: string) => void;

  // Clipboard
  copySelected: () => void;
  pasteClipboard: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;

  // Canvas state
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  toggleRulers: () => void;
  toggleSafeArea: () => void;

  // Interaction
  setDragging: (isDragging: boolean) => void;
  setDragStart: (pos: { x: number; y: number } | null) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Bulk
  reset: () => void;
}

type DesignerStore = DesignerState & DesignerActions;

// ظ¤ظ¤ظ¤ Store ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

export const useDesignerStore = create<DesignerStore>((set, get) => ({
  // Initial state
  elements: {},
  rootIds: [],
  selectedIds: [],
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  gridSize: 10,
  snapToGrid: true,
  showRulers: true,
  showSafeArea: true,
  clipboard: null,
  isDragging: false,
  isResizing: false,
  resizeHandle: null,
  dragStart: null,
  history: new CommandHistory(200),

  // ظ¤ظ¤ Element Operations ظ¤ظ¤

  addElement: (element) => {
    const state = get();
    const cmd: Command = {
      type: 'add',
      label: `Add ${element.type}`,
      execute: () => set(s => ({
        elements: { ...s.elements, [element.id]: element },
        rootIds: element.parentId === null ? [...s.rootIds, element.id] : s.rootIds,
        selectedIds: [element.id],
      })),
      undo: () => set(s => {
        const { [element.id]: _, ...rest } = s.elements;
        return {
          elements: rest,
          rootIds: s.rootIds.filter(id => id !== element.id),
          selectedIds: [],
        };
      }),
    };
    state.history.execute(cmd);
  },

  updateElement: (id, changes) => {
    const state = get();
    const prev = state.elements[id];
    if (!prev) return;
    const cmd: Command = {
      type: 'update',
      label: `Update ${changes.type ?? prev.type}`,
      execute: () => set(s => ({
        elements: { ...s.elements, [id]: { ...s.elements[id], ...changes } },
      })),
      undo: () => set(s => ({
        elements: { ...s.elements, [id]: { ...prev } },
      })),
    };
    state.history.execute(cmd);
  },

  removeElement: (id) => {
    const state = get();
    const element = state.elements[id];
    if (!element) return;
    const removeRecursive = (elId: string): string[] => {
      const el = state.elements[elId];
      if (!el) return [elId];
      return [elId, ...el.children.flatMap(removeRecursive)];
    };
    const idsToRemove = removeRecursive(id);
    const removedElements = idsToRemove.map(eid => state.elements[eid]).filter(Boolean);
    const parentId = element.parentId;

    const cmd: Command = {
      type: 'remove',
      label: `Remove ${element.type}`,
      execute: () => set(s => {
        const newElements = { ...s.elements };
        for (const eid of idsToRemove) delete newElements[eid];
        return {
          elements: newElements,
          rootIds: s.rootIds.filter(rid => !idsToRemove.includes(rid)),
          selectedIds: [],
        };
      }),
      undo: () => set(s => {
        const newElements = { ...s.elements };
        for (const el of removedElements) newElements[el.id] = el;
        const newRootIds = [...s.rootIds];
        if (parentId === null && !newRootIds.includes(id)) newRootIds.push(id);
        return { elements: newElements, rootIds: newRootIds };
      }),
    };
    state.history.execute(cmd);
  },

  moveElement: (id, x, y) => {
    const state = get();
    const prev = state.elements[id];
    if (!prev) return;
    const cmd: Command = {
      type: 'move',
      label: 'Move element',
      execute: () => set(s => ({
        elements: { ...s.elements, [id]: { ...s.elements[id], x, y } },
      })),
      undo: () => set(s => ({
        elements: { ...s.elements, [id]: { ...prev, x: prev.x, y: prev.y } },
      })),
    };
    state.history.execute(cmd);
  },

  resizeElement: (id, width, height) => {
    const state = get();
    const prev = state.elements[id];
    if (!prev) return;
    const cmd: Command = {
      type: 'resize',
      label: 'Resize element',
      execute: () => set(s => ({
        elements: { ...s.elements, [id]: { ...s.elements[id], width, height } },
      })),
      undo: () => set(s => ({
        elements: { ...s.elements, [id]: { ...prev, width: prev.width, height: prev.height } },
      })),
    };
    state.history.execute(cmd);
  },

  rotateElement: (id, rotation) => {
    const state = get();
    const prev = state.elements[id];
    if (!prev) return;
    const cmd: Command = {
      type: 'rotate',
      label: 'Rotate element',
      execute: () => set(s => ({
        elements: { ...s.elements, [id]: { ...s.elements[id], rotation } },
      })),
      undo: () => set(s => ({
        elements: { ...s.elements, [id]: { ...prev, rotation: prev.rotation } },
      })),
    };
    state.history.execute(cmd);
  },

  // ظ¤ظ¤ Selection ظ¤ظ¤

  selectElement: (id, addToSelection = false) => {
    set(s => ({
      selectedIds: addToSelection
        ? s.selectedIds.includes(id)
          ? s.selectedIds.filter(sid => sid !== id)
          : [...s.selectedIds, id]
        : [id],
    }));
  },

  selectElements: (ids) => set({ selectedIds: ids }),

  clearSelection: () => set({ selectedIds: [] }),

  selectAll: () => set(s => ({ selectedIds: Object.keys(s.elements) })),

  // ظ¤ظ¤ Layer Operations ظ¤ظ¤

  bringForward: (id) => {
    const state = get();
    const rootIds = [...state.rootIds];
    const idx = rootIds.indexOf(id);
    if (idx < rootIds.length - 1) {
      [rootIds[idx], rootIds[idx + 1]] = [rootIds[idx + 1], rootIds[idx]];
      set({ rootIds });
    }
  },

  sendBackward: (id) => {
    const state = get();
    const rootIds = [...state.rootIds];
    const idx = rootIds.indexOf(id);
    if (idx > 0) {
      [rootIds[idx], rootIds[idx - 1]] = [rootIds[idx - 1], rootIds[idx]];
      set({ rootIds });
    }
  },

  bringToFront: (id) => {
    const state = get();
    const rootIds = state.rootIds.filter(rid => rid !== id);
    rootIds.push(id);
    set({ rootIds });
  },

  sendToBack: (id) => {
    const state = get();
    const rootIds = state.rootIds.filter(rid => rid !== id);
    rootIds.unshift(id);
    set({ rootIds });
  },

  // ظ¤ظ¤ Grouping ظ¤ظ¤

  groupSelected: () => {
    const state = get();
    const selected = state.selectedIds.map(id => state.elements[id]).filter(Boolean);
    if (selected.length < 2) return;
    const groupId = `group_${Date.now()}`;
    const minX = Math.min(...selected.map(e => e.x));
    const minY = Math.min(...selected.map(e => e.y));
    const maxX = Math.max(...selected.map(e => e.x + e.width));
    const maxY = Math.max(...selected.map(e => e.y + e.height));

    const group: DesignerElement = {
      id: groupId,
      type: 'group',
      label: 'Group',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0,
      locked: false,
      visible: true,
      parentId: null,
      children: selected.map(e => e.id),
      styles: {},
    };

    const childUpdates: Array<{ id: string; changes: Partial<DesignerElement> }> = selected.map(e => ({
      id: e.id,
      changes: { parentId: groupId },
    }));

    const cmd: Command = {
      type: 'group',
      label: 'Group elements',
      execute: () => set(s => {
        let newElements = { ...s.elements, [groupId]: group };
        for (const u of childUpdates) {
          newElements[u.id] = { ...newElements[u.id], ...u.changes };
        }
        return {
          elements: newElements,
          rootIds: [...s.rootIds.filter(rid => !selected.some(e => e.id === rid)), groupId],
          selectedIds: [groupId],
        };
      }),
      undo: () => set(s => {
        const newElements = { ...s.elements };
        delete newElements[groupId];
        for (const u of childUpdates) {
          newElements[u.id] = { ...newElements[u.id], parentId: null };
        }
        return {
          elements: newElements,
          rootIds: [...s.rootIds.filter(rid => rid !== groupId), ...selected.map(e => e.id)],
          selectedIds: selected.map(e => e.id),
        };
      }),
    };
    state.history.execute(cmd);
  },

  ungroupSelected: () => {
    const state = get();
    const selected = state.selectedIds.map(id => state.elements[id]).filter(e => e && e.type === 'group');
    if (selected.length === 0) return;

    for (const group of selected) {
      const cmd: Command = {
        type: 'ungroup',
        label: 'Ungroup',
        execute: () => set(s => {
          const newElements = { ...s.elements };
          delete newElements[group.id];
          for (const childId of group.children) {
            if (newElements[childId]) {
              newElements[childId] = { ...newElements[childId], parentId: null };
            }
          }
          return {
            elements: newElements,
            rootIds: [...s.rootIds.filter(rid => rid !== group.id), ...group.children],
            selectedIds: group.children,
          };
        }),
        undo: () => set(s => {
          const newElements = { ...s.elements, [group.id]: group };
          for (const childId of group.children) {
            if (newElements[childId]) {
              newElements[childId] = { ...newElements[childId], parentId: group.id };
            }
          }
          return {
            elements: newElements,
            rootIds: [...s.rootIds.filter(rid => !group.children.includes(rid)), group.id],
            selectedIds: [group.id],
          };
        }),
      };
      state.history.execute(cmd);
    }
  },

  // ظ¤ظ¤ Lock/Visibility ظ¤ظ¤

  lockElement: (id) => set(s => ({
    elements: { ...s.elements, [id]: { ...s.elements[id], locked: true } },
  })),

  unlockElement: (id) => set(s => ({
    elements: { ...s.elements, [id]: { ...s.elements[id], locked: false } },
  })),

  hideElement: (id) => set(s => ({
    elements: { ...s.elements, [id]: { ...s.elements[id], visible: false } },
  })),

  showElement: (id) => set(s => ({
    elements: { ...s.elements, [id]: { ...s.elements[id], visible: true } },
  })),

  // ظ¤ظ¤ Clipboard ظ¤ظ¤

  copySelected: () => {
    const state = get();
    state.clipboard = state.selectedIds.map(id => state.elements[id]).filter(Boolean);
  },

  pasteClipboard: () => {
    const state = get();
    if (!state.clipboard || state.clipboard.length === 0) return;
    const offset = 20;
    const newIds: string[] = [];
    const idMap = new Map<string, string>();

    for (const el of state.clipboard) {
      const newId = `${el.id}_copy_${Date.now()}`;
      idMap.set(el.id, newId);
      newIds.push(newId);
    }

    const pastedElements: Record<string, DesignerElement> = {};
    for (const el of state.clipboard) {
      const newId = idMap.get(el.id)!;
      pastedElements[newId] = {
        ...el,
        id: newId,
        x: el.x + offset,
        y: el.y + offset,
        parentId: el.parentId ? idMap.get(el.parentId) ?? null : null,
        selected: true,
      };
    }

    set(s => ({
      elements: { ...s.elements, ...pastedElements },
      rootIds: [...s.rootIds, ...newIds],
      selectedIds: newIds,
    }));
  },

  duplicateSelected: () => {
    const state = get();
    state.copySelected();
    state.pasteClipboard();
  },

  deleteSelected: () => {
    const state = get();
    const ids = [...state.selectedIds];
    if (ids.length === 0) return;
    const cmd: Command = {
      type: 'delete',
      label: `Delete ${ids.length} element(s)`,
      execute: () => set(s => {
        const newElements = { ...s.elements };
        const removedIds = new Set<string>();
        const collectChildren = (parentId: string) => {
          removedIds.add(parentId);
          const el = newElements[parentId];
          if (el) for (const childId of el.children) collectChildren(childId);
        };
        for (const id of ids) collectChildren(id);
        for (const id of removedIds) delete newElements[id];
        return {
          elements: newElements,
          rootIds: s.rootIds.filter(rid => !removedIds.has(rid)),
          selectedIds: [],
        };
      }),
      undo: () => set(s => {
        const newElements = { ...s.elements };
        const restoreElements: DesignerElement[] = [];
        for (const id of ids) {
          const el = state.elements[id];
          if (el) { restoreElements.push(el); newElements[id] = el; }
        }
        return {
          elements: newElements,
          rootIds: [...s.rootIds, ...restoreElements.filter(e => e.parentId === null).map(e => e.id)],
          selectedIds: ids,
        };
      }),
    };
    state.history.execute(cmd);
  },

  // ظ¤ظ¤ Canvas State ظ¤ظ¤

  setZoom: (zoom) => set({
    zoom: Math.max(0.25, Math.min(4, zoom)),
  }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  toggleGrid: () => set(s => ({ showGrid: !s.showGrid })),

  toggleSnapToGrid: () => set(s => ({ snapToGrid: !s.snapToGrid })),

  toggleRulers: () => set(s => ({ showRulers: !s.showRulers })),

  toggleSafeArea: () => set(s => ({ showSafeArea: !s.showSafeArea })),

  // ظ¤ظ¤ Interaction ظ¤ظ¤

  setDragging: (isDragging) => set({ isDragging }),

  setDragStart: (pos) => set({ dragStart: pos }),

  // ظ¤ظ¤ History ظ¤ظ¤

  undo: () => {
    const state = get();
    state.history.undo();
    set(s => ({ selectedIds: s.selectedIds }));
  },

  redo: () => {
    const state = get();
    state.history.redo();
    set(s => ({ selectedIds: s.selectedIds }));
  },

  // ظ¤ظ¤ Bulk ظ¤ظ¤

  reset: () => set({
    elements: {},
    rootIds: [],
    selectedIds: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    clipboard: null,
  }),
}));

// ظ¤ظ¤ظ¤ Selectors ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

export function useSelectedElements() {
  return useDesignerStore(useShallow(s => s.selectedIds.map(id => s.elements[id]).filter(Boolean)));
}

export function useElementAtPosition(x: number, y: number) {
  return useDesignerStore(s => {
    const sorted = [...s.rootIds].reverse();
    for (const id of sorted) {
      const el = s.elements[id];
      if (el && x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) return el;
    }
    return null;
  });
}
