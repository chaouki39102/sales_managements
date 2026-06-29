import { useRef, useState, useCallback } from 'react';

interface Snapshot<T> {
  data: T;
}

export function useUndoRedo<T>(maxHistory = 60) {
  const stack = useRef<Snapshot<T>[]>([]);
  const pos = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const push = useCallback((item: T) => {
    const s = stack.current;
    s.length = pos.current + 1;
    s.push({ data: { ...item as any } });
    if (s.length > maxHistory) s.shift();
    pos.current = s.length - 1;
    setCanUndo(pos.current > 0);
    setCanRedo(false);
  }, [maxHistory]);

  const undo = useCallback((): T | undefined => {
    const s = stack.current;
    if (pos.current <= 0 || s.length === 0) return undefined;
    pos.current--;
    setCanUndo(pos.current > 0);
    setCanRedo(true);
    return { ...s[pos.current].data as any };
  }, []);

  const redo = useCallback((): T | undefined => {
    const s = stack.current;
    if (pos.current >= s.length - 1) return undefined;
    pos.current++;
    setCanUndo(true);
    setCanRedo(pos.current < s.length - 1);
    return { ...s[pos.current].data as any };
  }, []);

  const reset = useCallback(() => {
    stack.current = [];
    pos.current = -1;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { push, undo, redo, reset, canUndo, canRedo };
}
