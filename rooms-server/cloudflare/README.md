# Cloudflare Worker API

Cloudflare-hosted implementation of the room API used by the Expo app. It uses a Workers `workers.dev` URL and D1; it does not require a custom domain, an always-on PC, or an exposed home network.

## Local check

From this directory:

```sh
wrangler dev --local --test-scheduled --port 8788 --persist-to /tmp/fitswipe-rooms-local
```

In another terminal, run:

```sh
node --test test/worker.test.mjs
```

`mobile` の `pnpm test` も、アプリのルーム通信をこのWorkerに対して確認します。Wranglerは使わず、`test/local-worker.mjs` がマイグレーションを適用したSQLite（`node:sqlite`）をD1の代わりにしてWorkerをローカルHTTPで公開します。

## アプリの接続先

```sh
cd mobile
EXPO_PUBLIC_ROOMS_URL=https://fitswipe-rooms-api.<account-subdomain>.workers.dev pnpm android
```

接続先が未設定のビルドでは、ルームは「準備中」と表示します。接続先はHTTPSを使い、認証トークンを付けたリダイレクトには追従しません。ローカル開発に限り `http://10.0.2.2:8788` / `http://127.0.0.1:8788`（上の `wrangler dev`）を指定できます。

## 共有のしくみ

- 表示名を登録すると、端末専用のランダムな認証トークンを発行します。サーバーはトークンのSHA-256ハッシュだけを保持します。Googleログインすると同じアカウントを別の端末でも使えます。
- 招待コードまたは `fitswipe://room?code=...` のリンクから参加します。ルームのメンバーだけがメンバー一覧・投稿を取得できます。
- 投稿は種目名、重量、回数、左右、セット番号、開始・終了日時のスナップショットです。端末内のデータベース全体は送信しません。同じトレーニングを同じルームに再送しても投稿は1件です。
- 通信失敗時は端末の送信待ちに保存し、ルーム画面の表示・更新時に再送します。
- メンバーの退出時は本人の共有投稿を削除します。作成者がルームを削除すると全投稿を削除します。アカウント削除時は所有ルームを残るメンバーの参加順で引き継ぎ、残るメンバーがいないルームだけ削除します。端末内の記録は削除しません。
- ルームは1アカウント30個、1ルーム100人まで。APIの投稿サイズは128KiB、1記録100種目・600セットまでです。手動共有は1アカウント1日100件・1ルーム1万件まで、自動共有は各メンバーが各ルームに1,000件まで（取り下げ済みは含みません）。上限時は409を返し、他のメンバーや別ルームの共有は妨げません。
- 個人情報やトークンをログに書きません。招待コード・記録はPOSTボディで送ります。

## Deploy

Wrangler needs Cloudflare account access for Workers and D1. Create a D1 database in the Asia-Pacific region, copy its ID to `database_id` in `wrangler.jsonc`, then apply the migration and publish:

```sh
wrangler d1 create fitswipe-rooms --location apac
wrangler d1 migrations apply fitswipe-rooms --remote
wrangler deploy
```

Wrangler prints the Worker URL, normally `https://fitswipe-rooms-api.<account-subdomain>.workers.dev`. Confirm `GET /health` returns `{"status":"ok"}` before building the Android release.

Play internal-test builds are generated from `mobile/` by `.github/workflows/play-internal.yml`. Configure the Worker URL, existing Play upload keystore, Google Play service-account JSON, and Google Web OAuth client ID as documented in `docs/automatic-internal-release.md`. The workflow uses a temporary keystore and uploads only to the internal testing track; never commit credentials.

The Worker preserves the Android API contract: account tokens are stored as SHA-256 hashes; room membership gates member and post reads; invitation codes use cryptographically secure randomness; shared workouts are validated and idempotent; and the D1 schema cascades room/account deletion. Cloudflare rate-limit bindings are approximate per-location limits and do not store client IPs in the application database.

## Automatic room sharing

Apply `0003_automatic_room_sharing.sql` before releasing the refreshed client. The existing manual-post API remains available for old clients and managing previously shared records.

- `PUT /v1/rooms/:id/sharing` with `{ "enabled": true|false }`: per-member consent. Enabling includes records starting in the current Japanese calendar month; disabling retracts only automatic copies.
- `GET /v1/rooms/:id/auto-workouts`: the caller's active record IDs, for reconciliation after edits, deletions, or changing devices.
- `PUT /v1/rooms/:id/auto-workouts`: validated, idempotent snapshot upsert. Requires consent; accepts an optional legacy record ID to avoid counting an earlier manual copy twice.
- `DELETE /v1/rooms/:id/auto-workouts/:clientId`: retract the caller's automatic copy. A tombstone prevents a stale manual duplicate from reappearing in comparisons.
- `GET /v1/rooms/:id/comparison?month=YYYY-MM&cursor=...`: whole-month member totals, including zeroes and ties, plus paginated details. Boundaries use Japan time; bilateral pairs count once, incomplete pairs do not count. Members cannot mutate anyone else's snapshots.

Run `node --test --test-concurrency=1 test/*.test.mjs` against the local Worker. When enabling the personal-sync integration tests with `SYNC_TEST_PERSIST`, run the mobile and Worker suites sequentially: both provision fixtures through Wrangler's direct local-D1 connection, which otherwise causes SQLite lock conflicts. This repository change does not apply remote migrations or deploy the Worker.

## Room types

`POST /v1/rooms` accepts an optional boolean `competitive` (default `false`).
Room lists return the saved value to every member. Noncompetitive rooms show
member records without ranks in the mobile app; existing rooms stay competitive.
Apply `0004_room_competitive.sql` using D1 migrations before deploying this Worker,
and deploy the Worker before releasing the mobile client with room-type selection.

## Room management and retention

- `POST /v1/rooms/:id/invite` with `{}` rotates the invitation code (owner only). Existing memberships stay; old codes and QR links no longer admit new members.
- `DELETE /v1/rooms/:id/members/:userId` removes another member (owner only), including that person's manual/automatic shares and consent. This is not a permanent ban: someone who learns the current code can join again. Rotate a leaked code separately.
- `POST /v1/rooms/:id/leave` with `{}` leaves without deleting other members' records. An owner's role transfers to the earliest remaining membership (row order, then user ID). Empty rooms are deleted. The transfer and removal are one transaction.
- The existing `DELETE /v1/rooms/:id` retains its legacy behavior: owners delete the entire room, other members leave. The new app presents owner exit and whole-room deletion separately.
- Automatic copies retain the current Japanese calendar month and preceding 11 months, using workout start time. The client excludes expired records; the API rejects expired reuploads. Daily scheduled cleanup at 15:00 UTC (00:00 Japan time), plus cleanup on automatic/comparison requests, removes expired copies and tombstones. Manual shares and personal records remain untouched.
- Automatic sharing now allows 1,000 active copies **per member per room**, replacing the room-wide 10,000-row cap. A 100-member room can retain two workouts per person per day for 12 months. Tombstones do not consume active slots. Existing copies remain editable when over quota; new/restored copies return 409 until space becomes available. The insert checks the quota atomically, including concurrent requests. Existing data is not removed to enforce the new limit. Backup retention remains separate from live-row cleanup.
- `GET .../auto-workouts` also returns `used` and `limit`. The mobile client warns from 80% and isolates quota failures to that room. Personal records never need deleting to clear a room-sharing error.
- `PUT .../sharing` accepts optional `sinceMonth` (the month shown in the consent explanation). A stale month returns 409 without enabling consent. Old clients that omit it remain compatible.
- `GET .../comparison?month=YYYY-MM&memberId=...` returns the full room rankings plus only the requested member's paginated posts. Responses echo `memberId` and include `fetchedAt`. Membership checks apply before filtering.
- Deploy this Worker before the updated mobile client. No new database migration is needed for these changes.

Deploy the updated server (including the configured cron trigger) before releasing this client. Apply every migration in `migrations/` (`wrangler d1 migrations apply`); existing room types are unchanged. The daily cron also deletes expired Google sessions and personal-sync receipts older than 90 days (`0006_session_cleanup.sql` records receipt ages), and logout revokes its session with `DELETE /v1/auth/session`. Local scheduled-handler tests require `wrangler dev --test-scheduled`; run the suite with `SYNC_TEST_PERSIST` pointing to that server's local persistence directory.

## Profile icons

Apply `0005_profile_avatar.sql` before deploying the profile-enabled Worker and releasing the app. Account registration and updates accept `avatar` (a JPEG data URI up to 24,000 characters, or `null` to remove it). Omitting the field preserves the current icon on rename. Google sign-in returns the stored profile; room summaries, member lists, and comparison rankings include icons. The app crops/resizes selected photos to 128×128 and JPEG-encodes them before upload. Python hosting adds the column on startup. No remote migration or deployment is performed by the local checks.

Google default icons additionally require `0007_google_profile_picture.sql` (apply all pending migrations in order). After validating the Google ID token, sign-in uses its optional HTTPS `picture` claim on `googleusercontent.com` as the default avatar. Manually selected photos and explicit removals are retained on reauthentication. Existing users receive the default on their next Google sign-in. Missing pictures retain the existing avatar; image load failures display initials. Profile edits may retain the current Google URL but cannot set arbitrary remote URLs.

New Google accounts also initialize the room display name from the verified ID-token `name`, with the Google SDK name as a fallback. Empty/missing names fall back to `トレーニー`; long names are limited to 32 UTF-16 code units without splitting surrogate pairs. Existing account names, including explicitly edited names, are preserved. This name change requires a Worker update but no additional migration.


## Store review, public pages, and safety

Apply `0008_review_safety.sql` and deploy the Worker before the safety-enabled client. Existing clients without explicit terms acceptance can still read/retract/delete but cannot upload new public content or create accounts until updated. Terms version is `2026-11-09`; keep it synchronized with `mobile/src/legal.ts`.

Public `/privacy`, `/terms`, `/delete-account`, and `/support` pages are served by this Worker. The forms write to the authenticated operator inbox in D1, with origin validation, rate limits and 90-day retention. Configure the Web OAuth client's authorized JavaScript origin for the deployed Worker origin to enable Google-verified self-service web deletion. The fallback request form does not require login or an app installation.

- `GET /v1/safety`: accepted terms and the caller's blocked-user list.
- `POST /v1/safety/terms`: `{termsVersion}` records explicit acceptance.
- `PUT` / `DELETE /v1/safety/blocks/:userId`: block/unblock. Blocks filter both parties' shared profiles, posts, monthly rankings and room previews on the server. Membership is retained.
- `POST /v1/rooms/:id/reports`: `{targetId,postId?,reason,details}` stores validated member/post reports and evidence; membership required.
- `POST /v1/account/web-deletion`: same-origin JSON, a verified Google ID token and explicit confirmation delete an existing account without creating one. Suspended accounts can still delete themselves.

Daily operation and Console submission details: [Play review readiness](../../docs/play-review-readiness.md). Use `python3 ../../scripts/review-inbox.py --remote inbox` to check pending items. No public admin endpoint is exposed. Suspension, content removal, profile reset and ownership-preserving account deletion use authenticated Wrangler. The cron prunes reports and requests after 90 days.

Run `node --test test/safety.test.mjs` without Wrangler to check consent, mutual filtering, report authorization, public request forms, cryptographic web deletion and deletion cascades.


### Review demo authentication

Apply `0009_review_login.sql` before deploying the review-enabled Worker. Set
`REVIEW_LOGIN` and `REVIEW_PASSWORD_SHA256` using Wrangler secrets; the latter is the
lowercase SHA-256 digest of a randomly generated password with at least 192 bits of
entropy. Do not commit either credential or embed them in the mobile build.
`POST /v1/auth/review` accepts `{ login, password, termsVersion }` and returns the
same expiring, individually revocable application session as Google sign-in.
The isolated demo account has no Google subject and may use the normal sync,
rooms, safety and deletion endpoints. Deletion removes it normally; the next
valid demo login creates a new empty account with a different ID. Login is
rate limited and disabled when secrets are absent. Store only synthetic records
in this shared account. Demo login never imports the device's guest records.
