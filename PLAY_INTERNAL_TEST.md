# 本人専用のGoogle Play内部テスト

一般公開せず、内部テストのテスターを本人のGoogleアカウント1件に限定する。

## 初回設定

1. Play Consoleでアプリを作成する。表示名: FitLog Solo、言語: 日本語、種類: アプリ、無料。
2. 「テストとリリース → テスト → 内部テスト」でリリースを作成する。
3. Play App Signingを設定し、Googleがアプリ署名鍵を生成する方式を選ぶ。ローカルの鍵はアップロード鍵として使用する。
4. `app/build/outputs/bundle/release/app-release.aab` をアップロードする。パッケージ名は `dev.local.fitlogsolo`。Play Console上ではversionCode 1が先行アップロードで使用済み扱いになったため、最初の配信版はversionCode 2。
5. 「テスター」でメールリストを作成し、スマホのPlayストアで使用している本人のGoogleアカウントだけを追加する。他のメールリストやGoogleグループを選択しない。
6. Consoleに表示される必須項目を完了し、内部テストへの公開を実行する。製品版や公開テストは選ばない。
7. Consoleの「テストに参加」リンクをスマホで開き、登録したGoogleアカウントで参加してPlayストアからインストールする。

内部テストはストア検索には表示されない。参加リンクだけではテスターリスト外のアカウントは参加できない。初回の反映には時間がかかる場合がある。アカウント本人確認・規約同意・Consoleの必須申告は所有者が行う。

## Health Connect

このアプリは筋トレ記録専用です。Health Connectへのアクセス権限は要求しません。健康データの読み取り・グラフ化は別アプリで行います。

## 署名と次回更新

署名鍵とパスワードはGit外の `/home/mame/.local/share/Google/fitlog-signing/` に保存。`upload.p12` と `upload-password` の両方を安全な場所にバックアップする。Gitへコミットしたり、チャットへ貼り付けたりしない。

```sh
export FITLOG_UPLOAD_KEYSTORE=/home/mame/.local/share/Google/fitlog-signing/upload.p12
export FITLOG_UPLOAD_PASSWORD="$(tr -d '\n' < /home/mame/.local/share/Google/fitlog-signing/upload-password)"
./gradlew bundleRelease
unset FITLOG_UPLOAD_PASSWORD
```

次回のアップロード前にversionCodeを3以上へ増やす。Play ConsoleのAPI要件に合わせ、現在はcompileSdk/targetSdk 36、Android Gradle Plugin 8.10.0を使用する。既存のConsoleアプリにすでに別のアップロード鍵が登録済みの場合は、この新規鍵をそのまま使用できない。既存登録の有無はConsoleで確認する。

## 検証範囲

ローカルでのAAB生成・署名検証と、Play Consoleへのアップロード・Google側検証・実機インストールは別の工程。ローカルビルド成功を配信完了として扱わない。現行のSDK要件等はアップロード時にConsoleの検証結果も確認する。

公式手順: https://support.google.com/googleplay/android-developer/answer/9845334?hl=ja
