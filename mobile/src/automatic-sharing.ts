import type { AppState, Room, SharedWorkout } from './types';
import { RoomsApiError, workoutSnapshot, type createRoomsClient } from './rooms';

// A receipt for a payload the server permanently refused. Editing the workout
// changes the payload, so the edited version is offered again.
const REJECTED = 'rejected:';
const permanent = (error: unknown) => error instanceof RoomsApiError && [400, 413].includes(error.status);
const roomGone = (error: unknown) => error instanceof RoomsApiError && [403, 404].includes(error.status);
// The member's quota in this room is full. Only new copies are refused, and it
// clears as old copies expire, so it is shown per room instead of blocking sync.
const roomFull = (error: unknown) => error instanceof RoomsApiError && error.status === 409;

export function japanMonth(date = new Date()) {
  return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 7);
}

export function automaticWorkouts(state: AppState, room: Room, now = new Date()): SharedWorkout[] {
  if (!room.sharingSince) return [];
  const [year, month] = japanMonth(now).split('-').map(Number);
  const start = Math.max(new Date(`${room.sharingSince}-01T00:00:00+09:00`).getTime(), Date.UTC(year, month - 12, 1, -9));
  // Group once: snapshotting each session by scanning every set is quadratic
  // and runs on each room render and every sync cycle.
  const bySession = new Map<number, AppState['sets']>();
  state.sets.forEach((set) => { const rows = bySession.get(set.sessionId); if (rows) rows.push(set); else bySession.set(set.sessionId, [set]); });
  return state.sessions.filter((s) => s.status === 'COMPLETED' && new Date(s.startedAt).getTime() >= start && new Date(s.startedAt).getTime() <= now.getTime())
    .flatMap((s) => {
      const sets = bySession.get(s.id) ?? [];
      // Empty completed sessions (or records whose last set was removed) must
      // retract a prior automatic copy, rather than blocking the whole outbox.
      if (!sets.some((set) => set.isCompleted || set.leftCompleted || set.rightCompleted)) return [];
      let payload: SharedWorkout;
      try {
        payload = workoutSnapshot(state, s.id, sets);
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
  const deleted = new Set([...(state.cloud?.deletedSessions ?? []),
    ...(state.cloud?.pending ?? []).filter((r) => r.kind === 'session' && r.deleted).map((r) => r.id)]);
  return {
    // A device with an older personal-sync cursor must not erase another
    // device's newly shared workout just because it has not seen it yet.
    remove: remoteKeys.filter((id) => !ids.has(id) && (receipts[id] !== undefined || localIds.has(id) || deleted.has(id))),
    save: desired.filter((w) => receipts[w.clientId] !== REJECTED + JSON.stringify(w) &&
      (!remote.has(w.clientId) || receipts[w.clientId] !== JSON.stringify(w))),
  };
}

export function sharingSummary(state: AppState, room: Room) {
  const receipts = state.automaticRoomReceipts?.[room.id] ?? {};
  const desired = automaticWorkouts(state, room);
  const pending = desired.filter((workout) => receipts[workout.clientId] !== JSON.stringify(workout)).length;
  const saved = state.automaticRoomStatus?.[room.id];
  const status = saved?.accountId === state.roomIdentity?.id ? saved : undefined;
  return { pending, status };
}

export async function synchronizeAutomaticSharing({ client, getState, persist, isCurrent }: {
  client: Pick<ReturnType<typeof createRoomsClient>, 'list' | 'automaticKeys' | 'saveAutomatic' | 'deleteAutomatic'>;
  getState: () => AppState;
  persist: (change: (s: AppState) => AppState) => Promise<void>;
  isCurrent: () => boolean;
}) {
  const account = getState().roomIdentity;
  if (!account || !isCurrent()) return;
  await persist((s) => s);
  const rooms = await client.list(account);
  if (!isCurrent()) return;
  await persist((s) => ({ ...s, rooms, automaticRoomStatus: Object.fromEntries(
    Object.entries(s.automaticRoomStatus ?? {}).filter(([id, value]) =>
      value.accountId === account.id && rooms.some((room) => room.id === id && room.sharingSince)),
  ) }));
  const failures: string[] = [];
  for (const room of rooms) {
    if (!isCurrent()) return;
    if (!room.sharingSince) continue;
    const issues: NonNullable<AppState['automaticRoomStatus']>[string]['issues'] = [];
    const report = (error: unknown, label: string, clientId?: string) => {
      const message = error instanceof Error ? error.message : '通信できませんでした';
      issues.push({ clientId, label, message, retryable: !permanent(error) && !roomGone(error) });
      if (!permanent(error) && !roomGone(error) && !roomFull(error)) failures.push(`${room.name}: ${message}`);
    };
    const saveStatus = (used?: number, limit?: number) => persist((s) => ({ ...s,
      automaticRoomStatus: { ...s.automaticRoomStatus, [room.id]: {
        accountId: account.id, checkedAt: new Date().toISOString(), used, limit, issues,
      } },
    }));
    let remote;
    try { remote = await client.automaticKeys(account, room.id); }
    catch (error) {
      if (!isCurrent()) return;
      report(error, '共有状態の確認'); await saveStatus(); continue;
    }
    if (!isCurrent()) return;
    const keys = new Set(remote.clientIds);
    const plan = sharingPlan(getState(), room, remote.clientIds);
    const receipt = (clientId: string, value?: string) => persist((s) => {
      const receipts = { ...s.automaticRoomReceipts?.[room.id] };
      if (value === undefined) delete receipts[clientId]; else receipts[clientId] = value;
      return { ...s, automaticRoomReceipts: { ...s.automaticRoomReceipts, [room.id]: receipts } };
    });
    // Keep previously rejected records visible even when automatic retries are suppressed.
    for (const payload of automaticWorkouts(getState(), room)) {
      if (getState().automaticRoomReceipts?.[room.id]?.[payload.clientId] === REJECTED + JSON.stringify(payload)) {
        const old = getState().automaticRoomStatus?.[room.id]?.issues.find((issue) => issue.clientId === payload.clientId);
        issues.push(old ?? { clientId: payload.clientId, label: `${payload.presetName} (${payload.startedAt.slice(0, 10)})`,
          message: '内容を確認して記録を修正するか、再試行してください', retryable: false });
      }
    }
    let unavailable = false;
    let consecutiveFailures = 0;
    for (const id of plan.remove) {
      if (!isCurrent()) return;
      try { await client.deleteAutomatic(account, room.id, id); }
      catch (error) {
        if (!isCurrent()) return;
        report(error, '共有記録の取り下げ', id);
        if (roomGone(error) || (!permanent(error) && ++consecutiveFailures >= 3)) { unavailable = true; break; }
        continue;
      }
      if (!isCurrent()) return;
      consecutiveFailures = 0;
      keys.delete(id); await receipt(id);
    }
    let full = false;
    if (!unavailable) for (const payload of plan.save) {
      if (!isCurrent()) return;
      // Updates of existing copies still fit; skip further new copies this cycle.
      if (full && !keys.has(payload.clientId)) continue;
      let value = JSON.stringify(payload);
      try { await client.saveAutomatic(account, room.id, payload); keys.add(payload.clientId); }
      catch (error) {
        if (!isCurrent()) return;
        if (roomFull(error)) { if (!full) report(error, '自動共有の上限', payload.clientId); full = true; continue; }
        report(error, `${payload.presetName} (${payload.startedAt.slice(0, 10)})`, payload.clientId);
        if (roomGone(error)) break;
        if (!permanent(error)) {
          if (++consecutiveFailures >= 3) break;
          continue;
        }
        value = REJECTED + value;
      }
      if (!isCurrent()) return;
      consecutiveFailures = 0;
      await receipt(payload.clientId, value);
    }
    if (!isCurrent()) return;
    await saveStatus(keys.size, remote.limit);
  }
  if (failures.length) throw new Error([...new Set(failures)].join('\n'));
}
