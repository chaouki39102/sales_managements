export interface Command {
  type: string;
  label: string;
  execute: () => void;
  undo: () => void;
  redo?: () => void;
}

export interface HistorySnapshot {
  commands: number;
  position: number;
  canUndo: boolean;
  canRedo: boolean;
}

export class CommandHistory {
  private _stack: Command[] = [];
  private _position = -1;
  private _maxSize: number;
  private _onChange?: (snapshot: HistorySnapshot) => void;

  constructor(maxSize = 200) {
    this._maxSize = maxSize;
  }

  onChange(cb: (snapshot: HistorySnapshot) => void): () => void {
    this._onChange = cb;
    return () => { this._onChange = undefined; };
  }

  execute(cmd: Command): void {
    if (this._position < this._stack.length - 1) {
      this._stack = this._stack.slice(0, this._position + 1);
    }
    this._stack.push(cmd);
    if (this._stack.length > this._maxSize) this._stack.shift();
    this._position = this._stack.length - 1;
    cmd.execute();
    this._notify();
  }

  undo(): boolean {
    if (!this.canUndo) return false;
    const cmd = this._stack[this._position];
    cmd.undo();
    this._position--;
    this._notify();
    return true;
  }

  redo(): boolean {
    if (!this.canRedo) return false;
    this._position++;
    const cmd = this._stack[this._position];
    cmd.redo?.() ?? cmd.execute();
    this._notify();
    return true;
  }

  get canUndo(): boolean {
    return this._position >= 0;
  }

  get canRedo(): boolean {
    return this._position < this._stack.length - 1;
  }

  get undoLabel(): string {
    return this.canUndo ? this._stack[this._position].label : '';
  }

  get redoLabel(): string {
    return this.canRedo ? this._stack[this._position + 1].label : '';
  }

  clear(): void {
    this._stack = [];
    this._position = -1;
    this._notify();
  }

  snapshot(): HistorySnapshot {
    return {
      commands: this._stack.length,
      position: this._position,
      canUndo: this.canUndo,
      canRedo: this.canRedo,
    };
  }

  private _notify(): void {
    this._onChange?.(this.snapshot());
  }
}
