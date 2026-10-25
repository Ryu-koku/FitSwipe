# Google Play 内部テストへの更新

このディレクトリの React Native 版を EAS Build / EAS Submit で更新します。
Expo プロジェクト: `@mame749/fitlog-solo`
Android パッケージ: `dev.local.fitlogsolo`

## 通常の更新

`mobile/` で実行します。

```sh
npx tsc --noEmit
npx expo lint
npx eas-cli@latest build --platform android --profile production --auto-submit
```

`production` はビルド設定の名前です。提出先は `eas.json` の
`submit.production.android.track = internal` に固定してあり、製品版ではありません。
既存のテスター設定は変更しません。

## 一度だけ必要な設定

- Expo アカウントへのログインとプロジェクトへの紐付け。
- 従来の Play アップロード鍵を EAS のビルド認証情報として登録。
  新しい署名鍵を生成しないこと。
- Google Play Android Developer API を有効化。
- このアプリだけにアクセスできるサービスアカウントを Play Console に追加し、
  アプリ情報の閲覧・未公開アプリの編集・テストトラックへのリリース権限を付与。
  製品版リリースや管理者権限は付与しません。
- サービスアカウントの JSON 鍵を EAS Submit に登録。
- Play Console の使用済み versionCode を確認し、EAS のリモート番号を設定。
  2026-10-25 の確認時点では使用済み最大値は 36。
  `autoIncrement` により以後のビルドでは自動で番号を増やします。

鍵・パスワードは Git やチャットに載せません。ローカルの保管先は
`/home/mame/.local/share/Google/fitlog-signing/` です。
認証情報をアップロードするため一時作成する `credentials.json` は Git 管理対象外で、
アップロード後に削除します。

## 完了の確認

ビルド成功だけでは配信完了ではありません。EAS の提出結果と Play Console の
内部テストの配信状態を確認し、Play ストアから更新して動作を確認してください。
Google 側の検証や反映待ちが発生することがあります。

React Native 版には旧 Kotlin 版の端末データ移行処理がありません。
引き継ぎなしでの更新は了承済みですが、機能の動作確認は別途必要です。
