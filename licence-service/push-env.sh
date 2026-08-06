#!/usr/bin/env bash
#
# Uploads .env.production to Vercel and redeploys.
#
# Vercel does not apply environment changes to a deployment that is already
# running, so the redeploy at the end is part of the job, not an extra step.

set -euo pipefail

cd "$(dirname "$0")"

ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo "No $ENV_FILE found."
  echo "Copy the template first:"
  echo
  echo "    cp .env.production.example .env.production"
  echo
  echo "then fill in your values and run this again."
  exit 1
fi

# Refuse to upload the template's dummy values - they would deploy a service
# that looks configured but fails on the first real request.
if grep -qE '=(rzp_test_xxxxxxxxxxxxx|xxxxxxxx)$' "$ENV_FILE"; then
  echo "$ENV_FILE still contains placeholder values (xxxxxxxx)."
  echo "Fill in every value before running this."
  exit 1
fi

echo "Uploading environment variables to Vercel..."

while IFS= read -r line || [ -n "$line" ]; do
  # Skip blanks and comments
  [[ -z "${line// }" || "$line" =~ ^[[:space:]]*# ]] && continue

  name="${line%%=*}"
  value="${line#*=}"

  [[ -z "$name" || -z "$value" ]] && continue

  # Replace any existing value rather than erroring on a second run
  npx vercel env rm "$name" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | npx vercel env add "$name" production >/dev/null

  echo "  set $name"
done < "$ENV_FILE"

echo
echo "Deploying..."
npx vercel deploy --prod

echo
echo "Checking configuration..."
sleep 5
curl -s "$(npx vercel inspect --json 2>/dev/null | grep -o 'https://[^"]*' | head -1)/api/health" || true
echo
echo "Done. Verify with:"
echo "    curl https://serpy-licence-service.vercel.app/api/health"
