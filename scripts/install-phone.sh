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
export FITSWIPE_ROOMS_URL="${FITSWIPE_ROOMS_URL:-https://fitswipe-rooms-api.prompt-tem.workers.dev}"
export FITLOG_REQUIRE_ROOMS=true
bash ./gradlew testDebugUnitTest assembleDebug
adb -H 127.0.0.1 -P "$port" -s "$serial" install -r app/build/outputs/apk/debug/app-debug.apk
adb -H 127.0.0.1 -P "$port" -s "$serial" shell am start -n dev.local.fitlogsolo.usbdev/dev.local.fitlogsolo.MainActivity
