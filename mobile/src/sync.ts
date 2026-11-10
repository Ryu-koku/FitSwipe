import type { AppState, RoomIdentity } from './types';
import { exerciseKey } from './exercise-catalog';

export type Kind = 'exercise' | 'session' | 'set' | 'preset' | 'setting';
export type RecordData = { kind: Kind; id: string; deleted: boolean; payload: { [key: string]: unknown } | null };
export type Mutation = RecordData & { mutationId: string };
export type SyncPage = { changes: (RecordData & { revision: number })[]; cursor: number; hasMore: boolean };
// The device keeps no copy of server records: pulls are applied to the local
// rows directly. Only remote deletions of sessions are remembered, so automatic
// room sharing can retract copies of workouts deleted on another device.
export type CloudState = {
  identity: RoomIdentity & { expiresAt: number };
  cursor: number;
  mapping: Record<string, string>;
  pending: Mutation[];
  deletedSessions?: string[];
  lastSynced?: string;
};
const kinds = ['exercise', 'session', 'set', 'preset'] as const;
const fields = ['themeMode', 'weekStartsMonday', 'weightStepKg', 'restDurationSeconds',
  'visibleAchievementMetrics', 'exerciseWeightSteps', 'exerciseRestDurations',
  'restTimerDisabledExerciseIds', 'sideSwitchRestExerciseIds', 'leftFirstExerciseIds', 'selectedPresetId', 'exerciseCatalogVersion', 'heightCm'] as const;
const keyOf = (r: Pick<RecordData, 'kind' | 'id'>) => `${r.kind}:${r.id}`;
// Fixed IDs for independent preference records; no other account's identity or
// transport state ever belongs in a synced payload.
const settingId = (index: number) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;

export function emptyCloud(identity: CloudState['identity']): CloudState {
  return { identity, cursor: 0, mapping: {}, pending: [] };
}

// The starting point of a first login on this device: preferences from the
// seed, but no rows. Pulls are applied incrementally, so default exercises here
// would duplicate the account's; a catalog version of 0 lets the account be
// upgraded after its records have arrived.
export function freshAccount(seed: AppState, identity: CloudState['identity']): AppState {
  return { ...seed, exercises: [], presets: [], sessions: [], sets: [], bodyMeasurements: [], workout: undefined,
    selectedPresetId: undefined, homeGrowthExerciseId: undefined, exerciseCatalogVersion: 0, exerciseWeightSteps: {}, exerciseRestDurations: {},
    restTimerDisabledExerciseIds: [], sideSwitchRestExerciseIds: [], leftFirstExerciseIds: [], cloud: emptyCloud(identity) };
}

export function project(state: AppState, mapping: Record<string, string>, uuid: () => string, selected?: Set<string>, unchanged?: Set<object>) {
  const result: Record<string, RecordData> = {};
  // Skip unchanged collections or rows, but still assign the IDs they reference.
  const skip = (collection: string, row: object) => (selected && !selected.has(collection)) || !!unchanged?.has(row);
  const id = (kind: Kind, local: number | string) => mapping[`${kind}:${local}`] ??= uuid();
  const add = (kind: Kind, local: number | string, payload: Record<string, unknown>) => {
    const record = { kind, id: id(kind, local), deleted: false, payload };
    if (selected && !selected.has(kind === 'setting' ? 'bodyMeasurements' : `${kind}s`)) return;
    result[keyOf(record)] = record;
  };
  state.exercises.forEach((e) => { if (skip('exercises', e)) { id('exercise', e.id); return; } add('exercise', e.id, { ...e, id: undefined }); });
  state.presets.forEach((p) => {
    if (skip('presets', p)) { p.exercises.forEach(e => id('exercise', e.exerciseId)); id('preset', p.id); return; }
    add('preset', p.id, { name: p.name, color: p.color, exercises: p.exercises.map((e) => ({ ...e, exerciseId: id('exercise', e.exerciseId) })) });
  });
  state.sessions.forEach((s) => {
    if (skip('sessions', s)) { if (s.presetId) id('preset', s.presetId); id('session', s.id); return; }
    add('session', s.id, { ...s, id: undefined, presetId: s.presetId ? id('preset', s.presetId) : undefined });
  });
  state.sets.forEach((s) => {
    if (skip('sets', s)) { id('session', s.sessionId); id('exercise', s.exerciseId); id('set', s.id); return; }
    add('set', s.id, { ...s, id: undefined, sessionId: id('session', s.sessionId), exerciseId: id('exercise', s.exerciseId) });
  });
  // One setting record per measurement avoids the server's per-record size cap
  // and lets independent measurements merge across devices. Older clients ignore it.
  (state.bodyMeasurements ?? []).forEach((measurement) => {
    const stableId = measurement.id.replace(/^health-/, '');
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(stableId)) {
      mapping[`setting:body:${measurement.id}`] ??= stableId.toLowerCase();
    }
    if (skip('bodyMeasurements', measurement)) { id('setting', `body:${measurement.id}`); return; }
    add('setting', `body:${measurement.id}`, { field: 'bodyMeasurement', value: { ...measurement } });
  });
  fields.forEach((field, index) => {
    if (selected && !selected.has(field)) {
      if (field === 'selectedPresetId' && state.selectedPresetId) id('preset', state.selectedPresetId);
      if (field === 'exerciseWeightSteps' || field === 'exerciseRestDurations') Object.keys(state[field]).forEach(local => id('exercise', local));
      if (field === 'restTimerDisabledExerciseIds' || field === 'sideSwitchRestExerciseIds' || field === 'leftFirstExerciseIds') state[field].forEach(local => id('exercise', local));
      return;
    }
    let value: unknown = state[field];
    if (field === 'heightCm') value = state.heightCm ?? null;
    if (field === 'selectedPresetId') value = state.selectedPresetId ? id('preset', state.selectedPresetId) : null;
    if (field === 'exerciseWeightSteps' || field === 'exerciseRestDurations') {
      value = Object.fromEntries(Object.entries(state[field]).map(([local, v]) => [id('exercise', local), v]));
    }
    if (field === 'restTimerDisabledExerciseIds' || field === 'sideSwitchRestExerciseIds' || field === 'leftFirstExerciseIds') value = state[field].map((v) => id('exercise', v));
    const record: RecordData = { kind: 'setting', id: settingId(index), deleted: false, payload: { field, value } };
    result[keyOf(record)] = record;
  });
  return result;
}

// State + UUID mapping + durable outbox are persisted in the same storage write.
export function trackChanges(previous: AppState, next: AppState, uuid: () => string): AppState {
  if (!next.cloud) return next;
  const cloud = { ...next.cloud, mapping: { ...next.cloud.mapping }, pending: [...next.cloud.pending] };
  const selected = previous.cloud ? new Set<string>([...kinds.map(kind => `${kind}s`), 'bodyMeasurements', ...fields].filter(field => previous[field as keyof AppState] !== next[field as keyof AppState])) : undefined;
  // Updates are immutable, so a row object present in both states is unchanged;
  // a workout tap then diffs one set instead of the whole history.
  const unchanged = new Set<object>();
  if (previous.cloud) {
    for (const collection of ['exercises', 'presets', 'sessions', 'sets', 'bodyMeasurements'] as const) {
      const before = new Set<object>(previous[collection] ?? []);
      (next[collection] ?? []).forEach((row: object) => { if (before.has(row)) unchanged.add(row); });
    }
  }
  const before = previous.cloud ? project(previous, cloud.mapping, uuid, selected, unchanged) : {};
  const after = project(next, cloud.mapping, uuid, selected, unchanged);
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    const record = after[key] ?? { ...before[key], deleted: true, payload: null };
    cloud.pending.push({ ...record, mutationId: uuid() });
  }
  return { ...next, cloud };
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// Apply pulled server changes to the local rows. Unchanged rows keep their
// objects; an unsent local edit (pending) wins until its push overrides the
// server copy. Malformed records are skipped instead of stopping sync.
export function receive(state: AppState, page: SyncPage): AppState {
  if (!state.cloud) throw new Error('ログインが必要です');
  const mapping = { ...state.cloud.mapping };
  let nextId = state.nextId;
  const locals = new Map<string, number | string>();
  const bodies = new Map<string, string>();
  Object.entries(mapping).forEach(([local, remote]) => {
    const [kind, ...parts] = local.split(':');
    if (kind === 'setting') { if (parts[0] === 'body') bodies.set(remote, parts.slice(1).join(':')); return; }
    locals.set(`${kind}:${remote}`, kind === 'preset' ? parts.join(':') : Number(parts[0]));
  });
  const localId = (kind: Kind, remote: string): number | string => {
    const key = `${kind}:${remote}`;
    if (!locals.has(key)) {
      const local = kind === 'preset' ? remote : nextId++;
      locals.set(key, local);
      mapping[`${kind}:${local}`] = remote;
    }
    return locals.get(key)!;
  };
  const rows = {
    exercise: new Map<number | string, unknown>(state.exercises.map((e) => [e.id, e])),
    session: new Map<number | string, unknown>(state.sessions.map((s) => [s.id, s])),
    set: new Map<number | string, unknown>(state.sets.map((s) => [s.id, s])),
    preset: new Map<number | string, unknown>(state.presets.map((p) => [p.id, p])),
  };
  const touched = new Set<string>();
  const bodyMeasurements = new Map((state.bodyMeasurements ?? []).map((m) => [m.id, m]));
  const settings: Record<string, unknown> = {};
  const pending = new Set(state.cloud.pending.map(keyOf));
  const deletedSessions = new Set(state.cloud.deletedSessions ?? []);
  for (const change of page.changes) {
    if (!object(change) || typeof change.id !== 'string') continue;
    if (change.kind === 'session') {
      if (change.deleted) deletedSessions.add(change.id); else deletedSessions.delete(change.id);
    }
    if (pending.has(keyOf(change))) continue;
    if (change.kind === 'setting') {
      if (change.deleted) {
        const local = bodies.get(change.id);
        if (local !== undefined && bodyMeasurements.delete(local)) touched.add('bodyMeasurements');
        continue;
      }
      if (!object(change.payload)) continue;
      const { field, value } = change.payload;
      if (field === 'bodyMeasurement') {
        if (!object(value) || typeof value.id !== 'string' || typeof value.measuredAt !== 'string') continue;
        const measurement = value as unknown as NonNullable<AppState['bodyMeasurements']>[number];
        bodyMeasurements.set(measurement.id, measurement);
        mapping[`setting:body:${measurement.id}`] = change.id;
        bodies.set(change.id, measurement.id);
        touched.add('bodyMeasurements');
        continue;
      }
      if (!fields.includes(field as typeof fields[number])) continue;
      let next: unknown = value;
      if (field === 'heightCm') next = value ?? undefined;
      if (field === 'selectedPresetId') {
        if (value != null && typeof value !== 'string') continue;
        next = value ? localId('preset', value) : undefined;
      }
      if (field === 'exerciseWeightSteps' || field === 'exerciseRestDurations') {
        if (!object(value)) continue;
        next = Object.fromEntries(Object.entries(value).map(([remote, v]) => [localId('exercise', remote), v]));
      }
      if (field === 'restTimerDisabledExerciseIds' || field === 'sideSwitchRestExerciseIds' || field === 'leftFirstExerciseIds') {
        if (!Array.isArray(value)) continue;
        next = value.filter((v): v is string => typeof v === 'string').map((v) => localId('exercise', v));
      }
      settings[field as string] = next;
      continue;
    }
    if (!kinds.includes(change.kind as typeof kinds[number])) continue;
    const kind = change.kind as typeof kinds[number];
    if (change.deleted) {
      const local = locals.get(`${kind}:${change.id}`);
      if (local !== undefined && rows[kind].delete(local)) touched.add(kind);
      continue;
    }
    const value = change.payload;
    if (!object(value)) continue;
    if (kind === 'session' && value.presetId != null && typeof value.presetId !== 'string') continue;
    if (kind === 'set' && (typeof value.sessionId !== 'string' || typeof value.exerciseId !== 'string')) continue;
    if (kind === 'preset' && !Array.isArray(value.exercises)) continue;
    const row = { ...value, id: localId(kind, change.id) } as Record<string, unknown>;
    if (kind === 'session') row.presetId = typeof value.presetId === 'string' && value.presetId ? localId('preset', value.presetId) : undefined;
    if (kind === 'set') {
      row.sessionId = localId('session', value.sessionId as string);
      row.exerciseId = localId('exercise', value.exerciseId as string);
    }
    if (kind === 'preset') row.exercises = (value.exercises as unknown[]).filter((e): e is Record<string, unknown> => object(e) && typeof e.exerciseId === 'string')
      .map((e) => ({ ...e, exerciseId: localId('exercise', e.exerciseId as string) }));
    rows[kind].set(row.id as number | string, row);
    touched.add(kind);
  }
  const list = <T>(kind: keyof typeof rows, original: T[]) => touched.has(kind) ? [...rows[kind].values()] as T[] : original;
  const exercises = list('exercise', state.exercises);
  const sessions = list('session', state.sessions);
  let sets = list('set', state.sets);
  if (touched.has('exercise') || touched.has('session') || touched.has('set')) {
    // Sets of a deleted exercise or session go with it, as on the other device.
    const exerciseIds = new Set(exercises.map((e) => e.id)), sessionIds = new Set(sessions.map((s) => s.id));
    const kept = sets.filter((s) => exerciseIds.has(s.exerciseId) && sessionIds.has(s.sessionId));
    if (kept.length !== sets.length) sets = kept;
  }
  return { ...state, ...settings, exercises, sessions, sets, presets: list('preset', state.presets), nextId,
    bodyMeasurements: touched.has('bodyMeasurements') ? [...bodyMeasurements.values()].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)) : state.bodyMeasurements,
    workout: state.workout && sessions.some((s) => s.id === state.workout!.sessionId) ? state.workout : undefined,
    cloud: { ...state.cloud, mapping, cursor: page.cursor, deletedSessions: [...deletedSessions] } };
}

export function acknowledge(state: AppState, ids: string[]): AppState {
  if (!state.cloud) return state;
  return { ...state, cloud: { ...state.cloud, pending: state.cloud.pending.filter((m) => !ids.includes(m.mutationId)) } };
}

export function mergeGuest(account: AppState, guest: AppState, uuid: () => string): AppState {
  let nextId = account.nextId;
  // Reuse an equal active exercise (e.g. the default catalog on a fresh
  // install) so login imports and backup restores do not duplicate every name.
  const existing = new Map(account.exercises.filter((e) => !e.archived).map((e) => [exerciseKey(e), e.id]));
  const exercises = new Map(guest.exercises.map((e) => [e.id, existing.get(exerciseKey(e)) ?? nextId++]));
  const unique = <T>(values: T[]) => [...new Set(values)];
  const sessions = new Map(guest.sessions.map((s) => [s.id, nextId++]));
  const presets = new Map(guest.presets.map((p) => [p.id, uuid()]));
  const byExercise = (values: Record<number, number>) => Object.fromEntries(
    Object.entries(values).filter(([id]) => exercises.has(Number(id))).map(([id, v]) => [exercises.get(Number(id)), v]),
  );
  const bodyMeasurements = [...(account.bodyMeasurements ?? [])];
  for (const measurement of guest.bodyMeasurements ?? []) {
    // Native source IDs survive login/backup merges so subsequent health reads
    // and another device's sync continue to identify the same measurement.
    const sourced = measurement.id.startsWith('health-');
    if (sourced && bodyMeasurements.some(m => m.id === measurement.id)) continue;
    bodyMeasurements.push({ ...measurement, id: sourced ? measurement.id : uuid() });
  }
  const next = {
    ...account,
    exercises: [...account.exercises, ...guest.exercises.filter((e) => !existing.has(exerciseKey(e))).map((e) => ({ ...e, id: exercises.get(e.id)! }))],
    sessions: [...account.sessions, ...guest.sessions.map((s) => ({ ...s, id: sessions.get(s.id)!, presetId: s.presetId ? presets.get(s.presetId) : undefined }))],
    sets: [...account.sets, ...guest.sets.map((s) => ({ ...s, id: nextId++, sessionId: sessions.get(s.sessionId)!, exerciseId: exercises.get(s.exerciseId)! }))],
    presets: [...account.presets, ...guest.presets.map((p) => ({ ...p, id: presets.get(p.id)!, exercises: p.exercises.map((e) => ({ ...e, exerciseId: exercises.get(e.exerciseId)! }))
      .filter((e, index, all) => all.findIndex((other) => other.exerciseId === e.exerciseId) === index) }))],
    bodyMeasurements,
    heightCm: guest.heightCm ?? account.heightCm,
    homeGrowthExerciseId: guest.homeGrowthExerciseId ? exercises.get(guest.homeGrowthExerciseId) : account.homeGrowthExerciseId,
    homeProgress: guest.homeProgress ?? account.homeProgress,
    selectedPresetId: guest.selectedPresetId ? presets.get(guest.selectedPresetId) : account.selectedPresetId,
    themeMode: guest.themeMode, weekStartsMonday: guest.weekStartsMonday,
    weightStepKg: guest.weightStepKg, restDurationSeconds: guest.restDurationSeconds,
    visibleAchievementMetrics: guest.visibleAchievementMetrics,
    exerciseWeightSteps: { ...account.exerciseWeightSteps, ...byExercise(guest.exerciseWeightSteps) },
    exerciseRestDurations: { ...account.exerciseRestDurations, ...byExercise(guest.exerciseRestDurations) },
    restTimerDisabledExerciseIds: unique([...account.restTimerDisabledExerciseIds, ...guest.restTimerDisabledExerciseIds.map((id) => exercises.get(id)!)]),
    sideSwitchRestExerciseIds: unique([...account.sideSwitchRestExerciseIds, ...guest.sideSwitchRestExerciseIds.map((id) => exercises.get(id)!)]),
    leftFirstExerciseIds: unique([...account.leftFirstExerciseIds, ...guest.leftFirstExerciseIds.map((id) => exercises.get(id)!)]),
    nextId,
  };
  return trackChanges(account, next, uuid);
}
