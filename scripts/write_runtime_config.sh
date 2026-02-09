#!/bin/bash
# Generate frontend runtime config from environment variables.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
OUT_FILE="$FRONTEND_DIR/js/runtime-config.js"

API_BASE="${TSTS_API_BASE:-}"
CLOUDINARY_URL="${TSTS_CLOUDINARY_URL:-}"

cat > "$OUT_FILE" <<EOF_CFG
/* Auto-generated runtime configuration. */
(function () {
  window.__TSTS_RUNTIME_CONFIG__ = Object.freeze({
    API_BASE: "$(printf '%s' "$API_BASE" | sed 's/\\/\\\\/g; s/"/\\"/g')",
    CLOUDINARY_URL: "$(printf '%s' "$CLOUDINARY_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  });
  window.__TSTS_RUNTIME__ = Object.freeze({
    apiBase: String(window.__TSTS_RUNTIME_CONFIG__.API_BASE || "").trim().replace(/\/$/, ""),
    cloudinaryUrl: String(window.__TSTS_RUNTIME_CONFIG__.CLOUDINARY_URL || "").trim()
  });
})();
EOF_CFG

echo "RUNTIME_CONFIG_WRITTEN=$OUT_FILE"
