import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { ProgressRecord } from '../home-progress';
import { formatWeight } from '../logic';
import { compareRecords, comparisonChoices } from '../record-comparison';
import type { ComparisonMode } from '../record-comparison';
import { Card, Chip, useTheme } from '../ui';

export function RecordComparison({ records, initialWeight, initialReps, onOpenRecord }: {
  records: ProgressRecord[];
  initialWeight?: number;
  initialReps?: number;
  onOpenRecord: (record: ProgressRecord) => void;
}) {
  const { colors, styles } = useTheme();
  const [mode, setMode] = useState<ComparisonMode>('weight');
  const [selection, setSelection] = useState<number>();
  const choices = comparisonChoices(records, mode);
  const initial = mode === 'weight' ? initialWeight : initialReps;
  const latest = records.at(-1);
  const fallback = mode === 'weight' ? latest?.weight : latest?.reps;
  const value = selection !== undefined && choices.includes(selection) ? selection
    : initial !== undefined && choices.includes(initial) ? initial
      : fallback !== undefined && choices.includes(fallback) ? fallback : choices.at(-1);
  const comparison = value !== undefined ? compareRecords(records, mode, value) : undefined;
  const condition = mode === 'weight'
    ? value === 0 ? '重量なし' : formatWeight(value) : `${value}回`;
  const result = (record: ProgressRecord) => mode === 'weight' ? `${record.reps}回` : formatWeight(record.weight);
  const open = (label: string, record: ProgressRecord) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}・${record.date}の記録を見る`}
      onPress={() => onOpenRecord(record)} style={{ minHeight: 44, justifyContent: 'center', paddingVertical: 6 }}>
      <Text style={[styles.body, { color: colors.primary }]}>{label}：{result(record)}　›</Text>
      <Text style={styles.small}>{record.date}</Text>
    </Pressable>
  );
  const difference = comparison?.difference;
  return (
    <Card>
      <Text style={styles.sectionTitle}>条件をそろえて比較</Text>
      <View style={styles.wrap}>
        {(['weight', 'reps'] as const).map((key) => <Chip key={key}
          label={key === 'weight' ? '同じ重量' : '同じ回数'} active={mode === key}
          onPress={() => { setMode(key); setSelection(undefined); }} />)}
      </View>
      {choices.length ? <>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
          {choices.map((choice) => <Chip key={choice} label={mode === 'weight'
            ? choice === 0 ? '重量なし' : formatWeight(choice) : `${choice}回`}
          active={value === choice} onPress={() => setSelection(choice)} />)}
        </ScrollView>
        <Text style={[styles.body, { fontWeight: '700' }]}>{condition}の比較</Text>
        {comparison?.previous && open('前回', comparison.previous)}
        {comparison?.latest && open('最新', comparison.latest)}
        {difference !== undefined ? <Text style={[styles.body, { fontWeight: '700' }]}>
          {difference === 0 ? '前回と同じ' : `${difference > 0 ? '+' : '−'}${mode === 'weight' ? `${Math.abs(difference)}回` : formatWeight(Math.abs(difference))}`}
        </Text> : <Text style={styles.small}>比較できる記録はまだ1回です。次の完了記録から差分を表示します。</Text>}
        {comparison?.best && <View style={{ marginTop: 12 }}>
          <Text style={styles.small}>参考 · 全期間 · {condition}での{mode === 'weight' ? '過去最多' : '過去最大重量'}</Text>
          {open('過去の実績', comparison.best)}
        </View>}
      </> : <Text style={[styles.small, { marginVertical: 12 }]}>
        {mode === 'reps' ? '同回数の重量比較に使える、重量ありの完了記録がありません。' : 'まだ完了した記録がありません。'}
      </Text>}
      <Text style={[styles.small, { marginTop: 8 }]}>同じ種目・左右の完了記録を、1回のトレーニング内の最大値で比較します。休憩やフォームが同じ条件だったことは確認できません。</Text>
    </Card>
  );
}
