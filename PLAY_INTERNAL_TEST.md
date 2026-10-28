# 本人専用のGoogle Play内部テスト

一般公開せず、内部テストのテスターを本人のGoogleアカウント1件に限定する。

## 初回設定

1. Play Consoleでアプリを作成する。表示名: FitSwipe、言語: 日本語、種類: アプリ、無料。
2. 「テストとリリース → テスト → 内部テスト」でリリースを作成する。
3. Play App Signingを設定し、Googleがアプリ署名鍵を生成する方式を選ぶ。ローカルの鍵はアップロード鍵として使用する。
4. Expo版のAABを内部テストにアップロードする。パッケージ名は `dev.local.fitlogsolo`。Play Console上ではversionCode 1が先行アップロードで使用済み扱いになったため、最初の配信版はversionCode 2。
5. 「テスター」でメールリストを作成し、スマホのPlayストアで使用している本人のGoogleアカウントだけを追加する。他のメールリストやGoogleグループを選択しない。
6. Consoleに表示される必須項目を完了し、内部テストへの公開を実行する。製品版や公開テストは選ばない。
7. Consoleの「テストに参加」リンクをスマホで開き、登録したGoogleアカウントで参加してPlayストアからインストールする。

内部テストはストア検索には表示されない。参加リンクだけではテスターリスト外のアカウントは参加できない。初回の反映には時間がかかる場合がある。アカウント本人確認・規約同意・Consoleの必須申告は所有者が行う。

## Health Connect

このアプリは筋トレ記録専用です。Health Connectへのアクセス権限は要求しません。健康データの読み取り・グラフ化は別アプリで行います。

## 署名と更新

署名鍵とパスワードはGit外の `/home/mame/.local/share/Google/fitlog-signing/` に保存。`upload.p12` と `upload-password` の両方を安全な場所にバックアップする。Gitへコミットしたり、チャットへ貼り付けたりしない。

内部テスト更新は `develop` から `main` へのPRをマージして行います。GitHub ActionsはExpoのCNGでAndroidプロジェクトを生成し、既存のアップロード鍵でAABを署名して内部テストへ提出します。詳細は [docs/automatic-internal-release.md](docs/automatic-internal-release.md) を参照してください。

Play ConsoleのAPI要件に合わせ、ExpoのAndroid生成設定も対象SDK要件を満たすことをCIで確認します。既存のPlayアップロード鍵を継続して使い、新しい鍵を作りません。

## バージョン2.7の更新内容

[release-notes/2.7-ja-JP.txt](release-notes/2.7-ja-JP.txt) の内容を内部テストのリリースノートに使用する。

既存の本人専用アプリの「内部テスト」に署名済みAABをアップロードし、配信状態を確認する。テスターや公開範囲は既存設定を維持する。

## 検証範囲

GitHub Actionsのビルド・Play Consoleへのアップロード・Google側検証・実機インストールは別の工程です。Actions成功だけを配信完了とせず、内部テストへの反映と実機動作を確認してください。

公式手順: https://support.google.com/googleplay/android-developer/answer/9845334?hl=ja
