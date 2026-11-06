#!/usr/bin/env bash
# ينشر ملفات قاعدة بيانات الأقضية على الخادم المشترك في Cloudflare (المسار /v1/db/)،
# فيقرأها الموقع والتطبيق والباحثون حتى لو كان مستودع الكود خاصاً.
#
# يعمل داخل GitHub Actions فقط: الهوية رمز OIDC يصدره GitHub لهذا المستودع
# (يحتاج permissions: id-token: write)، فلا توجد أي كلمة سر لحفظها.
#
#   bash etl/publish_worker.sh <مجلد الملفات>
set -euo pipefail

DIR="${1:?usage: publish_worker.sh <dir>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$(sed -nE 's/^ECO\.GEMINI_PROXY *= *"([^"]+)".*/\1/p' "$ROOT/js/server.js" | head -1)"
BASE="${BASE%/}"
[ -n "$BASE" ] || { echo "::error::No Worker URL found in js/server.js (ECO.GEMINI_PROXY)."; exit 1; }
[ -n "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" ] || { echo "::error::OIDC is not available. Add 'id-token: write' to the workflow permissions."; exit 1; }

VER="$(date -u +%Y%m%d-%H%M%S)-${GITHUB_RUN_ID:-0}-${GITHUB_RUN_ATTEMPT:-1}"
MAX=$((25 * 1024 * 1024))

token() {
  curl -fsS -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=ecobio-db" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["value"])'
}

cd "$DIR"
mapfile -t FILES < <(find . -type f ! -path './.git/*' | sed 's|^\./||' | LC_ALL=C sort)
[ "${#FILES[@]}" -gt 0 ] || { echo "::error::Nothing to publish in $DIR"; exit 1; }
[ -f ecobio-meta.json ] || { echo "::error::ecobio-meta.json is missing in $DIR"; exit 1; }

echo "Publishing ${#FILES[@]} files to $BASE/v1/db/ as version $VER"
total=0
for f in "${FILES[@]}"; do
  size=$(stat -c %s "$f")
  if [ "$size" -gt "$MAX" ]; then echo "::error::$f is $size bytes; Workers KV allows at most 25 MiB per file."; exit 1; fi
  if ! curl -sS --fail-with-body --retry 3 --retry-delay 5 --retry-all-errors -o "$RUNNER_TEMP/db-up.json" \
    -X PUT -H "Authorization: Bearer $(token)" -H "Content-Type: application/octet-stream" \
    --data-binary "@$f" "$BASE/v1/db/_up/$VER/$f"; then
    echo "::error::Upload failed for $f: $(cat "$RUNNER_TEMP/db-up.json" 2>/dev/null)"; exit 1
  fi
  total=$((total + size))
done

python3 -c 'import json,sys; print(json.dumps({"files": sys.argv[1:]}))' "${FILES[@]}" > "$RUNNER_TEMP/db-manifest.json"
curl -sS --fail-with-body --retry 3 --retry-delay 5 --retry-all-errors \
  -X POST -H "Authorization: Bearer $(token)" -H "Content-Type: application/json" \
  --data-binary "@$RUNNER_TEMP/db-manifest.json" "$BASE/v1/db/_commit/$VER"
echo
echo "Published $(numfmt --to=iec "$total") — live at $BASE/v1/db/ecobio-meta.json"
