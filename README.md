# FitLog Solo

本人用・オフライン優先の筋トレ記録アプリです。ログイン、広告、クラウド同期、外部サーバー通信はありません。

## 実装済み

- 通常種目と左右別種目の登録
- 下書きセッションの自動保存と再起動後の復元
- 前回値を候補にしたセット入力、セット複製、完了管理
- 左右それぞれの重量・回数の保存、編集、再表示
- セッション履歴の詳細、編集、削除
- 種目ごとの日別最大重量グラフ（通常1系列、左右別2系列）
- Health Connectからの体重読み取りと体重グラフ
- Health Connect未導入、更新要求、権限拒否、データなし、読み取り失敗の案内
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
- Health Connect `androidx.health.connect:connect-client:1.1.0-alpha12`

Health Connectの現行版 `1.2.0-alpha06` はAPI 37およびAGP 9.1以上を要求するため、API 35・AGP 8.9.2で再現可能な `1.1.0-alpha12` を採用しています。SDKを更新する場合はcompileSdkとAGPの互換性も同時に確認してください。

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

## Health Connect / OMRON設定

1. Android 14以上では「設定 > セキュリティとプライバシー > プライバシー管理 > Health Connect」を開きます。
2. Android 13以下ではHealth Connectアプリをインストール・更新します。
3. OMRONアプリ側でHealth Connectへの体重同期を有効にします。
4. FitLog Soloの「設定 > Health Connect」または「グラフ > 体重」から「体重を連携」を押します。
5. 読み取り権限を許可し、「手動で更新」を押します。

OMRONの専用APIや固定パッケージ名は使用していません。体重が表示されない場合は、OMRON側の同期実行、Health Connect側に実測値が存在すること、読み取り権限が残っていること、対象期間が直近30日以内であることを確認してください。同日複数測定は最後の測定だけを表示します。

## テスト状況

- `./gradlew testDebugUnitTest`: 成功
- `./gradlew assembleDebug`: 成功
- `./gradlew assembleDebugAndroidTest`: 成功（Room/UI instrumentation APKのコンパイルまで）
- 実機/エミュレータ上のinstrumentation testとHealth Connect実データ取得: 未実施

この環境ではADBサーバーが権限制限で起動できないため、実機での権限ダイアログ、OMRON同期、片手操作、画面回転、TalkBackの目視確認は未検証です。

## 今後の候補（P1）

バックアップJSONのインポート、種目の並び替え・アーカイブ一覧、グラフ期間切替、点タップ詳細、重量増減ボタンはP0の後に追加できる項目です。
