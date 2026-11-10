#!/usr/bin/env bash
# Fuehrt alle automatischen Tests aus und fasst die Ergebnisse zusammen.
cd "$(dirname "$0")/.." || exit 1
status=0
for t in unit flow data extra native-sim; do
  out=$(node "tests/$t.js" 2>&1); rc=$?
  ok=$(printf '%s\n' "$out" | grep -c '^OK'); fail=$(printf '%s\n' "$out" | grep -c '^FAIL')
  printf '%-12s OK=%-3s FAIL=%-3s exit=%s\n' "$t" "$ok" "$fail" "$rc"
  [ "$rc" -ne 0 ] && { status=1; printf '%s\n' "$out" | grep -E '^FAIL|Konsolenfehler' ; }
done
for seed in 1 2 3; do node tests/monkey.js $seed || status=1; done
exit $status
