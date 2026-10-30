import React, { useEffect, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, Text, View } from 'react-native';
import type { RoomComparison } from '../types';
import { useTheme } from '../ui';
import { useMotionPreference } from '../use-reduced-motion';

export function MemberAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  return <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.soft, borderColor: colors.surface, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: colors.primary, fontSize: size * 0.35, fontWeight: '700' }}>{Array.from(name.trim())[0] ?? '?'}</Text>
  </View>;
}

function Column({ member, index, max, own, onPress }: { member: RoomComparison['rankings'][number]; index: number; max: number; own: boolean; onPress: () => void }) {
  const { colors, styles } = useTheme();
  const reduced = useMotionPreference();
  const [height] = useState(() => new Animated.Value(0));
  const [x] = useState(() => new Animated.Value(index * 64));
  useEffect(() => {
    if (reduced === undefined) return;
    Animated.parallel([
      Animated.timing(height, { toValue: max ? member.sets / max : 0, duration: reduced ? 0 : 480, useNativeDriver: true }),
      Animated.timing(x, { toValue: index * 64, duration: reduced ? 0 : 300, useNativeDriver: true }),
    ]).start();
  }, [height, x, member.sets, max, index, reduced]);
  return <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 64, transform: [{ translateX: x }] }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${member.name}${own ? '、あなた' : ''}、${member.rank}位、${member.sets}セット。詳細を見る`} onPress={onPress} style={{ alignItems: 'center' }}>
      <Text style={styles.small}>{member.rank}位</Text>
      <View style={{ height: 112, justifyContent: 'flex-end', alignItems: 'center', width: '100%', borderBottomWidth: 1, borderColor: colors.line }}>
        <Text style={[styles.body, { fontWeight: '800', color: own ? colors.primary : colors.ink }]}>{member.sets}</Text>
        <Animated.View style={{ width: 28, height: 84, transformOrigin: 'bottom', transform: [{ scaleY: height }], borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: own ? colors.primary : colors.soft }} />
      </View>
      <View style={{ marginTop: 6 }}><MemberAvatar name={member.name} size={28} /></View>
      <Text numberOfLines={1} style={[styles.small, { maxWidth: 60 }]}>{own ? 'あなた' : member.name}</Text>
    </Pressable>
  </Animated.View>;
}

export function RoomComparisonChart({ comparison, ownId, onMember, enableMock = false }: { comparison: RoomComparison; ownId?: string; onMember: (id: string) => void; enableMock?: boolean }) {
  const { styles } = useTheme();
  const [mockMembers, setMockMembers] = useState(__DEV__);
  const showingMock = __DEV__ && enableMock && mockMembers;
  const rankings = showingMock ? [
    ...comparison.rankings,
    { id: 'preview-member-1', name: 'ユウ（モック）', sets: 64, rank: 0 },
    { id: 'preview-member-2', name: 'ハル（モック）', sets: 42, rank: 0 },
    { id: 'preview-member-3', name: 'ソラ（モック）', sets: 18, rank: 0 },
  ].sort((a, b) => b.sets - a.sets).map((member, _index, members) => ({
    ...member,
    rank: members.findIndex((entry) => entry.sets === member.sets) + 1,
  })) : comparison.rankings;
  const max = Math.max(0, ...rankings.map((r) => r.sets));
  return <>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={[styles.body, { fontWeight: '800' }]}>{Number(comparison.month.slice(5))}月 · セット数</Text>
      {__DEV__ && enableMock && <Pressable accessibilityRole="button" accessibilityLabel="モック表示を切り替え" onPress={() => setMockMembers((value) => !value)} hitSlop={10}>
        <Text style={styles.small}>{showingMock ? 'モック' : '実データ'}</Text>
      </Pressable>}
    </View>
    {rankings.length ? <>
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 8 }}>
        <View style={{ height: 194, width: Math.max(240, rankings.length * 64), alignSelf: 'flex-start' }}>
          {rankings.map((member, index) => <Column key={member.id} member={member} index={index} max={max} own={member.id === ownId} onPress={() => {
            if (showingMock && member.id.startsWith('preview-member-')) {
              Alert.alert(member.name, '表示確認用の架空メンバーです。実際の共有記録はありません。');
            } else onMember(member.id);
          }} />)}
        </View>
      </ScrollView>
      {!max && <Text style={[styles.small, { marginTop: 12 }]}>今月の共有記録はまだありません。</Text>}
    </> : <Text style={[styles.small, { marginTop: 16 }]}>比較できるメンバーはいません。</Text>}
  </>;
}
