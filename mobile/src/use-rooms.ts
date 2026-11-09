import { confirmCommunityTerms, ensureCommunityTerms } from './community-consent';
import { TERMS_VERSION, type SafetyStatus, type ReportReason } from './legal';
import { useCallback, useRef, useState } from 'react';
import { useApp } from './context';
import {
  createRoomsClient,
  enqueueWorkout,
  flushPendingPosts,
  RoomsApiError,
} from './rooms';
import type { RoomComparison, RoomDetail } from './types';
import { japanMonth } from './automatic-sharing';
import { roomMonths } from './room-period';

const client = createRoomsClient();

export function useRooms() {
  const { state, getState, persist, update, syncRoomsNow } = useApp();
  const [safetySnapshot, setSafetySnapshot] = useState<{ accountId: string; status: SafetyStatus }>();
  const safety = safetySnapshot?.accountId === state.roomIdentity?.id ? safetySnapshot?.status : undefined;
  const [detail, setDetail] = useState<RoomDetail>();
  const [roomId, setRoomId] = useState<string>();
  const [comparison, setComparison] = useState<RoomComparison | null>();
  const [month, setMonth] = useState(japanMonth());
  const selectedMonth = useRef(month);
  const member = useRef<string | undefined>(undefined);
  const [memberComparison, setMemberComparison] = useState<RoomComparison>();
  const [fetchedAt, setFetchedAt] = useState<string>();
  const [createdRoomId, setCreatedRoomId] = useState<string>();
  const selected = useRef(roomId);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const identity = useCallback(() => {
    const account = getState().roomIdentity;
    if (!account) throw new Error('表示名を登録してください');
    return account;
  }, [getState]);
  const load = useCallback(
    async (id: string) => {
      const account = identity();
      const period = selectedMonth.current;
      const memberId = member.current;
      const [result, compared, memberPage] = await Promise.all([
        client.detail(account, id),
        client.comparison(account, id, period).catch((error: unknown) => {
          // Older servers may not expose the comparison route yet. Keep the
          // room itself available without hiding authentication/network errors.
          if (error instanceof RoomsApiError && error.status === 404) return null;
          throw error;
        }),
        memberId ? client.comparison(account, id, period, undefined, memberId) : Promise.resolve(undefined),
      ]);
      if (getState().roomIdentity?.id !== account.id) return;
      update((s) => ({
        ...s,
        roomDetails: { ...s.roomDetails, [id]: result },
      }));
      if (selected.current === id && selectedMonth.current === period) {
        setDetail(result); setComparison(compared); setFetchedAt(new Date().toISOString());
        if (member.current === memberId) {
          if (memberPage && memberPage.memberId !== memberId) throw new Error('個人別の記録にはサーバーの更新が必要です');
          setMemberComparison(memberPage);
        }
      }
    },
    [identity, update, getState],
  );
  const flush = useCallback(
    () =>
      flushPendingPosts(getState, persist, (entry) =>
        client.post(identity(), entry),
      ),
    [getState, identity, persist],
  );
  const refresh = useCallback(async () => {
    // A queued automatic upload must not prevent reading a room or confirming
    // that sharing was stopped. The provider exposes the retry error separately.
    await syncRoomsNow().catch(() => {});
    const account = identity();
    const rooms = await client.list(account);
    if (getState().roomIdentity?.id !== account.id) return;
    update((s) => ({
      ...s,
      rooms,
      roomDetails: Object.fromEntries(
        Object.entries(s.roomDetails).filter(([id]) =>
          rooms.some((r) => r.id === id),
        ),
      ),
    }));
    if (selected.current && !rooms.some((r) => r.id === selected.current)) {
      selected.current = undefined;
      setRoomId(undefined);
      setDetail(undefined);
    }
    await flush();
    if (selected.current) await load(selected.current);
  }, [flush, identity, load, update, syncRoomsNow, getState]);
  const run = useCallback(async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : '接続できません。通信状況を確認してください',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);
  const close = useCallback(() => {
    selected.current = undefined;
    setRoomId(undefined);
    setDetail(undefined);
    setComparison(undefined);
    member.current = undefined; setMemberComparison(undefined); setFetchedAt(undefined);
  }, []);
  const open = useCallback(
    async (id: string) => {
      selected.current = id;
      selectedMonth.current = japanMonth(); setMonth(selectedMonth.current);
      member.current = undefined; setMemberComparison(undefined); setFetchedAt(undefined);
      setRoomId(id);
      setDetail(getState().roomDetails[id]);
      setComparison(undefined);
      await load(id);
    },
    [getState, load],
  );
  return {
    configured: client.configured,
    safety,
    loadSafety: async () => {
      const account = identity(), result = await client.safety(account);
      if (getState().roomIdentity?.id === account.id) setSafetySnapshot({ accountId: account.id, status: result });
    },
    block: async (targetId: string, enabled: boolean) => {
      const account = identity();
      await client.block(account, targetId, enabled);
      if (getState().roomIdentity?.id !== account.id) return;
      member.current = undefined; setMemberComparison(undefined);
      setDetail(undefined); setComparison(undefined);
      await persist(s => ({ ...s, roomDetails: {} }));
      const result = await client.safety(account);
      if (getState().roomIdentity?.id !== account.id) return;
      setSafetySnapshot({ accountId: account.id, status: result });
      await refresh();
      setNotice(enabled ? 'ブロックしました。お互いのプロフィールと共有記録を非表示にしました。' : 'ブロックを解除しました');
    },
    report: async (targetId: string, reason: ReportReason, details: string, postId?: string) => {
      if (!selected.current) return;
      const receipt = await client.report(identity(), selected.current, targetId, reason, details, postId);
      setNotice(`通報を受け付けました（受付番号 ${receipt.id}）。運営が内容を確認します。`);
    },
    busy,
    error,
    notice,
    detail,
    comparison,
    month,
    fetchedAt,
    memberComparison,
    closeMember: () => { member.current = undefined; setMemberComparison(undefined); },
    openMember: async (memberId: string) => {
      const id = selected.current;
      if (!id) return;
      member.current = memberId; setMemberComparison(undefined);
      await load(id);
    },
    changeMonth: async (period: string) => {
      if (!roomMonths().includes(period) || !selected.current) return;
      selectedMonth.current = period; setMonth(period);
      member.current = undefined; setMemberComparison(undefined); setComparison(undefined); setFetchedAt(undefined);
      await load(selected.current);
    },
    retrySharing: async () => {
      const id = selected.current;
      if (!id) return;
      await persist((s) => ({ ...s, automaticRoomReceipts: { ...s.automaticRoomReceipts,
        [id]: Object.fromEntries(Object.entries(s.automaticRoomReceipts?.[id] ?? {}).filter(([, value]) => !value.startsWith('rejected:'))),
      } }));
      await refresh();
    },
    createdRoomId,
    dismissCreated: () => setCreatedRoomId(undefined),
    roomId,
    run,
    close,
    refresh,
    open,
    register: async (name: string) => {
      if (getState().roomIdentity) return;
      if (!await confirmCommunityTerms()) return;
      const account = await client.register(name, undefined, TERMS_VERSION);
      await persist((s) => ({ ...s, roomIdentity: account }));
      await refresh();
    },
    create: async (name: string, competitive = false) => {
      await ensureCommunityTerms(identity());
      const room = await client.create(identity(), name, competitive);
      await refresh();
      setCreatedRoomId(room.id);
    },
    join: async (code: string) => {
      await ensureCommunityTerms(identity());
      const room = await client.join(identity(), code);
      await refresh();
      await open(room.id);
    },
    share: async (id: string, sessionId: number) => {
      await ensureCommunityTerms(identity());
      await persist((s) => enqueueWorkout(s, id, sessionId));
      try {
        await flush();
        setNotice('ルームに共有しました');
      } catch (error) {
        if (
          error instanceof RoomsApiError &&
          error.status >= 400 &&
          error.status < 500
        )
          throw error;
        setNotice('送信待ちで保存しました。ルームを開くと再送します');
        return;
      }
      if (selected.current) await load(selected.current);
    },
    setSharing: async (enabled: boolean, consentMonth?: string) => {
      if (enabled && consentMonth !== japanMonth()) throw new Error('月が変わりました。共有範囲をもう一度確認してください');
      const id = selected.current;
      if (!id) return;
      if (enabled) await ensureCommunityTerms(identity());
      await client.sharing(identity(), id, enabled, consentMonth);
      // Invalidate per-device receipts when re-enabling so missing copies upload.
      await persist((s) => {
        const receipts = { ...s.automaticRoomReceipts }; delete receipts[id];
        return { ...s, automaticRoomReceipts: receipts };
      });
      await refresh();
    },
    moreComparison: async () => {
      const id = selected.current;
      const memberId = member.current;
      const source = memberId ? memberComparison : comparison;
      if (!id || !source?.nextCursor) return;
      const account = identity();
      const page = await client.comparison(account, id, source.month, source.nextCursor, memberId);
      if (getState().roomIdentity?.id !== account.id || selected.current !== id || selectedMonth.current !== page.month || member.current !== memberId) return;
      if (memberId && page.memberId !== memberId) throw new Error('個人別の記録にはサーバーの更新が必要です');
      const merge = (old: RoomComparison | null | undefined) => old && old.month === page.month
        ? { ...page, posts: [...old.posts, ...page.posts.filter((p) => !old.posts.some((v) => v.id === p.id))] } : page;
      if (memberId) setMemberComparison((old) => merge(old)); else setComparison(merge);
    },
    more: async () => {
      const id = selected.current;
      const cursor = detail?.nextCursor;
      if (!id || !cursor) return;
      const next = await client.more(identity(), id, cursor);
      if (selected.current === id)
        setDetail((old) =>
          old
            ? {
                ...old,
                nextCursor: next.nextCursor,
                posts: [
                  ...old.posts,
                  ...next.posts.filter(
                    (p) => !old.posts.some((item) => item.id === p.id),
                  ),
                ],
              }
            : old,
        );
    },
    deletePost: async (postId: string) => {
      const id = selected.current;
      if (!id) return;
      await client.deletePost(identity(), id, postId);
      await load(id);
    },
    rotateInvite: async () => {
      const id = selected.current;
      if (!id) return;
      await client.rotateInvite(identity(), id);
      await refresh();
    },
    removeMember: async (memberId: string) => {
      const id = selected.current;
      if (!id) return;
      await client.removeMember(identity(), id, memberId);
      await refresh();
    },
    leave: async (deleteRoom = false) => {
      const id = selected.current;
      if (!id) return;
      await (deleteRoom ? client.deleteRoom(identity(), id) : client.leave(identity(), id));
      await persist((s) => ({
        ...s,
        pendingPosts: s.pendingPosts.filter((p) => p.roomId !== id),
      }));
      close();
      await refresh();
    },
    rename: async (name: string) => {
      await ensureCommunityTerms(identity());
      await client.rename(identity(), name);
      await persist((s) => ({
        ...s,
        roomIdentity: s.roomIdentity
          ? { ...s.roomIdentity, name: name.trim() }
          : undefined,
        cloud: s.cloud ? { ...s.cloud, identity: { ...s.cloud.identity, name: name.trim() } } : undefined,
      }));
      await refresh();
    },
    deleteAccount: async () => {
      if (getState().cloud) throw new Error('Google連携済みです。設定の「アカウントを削除」から削除範囲を確認してください。');
      await client.deleteAccount(identity());
      await persist((s) => ({
        ...s,
        roomIdentity: undefined,
        rooms: [],
        pendingPosts: [],
        roomDetails: {},
        activeRoomId: undefined,
      }));
      close();
      setNotice('共有アカウントを削除しました。端末の記録は残ります');
    },
    account: state.roomIdentity,
  };
}
