import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from './types';
import { seedState } from './logic';

const KEY = 'fitlogsolo.react-native.state.v1';

export async function loadState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return seedState();
  try {
    return { ...seedState(), ...JSON.parse(raw) } as AppState;
  } catch {
    return seedState();
  }
}

let pending = Promise.resolve();

export function saveState(state: AppState) {
  const raw = JSON.stringify(state);
  pending = pending.catch(() => {}).then(() => AsyncStorage.setItem(KEY, raw));
  return pending;
}
