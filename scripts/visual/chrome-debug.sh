#!/usr/bin/env bash
# Launch a debug-enabled Chrome for the capture / live-visual tests — on a DEDICATED
# profile, so your everyday browser (and all its logins) is never exposed on the
# debug port. Runs ALONGSIDE your normal Chrome: no quit-and-relaunch dance.
#
#   npm run chrome:debug         # or: bash scripts/visual/chrome-debug.sh
#
# First run only: log into Duolingo in this window (and add Tampermonkey + install the
# userscript if you want to see the script's effect live). That profile persists, so
# every later launch is already logged in and already debuggable on localhost:9222.
#
# Then, with a lesson open:
#   node scripts/visual/capture.mjs     # record each challenge's DOM + masking styles
#   npm run visual:live                 # screenshot the script running on a real lesson
#
# Override via env: PORT, CHROME_DEV_PROFILE, CHROME_BIN.
set -euo pipefail

PORT="${PORT:-9222}"
PROFILE="${CHROME_DEV_PROFILE:-$HOME/.chrome-duo-dev}"
CHROME="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

if [ ! -x "$CHROME" ]; then
  echo "Chrome not found at: $CHROME" >&2
  echo "Set CHROME_BIN to your Chrome binary and retry." >&2
  exit 1
fi

mkdir -p "$PROFILE"
echo "Launching debug Chrome  →  port=$PORT  profile=$PROFILE"
echo "(first run: log into Duolingo here; it sticks. Your main Chrome is untouched.)"
echo "(first run: install Tampermonkey + the script, then chrome://extensions →"
echo " Developer mode → Tampermonkey → Allow User Scripts, or the script won't run.)"

# `open -na` starts a NEW, detached instance (survives this terminal). The dedicated
# --user-data-dir makes it a separate instance, so the debug flag actually applies
# even while your normal Chrome is running.
open -na "$CHROME" --args \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --no-default-browser-check \
  "https://www.duolingo.com/learn"

echo "Up on http://localhost:$PORT  — open a Russian lesson, then run a capture."
