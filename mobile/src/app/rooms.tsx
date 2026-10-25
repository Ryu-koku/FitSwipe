import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Share, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context';
import { completedSessions, formatWeight } from '../logic';
import {
  Button,
  Card,
  Field,
  IconButton,
  Screen,
  Sheet,
  useTheme,
} from '../ui';
import { useRooms } from '../use-rooms';
import type { RoomPost } from '../types';

export default function RoomsScreen() {
  const { state } = useApp();
  const rooms = useRooms();
  const latest = useRef(rooms);
  useEffect(() => {
    latest.current = rooms;
  }, [rooms]);
  const { styles } = useTheme();
  const params = useLocalSearchParams<{
    shareSessionId?: string;
    code?: string;
  }>();
  const [localDialog, setLocalDialog] = useState<
    'create' | 'join' | 'rename' | 'profile' | 'share' | 'chooseRoom'
  >();
  const [draft, setDraft] = useState(params.code ?? '');
  const [displayName, setDisplayName] = useState('');
  const [consumed, setConsumed] = useState('');
  const incoming = `${params.code ?? ''}:${params.shareSessionId ?? ''}`;
  const dialog =
    localDialog ??
    (rooms.account && rooms.configured && consumed !== incoming
      ? params.code
        ? 'join'
        : params.shareSessionId
          ? 'chooseRoom'
          : undefined
      : undefined);
  const setDialog = (next: typeof localDialog) => {
    setLocalDialog(next);
    setConsumed(incoming);
  };
  const room = state.rooms.find((r) => r.id === rooms.roomId);
  useFocusEffect(
    useCallback(() => {
      const refresh = () => {
        const api = latest.current;
        if (api.configured && api.account && AppState.currentState === 'active')
          void api.run(api.refresh);
      };
      refresh();
      const timer = setInterval(refresh, 30000);
      const listener = AppState.addEventListener('change', refresh);
      const back = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!latest.current.roomId) return false;
        latest.current.close();
        return true;
      });
      return () => {
        clearInterval(timer);
        listener.remove();
        back.remove();
      };
    }, []),
  );
  const confirm = (
    title: string,
    message: string,
    action: () => Promise<void>,
  ) =>
    Alert.alert(title, message, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => void rooms.run(action),
      },
    ]);
  return (
    <Screen
      title={room?.name ?? 'ルーム'}
      onBack={rooms.roomId ? rooms.close : undefined}
      right={
        rooms.account ? (
          <View style={styles.row}>
            <IconButton
              label="更新"
              symbol="↻"
              disabled={rooms.busy}
              onPress={() => void rooms.run(rooms.refresh)}
            />
            <IconButton
              label={room ? 'ルームの操作' : 'プロフィール'}
              symbol="⋯"
              onPress={() => {
                if (!room) {
                  setDialog('profile');
                  return;
                }
                Alert.alert(room.name, 'ルームの操作', [
                  { text: 'キャンセル', style: 'cancel' },
                  {
                    text: '友だちを招待',
                    onPress: () => {
                      void Share.share({
                        message: `${room.name}で一緒にトレーニングしよう\n招待コード：${room.inviteCode}\nfitswipe://room?code=${room.inviteCode}`,
                      }).catch(() => {});
                    },
                  },
                  {
                    text:
                      room.ownerId === rooms.account?.id
                        ? 'ルームを削除'
                        : '退出',
                    style: 'destructive',
                    onPress: () =>
                      confirm(
                        room.ownerId === rooms.account?.id
                          ? 'ルームを削除しますか？'
                          : 'ルームを退出しますか？',
                        room.ownerId === rooms.account?.id
                          ? 'メンバー全員の共有投稿が削除されます。端末の記録は残ります。'
                          : 'このルームへの自分の投稿も削除されます。端末の記録は残ります。',
                        rooms.leave,
                      ),
                  },
                ]);
              }}
            />
          </View>
        ) : undefined
      }
    >
      {rooms.error ? (
        <Card>
          <Text accessibilityRole="alert" style={styles.body}>
            {rooms.error}
          </Text>
        </Card>
      ) : null}
      {rooms.notice ? (
        <Card>
          <Text style={styles.body}>{rooms.notice}</Text>
        </Card>
      ) : null}
      {!rooms.configured ? (
        <Card>
          <Text style={styles.title}>ルーム共有は準備中です</Text>
          <Text style={styles.small}>公開後のアップデートで利用できます。</Text>
        </Card>
      ) : !rooms.account ? (
        <>
          <Text style={styles.title}>友だちと、積み重ねよう</Text>
          <Text style={styles.body}>
            ルームのメンバーとトレーニング記録を共有できます。
          </Text>
          <Field
            label="表示名"
            maxLength={32}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <Button
            label="ルームをはじめる"
            disabled={rooms.busy || !displayName.trim()}
            onPress={() => void rooms.run(() => rooms.register(displayName))}
          />
        </>
      ) : (
        <>
          {state.pendingPosts.length > 0 && (
            <Button
              label={`${state.pendingPosts.length}件の送信待ち · 再送`}
              disabled={rooms.busy}
              secondary
              onPress={() => void rooms.run(rooms.refresh)}
            />
          )}
          {!rooms.roomId ? (
            <>
              <View style={styles.row}>
                <Button
                  label="＋ 作成"
                  secondary
                  disabled={rooms.busy}
                  onPress={() => {
                    setDraft('');
                    setDialog('create');
                  }}
                />
                <Button
                  label="招待から参加"
                  secondary
                  disabled={rooms.busy}
                  onPress={() => {
                    setDraft('');
                    setDialog('join');
                  }}
                />
              </View>
              {!state.rooms.length && (
                <Text style={[styles.small, { marginVertical: 24 }]}>
                  まだルームがありません。ルームを作って友だちを招待しましょう。
                </Text>
              )}
              {state.rooms.map((entry) => (
                <Card key={entry.id} style={{ marginTop: 12 }}>
                  <Text style={[styles.body, { fontWeight: '800' }]}>
                    {entry.name}
                  </Text>
                  <Text style={styles.small}>{entry.memberCount}人</Text>
                  <Button
                    label="開く"
                    secondary
                    disabled={rooms.busy}
                    onPress={() => void rooms.run(() => rooms.open(entry.id))}
                  />
                </Card>
              ))}
            </>
          ) : (
            <>
              <View style={styles.wrap}>
                {rooms.detail?.members.map((member) => (
                  <Text
                    key={member.id}
                    style={[styles.body, { marginRight: 16 }]}
                  >
                    {member.name}
                  </Text>
                ))}
              </View>
              <Button
                label="＋ 記録を共有"
                disabled={rooms.busy}
                secondary
                onPress={() => setDialog('share')}
              />
              {!rooms.detail?.posts.length && (
                <Text style={[styles.small, { marginVertical: 24 }]}>
                  {rooms.busy ? '読み込み中…' : '最初の記録を共有しよう'}
                </Text>
              )}
              {rooms.detail?.posts.map((post) => (
                <SharedWorkoutCard
                  key={post.id}
                  post={post}
                  own={post.userId === rooms.account?.id}
                  onDelete={() =>
                    confirm(
                      '共有した記録を削除しますか？',
                      '端末に保存した記録は残ります。',
                      () => rooms.deletePost(post.id),
                    )
                  }
                />
              ))}
              {rooms.detail?.nextCursor && (
                <Button
                  label="以前の記録を読み込む"
                  secondary
                  disabled={rooms.busy}
                  onPress={() => void rooms.run(rooms.more)}
                />
              )}
            </>
          )}
        </>
      )}
      {(dialog === 'create' || dialog === 'join' || dialog === 'rename') && (
        <Sheet
          title={
            dialog === 'create'
              ? 'ルームを作成'
              : dialog === 'join'
                ? 'ルームに参加'
                : '表示名を変更'
          }
          onClose={() => setDialog(undefined)}
        >
          <Field
            label={
              dialog === 'create'
                ? 'ルーム名'
                : dialog === 'join'
                  ? '招待コード'
                  : '表示名'
            }
            value={draft}
            onChangeText={setDraft}
            maxLength={dialog === 'join' ? 200 : dialog === 'create' ? 40 : 32}
          />
          <Button
            label={dialog === 'join' ? '参加' : '保存'}
            disabled={!draft.trim() || rooms.busy}
            onPress={() => {
              const action =
                dialog === 'create'
                  ? rooms.create
                  : dialog === 'join'
                    ? rooms.join
                    : rooms.rename;
              setDialog(undefined);
              void rooms.run(() => action(draft));
            }}
          />
        </Sheet>
      )}
      {dialog === 'profile' && (
        <Sheet
          title={rooms.account?.name ?? 'プロフィール'}
          onClose={() => setDialog(undefined)}
        >
          <Button
            label="表示名を変更"
            secondary
            onPress={() => {
              setDraft(rooms.account?.name ?? '');
              setDialog('rename');
            }}
          />
          <Button
            label="共有アカウントを削除"
            secondary
            onPress={() => {
              setDialog(undefined);
              confirm(
                '共有アカウントを削除しますか？',
                '自分の投稿と作成したルームを削除します。端末のトレーニング記録は残ります。',
                rooms.deleteAccount,
              );
            }}
          />
        </Sheet>
      )}
      {dialog === 'share' && room && (
        <Sheet title="共有する記録" onClose={() => setDialog(undefined)}>
          {completedSessions(state)
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .map((session) => (
              <Button
                key={session.id}
                label={`${state.presets.find((p) => p.id === session.presetId)?.name ?? 'トレーニング'} · ${new Date(session.startedAt).toLocaleDateString('ja-JP')}`}
                secondary
                disabled={rooms.busy}
                onPress={() => {
                  setDialog(undefined);
                  void rooms.run(() => rooms.share(room.id, session.id));
                }}
              />
            ))}
          {!completedSessions(state).length && (
            <Text style={styles.small}>
              完了したトレーニングはまだありません
            </Text>
          )}
        </Sheet>
      )}
      {dialog === 'chooseRoom' && (
        <Sheet
          title="共有先のルーム"
          onClose={() => {
            setDialog(undefined);
            router.setParams({ shareSessionId: '' });
          }}
        >
          {state.rooms.map((entry) => (
            <Button
              key={entry.id}
              label={entry.name}
              secondary
              onPress={() => {
                setDialog(undefined);
                void rooms.run(() =>
                  rooms.share(entry.id, Number(params.shareSessionId)),
                );
                router.setParams({ shareSessionId: '' });
              }}
            />
          ))}
          {!state.rooms.length && (
            <Text style={styles.small}>
              ルームを作成するか、招待コードで参加してください。
            </Text>
          )}
        </Sheet>
      )}
    </Screen>
  );
}

function SharedWorkoutCard({
  post,
  own,
  onDelete,
}: {
  post: RoomPost;
  own: boolean;
  onDelete: () => void;
}) {
  const { styles } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const workout = post.workout;
  return (
    <Card style={{ marginTop: 14 }}>
      <View style={styles.row}>
        <Text style={[styles.body, { fontWeight: '800' }]}>{post.name}</Text>
        {own && (
          <IconButton
            label="共有した記録を削除"
            symbol="×"
            onPress={onDelete}
          />
        )}
      </View>
      <Text style={styles.small}>
        {new Date(workout.startedAt).toLocaleString('ja-JP')}
      </Text>
      <Text style={styles.title}>{workout.presetName}</Text>
      <Text style={styles.small}>
        {workout.exercises.length}種目 ·{' '}
        {workout.exercises.reduce((sum, e) => sum + e.sets.length, 0)}セット ·{' '}
        {workout.durationMinutes ?? 1}分
      </Text>
      <Button
        label={expanded ? '詳細を閉じる' : 'セットの詳細'}
        secondary
        onPress={() => setExpanded(!expanded)}
      />
      {expanded &&
        workout.exercises.map((exercise, index) => (
          <View key={index} style={{ marginTop: 12 }}>
            <Text style={styles.body}>{exercise.name}</Text>
            {exercise.sets.map((set, i) => (
              <Text key={i} style={styles.small}>
                {set.order}　{set.side ?? ''} {formatWeight(set.weightKg)} ×{' '}
                {set.reps}回
              </Text>
            ))}
          </View>
        ))}
    </Card>
  );
}
