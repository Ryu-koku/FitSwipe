import { localDay, oneRepMax } from './logic';
import type { ProgressRecord } from './home-progress';

export type RecordPeriod = 'all' | 'month' | 'year';
export type ComparisonMode = 'weight' | 'reps' | '1rm';
export const periodLabels: Record<RecordPeriod, string> = {
  all: '全期間', month: '今月', year: '今年',
};

export function periodRecords(records: ProgressRecord[], period: RecordPeriod, today = new Date()) {
  const end = localDay(today);
  const start = period === 'month' ? `${end.slice(0, 7)}-01`
    : period === 'year' ? `${end.slice(0, 4)}-01-01` : '';
  return records.filter((record) => record.date >= start && record.date <= end);
}

export function comparisonChoices(records: ProgressRecord[], mode: ComparisonMode) {
  if (mode === '1rm') return [];
  // A zero load is useful for a repetitions comparison, but not a load PR.
  return [...new Set(records.filter((record) => mode === 'weight' || record.weight > 0)
    .map((record) => mode === 'weight' ? record.weight : record.reps))].sort((a, b) => a - b);
}

// Input is one exercise/side's chronological progressIndex records. Compare
// sessions, not adjacent sets; multiple sets must not create an improvement.
export function compareRecords(records: ProgressRecord[], mode: ComparisonMode, value?: number) {
  const matching = records.filter((record) => mode === '1rm'
    ? oneRepMax(record.weight, record.reps) !== undefined
    : mode === 'weight' ? record.weight === value : record.reps === value && record.weight > 0);
  const metric = (record: ProgressRecord) => mode === 'weight' ? record.reps
    : mode === 'reps' ? record.weight : oneRepMax(record.weight, record.reps)!;
  const bySession = new Map<number, ProgressRecord>();
  let best: ProgressRecord | undefined;
  for (const record of matching) {
    const previous = bySession.get(record.sessionId);
    if (!previous || metric(record) > metric(previous)) bySession.set(record.sessionId, record);
    if (!best || metric(record) > metric(best)) best = record;
  }
  const sessions = [...bySession.values()];
  const latest = sessions.at(-1);
  const previous = sessions.at(-2);
  return { latest, previous, best,
    difference: latest && previous ? metric(latest) - metric(previous) : undefined };
}
