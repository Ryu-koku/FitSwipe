#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Metro -> reverse SSH -> laptop ADB reverse -> USB phone. No public ports.
[[ "$(git branch --show-current)" == develop ]] || { echo 'Run from develop.' >&2; exit 1; }
host="${PHONE_SSH_HOST:-mame@laptop}"
key="${PHONE_SSH_KEY:-$HOME/.ssh/id_ed25519_laptop_agent}"
port="${PHONE_ADB_PORT:-15037}"
metro="${PHONE_METRO_PORT:-8081}"
ssh_opts=(-i "$key" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3)
ssh "${ssh_opts[@]}" "$host" 'adb start-server'
if ! adb -H 127.0.0.1 -P "$port" devices >/dev/null 2>&1; then
  ssh "${ssh_opts[@]}" -f -N -T -L "127.0.0.1:$port:127.0.0.1:5037" "$host"
fi
mapfile -t devices < <(adb -H 127.0.0.1 -P "$port" devices | awk 'NR>1 && $2 == "device" {print $1}')
serial="${PHONE_SERIAL:-}"
if [[ -z "$serial" ]]; then
  [[ ${#devices[@]} == 1 ]] || { echo 'Connect exactly one authorized phone, or set PHONE_SERIAL.' >&2; exit 1; }
  serial="${devices[0]}"
fi
adb_phone=(adb -H 127.0.0.1 -P "$port" -s "$serial")
export FITSWIPE_APP_VARIANT=development
export EXPO_PUBLIC_ROOMS_URL="${EXPO_PUBLIC_ROOMS_URL:-https://fitswipe-rooms-api.prompt-tem.workers.dev}"
if [[ "${1:-}" == --build ]]; then
  pnpm --dir mobile typecheck
  pnpm --dir mobile lint
  pnpm --dir mobile exec expo prebuild --platform android --no-install --no-clean
  bash mobile/android/gradlew -p mobile/android :app:assembleDebug -PreactNativeArchitectures="$("${adb_phone[@]}" shell getprop ro.product.cpu.abi | tr -d '\r')"
  "${adb_phone[@]}" install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk
fi
ssh "${ssh_opts[@]}" -N -T -R "127.0.0.1:$metro:127.0.0.1:$metro" "$host" &
tunnel=$!
trap 'kill "$tunnel" 2>/dev/null || true' EXIT
"${adb_phone[@]}" reverse "tcp:$metro" "tcp:$metro"
pnpm --dir mobile exec expo start --dev-client --localhost --port "$metro" &
bundler=$!
trap 'kill "$bundler" "$tunnel" 2>/dev/null || true' EXIT
for ((i=0; i<60; i++)); do
  kill -0 "$bundler" "$tunnel" 2>/dev/null || exit 1
  if link=$(curl -fsS "http://127.0.0.1:$metro/_expo/open?platform=android&runtime=custom" 2>/dev/null); then
    url=$(printf '%s' "$link" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>console.log(JSON.parse(s).url))')
    "${adb_phone[@]}" shell "am start -a android.intent.action.VIEW -d '$url' -p dev.local.fitlogsolo.expodev"
    wait "$bundler"
    exit $?
  fi
  sleep 1
done
echo 'Metro failed to start within 60 seconds.' >&2
exit 1
