import type { AppState } from './types';
import { localDay } from './logic';

type Sample = { uuid: string; startDate: Date; value: number };

// The native adapter returns body fat as a fraction (0–1), even for the %
// unit. Kilograms and centimeters already match the app units.
export function importBodyMeasurements(state: AppState, weights: Sample[], fats: Sample[], heights: Sample[]): AppState {
  const validHeights = heights.filter(h => Number.isFinite(h.startDate.getTime()) && Number.isFinite(h.value) && h.value >= 50 && h.value <= 260)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  const latestHeight = validHeights[0]?.value;
  const heightCm = latestHeight !== undefined && Number.isFinite(latestHeight) && latestHeight >= 50 && latestHeight <= 260 ? latestHeight : state.heightCm;
  const next = [...(state.bodyMeasurements ?? [])];
  const positions = new Map(next.map((m, index) => [m.id, index]));
  for (const sample of weights) {
    const id = `health-${sample.uuid}`;
    if (!Number.isFinite(sample.startDate.getTime()) || !Number.isFinite(sample.value) || sample.value <= 0 || sample.value > 1000) continue;
    const measuredAt = sample.startDate.toISOString();
    // Pair readings by the device's calendar day, not the UTC date.
    const fat = fats.find(f => Number.isFinite(f.startDate.getTime()) && localDay(f.startDate) === localDay(sample.startDate));
    const bodyFatPercent = fat && Number.isFinite(fat.value) && fat.value >= 0 && fat.value <= 1 ? Math.round(fat.value * 10000) / 100 : undefined;
    const index = positions.get(id);
    if (index !== undefined) {
      // Refresh source-backed values too: rereading repairs a previously stored
      // fraction without guessing whether a manual value was a percentage.
      const old = next[index];
      next[index] = { ...old, measuredAt, weightKg: sample.value,
        bodyFatPercent: bodyFatPercent ?? old.bodyFatPercent,
        heightCm: old.heightCm };
    } else {
      positions.set(id, next.length);
      next.push({ id, measuredAt, weightKg: sample.value, bodyFatPercent,
        heightCm: validHeights.find(h => h.startDate.getTime() <= sample.startDate.getTime())?.value });
    }
  }
  return { ...state, heightCm, bodyMeasurements: next.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)).slice(-1000) };
}
