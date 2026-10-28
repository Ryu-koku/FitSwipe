import { useCallback, useRef, useState } from 'react';
import { useApp } from './context';
import {
  createRoomsClient,
  enqueueWorkout,
  flushPendingPosts,
  RoomsApiError,
} from './rooms';
import type { RoomDetail } from './types';

const client = createRoomsClient();

export function useRooms() {
  const { state, getState, persist, update } = useApp();
  const [detail, setDetail] = useState<RoomDetail>();
  const [roomId, setRoomId] = useState<string>();
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
      const result = await client.detail(identity(), id);
      update((s) => ({
        ...s,
        roomDetails: { ...s.roomDetails, [id]: result },
      }));
      if (selected.current === id) setDetail(result);
    },
    [identity, update],
  );
  const flush = useCallback(
    () =>
      flushPendingPosts(getState, persist, (entry) =>
        client.post(identity(), entry),
      ),
    [getState, identity, persist],
  );
  const refresh = useCallback(async () => {
    const rooms = await client.list(identity());
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
  }, [flush, identity, load, update]);
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
  }, []);
  const open = useCallback(
    async (id: string) => {
      selected.current = id;
      setRoomId(id);
      setDetail(getState().roomDetails[id]);
      await load(id);
    },
    [getState, load],
  );
  return {
    configured: client.configured,
    busy,
    error,
    notice,
    detail,
    roomId,
    run,
    close,
    refresh,
    open,
    register: async (name: string) => {
      if (getState().roomIdentity) return;
      const account = await client.register(name);
      await persist((s) => ({ ...s, roomIdentity: account }));
      await refresh();
    },
    create: async (name: string) => {
      const room = await client.create(identity(), name);
      await refresh();
      await open(room.id);
    },
    join: async (code: string) => {
      const room = await client.join(identity(), code);
      await refresh();
      await open(room.id);
    },
    share: async (id: string, sessionId: number) => {
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
    leave: async () => {
      const id = selected.current;
      if (!id) return;
      await client.leave(identity(), id);
      await persist((s) => ({
        ...s,
        pendingPosts: s.pendingPosts.filter((p) => p.roomId !== id),
      }));
      close();
      await refresh();
    },
    rename: async (name: string) => {
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
