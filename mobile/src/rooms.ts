import type {
  AppState,
  PendingPost,
  Room,
  RoomDetail,
  RoomIdentity,
  SharedWorkout,
  RoomComparison,
} from './types';

export class RoomsApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createRoomsClient(
  endpoint = process.env.EXPO_PUBLIC_ROOMS_URL?.replace(/\/$/, ''),
) {
  async function request<T>(
    path: string,
    token?: string,
    method = 'GET',
    body?: unknown,
  ): Promise<T> {
    if (!endpoint)
      throw new Error(
        'ルーム共有は準備中です。公開後のアップデートで利用できます。',
      );
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname))) {
      throw new Error('接続先にはHTTPSが必要です。');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${endpoint}${path}`, {
        method,
        signal: controller.signal,
        redirect: 'error',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new RoomsApiError(
          response.status,
          data.error ?? '操作できませんでした',
        );
      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }
  return {
    google: (idToken: string, name: string, identity?: RoomIdentity) =>
      request<RoomIdentity & { expiresAt: number }>('/v1/auth/google', identity?.token, 'POST', { idToken, name }),
    push: (identity: RoomIdentity, changes: import('./sync').Mutation[]) =>
      request<{ acknowledged: string[] }>('/v1/sync', identity.token, 'POST', { changes }),
    pull: (identity: RoomIdentity, cursor: number) =>
      request<import('./sync').SyncPage>(`/v1/sync?cursor=${cursor}`, identity.token),
    configured: !!endpoint,
    sharing: (identity: RoomIdentity, roomId: string, enabled: boolean) =>
      request(`/v1/rooms/${roomId}/sharing`, identity.token, 'PUT', { enabled }),
    automaticKeys: (identity: RoomIdentity, roomId: string) =>
      request<{ clientIds: string[] }>(`/v1/rooms/${roomId}/auto-workouts`, identity.token),
    saveAutomatic: (identity: RoomIdentity, roomId: string, payload: SharedWorkout) =>
      request(`/v1/rooms/${roomId}/auto-workouts`, identity.token, 'PUT', payload),
    deleteAutomatic: (identity: RoomIdentity, roomId: string, clientId: string) =>
      request(`/v1/rooms/${roomId}/auto-workouts/${encodeURIComponent(clientId)}`, identity.token, 'DELETE'),
    comparison: (identity: RoomIdentity, roomId: string, month: string, cursor?: string | null) =>
      request<RoomComparison>(`/v1/rooms/${roomId}/comparison?month=${encodeURIComponent(month)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, identity.token),
    register: (name: string) =>
      request<RoomIdentity>('/v1/account', undefined, 'POST', {
        name: name.trim(),
      }),
    list: async (identity: RoomIdentity) =>
      (await request<{ rooms: Room[] }>('/v1/rooms', identity.token)).rooms,
    create: (identity: RoomIdentity, name: string) =>
      request<{ id: string }>('/v1/rooms', identity.token, 'POST', {
        name: name.trim(),
      }),
    join: (identity: RoomIdentity, code: string) =>
      request<{ id: string }>('/v1/rooms/join', identity.token, 'POST', {
        code: inviteCode(code),
      }),
    detail: async (identity: RoomIdentity, id: string): Promise<RoomDetail> => {
      const [members, posts] = await Promise.all([
        request<Pick<RoomDetail, 'members'>>(`/v1/rooms/${id}`, identity.token),
        request<Omit<RoomDetail, 'members'>>(
          `/v1/rooms/${id}/posts`,
          identity.token,
        ),
      ]);
      return { ...members, ...posts };
    },
    more: (identity: RoomIdentity, id: string, cursor: string) =>
      request<Omit<RoomDetail, 'members'>>(
        `/v1/rooms/${id}/posts?before=${encodeURIComponent(cursor)}`,
        identity.token,
      ),
    post: (identity: RoomIdentity, entry: PendingPost) =>
      request<{ id: string }>(
        `/v1/rooms/${entry.roomId}/posts`,
        identity.token,
        'POST',
        entry.workout,
      ),
    deletePost: (identity: RoomIdentity, roomId: string, postId: string) =>
      request(`/v1/rooms/${roomId}/posts/${postId}`, identity.token, 'DELETE'),
    leave: (identity: RoomIdentity, roomId: string) =>
      request(`/v1/rooms/${roomId}`, identity.token, 'DELETE'),
    rename: (identity: RoomIdentity, name: string) =>
      request('/v1/account', identity.token, 'PUT', { name: name.trim() }),
    deleteAccount: (identity: RoomIdentity) =>
      request('/v1/account', identity.token, 'DELETE'),
  };
}

export function inviteCode(raw: string) {
  try {
    if (/^(fitswipe|fitlogsolo):\/\//.test(raw.trim()))
      return new URL(raw.trim()).searchParams.get('code') ?? raw.trim();
  } catch {
    /* Plain codes are also accepted. */
  }
  return raw.trim();
}

export function workoutSnapshot(
  state: AppState,
  sessionId: number,
): SharedWorkout {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session || session.status !== 'COMPLETED')
    throw new Error('完了したトレーニングだけを共有できます');
  const exercises: SharedWorkout['exercises'] = [];
  state.exercises.forEach((exercise) => {
    const sets: SharedWorkout['exercises'][number]['sets'] = [];
    state.sets
      .filter(
        (set) => set.sessionId === sessionId && set.exerciseId === exercise.id,
      )
      .sort((a, b) => a.setOrder - b.setOrder)
      .forEach((set) => {
        if (exercise.mode === 'BILATERAL') {
          if (set.leftCompleted && (set.leftReps ?? 0) > 0)
            sets.push({
              weightKg: set.leftWeightKg,
              reps: set.leftReps!,
              order: set.setOrder,
              side: '左',
            });
          if (set.rightCompleted && (set.rightReps ?? 0) > 0)
            sets.push({
              weightKg: set.rightWeightKg,
              reps: set.rightReps!,
              order: set.setOrder,
              side: '右',
            });
        } else if (set.isCompleted && (set.normalReps ?? 0) > 0)
          sets.push({
            weightKg: set.normalWeightKg,
            reps: set.normalReps!,
            order: set.setOrder,
          });
      });
    if (sets.length) exercises.push({ name: exercise.name, sets });
  });
  if (!exercises.length) throw new Error('共有できる完了セットがありません');
  return {
    clientId: `${state.installationId}-${sessionId}`,
    presetName:
      state.presets.find((p) => p.id === session.presetId)?.name ??
      'トレーニング',
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? session.startedAt,
    exercises,
  };
}

export function enqueueWorkout(
  state: AppState,
  roomId: string,
  sessionId: number,
): AppState {
  if (!state.rooms.some((r) => r.id === roomId))
    throw new Error('共有先のルームを選んでください');
  const snapshot = workoutSnapshot(state, sessionId);
  if (
    state.pendingPosts.some(
      (p) => p.roomId === roomId && p.workout.clientId === snapshot.clientId,
    )
  )
    return state;
  if (state.pendingPosts.length >= 100)
    throw new Error('送信待ちの記録を先に共有してください');
  return {
    ...state,
    pendingPosts: [...state.pendingPosts, { roomId, workout: snapshot }],
  };
}

export async function flushPendingPosts(
  getState: () => AppState,
  persist: (updater: (state: AppState) => AppState) => Promise<void>,
  post: (entry: PendingPost) => Promise<unknown>,
) {
  while (getState().pendingPosts.length) {
    const first = getState().pendingPosts[0];
    const remove = () =>
      persist((s) => ({
        ...s,
        pendingPosts: s.pendingPosts.filter(
          (p) =>
            !(
              p.roomId === first.roomId &&
              p.workout.clientId === first.workout.clientId
            ),
        ),
      }));
    try {
      await post(first);
    } catch (error) {
      if (
        error instanceof RoomsApiError &&
        [400, 403, 404, 413].includes(error.status)
      )
        await remove();
      throw error;
    }
    await remove();
  }
}
