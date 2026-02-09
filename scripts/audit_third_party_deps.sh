#!/bin/bash
# Audit external dependencies used by frontend HTML/JS against an explicit host allowlist.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
ALLOWLIST_FILE="$SCRIPT_DIR/third_party_allowlist.txt"

if [ ! -f "$ALLOWLIST_FILE" ]; then
  echo "ALLOWLIST_MISSING=$ALLOWLIST_FILE"
  exit 1
fi

cd "$FRONTEND_DIR"

TMP_URLS="$(mktemp)"
TMP_HOSTS="$(mktemp)"
TMP_ALLOW="$(mktemp)"
TMP_UNKNOWN="$(mktemp)"

cleanup() {
  rm -f "$TMP_URLS" "$TMP_HOSTS" "$TMP_ALLOW" "$TMP_UNKNOWN"
}
trap cleanup EXIT

rg -o --no-filename "https://[^\"'[:space:])>]+" \
  ./*.html ./js/*.js \
  | sed 's/[",).;]*$//' \
  | sort -u > "$TMP_URLS"

if [ ! -s "$TMP_URLS" ]; then
  echo "THIRD_PARTY_URLS_FOUND=0"
  echo "THIRD_PARTY_AUDIT=PASS"
  exit 0
fi

awk -F/ '{print tolower($3)}' "$TMP_URLS" | sed '/^$/d' | sort -u > "$TMP_HOSTS"
sed '/^$/d' "$ALLOWLIST_FILE" | tr '[:upper:]' '[:lower:]' | sort -u > "$TMP_ALLOW"

comm -23 "$TMP_HOSTS" "$TMP_ALLOW" > "$TMP_UNKNOWN" || true

echo "THIRD_PARTY_URLS_FOUND=$(wc -l < "$TMP_URLS" | tr -d ' ')"
echo "THIRD_PARTY_HOSTS_FOUND=$(wc -l < "$TMP_HOSTS" | tr -d ' ')"

if [ -s "$TMP_UNKNOWN" ]; then
  echo "THIRD_PARTY_AUDIT=FAIL"
  echo "UNKNOWN_HOSTS_START"
  cat "$TMP_UNKNOWN"
  echo "UNKNOWN_HOSTS_END"
  exit 1
fi

echo "THIRD_PARTY_AUDIT=PASS"
