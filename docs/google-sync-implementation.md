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

## まだ実装していない（利用可能とは案内しない）

- Androidの初回Googleログイン／スキップ画面、Credential Manager、後からの連携。
- 既存DBへのUUID付与、端末変更の永続outbox、自動同期、取得データの適用、設定の同期。
- ログイン前の記録の取り込み確認、アカウント単位の端末データ分離、未送信時の切替ブロック。
- 端末個人記録をゲストへ残すアカウント削除導線、復旧後の削除再適用。
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
