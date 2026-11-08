import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Pressable, Share, Text, View, Animated, Easing, useWindowDimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
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
  const { colors, styles } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const inviteQrSize = Math.max(96, Math.min(220, windowWidth - 112, windowHeight - insets.top - insets.bottom - 500));
  const params = useLocalSearchParams<{ code?: string }>();
  const [dialog, setDialog] = useState<'create' | 'join' | 'profile' | 'rename' | 'invite' | 'manage'>();
  const [draft, setDraft] = useState('');
  const [competitive, setCompetitive] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [memberId, setMemberId] = useState<string>();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [actionProgress] = useState(() => new Animated.Value(0));
  const consumed = useRef('');
  const room = state.rooms.find((r) => r.id === rooms.roomId);
  const mockRoom = __DEV__ && (room?.name === 'まめ' || room?.name === 'まめのルーム');
  const displayedComparison = rooms.comparison;
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
    setDraft(''); setCompetitive(true); setDialog(action);
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
    onRefresh={rooms.account ? () => {
      setPullRefreshing(true);
      void rooms.run(rooms.refresh).finally(() => setPullRefreshing(false));
    } : undefined} refreshing={pullRefreshing}
    overlay={rooms.configured && !!rooms.account && !room ? <View pointerEvents="box-none" style={{ position: 'absolute', right: 20, bottom: 20, alignItems: 'flex-end' }}>
      <Animated.View pointerEvents={actionsOpen ? 'auto' : 'none'} style={{ opacity: actionProgress, transform: [{ translateY: actionProgress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: actionProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }], marginBottom: 12, gap: 10 }}>
        <Button label="ルームを作成" secondary onPress={() => openAction('create')} />
        <Button label="ルームに参加" secondary onPress={() => openAction('join')} />
      </Animated.View>
      <Pressable accessibilityRole="button" accessibilityLabel={actionsOpen ? 'ルーム操作を閉じる' : 'ルーム操作を開く'} accessibilityState={{ expanded: actionsOpen }} disabled={rooms.busy} onPress={toggleActions} style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 }}>
        <Animated.Text style={{ color: '#fff', fontSize: 34, lineHeight: 40, transform: [{ rotate: actionProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>＋</Animated.Text>
      </Pressable>
    </View> : undefined}>
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
      {room.sharingSince && <Text style={[styles.small, { marginBottom: 12 }]}>自動共有中 · 種目・重量・回数まで共有</Text>}
      {!room.sharingSince && <Text style={[styles.small, { marginBottom: 12 }]}>自動共有はOFFです。共有するには右上のメニューで有効にしてください。</Text>}
      {displayedComparison ? <Card><RoomComparisonChart comparison={displayedComparison} ownId={rooms.account.id} onMember={setMemberId} enableMock={mockRoom} competitive={room.competitive !== false} /></Card> : <Text style={styles.small}>{rooms.error ? '比較データを取得できませんでした。' : displayedComparison === null ? 'このサーバーは比較データに対応していません。' : '比較データを読み込み中…'}</Text>}
    </>}
    {(dialog === 'create' || dialog === 'join' || dialog === 'rename') && <Sheet title={dialog === 'create' ? '新しいルーム' : dialog === 'join' ? 'ルームに参加' : '表示名を変更'} onClose={() => setDialog(undefined)} popup={dialog === 'create'}>
      <Field autoFocus label={dialog === 'create' ? undefined : dialog === 'join' ? '招待コード・参加リンク' : '表示名'} placeholder={dialog === 'create' ? 'ルーム名（任意）' : undefined} value={draft} onChangeText={setDraft} maxLength={dialog === 'join' ? 200 : dialog === 'create' ? 40 : 32} />
      {dialog === 'create' && <View style={{ marginTop: 20 }}>
        <Text style={styles.small}>ルームの種類</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          {([['競い合う', true], ['競い合わない', false]] as const).map(([label, value]) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: competitive === value }} onPress={() => setCompetitive(value)} style={{ flex: 1, padding: 12, borderRadius: 16, borderWidth: 2, borderColor: competitive === value ? colors.primary : colors.line, backgroundColor: competitive === value ? colors.soft : colors.surface, opacity: competitive === value ? 1 : 0.72 }}>
            <View style={{ height: 82, borderRadius: 10, backgroundColor: colors.bg, padding: 9, overflow: 'hidden' }}>
              {value ? <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, marginRight: 6 }} /><View style={{ height: 7, width: '45%', borderRadius: 4, backgroundColor: colors.line }} /></View>
                {[0, 1, 2].map((rank) => <View key={rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}><Text style={{ color: colors.primary, fontSize: 9, fontWeight: '900', width: 10 }}>{rank + 1}</Text><View style={{ height: 7, flex: 1, borderRadius: 4, backgroundColor: rank === 0 ? colors.primary : colors.line, opacity: rank === 0 ? 0.9 : 0.65 }} /><View style={{ width: 18, height: 7, borderRadius: 4, backgroundColor: colors.line }} /></View>)}
              </> : <>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 48, gap: 5 }}>{[22, 36, 28, 44, 32, 24].map((height, index) => <View key={index} style={{ width: 9, height, borderRadius: 5, backgroundColor: index === 3 ? colors.primary : colors.line, opacity: index === 3 ? 1 : 0.7 }} />)}</View>
                <View style={{ height: 6, width: '55%', alignSelf: 'center', borderRadius: 4, backgroundColor: colors.line }} />
              </>}
            </View>
            <Text style={[styles.body, { fontWeight: '800', textAlign: 'center', marginTop: 9 }]}>{label}</Text>
            <View style={{ alignSelf: 'center', marginTop: 7, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: competitive === value ? colors.primary : colors.muted, alignItems: 'center', justifyContent: 'center' }}>{competitive === value && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }} />}</View>
          </Pressable>)}
        </View>
      </View>}
       <View style={{ marginTop: 16 }}><Button label={dialog === 'create' ? '作成して招待' : dialog === 'join' ? '参加' : '保存'} disabled={rooms.busy || (dialog !== 'create' && !draft.trim())} onPress={() => {
        const action = dialog === 'create' ? (name: string) => rooms.create(name, competitive) : dialog === 'join' ? rooms.join : rooms.rename;
        const value = dialog === 'create' && !draft.trim() ? '筋トレ仲間' : draft;
        setDialog(undefined); void rooms.run(() => action(value));
       }} /></View>
    </Sheet>}
    <Modal visible={!!created} transparent animationType="fade" onRequestClose={() => rooms.dismissCreated()}>
    {created && <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
      <Pressable accessibilityLabel="招待ポップアップを閉じる" onPress={() => rooms.dismissCreated()} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ width: '100%', maxWidth: 440, maxHeight: '100%', backgroundColor: colors.bg, borderRadius: 28, overflow: 'hidden', padding: 24, alignItems: 'center' }}>
        <View accessible={false} style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.primary, fontSize: 34, fontWeight: '800' }}>{Array.from(created.name.trim())[0] ?? '?'}</Text>
        </View>
        <Text style={[styles.title, { textAlign: 'center', marginTop: 14, marginBottom: 20 }]}>{created.name}</Text>
        <View accessible accessibilityLabel={`参加用QRコード。招待コード ${created.inviteCode}`} style={{ alignItems: 'center', padding: 8, backgroundColor: '#fff', borderRadius: 18 }}><QRCode value={`fitswipe://room?code=${encodeURIComponent(created.inviteCode)}`} size={inviteQrSize} quietZone={4} /></View>
        <View style={{ width: '100%', maxWidth: 420, marginTop: 20 }}>
          <Button label="招待を共有" onPress={() => { void Share.share({ message: `${created.name}で一緒にトレーニングしよう\n招待コード：${created.inviteCode}\nfitswipe://room?code=${encodeURIComponent(created.inviteCode)}` }); }} />
        </View>
      </View>
    </View>}
    </Modal>
    {inviteRoom && <InviteSheet room={inviteRoom} onClose={() => setDialog(undefined)} />}
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

function WorkoutDetails({ post }: { post: RoomPost }) {
  const { styles } = useTheme();
  return <Card><Text style={[styles.body, { fontWeight: '700' }]}>{post.workout.presetName}</Text>
    <Text style={styles.small}>{new Date(post.workout.startedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</Text>
    {post.workout.exercises.map((exercise, i) => <View key={i} style={{ marginTop: 12 }}><Text style={styles.body}>{exercise.name}</Text>{exercise.sets.map((set, j) => <Text key={j} style={styles.small}>{set.order}　{set.side ?? ''} {formatWeight(set.weightKg)} × {set.reps}回</Text>)}</View>)}
  </Card>;
}
