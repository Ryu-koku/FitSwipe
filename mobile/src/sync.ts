import type { AppState, RoomIdentity } from './types';

export type Kind = 'exercise' | 'session' | 'set' | 'preset' | 'setting';
export type RecordData = { kind: Kind; id: string; deleted: boolean; payload: { [key: string]: unknown } | null };
export type Mutation = RecordData & { mutationId: string };
export type SyncPage = { changes: (RecordData & { revision: number })[]; cursor: number; hasMore: boolean };
export type CloudState = {
  identity: RoomIdentity & { expiresAt: number };
  cursor: number;
  mapping: Record<string, string>;
  records: Record<string, RecordData>;
  pending: Mutation[];
  lastSynced?: string;
};
const kinds = ['exercise', 'session', 'set', 'preset'] as const;
const fields = ['themeMode', 'weekStartsMonday', 'weightStepKg', 'restDurationSeconds',
  'visibleAchievementMetrics', 'exerciseWeightSteps', 'exerciseRestDurations',
  'sideSwitchRestExerciseIds', 'leftFirstExerciseIds', 'selectedPresetId'] as const;
const keyOf = (r: Pick<RecordData, 'kind' | 'id'>) => `${r.kind}:${r.id}`;
// Fixed IDs for independent preference records; no other account's identity or
// transport state ever belongs in a synced payload.
const settingId = (index: number) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;

export function emptyCloud(identity: CloudState['identity']): CloudState {
  return { identity, cursor: 0, mapping: {}, records: {}, pending: [] };
}

export function project(state: AppState, mapping: Record<string, string>, uuid: () => string) {
  const result: Record<string, RecordData> = {};
  const id = (kind: Kind, local: number | string) => mapping[`${kind}:${local}`] ??= uuid();
  const add = (kind: Kind, local: number | string, payload: Record<string, unknown>) => {
    const record = { kind, id: id(kind, local), deleted: false, payload };
    result[keyOf(record)] = record;
  };
  state.exercises.forEach((e) => add('exercise', e.id, { ...e, id: undefined }));
  state.presets.forEach((p) => add('preset', p.id, { name: p.name,
    exercises: p.exercises.map((e) => ({ ...e, exerciseId: id('exercise', e.exerciseId) })) }));
  state.sessions.forEach((s) => add('session', s.id, { ...s, id: undefined,
    presetId: s.presetId ? id('preset', s.presetId) : undefined }));
  state.sets.forEach((s) => add('set', s.id, { ...s, id: undefined,
    sessionId: id('session', s.sessionId), exerciseId: id('exercise', s.exerciseId) }));
  fields.forEach((field, index) => {
    let value: unknown = state[field];
    if (field === 'selectedPresetId') value = state.selectedPresetId ? id('preset', state.selectedPresetId) : null;
    if (field === 'exerciseWeightSteps' || field === 'exerciseRestDurations') {
      value = Object.fromEntries(Object.entries(state[field]).map(([local, v]) => [id('exercise', local), v]));
    }
    if (field === 'sideSwitchRestExerciseIds' || field === 'leftFirstExerciseIds') value = state[field].map((v) => id('exercise', v));
    const record: RecordData = { kind: 'setting', id: settingId(index), deleted: false, payload: { field, value } };
    result[keyOf(record)] = record;
  });
  return result;
}

// State + UUID mapping + durable outbox are persisted in the same storage write.
export function trackChanges(previous: AppState, next: AppState, uuid: () => string): AppState {
  if (!next.cloud) return next;
  const cloud = { ...next.cloud, mapping: { ...next.cloud.mapping }, pending: [...next.cloud.pending] };
  const before = previous.cloud ? project(previous, cloud.mapping, uuid) : {};
  const after = project(next, cloud.mapping, uuid);
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    const record = after[key] ?? { ...before[key], deleted: true, payload: null };
    cloud.pending.push({ ...record, mutationId: uuid() });
  }
  return { ...next, cloud };
}

export function materialize(state: AppState, cloud: CloudState): AppState {
  const mapping = { ...cloud.mapping };
  let nextId = state.nextId;
  const locals = new Map<string, number | string>();
  Object.entries(mapping).forEach(([local, remote]) => {
    const [kind, ...parts] = local.split(':');
    locals.set(`${kind}:${remote}`, kind === 'preset' ? parts.join(':') : Number(parts[0]));
  });
  const localId = (kind: Kind, remote: unknown): number | string => {
    if (typeof remote !== 'string') throw new Error('同期データの参照が不正です');
    const key = `${kind}:${remote}`;
    if (!locals.has(key)) {
      const local = kind === 'preset' ? remote : nextId++;
      locals.set(key, local);
      mapping[`${kind}:${local}`] = remote;
    }
    return locals.get(key)!;
  };
  const records = { ...cloud.records };
  // Acknowledged records come from the server. Not-yet-sent local edits win
  // locally until sent; applying pulls must not destroy an edit made in-flight.
  cloud.pending.forEach((change) => { records[keyOf(change)] = change; });
  const grouped: Record<string, Record<string, unknown>[]> = {};
  kinds.forEach((kind) => { grouped[kind] = []; });
  Object.values(records).filter((r) => !r.deleted && r.payload && r.kind !== 'setting').forEach((r) => {
    const p = { ...r.payload, id: localId(r.kind, r.id) } as Record<string, unknown>;
    if (r.kind === 'session') p.presetId = p.presetId ? localId('preset', p.presetId) : undefined;
    if (r.kind === 'set') {
      p.sessionId = localId('session', p.sessionId);
      p.exerciseId = localId('exercise', p.exerciseId);
    }
    if (r.kind === 'preset') p.exercises = (p.exercises as Record<string, unknown>[]).map((e) => ({ ...e, exerciseId: localId('exercise', e.exerciseId) }));
    grouped[r.kind].push(p);
  });
  const settings: Record<string, unknown> = {};
  Object.values(records).filter((r) => r.kind === 'setting' && !r.deleted && r.payload).forEach((r) => {
    const field = r.payload!.field as typeof fields[number];
    if (!fields.includes(field)) return;
    let value = r.payload!.value;
    if (field === 'selectedPresetId') value = value ? localId('preset', value) : undefined;
    if (field === 'exerciseWeightSteps' || field === 'exerciseRestDurations') {
      value = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([remote, v]) => [localId('exercise', remote), v]));
    }
    if (field === 'sideSwitchRestExerciseIds' || field === 'leftFirstExerciseIds') value = (value as string[]).map((v) => localId('exercise', v));
    settings[field] = value;
  });
  const exercises = grouped.exercise as AppState['exercises'];
  const sessions = grouped.session as AppState['sessions'];
  const sets = (grouped.set as AppState['sets']).filter((s) => exercises.some((e) => e.id === s.exerciseId) && sessions.some((w) => w.id === s.sessionId));
  return { ...state, ...settings, exercises, sessions, sets, presets: grouped.preset as AppState['presets'], nextId,
    workout: state.workout && sessions.some((s) => s.id === state.workout!.sessionId) ? state.workout : undefined,
    cloud: { ...cloud, mapping } };
}

export function receive(state: AppState, page: SyncPage): AppState {
  if (!state.cloud) throw new Error('ログインが必要です');
  const records = { ...state.cloud.records };
  page.changes.forEach((record) => { records[keyOf(record)] = record; });
  return materialize(state, { ...state.cloud, records, cursor: page.cursor });
}

export function acknowledge(state: AppState, ids: string[]): AppState {
  if (!state.cloud) return state;
  return { ...state, cloud: { ...state.cloud, pending: state.cloud.pending.filter((m) => !ids.includes(m.mutationId)) } };
}

export function mergeGuest(account: AppState, guest: AppState, uuid: () => string): AppState {
  let nextId = account.nextId;
  const exercises = new Map(guest.exercises.map((e) => [e.id, nextId++]));
  const sessions = new Map(guest.sessions.map((s) => [s.id, nextId++]));
  const presets = new Map(guest.presets.map((p) => [p.id, uuid()]));
  const byExercise = (values: Record<number, number>) => Object.fromEntries(
    Object.entries(values).filter(([id]) => exercises.has(Number(id))).map(([id, v]) => [exercises.get(Number(id)), v]),
  );
  const next = {
    ...account,
    exercises: [...account.exercises, ...guest.exercises.map((e) => ({ ...e, id: exercises.get(e.id)! }))],
    sessions: [...account.sessions, ...guest.sessions.map((s) => ({ ...s, id: sessions.get(s.id)!, presetId: s.presetId ? presets.get(s.presetId) : undefined }))],
    sets: [...account.sets, ...guest.sets.map((s) => ({ ...s, id: nextId++, sessionId: sessions.get(s.sessionId)!, exerciseId: exercises.get(s.exerciseId)! }))],
    presets: [...account.presets, ...guest.presets.map((p) => ({ ...p, id: presets.get(p.id)!, exercises: p.exercises.map((e) => ({ ...e, exerciseId: exercises.get(e.exerciseId)! })) }))],
    selectedPresetId: guest.selectedPresetId ? presets.get(guest.selectedPresetId) : account.selectedPresetId,
    themeMode: guest.themeMode, weekStartsMonday: guest.weekStartsMonday,
    weightStepKg: guest.weightStepKg, restDurationSeconds: guest.restDurationSeconds,
    visibleAchievementMetrics: guest.visibleAchievementMetrics,
    exerciseWeightSteps: { ...account.exerciseWeightSteps, ...byExercise(guest.exerciseWeightSteps) },
    exerciseRestDurations: { ...account.exerciseRestDurations, ...byExercise(guest.exerciseRestDurations) },
    sideSwitchRestExerciseIds: [...account.sideSwitchRestExerciseIds, ...guest.sideSwitchRestExerciseIds.map((id) => exercises.get(id)!)],
    leftFirstExerciseIds: [...account.leftFirstExerciseIds, ...guest.leftFirstExerciseIds.map((id) => exercises.get(id)!)],
    nextId,
  };
  return trackChanges(account, next, uuid);
}
