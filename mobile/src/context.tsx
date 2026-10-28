import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { archiveState, loadArchive, loadGuest, loadState, removeArchive, saveGuest, saveState } from './storage';
import { AppState } from './types';
import { seedState } from './logic';
import { finishWorkout, startWorkout } from './workout';
import { randomUUID } from 'expo-crypto';
import { createRoomsClient, RoomsApiError } from './rooms';
import { acknowledge, emptyCloud, mergeGuest, receive, trackChanges, type SyncPage } from './sync';
import { googleSignIn } from './google-login';
import { AppState as NativeAppState } from 'react-native';
import { synchronizeAutomaticSharing } from './automatic-sharing';

type AppContextValue = {
  state: AppState;
  ready: boolean;
  update: (updater: (state: AppState) => AppState) => void;
  startWorkout: (presetId?: string) => void;
  finishWorkout: (sessionId: number) => void;
  getState: () => AppState;
  persist: (updater: (state: AppState) => AppState) => Promise<void>;
  error?: string;
  cloudBusy: boolean;
  syncError?: string;
  syncNow: () => Promise<void>;
  login: (confirm: (message: string) => Promise<boolean>) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteCloudAccount: () => Promise<void>;
  restoreGuest: () => Promise<void>;
  syncRoomsNow: () => Promise<void>;
  roomSyncError?: string;
};

const Context = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(seedState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const current = useRef(state);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  const transition = useRef(false);
  const syncRunning = useRef<Promise<void> | undefined>(undefined);
  const automaticRunning = useRef<Promise<void> | undefined>(undefined);
  const [roomSyncError, setRoomSyncError] = useState<string>();
  const client = useRef(createRoomsClient()).current;
  const rawPersist = useCallback(async (updater: (s: AppState) => AppState) => {
    const next = updater(current.current);
    // Saving and publishing happen in the same synchronous turn; callers always
    // await durability before acknowledging network operations or switching users.
    current.current = next;
    setState(next);
    await saveState(next);
  }, []);
  useEffect(() => {
    loadState()
      .then((loaded) => {
        current.current = loaded;
        setState(loaded);
        setReady(true);
      })
      .catch(() =>
        setError('記録を読み込めませんでした。アプリを開き直してください。'),
      );
  }, []);
  const getState = useCallback(() => current.current, []);
  const persist = useCallback((updater: (state: AppState) => AppState) => {
    if (transition.current) return Promise.reject(new Error('アカウント処理中です。しばらくお待ちください。'));
    const next = trackChanges(current.current, updater(current.current), randomUUID);
    current.current = next;
    setState(next);
    return saveState(next);
  }, []);
  const syncNow = useCallback((): Promise<void> => {
    if (syncRunning.current) return syncRunning.current;
    const work = async () => {
      const account = current.current.cloud?.identity;
      if (!account) return;
      if (account.expiresAt * 1000 <= Date.now() || !account.token) throw new Error('Googleで再ログインしてください。未送信の記録は端末に残っています。');
      // Re-save before sending: a failed prior disk write must not be treated as
      // a durable outbox. Never use a cursor from a different account.
      await saveState(current.current);
      while (current.current.cloud?.pending.length) {
        const changes = [] as typeof current.current.cloud.pending;
        for (const item of current.current.cloud.pending.slice(0, 50)) {
          if (JSON.stringify({ changes: [...changes, item] }).length * 3 > 120_000) break;
          changes.push(item);
        }
        if (!changes.length) throw new Error('送信する1件の記録が大きすぎます。内容を確認してください。');
        const result = await client.push(account, changes);
        await rawPersist((s) => acknowledge(s, result.acknowledged));
      }
      let cursor = current.current.cloud!.cursor;
      const all: SyncPage['changes'] = [];
      let more = true;
      while (more) {
        const page = await client.pull(account, cursor);
        if (page.hasMore && page.cursor <= cursor) throw new Error('同期位置を確認できませんでした');
        all.push(...page.changes); cursor = page.cursor; more = page.hasMore;
      }
      await rawPersist((s) => {
        const next = receive(s, { changes: all, cursor, hasMore: false });
        return { ...next, cloud: { ...next.cloud!, lastSynced: new Date().toISOString() } };
      });
      setSyncError(undefined);
    };
    syncRunning.current = work().catch((e: unknown) => {
      setSyncError(e instanceof Error ? e.message : '同期できませんでした'); throw e;
    }).finally(() => { syncRunning.current = undefined; });
    return syncRunning.current;
  }, [client, rawPersist]);
  const cloudId = state.cloud?.identity.id;
  const syncRoomsNow = useCallback((): Promise<void> => {
    if (automaticRunning.current) return automaticRunning.current;
    const work = async () => {
      const account = current.current.roomIdentity;
      if (!ready || !account || !client.configured || transition.current) return;
      const sameAccount = () => current.current.roomIdentity?.id === account.id && !transition.current;
      // Pull the account's records before reconciling room copies. Otherwise a
      // second device could upload stale weights or retract unseen new records.
      if (current.current.cloud) await syncNow();
      if (!sameAccount()) return;
      await synchronizeAutomaticSharing({ client, getState: () => current.current, persist: rawPersist, isCurrent: sameAccount });
      setRoomSyncError(undefined);
    };
    automaticRunning.current = work().catch((e: unknown) => {
      setRoomSyncError(e instanceof Error ? e.message : 'ルームへの自動共有は送信待ちです'); throw e;
    }).finally(() => { automaticRunning.current = undefined; });
    return automaticRunning.current;
  }, [client, rawPersist, ready, syncNow]);
  const roomAccountId = state.roomIdentity?.id;
  // Personal sync materializes fresh arrays even for an unchanged pull. Compare
  // content so the room-sync pull does not schedule itself every second.
  const roomDataRevision = useMemo(() => JSON.stringify([state.sessions, state.sets, state.exercises, state.presets, state.cloud?.mapping]),
    [state.sessions, state.sets, state.exercises, state.presets, state.cloud?.mapping]);
  useEffect(() => {
    if (!ready || !roomAccountId || cloudBusy) return;
    const run = () => { if (NativeAppState.currentState === 'active') void syncRoomsNow().catch(() => {}); };
    const timer = setTimeout(run, 1000);
    const retry = setInterval(run, 30_000);
    const subscription = NativeAppState.addEventListener('change', (value) => { if (value === 'active') run(); });
    return () => { clearTimeout(timer); clearInterval(retry); subscription.remove(); };
  }, [ready, roomAccountId, roomDataRevision, cloudBusy, syncRoomsNow]);
  const pendingCount = state.cloud?.pending.length ?? 0;
  useEffect(() => {
    if (!ready || !cloudId || cloudBusy) return;
    const timer = setTimeout(() => { void syncNow().catch(() => {}); }, 1500);
    const retry = setInterval(() => { void syncNow().catch(() => {}); }, 30_000);
    return () => { clearTimeout(timer); clearInterval(retry); };
  }, [ready, pendingCount, cloudId, cloudBusy, syncNow]);

  const login = async (confirm: (message: string) => Promise<boolean>) => {
    if (transition.current) return false;
    transition.current = true; setCloudBusy(true);
    try {
      await syncRunning.current?.catch(() => {});
      await automaticRunning.current?.catch(() => {});
      const before = current.current;
      if (before.pendingPosts.length) throw new Error('ルームへの送信待ちがあります。ルーム画面で再送してからログインしてください。');
      const google = await googleSignIn();
      if (!google) return false;
      // Logged-in users reauthenticate the same identity; changing accounts must
      // explicitly log out first so no local records silently change ownership.
      let identity;
      try {
        // Existing Google sessions may have expired: the new signed Google
        // credential, not the expired application token, reauthenticates them.
        identity = await client.google(google.idToken, google.name, before.cloud ? undefined : before.roomIdentity);
      } catch (e) {
        if (!(e instanceof RoomsApiError) || e.status !== 409 || before.cloud) throw e;
        // Google is already linked elsewhere. Sign into that identity without
        // merging memberships; guest data still needs the explicit import below.
        identity = await client.google(google.idToken, google.name);
      }
      if (before.cloud && before.cloud.identity.id !== identity.id) throw new Error('先にログアウトしてください');
      const archived = before.cloud ? before : await loadArchive(identity.id);
      let next = archived ?? { ...seedState(), cloud: emptyCloud(identity) };
      next = { ...next, roomIdentity: identity, rooms: [], roomDetails: {}, pendingPosts: [], cloud: { ...next.cloud!, identity } };
      let cursor = next.cloud!.cursor;
      const changes: SyncPage['changes'] = [];
      let more = true;
      while (more) {
        const page = await client.pull(identity, cursor);
        if (page.hasMore && page.cursor <= cursor) throw new Error('同期位置を確認できませんでした');
        changes.push(...page.changes); cursor = page.cursor; more = page.hasMore;
      }
      next = receive(next, { changes, cursor, hasMore: false });
      if (!before.cloud) {
        const hasLocal = before.sessions.length > 0 || before.sets.length > 0;
        const add = await confirm(`端末に記録${before.sessions.length}件、アカウントに記録${next.sessions.length}件があります。端末の種目・プリセット・設定も追加しますか？設定は端末側を採用します。追加しない場合も元データは保管し、設定から戻せます。別の参加者のルーム参加情報は統合しません。${hasLocal ? '' : '初期種目も含みます。'}`);
        await saveGuest(before);
        if (add) {
          // Import through a disjoint ID range; cloud UUIDs never use numeric
          // local IDs as identity. Guest remapping is handled by mergeGuest.
          next = mergeGuest(next, before, randomUUID);
        }
      }
      await rawPersist(() => ({ ...next, loginPromptDismissed: true }));
      setSyncError(undefined);
      return true;
    } finally { transition.current = false; setCloudBusy(false); }
  };
  const logout = async () => {
    if (transition.current) return;
    transition.current = true; setCloudBusy(true);
    try {
      await syncNow();
      await automaticRunning.current;
      if (roomSyncError) throw new Error('ルームへの未送信の変更があります。共有を再試行してからログアウトしてください。');
      if (current.current.cloud?.pending.length || current.current.pendingPosts.length) throw new Error('未送信の記録があります。同期後に再試行してください。');
      await archiveState(current.current);
      await rawPersist(() => ({ ...seedState(), loginPromptDismissed: true }));
      setSyncError(undefined);
    } finally { transition.current = false; setCloudBusy(false); }
  };
  const deleteCloudAccount = async () => {
    if (transition.current || !current.current.cloud) return;
    transition.current = true; setCloudBusy(true);
    try {
      await syncRunning.current;
      await automaticRunning.current?.catch(() => {});
      const before = current.current;
      await client.deleteAccount(before.cloud!.identity);
      const guest = { ...before, cloud: undefined, roomIdentity: undefined, rooms: [], roomDetails: {}, pendingPosts: [], activeRoomId: undefined, automaticRoomReceipts: undefined };
      await rawPersist(() => guest);
      await removeArchive(before.cloud!.identity.id);
      setSyncError(undefined);
    } finally { transition.current = false; setCloudBusy(false); }
  };
  const restoreGuest = async () => {
    if (current.current.cloud || transition.current) throw new Error('ログアウトしてから操作してください。');
    transition.current = true; setCloudBusy(true);
    try {
      const saved = await loadGuest();
      if (!saved) throw new Error('ログイン前の保管データはありません。');
      await saveGuest(current.current);
      await rawPersist(() => ({ ...saved, loginPromptDismissed: true }));
    } finally { transition.current = false; setCloudBusy(false); }
  };
  const update = useCallback(
    (updater: (state: AppState) => AppState) => {
      void persist(updater).catch(() =>
        setError(
          '記録を保存できませんでした。端末の空き容量を確認してください。',
        ),
      );
    },
    [persist],
  );
  const value: AppContextValue = {
    state,
    ready,
    update,
    startWorkout: (presetId) =>
      update((current) => startWorkout(current, presetId)),
    finishWorkout: (sessionId) =>
      update((current) => finishWorkout(current, sessionId)),
    getState,
    persist,
    error,
    cloudBusy, syncError, syncNow, login, logout, deleteCloudAccount, restoreGuest, syncRoomsNow, roomSyncError,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider is missing');
  return value;
}
