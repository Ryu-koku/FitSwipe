import type { AppState, Room, SharedWorkout } from './types';
import { workoutSnapshot, type createRoomsClient } from './rooms';

export function japanMonth(date = new Date()) {
  return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 7);
}

export function automaticWorkouts(state: AppState, room: Room, now = new Date()): SharedWorkout[] {
  if (!room.sharingSince) return [];
  const start = new Date(`${room.sharingSince}-01T00:00:00+09:00`).getTime();
  return state.sessions.filter((s) => s.status === 'COMPLETED' && new Date(s.startedAt).getTime() >= start && new Date(s.startedAt).getTime() <= now.getTime())
    .flatMap((s) => {
      // Empty completed sessions (or records whose last set was removed) must
      // retract a prior automatic copy, rather than blocking the whole outbox.
      if (!state.sets.some((set) => set.sessionId === s.id && (set.isCompleted || set.leftCompleted || set.rightCompleted))) return [];
      let payload: SharedWorkout;
      try {
        payload = workoutSnapshot(state, s.id);
      } catch { return []; }
      const legacyClientId = payload.clientId;
      return [{ ...payload, clientId: state.cloud?.mapping[`session:${s.id}`] ?? legacyClientId, legacyClientId,
        startedAt: new Date(payload.startedAt).toISOString(), endedAt: new Date(payload.endedAt).toISOString() }];
    });
}

export function sharingPlan(state: AppState, room: Room, remoteKeys: string[], now = new Date()) {
  const desired = automaticWorkouts(state, room, now);
  const ids = new Set(desired.map((w) => w.clientId));
  const remote = new Set(remoteKeys);
  const receipts = state.automaticRoomReceipts?.[room.id] ?? {};
  const localIds = new Set(state.sessions.map((s) => state.cloud?.mapping[`session:${s.id}`] ?? `${state.installationId}-${s.id}`));
  const deleted = new Set([
    ...Object.values(state.cloud?.records ?? {}), ...(state.cloud?.pending ?? []),
  ].filter((r) => r.kind === 'session' && r.deleted).map((r) => r.id));
  return {
    // A device with an older personal-sync cursor must not erase another
    // device's newly shared workout just because it has not seen it yet.
    remove: remoteKeys.filter((id) => !ids.has(id) && (receipts[id] !== undefined || localIds.has(id) || deleted.has(id))),
    save: desired.filter((w) => !remote.has(w.clientId) || receipts[w.clientId] !== JSON.stringify(w)),
  };
}

export async function synchronizeAutomaticSharing({ client, getState, persist, isCurrent }: {
  client: Pick<ReturnType<typeof createRoomsClient>, 'list' | 'automaticKeys' | 'saveAutomatic' | 'deleteAutomatic'>;
  getState: () => AppState;
  persist: (change: (s: AppState) => AppState) => Promise<void>;
  isCurrent: () => boolean;
}) {
  const account = getState().roomIdentity;
  if (!account || !isCurrent()) return;
  // Persist first: a previous disk failure must never turn an in-memory edit
  // into a shared record which the device cannot recover after restarting.
  await persist((s) => s);
  const rooms = await client.list(account);
  if (!isCurrent()) return;
  await persist((s) => ({ ...s, rooms }));
  for (const room of rooms) {
    if (!room.sharingSince || !isCurrent()) continue;
    const remote = await client.automaticKeys(account, room.id);
    if (!isCurrent()) return;
    const plan = sharingPlan(getState(), room, remote.clientIds);
    for (const id of plan.remove) {
      if (!isCurrent()) return;
      await client.deleteAutomatic(account, room.id, id);
      if (!isCurrent()) return;
      await persist((s) => {
        const receipts = { ...s.automaticRoomReceipts?.[room.id] }; delete receipts[id];
        return { ...s, automaticRoomReceipts: { ...s.automaticRoomReceipts, [room.id]: receipts } };
      });
    }
    for (const payload of plan.save) {
      if (!isCurrent()) return;
      await client.saveAutomatic(account, room.id, payload);
      if (!isCurrent()) return;
      await persist((s) => ({ ...s, automaticRoomReceipts: { ...s.automaticRoomReceipts,
        [room.id]: { ...s.automaticRoomReceipts?.[room.id], [payload.clientId]: JSON.stringify(payload) } } }));
    }
  }
}
