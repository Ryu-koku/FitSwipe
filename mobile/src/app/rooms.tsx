import { canCreateRoom } from '../premium';
import { usePremium } from '../premium-context';
import { ProfileEditor } from '../components/ProfileEditor';
import { AppIcon } from '../components/AppIcon';
import { RoomsApiError } from '../rooms';
import { LegalLinks } from '../components/LegalLinks';
import { reportReasons, type ReportReason } from '../legal';
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
import { japanMonth } from '../automatic-sharing';
import { monthLabel, roomMonths } from '../room-period';
import { RoomSharingPanel } from '../components/RoomSharingPanel';
import type { Room, RoomPost } from '../types';

export default function RoomsScreen() {
  const { state, roomSyncError } = useApp();
  const rooms = useRooms();
  const { premium, openPaywall } = usePremium();
  const latest = useRef(rooms);
  useEffect(() => { latest.current = rooms; }, [rooms]);
  const { colors, styles } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const inviteQrSize = Math.max(96, Math.min(220, windowWidth - 112, windowHeight - insets.top - insets.bottom - 500));
  const params = useLocalSearchParams<{ code?: string }>();
  const [dialog, setDialog] = useState<'create' | 'join' | 'profile' | 'rename' | 'invite' | 'manage' | 'actions' | 'members' | 'consent' | 'rules' | 'report' | 'blocked' | 'editProfile'>();
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string; postId?: string }>();
  const [reportReason, setReportReason] = useState<ReportReason>('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [draft, setDraft] = useState('');
  const [competitive, setCompetitive] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [consentMonth, setConsentMonth] = useState(japanMonth());
  const [consentError, setConsentError] = useState('');
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
  const startSharing = () => { setConsentMonth(japanMonth()); setConsentError(''); setDialog('consent'); };
  const months = roomMonths();
  const monthIndex = months.indexOf(rooms.month);
  const openMember = (id: string) => {
    if (rooms.busy) return;
    setMemberId(id); void rooms.run(() => rooms.openMember(id));
  };
  const toggleActions = () => {
    const next = !actionsOpen;
    setActionsOpen(next);
    Animated.timing(actionProgress, { toValue: next ? 1 : 0, duration: next ? 220 : 170, easing: next ? Easing.out(Easing.cubic) : Easing.in(Easing.quad), useNativeDriver: true }).start();
  };
  const openAction = (action: 'create' | 'join') => {
    if (action === 'create' && rooms.account && !canCreateRoom(state.rooms, rooms.account.id, premium)) {
      setActionsOpen(false);
      openPaywall('無料プランで作成できるルームは2つまでです。');
      return;
    }
    setActionsOpen(false);
    Animated.timing(actionProgress, { toValue: 0, duration: 140, useNativeDriver: true }).start();
    setDraft(''); setCompetitive(false); setDialog(action);
  };
  const startReport = (id: string, name: string, postId?: string) => {
    setMemberId(undefined); rooms.closeMember();
    setReportTarget({ id, name, postId }); setReportReason('harassment'); setReportDetails(''); setDialog('report');
  };
  const confirmBlock = (id: string) => Alert.alert('この人をブロックしますか？', '同じルームでも、お互いのプロフィールと共有記録を一覧・比較から非表示にします。ルームの所属は変わりません。解除はプロフィールから行えます。', [
    { text: 'キャンセル', style: 'cancel' }, { text: 'ブロック', style: 'destructive', onPress: () => {
      setMemberId(undefined); rooms.closeMember(); setDialog(undefined); void rooms.run(() => rooms.block(id, true));
    } },
  ]);
  const menu = () => setDialog(room ? 'actions' : 'profile');
  const confirmLeave = (deleteRoom = false) => {
    if (!room) return;
    const owner = room.ownerId === rooms.account?.id;
    Alert.alert(deleteRoom ? 'ルーム全体を削除しますか？' : 'ルームを退出しますか？', deleteRoom
      ? 'ルームと全メンバーの共有データを削除します。端末の記録は残ります。'
      : `${owner ? '参加が最も早い残りのメンバーへ管理を引き継ぎます。他にメンバーがいない場合はルームを削除します。' : ''}自分の共有データを削除します。端末の記録は残ります。`,
    [{ text: 'キャンセル', style: 'cancel' }, { text: deleteRoom ? '全体を削除' : '退出', style: 'destructive', onPress: () => {
      setDialog(undefined); void rooms.run(() => rooms.leave(deleteRoom));
    } }]);
  };
  return <Screen title={room?.name ?? 'ルーム'} onBack={rooms.roomId ? () => { setMemberId(undefined); rooms.close(); } : undefined}
    right={rooms.account ? <View style={styles.row}><IconButton label="プロフィールを編集" icon={<AppIcon name="profile" color={colors.primary} />} onPress={() => setDialog('editProfile')} /><IconButton label={room ? 'ルームの操作' : 'アカウントの操作'} symbol="⋯" onPress={menu} /></View> : undefined}
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
    {!!rooms.notice && <Card><Text accessibilityLiveRegion="polite" style={styles.body}>{rooms.notice}</Text></Card>}
    {(rooms.error || roomSyncError) && <Card><Text accessibilityRole="alert" style={styles.body}>{rooms.error || roomSyncError}</Text><Button label="再試行" secondary disabled={rooms.busy} onPress={() => void rooms.run(rooms.refresh)} /></Card>}
    {!rooms.configured ? <Card><Text style={styles.body}>ルーム共有は準備中です</Text></Card> : !rooms.account ? <>
      <Text style={styles.title}>友だちと、積み重ねよう</Text><Field label="表示名" value={displayName} onChangeText={setDisplayName} maxLength={32} />
      <LegalLinks />
      <Button label="ルームをはじめる" disabled={rooms.busy || !displayName.trim()} onPress={() => void rooms.run(() => rooms.register(displayName))} />
    </> : !room ? <>
      {!state.rooms.length && <Text style={[styles.small, { marginVertical: 24 }]}>ルームを作って友だちを招待しましょう。</Text>}
      {state.rooms.map((entry) => <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={entry.name} disabled={rooms.busy} onPress={() => { setMemberId(undefined); void rooms.run(() => rooms.open(entry.id)); }}>
        <Card style={{ marginTop: 12 }}><View style={styles.row}><View style={{ flexDirection: 'row', paddingRight: 8 }}>{(entry.memberProfiles?.length ? entry.memberProfiles : (entry.memberNames?.length ? entry.memberNames : [entry.name]).map(name => ({ name, avatar: null }))).map((member, i) => <View key={i} style={{ marginLeft: i ? -12 : 0 }}><MemberAvatar name={member.name} avatar={member.avatar} /></View>)}</View><Text style={[styles.body, { flex: 1, fontWeight: '700' }]}>{entry.name}</Text></View></Card>
      </Pressable>)}
    </> : <>
      <RoomSharingPanel key={room.id} room={room} busy={rooms.busy} onStart={startSharing}
        onRetry={() => void rooms.run(rooms.retrySharing)} />
      <Text style={styles.small}>{room.competitive === false ? '順位なし · 仲間の活動を見守るルーム' : '順位あり · 今月の共有セット数を比べるルーム'}</Text>
      <View style={[styles.row, { justifyContent: 'space-between', marginVertical: 8 }]}>
        <Button label="前の月" secondary disabled={rooms.busy || monthIndex < 0 || monthIndex >= months.length - 1}
          onPress={() => { setMemberId(undefined); void rooms.run(() => rooms.changeMonth(months[monthIndex + 1])); }} />
        <Text style={styles.body}>{monthLabel(rooms.month)}</Text>
        <Button label="次の月" secondary disabled={rooms.busy || monthIndex <= 0}
          onPress={() => { setMemberId(undefined); void rooms.run(() => rooms.changeMonth(months[monthIndex - 1])); }} />
      </View>
      {rooms.fetchedAt && <Text style={styles.small}>表示の取得：{new Date(rooms.fetchedAt).toLocaleString('ja-JP')}{rooms.error ? ' · 更新できていない可能性があります' : ''}</Text>}
      <Text style={styles.small}>0セットは「この月の共有されたセットが0」の意味です。未共有・未反映の場合もあり、運動していないとは限りません。</Text>
      <Button label="共有と集計のルール" secondary onPress={() => setDialog('rules')} />
      {displayedComparison ? <Card><RoomComparisonChart comparison={displayedComparison} ownId={rooms.account.id} onMember={openMember} enableMock={mockRoom} competitive={room.competitive !== false} /></Card> : <Text style={styles.small}>{rooms.error ? '比較データを取得できませんでした。' : displayedComparison === null ? 'このサーバーは比較データに対応していません。' : '比較データを読み込み中…'}</Text>}
      {room.competitive === false && displayedComparison && <Card>
        <Text style={styles.sectionTitle}>この月の最近の活動</Text>
        {displayedComparison.posts.slice(0, 5).map((post) => <Pressable key={post.id} accessibilityRole="button"
          accessibilityLabel={`${post.name}の${post.workout.presetName}。記録を見る`} disabled={rooms.busy}
          onPress={() => openMember(post.userId)} style={{ paddingVertical: 12 }}>
          <Text style={[styles.body, { fontWeight: '700' }]}>{post.name} · {post.workout.presetName}</Text>
          <Text style={styles.small}>{new Date(post.workout.startedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</Text>
        </Pressable>)}
        {!displayedComparison.posts.length && <Text style={styles.small}>この月に共有された活動はまだありません。</Text>}
      </Card>}
    </>}
    {dialog === 'consent' && room && <Sheet title="共有範囲を確認" onClose={() => setDialog(undefined)}>
      <Text style={styles.title}>{room.name}</Text>
      <Text style={[styles.body, { marginTop: 16 }]}>{monthLabel(consentMonth)}1日（日本時間）以降の完了したトレーニングを共有します。今月の過去記録も対象です。</Text>
      <Text style={[styles.body, { marginTop: 16 }]}>共有する内容：メニュー名・種目名・重量・回数・左右・セット番号・開始／終了日時。</Text>
      <Text style={[styles.body, { marginTop: 16 }]}>このルームの全メンバーが閲覧できます。後から参加した人にも公開されます。順位なしのルームでも詳細は公開されます。</Text>
      <Text style={[styles.body, { marginTop: 16 }]}>以後の記録と編集・削除も自動で反映します。保存は当月と過去11か月、あなたの自動共有はこのルームで最大1,000件です。</Text>
      <Text style={[styles.body, { marginTop: 16 }]}>停止すると、このルームの自動共有分を取り下げます。個人記録と以前の手動共有は残ります。停止後に再開すると、再開した月からが対象になります。</Text>
      {!!consentError && <Text accessibilityRole="alert" style={[styles.body, { color: colors.red, marginTop: 16 }]}>{consentError}</Text>}
      <Button label="この範囲で自動共有を始める" disabled={rooms.busy} onPress={() => {
        void rooms.run(async () => {
          setConsentError('');
          try {
            await rooms.setSharing(true, consentMonth);
            setDialog(undefined);
          } catch (error) {
            setConsentMonth(japanMonth());
            setConsentError(error instanceof Error ? error.message : '開始できませんでした。もう一度お試しください。');
          }
        });
      }} />
      <Button label="今は見るだけ" secondary disabled={rooms.busy} onPress={() => setDialog(undefined)} />
    </Sheet>}
    {dialog === 'rules' && <Sheet title="共有と集計のルール" onClose={() => setDialog(undefined)}>
      <Text style={styles.body}>日本時間の月ごとに、トレーニングを開始した月へ集計します。月末に開始し翌月に終えた記録は前月分です。</Text>
      <Text style={[styles.body, { marginTop: 16 }]}>完了して回数が1回以上の通常セットを1セットと数えます。左右別は同じセット番号の左右が揃って1セット。片側だけなら0セットです。同じセット数は同順位です。</Text>
      <Text style={[styles.body, { marginTop: 16 }]}>数値は現在共有されている記録の集計です。記録の修正・削除、共有停止、退出で過去月も変わります。確定した競技成績や筋力・努力の優劣を示すものではありません。</Text>
      <Text style={[styles.body, { marginTop: 16 }]}>「競い合わない」は順位を表示しない設定です。セット数と記録の詳細は閲覧できます。他の人の共有設定や通信状態は公開しません。</Text>
      <Text style={[styles.body, { marginTop: 16 }]}>自動共有は当月を含む12か月保存し、月を切り替えて振り返れます。最大100人。各メンバーは各ルームに1,000件まで自動共有できます。1人1日2記録を12か月残せる容量です。以前の手動共有は別管理です。</Text>
      <Button label="閉じる" onPress={() => setDialog(undefined)} />
    </Sheet>}
    {dialog === 'actions' && room && <Sheet title="ルームの操作" onClose={() => setDialog(undefined)}>
      <Button label="メンバー・通報・ブロック" secondary onPress={() => setDialog('members')} />
      <Button label="ルーム名を通報" secondary disabled={rooms.busy || room.ownerId === rooms.account?.id} onPress={() => startReport(room.ownerId, 'ルームの作成者')} />
      <LegalLinks />
      <Button label="友だちを招待" secondary onPress={() => setDialog('invite')} />
      {room.ownerId === rooms.account?.id && <>
        <Button label="招待コードを更新" secondary disabled={rooms.busy} onPress={() => Alert.alert('招待コードを更新しますか？', '以前のコードとQRコードは使えなくなります。参加済みのメンバーはそのままです。', [
          { text: 'キャンセル', style: 'cancel' }, { text: '更新', onPress: () => { setDialog(undefined); void rooms.run(async () => { await rooms.rotateInvite(); setDialog('invite'); }); } },
        ])} />
      </>}
      <Button label={room.sharingSince ? '自動共有を停止' : '自動共有を始める'} secondary onPress={() => {
        setDialog(undefined);
        if (!room.sharingSince) { startSharing(); return; }
        Alert.alert('自動共有を停止', 'このルームの自動共有データを取り下げます。端末の記録と以前の手動共有は残ります。', [{ text: 'キャンセル' }, { text: '停止', style: 'destructive', onPress: () => void rooms.run(() => rooms.setSharing(false)) }]);
      }} />
      <Text style={styles.small}>自動共有は当月と過去11か月分、1人1,000件まで。端末の記録と以前の手動共有には影響しません。</Text>
      <Button label="以前の共有を管理" secondary onPress={() => setDialog('manage')} />
      <Button label={room.ownerId === rooms.account?.id ? '引継いで退出' : '退出'} secondary disabled={rooms.busy} onPress={() => confirmLeave()} />
      {room.ownerId === rooms.account?.id && <Button label="ルーム全体を削除" secondary disabled={rooms.busy} onPress={() => confirmLeave(true)} />}
    </Sheet>}
    {dialog === 'members' && room && <Sheet title="メンバーを管理" onClose={() => setDialog(undefined)}>
      <Text style={styles.small}>除名すると、その人の共有データを削除し、閲覧と送信を停止します。招待コードを知っていれば再参加できるため、必要に応じて招待コードも更新してください。</Text>
      {rooms.detail?.members.map((member) => <View key={member.id} style={{ marginTop: 12 }}>
        <MemberAvatar name={member.name} avatar={member.avatar} /><Text style={styles.body}>{member.name}{member.id === room.ownerId ? '（作成者）' : ''}</Text>
        {member.id !== rooms.account?.id && <>
          <Button label={`${member.name}を通報`} secondary disabled={rooms.busy} onPress={() => startReport(member.id, member.name)} />
          <Button label={`${member.name}をブロック`} secondary disabled={rooms.busy} onPress={() => confirmBlock(member.id)} />
        </>}
        {room.ownerId === rooms.account?.id && member.id !== room.ownerId && <Button label={`${member.name}を除名`} secondary disabled={rooms.busy} onPress={() => Alert.alert(`${member.name}を除名しますか？`, 'この人の共有データを削除します。端末の記録は残ります。', [
          { text: 'キャンセル', style: 'cancel' }, { text: '除名', style: 'destructive', onPress: () => { setDialog(undefined); void rooms.run(() => rooms.removeMember(member.id)); } },
        ])} />}
      </View>)}
    </Sheet>}
    {(dialog === 'create' || dialog === 'join' || dialog === 'rename') && <Sheet title={dialog === 'create' ? '新しいルーム' : dialog === 'join' ? 'ルームに参加' : '表示名を変更'} onClose={() => setDialog(undefined)} bottomSheet={dialog === 'create' || dialog === 'join'}>
      <Field autoFocus label={dialog === 'create' ? undefined : dialog === 'join' ? '招待コード・参加リンク' : '表示名'} placeholder={dialog === 'create' ? 'ルーム名（任意）' : undefined} value={draft} onChangeText={setDraft} maxLength={dialog === 'join' ? 200 : dialog === 'create' ? 40 : 32} />
      {dialog === 'create' && <View style={{ marginTop: 20 }}>
        <Text style={styles.small}>ルームの種類 · どちらも記録の詳細は共有されます</Text>
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
            <Text style={styles.small}>{value ? '共有セット数の順位を表示' : '順位なしで最近の活動を見る'}</Text>
            <View style={{ alignSelf: 'center', marginTop: 7, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: competitive === value ? colors.primary : colors.muted, alignItems: 'center', justifyContent: 'center' }}>{competitive === value && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }} />}</View>
          </Pressable>)}
        </View>
      </View>}
       {dialog !== 'rename' && <Text style={[styles.small, { marginTop: 16 }]}>最大100人。自動共有は参加後に範囲を確認して開始します。保存は12か月・1人1,000件までです。</Text>}
       <View style={{ marginTop: 16 }}><Button label={dialog === 'create' ? '作成して招待' : dialog === 'join' ? '参加' : '保存'} disabled={rooms.busy || (dialog !== 'create' && !draft.trim())} onPress={() => {
        const action = dialog === 'create' ? async (name: string) => {
          try { await rooms.create(name, competitive); }
          catch (error) {
            if (error instanceof RoomsApiError && error.code === 'premium_required') {
              openPaywall('無料プランで作成できるルームは2つまでです。');
              return;
            }
            throw error;
          }
        } : dialog === 'join' ? rooms.join : rooms.rename;
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
    {dialog === 'editProfile' && <ProfileEditor initiallyEditing onClose={() => setDialog(undefined)} />}
    {dialog === 'profile' && <Sheet title={rooms.account?.name ?? 'プロフィール'} onClose={() => setDialog(undefined)}>
      <LegalLinks />
      <Button label="ブロックしたユーザー" secondary disabled={rooms.busy} onPress={() => { void rooms.run(async () => { await rooms.loadSafety(); setDialog('blocked'); }); }} />
      <Button label="表示名を変更" secondary onPress={() => { setDraft(rooms.account?.name ?? ''); setDialog('rename'); }} />
      <Button label="共有アカウントを削除" secondary onPress={() => Alert.alert('共有アカウントを削除', '共有した記録を削除します。端末の記録は残ります。', [{ text: 'キャンセル' }, { text: '削除', style: 'destructive', onPress: () => { setDialog(undefined); void rooms.run(rooms.deleteAccount); } }])} />
    </Sheet>}
    {memberId && rooms.comparison && <Sheet title={`${rooms.comparison.rankings.find((r) => r.id === memberId)?.name ?? 'メンバー'} · ${monthLabel(rooms.month)}`} onClose={() => { setMemberId(undefined); rooms.closeMember(); }}>
      {memberId !== rooms.account?.id && <>
        <Button label="このユーザーを通報" secondary disabled={rooms.busy} onPress={() => startReport(memberId, rooms.comparison!.rankings.find(r => r.id === memberId)?.name ?? 'メンバー')} />
        <Button label="このユーザーをブロック" secondary disabled={rooms.busy} onPress={() => confirmBlock(memberId)} />
      </>}
      {!rooms.memberComparison ? <Text style={styles.small}>{rooms.error || 'この人の記録を読み込み中…'}</Text> : <>
        {rooms.memberComparison.posts.map((post) => <View key={post.id}><WorkoutDetails post={post} />
          {post.userId !== rooms.account?.id && <Button label="この記録を通報" secondary disabled={rooms.busy} onPress={() => startReport(post.userId, post.name, post.id)} />}
        </View>)}
        {rooms.memberComparison.nextCursor ? <Button label="この人の以前の記録を読み込む" disabled={rooms.busy} onPress={() => void rooms.run(rooms.moreComparison)} />
          : !rooms.memberComparison.posts.length && <Text style={styles.small}>この月の共有記録はありません。</Text>}
      </>}
      {rooms.error && <Button label="再読み込み" secondary disabled={rooms.busy} onPress={() => void rooms.run(() => rooms.openMember(memberId))} />}
    </Sheet>}
    {dialog === 'report' && reportTarget && <Sheet title="運営に通報" onClose={() => setDialog(undefined)}>
      <Text style={styles.body}>対象：{reportTarget.name}{reportTarget.postId ? 'の記録' : ''}</Text>
      <Text style={styles.small}>対象のプロフィールと、記録を指定した場合はその記録を運営へ送信します。通報者の情報を相手へ公開しません。</Text>
      {reportReasons.map(([value, label]) => <Button key={value} label={`${reportReason === value ? '✓ ' : ''}${label}`} secondary disabled={rooms.busy} onPress={() => setReportReason(value)} />)}
      <Field label="補足（任意・1,000文字まで）" value={reportDetails} onChangeText={setReportDetails} maxLength={1000} multiline />
      {rooms.error && <Text accessibilityRole="alert" style={styles.body}>{rooms.error}</Text>}
      <Button label="通報を送信" disabled={rooms.busy} onPress={() => void rooms.run(async () => {
        await rooms.report(reportTarget.id, reportReason, reportDetails, reportTarget.postId); setDialog(undefined);
      })} />
      <Button label="キャンセル" secondary disabled={rooms.busy} onPress={() => setDialog(undefined)} />
    </Sheet>}
    {dialog === 'blocked' && <Sheet title="ブロックしたユーザー" onClose={() => setDialog(undefined)}>
      <Text style={styles.small}>解除しても、相手があなたをブロック中の場合は表示されません。</Text>
      {rooms.safety?.blocked.map(user => <View key={user.id}><Text style={styles.body}>{user.name}</Text><Button label="ブロックを解除" secondary disabled={rooms.busy} onPress={() => void rooms.run(() => rooms.block(user.id, false))} /></View>)}
      {!rooms.safety?.blocked.length && <Text style={styles.body}>ブロックしたユーザーはいません。</Text>}
      {rooms.error && <Text accessibilityRole="alert" style={styles.body}>{rooms.error}</Text>}
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
