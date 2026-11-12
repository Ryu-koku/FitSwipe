import { WeightField } from './WeightField';
import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useApp } from '../context';
import { formatWeight } from '../logic';
import { feedback, Button, Card, NumberField, Sheet, useTheme } from '../ui';
import { deleteRecordedSession, deleteRecordedSet, editRecordedSet } from '../record-history';
import type { WorkoutSet } from '../types';

export function SessionDetails({ sessionIds }: { sessionIds: number[] }) {
  const { state, update } = useApp();
  const { colors, styles } = useTheme();
  const [draft, setDraft] = useState<WorkoutSet>();
  const sessions = state.sessions.filter((session) => sessionIds.includes(session.id))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const exercise = state.exercises.find((item) => item.id === draft?.exerciseId);
  const sides = exercise?.mode === 'BILATERAL' ? ['left', 'right'] as const : ['normal'] as const;
  const valid = draft && sides.every((side) => {
    const weight = draft[`${side}WeightKg`], reps = draft[`${side}Reps`];
    const performed = side === 'normal' ? draft.isCompleted : draft[`${side}Completed`];
    return !performed || (weight !== undefined && Number.isFinite(weight) && weight >= 0 &&
      reps !== undefined && Number.isInteger(reps) && reps > 0);
  });
  return <>
    {sessions.map((session) => {
      const sets = state.sets.filter((set) => set.sessionId === session.id);
      const ids = [...new Set(sets.map((set) => set.exerciseId))];
      const editable = session.status === 'COMPLETED';
      return <View key={session.id} style={{ marginBottom: 16 }}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { marginTop: 8 }]}>
          {new Date(session.startedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 開始 · {state.presets.find((preset) => preset.id === session.presetId)?.name ?? 'トレーニング'}
        </Text>
        {ids.map((id) => {
          const item = state.exercises.find((entry) => entry.id === id);
          return <Card key={id}>
            <Text style={[styles.body, { fontWeight: '800', marginBottom: 8 }]}>{item?.name ?? '種目'}</Text>
            {sets.filter((set) => set.exerciseId === id).sort((a, b) => a.setOrder - b.setOrder).map((set) =>
              <View key={set.id} style={{ marginBottom: 12 }}>
                <View style={styles.row}>
                  <Text style={styles.small}>セット {set.setOrder} · {set.isCompleted ? '完了' : '未完了'}</Text>
                  {editable && <Pressable accessibilityRole="button" accessibilityLabel={`${item?.name ?? '種目'}のセット${set.setOrder}を編集`}
                    onPress={() => { feedback(); return setDraft({ ...set }); }} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={[styles.body, { color: colors.primary }]}>編集</Text>
                  </Pressable>}
                </View>
                {item?.mode === 'BILATERAL' ? <>
                  <Text style={styles.body}>左　{formatWeight(set.leftWeightKg, state.weightUnit)} × {set.leftReps ?? '—'}回 {set.leftCompleted ? '✓' : ''}</Text>
                  <Text style={styles.body}>右　{formatWeight(set.rightWeightKg, state.weightUnit)} × {set.rightReps ?? '—'}回 {set.rightCompleted ? '✓' : ''}</Text>
                </> : <Text style={styles.body}>{formatWeight(set.normalWeightKg, state.weightUnit)} × {set.normalReps ?? '—'}回</Text>}
              </View>)}
          </Card>;
        })}
        {!sets.length && <Text style={styles.muted}>セットの記録はありません</Text>}
        {editable && <Button label="このトレーニングを削除" secondary onPress={() => Alert.alert('トレーニングを削除しますか？', 'この回の全セットを削除します。取り消せません。自動共有中のルームにも反映されます。', [
          { text: 'キャンセル', style: 'cancel' },
          { text: '削除', style: 'destructive', onPress: () => update((current) => deleteRecordedSession(current, session.id)) },
        ])} />}
      </View>;
    })}
    {!sessions.length && <Text style={styles.muted}>記録はありません</Text>}
    {draft && <Sheet title={`${exercise?.name ?? '種目'} · セット${draft.setOrder}を編集`} onClose={() => setDraft(undefined)}>
      <Text style={[styles.small, { marginBottom: 12 }]}>保存すると記録と集計を更新します。自動共有中のルームにも反映されます。</Text>
      {sides.map((side) => {
        const performed = side === 'normal' ? draft.isCompleted : draft[`${side}Completed`];
        return <View key={side}>
          {side !== 'normal' && <Text style={styles.body}>{side === 'left' ? '左' : '右'}{!performed ? '（未実施）' : ''}</Text>}
          {(performed || side === 'normal') && <View style={styles.row}>
            <WeightField label="重量（kg）" value={draft[`${side}WeightKg`]} onChange={(value) => setDraft({ ...draft, [`${side}WeightKg`]: value })} />
            <NumberField label="回数" integer value={draft[`${side}Reps`]} onChange={(value) => setDraft({ ...draft, [`${side}Reps`]: value })} />
          </View>}
        </View>;
      })}
      {!valid && <Text style={styles.small}>実施したセットの重量は0以上、回数は1以上で入力してください。</Text>}
      <Button label="保存" disabled={!valid} onPress={() => {
        const values = Object.fromEntries(sides.flatMap((side) => [`${side}WeightKg`, `${side}Reps`]).map((key) => [key, draft[key as keyof WorkoutSet]]));
        update((current) => editRecordedSet(current, draft.id, values)); setDraft(undefined);
      }} />
      <Button label="キャンセル" secondary onPress={() => setDraft(undefined)} />
      <Button label="このセットを削除" secondary onPress={() => Alert.alert('セットを削除しますか？', 'このセットの記録を削除します。取り消せません。', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => { update((current) => deleteRecordedSet(current, draft.id)); setDraft(undefined); } },
      ])} />
    </Sheet>}
  </>;
}
