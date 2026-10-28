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
