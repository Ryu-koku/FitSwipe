import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from './types';
import { seedState } from './logic';
import * as SecureStore from 'expo-secure-store';
import { exerciseGroup } from './exercise-groups';

const KEY = 'fitlogsolo.react-native.state.v1';

// Bound UTF-8 rows below 512KB, including non-ASCII JSON.
const CHUNK = 128 * 1024;
type Manifest = { fitswipeChunks: 1; generation: string; count: number };
let generation = 0;
function manifest(raw: string | null): Manifest | undefined {
  if (!raw) return;
  let value;
  try { value = JSON.parse(raw); } catch { return; }
  if (value?.fitswipeChunks !== 1) return;
  if (typeof value.generation !== 'string' || !Number.isSafeInteger(value.count) || value.count < 1) throw new Error('保存データが不完全です');
  return value;
}
const chunkKeys = (key: string, m: Manifest) => Array.from({ length: m.count }, (_, i) => `${key}.chunk.${m.generation}.${i}`);
async function readValue(key: string) {
  const raw = await AsyncStorage.getItem(key), m = manifest(raw);
  if (!m) return raw;
  const chunks = await AsyncStorage.multiGet(chunkKeys(key, m));
  if (chunks.some(([, value]) => value === null)) throw new Error('保存データが不完全です');
  return chunks.map(([, value]) => value).join('');
}
async function writeValue(key: string, raw: string) {
  const previous = manifest(await AsyncStorage.getItem(key));
  const values: string[] = [];
  for (let start = 0; start < raw.length;) {
    let end = Math.min(start + CHUNK, raw.length);
    if (end < raw.length && /[\uD800-\uDBFF]/.test(raw[end - 1])) end--;
    values.push(raw.slice(start, end)); start = end;
  }
  if (!values.length) values.push('');
  const m: Manifest = { fitswipeChunks: 1, generation: `${Date.now().toString(36)}-${++generation}-${Math.random().toString(36).slice(2)}`, count: values.length };
  const keys = chunkKeys(key, m);
  await AsyncStorage.multiSet(keys.map((k, i) => [k, values[i]]));
  await AsyncStorage.setItem(key, JSON.stringify(m));
  if (previous) await AsyncStorage.multiRemove(chunkKeys(key, previous));
}
async function removeValue(key: string) {
  const previous = manifest(await AsyncStorage.getItem(key));
  await AsyncStorage.removeItem(key);
  if (previous) await AsyncStorage.multiRemove(chunkKeys(key, previous));
}

// The main profile is stored by part so a save (every workout tap) writes only
// what changed: large arrays as pages compared by row identity (updates are
// immutable), room data when its object changes, and a small base. Every save
// writes new keys and commits them by replacing the manifest under KEY last, so
// a crash always leaves the previous complete version readable.
type StateManifest = { fitswipeState: 2; parts: Record<string, string[][]> };
type Saved = { raw: string; manifest: StateManifest; pages: Record<string, unknown[][]>; values: Record<string, unknown> };
const PAGE = 256;
const PAGED = ['exercises', 'presets', 'sessions', 'sets', 'bodyMeasurements', 'pendingPosts'] as const;
const WHOLE = ['rooms', 'roomDetails', 'automaticRoomReceipts', 'automaticRoomStatus'] as const;
let saved: Saved | undefined;
const sameEntry = (a: unknown, b: unknown) => a === b ||
  (Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1]);
function stateManifest(raw: string | null): StateManifest | undefined {
  if (!raw) return;
  let value;
  try { value = JSON.parse(raw); } catch { return; }
  return value?.fitswipeState === 2 && value.parts && typeof value.parts === 'object' ? value : undefined;
}
function split(text: string) {
  const pieces: string[] = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + CHUNK, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    pieces.push(text.slice(start, end)); start = end;
  }
  return pieces.length ? pieces : [''];
}
const ownedKey = (key: string) => key.startsWith(`${KEY}.s.`) || key.startsWith(`${KEY}.chunk.`);

async function writeState(state: AppState) {
  await storeTokens(state);
  const current = await AsyncStorage.getItem(KEY);
  // Diff only against what is actually on disk (another writer, a reset or a
  // failed commit may have replaced it).
  const previous = saved && saved.raw === current ? saved : undefined;
  const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const writes: [string, string][] = [];
  const store = (value: unknown) => split(JSON.stringify(value)).map((piece) => {
    const key = `${KEY}.s.${generation}.${writes.length}`;
    writes.push([key, piece]);
    return key;
  });
  const next: Omit<Saved, 'raw'> = { manifest: { fitswipeState: 2, parts: {} }, pages: {}, values: {} };
  const record = state as unknown as Record<string, unknown>;
  const paged: [string, unknown[]][] = [
    ...PAGED.map((name) => [name, (record[name] as unknown[] | undefined) ?? []] as [string, unknown[]]),
    ['cloud.pending', state.cloud?.pending ?? []],
    ['cloud.mapping', Object.entries(state.cloud?.mapping ?? {})],
  ];
  for (const [name, items] of paged) {
    const pages = Array.from({ length: Math.ceil(items.length / PAGE) }, (_, i) => items.slice(i * PAGE, (i + 1) * PAGE));
    next.pages[name] = pages;
    next.manifest.parts[name] = pages.map((page, i) => {
      const old = previous?.pages[name]?.[i];
      return old && old.length === page.length && page.every((item, j) => sameEntry(item, old[j]))
        ? previous!.manifest.parts[name][i] : store(page);
    });
  }
  for (const name of WHOLE) {
    const value = record[name];
    if (value === undefined) continue;
    next.values[name] = value;
    next.manifest.parts[name] = [previous?.values[name] === value && previous.manifest.parts[name] ? previous.manifest.parts[name][0] : store(value)];
  }
  const base = Object.fromEntries(Object.entries(record).filter(([name]) =>
    !(PAGED as readonly string[]).includes(name) && !(WHOLE as readonly string[]).includes(name)));
  next.manifest.parts.base = [store({ ...base, roomIdentity: withoutToken(state.roomIdentity),
    cloud: state.cloud && { ...state.cloud, pending: undefined, mapping: undefined, identity: withoutToken(state.cloud.identity) } })];
  if (writes.length) await AsyncStorage.multiSet(writes);
  const raw = JSON.stringify(next.manifest);
  await AsyncStorage.setItem(KEY, raw);
  saved = { ...next, raw };
  // The manifest is the commit. Cleanup is retried on load; its failure must
  // not make the provider retain the old state after disk already advanced.
  try {
    const keep = new Set(Object.values(next.manifest.parts).flat(2));
    const stale = previous ? Object.values(previous.manifest.parts).flat(2) : (await AsyncStorage.getAllKeys()).filter(ownedKey);
    const remove = stale.filter((key) => !keep.has(key));
    if (remove.length) await AsyncStorage.multiRemove(remove);
  } catch { /* Committed data remains readable. */ }
}

async function readState(raw: string, manifest: StateManifest): Promise<AppState> {
  const keys = Object.values(manifest.parts).flat(2);
  const values = new Map(await AsyncStorage.multiGet(keys));
  if (keys.some((key) => values.get(key) == null)) throw new Error('保存データが不完全です');
  const read = (pieces: string[]) => JSON.parse(pieces.map((key) => values.get(key)).join(''));
  if (!manifest.parts.base?.[0]) throw new Error('保存データが不完全です');
  const state = { ...seedState(), exerciseCatalogVersion: 0, ...read(manifest.parts.base[0]) } as Record<string, unknown>;
  const pages: Record<string, unknown[][]> = {}, wholes: Record<string, unknown> = {};
  const pagesOf = (name: string) => (pages[name] = (manifest.parts[name] ?? []).map(read));
  for (const name of PAGED) state[name] = pagesOf(name).flat();
  const cloud = state.cloud as Record<string, unknown> | undefined;
  const pending = pagesOf('cloud.pending').flat(), mapping = pagesOf('cloud.mapping').flat() as [string, string][];
  if (cloud) { cloud.pending = pending; cloud.mapping = Object.fromEntries(mapping); }
  for (const name of WHOLE) if (manifest.parts[name]) state[name] = wholes[name] = read(manifest.parts[name][0]);
  saved = { raw, manifest, pages, values: wholes };
  // Remove keys of interrupted saves and of the previous storage format.
  try {
    const referenced = new Set(keys);
    const orphans = (await AsyncStorage.getAllKeys()).filter((key) => ownedKey(key) && !referenced.has(key));
    if (orphans.length) await AsyncStorage.multiRemove(orphans);
  } catch { /* Cleanup cannot invalidate a complete profile. */ }
  return state as unknown as AppState;
}

export async function loadState(): Promise<AppState> {
  await recoverGuestSwap();
  // Never replace unreadable data with a fresh profile and later overwrite it.
  // Let the provider surface an actionable error while preserving the source.
  const current = await AsyncStorage.getItem(KEY);
  const manifest = stateManifest(current);
  if (manifest) return hydrate(await readState(current!, manifest));
  saved = undefined;
  const raw = await readValue(KEY);
  if (!raw) return seedState();
  // Earlier single-value formats: load, and rewrite by part on the next save.
  const loaded = await hydrate({ ...seedState(), exerciseCatalogVersion: 0, ...JSON.parse(raw) } as AppState);
  // Upgrade old plaintext room tokens before exposing the loaded state.
  const original = JSON.parse(raw) as AppState;
  if (original.roomIdentity?.token || original.cloud?.identity.token) await saveState(loaded);
  return loaded;
}

// Recovery when the main profile cannot be read: copy every app value as-is
// (tokens stay in SecureStore), then optionally start over. Archives and the
// pre-login guest copy are kept.
export async function exportRawStorage() {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith('fitlogsolo.') || key.startsWith('fitswipe.'));
  const values: Record<string, string | null> = {};
  for (const key of keys) {
    try { values[key] = await AsyncStorage.getItem(key); } catch { values[key] = null; }
  }
  return JSON.stringify({ format: 'fitswipe-raw', exportedAt: new Date().toISOString(), values });
}
export async function resetMainState() {
  // An unreadable value cannot report its parts, so remove them by prefix.
  saved = undefined;
  await AsyncStorage.multiRemove([KEY, SWAP_KEY, ...(await AsyncStorage.getAllKeys())
    .filter((key) => ownedKey(key) || key.startsWith(`${SWAP_KEY}.chunk.`))]);
}

let pending = Promise.resolve();

export function saveState(state: AppState) {
  pending = pending.catch(() => {}).then(async () => {
    await recoverGuestSwap();
    await writeState(state);
  });
  return pending;
}

// Tokens live in SecureStore only. Remember what was written so a save (every
// workout tap) does not rewrite the keystore entry, and serialize only once.
const storedTokens = new Map<string, string>();
const withoutToken = <T extends { token: string }>(identity: T | undefined) => identity && { ...identity, token: '' };
async function storeTokens(state: AppState) {
  for (const identity of [state.roomIdentity, state.cloud?.identity]) {
    if (!identity?.token || storedTokens.get(identity.id) === identity.token) continue;
    await SecureStore.setItemAsync(`fitswipe.token.${identity.id}`, identity.token);
    storedTokens.set(identity.id, identity.token);
  }
}
async function encode(state: AppState) {
  await storeTokens(state);
  return JSON.stringify({ ...state, roomIdentity: withoutToken(state.roomIdentity),
    cloud: state.cloud && { ...state.cloud, identity: withoutToken(state.cloud.identity)! } });
}

async function hydrate(state: AppState) {
  state.restTimerDisabled = state.restTimerDisabled === true;
  delete (state as AppState & { restTimerDisabledExerciseIds?: unknown }).restTimerDisabledExerciseIds;
  state.weightUnit = state.weightUnit === 'lb' ? 'lb' : 'kg';
  // Keep row objects when nothing changes: saves skip unchanged rows by identity.
  state.exercises = state.exercises.map((exercise) => {
    const muscleGroup = exerciseGroup(exercise);
    return muscleGroup === exercise.muscleGroup ? exercise : { ...exercise, muscleGroup };
  });
  // Older builds kept a full copy of server records; only session deletions matter.
  const legacy = state.cloud as (NonNullable<AppState['cloud']> & { records?: Record<string, { kind: string; id: string; deleted: boolean }> }) | undefined;
  if (legacy?.records) {
    legacy.deletedSessions = Object.values(legacy.records).filter((r) => r.kind === 'session' && r.deleted).map((r) => r.id);
    delete legacy.records;
  }
  for (const identity of [state.roomIdentity, state.cloud?.identity]) {
    if (!identity || identity.token) continue;
    identity.token = await SecureStore.getItemAsync(`fitswipe.token.${identity.id}`) ?? '';
    if (identity.token) storedTokens.set(identity.id, identity.token);
  }
  return state;
}

// The archive is reopened only by a new Google login, which brings its own
// token, so a logged-out session credential is never kept on the device.
export async function archiveState(state: AppState) {
  if (!state.cloud) return;
  await writeValue(`fitswipe.archive.${state.cloud.identity.id}`, await encode({ ...state,
    roomIdentity: withoutToken(state.roomIdentity), cloud: { ...state.cloud, identity: withoutToken(state.cloud.identity)! } }));
}
export async function forgetToken(id: string) {
  storedTokens.delete(id);
  await SecureStore.deleteItemAsync(`fitswipe.token.${id}`);
}
export async function loadArchive(id: string): Promise<AppState | undefined> {
  const raw = await readValue(`fitswipe.archive.${id}`);
  return raw ? hydrate(JSON.parse(raw)) : undefined;
}
export async function removeArchive(id: string) {
  await removeValue(`fitswipe.archive.${id}`);
  await forgetToken(id);
}
export async function saveGuest(state: AppState) {
  await pending.catch(() => {});
  await recoverGuestSwap();
  await writeValue(`${KEY}.guest`, await encode({ ...state, cloud: undefined,
    roomIdentity: undefined, rooms: [], roomDetails: {}, pendingPosts: [], activeRoomId: undefined, automaticRoomReceipts: undefined }));
}
export async function loadGuest(): Promise<AppState | undefined> {
  await pending.catch(() => {});
  await recoverGuestSwap();
  const raw = await readValue(`${KEY}.guest`);
  return raw ? hydrate(JSON.parse(raw)) : undefined;
}

// A single durable journal commits both sides of the swap. If a later write
// fails, startup (or the next save) finishes it before accepting newer data.
const SWAP_KEY = `${KEY}.guest-swap`;
async function recoverGuestSwap() {
  const raw = await readValue(SWAP_KEY);
  if (!raw) return;
  const swap = JSON.parse(raw) as { main: string; guest: string };
  await writeState(JSON.parse(swap.main) as AppState);
  await writeValue(`${KEY}.guest`, swap.guest);
  await removeValue(SWAP_KEY);
}
export function swapGuest(current: AppState, restored: AppState) {
  pending = pending.catch(() => {}).then(async () => {
    await recoverGuestSwap();
    const guest = { ...current, cloud: undefined, roomIdentity: undefined,
      rooms: [], roomDetails: {}, pendingPosts: [], activeRoomId: undefined, automaticRoomReceipts: undefined };
    await writeValue(SWAP_KEY, JSON.stringify({ main: await encode(restored), guest: await encode(guest) }));
    // The journal is already durable. A failed materialization is recoverable.
    await recoverGuestSwap().catch(() => {});
  });
  return pending;
}
