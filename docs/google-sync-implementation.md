# Googleログイン・個人同期の実装状況

赤ペンの決定記録: `akapen/monthly-room-01.html`〜`06.html`。

## 実装済みのサーバー基盤（未公開）

- Python/Cloudflare両APIで、アカウント削除時のルーム引継ぎをトランザクション化。参加順で移し、本人の投稿と認証は削除する。
- CloudflareにGoogle IDトークンの署名・発行者・audience・有効期限検証を追加。メールアドレスではなくGoogleの`sub`で本人を識別する。
- `POST /v1/auth/google`。`idToken`と、新規登録時は`name`を送る。既存端末Bearerトークン付きならその参加者へ連携する。他アカウントへの無断統合は409で拒否する。Bearerなしの既存Googleログインでは同じ本人に戻る。
- 追加端末ごとのセッショントークンを発行（30日）。既存端末のトークンをローテーションして他端末を追い出すことはしない。
- `POST /v1/sync`の`changes`（最大50件）。各変更は`mutationId`, `kind`, `id`, `deleted`, `payload`を持つ。UUIDは端末DBの数値IDと別の安定IDが必要。kindは`exercise`, `session`, `set`, `preset`, `setting`。削除はpayloadを残さないtombstone。
- サーバー受信順のrevisionを採番。mutationIdの再送は古い編集を再適用しない。新しい編集だけ新しいUUIDを使う。
- `GET /v1/sync?cursor=0`は本人の変更のみ、100件ずつ取得。`hasMore`の間は続けて取得する。cursorと取得データは端末で原子的に保存する必要がある。
- 個人データはルームAPIへ公開しない。削除時は同期記録・セッション・再送受付履歴も連鎖削除する。

## アプリ側の実装（mobile/ Expo版）

- 初回Googleログイン／スキップと設定のアカウント管理。Nitro Google Sign-InによるAndroid Credential Manager認証を使用。Expo GoではGoogle認証できず、ネイティブ再ビルドが必要。
- 種目・セッション・セット・プリセットのUUID変換、設定の同期。ローカル数値IDの衝突を避け、参照関係も変換する。
- 変更とUUID対応表・永続outboxを同じ端末保存に記録。アプリ起動中は変更後と30秒間隔で同期を試行し、通信できなければ保留する。OSがアプリを停止している間のバックグラウンド送信は保証しない。
- Googleログイン後に既存記録の取り込みを確認。取り込まない元の個人データは端末へ保管し、ログアウト後に設定から明示的に戻せる（現在のゲストデータとの入替）。別参加者のルーム参加情報は統合しない。
- ログアウトでは個人・共有の未送信があれば切替を止める。元アカウントのデータは別領域へ保管し、ゲストには空のデータを表示。同じGoogleで再ログインすると保管データと同期を再開する。
- クラウドアカウント削除の確認画面と、この端末の個人記録をゲストへ残す処理。
- Google IDトークンは保存せず、アプリのセッショントークンはSecureStoreへ保存する。AsyncStorageの状態・アーカイブにはトークンを含めない。

## 未検証・未実装

- 実Googleアカウントを使った実機認証。公開OAuth ID・署名登録と新しいネイティブビルドが必要で、コードのテストだけでログイン成功を保証しない。
- 障害復旧後の削除再適用。
- 30日以内のサーバーバックアップ消去運用。現時点で30日消去を保証しない。
- 1か月のルーム期間・ランキング・グラフ。

## 公開前の設定・検証

Cloudflareに`GOOGLE_WEB_CLIENT_ID`（Web OAuthクライアントID。秘密ではない）を設定する。Androidアプリのパッケージ名・署名証明書に対応したGoogle Cloud OAuth設定も必要。GoogleがAndroidクライアントを`azp`として返す構成では`GOOGLE_ANDROID_CLIENT_ID`も設定する（検証するaudienceは必ずWebクライアントID）。ID未設定時は503で拒否する。実ユーザーのGoogleトークンをログへ出力しない。

`0002_google_sync.sql`を既存の`0001`の後へ適用する。既存DBのmigration前には新Workerを公開しない。Python APIはGoogle/個人同期の新エンドポイントには未対応。

単体検証: `node --test rooms-server/cloudflare/test/google-auth.test.mjs`。
ローカルWorker結合検証: CloudflareのREADMEのWrangler手順を使う。本番へのデプロイや実データへのmigrationはこの変更では行っていない。

個人同期のローカルDB結合テストは、同じ`--persist-to`の値を`SYNC_TEST_PERSIST`で渡す。テストはlocalhost以外を拒否し、ローカルDBにだけGoogle連携済みのfixtureを作る。本番に認証を迂回する経路は追加しない。

```sh
WORKER_URL=http://127.0.0.1:8790 SYNC_TEST_PERSIST=/tmp/opencode/fitswipe-sync-local node --test rooms-server/cloudflare/test/worker.test.mjs
```

## アプリの設定と検証

`mobile/`で`EXPO_PUBLIC_ROOMS_URL`と`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`を設定する。後者はWorkerの`GOOGLE_WEB_CLIENT_ID`と一致させる。Android OAuthクライアントのパッケージ名は`dev.local.fitlogsolo`、開発用・Play署名それぞれのSHA-1をGoogle Cloudへ登録する。iOSも使う場合は`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`を設定し、config pluginが対応するURL schemeを生成する。AndroidはFirebase設定ファイルなしで明示的なWeb client IDを使用する。

新しいネイティブ依存があるため、既存APKへのJavaScript更新だけでは動作しない。Expo Goではログインをスキップして使い、Google認証にはEAS等で再ビルドしたAndroidアプリを使う。Google側の認証設定や本番デプロイは自動変更していない。

`mobile/`内で:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
# 同じローカルWorkerとD1を起動済みの場合は実APIでの保存・復元も検証
WORKER_URL=http://127.0.0.1:8790 SYNC_TEST_PERSIST=/tmp/opencode/fitswipe-sync-local pnpm test
```

ローカルHTTPはlocalhost/127.0.0.1/Androidエミュレータの10.0.2.2だけ許可し、本番接続はHTTPS必須。旧Kotlin `app/` にはこのGoogle同期UIを追加しておらず、現在の開発対象である `mobile/` に実装している。

## 実環境への反映（2026-10-28）

- 既存の本番D1 `fitswipe-rooms` を確認し、wrangler設定を実DBのIDへ更新した。新しい別DBは作成していない。
- DBバックアップを取得してから、リモートへ`0002_google_sync.sql`を適用済み。
- Workerを既存変数を保持する`wrangler deploy --keep-vars`で公開済み。
- 公開先: `https://fitswipe-rooms-api.prompt-tem.workers.dev`。`/health`は200、未認証`/v1/sync`は401を確認。
- EASプロジェクトのproduction環境へ`EXPO_PUBLIC_ROOMS_URL`を設定済み。
- Google Cloudの既存プロジェクト `fitswipe-play-releases` のAuth Platform初期設定を準備。**ユーザーデータポリシーへの所有者の同意待ち**で、OAuthクライアントはまだ作成していない。
- そのためWorkerのGoogleログインは設定未完了を示す503で拒否している。Google OAuthクライアントIDの両側への設定・署名登録・新規Androidビルド・実機認証は未完了。設定未完了のアプリを内部テストへ提出したとは扱わない。

### 所有者の同意後の設定

- 所有者によるポリシー同意を確認し、Google Auth Platformの構成を完了した。
- 同じGoogle CloudプロジェクトにWebクライアント（バックエンドのaudience用）とAndroidクライアントを作成した。クライアントシークレットはこの構成では使用せず、リポジトリやアプリには保存しない。
- Android OAuthには`dev.local.fitlogsolo`と、Play Consoleから確認した**アプリ署名鍵**のSHA-1を登録した。アップロード鍵のSHA-1とは異なる。現在はPlay経由の署名を対象とし、別署名のAPKを直接インストールする場合は別途登録が必要。
- 公開ステータスは「テスト中」のまま、本人のアカウント1件だけをOAuthテストユーザーへ登録済み。一般公開やテスターの追加は行っていない。
- EAS production環境の`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`とWorkerの`GOOGLE_WEB_CLIENT_ID`を一致させ、Workerへ`GOOGLE_ANDROID_CLIENT_ID`も設定して再公開済み。
- 公開WorkerのGoogleログインは、設定不足の503ではなく不正トークン拒否の401を返すことを確認した。これは実Googleログイン成功の検証ではない。
- そのEAS環境変数と既存のPlayアップロード鍵を使い、versionCode **38** のAndroidビルドを開始した。内部テストへの提出もキューへ登録した。提出完了・Play反映・実機認証は個別に確認する。
  - Build: `50c9e1e2-c72d-40ed-b2b2-8f17610aa2e8`
  - Submission: `2357ffbf-3cb8-4c73-bb83-6f0487f15e33`

### 署名不一致の修正

versionCode 38のネイティブビルドは成功しましたが、EASのリモート既定鍵が旧鍵だったため内部テスト提出が拒否されました。Playが要求する既存アップロード鍵とローカル`upload-reset.p12`のSHA-1一致を確認し、`production-local-key`プロファイルでversionCode **39**を再ビルド・提出予約しました。新しい鍵は生成していません。アップロード用の一時`credentials.json`は削除済みです。

- Build: `04a5066e-08aa-47e7-9e84-cef8ace9131e`
- Submission: `ebd3c1b0-04ae-422f-a3e2-25f465a5a37d`
- 提出完了・配信・実機のGoogleログイン成功はまだ未確認です。
