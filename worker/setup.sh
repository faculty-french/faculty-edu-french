#!/usr/bin/env bash
# One-shot setup/deploy for the Telegram relay Worker.
#
#   1. npm install -g wrangler   (once)
#   2. wrangler login            (once — interactive, needs a browser)
#   3. ./worker/setup.sh
#
# Reads the real secrets from worker/.dev.vars (gitignored, chmod 600) and pushes
# them to Cloudflare as encrypted secrets. The token is never echoed, never passed
# as a command-line argument (which would leak it into the process list), and never
# written to a tracked file.
set -euo pipefail

WORKER_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$WORKER_DIR/.." && pwd)"
ENV_FILE="$WORKER_DIR/.dev.vars"
TOML="$WORKER_DIR/wrangler.toml"

command -v wrangler >/dev/null 2>&1 || { echo "error: wrangler not found. Run: npm install -g wrangler" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "error: $ENV_FILE not found. Copy .dev.vars.example and fill in the real values." >&2; exit 1; }

# Parse KEY="value" without sourcing the file.
get_var() { sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" "$ENV_FILE" | head -1; }
BOT_TOKEN="$(get_var TELEGRAM_BOT_TOKEN)"
WEBHOOK_SECRET="$(get_var TELEGRAM_WEBHOOK_SECRET)"
ADMIN_PASSWORD="$(get_var ADMIN_PASSWORD)"
GITHUB_TOKEN="$(get_var GITHUB_TOKEN)"

[[ -n "$BOT_TOKEN"      ]] || { echo "error: TELEGRAM_BOT_TOKEN missing from $ENV_FILE" >&2; exit 1; }
[[ -n "$WEBHOOK_SECRET" ]] || { echo "error: TELEGRAM_WEBHOOK_SECRET missing from $ENV_FILE" >&2; exit 1; }

cd "$WORKER_DIR"

# ---------------------------------------------------------------- KV namespace
if grep -q '<FILL-IN-AFTER-kv-namespace-create>' "$TOML"; then
  echo "==> Creating KV namespace SUBSCRIBERS"
  KV_OUT="$(wrangler kv namespace create SUBSCRIBERS 2>&1)" || { echo "$KV_OUT" >&2; exit 1; }
  KV_ID="$(printf '%s' "$KV_OUT" | grep -oE '(id = "|"id": ")[0-9a-f]{32}' | grep -oE '[0-9a-f]{32}' | head -1)"
  [[ -n "$KV_ID" ]] || { echo "error: could not parse the namespace id from:" >&2; echo "$KV_OUT" >&2; exit 1; }
  sed -i "s|<FILL-IN-AFTER-kv-namespace-create>|$KV_ID|" "$TOML"
  echo "    namespace id $KV_ID written to wrangler.toml"
else
  echo "==> KV namespace already configured in wrangler.toml"
fi

# -------------------------------------------------------------------- secrets
echo "==> Uploading encrypted secrets"
printf '%s' "$BOT_TOKEN"      | wrangler secret put TELEGRAM_BOT_TOKEN      >/dev/null
printf '%s' "$WEBHOOK_SECRET" | wrangler secret put TELEGRAM_WEBHOOK_SECRET >/dev/null
echo "    TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET stored on Cloudflare"
# Admin editing (optional — only stored when present in .dev.vars)
if [[ -n "$ADMIN_PASSWORD" ]]; then
  printf '%s' "$ADMIN_PASSWORD" | wrangler secret put ADMIN_PASSWORD >/dev/null
  echo "    ADMIN_PASSWORD stored on Cloudflare"
fi
if [[ -n "$GITHUB_TOKEN" ]]; then
  printf '%s' "$GITHUB_TOKEN" | wrangler secret put GITHUB_TOKEN >/dev/null
  echo "    GITHUB_TOKEN stored on Cloudflare"
fi

# --------------------------------------------------------------------- deploy
echo "==> Deploying Worker"
DEPLOY_OUT="$(wrangler deploy 2>&1)" || { echo "$DEPLOY_OUT" >&2; exit 1; }
echo "$DEPLOY_OUT" | tail -12
WORKER_URL="$(printf '%s' "$DEPLOY_OUT" | grep -oE 'https://[a-z0-9.-]+\.workers\.dev' | head -1)"
[[ -n "$WORKER_URL" ]] || { echo "error: could not parse the Worker URL from the deploy output above." >&2; exit 1; }
echo "    deployed at $WORKER_URL"

# --------------------------------------------------------------------- webhook
echo "==> Registering the Telegram webhook"
HOOK_RES="$(curl -sS -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H 'Content-Type: application/json' \
  -d "{\"url\":\"${WORKER_URL}/telegram/webhook\",\"secret_token\":\"${WEBHOOK_SECRET}\",\"allowed_updates\":[\"message\"]}")"
printf '%s\n' "$HOOK_RES" | sed -E "s|bot[0-9]+:[A-Za-z0-9_-]+|bot***REDACTED***|g"
printf '%s' "$HOOK_RES" | grep -q '"ok":true' || { echo "error: setWebhook failed (see above)." >&2; exit 1; }

# ------------------------------------------------- point the website at the relay
CONFIG="$ROOT_DIR/src/config/config.js"
if ! grep -q "$WORKER_URL" "$CONFIG"; then
  echo "==> Pointing the website at $WORKER_URL"
  # Replace only the quoted fallback URL on the RELAY_URL line. Done in node because
  # the pattern itself contains "||" and "/", which collide with sed's delimiters.
  node -e '
    const fs = require("fs");
    const [file, url] = process.argv.slice(1);
    const src = fs.readFileSync(file, "utf8");
    const out = src.replace(/(RELAY_URL:[^\n]*\|\|\s*")[^"]*(")/, `$1${url}$2`)
                   .replace(/(RELAY_URL:[^\n]*\|\|\s*'"'"')[^'"'"']*('"'"')/, `$1${url}$2`);
    if (out === src) { console.error("warning: RELAY_URL not patched; set it by hand in " + file); process.exit(0); }
    fs.writeFileSync(file, out);
  ' "$CONFIG" "$WORKER_URL"
  grep -n 'RELAY_URL' "$CONFIG"
fi

cat <<EOF

Done.
  Worker:  $WORKER_URL
  Health:  curl $WORKER_URL/health

Next:
  1. Open the bot in Telegram and send /start  (every person who does this
     receives all submissions; /stop unsubscribes, /status shows the count).
  2. Rebuild and redeploy the website so it points at the relay:
       npm run build
EOF
