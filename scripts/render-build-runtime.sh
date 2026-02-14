#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_FILE="${ROOT_DIR}/js/runtime-config.js"

if [ ! -f "${RUNTIME_FILE}" ]; then
  echo "RUNTIME_CONFIG_FILE_MISSING=${RUNTIME_FILE}"
  exit 1
fi

API_BASE_RAW="${TSTS_API_BASE:-}"
if [ -z "${API_BASE_RAW}" ]; then
  echo "TSTS_API_BASE_MISSING=1"
  echo "Set TSTS_API_BASE in Render environment (example: https://tsts-backend.onrender.com)"
  exit 1
fi

API_BASE="$(printf '%s' "${API_BASE_RAW}" | sed -E 's/[[:space:]]+$//' | sed -E 's#/$##')"
if ! printf '%s' "${API_BASE}" | grep -Eq '^https://'; then
  echo "TSTS_API_BASE_INVALID=${API_BASE}"
  echo "TSTS_API_BASE must be an https:// origin."
  exit 1
fi

CLOUDINARY_RAW="${TSTS_CLOUDINARY_URL:-}"
CLOUDINARY_URL="$(printf '%s' "${CLOUDINARY_RAW}" | sed -E 's/[[:space:]]+$//')"

escape_sed() {
  printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

API_ESCAPED="$(escape_sed "${API_BASE}")"
CLOUDINARY_ESCAPED="$(escape_sed "${CLOUDINARY_URL}")"

TMP_FILE="$(mktemp)"
sed -e "s/__TSTS_API_BASE__/${API_ESCAPED}/g" \
    -e "s/__TSTS_CLOUDINARY_URL__/${CLOUDINARY_ESCAPED}/g" \
    "${RUNTIME_FILE}" > "${TMP_FILE}"
mv "${TMP_FILE}" "${RUNTIME_FILE}"

if grep -q "__TSTS_API_BASE__\\|__TSTS_CLOUDINARY_URL__" "${RUNTIME_FILE}"; then
  echo "RUNTIME_CONFIG_PLACEHOLDER_REMAINING=1"
  exit 1
fi

echo "RUNTIME_CONFIG_API_BASE=${API_BASE}"
if [ -n "${CLOUDINARY_URL}" ]; then
  echo "RUNTIME_CONFIG_CLOUDINARY_URL_SET=1"
else
  echo "RUNTIME_CONFIG_CLOUDINARY_URL_SET=0"
fi
