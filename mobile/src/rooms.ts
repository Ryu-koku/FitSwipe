import type { SafetyStatus, ReportReason } from './legal';
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
      const data = await response.json().catch(() => { throw new RoomsApiError(response.status, 'サーバーに接続できませんでした。再度お試しください'); });
      if (!response.ok)
        throw new RoomsApiError(
          response.status,
          `${data.error ?? '操作できませんでした'}${response.status === 404 ? ` (${method} ${path.split('?')[0]})` : ''}`,
        );
      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }
  return {
    review: (login: string, password: string, termsVersion: string) =>
      request<RoomIdentity & { expiresAt: number }>('/v1/auth/review', undefined, 'POST', { login, password, termsVersion }),
    google: (idToken: string, name: string, identity?: RoomIdentity, termsVersion?: string) =>
      request<RoomIdentity & { expiresAt: number }>('/v1/auth/google', identity?.token, 'POST', { idToken, name, termsVersion }),
    push: (identity: RoomIdentity, changes: import('./sync').Mutation[]) =>
      request<{ acknowledged: string[] }>('/v1/sync', identity.token, 'POST', { changes }),
    pull: (identity: RoomIdentity, cursor: number) =>
      request<import('./sync').SyncPage>(`/v1/sync?cursor=${cursor}`, identity.token),
    configured: !!endpoint,
    safety: (identity: RoomIdentity) => request<SafetyStatus>('/v1/safety', identity.token),
    acceptTerms: (identity: RoomIdentity, termsVersion: string) => request('/v1/safety/terms', identity.token, 'POST', { termsVersion }),
    block: (identity: RoomIdentity, targetId: string, enabled: boolean) => request(`/v1/safety/blocks/${targetId}`, identity.token, enabled ? 'PUT' : 'DELETE', enabled ? {} : undefined),
    report: (identity: RoomIdentity, roomId: string, targetId: string, reason: ReportReason, details: string, postId?: string) =>
      request<{ id: string }>(`/v1/rooms/${roomId}/reports`, identity.token, 'POST', { targetId, reason, details, postId }),
    sharing: (identity: RoomIdentity, roomId: string, enabled: boolean, sinceMonth?: string) =>
      request(`/v1/rooms/${roomId}/sharing`, identity.token, 'PUT', { enabled, sinceMonth }),
    automaticKeys: (identity: RoomIdentity, roomId: string) =>
      request<{ clientIds: string[]; used?: number; limit?: number }>(`/v1/rooms/${roomId}/auto-workouts`, identity.token),
    saveAutomatic: (identity: RoomIdentity, roomId: string, payload: SharedWorkout) =>
      request(`/v1/rooms/${roomId}/auto-workouts`, identity.token, 'PUT', payload),
    deleteAutomatic: (identity: RoomIdentity, roomId: string, clientId: string) =>
      request(`/v1/rooms/${roomId}/auto-workouts/${encodeURIComponent(clientId)}`, identity.token, 'DELETE'),
    comparison: (identity: RoomIdentity, roomId: string, month: string, cursor?: string | null, memberId?: string) =>
      request<RoomComparison>(`/v1/rooms/${roomId}/comparison?month=${encodeURIComponent(month)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}${memberId ? `&memberId=${encodeURIComponent(memberId)}` : ''}`, identity.token),
    register: (name: string, avatar?: string | null, termsVersion?: string) =>
      request<RoomIdentity>('/v1/account', undefined, 'POST', {
        name: name.trim(), avatar, termsVersion,
      }),
    list: async (identity: RoomIdentity) =>
      (await request<{ rooms: Room[] }>('/v1/rooms', identity.token)).rooms,
    create: (identity: RoomIdentity, name: string, competitive = false) =>
      request<{ id: string }>('/v1/rooms', identity.token, 'POST', {
        name: name.trim() ? name : '筋トレ仲間',
        competitive,
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
    rotateInvite: (identity: RoomIdentity, roomId: string) =>
      request(`/v1/rooms/${roomId}/invite`, identity.token, 'POST', {}),
    removeMember: (identity: RoomIdentity, roomId: string, memberId: string) =>
      request(`/v1/rooms/${roomId}/members/${memberId}`, identity.token, 'DELETE'),
    leave: (identity: RoomIdentity, roomId: string) =>
      request(`/v1/rooms/${roomId}/leave`, identity.token, 'POST', {}),
    deleteRoom: (identity: RoomIdentity, roomId: string) =>
      request(`/v1/rooms/${roomId}`, identity.token, 'DELETE'),
    profile: (identity: RoomIdentity, name: string, avatar: string | null) =>
      request<{ name: string; avatar: string | null }>('/v1/account', identity.token, 'PUT', { name: name.trim(), avatar }),
    rename: (identity: RoomIdentity, name: string) =>
      request('/v1/account', identity.token, 'PUT', { name: name.trim() }),
    deleteAccount: (identity: RoomIdentity) =>
      request('/v1/account', identity.token, 'DELETE'),
    revokeSession: (identity: RoomIdentity) =>
      request('/v1/auth/session', identity.token, 'DELETE'),
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

// Keep shared text within the servers' limits: no control characters, not
// blank, at most 80 characters. Local names stay unchanged.
function sharedText(value: string | undefined, fallback: string) {
  const text = [...(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/gu, ' ').trim()].slice(0, 80).join('').trim();
  return text || fallback;
}
const MAX_SHARED_MS = 7 * 86_400_000;
function sharedEnd(startedAt: string, endedAt: string | undefined) {
  const start = Date.parse(startedAt), end = Date.parse(endedAt ?? startedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return startedAt;
  return end - start > MAX_SHARED_MS ? new Date(start + MAX_SHARED_MS).toISOString() : endedAt ?? startedAt;
}

export function workoutSnapshot(
  state: AppState,
  sessionId: number,
  // Callers snapshotting many sessions pass the sets grouped once by session.
  sessionSets = state.sets.filter((set) => set.sessionId === sessionId),
): SharedWorkout {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session || session.status !== 'COMPLETED')
    throw new Error('完了したトレーニングだけを共有できます');
  const exercises: SharedWorkout['exercises'] = [];
  state.exercises.forEach((exercise) => {
    const sets: SharedWorkout['exercises'][number]['sets'] = [];
    sessionSets
      .filter((set) => set.exerciseId === exercise.id)
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
    if (sets.length) exercises.push({ name: sharedText(exercise.name, '種目'), sets });
  });
  if (!exercises.length) throw new Error('共有できる完了セットがありません');
  return {
    clientId: `${state.installationId}-${sessionId}`,
    presetName: sharedText(
      state.presets.find((p) => p.id === session.presetId)?.name,
      'トレーニング',
    ),
    startedAt: session.startedAt,
    // A session left open for days (or reopened later) is still shareable;
    // the servers reject spans over seven days.
    endedAt: sharedEnd(session.startedAt, session.endedAt),
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

const flushing = new WeakMap<() => AppState, Promise<void>>();

export function flushPendingPosts(
  getState: () => AppState,
  persist: (updater: (state: AppState) => AppState) => Promise<void>,
  post: (entry: PendingPost) => Promise<unknown>,
) {
  const running = flushing.get(getState);
  if (running) return running;
  const work = drainPendingPosts(getState, persist, post).finally(() => flushing.delete(getState));
  flushing.set(getState, work);
  return work;
}

async function drainPendingPosts(
  getState: () => AppState,
  persist: (updater: (state: AppState) => AppState) => Promise<void>,
  post: (entry: PendingPost) => Promise<unknown>,
) {
  const account = getState().roomIdentity;
  const sameAccount = (s: AppState) => s.roomIdentity?.id === account?.id && s.roomIdentity?.token === account?.token;
  while (sameAccount(getState()) && getState().pendingPosts.length) {
    const first = getState().pendingPosts[0];
    const remove = () =>
      persist((s) => sameAccount(s) ? ({
        ...s,
        pendingPosts: s.pendingPosts.filter(
          (p) =>
            !(
              p.roomId === first.roomId &&
              p.workout.clientId === first.workout.clientId
            ),
        ),
      }) : s);
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
