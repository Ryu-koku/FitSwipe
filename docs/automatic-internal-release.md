# 内部テストの自動配信

- 開発・通常のPRのベースは `develop`。
- リリース時は `develop` → `main` のPRを作成してマージする。
- `main` 宛てPRのマージ時のみ `.github/workflows/play-internal.yml` が実行される。PRのクローズのみ、developへのマージ、mainへの直接pushでは配信しない。
- Expoの型チェック・lint・テスト後に `mobile/` のAndroidプロジェクトを生成し、署名付きAABをGoogle Playの `internal` トラックへ配信する。製品版とテスター設定は変更しない。
- CIのversionCodeは2020年からの経過秒。ローカルの既定値より大きくなる。以降の手動配信でもPlay上の最新値より大きい番号を使用する。versionNameは `mobile/app.json` で管理する。

## 初回設定（管理者）

CIでは `EXPO_PUBLIC_ROOMS_URL` に本番ルームAPIを設定し、生成されたJavaScriptバンドルに接続先が含まれることを確認する。接続先を変更するときはワークフローも更新する。

GitHub ActionsのRepository Secretsに次を登録する（値はGitやチャットに貼らない）。

| Secret | 内容 |
| --- | --- |
| `FITLOG_UPLOAD_KEYSTORE_BASE64` | 直近の配信で使用した `upload-reset.p12` のBase64（alias: `upload`） |
| `FITLOG_UPLOAD_PASSWORD` | 既存のアップロード鍵のパスワード |
| `PLAY_SERVICE_ACCOUNT_JSON` | Google Play Android Developer API用サービスアカウントのJSON鍵 |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Googleログインで使うWeb OAuthクライアントID |

Google CloudでGoogle Play Android Developer APIを有効化し、Play Consoleでサービスアカウントに対象アプリのテストトラック配信権限を付与する。初回のアプリ作成・内部テスト設定は既存のものを使用する。

Secrets未登録では配信は失敗する。Expo版のAndroid OAuth設定（パッケージ名・署名証明書）もGoogle Cloud側で確認する。Actions成功だけで端末への反映を保証しないため、Play Consoleの内部テストと端末で確認する。
