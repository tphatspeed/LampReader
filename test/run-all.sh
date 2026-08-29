#!/usr/bin/env bash
# Chạy TOÀN BỘ bộ kiểm thử của Lamp bằng một lệnh.
#
#     bash test/run-all.sh
#
# Gồm hai nhóm:
#   • chạy bằng Node  — logic thuần, môi trường service worker, toàn vẹn gói
#   • chạy trong Chrome headless — giao diện thật, Shadow DOM, sự kiện thật
#
# Nhóm thứ hai cần một server tĩnh; script tự bật rồi tự tắt.
set -u
cd "$(dirname "$0")/.."

PORT="${LAMP_TEST_PORT:-8899}"
declare -i TOTAL_FAIL=0

echo "══ chạy bằng Node ══"
for suite in qa serviceworker engine i18n; do
  out="$(node "test/$suite.test.js" 2>&1)"
  line="$(printf '%s\n' "$out" | grep -E '[0-9]+ passed' | tail -1)"
  if printf '%s\n' "$out" | grep -qE ', 0 failed'; then
    printf '✓ %-14s %s\n' "$suite" "$line"
  else
    printf '✗ %-14s %s\n' "$suite" "${line:-KHÔNG CHẠY ĐƯỢC}"
    printf '%s\n' "$out" | grep -E '^\s*(FAIL|THROWN)' | sed 's/^/      /'
    TOTAL_FAIL+=1
  fi
done

echo
echo "══ chạy trong Chrome headless ══"
SERVER_PID=""
if ! curl -sf -o /dev/null "http://localhost:$PORT/test/harness.html"; then
  python3 test/serve.py "$PORT" >/dev/null 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 40); do
    curl -sf -o /dev/null "http://localhost:$PORT/test/harness.html" && break
    sleep 0.25
  done
fi
node test/run-browser.js || TOTAL_FAIL+=1
[ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null

echo
if [ "$TOTAL_FAIL" -eq 0 ]; then echo "TẤT CẢ XANH."; else echo "CÓ $TOTAL_FAIL NHÓM ĐỎ."; fi
exit "$TOTAL_FAIL"
