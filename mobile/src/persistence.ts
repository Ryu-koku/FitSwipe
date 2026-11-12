// One active write and one replaceable pending snapshot. Each caller waits for
// the write containing its edit; a failed batch rejects all of its callers.
export function createCoalescingWriter<T>(save: (value: T) => Promise<void>) {
  type Waiter = { resolve: () => void; reject: (error: unknown) => void };
  let pending: { value: T; waiters: Waiter[] } | undefined;
  let running: Promise<void> | undefined;
  let failed: { value: T } | undefined;

  const start = () => {
    if (running || !pending) return;
    const drain = async () => {
      while (pending) {
        const batch = pending;
        pending = undefined;
        try {
          await save(batch.value);
          failed = undefined;
          batch.waiters.forEach(w => w.resolve());
        } catch (error) {
          failed = { value: batch.value };
          batch.waiters.forEach(w => w.reject(error));
        }
      }
    };
    // Defer entry so running is assigned even when save throws synchronously.
    running = Promise.resolve().then(drain).finally(() => { running = undefined; start(); });
  };
  const write = (value: T): Promise<void> => {
    const promise = new Promise<void>((resolve, reject) => {
      if (pending) { pending.value = value; pending.waiters.push({ resolve, reject }); }
      else pending = { value, waiters: [{ resolve, reject }] };
    });
    start();
    return promise;
  };
  const flush = async () => {
    // Retry a failed snapshot only on an explicit flush, never in a tight loop.
    if (!pending && !running && failed) return write(failed.value);
    start();
    while (running) await running;
    if (failed) throw new Error('State persistence failed');
  };
  return { write, flush };
}
