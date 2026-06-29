import { useEffect, useRef } from 'react';

interface ShortcutActions {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions, deps: { isDirty: boolean; isSaving: boolean }) {
  const refs = useRef(actions);
  useEffect(() => { refs.current = actions; });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const { isDirty, isSaving } = deps;
      if (ctrl && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) refs.current.onSave();
      }
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        refs.current.onUndo();
      }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        refs.current.onRedo();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [deps.isDirty, deps.isSaving]);
}
