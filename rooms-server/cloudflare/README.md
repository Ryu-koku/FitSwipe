# Cloudflare Worker API

Cloudflare-hosted implementation of the room API used by the Expo app. It uses a Workers `workers.dev` URL and D1; it does not require a custom domain, an always-on PC, or an exposed home network.

## Local check

From this directory:

```sh
wrangler dev --local --port 8788 --persist-to /tmp/fitswipe-rooms-local
```

In another terminal, run:

```sh
node --test test/worker.test.mjs
```

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
