import { AppState, Room, RoomIdentity, RoomPost } from './types';

const endpoint = process.env.EXPO_PUBLIC_ROOMS_URL?.replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  if (!endpoint) throw new Error('ルームサーバーURLが未設定です');
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  });
  if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export async function registerRoomAccount(name: string): Promise<RoomIdentity> {
  return request<RoomIdentity>('/v1/account', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function listRooms(identity?: RoomIdentity): Promise<Room[]> {
  if (!identity) return [];
  return request<Room[]>('/v1/rooms', {}, identity.token);
}

export async function createRoom(identity: RoomIdentity, name: string): Promise<Room> {
  return request<Room>('/v1/rooms', { method: 'POST', body: JSON.stringify({ name }) }, identity.token);
}

export async function joinRoom(identity: RoomIdentity, code: string): Promise<Room> {
  return request<Room>('/v1/rooms/join', { method: 'POST', body: JSON.stringify({ code }) }, identity.token);
}

export async function roomPosts(identity: RoomIdentity, roomId: string): Promise<RoomPost[]> {
  return request<RoomPost[]>(`/v1/rooms/${roomId}/posts`, {}, identity.token);
}

export async function shareWorkout(state: AppState, roomId: string, presetName: string, sessionId: number) {
  const identity = state.roomIdentity;
  if (!identity) throw new Error('先にルームアカウントを作成してください');
  const session = state.sessions.find((item) => item.id === sessionId);
  const byExercise = state.sets.filter((set) => set.sessionId === sessionId && set.isCompleted).reduce<Record<string, RoomPost['exercises'][number]>>((result, set) => {
    const exercise = state.exercises.find((item) => item.id === set.exerciseId);
    if (!exercise) return result;
    const entry = result[exercise.name] ?? { name: exercise.name, sets: [] };
    if (exercise.mode === 'BILATERAL') {
      entry.sets.push({ weightKg: set.leftWeightKg, reps: set.leftReps, order: set.setOrder, side: '左' }, { weightKg: set.rightWeightKg, reps: set.rightReps, order: set.setOrder, side: '右' });
    } else entry.sets.push({ weightKg: set.normalWeightKg, reps: set.normalReps, order: set.setOrder });
    result[exercise.name] = entry;
    return result;
  }, {});
  return request<RoomPost>(`/v1/rooms/${roomId}/posts`, { method: 'POST', body: JSON.stringify({ clientId: `react-native-${sessionId}`, presetName, startedAt: session?.startedAt, endedAt: session?.endedAt, exercises: Object.values(byExercise) }) }, identity.token);
}
