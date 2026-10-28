# FitSwipe rooms

招待制のトレーニング記録共有サーバー。通常のトレーニング記録は端末内に残り、利用者が選んで投稿した記録だけを保存します。SQLiteとGunicornを使い、Dockerで実行します。

## ローカルで起動

```sh
docker compose -f rooms-server/compose.yaml up -d --build rooms
curl http://127.0.0.1:8787/health
```

APIはホストのループバックアドレスだけにバインドします。データはDockerボリューム `fitswipe-rooms_rooms-data` に保存され、コンテナを作り直しても残ります。`docker compose down` はボリュームを残します。`down -v` は共有データも削除するので、通常の停止には使わないでください。

## 常時稼働サーバーでHTTPS公開

Dockerが利用できるサーバーにこのディレクトリを配置し、DNSで用意したドメインをサーバーに向けます。80/443番ポートを開放したうえで実行します。

```sh
ROOMS_DOMAIN=rooms.example.com docker compose -f rooms-server/compose.yaml --profile public up -d --build
```

Caddyが証明書の取得・更新とHTTPSの終端を担当します。TLSの終端からAPIまでは専用Dockerネットワークを使います。

このPCで一時運用する場合は、APIが起動したあとに `tailscale funnel --bg --https=8443 http://127.0.0.1:8787` でHTTPS公開できます。Funnelの利用権限が必要です。PCが停止・スリープしている間は利用できません。解除は `tailscale funnel --https=8443 off` です。他のFunnel設定を消す `reset` は使いません。

## Androidへの接続先設定

```sh
FITSWIPE_ROOMS_URL=https://rooms.example.com ./gradlew :app:assembleDebug
# または
./gradlew -PfitSwipeRoomsUrl=https://rooms.example.com :app:assembleRelease
```

接続先が未設定のビルドでは、ルームは「準備中」と表示し、架空のメンバーや投稿は表示しません。接続先はHTTPSを使い、認証トークンを付けたリダイレクトには追従しません。ローカル開発に限りdebugビルドは `http://10.0.2.2:8787` / `http://127.0.0.1:8787` を指定できます。Android側の平文通信許可はdebugマニフェストだけに含めます。

## 共有のしくみ

- 初回に表示名を登録し、この端末専用のランダムな認証トークンを発行します。サーバーではトークンのSHA-256ハッシュだけを保持します。
- 招待コードまたは `fitswipe://room?code=...` のリンクから参加します。
- ルームのメンバーだけがメンバー一覧・投稿を取得できます。
- 投稿は種目名、重量、回数、左右、セット番号、開始・終了日時のスナップショットです。端末内のデータベース全体は送信しません。
- 同じ端末の同じトレーニングを同じルームに再送しても、投稿は1件です。
- 通信失敗時はAndroidの送信待ちに保存し、ルーム画面の表示・更新時に再送します。投稿を削除した後で同じ記録をもう一度共有すると再投稿になります。
- アカウントの認証情報と共有キャッシュはAndroidのクラウドバックアップ・端末移行対象から除外します。現時点のアカウントは端末専用で、アプリ削除後のアカウント復元や別端末へのログインには対応していません。
- メンバーの退出時は本人の共有投稿を削除します。作成者がルームを削除すると全投稿を削除します。端末内の記録は削除しません。
- アカウント削除時は、所有ルームを残るメンバーの参加順（同順位はID順）で引き継ぎます。残るメンバーがいないルームだけ削除します。本人の投稿は削除し、他のメンバーの投稿は維持します。通常の「ルーム削除」とは異なります。
- ルームは1アカウント30個、1ルーム100人まで。APIの投稿サイズは128KiB、1記録100種目・600セットまでです。1アカウントの共有は1日100件、1ルームの保存は1万件までです。
- 個人情報やトークンをアクセスログに書きません。招待コード・記録はPOSTボディで送ります。

## バックアップと移設

SQLiteの稼働中バックアップはSQLite backup APIを使ってください。WAL利用中の `.sqlite3` ファイル単独コピーでは最新データが欠落する可能性があります。

```sh
docker compose -f rooms-server/compose.yaml exec rooms python -c "import sqlite3; src=sqlite3.connect('/data/rooms.sqlite3'); dst=sqlite3.connect('/data/rooms-backup.sqlite3'); src.backup(dst); dst.close(); src.close()"
docker compose -f rooms-server/compose.yaml cp rooms:/data/rooms-backup.sqlite3 ./rooms-backup.sqlite3
```

移設時はサーバーを停止し、バックアップを移設先の `/data/rooms.sqlite3` に戻して所有者をUID 10001にします。アプリの接続先URLを維持すれば既存の認証と招待コードを引き続き利用できます。接続先を別サービスに変える場合は、共有アカウントDBも一緒に移設してください。

## 確認

```sh
python3 -m unittest discover -s rooms-server -v
```

招待参加、非メンバーの拒否、投稿者だけの削除、退出・アカウント削除後のアクセス拒否、左右別の記録、同時再送の重複防止、ページ送り、サーバー再起動後の永続化を検証します。
