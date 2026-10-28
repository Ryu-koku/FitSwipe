# 内部テストの自動配信

- 開発・通常のPRのベースは `develop`。
- リリース時は `develop` → `main` のPRを作成してマージする。
- `main` 宛てPRのマージ時のみ `.github/workflows/play-internal.yml` が実行される。PRのクローズのみ、developへのマージ、mainへの直接pushでは配信しない。
- 単体テストと署名付きAAB生成に成功したらGoogle Playの `internal` トラックへ配信する。製品版とテスター設定は変更しない。
- CIのversionCodeは2020年からの経過秒。ローカルの既定値より大きくなる。以降の手動配信でもPlay上の最新値より大きい番号を使用する。versionNameは `app/build.gradle.kts` で管理する。

## 初回設定（管理者）

CIでは `FITSWIPE_ROOMS_URL` に本番ルームAPIを設定する。`FITLOG_REQUIRE_ROOMS=true` により接続先未設定・非HTTPSでの配信を防ぎ、ビルド後にもreleaseのBuildConfigを照合する。接続先を変更するときはワークフローも更新する。

GitHub ActionsのRepository Secretsに次を登録する（値はGitやチャットに貼らない）。

| Secret | 内容 |
| --- | --- |
| `FITLOG_UPLOAD_KEYSTORE_BASE64` | 直近の配信で使用した `upload-reset.p12` のBase64（alias: `upload`） |
| `FITLOG_UPLOAD_PASSWORD` | 既存のアップロード鍵のパスワード |
| `PLAY_SERVICE_ACCOUNT_JSON` | Google Play Android Developer API用サービスアカウントのJSON鍵 |

Google CloudでGoogle Play Android Developer APIを有効化し、Play Consoleでサービスアカウントに対象アプリのテストトラック配信権限を付与する。初回のアプリ作成・内部テスト設定は既存のものを使用する。

Secrets未登録では配信は失敗する。Actions成功だけで端末への反映を保証しないため、初回はPlay Consoleの内部テストと端末で確認する。
