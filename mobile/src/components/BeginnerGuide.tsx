import { router } from 'expo-router';
import { useTour } from '../tour';
import { useApp } from '../context';
import { formatWeight } from '../logic';
import React, { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, useTheme } from '../ui';
import { AppIcon, type AppIconName } from './AppIcon';

const slides: { icon: AppIconName; title: string; body: string; example: string[]; tip: string }[] = [
  {
    icon: 'home', title: '使いやすさを追求した筋トレ記録',
    body: 'FitSwipe は、記録の入力も、見返すのも、とにかく簡単。ホーム下の「＋」からメニューを選んで始めましょう。',
    example: ['ホーム　→　＋', '「プリセット」から選択', 'トレーニングを開始'],
    tip: 'ログインしなくても、すぐに使い始められます。',
  },
  {
    icon: 'next', title: '入力はホイールとスワイプだけ',
    body: '重量や回数はホイールを上下に動かすだけ。1セット終えたらカードを左へスワイプで記録完了です。',
    example: ['上下に動かして重量・回数を変更', '→　次のセットを記録　／　前のセット　←', '↑　次の種目　／　前の種目　↓'],
    tip: '例：20 kg　×　10 回。前回の記録も表示されます。',
  },
  {
    icon: 'flame', title: '記録はひと目でわかる',
    body: '終わった記録は自動で保存。ホームのカレンダーとグラフで、積み重ねと成長がすぐに見られます。',
    example: ['完了画面で今回の記録', 'カレンダーで続けた日', 'グラフで筋力の伸び'],
    tip: 'このガイドは設定の「はじめての使い方」から読み直せます。',
  },
];

/** The examples are explanatory only; opening the guide never edits workout data. */
export function BeginnerGuide() {
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState(0);
  const { colors, styles } = useTheme();
  const { state } = useApp();
  const tour = useTour();
  const slide = slides[page];
  const close = () => setVisible(false);
  return <>
    <Button label="はじめての使い方" secondary onPress={() => { setPage(0); setVisible(true); }} />
    <Modal visible={visible} animationType="none" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.header, { flexWrap: 'wrap' }]}>
          <Text style={styles.title}>使い方ガイド</Text>
          <Button label="閉じる" secondary onPress={close} />
        </View>
        <ScrollView key={page} contentContainerStyle={{ flexGrow: 1, padding: 24, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
          <Text accessibilityLiveRegion="polite" style={[styles.small, { color: colors.primary, fontWeight: '700' }]}>STEP {page + 1} / {slides.length}</Text>
          <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginVertical: 24 }}>
            <AppIcon name={slide.icon} color={colors.primary} size={36} />
          </View>
          <Text accessibilityRole="header" style={[styles.title, { fontSize: 28, marginBottom: 16 }]}>{slide.title}</Text>
          <Text style={[styles.body, { fontSize: 17, lineHeight: 28 }]}>{slide.body}</Text>
          <View style={[styles.card, { marginTop: 24, backgroundColor: colors.soft, gap: 14 }]}>
            {slide.example.map((line) => <Text key={line} style={[styles.body, { fontWeight: '700' }]}>{line.replace('20 kg', formatWeight(20, state.weightUnit))}</Text>)}
          </View>
          <Text style={[styles.body, { color: colors.muted, marginTop: 8 }]}>{slide.tip.replace('20 kg', formatWeight(20, state.weightUnit))}</Text>
        </ScrollView>
        <View style={{ paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
          <View accessible={false} style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
            {slides.map((_, i) => <View key={i} style={{ height: 4, flex: 1, maxWidth: 40, borderRadius: 2, backgroundColor: i === page ? colors.primary : colors.line }} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="前へ" secondary disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))} /></View>
            <View style={{ flex: 2 }}><Button label={page === slides.length - 1 ? '実際にやってみる' : '次へ'} onPress={() => page === slides.length - 1 ? (() => { close(); router.replace('/'); tour.start(); })() : setPage((p) => Math.min(slides.length - 1, p + 1))} /></View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}
