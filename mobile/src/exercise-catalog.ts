import type { AppState, ExerciseMode } from './types';
import entries from './data/kintorememo-exercises.json';

import commonEntries from './data/common-exercises.json';

type CatalogEntry = { name: string; muscleGroup: string; mode?: ExerciseMode };
const batches: { version: number; entries: CatalogEntry[] }[] = [
  { version: 1, entries },
  { version: 2, entries: commonEntries as CatalogEntry[] },
];
export const exerciseCatalog = batches.flatMap((batch) => batch.entries);
export const exerciseCatalogVersion = 2;
const normalizedName = (name: string) => name.normalize('NFKC').trim().toLocaleLowerCase();
// Same exercise for merges and imports: equal normalized name and mode.
export const exerciseKey = (exercise: { name: string; mode: ExerciseMode }) => `${exercise.mode}:${normalizedName(exercise.name)}`;

// Every device derives the same sync UUID for a catalog entry, so devices that
// upgrade before seeing each other's additions converge on one exercise.
export function catalogUuid(name: string) {
  const text = `fitswipe-catalog:${normalizedName(name)}`;
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  const hex = [h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** One-time, additive upgrade: keep IDs, archived choices, custom names and history. */
export function ensureExerciseCatalog(state: AppState): AppState {
  if ((state.exerciseCatalogVersion ?? 0) >= exerciseCatalogVersion) return state;
  const names = new Set(state.exercises.map((exercise) => normalizedName(exercise.name)));
  let id = Math.max(state.nextId, 1, ...state.exercises.map((e) => e.id + 1),
    ...state.sessions.map((s) => s.id + 1), ...state.sets.map((s) => s.id + 1));
  let sortOrder = Math.max(-1, ...state.exercises.map((exercise) => exercise.sortOrder)) + 1;
  // Apply only unseen batches: an earlier catalog entry may have been renamed
  // or removed intentionally after its migration completed.
  const pending = batches.filter((batch) => batch.version > (state.exerciseCatalogVersion ?? 0)).flatMap((batch) => batch.entries);
  const synced = new Set(Object.values(state.cloud?.mapping ?? {}));
  const additions = pending.filter((entry) => !names.has(normalizedName(entry.name)) && !synced.has(catalogUuid(entry.name)))
    .map((entry) => ({ ...entry, id: id++, sortOrder: sortOrder++, mode: entry.mode ?? 'NORMAL', archived: false }));
  const cloud = state.cloud && { ...state.cloud, mapping: { ...state.cloud.mapping,
    ...Object.fromEntries(additions.map((exercise) => [`exercise:${exercise.id}`, catalogUuid(exercise.name)])) } };
  return { ...state, exerciseCatalogVersion, nextId: id, exercises: [...state.exercises, ...additions], cloud };
}
