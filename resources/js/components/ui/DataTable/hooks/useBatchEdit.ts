// DataTable/hooks/useBatchEdit.ts

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PendingEdit, BatchEditState } from '../types';

export function useBatchEdit({
  enabled,
  onBatchSave,
}: {
  enabled: boolean;
  onBatchSave?: (edits: PendingEdit[]) => void;
}) {
  const [state, setState] = useState<BatchEditState>({ pending: {}, history: [], future: [] });
  // refs لضمان أن keydown handler يستدعي أحدث نسخة دون stale closure
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoRef.current(); }
      if (isCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoRef.current(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled]);
  const recordEdit = useCallback((edit: PendingEdit) => {
    if (!enabled) return;
    setState(prev => {
      const pending = {
        ...prev.pending,
        [String(edit.rowKey)]: {
          ...(prev.pending[String(edit.rowKey)] ?? {}),
          [edit.colKey]: edit.newValue,
        },
      };
      return { pending, history: [...prev.history, [edit]], future: [] };
    });
  }, [enabled]);
  const undo = useCallback(() => {
    setState(prev => {
      if (!prev.history.length) return prev;
      const last = prev.history[prev.history.length - 1];
      const history = prev.history.slice(0, -1);
      const pending = { ...prev.pending };
      last.forEach(e => {
        const rowPending = { ...(pending[String(e.rowKey)] ?? {}) };
        if (e.oldValue === '') delete rowPending[e.colKey];
        else rowPending[e.colKey] = e.oldValue;
        if (Object.keys(rowPending).length === 0) delete pending[String(e.rowKey)];
        else pending[String(e.rowKey)] = rowPending;
      });
      return { pending, history, future: [last, ...prev.future] };
    });
  }, []);
  const redo = useCallback(() => {
    setState(prev => {
      if (!prev.future.length) return prev;
      const [next, ...future] = prev.future;
      const pending = { ...prev.pending };
      next.forEach(e => {
        pending[String(e.rowKey)] = {
          ...(pending[String(e.rowKey)] ?? {}),
          [e.colKey]: e.newValue,
        };
      });
      return { pending, history: [...prev.history, next], future };
    });
  }, []);
  // تحديث refs بعد كل render
  undoRef.current = undo;
  redoRef.current = redo;

  const save = useCallback(() => {
    if (!onBatchSave) return;
    const edits: PendingEdit[] = [];
    Object.entries(state.pending).forEach(([rowKey, cols]) => {
      Object.entries(cols).forEach(([colKey, newValue]) => {
        const histEntry = [...state.history].reverse().find(h =>
          h.some(e => String(e.rowKey) === rowKey && e.colKey === colKey),
        );
        const oldValue = histEntry?.find(e => String(e.rowKey) === rowKey && e.colKey === colKey)?.oldValue ?? '';
        edits.push({ rowKey, colKey, oldValue, newValue });
      });
    });
    onBatchSave(edits);
    setState({ pending: {}, history: [], future: [] });
  }, [state, onBatchSave]);
  const discard = useCallback(() => {
    setState({ pending: {}, history: [], future: [] });
  }, []);
  const getPendingValue = useCallback((rowKey: string | number, colKey: string): string | undefined => {
    return state.pending[String(rowKey)]?.[colKey];
  }, [state.pending]);
  const pendingCount = useMemo(() => Object.values(state.pending).reduce((acc, cols) => acc + Object.keys(cols).length, 0), [state.pending]);
  return { pendingCount, hasPending: pendingCount > 0, canUndo: state.history.length > 0, canRedo: state.future.length > 0, recordEdit, undo, redo, save, discard, getPendingValue };
}
