import React, { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, useTheme } from '../ui';
import { AppIcon, type AppIconName } from './AppIcon';

const slides: { icon: AppIconName; title: string; body: string; example: string[]; tip: string }[] = [
  {
    icon: 'home', title: 'はじめてのFitSwipe',
    body: 'メニューを選んで、運動したら記録する。毎日のトレーニングを少しずつ残しましょう。',
    example: ['1　メニューを選ぶ', '2　セットごとに記録する', '3　ホームで振り返る'],
    tip: '「ログインせずに使う」で端末だけでも始められます。Googleログインすると、別の端末にも個人記録を同期できます。',
  },
  {
    icon: 'plus', title: 'まずは、下の「＋」から',
    body: 'ホームの中央にある「＋」を押して、今日のメニューを選びます。プリセットは、よく行う種目をまとめたメニューです。',
    example: ['ホーム　→　＋　→　メニュー', '「プリセットから選ぶ」で選択', 'ない場合は「プリセットを作成」'],
    tip: '選んだプリセットは次回も記憶されます。最初は少ない種目から始めても大丈夫です。',
  },
  {
    icon: 'edit', title: '自分に合う内容に調整',
    body: '種目の行をタップすると、重量・回数・セット数・休憩を編集できます。準備ができたら、下の再生ボタンで開始します。',
    example: ['例：スクワット', '20 kg　×　10 回　×　3 セット', '「トレーニングを開始」'],
    tip: '数値は操作説明用の例です。「編集・並べ替え」では種目を長押しして順番を変えられます。',
  },
  {
    icon: 'next', title: '1セット終えたら、右へ',
    body: 'カードの重量・回数を実際に行った内容に合わせ、右にスワイプするとセット完了。行わないセットは左にスワイプします。',
    example: ['←　スキップ', '重量・回数を確認', '完了　→'],
    tip: 'カード下の「セット完了」「スキップ」はスワイプの目印です。左右別の種目は、表示された側を確認しましょう。',
  },
  {
    icon: 'play', title: '休憩しながら、次のセットへ',
    body: 'セットの合間には休憩カードが表示されます。タイマーを目安に休み、次のセットに進みましょう。',
    example: ['セット完了', '休憩タイマー', '次のセットへ'],
    tip: '早めに進むときは「休憩をスキップ」。途中で離れるときは「ホームに戻る」を選ぶと、あとから再開できます。',
  },
  {
    icon: 'flame', title: '記録を振り返ろう',
    body: 'トレーニングが終わると、完了したセットが記録されます。ホームのカレンダーや筋力グラフで積み重ねを確認しましょう。',
    example: ['完了画面で今回の記録を確認', 'ホームでカレンダーを確認', '筋力グラフの「詳しく見る」へ'],
    tip: '記録は自動保存されます。大切な記録は、設定の「データを書き出す（JSON）」からバックアップできます。',
  },
  {
    icon: 'people', title: '仲間と続けたいときは',
    body: '下の「ルーム」から仲間とつながれます。自動共有はルームごとに同意した場合だけ有効になります。',
    example: ['共有する内容', '完了記録の種目・重量・回数・日時', '共有停止はルームのメニューから'],
    tip: '一人での記録だけでも使えます。このガイドは設定の「はじめての使い方」からいつでも読み直せます。',
  },
];

/** The examples are explanatory only; opening the guide never edits workout data. */
export function BeginnerGuide() {
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState(0);
  const { colors, styles } = useTheme();
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
            {slide.example.map((line) => <Text key={line} style={[styles.body, { fontWeight: '700' }]}>{line}</Text>)}
          </View>
          <Text style={[styles.body, { color: colors.muted, marginTop: 8 }]}>{slide.tip}</Text>
        </ScrollView>
        <View style={{ paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
          <View accessible={false} style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
            {slides.map((_, i) => <View key={i} style={{ height: 4, flex: 1, maxWidth: 40, borderRadius: 2, backgroundColor: i === page ? colors.primary : colors.line }} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="前へ" secondary disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))} /></View>
            <View style={{ flex: 2 }}><Button label={page === slides.length - 1 ? 'ガイドを閉じる' : '次へ'} onPress={() => page === slides.length - 1 ? close() : setPage((p) => Math.min(slides.length - 1, p + 1))} /></View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}
