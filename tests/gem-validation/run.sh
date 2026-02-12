#!/bin/bash
# Run gem-validation tests
#
# Tests that fixtures named pass-* pass all checks
# and fixtures named fail-* fail at least one check.
#
# Usage: bash tests/gem-validation/run.sh

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
VALIDATOR="$DIR/validate.js"
FIXTURES="$DIR/fixtures"
ERRORS=0

echo "=== Gem Output Validation Tests ==="
echo ""

# --- pass-* fixtures should exit 0 ---
for f in "$FIXTURES"/pass-*.json; do
    [ -f "$f" ] || continue
    name="$(basename "$f")"
    if node "$VALIDATOR" "$f" > /dev/null 2>&1; then
        echo "  OK   $name  (expected pass, got pass)"
    else
        echo "  FAIL $name  (expected pass, got FAIL)"
        node "$VALIDATOR" "$f" 2>&1 | sed 's/^/       /'
        ERRORS=$((ERRORS + 1))
    fi
done

# --- fail-* fixtures should exit 1 ---
for f in "$FIXTURES"/fail-*.json; do
    [ -f "$f" ] || continue
    name="$(basename "$f")"
    if node "$VALIDATOR" "$f" > /dev/null 2>&1; then
        echo "  FAIL $name  (expected fail, got PASS)"
        ERRORS=$((ERRORS + 1))
    else
        echo "  OK   $name  (expected fail, got fail)"
    fi
done

echo ""
if [ "$ERRORS" -eq 0 ]; then
    echo "All tests passed."
    exit 0
else
    echo "$ERRORS test(s) failed."
    exit 1
fi
