#!/bin/bash
# WS-FE-08: Frontend verification script
# Runs syntax checks and security audits for all JS files

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$FRONTEND_DIR"

PASS=0
FAIL=0

echo "=== TSTS Frontend Verification ==="
echo ""

# 1. Check for innerHTML usage (should be 0)
echo "1. Checking for innerHTML assignments..."
INNERHTML_COUNT=$(grep -rn "innerHTML\s*=" js/*.js 2>/dev/null | wc -l | tr -d ' ')
if [ "$INNERHTML_COUNT" -eq 0 ]; then
  echo "   ✅ PASS: No innerHTML assignments found"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL: Found $INNERHTML_COUNT innerHTML assignments"
  grep -rn "innerHTML\s*=" js/*.js 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi
echo ""

# 2. Check helper version marker exists
echo "2. Checking __TSTS_HELPERS_VERSION__ marker..."
if grep -q "__TSTS_HELPERS_VERSION__" js/common.js 2>/dev/null; then
  echo "   ✅ PASS: Helper version marker found"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL: Missing __TSTS_HELPERS_VERSION__ in common.js"
  FAIL=$((FAIL + 1))
fi
echo ""

# 3. Check tstsEl helper exists
echo "3. Checking tstsEl helper..."
if grep -q "window\.tstsEl\s*=" js/common.js 2>/dev/null; then
  echo "   ✅ PASS: tstsEl helper found"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL: Missing tstsEl in common.js"
  FAIL=$((FAIL + 1))
fi
echo ""

# 4. Check tstsSafeUrl helper exists
echo "4. Checking tstsSafeUrl helper..."
if grep -q "window\.tstsSafeUrl\s*=" js/common.js 2>/dev/null; then
  echo "   ✅ PASS: tstsSafeUrl helper found"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL: Missing tstsSafeUrl in common.js"
  FAIL=$((FAIL + 1))
fi
echo ""

# 5. Check tstsSafeImg helper exists
echo "5. Checking tstsSafeImg helper..."
if grep -q "window\.tstsSafeImg\s*=" js/common.js 2>/dev/null; then
  echo "   ✅ PASS: tstsSafeImg helper found"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL: Missing tstsSafeImg in common.js"
  FAIL=$((FAIL + 1))
fi
echo ""

# 6. Check tstsSafeMailto helper exists
echo "6. Checking tstsSafeMailto helper..."
if grep -q "window\.tstsSafeMailto\s*=" js/common.js 2>/dev/null; then
  echo "   ✅ PASS: tstsSafeMailto helper found"
  PASS=$((PASS + 1))
else
  echo "   ❌ FAIL: Missing tstsSafeMailto in common.js"
  FAIL=$((FAIL + 1))
fi
echo ""

# 7. Check common.js loads first in all HTML files
echo "7. Checking common.js load order in HTML files..."
LOAD_ORDER_FAIL=0
for html in *.html; do
  if grep -q 'src="js/' "$html" 2>/dev/null; then
    FIRST_JS=$(grep -m1 'src="js/[^"]*\.js' "$html" 2>/dev/null | sed 's/.*src="js\/\([^"?]*\).*/\1/' || echo "")
    if [ "$FIRST_JS" != "common.js" ]; then
      echo "   ❌ $html: First JS is '$FIRST_JS', not common.js"
      LOAD_ORDER_FAIL=1
    fi
  fi
done
if [ "$LOAD_ORDER_FAIL" -eq 0 ]; then
  echo "   ✅ PASS: common.js loads first in all HTML files"
  PASS=$((PASS + 1))
else
  FAIL=$((FAIL + 1))
fi
echo ""

# 8. JS syntax check (basic)
echo "8. Running JS syntax checks..."
SYNTAX_FAIL=0
for js in js/*.js; do
  if ! node --check "$js" 2>/dev/null; then
    echo "   ❌ Syntax error in $js"
    SYNTAX_FAIL=1
  fi
done
if [ "$SYNTAX_FAIL" -eq 0 ]; then
  echo "   ✅ PASS: All JS files pass syntax check"
  PASS=$((PASS + 1))
else
  FAIL=$((FAIL + 1))
fi
echo ""

# Summary
echo "=== Summary ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "❌ Verification FAILED"
  exit 1
else
  echo "✅ All checks PASSED"
  exit 0
fi
