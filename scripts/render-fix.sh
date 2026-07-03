#!/usr/bin/env bash
# Repair the gymtracker Render web service when it is serving Express 404s instead of FastAPI.
#
# Prerequisites:
#   1. Create a Render API key: Dashboard → Account Settings → API Keys
#   2. export RENDER_API_KEY=rnd_...
#   3. Run: ./scripts/render-fix.sh
#
# This script:
#   - Finds the gymtracker service
#   - Prints current runtime / start command
#   - Patches to Python + uvicorn if misconfigured
#   - Triggers a fresh deploy
#   - Polls /api/health until JSON is returned

set -euo pipefail

API_BASE="https://api.render.com/v1"
SERVICE_NAME="${RENDER_SERVICE_NAME:-gymtracker}"
PUBLIC_URL="${PUBLIC_APP_URL:-https://gymtracker.onrender.com}"
BUILD_CMD='cd frontend && npm ci && npm run build && cd .. && pip install -r requirements.txt'
START_CMD='uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT'

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "ERROR: Set RENDER_API_KEY (Dashboard → Account Settings → API Keys)"
  echo "  export RENDER_API_KEY=rnd_your_key_here"
  exit 1
fi

auth_header() {
  printf 'Authorization: Bearer %s' "$RENDER_API_KEY"
}

echo "==> Listing Render services named '${SERVICE_NAME}'..."
services_json=$(curl -sf -H "$(auth_header)" \
  "${API_BASE}/services?name=${SERVICE_NAME}&limit=20")

service_id=$(echo "$services_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data:
    svc = item.get('service') or item
    if svc.get('name') == '${SERVICE_NAME}':
        print(svc['id'])
        break
" 2>/dev/null || true)

if [[ -z "$service_id" ]]; then
  echo "ERROR: No service named '${SERVICE_NAME}' found in your Render account."
  echo "       Create one from this repo's render.yaml (Blueprint sync) or check the name."
  exit 1
fi

echo "==> Found service id: ${service_id}"

echo "==> Fetching current service config..."
service_json=$(curl -sf -H "$(auth_header)" "${API_BASE}/services/${service_id}")
echo "$service_json" | python3 -c "
import json, sys
svc = json.load(sys.stdin)
details = svc.get('serviceDetails') or {}
print('  name:          ', svc.get('name'))
print('  type:          ', svc.get('type'))
print('  runtime:       ', details.get('runtime') or details.get('env'))
print('  repo:          ', svc.get('repo'))
print('  branch:        ', svc.get('branch'))
print('  buildCommand:  ', details.get('buildCommand', '(default)'))
print('  startCommand:  ', details.get('startCommand', '(default)'))
print('  healthCheck:   ', details.get('healthCheckPath', '(none)'))
"

current_runtime=$(echo "$service_json" | python3 -c "
import json, sys
svc = json.load(sys.stdin)
details = svc.get('serviceDetails') or {}
print(details.get('runtime') or details.get('env') or '')
")

current_start=$(echo "$service_json" | python3 -c "
import json, sys
svc = json.load(sys.stdin)
details = svc.get('serviceDetails') or {}
print(details.get('startCommand') or '')
")

needs_patch=false
if [[ "$current_runtime" != "python" ]]; then
  echo "!! Runtime is '${current_runtime}', expected 'python' — will patch"
  needs_patch=true
fi
if [[ "$current_start" != *"uvicorn backend.app.main"* ]]; then
  echo "!! startCommand does not run uvicorn — will patch"
  needs_patch=true
fi

if [[ "$needs_patch" == "true" ]]; then
  echo "==> Patching service to Python + uvicorn..."
  patch_payload=$(python3 -c "
import json
print(json.dumps({
  'serviceDetails': {
    'runtime': 'python',
    'buildCommand': '''${BUILD_CMD}''',
    'startCommand': '''${START_CMD}''',
    'healthCheckPath': '/api/health',
  }
}))
")
  curl -sf -X PATCH -H "$(auth_header)" -H "Content-Type: application/json" \
    -d "$patch_payload" \
    "${API_BASE}/services/${service_id}" >/dev/null
  echo "   Patched."
else
  echo "==> Service runtime/start command already look correct."
fi

echo "==> Triggering deploy (clearing build cache)..."
deploy_json=$(curl -sf -X POST -H "$(auth_header)" -H "Content-Type: application/json" \
  -d '{"clearCache":"clear"}' \
  "${API_BASE}/services/${service_id}/deploys")
deploy_id=$(echo "$deploy_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")
echo "   Deploy id: ${deploy_id:-queued}"

echo "==> Waiting for ${PUBLIC_URL}/api/health to return JSON (up to 10 min)..."
for i in $(seq 1 60); do
  body=$(curl -sf "${PUBLIC_URL}/api/health" 2>/dev/null || true)
  if echo "$body" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
    echo "SUCCESS: /api/health => ${body}"
    exit 0
  fi
  powered_by=$(curl -sI "${PUBLIC_URL}/api/health" 2>/dev/null | tr -d '\r' | awk -F': ' '/^[Xx]-[Pp]owered-[Bb]y:/{print $2}')
  echo "   attempt ${i}/60 — still waiting (x-powered-by: ${powered_by:-unknown})"
  sleep 10
done

echo "TIMEOUT: Health check did not return JSON. Check deploy logs in Render Dashboard."
exit 1
