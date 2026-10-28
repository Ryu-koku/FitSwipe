import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from './types';
import { seedState } from './logic';
import * as SecureStore from 'expo-secure-store';

const KEY = 'fitlogsolo.react-native.state.v1';

export async function loadState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return seedState();
  // Never replace unreadable data with a fresh profile and later overwrite it.
  // Let the provider surface an actionable error while preserving the source.
  const loaded = await hydrate({ ...seedState(), ...JSON.parse(raw) } as AppState);
  // Upgrade old plaintext room tokens before exposing the loaded state.
  const original = JSON.parse(raw) as AppState;
  if (original.roomIdentity?.token || original.cloud?.identity.token) await saveState(loaded);
  return loaded;
}

let pending = Promise.resolve();

export function saveState(state: AppState) {
  pending = pending.catch(() => {}).then(async () => {
    const raw = await encode(state);
    await AsyncStorage.setItem(KEY, raw);
  });
  return pending;
}

async function encode(state: AppState) {
  const copy = JSON.parse(JSON.stringify(state)) as AppState;
  for (const identity of [copy.roomIdentity, copy.cloud?.identity]) {
    if (!identity?.token) continue;
    await SecureStore.setItemAsync(`fitswipe.token.${identity.id}`, identity.token);
    identity.token = '';
  }
  return JSON.stringify(copy);
}

async function hydrate(state: AppState) {
  for (const identity of [state.roomIdentity, state.cloud?.identity]) {
    if (!identity || identity.token) continue;
    identity.token = await SecureStore.getItemAsync(`fitswipe.token.${identity.id}`) ?? '';
  }
  return state;
}

export async function archiveState(state: AppState) {
  if (!state.cloud) return;
  await AsyncStorage.setItem(`fitswipe.archive.${state.cloud.identity.id}`, await encode(state));
}
export async function loadArchive(id: string): Promise<AppState | undefined> {
  const raw = await AsyncStorage.getItem(`fitswipe.archive.${id}`);
  return raw ? hydrate(JSON.parse(raw)) : undefined;
}
export async function removeArchive(id: string) {
  await AsyncStorage.removeItem(`fitswipe.archive.${id}`);
  await SecureStore.deleteItemAsync(`fitswipe.token.${id}`);
}
export async function saveGuest(state: AppState) {
  await AsyncStorage.setItem(`${KEY}.guest`, await encode({ ...state, cloud: undefined,
    roomIdentity: undefined, rooms: [], roomDetails: {}, pendingPosts: [], activeRoomId: undefined }));
}
export async function loadGuest(): Promise<AppState | undefined> {
  const raw = await AsyncStorage.getItem(`${KEY}.guest`);
  return raw ? hydrate(JSON.parse(raw)) : undefined;
}
