import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Pressable, Share, Text, View, Animated, Easing } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../context';
import { formatWeight } from '../logic';
import { Button, Card, Field, IconButton, Screen, Sheet, useTheme } from '../ui';
import { useRooms } from '../use-rooms';
import { MemberAvatar, RoomComparisonChart } from '../components/RoomComparisonChart';
import type { Room, RoomPost } from '../types';

export default function RoomsScreen() {
  const { state, roomSyncError } = useApp();
  const rooms = useRooms();
  const latest = useRef(rooms);
  useEffect(() => { latest.current = rooms; }, [rooms]);
  const { styles } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();
  const [dialog, setDialog] = useState<'create' | 'join' | 'profile' | 'rename' | 'invite' | 'manage'>();
  const [draft, setDraft] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [memberId, setMemberId] = useState<string>();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [actionProgress] = useState(() => new Animated.Value(0));
  const consumed = useRef('');
  const room = state.rooms.find((r) => r.id === rooms.roomId);
  const created = state.rooms.find((r) => r.id === rooms.createdRoomId);
  const inviteRoom = dialog === 'invite' ? room : undefined;
  useEffect(() => {
    if (params.code && consumed.current !== params.code && rooms.account) {
      consumed.current = params.code; setDraft(params.code); setDialog('join');
    }
  }, [params.code, rooms.account]);
  useFocusEffect(useCallback(() => {
    const refresh = () => { if (latest.current.configured && latest.current.account && AppState.currentState === 'active') void latest.current.run(latest.current.refresh); };
    refresh();
    const timer = setInterval(refresh, 30000);
    const listener = AppState.addEventListener('change', refresh);
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!latest.current.roomId) return false;
      latest.current.close(); return true;
    });
    return () => { clearInterval(timer); listener.remove(); back.remove(); };
  }, []));
  const startSharing = () => void rooms.run(() => rooms.setSharing(true));
  const toggleActions = () => {
    const next = !actionsOpen;
    setActionsOpen(next);
    Animated.timing(actionProgress, { toValue: next ? 1 : 0, duration: next ? 220 : 170, easing: next ? Easing.out(Easing.cubic) : Easing.in(Easing.quad), useNativeDriver: true }).start();
  };
  const openAction = (action: 'create' | 'join') => {
    setActionsOpen(false);
    Animated.timing(actionProgress, { toValue: 0, duration: 140, useNativeDriver: true }).start();
    setDraft(''); setDialog(action);
  };
  const menu = () => {
    if (!room) { setDialog('profile'); return; }
    Alert.alert(room.name, 'ルームの操作', [
      { text: 'キャンセル' },
      { text: '友だちを招待', onPress: () => setDialog('invite') },
      { text: room.sharingSince ? '自動共有を停止' : '自動共有を始める', onPress: room.sharingSince ? () => Alert.alert('自動共有を停止', 'このルームの自動共有データを取り下げます。端末の記録と以前の手動共有は残ります。', [{ text: 'キャンセル' }, { text: '停止', style: 'destructive', onPress: () => void rooms.run(() => rooms.setSharing(false)) }]) : startSharing },
      { text: '以前の共有を管理', onPress: () => setDialog('manage') },
      { text: room.ownerId === rooms.account?.id ? 'ルームを削除' : '退出', style: 'destructive', onPress: () => Alert.alert('ルームから離れますか？', room.ownerId === rooms.account?.id ? 'ルームと全メンバーの共有データを削除します。端末の記録は残ります。' : 'このルームの自分の共有データを削除します。端末の記録は残ります。', [{ text: 'キャンセル' }, { text: '続ける', style: 'destructive', onPress: () => void rooms.run(rooms.leave) }]) },
    ]);
  };
  return <Screen title={room?.name ?? 'ルーム'} onBack={rooms.roomId ? () => { setMemberId(undefined); rooms.close(); } : undefined}
    right={rooms.account ? <View style={styles.row}><IconButton label={room ? 'ルームの操作' : 'プロフィール'} symbol="⋯" onPress={menu} /></View> : undefined}
    onRefresh={rooms.account ? () => void rooms.run(rooms.refresh) : undefined} refreshing={rooms.busy}>
    {(rooms.error || roomSyncError) && <Card><Text accessibilityRole="alert" style={styles.body}>{rooms.error || roomSyncError}</Text><Button label="再試行" secondary disabled={rooms.busy} onPress={() => void rooms.run(rooms.refresh)} /></Card>}
    {!rooms.configured ? <Card><Text style={styles.body}>ルーム共有は準備中です</Text></Card> : !rooms.account ? <>
      <Text style={styles.title}>友だちと、積み重ねよう</Text><Field label="表示名" value={displayName} onChangeText={setDisplayName} maxLength={32} />
      <Button label="ルームをはじめる" disabled={rooms.busy || !displayName.trim()} onPress={() => void rooms.run(() => rooms.register(displayName))} />
    </> : !room ? <>
      {!state.rooms.length && <Text style={[styles.small, { marginVertical: 24 }]}>ルームを作って友だちを招待しましょう。</Text>}
      {state.rooms.map((entry) => <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={entry.name} disabled={rooms.busy} onPress={() => { setMemberId(undefined); void rooms.run(() => rooms.open(entry.id)); }}>
        <Card style={{ marginTop: 12 }}><View style={styles.row}><View style={{ flexDirection: 'row', paddingRight: 8 }}>{(entry.memberNames?.length ? entry.memberNames : [entry.name]).map((name, i) => <View key={i} style={{ marginLeft: i ? -12 : 0 }}><MemberAvatar name={name} /></View>)}</View><Text style={[styles.body, { flex: 1, fontWeight: '700' }]}>{entry.name}</Text></View></Card>
      </Pressable>)}
    </> : <>
      {!room.sharingSince && <Card><Text style={styles.body}>完了した記録を、メンバーと自動で比較できます。</Text><Text style={styles.small}>今月1日以降の記録と今後の記録を共有します。</Text><Button label="自動共有を始める" disabled={rooms.busy} onPress={startSharing} /></Card>}
      {room.sharingSince && <Text style={[styles.small, { marginBottom: 12 }]}>自動共有中 · 種目・重量・回数まで共有</Text>}
      {rooms.comparison ? <Card><RoomComparisonChart comparison={rooms.comparison} ownId={rooms.account.id} onMember={setMemberId} /></Card> : <Text style={styles.small}>比較データを読み込み中…</Text>}
    </>}
    {rooms.configured && !!rooms.account && !room && <View pointerEvents="box-none" style={{ position: 'absolute', right: 20, bottom: insets.bottom + 84, alignItems: 'flex-end' }}>
      <Animated.View pointerEvents={actionsOpen ? 'auto' : 'none'} style={{ opacity: actionProgress, transform: [{ translateY: actionProgress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: actionProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }], marginBottom: 12, gap: 10 }}>
        <Button label="ルームを作成" secondary onPress={() => openAction('create')} />
        <Button label="ルームに参加" secondary onPress={() => openAction('join')} />
      </Animated.View>
      <Pressable accessibilityRole="button" accessibilityLabel={actionsOpen ? 'ルーム操作を閉じる' : 'ルーム操作を開く'} accessibilityState={{ expanded: actionsOpen }} disabled={rooms.busy} onPress={toggleActions} style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: styles.title.color as string, alignItems: 'center', justifyContent: 'center', elevation: 6 }}>
        <Animated.Text style={{ color: '#fff', fontSize: 34, lineHeight: 40, transform: [{ rotate: actionProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>＋</Animated.Text>
      </Pressable>
    </View>}
    {(dialog === 'create' || dialog === 'join' || dialog === 'rename') && <Sheet title={dialog === 'create' ? 'ルームを作成' : dialog === 'join' ? 'ルームに参加' : '表示名を変更'} onClose={() => setDialog(undefined)}>
      <Field label={dialog === 'create' ? 'ルーム名（任意）' : dialog === 'join' ? '招待コード・参加リンク' : '表示名'} value={draft} onChangeText={setDraft} maxLength={dialog === 'join' ? 200 : dialog === 'create' ? 40 : 32} />
       <Button label={dialog === 'create' ? '作成して招待' : dialog === 'join' ? '参加' : '保存'} disabled={rooms.busy || (dialog !== 'create' && !draft.trim())} onPress={() => {
        const action = dialog === 'create' ? rooms.create : dialog === 'join' ? rooms.join : rooms.rename;
        const value = dialog === 'create' && !draft.trim() ? '筋トレ仲間' : draft;
        setDialog(undefined); void rooms.run(() => action(value));
      }} />
    </Sheet>}
    {created && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: styles.title.color === '#fff' ? '#000' : '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={[styles.title, { textAlign: 'center', marginBottom: 12 }]}>ルームを作成しました</Text>
      <Text style={[styles.body, { textAlign: 'center', marginBottom: 24 }]}>{created.name} に友だちを招待しましょう</Text>
      <View accessible accessibilityLabel={`参加用QRコード。招待コード ${created.inviteCode}`} style={{ alignItems: 'center', padding: 22, backgroundColor: '#fff', borderRadius: 22 }}><QRCode value={`fitswipe://room?code=${encodeURIComponent(created.inviteCode)}`} size={260} quietZone={12} /></View>
      <Text selectable style={[styles.body, { marginTop: 16, marginBottom: 18 }]}>{created.inviteCode}</Text>
      <Button label="招待を共有" onPress={() => setShareOpen(true)} />
      <Button label="ルームへ" secondary onPress={() => rooms.dismissCreated()} />
    </View>}
    {inviteRoom && <InviteSheet room={inviteRoom} onClose={() => setDialog(undefined)} />}
    {shareOpen && created && <ShareInviteSheet room={created} onClose={() => setShareOpen(false)} />}
    {dialog === 'profile' && <Sheet title={rooms.account?.name ?? 'プロフィール'} onClose={() => setDialog(undefined)}>
      <Button label="表示名を変更" secondary onPress={() => { setDraft(rooms.account?.name ?? ''); setDialog('rename'); }} />
      <Button label="共有アカウントを削除" secondary onPress={() => Alert.alert('共有アカウントを削除', '共有した記録を削除します。端末の記録は残ります。', [{ text: 'キャンセル' }, { text: '削除', style: 'destructive', onPress: () => { setDialog(undefined); void rooms.run(rooms.deleteAccount); } }])} />
    </Sheet>}
    {memberId && rooms.comparison && <Sheet title={`${rooms.comparison.rankings.find((r) => r.id === memberId)?.name ?? 'メンバー'}の今月の記録`} onClose={() => setMemberId(undefined)}>
      {rooms.comparison.posts.filter((p) => p.userId === memberId).map((post) => <WorkoutDetails key={post.id} post={post} />)}
      {rooms.comparison.nextCursor ? <Button label="以前の記録を読み込む" disabled={rooms.busy} onPress={() => void rooms.run(rooms.moreComparison)} /> : !rooms.comparison.posts.some((p) => p.userId === memberId) && <Text style={styles.small}>今月の共有記録はありません。</Text>}
    </Sheet>}
    {dialog === 'manage' && <Sheet title="以前の手動共有" onClose={() => setDialog(undefined)}>
      <Text style={styles.small}>自動共有とは別に、以前に共有した記録です。</Text>
      {rooms.detail?.posts.filter((p) => p.userId === rooms.account?.id).map((post) => <View key={post.id}><WorkoutDetails post={post} /><Button label="この共有を削除" secondary onPress={() => Alert.alert('共有を削除', '端末の記録は残ります。同じ記録を自動共有中の場合、その自動共有分は残ります。', [{ text: 'キャンセル' }, { text: '削除', style: 'destructive', onPress: () => void rooms.run(() => rooms.deletePost(post.id)) }])} /></View>)}
      {rooms.detail?.nextCursor && <Button label="以前の共有を読み込む" disabled={rooms.busy} onPress={() => void rooms.run(rooms.more)} />}
    </Sheet>}
  </Screen>;
}

function InviteSheet({ room, onClose }: { room: Room; onClose: () => void }) {
  const { styles } = useTheme();
  const [error, setError] = useState('');
  const url = `fitswipe://room?code=${encodeURIComponent(room.inviteCode)}`;
  return <Sheet title="友だちを招待" onClose={onClose}>
    <Text style={[styles.title, { textAlign: 'center', marginBottom: 20 }]}>{room.name}</Text>
    <View accessible accessibilityLabel={`参加用QRコード。招待コード ${room.inviteCode}`} style={{ alignItems: 'center', padding: 20, backgroundColor: '#fff', borderRadius: 18 }}><QRCode value={url} size={200} quietZone={12} /></View>
    <Text selectable style={[styles.body, { textAlign: 'center', marginTop: 12 }]}>{room.inviteCode}</Text>
    <Text style={styles.small}>FitSwipeをインストールした端末で読み取るか、招待コードを入力して参加できます。</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.small}>{error}</Text>}
    <Button label="招待を共有" onPress={() => { void Share.share({ message: `${room.name}で一緒にトレーニングしよう\n招待コード：${room.inviteCode}\n${url}` }).catch(() => setError('共有できませんでした。招待コードをコピーして送ってください。')); }} />
    <Button label="閉じる" secondary onPress={onClose} />
  </Sheet>;
}

function ShareInviteSheet({ room, onClose }: { room: Room; onClose: () => void }) {
  const { styles } = useTheme();
  const url = `fitswipe://room?code=${encodeURIComponent(room.inviteCode)}`;
  const [error, setError] = useState('');
  return <Sheet title="招待を共有" onClose={onClose}>
    <Text style={styles.body}>招待リンクを友だちに送ると、FitSwipeでこのルームに参加できます。</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.small}>{error}</Text>}
    <Button label="共有先を選ぶ" onPress={() => { void Share.share({ message: `${room.name}で一緒にトレーニングしよう\n招待コード：${room.inviteCode}\n${url}` }).catch(() => setError('共有できませんでした。招待コードをコピーして送ってください。')); }} />
  </Sheet>;
}

function WorkoutDetails({ post }: { post: RoomPost }) {
  const { styles } = useTheme();
  return <Card><Text style={[styles.body, { fontWeight: '700' }]}>{post.workout.presetName}</Text>
    <Text style={styles.small}>{new Date(post.workout.startedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</Text>
    {post.workout.exercises.map((exercise, i) => <View key={i} style={{ marginTop: 12 }}><Text style={styles.body}>{exercise.name}</Text>{exercise.sets.map((set, j) => <Text key={j} style={styles.small}>{set.order}　{set.side ?? ''} {formatWeight(set.weightKg)} × {set.reps}回</Text>)}</View>)}
  </Card>;
}
