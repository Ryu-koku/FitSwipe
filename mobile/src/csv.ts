import type { AppState, ExerciseMode, WorkoutSet } from './types';
import { localDay } from './logic';
import { nextId } from './workout';

const columns = ['date', 'exercise', 'bodyPart', 'weightKg', 'reps', 'setOrder', 'side', 'mode', 'session', 'startedAt', 'endedAt', 'exerciseId'];
const formula = /^[=+@\-\t\r]/;
const safeText = (v: string) => formula.test(v) ? `'${v}` : v;
const importText = (v: string) => v.startsWith("'") && formula.test(v.slice(1)) ? v.slice(1) : v.trim();
const quote = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
function invalid(): never { throw new Error('CSVの列・日付・重量・回数・左右・セット番号を確認してください。記録は変更していません。'); }

export function exportWorkoutCsv(state: AppState): string {
  const rows: unknown[][] = [];
  for (const set of state.sets) {
    const session = state.sessions.find(s => s.id === set.sessionId);
    const exercise = state.exercises.find(e => e.id === set.exerciseId);
    if (!session || session.status !== 'COMPLETED' || !exercise) continue;
    const add = (side: '' | 'left' | 'right', completed: boolean, weight: number | undefined, reps: number | undefined) => {
      if (!completed || !reps || reps < 1) return;
      rows.push([localDay(session.startedAt), safeText(exercise.name), safeText(exercise.muscleGroup ?? ''), weight, reps, set.setOrder, side,
        exercise.mode, session.id, session.startedAt, session.endedAt ?? session.startedAt, exercise.id]);
    };
    if (exercise.mode === 'BILATERAL') {
      add('left', set.leftCompleted, set.leftWeightKg, set.leftReps);
      add('right', set.rightCompleted, set.rightWeightKg, set.rightReps);
    } else add('', set.isCompleted, set.normalWeightKg, set.normalReps);
  }
  return [columns.join(','), ...rows.map(row => row.map(quote).join(','))].join('\r\n');
}

// CSV quoted commas, escaped quotes and embedded newlines are handled together.
export function parseCsv(raw: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false, closed = false;
  const finishField = () => { row.push(field); field = ''; closed = false; };
  const finishRow = () => { finishField(); if (row.some(v => v.trim())) rows.push(row); row = []; };
  const text = raw.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; }
      } else field += c;
    } else if (c === ',') finishField();
    else if (c === '\r' || c === '\n') { if (c === '\r' && text[i + 1] === '\n') i++; finishRow(); }
    else if (c === '"' && !field && !closed) quoted = true;
    else if (closed || c === '"') invalid();
    else field += c;
  }
  if (quoted) invalid();
  if (field || row.length || closed) finishRow();
  return rows;
}

export function importWorkoutCsv(state: AppState, raw: string): AppState {
  const [header, ...rows] = parseCsv(raw);
  if (!header || !rows.length) invalid();
  const names = header.map(v => v.trim());
  if (new Set(names).size !== names.length || !['date', 'exercise', 'weightKg', 'reps'].every(v => names.includes(v))) invalid();
  let id = nextId(state);
  const exercises = [...state.exercises], sessions = [...state.sessions], sets = [...state.sets];
  const importedSessions = new Map<string, { id: number; startedAt: string; endedAt: string }>();
  const importedSets = new Map<string, WorkoutSet>();
  const importedExercises = new Map<string, AppState['exercises'][number]>();
  const orders = new Map<string, number>();
  for (const row of rows) {
    if (row.length !== header.length) invalid();
    const get = (name: string) => { const value = row[names.indexOf(name)] ?? ''; return name === 'exercise' || name === 'bodyPart' ? importText(value) : value.trim(); };
    const day = get('date'), name = get('exercise');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day || !name || name.length > 80) invalid();
    const startedAt = get('startedAt') || `${day}T12:00:00+09:00`, endedAt = get('endedAt') || startedAt;
    if (!Number.isFinite(Date.parse(startedAt)) || !Number.isFinite(Date.parse(endedAt)) || Date.parse(endedAt) < Date.parse(startedAt)) invalid();
    const side = get('side');
    if (!['', 'left', 'right'].includes(side)) invalid();
    const mode: ExerciseMode = side ? 'BILATERAL' : 'NORMAL';
    if (get('mode') && get('mode') !== mode) invalid();
    const weight = get('weightKg') ? Number(get('weightKg')) : undefined, reps = Number(get('reps'));
    if ((weight !== undefined && (!Number.isFinite(weight) || weight < 0 || weight > 10000)) || !Number.isInteger(reps) || reps < 1 || reps > 10000) invalid();
    const sourceId = get('exerciseId');
    if (names.includes('exerciseId') && !sourceId) invalid();
    // Source IDs are scoped to this file, never interpreted as destination IDs.
    let exercise = sourceId ? importedExercises.get(sourceId) : exercises.find(e => e.name === name && e.mode === mode);
    if (exercise && (exercise.name !== name || exercise.mode !== mode || (sourceId && exercise.muscleGroup !== (get('bodyPart') || '未分類')))) invalid();
    if (!exercise) {
      exercise = { id: id++, name, mode, archived: false, sortOrder: exercises.length, muscleGroup: get('bodyPart') || '未分類' };
      exercises.push(exercise);
      if (sourceId) importedExercises.set(sourceId, exercise);
    }
    const sessionKey = get('session') || day;
    let session = importedSessions.get(sessionKey);
    if (session && (session.startedAt !== startedAt || session.endedAt !== endedAt)) invalid();
    if (!session) {
      session = { id: id++, startedAt, endedAt };
      importedSessions.set(sessionKey, session); sessions.push({ ...session, status: 'COMPLETED' });
    }
    const group = `${session.id}:${exercise.id}`;
    if (side && !get('setOrder')) invalid();
    const order = get('setOrder') ? Number(get('setOrder')) : (orders.get(group) ?? 0) + 1;
    if (!Number.isInteger(order) || order < 1 || order > 100) invalid();
    orders.set(group, Math.max(orders.get(group) ?? 0, order));
    const key = `${group}:${order}`;
    let set = importedSets.get(key);
    if (!set) {
      set = { id: id++, sessionId: session.id, exerciseId: exercise.id, setOrder: order,
        isCompleted: false, leftCompleted: false, rightCompleted: false };
      importedSets.set(key, set); sets.push(set);
    }
    if (side === 'left' || side === 'right') {
      if (set[`${side}Completed`]) invalid();
      set[`${side}WeightKg`] = weight; set[`${side}Reps`] = reps; set[`${side}Completed`] = true;
      set.isCompleted = set.leftCompleted && set.rightCompleted;
    } else {
      if (set.isCompleted) invalid();
      set.normalWeightKg = weight; set.normalReps = reps; set.isCompleted = true;
    }
  }
  return { ...state, exercises, sessions, sets, nextId: id };
}
