#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Uses a loopback-only SSH tunnel to the laptop's USB ADB server.
port="${PHONE_ADB_PORT:-15037}"
host="${PHONE_SSH_HOST:-mame@laptop}"
key="${PHONE_SSH_KEY:-$HOME/.ssh/id_ed25519_laptop_agent}"
if ! adb -H 127.0.0.1 -P "$port" devices >/dev/null 2>&1; then
  ssh -f -N -T -i "$key" \
    -o BatchMode=yes -o StrictHostKeyChecking=yes \
    -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -L "127.0.0.1:$port:127.0.0.1:5037" "$host"
fi
mapfile -t devices < <(adb -H 127.0.0.1 -P "$port" devices | awk 'NR>1 && $2 == "device" {print $1}')
serial="${PHONE_SERIAL:-}"
if [[ -z "$serial" ]]; then
  if [[ ${#devices[@]} -ne 1 ]]; then
    echo 'Connect exactly one authorized phone, or set PHONE_SERIAL.' >&2
    exit 1
  fi
  serial="${devices[0]}"
fi
export EXPO_PUBLIC_ROOMS_URL="${EXPO_PUBLIC_ROOMS_URL:-${FITSWIPE_ROOMS_URL:-https://fitswipe-rooms-api.prompt-tem.workers.dev}}"
export FITSWIPE_APP_VARIANT=development
# Do not export an empty Google client ID: an empty inherited variable prevents
# Expo from loading the configured public client ID from mobile/.env.

pnpm --dir mobile typecheck
pnpm --dir mobile lint
pnpm --dir mobile test
pnpm --dir mobile exec expo prebuild --platform android --no-install --no-clean

gradle_wrapper="mobile/android/gradlew"
if [[ ! -x "$gradle_wrapper" ]]; then
  chmod +x "$gradle_wrapper"
fi
# Public Expo environment variables are inlined into the JS bundle. Rebuild it
# explicitly so changing .env cannot reuse a bundle with stale login/API config.
"$gradle_wrapper" -p mobile/android :app:createBundleReleaseJsAndAssets --rerun :app:assembleRelease

apk="mobile/android/app/build/outputs/apk/release/app-release.apk"
package="dev.local.fitlogsolo.expodev"
adb -H 127.0.0.1 -P "$port" -s "$serial" install -r "$apk"
adb -H 127.0.0.1 -P "$port" -s "$serial" shell monkey -p "$package" -c android.intent.category.LAUNCHER 1
