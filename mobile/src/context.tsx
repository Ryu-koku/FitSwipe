import { confirmCommunityTerms, ensureCommunityTerms } from './community-consent';
import { createCoalescingWriter } from './persistence';
import { TERMS_VERSION } from './legal';
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
import { archiveState, exportRawStorage, forgetToken, loadArchive, loadGuest, loadState, removeArchive, resetMainState, saveGuest, saveState, swapGuest } from './storage';
import { AppState } from './types';
import { seedState } from './logic';
import { applyProfile, validateProfile } from './profile';
import { ensureExerciseCatalog } from './exercise-catalog';
import { finishWorkout, startWorkout } from './workout';
import { randomUUID } from 'expo-crypto';
import { createRoomsClient, RoomsApiError } from './rooms';
import { acknowledge, freshAccount, mergeGuest, receive, trackChanges, type SyncPage } from './sync';
import { googleSignIn } from './google-login';
import { AppState as NativeAppState } from 'react-native';
import { migrateLegacyData } from './legacy-data';
import { synchronizeAutomaticSharing } from './automatic-sharing';

type AppContextValue = {
  state: AppState;
  ready: boolean;
  update: (updater: (state: AppState) => AppState) => void;
  startWorkout: (presetId?: string) => void;
  finishWorkout: (sessionId: number) => void;
  getState: () => AppState;
  captureImport: () => (updater: (state: AppState) => AppState) => Promise<void>;
  importData: (updater: (state: AppState) => AppState) => Promise<void>;
  persist: (updater: (state: AppState) => AppState) => Promise<void>;
  error?: string;
  cloudBusy: boolean;
  syncError?: string;
  syncNow: () => Promise<void>;
  login: (confirm: (message: string) => Promise<boolean>, review?: { login: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteCloudAccount: () => Promise<void>;
  restoreGuest: () => Promise<void>;
  updateProfile: (name: string, avatar: string | null) => Promise<void>;
  syncRoomsNow: () => Promise<void>;
  roomSyncError?: string;
  loadFailed: boolean;
  exportRawStorage: () => Promise<string>;
  resetAfterLoadFailure: () => Promise<void>;
};

function upgradeState(state: AppState): AppState {
  const repaired = migrateLegacyData(state);
  const migrated = repaired === state ? state : trackChanges(state, repaired, randomUUID);
  const upgraded = ensureExerciseCatalog(migrated);
  return upgraded === migrated ? migrated : trackChanges(migrated, upgraded, randomUUID);
}

// Cache immutable subtrees: editing one set only rehashes that set and its array.
const contentHashes = new WeakMap<object, number>();
function contentHash(value: unknown): number {
  if (value && typeof value === 'object') {
    const cached = contentHashes.get(value);
    if (cached !== undefined) return cached;
    const text = Array.isArray(value) ? `[${value.map(v => contentHash(v ?? null)).join(',')}]`
      : `{${Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => `${JSON.stringify(k)}:${contentHash(v)}`).join(',')}}`;
    const hash = hashText(text);
    contentHashes.set(value, hash);
    return hash;
  }
  return hashText(JSON.stringify(value) ?? 'undefined');
}
function hashText(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash;
}

class BusyError extends Error {
  constructor() { super('アカウント処理中です。しばらくお待ちください。'); }
}

const Context = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(seedState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const [loadFailed, setLoadFailed] = useState(false);
  const current = useRef(state);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  const transition = useRef(false);
  const importing = useRef(false);
  const accountEpoch = useRef(0);
  const syncRunning = useRef<Promise<void> | undefined>(undefined);
  const automaticRunning = useRef<Promise<void> | undefined>(undefined);
  const [roomSyncError, setRoomSyncError] = useState<string>();
  const roomSyncErrorRef = useRef(roomSyncError);
  const updateRoomSyncError = (value: string | undefined) => { roomSyncErrorRef.current = value; setRoomSyncError(value); };
  const client = useRef(createRoomsClient()).current;
  const writer = useRef<ReturnType<typeof createCoalescingWriter<AppState>> | null>(null);
  if (writer.current === null) writer.current = createCoalescingWriter(saveState);
  const flush = useCallback(() => writer.current!.flush(), []);
  const rawPersist = useCallback((updater: (s: AppState) => AppState) => {
    try {
      // Synchronous evaluation preserves call order without waiting for disk.
      const next = updater(current.current);
      current.current = next;
      setState(next);
      return writer.current!.write(next);
    } catch (error) { return Promise.reject(error); }
  }, []);
  const commitPersist = useCallback(async (updater: (s: AppState) => AppState) => {
    await flush();
    const next = updater(current.current);
    await saveState(next);
    current.current = next;
    setState(next);
  }, [flush]);
  useEffect(() => {
    const subscription = NativeAppState.addEventListener('change', value => {
      if (value === 'background') void flush().catch(() =>
        setError('記録を保存できませんでした。端末の空き容量を確認してください。'));
    });
    return () => subscription.remove();
  }, [flush]);
  const load = useCallback(() => loadState()
    .then(async (saved) => {
      const loaded = upgradeState(saved);
      if (loaded !== saved) await saveState(loaded);
      current.current = loaded;
      setState(loaded);
      setError(undefined);
      setLoadFailed(false);
      setReady(true);
    })
    .catch(() => {
      setLoadFailed(true);
      setError('記録を読み込めませんでした。保存データを書き出してから、初期化して始め直せます。');
    }), []);
  useEffect(() => { void load(); }, [load]);
  const resetAfterLoadFailure = useCallback(async () => {
    await resetMainState();
    await load();
  }, [load]);
  const getState = useCallback(() => current.current, []);
  const persist = useCallback((updater: (state: AppState) => AppState) => {
    if (transition.current) return Promise.reject(new BusyError());
    return rawPersist(s => trackChanges(s, updater(s), randomUUID));
  }, [rawPersist]);
  const syncNow = useCallback((): Promise<void> => {
    if (syncRunning.current) return syncRunning.current;
    if (importing.current) return Promise.resolve();
    const work = async () => {
      await flush();
      const account = current.current.cloud?.identity;
      if (!account) return;
      if (account.expiresAt * 1000 <= Date.now() || !account.token) throw new Error('Googleで再ログインしてください。未送信の記録は端末に残っています。');
      // Re-save before sending: a failed prior disk write must not be treated as
      // a durable outbox. Never use a cursor from a different account.
      await rawPersist(s => s);
      while (current.current.cloud?.pending.length) {
        const changes = [] as typeof current.current.cloud.pending;
        for (const item of current.current.cloud.pending.slice(0, 50)) {
          if (JSON.stringify({ changes: [...changes, item] }).length * 3 > 120_000) break;
          changes.push(item);
        }
        if (!changes.length) throw new Error('送信する1件の記録が大きすぎます。内容を確認してください。');
        // Edits can arrive while a previous network request is in flight.
        await flush();
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
        const next = upgradeState(receive(s, { changes: all, cursor, hasMore: false }));
        return { ...next, cloud: { ...next.cloud!, lastSynced: new Date().toISOString() } };
      });
      setSyncError(undefined);
    };
    syncRunning.current = work().catch((e: unknown) => {
      setSyncError(e instanceof Error ? e.message : '同期できませんでした'); throw e;
    }).finally(() => { syncRunning.current = undefined; });
    return syncRunning.current;
  }, [client, rawPersist, flush]);
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
      updateRoomSyncError(undefined);
    };
    automaticRunning.current = work().catch((e: unknown) => {
      updateRoomSyncError(e instanceof Error ? e.message : 'ルームへの自動共有は送信待ちです'); throw e;
    }).finally(() => { automaticRunning.current = undefined; });
    return automaticRunning.current;
  }, [client, rawPersist, ready, syncNow]);
  const roomAccountId = state.roomIdentity?.id;
  // A pull replaces the rows it echoes back (own pushes) with equal copies.
  // Compare content so the room-sync pull does not schedule itself every second.
  const roomDataRevision = useMemo(() => [state.sessions, state.sets, state.exercises, state.presets, state.cloud?.mapping].map(contentHash).join(':'),
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

  const updateProfile = async (name: string, avatar: string | null) => {
    if (transition.current || importing.current) throw new BusyError();
    const profile = validateProfile(name, avatar);
    transition.current = true; setCloudBusy(true);
    try {
      await syncRunning.current?.catch(() => {});
      await automaticRunning.current?.catch(() => {});
      await flush();
      const before = current.current;
      const account = before.cloud?.identity ?? before.roomIdentity;
      if (account) await ensureCommunityTerms(account);
      else if (!await confirmCommunityTerms()) throw new Error('作成するには利用規約への同意が必要です。');
      const result = account
        ? await client.profile(account, profile.name, profile.avatar)
        : await client.register(profile.name, profile.avatar, TERMS_VERSION);
      // Require the server to acknowledge both fields, including icon removal.
      if (result.name !== profile.name || !Object.hasOwn(result, 'avatar') || result.avatar !== profile.avatar) {
        throw new Error('プロフィールの保存にはサーバーの更新が必要です。');
      }
      const saved = account ? { ...account, ...result } : result as import('./types').RoomIdentity;
      await commitPersist(s => applyProfile(s, saved));
    } finally { transition.current = false; setCloudBusy(false); }
  };

  const login = async (confirm: (message: string) => Promise<boolean>, review?: { login: string; password: string }) => {
    if (transition.current) return false;
    accountEpoch.current += 1;
    transition.current = true; setCloudBusy(true);
    try {
      await syncRunning.current?.catch(() => {});
      await automaticRunning.current?.catch(() => {});
      await flush();
      const before = current.current;
      if (before.pendingPosts.length) throw new Error('ルームへの送信待ちがあります。ルーム画面で再送してからログインしてください。');
      if (!await confirmCommunityTerms()) return false;
      const google = review ? undefined : await googleSignIn();
      if (!review && !google) return false;
      // Logged-in users reauthenticate the same identity; changing accounts must
      // explicitly log out first so no local records silently change ownership.
      let identity;
      try {
        // Existing Google sessions may have expired: the new signed Google
        // credential, not the expired application token, reauthenticates them.
        identity = review ? await client.review(review.login, review.password, TERMS_VERSION)
          : await client.google(google!.idToken, google!.name, before.cloud ? undefined : before.roomIdentity, TERMS_VERSION);
      } catch (e) {
        if (!(e instanceof RoomsApiError) || e.status !== 409 || before.cloud || review) throw e;
        // Google is already linked elsewhere. Sign into that identity without
        // merging memberships; guest data still needs the explicit import below.
        identity = await client.google(google!.idToken, google!.name, undefined, TERMS_VERSION);
      }
      if (before.cloud && before.cloud.identity.id !== identity.id) throw new Error('先にログアウトしてください');
      const archived = before.cloud ? before : await loadArchive(identity.id);
      // Upgrades (catalog, repairs) run only after the pull has brought the
      // account's records, so they cannot add rows the account already has.
      let next = archived ?? freshAccount(seedState(), identity);
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
        const add = await confirm(`端末に記録${before.sessions.length}件、アカウントに記録${next.sessions.length}件があります。端末の種目・プリセット・体組成・設定も追加しますか？設定は端末側を採用します。追加しない場合も元データは保管し、設定から戻せます。別の参加者のルーム参加情報は統合しません。${hasLocal ? '' : '初期種目も含みます。'}`);
        await saveGuest(before);
        if (add) {
          // Import through a disjoint ID range; cloud UUIDs never use numeric
          // local IDs as identity. Guest remapping is handled by mergeGuest.
          next = mergeGuest(next, before, randomUUID);
        }
      }
      await commitPersist(() => ({ ...upgradeState(next), loginPromptDismissed: true }));
      setSyncError(undefined);
      return true;
    } finally { transition.current = false; setCloudBusy(false); }
  };
  const logout = async () => {
    if (transition.current) return;
    accountEpoch.current += 1;
    transition.current = true; setCloudBusy(true);
    try {
      await flush();
      const identity = current.current.cloud?.identity;
      const expired = identity && (!identity.token || identity.expiresAt * 1000 <= Date.now());
      if (expired) {
        await syncRunning.current?.catch(() => {});
        await automaticRunning.current?.catch(() => {});
      } else {
        await syncNow();
        await automaticRunning.current;
        if (roomSyncErrorRef.current) throw new Error('ルームへの未送信の変更があります。共有を再試行してからログアウトしてください。');
        if (current.current.cloud?.pending.length || current.current.pendingPosts.length) throw new Error('未送信の記録があります。同期後に再試行してください。');
      }
      await archiveState(current.current);
      await commitPersist(() => ({ ...seedState(), loginPromptDismissed: true }));
      // Revoke the server session after the local switch is durable; an
      // offline logout still drops the token, and the session expires.
      if (identity && !expired) await client.revokeSession(identity).catch(() => {});
      if (identity) await forgetToken(identity.id);
      setSyncError(undefined);
    } finally { transition.current = false; setCloudBusy(false); }
  };
  const deleteCloudAccount = async () => {
    if (transition.current || !current.current.cloud) return;
    accountEpoch.current += 1;
    transition.current = true; setCloudBusy(true);
    try {
      await syncRunning.current?.catch(() => {});
      await automaticRunning.current?.catch(() => {});
      await flush();
      const before = current.current;
      await client.deleteAccount(before.cloud!.identity);
      const guest = { ...before, loginPromptDismissed: true, cloud: undefined, roomIdentity: undefined, rooms: [], roomDetails: {}, pendingPosts: [], activeRoomId: undefined, automaticRoomReceipts: undefined };
      await commitPersist(() => guest);
      await removeArchive(before.cloud!.identity.id);
      setSyncError(undefined);
    } finally { transition.current = false; setCloudBusy(false); }
  };
  const restoreGuest = async () => {
    if (current.current.cloud || transition.current) throw new Error('ログアウトしてから操作してください。');
    accountEpoch.current += 1;
    transition.current = true; setCloudBusy(true);
    try {
      const saved = await loadGuest();
      if (!saved) throw new Error('ログイン前の保管データはありません。');
      await automaticRunning.current?.catch(() => {});
      await flush();
      const next = { ...upgradeState(saved), loginPromptDismissed: true };
      await swapGuest(current.current, next);
      current.current = next; setState(next);
    } finally { transition.current = false; setCloudBusy(false); }
  };
  const importData = async (updater: (state: AppState) => AppState) => {
    if (transition.current) throw new Error('保存処理中です。しばらくお待ちください。');
    transition.current = true; importing.current = true; setCloudBusy(true);
    try {
      // Drain existing writers, block new sync/account/UI mutations, then commit
      // to disk before publishing. Failed imports never enter the live outbox.
      await syncRunning.current?.catch(() => {});
      await automaticRunning.current?.catch(() => {});
      await commitPersist(s => trackChanges(s, updater(s), randomUUID));
    } finally {
      importing.current = false; transition.current = false; setCloudBusy(false);
    }
  };
  const update = useCallback(
    (updater: (state: AppState) => AppState) => {
      // A later successful save clears an earlier disk error. An edit refused
      // during an account transition is reported as such, not as a full disk.
      void persist(updater).then(() => setError(undefined), (e: unknown) =>
        setError(e instanceof BusyError ? e.message :
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
    importData,
    captureImport: () => {
      if (transition.current) throw new Error('アカウント処理中です。しばらくお待ちください。');
      const epoch = accountEpoch.current;
      return async updater => {
        if (epoch !== accountEpoch.current) throw new Error('アカウントが変更されたため、読み込みを中止しました。');
        await importData(s => {
          if (epoch !== accountEpoch.current) throw new Error('アカウントが変更されたため、読み込みを中止しました。');
          return updater(s);
        });
      };
    },
    error,
    cloudBusy, syncError, syncNow, login, logout, deleteCloudAccount, restoreGuest, updateProfile, syncRoomsNow, roomSyncError,
    loadFailed, exportRawStorage, resetAfterLoadFailure,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider is missing');
  return value;
}
