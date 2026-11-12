/** Release at most one animation per frame within a screen. */
export function createExerciseMotionQueue() {
  const pending = new Set<() => void>();
  let frame: number | undefined;
  const schedule = () => {
    if (frame !== undefined || !pending.size) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      const next = pending.values().next().value;
      if (next) {
        pending.delete(next);
        next();
      }
      schedule();
    });
  };
  const clear = () => {
    pending.clear();
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
  };
  return {
    enqueue(start: () => void) {
      pending.add(start);
      schedule();
      return () => {
        pending.delete(start);
        if (!pending.size) clear();
      };
    },
    clear,
  };
}
