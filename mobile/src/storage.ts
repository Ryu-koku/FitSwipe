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

export function saveState(state: AppState) {
  return AsyncStorage.setItem(KEY, JSON.stringify(state));
}
