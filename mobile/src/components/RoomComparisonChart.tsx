import React, { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
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
  const [x] = useState(() => new Animated.Value(index * 80));
  useEffect(() => {
    if (reduced === undefined) return;
    Animated.parallel([
      Animated.timing(height, { toValue: max ? member.sets / max * 152 : 0, duration: reduced ? 0 : 480, useNativeDriver: false }),
      Animated.timing(x, { toValue: index * 80, duration: reduced ? 0 : 300, useNativeDriver: false }),
    ]).start();
  }, [height, x, member.sets, max, index, reduced]);
  return <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 80, transform: [{ translateX: x }] }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${member.name}${own ? '、あなた' : ''}、${member.rank}位、${member.sets}セット。詳細を見る`} onPress={onPress} style={{ alignItems: 'center' }}>
      <Text style={styles.small}>{member.rank}位</Text>
      <View style={{ height: 188, justifyContent: 'flex-end', alignItems: 'center', width: '100%', borderBottomWidth: 1, borderColor: colors.line }}>
        <Text style={[styles.body, { fontWeight: '800', color: own ? colors.primary : colors.ink }]}>{member.sets}</Text>
        <Animated.View style={{ width: 36, height, minHeight: member.sets ? 2 : 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: own ? colors.primary : colors.soft }} />
      </View>
      <View style={{ marginTop: 10 }}><MemberAvatar name={member.name} size={36} /></View>
      <Text numberOfLines={1} style={[styles.small, { maxWidth: 76 }]}>{own ? 'あなた' : member.name}</Text>
    </Pressable>
  </Animated.View>;
}

export function RoomComparisonChart({ comparison, ownId, onMember }: { comparison: RoomComparison; ownId?: string; onMember: (id: string) => void }) {
  const { styles } = useTheme();
  const max = Math.max(0, ...comparison.rankings.map((r) => r.sets));
  return <>
    <Text style={[styles.body, { fontWeight: '800' }]}>{Number(comparison.month.slice(5))}月のセット数</Text>
    <Text style={styles.small}>毎月1日〜末日 · 日本時間 · 完了セットのみ</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 16 }}>
      <View style={{ height: 282, width: Math.max(240, comparison.rankings.length * 80) }}>
        {comparison.rankings.map((member, index) => <Column key={member.id} member={member} index={index} max={max} own={member.id === ownId} onPress={() => onMember(member.id)} />)}
      </View>
    </ScrollView>
    <Text style={styles.small}>アイコン・棒をタップで種目や重量を見る。人数が多いときは横にスワイプ。</Text>
    {!max && <Text style={[styles.small, { marginTop: 12 }]}>今月の共有記録はまだありません。</Text>}
  </>;
}
