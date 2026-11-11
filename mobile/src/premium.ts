import type { AppState, Room } from './types';

export const FREE_PRESET_LIMIT = 3;
export const FREE_CUSTOM_EXERCISE_LIMIT = 3;
export const FREE_OWNED_ROOM_LIMIT = 2;

export function canAddPreset(state: Pick<AppState, 'presets'>, premium: boolean) {
  return premium || state.presets.length < FREE_PRESET_LIMIT;
}
export function canAddCustomExercise(state: Pick<AppState, 'exercises'>, premium: boolean) {
  return premium || state.exercises.filter(e => e.custom === true && !e.archived).length < FREE_CUSTOM_EXERCISE_LIMIT;
}
export function canCreateRoom(rooms: Pick<Room, 'ownerId'>[], identityId: string, premium: boolean) {
  return premium || rooms.filter(room => room.ownerId === identityId).length < FREE_OWNED_ROOM_LIMIT;
}
