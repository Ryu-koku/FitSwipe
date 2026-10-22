# FitSwipe

オフライン優先の筋トレ記録アプリです。トレーニング記録は端末内に保存し、ルームに投稿した記録だけをメンバーに共有します。

## 画面と操作

- ホームはカレンダーを中心に表示し、設定は右上の丸い歯車から開きます。
- フッターは「ホーム・＋・ルーム」の3つです。
- 中央の＋を押すとプリセット選択・編集画面が開き、フッターが消えて同じ位置に再生ボタンが現れます。
- 前回選んだプリセットはアプリを閉じても記憶します。再生ボタンで開始し、進行中のトレーニングがある場合は再開します。
- 通常種目と左右別種目に対応し、重量・回数・セット数・休憩・種目順を編集できます。
- トレーニングカードと休憩カードはスワイプ操作で進めます。休憩終了は音と振動で知らせます。
- ルームでは招待した友だちとトレーニング記録を共有できます。メンバーだけに表示し、送信失敗時は端末内に送信待ちを残します。
- トレーニング終了画面またはルーム内の「記録を共有」から、共有する記録を選べます。

## 共有サーバー

[rooms-server/README.md](rooms-server/README.md) に起動・HTTPS公開・バックアップの手順があります。接続先は `FITSWIPE_ROOMS_URL` 環境変数または `-PfitSwipeRoomsUrl=...` でビルド時に指定します。未設定のビルドではルームは準備中になります。

## ビルド環境

- Kotlin 2.1.21
- Android Gradle Plugin 8.9.2
- Gradle 8.11.1
- compileSdk / targetSdk 36
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

## 確認コマンド

```sh
./gradlew :app:assembleDebug :app:testDebugUnitTest :app:assembleDebugAndroidTest
python3 -m unittest discover -s rooms-server -v
```

Android instrumentationテストには端末またはエミュレータが必要です。ホームからプリセットを移動したこと、＋と再生の中心位置、選択状態の永続化、同時開始・既存セッションの再開を検証します。
