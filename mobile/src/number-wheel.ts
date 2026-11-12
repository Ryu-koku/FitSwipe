export const WHEEL_DRAG_STEP = 50;
export const WHEEL_DRAG_SLOP = 6;
export const WHEEL_HOLD_DELAY = 400;
export const WHEEL_REPEAT_DELAY = 140;

export type WheelPosition = { origin: number | undefined; index: number; offset: number; settling: boolean };

export function wheelValue(origin: number | undefined, index: number, step: number): number {
  return Math.max(0, Math.round(((origin ?? 0) + index * step) * 100) / 100);
}

export function parseWheelInput(raw: string, integer: boolean): number | undefined {
  const text = raw.normalize('NFKC').trim().replace(',', '.');
  if (text.length > 9 || !(integer ? /^\d+$/ : /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/).test(text)) return;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

// Preview during a gesture, then persist its final value once. This keeps a
// quick turn of the wheel from queuing a disk write for every crossed value.
export function createNumberWheel({
  step, min = 0, max = Infinity, rowHeight = WHEEL_DRAG_STEP, onPreview, onChange, onTick, onEdit, onActive, onPosition,
}: {
  step: number;
  min?: number;
  max?: number;
  rowHeight?: number;
  onPreview: (value: number) => void;
  onChange: (value: number) => void;
  onTick: () => void;
  onEdit: (value: number | undefined) => void;
  onActive: (active: boolean) => void;
  onPosition: (position: WheelPosition) => void;
}) {
  let active = false;
  let original: number | undefined;
  let value = 0;
  let direction = 0;
  let moved = false;
  let held = false;
  let changed = false;
  let index = 0;
  let offset = 0;
  let lastDy = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  const clearTimers = () => { clearTimeout(timeout); clearInterval(interval); };
  const change = (next: number) => {
    next = Math.max(min, Math.min(max, Math.round(next * 100) / 100));
    if (!Number.isFinite(next) || next === value) return;
    value = next;
    changed = true;
    onPreview(value);
    onTick();
  };
  const minimumIndex = () => Math.floor((min - (original ?? min)) / step);
  const maximumIndex = () => Math.ceil((max - (original ?? min)) / step);
  const render = (settling = false) => onPosition({ origin: original, index, offset, settling });
  const select = (next: number) => {
    index = Math.max(minimumIndex(), Math.min(maximumIndex(), next));
    change(wheelValue(original, index, step));
  };
  const turn = (delta: number) => {
    select(index + delta);
    offset = -index * rowHeight;
    render();
  };
  const stop = () => {
    clearTimers();
    if (!active) return;
    active = false;
    // Round only the final resting position. During a drag the numeric rows
    // retain their absolute positions, even when the selected number changes.
    offset = -index * rowHeight;
    render(true);
    onActive(false);
    if (changed && value !== original) onChange(value);
  };
  return {
    get active() { return active; },
    begin(initial: number | undefined, zone: -1 | 0 | 1, residual = 0) {
      stop();
      original = initial;
      value = initial ?? 0;
      direction = zone;
      moved = held = false;
      changed = false;
      index = 0;
      offset = residual;
      lastDy = 0;
      active = true;
      render();
      onActive(true);
      if (zone) timeout = setTimeout(() => {
        held = true;
        turn(direction);
        interval = setInterval(() => turn(direction), WHEEL_REPEAT_DELAY);
      }, WHEEL_HOLD_DELAY);
    },
    move(dy: number) {
      if (!active) return;
      if (Math.abs(dy) > WHEEL_DRAG_SLOP) { moved = true; clearTimers(); }
      // Track each pixel directly. Discard travel past zero so reversing at
      // the lower limit responds without dragging back through overscroll.
      offset = Math.max(-maximumIndex() * rowHeight, Math.min(-minimumIndex() * rowHeight, offset + dy - lastDy));
      lastDy = dy;
      if (moved) select(Math.round(-offset / rowHeight));
      render();
    },
    end() {
      if (!active) return;
      const edit = !moved && !held && direction === 0;
      if (!moved && !held && direction) turn(direction);
      stop();
      if (edit) onEdit(original);
    },
    adjust(initial: number | undefined, delta: -1 | 1) {
      stop();
      original = initial;
      value = initial ?? 0;
      const before = value;
      index = 0;
      turn(delta);
      if (value !== before) onChange(value);
    },
    reset(initial: number | undefined) {
      if (active) return;
      original = initial;
      value = initial ?? 0;
      index = offset = lastDy = 0;
      render();
    },
    stop,
  };
}

// A bounded native scroll surface avoids allocating an unbounded list for kg/lb.
// Recenter after release; only the visible rows are mounted by FlatList.
export function numberWheelWindow(origin: number | undefined, step: number, min = 0, max = Infinity) {
  const low = Math.max(-100, Math.floor((min - (origin ?? min)) / step));
  const high = Math.min(100, Math.ceil((max - (origin ?? min)) / step));
  return {
    center: -low,
    items: Array.from({ length: high - low + 1 }, (_, slot) => {
      const index = low + slot;
      return { value: Math.max(min, Math.min(max, Math.round(((origin ?? min) + index * step) * 100) / 100)), empty: origin === undefined && index === 0 };
    }),
  };
}
