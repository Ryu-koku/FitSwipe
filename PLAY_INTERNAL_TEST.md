# 本人専用のGoogle Play内部テスト

一般公開せず、内部テストのテスターを本人のGoogleアカウント1件に限定する。

## 初回設定

1. Play Consoleでアプリを作成する。表示名: FitLog Solo、言語: 日本語、種類: アプリ、無料。
2. 「テストとリリース → テスト → 内部テスト」でリリースを作成する。
3. Play App Signingを設定し、Googleがアプリ署名鍵を生成する方式を選ぶ。ローカルの鍵はアップロード鍵として使用する。
4. `app/build/outputs/bundle/release/app-release.aab` をアップロードする。パッケージ名は `dev.local.fitlogsolo`、初回versionCodeは1。
5. 「テスター」でメールリストを作成し、スマホのPlayストアで使用している本人のGoogleアカウントだけを追加する。他のメールリストやGoogleグループを選択しない。
6. Consoleに表示される必須項目を完了し、内部テストへの公開を実行する。製品版や公開テストは選ばない。
7. Consoleの「テストに参加」リンクをスマホで開き、登録したGoogleアカウントで参加してPlayストアからインストールする。

内部テストはストア検索には表示されない。参加リンクだけではテスターリスト外のアカウントは参加できない。初回の反映には時間がかかる場合がある。アカウント本人確認・規約同意・Consoleの必須申告は所有者が行う。

## Health Connect申告

Consoleで求められる健康アプリ・Health Connectの申告では、筋力トレーニングの記録と体重推移表示という実際の用途を記載する。要求するデータは体重の読み取りだけで、書き込み、バックグラウンド取得、30日より前の履歴権限は要求しない。申告・審査が求められた場合は完了まで連携の利用を保証しない。

体重は端末内で表示し、開発者へ送信しない。プライバシーポリシーURLを求められた場合は、実際のデータ処理に合った公開URLが必要。非公開GitHubのREADMEは公開URLとして使わない。現在のAndroid設定はallowBackup=trueのため、端末のOSバックアップが働く可能性がある点を申告時に確認する。

## 署名と次回更新

署名鍵とパスワードはGit外の `/home/mame/.local/share/Google/fitlog-signing/` に保存。`upload.p12` と `upload-password` の両方を安全な場所にバックアップする。Gitへコミットしたり、チャットへ貼り付けたりしない。

```sh
export FITLOG_UPLOAD_KEYSTORE=/home/mame/.local/share/Google/fitlog-signing/upload.p12
export FITLOG_UPLOAD_PASSWORD="$(tr -d '\n' < /home/mame/.local/share/Google/fitlog-signing/upload-password)"
./gradlew bundleRelease
unset FITLOG_UPLOAD_PASSWORD
```

次回のアップロード前にversionCodeを増やす。既存のConsoleアプリにすでに別のアップロード鍵が登録済みの場合は、この新規鍵をそのまま使用できない。既存登録の有無はConsoleで確認する。

## 検証範囲

ローカルでのAAB生成・署名検証と、Play Consoleへのアップロード・Google側検証・実機インストールは別の工程。ローカルビルド成功を配信完了として扱わない。現行のSDK要件等はアップロード時にConsoleの検証結果も確認する。

公式手順: https://support.google.com/googleplay/android-developer/answer/9845334?hl=ja

Health Connect: https://developer.android.com/health-and-fitness/health-connect/publish
