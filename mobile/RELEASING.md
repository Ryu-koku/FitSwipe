# Google Play 内部テストへの更新

このディレクトリの Expo 版をGitHub Actionsからビルド・Play内部テストへ配信します。
Expo プロジェクト: `@mame749/fitlog-solo`
Android パッケージ: `dev.local.fitlogsolo`

## 通常の更新

`develop` から `main` へのPRを作成し、マージします。`.github/workflows/play-internal.yml` がExpoネイティブプロジェクトを生成し、テスト・署名付きAAB作成後に内部テストへ配信します。

Play版と同じAndroidパッケージ `dev.local.fitlogsolo`、既存のアップロード鍵を使用します。製品版ではなく内部テストだけを更新します。

## 一度だけ必要な設定

- Google Play Android Developer API を有効化。
- このアプリだけにアクセスできるサービスアカウントを Play Console に追加し、
  アプリ情報の閲覧・未公開アプリの編集・テストトラックへのリリース権限を付与。
  製品版リリースや管理者権限は付与しません。
- GitHub Secretsに既存のPlayアップロード鍵・パスワード・サービスアカウントJSON・Google Web OAuthクライアントIDを登録。
- Play Consoleの使用済みversionCodeを確認する。CIは時刻ベースの増加番号を使います。

鍵・パスワードは Git やチャットに載せません。ローカルの保管先は
`/home/mame/.local/share/Google/fitlog-signing/` です。
CIは一時領域に鍵を作り、ジョブ終了時に削除します。鍵・パスワードをGitやチャットに載せません。

## 完了の確認

ビルド成功だけでは配信完了ではありません。GitHub ActionsとPlay Consoleの
内部テストの配信状態を確認し、Play ストアから更新して動作を確認してください。
Google 側の検証や反映待ちが発生することがあります。

Expo版には旧Kotlin版の端末データ移行処理がありません。更新時に旧DBは削除しませんが、Expo版からは表示されません。必要な記録を保全してから配信してください。
