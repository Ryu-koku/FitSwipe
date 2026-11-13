import { localDay, oneRepMax } from './logic';
import type { AppState, WorkoutSet } from './types';

export type ProgressMetric = 'estimated' | 'weight' | 'reps';
export type ProgressSide = 0 | 1 | 2;
export type ProgressPreferences = {
  view: 'trend' | 'ranking';
  metric: ProgressMetric;
  ranking: 'change' | 'updates';
  side: 1 | 2;
};
export type ProgressRecord = {
  date: string;
  sessionId: number;
  setId: number;
  weight: number;
  reps: number;
};
export type ProgressPoint = { date: string; value: number };
export const metricLabels: Record<ProgressMetric, string> = {
  estimated: '1RM',
  weight: '最大重量',
  reps: '最多回数',
};
export function progressPreferences(value?: Partial<ProgressPreferences>): ProgressPreferences {
  return {
    view: value?.view === 'ranking' ? 'ranking' : 'trend',
    metric: value?.metric === 'weight' || value?.metric === 'reps' ? value.metric : 'estimated',
    ranking: value?.ranking === 'updates' ? 'updates' : 'change',
    side: value?.side === 2 ? 2 : 1,
  };
}
export function progressWindow(today = new Date()) {
  const start = new Date(today);
  start.setDate(start.getDate() - 89);
  return { start: localDay(start), end: localDay(today) };
}
const recordKey = (exerciseId: number, side: ProgressSide) => `${exerciseId}:${side}`;

// Index once for all exercises. Keep older records: they establish the baseline
// for all-time personal bests, even when the chart shows only the last 90 days.
export function progressIndex(
  state: Pick<AppState, 'exercises' | 'sessions' | 'sets'>,
  today = new Date(),
) {
  const end = localDay(today);
  const sessions = new Map(
    state.sessions
      .filter(
        (s) =>
          s.status === 'COMPLETED' &&
          Number.isFinite(new Date(s.startedAt).getTime()) &&
          localDay(s.startedAt) <= end,
      )
      .map((s) => [s.id, localDay(s.startedAt)]),
  );
  const startedAt = new Map(state.sessions.map((s) => [s.id, new Date(s.startedAt).getTime()]));
  const exercises = new Map(state.exercises.map((e) => [e.id, e]));
  const index = new Map<string, ProgressRecord[]>();
  const add = (set: WorkoutSet, side: ProgressSide, date: string) => {
    const weight =
      (side === 1 ? set.leftWeightKg : side === 2 ? set.rightWeightKg : set.normalWeightKg) ?? 0;
    const reps = side === 1 ? set.leftReps : side === 2 ? set.rightReps : set.normalReps;
    if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || !reps || reps < 1)
      return;
    if ((side === 1 && set.leftCompleted === false) || (side === 2 && set.rightCompleted === false))
      return;
    const key = recordKey(set.exerciseId, side);
    const records = index.get(key) ?? [];
    records.push({ date, sessionId: set.sessionId, setId: set.id, weight, reps });
    index.set(key, records);
  };
  for (const set of state.sets) {
    const date = sessions.get(set.sessionId);
    const exercise = exercises.get(set.exerciseId);
    if (!date || !exercise || !set.isCompleted) continue;
    if (exercise.mode === 'BILATERAL') {
      add(set, 1, date);
      add(set, 2, date);
    } else add(set, 0, date);
  }
  for (const records of index.values())
    records.sort(
      (a, b) => (startedAt.get(a.sessionId)! - startedAt.get(b.sessionId)!) || a.sessionId - b.sessionId || a.setId - b.setId,
    );
  return index;
}
export function exerciseRecords(
  index: ReturnType<typeof progressIndex>,
  id: number,
  side: ProgressSide,
) {
  return index.get(recordKey(id, side)) ?? [];
}
export function metricValue(record: ProgressRecord, metric: ProgressMetric): number | undefined {
  if (metric === 'reps') return record.reps;
  if (record.weight <= 0) return undefined;
  if (metric === 'weight') return record.weight;
  return oneRepMax(record.weight, record.reps);
}
export function isBodyweight(records: ProgressRecord[]) {
  return records.length > 0 && !records.some((record) => record.weight > 0);
}
export function dailyProgress(
  records: ProgressRecord[],
  metric: ProgressMetric,
  today = new Date(),
): ProgressPoint[] {
  const { start, end } = progressWindow(today);
  const daily = new Map<string, number>();
  for (const record of records) {
    const value = metricValue(record, metric);
    if (record.date < start || record.date > end || value === undefined) continue;
    daily.set(record.date, Math.max(daily.get(record.date) ?? 0, value));
  }
  return [...daily]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}
export function personalBest(records: ProgressRecord[], metric: ProgressMetric) {
  let best: ProgressRecord | undefined;
  let maximum = -Infinity;
  for (const record of records) {
    const value = metricValue(record, metric);
    if (value !== undefined && value > maximum) {
      maximum = value;
      best = record;
    }
  }
  return best;
}
export function recordUpdateDays(
  records: ProgressRecord[],
  metric: ProgressMetric,
  today = new Date(),
) {
  const { start, end } = progressWindow(today);
  // Aggregate the day before comparing: several sets/sessions on the first day
  // establish one baseline, not a fabricated first-day improvement.
  const daily = new Map<string, number>();
  for (const record of records) {
    const value = metricValue(record, metric);
    if (record.date > end || value === undefined) continue;
    daily.set(record.date, Math.max(daily.get(record.date) ?? 0, value));
  }
  let best: number | undefined;
  let days = 0;
  for (const [date, value] of [...daily].sort(([a], [b]) => a.localeCompare(b))) {
    if (best !== undefined && value > best && date >= start) days++;
    best = Math.max(best ?? value, value);
  }
  return days;
}
export function progressRanking(
  state: AppState,
  index: ReturnType<typeof progressIndex>,
  kind: ProgressPreferences['ranking'],
  today = new Date(),
) {
  const { start } = progressWindow(today);
  const rows = state.exercises
    .filter((e) => !e.archived)
    .flatMap((exercise) => {
      const sides: ProgressSide[] = exercise.mode === 'BILATERAL' ? [1, 2] : [0];
      return sides.flatMap((side) => {
        const records = exerciseRecords(index, exercise.id, side);
        const metric: ProgressMetric =
          kind === 'updates' && isBodyweight(records) ? 'reps' : 'estimated';
        const points = dailyProgress(records, metric, today);
        if (!points.length || (kind === 'change' && points.length < 2)) return [];
        const value =
          kind === 'change'
            ? ((points[points.length - 1].value - points[0].value) / points[0].value) * 100
            : recordUpdateDays(records, metric, today);
        return [
          {
            exerciseId: exercise.id,
            side,
            metric,
            value,
            name: `${exercise.name}${side ? (side === 1 ? '（左）' : '（右）') : ''}`,
            recentDays: new Set(records.filter((r) => r.date >= start).map((r) => r.date)).size,
          },
        ];
      });
    });
  return rows
    .sort((a, b) => b.value - a.value || a.exerciseId - b.exerciseId || a.side - b.side)
    .slice(0, 5);
}
