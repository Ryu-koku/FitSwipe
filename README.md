# FitLog Solo

本人用・オフライン優先の筋トレ記録アプリです。ログイン、広告、クラウド同期、外部サーバー通信はありません。

## 実装済み

- 通常種目と左右別種目の登録
- 下書きセッションの自動保存と再起動後の復元
- 前回値を候補にしたセット入力、セット複製、完了管理
- 左右それぞれの重量・回数の保存、編集、再表示
- セッション履歴の詳細、編集、削除
- 種目ごとの日別最大重量グラフ（通常1系列、左右別2系列）
- JSON形式のローカルエクスポート
- ライト/ダークテーマ、Compose Preview、単体テスト、Room instrumentation test

## ビルド環境

- Kotlin 2.1.21
- Android Gradle Plugin 8.9.2
- Gradle 8.11.1
- compileSdk / targetSdk 35
- minSdk 28
- Java 17向けにコンパイル（ビルドホストではJava 21でも検証）
- Room 2.7.2

## コマンド

```bash
./gradlew testDebugUnitTest
./gradlew assembleDebug
./gradlew assembleDebugAndroidTest
```

APKは次に生成されます。

```text
app/build/outputs/apk/debug/app-debug.apk
```

実機へのインストール例:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## データ管理アプリとの分離

このリポジトリは筋トレ記録専用です。Health Connect上の健康データの閲覧・グラフ化は、別リポジトリのHealth Connect Dashboardで行います。

## テスト状況

- `./gradlew testDebugUnitTest`: 成功
- `./gradlew assembleDebug`: 成功
- `./gradlew assembleDebugAndroidTest`: 成功（Room/UI instrumentation APKのコンパイルまで）
- 実機/エミュレータ上のinstrumentation test: 未実施

この環境ではADBサーバーが権限制限で起動できないため、実機での片手操作、画面回転、TalkBackの目視確認は未検証です。

## 今後の候補（P1）

バックアップJSONのインポート、種目の並び替え・アーカイブ一覧、グラフ期間切替、点タップ詳細、重量増減ボタンはP0の後に追加できる項目です。
