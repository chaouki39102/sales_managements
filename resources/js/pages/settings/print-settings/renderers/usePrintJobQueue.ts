import { useState, useEffect, useCallback } from 'react';
import { printJobQueue } from './PrintJobQueue';
import type { PrintJob, PrintJobInput, PrintJobStatus } from './PrintJobQueue';

/**
 * React hook that subscribes to the singleton PrintJobQueue and provides
 * reactive state for UI components.
 *
 * Usage:
 *   const { jobs, pending, enqueue, cancelAll } = usePrintJobQueue();
 *   enqueue({ name: 'Doc-1', printFn: async () => { … } });
 */
export function usePrintJobQueue() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const update = () => {
      setJobs(printJobQueue.jobs());
      setIsProcessing(printJobQueue.isProcessing);
    };

    const unsub1 = printJobQueue.on('enqueue', update);
    const unsub2 = printJobQueue.on('start', update);
    const unsub3 = printJobQueue.on('complete', update);
    const unsub4 = printJobQueue.on('fail', update);
    const unsub5 = printJobQueue.on('cancel', update);
    const unsub6 = printJobQueue.on('drain', update);

    update();

    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6();
    };
  }, []);

  const enqueue = useCallback((input: PrintJobInput) => printJobQueue.enqueue(input), []);
  const enqueueBatch = useCallback((inputs: PrintJobInput[]) => printJobQueue.enqueueBatch(inputs), []);
  const cancel = useCallback((jobId: string) => printJobQueue.cancel(jobId), []);
  const cancelAll = useCallback(() => printJobQueue.cancelAll(), []);
  const clear = useCallback(() => printJobQueue.clear(), []);

  const pending = jobs.filter(j => j.status === 'pending').length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const failed = jobs.filter(j => j.status === 'failed').length;

  return {
    jobs,
    pending,
    completed,
    failed,
    total: jobs.length,
    isProcessing,
    enqueue,
    enqueueBatch,
    cancel,
    cancelAll,
    clear,
  };
}

/**
 * Get a color for the job status badge.
 */
export function statusColor(status: PrintJobStatus): string {
  switch (status) {
    case 'pending':   return '#f59e0b';
    case 'printing':  return '#3b82f6';
    case 'completed': return '#16a34a';
    case 'failed':    return '#dc2626';
    case 'cancelled': return '#94a3b8';
  }
}

export function statusLabel(status: PrintJobStatus): string {
  switch (status) {
    case 'pending':   return 'في الانتظار';
    case 'printing':  return 'جاري الطباعة';
    case 'completed': return 'تم';
    case 'failed':    return 'فشل';
    case 'cancelled': return 'ملغي';
  }
}
