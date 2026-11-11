import type { AppState, BodyMeasurement, WorkoutSet } from './types';
import { PRESET_COLORS, seedState } from './logic';
import { mergeGuest } from './sync';
import { nextId } from './workout';
import { legacyHeight, migrateLegacyData } from './legacy-data';

function fail(): never { throw new Error('バックアップの形式・値・参照先を確認してください。記録は変更していません。'); }
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return fail();
  return v as Record<string, unknown>;
}
function array(v: unknown): unknown[] { return Array.isArray(v) ? v : fail(); }
function string(v: unknown, max = 1000): string { return typeof v === 'string' && v.trim() && v.length <= max ? v : fail(); }
function number(v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fail();
}
function integer(v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = number(v, min, max); return Number.isSafeInteger(n) ? n : fail();
}
function bool(v: unknown): boolean { return typeof v === 'boolean' ? v : fail(); }
function optionalNumber(v: unknown, min = 0, max = 10000) { return v === undefined ? undefined : number(v, min, max); }
function date(v: unknown): string {
  const s = string(v), day = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s) || !Number.isFinite(Date.parse(s)) ||
      !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day) fail();
  return s;
}
function unique<T extends { id: number | string }>(rows: T[]): T[] {
  if (new Set(rows.map(r => r.id)).size !== rows.length) fail();
  return rows;
}

// Reconstruct every public object. Unknown fields, including nested credentials,
// never cross the backup boundary. Legacy whole-state exports are also accepted.
export function parseBackup(raw: string): AppState {
  const envelope = object(JSON.parse(raw));
  if (envelope.format !== undefined && (envelope.format !== 'fitswipe' || envelope.version !== 1)) fail();
  const p = envelope.format === 'fitswipe' ? object(envelope.data) : envelope;
  const exercises = unique(array(p.exercises).map(v => {
    const e = object(v);
    if (e.mode !== 'NORMAL' && e.mode !== 'BILATERAL') fail();
    return { id: integer(e.id, 1), name: string(e.name), mode: e.mode as AppState['exercises'][number]['mode'],
      sortOrder: integer(e.sortOrder), archived: bool(e.archived),
      custom: e.custom === undefined ? undefined : bool(e.custom),
      muscleGroup: e.muscleGroup === undefined ? undefined : string(e.muscleGroup) };
  }));
  const exerciseIds = new Set(exercises.map(e => e.id));
  const exerciseId = (v: unknown) => { const id = integer(v, 1); return exerciseIds.has(id) ? id : fail(); };
  const presets = unique(array(p.presets).map(v => {
    const preset = object(v);
    const configs = array(preset.exercises).map(v => {
      const c = object(v);
      return { exerciseId: exerciseId(c.exerciseId), sets: integer(c.sets, 1, 30),
        weightKg: optionalNumber(c.weightKg), leftWeightKg: optionalNumber(c.leftWeightKg), rightWeightKg: optionalNumber(c.rightWeightKg),
        reps: c.reps === undefined ? undefined : integer(c.reps, 0, 10000) };
    });
    if (new Set(configs.map(c => c.exerciseId)).size !== configs.length) fail();
    const color = typeof preset.color === 'string' && PRESET_COLORS.includes(preset.color) ? preset.color : undefined;
    return { id: string(preset.id), name: string(preset.name), ...(color ? { color } : {}), exercises: configs };
  }));
  const presetIds = new Set(presets.map(p => p.id));
  const sessions = unique(array(p.sessions).map(v => {
    const s = object(v);
    if (s.status !== 'COMPLETED' && s.status !== 'IN_PROGRESS') fail();
    // A deleted preset is a valid historical reference; detach it on restore.
    const presetId = s.presetId === undefined ? undefined : string(s.presetId);
    const startedAt = date(s.startedAt), endedAt = s.endedAt === undefined ? undefined : date(s.endedAt);
    if (endedAt && Date.parse(endedAt) < Date.parse(startedAt)) fail();
    return { id: integer(s.id, 1), startedAt, endedAt, status: s.status as AppState['sessions'][number]['status'],
      presetId: presetId && presetIds.has(presetId) ? presetId : undefined };
  }));
  if (sessions.filter(s => s.status === 'IN_PROGRESS').length > 1) fail();
  const sessionIds = new Set(sessions.map(s => s.id));
  const sets = unique(array(p.sets).map(v => {
    const s = object(v);
    const sessionId = integer(s.sessionId, 1);
    if (!sessionIds.has(sessionId)) fail();
    const set: WorkoutSet = { id: integer(s.id, 1), sessionId, exerciseId: exerciseId(s.exerciseId), setOrder: integer(s.setOrder, 0, 100),
      isCompleted: bool(s.isCompleted), leftCompleted: bool(s.leftCompleted), rightCompleted: bool(s.rightCompleted) };
    for (const key of ['normalWeightKg', 'leftWeightKg', 'rightWeightKg'] as const) set[key] = optionalNumber(s[key]);
    for (const key of ['normalReps', 'leftReps', 'rightReps'] as const) set[key] = s[key] === undefined ? undefined : integer(s[key], 0, 10000);
    for (const key of ['createdAt', 'updatedAt'] as const) set[key] = s[key] === undefined ? undefined : date(s[key]);
    // Skipped inputs keep the planned values, so a skipped card can be reopened.
    if (s.skippedInputs !== undefined) {
      set.skippedInputs = Object.fromEntries(Object.entries(object(s.skippedInputs)).map(([side, v]) => {
        if (!['normal', 'left', 'right'].includes(side)) fail();
        const input = object(v);
        return [side, { weightKg: optionalNumber(input.weightKg), reps: input.reps === undefined ? undefined : integer(input.reps, 0, 10000) }];
      }));
    }
    if (s.finalSkippedSide !== undefined) {
      if (!['normal', 'left', 'right'].includes(String(s.finalSkippedSide))) fail();
      set.finalSkippedSide = s.finalSkippedSide as WorkoutSet['finalSkippedSide'];
    }
    return set;
  }));
  if (!['system', 'light', 'dark'].includes(String(p.themeMode))) fail();
  const ids = (v: unknown) => [...new Set(array(v).map(exerciseId))];
  const values = (v: unknown, min: number, max: number) => Object.fromEntries(Object.entries(object(v)).map(([id, value]) => [exerciseId(Number(id)), number(value, min, max)]));
  const bodyMeasurements = unique(array(p.bodyMeasurements ?? []).map(v => {
    const m = object(v);
    const measurement: BodyMeasurement = { id: string(m.id), measuredAt: date(m.measuredAt),
      weightKg: optionalNumber(m.weightKg, 0.01, 1000), bodyFatPercent: optionalNumber(m.bodyFatPercent, 0, 100), heightCm: optionalNumber(legacyHeight(optionalNumber(m.heightCm, 0, 26000)), 50, 260) };
    if (measurement.weightKg === undefined && measurement.bodyFatPercent === undefined && measurement.heightCm === undefined) fail();
    return measurement;
  }));
  const selected = p.selectedPresetId === undefined ? undefined : string(p.selectedPresetId);
  const nextId = [...exercises, ...sessions, ...sets].reduce((id, r) => Math.max(id, r.id + 1), 1);
  const result: AppState = { ...seedState(), exercises, sessions, sets, presets, nextId,
    themeMode: p.themeMode as AppState['themeMode'], weekStartsMonday: bool(p.weekStartsMonday),
    weightStepKg: number(p.weightStepKg, 0.01, 1000), restDurationSeconds: number(p.restDurationSeconds, 0, 86400),
    visibleAchievementMetrics: array(p.visibleAchievementMetrics).map(v => string(v)),
    exerciseWeightSteps: values(p.exerciseWeightSteps, 0.01, 1000), exerciseRestDurations: values(p.exerciseRestDurations, 0, 86400),
    restTimerDisabledExerciseIds: ids(p.restTimerDisabledExerciseIds), sideSwitchRestExerciseIds: ids(p.sideSwitchRestExerciseIds), leftFirstExerciseIds: ids(p.leftFirstExerciseIds),
    selectedPresetId: selected && presetIds.has(selected) ? selected : presets[0]?.id,
    bodyMeasurements, heightCm: optionalNumber(legacyHeight(optionalNumber(p.heightCm, 0, 26000)), 50, 260),
    exerciseCatalogVersion: p.exerciseCatalogVersion === undefined ? 0 : integer(p.exerciseCatalogVersion),
  };
  if (p.homeGrowthExerciseId !== undefined) result.homeGrowthExerciseId = exerciseId(p.homeGrowthExerciseId);
  if (p.homeProgress !== undefined) {
    const preferences = object(p.homeProgress);
    if (!['trend', 'ranking'].includes(String(preferences.view)) || !['estimated', 'weight', 'reps'].includes(String(preferences.metric)) ||
        !['change', 'updates'].includes(String(preferences.ranking)) || (preferences.side !== 1 && preferences.side !== 2)) fail();
    result.homeProgress = { view: preferences.view as 'trend' | 'ranking', metric: preferences.metric as 'estimated' | 'weight' | 'reps',
      ranking: preferences.ranking as 'change' | 'updates', side: preferences.side as 1 | 2 };
  }
  const repaired = migrateLegacyData(result);
  if (repaired.sets.some(s => s.setOrder < 1 || s.setOrder > 100)) fail();
  return repaired;
}

export function exportBackup(state: AppState): string {
  // Parsing also whitelists fields inside exercises, presets and measurements.
  const clean = parseBackup(JSON.stringify(state));
  const { exercises, sessions, sets, presets, selectedPresetId, themeMode, weekStartsMonday,
    weightStepKg, restDurationSeconds, visibleAchievementMetrics, exerciseWeightSteps, exerciseRestDurations,
    restTimerDisabledExerciseIds, sideSwitchRestExerciseIds, leftFirstExerciseIds, bodyMeasurements, heightCm, exerciseCatalogVersion, homeGrowthExerciseId, homeProgress } = clean;
  return JSON.stringify({ format: 'fitswipe', version: 1, data: { exercises, sessions, sets, presets, selectedPresetId,
    themeMode, weekStartsMonday, weightStepKg, restDurationSeconds, visibleAchievementMetrics,
    exerciseWeightSteps, exerciseRestDurations, restTimerDisabledExerciseIds, sideSwitchRestExerciseIds,
    leftFirstExerciseIds, bodyMeasurements, heightCm, exerciseCatalogVersion, homeGrowthExerciseId, homeProgress } }, null, 2);
}

export function restoreBackup(current: AppState, raw: string, uuid: () => string): AppState {
  const imported = parseBackup(raw);
  if (current.sessions.some(s => s.status === 'IN_PROGRESS') && imported.sessions.some(s => s.status === 'IN_PROGRESS')) {
    throw new Error('進行中のトレーニングを終了してから復元してください。');
  }
  // Append with fresh IDs; never adopt the source account, cursor or outbox.
  // The provider tracks this single change under the currently signed-in account.
  const next = mergeGuest({ ...current, nextId: nextId(current), cloud: undefined }, imported, uuid);
  return { ...next, cloud: current.cloud };
}
