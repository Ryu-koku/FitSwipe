import type { AppState } from './types';

// Old health imports multiplied a centimeter reading by 100. The UI never
// accepted heights in this range, so this repair cannot alter a valid entry.
export function legacyHeight(value: number | undefined) {
  return value !== undefined && value >= 5000 && value <= 26000 ? value / 100 : value;
}

export function migrateLegacyData(state: AppState): AppState {
  const groups = new Map<string, number[]>();
  const key = (s: AppState['sets'][number]) => `${s.sessionId}:${s.exerciseId}`;
  state.sets.forEach(s => { const orders = groups.get(key(s)) ?? []; orders.push(s.setOrder); groups.set(key(s), orders); });
  const repairedOrders = new Map<number, number>();
  for (const [group, orders] of groups) {
    const zeroBased = [...orders].sort((a, b) => a - b).every((order, i) => order === i);
    const duplicated = new Set(orders).size !== orders.length && orders.every(n => Number.isInteger(n) && n >= 0 && n <= 100);
    if (!zeroBased && !duplicated) continue;
    // Stable sort preserves source order for ties and keeps every distinct set.
    state.sets.filter(s => key(s) === group).sort((a, b) => a.setOrder - b.setOrder)
      .forEach((s, i) => repairedOrders.set(s.id, i + 1));
  }
  const heightCm = legacyHeight(state.heightCm);
  let changed = heightCm !== state.heightCm;
  const sets = state.sets.map(s => {
    const setOrder = repairedOrders.get(s.id);
    if (setOrder === undefined || setOrder === s.setOrder) return s;
    changed = true; return { ...s, setOrder };
  });
  const bodyMeasurements = state.bodyMeasurements?.map(m => {
    const height = legacyHeight(m.heightCm);
    if (height === m.heightCm) return m;
    changed = true; return { ...m, heightCm: height };
  });
  return changed ? { ...state, heightCm, sets, bodyMeasurements } : state;
}
