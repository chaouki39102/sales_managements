/**
 * PrintJobQueue — a lightweight, framework-agnostic print job queue.
 *
 * Manages sequential processing of print jobs with status tracking,
 * cancellation, and event emission.
 *
 * Usage:
 *   import { printJobQueue } from '@/reporting';
 *
 *   const jobId = printJobQueue.enqueue({ name: 'FV-001', printFn: async () => { … } });
 *   printJobQueue.on('complete', (id, result) => …);
 *   printJobQueue.cancel(jobId);
 *   printJobQueue.clear();
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type PrintJobStatus = 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';

export interface PrintJob {
  id:       string;
  name:     string;
  status:   PrintJobStatus;
  error?:   string;
  createdAt: number;
  completedAt?: number;
}

export interface PrintJobInput {
  name:    string;
  printFn: () => Promise<void>;
}

export type PrintJobEvent = 'enqueue' | 'start' | 'complete' | 'fail' | 'cancel' | 'drain';

type Listener = (jobId: string, job: PrintJob) => void;

// ─── Service ─────────────────────────────────────────────────────────────────

class PrintJobQueueService {
  private _queue: { input: PrintJobInput; job: PrintJob }[] = [];
  private _processing = false;
  private _cancelled = new Set<string>();
  private _listeners = new Map<PrintJobEvent, Set<Listener>>();
  private _idCounter = 0;

  private _genId(): string {
    this._idCounter++;
    return `print_${Date.now()}_${this._idCounter}`;
  }

  // ── Events ───────────────────────────────────────────────────────────────

  on(event: PrintJobEvent, listener: Listener): () => void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(listener);
    return () => this._listeners.get(event)?.delete(listener);
  }

  private _emit(event: PrintJobEvent, jobId: string, job: PrintJob): void {
    this._listeners.get(event)?.forEach(fn => fn(jobId, job));
  }

  // ── Queue management ─────────────────────────────────────────────────────

  enqueue(input: PrintJobInput): string {
    const job: PrintJob = {
      id:        this._genId(),
      name:      input.name,
      status:    'pending',
      createdAt: Date.now(),
    };
    this._queue.push({ input, job });
    this._emit('enqueue', job.id, job);
    this._process();
    return job.id;
  }

  enqueueBatch(inputs: PrintJobInput[]): string[] {
    return inputs.map(i => this.enqueue(i));
  }

  cancel(jobId: string): void {
    const entry = this._queue.find(e => e.job.id === jobId);
    if (!entry) return;
    if (entry.job.status === 'pending') {
      entry.job.status = 'cancelled';
      this._emit('cancel', jobId, entry.job);
    } else if (entry.job.status === 'printing') {
      this._cancelled.add(jobId);
    }
  }

  cancelAll(): void {
    this._queue.forEach(e => {
      if (e.job.status === 'pending') {
        e.job.status = 'cancelled';
        this._emit('cancel', e.job.id, e.job);
      } else if (e.job.status === 'printing') {
        this._cancelled.add(e.job.id);
      }
    });
  }

  clear(): void {
    this._queue = [];
    this._cancelled.clear();
  }

  /** Returns a snapshot of all jobs */
  jobs(): PrintJob[] {
    return this._queue.map(e => ({ ...e.job }));
  }

  /** Returns jobs filtered by status */
  jobsByStatus(status: PrintJobStatus): PrintJob[] {
    return this._queue.filter(e => e.job.status === status).map(e => ({ ...e.job }));
  }

  /** Number of currently pending jobs */
  get pending(): number {
    return this._queue.filter(e => e.job.status === 'pending').length;
  }

  /** Total jobs ever queued */
  get total(): number {
    return this._queue.length;
  }

  /** True if the queue is actively processing */
  get isProcessing(): boolean {
    return this._processing;
  }

  // ── Internal processing ──────────────────────────────────────────────────

  private async _process(): Promise<void> {
    if (this._processing) return;
    this._processing = true;

    while (this._queue.length > 0) {
      const entry = this._queue[0];

      if (entry.job.status === 'cancelled') {
        this._queue.shift();
        continue;
      }

      if (this._cancelled.has(entry.job.id)) {
        entry.job.status = 'cancelled';
        this._emit('cancel', entry.job.id, entry.job);
        this._queue.shift();
        this._cancelled.delete(entry.job.id);
        continue;
      }

      entry.job.status = 'printing';
      this._emit('start', entry.job.id, entry.job);

      try {
        await entry.input.printFn();
        if (this._cancelled.has(entry.job.id)) {
          entry.job.status = 'cancelled';
          this._emit('cancel', entry.job.id, entry.job);
          this._cancelled.delete(entry.job.id);
        } else {
          entry.job.status = 'completed';
          entry.job.completedAt = Date.now();
          this._emit('complete', entry.job.id, entry.job);
        }
      } catch (err) {
        entry.job.status = 'failed';
        entry.job.error = err instanceof Error ? err.message : String(err);
        this._emit('fail', entry.job.id, entry.job);
      }

      this._queue.shift();
    }

    this._processing = false;
    this._emit('drain', '', {
      id: 'drain', name: '', status: 'completed', createdAt: 0,
    });
  }
}

export const printJobQueue = new PrintJobQueueService();
