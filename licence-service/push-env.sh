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
# that looks configured but fails on the first real request. Report which
# variable names still need real values (never the values themselves - that
# would print secrets to the terminal).
unfilled=()
while IFS= read -r line || [ -n "$line" ]; do
  [[ -z "${line// }" || "$line" =~ ^[[:space:]]*# ]] && continue

  name="${line%%=*}"
  value="${line#*=}"
  [[ -z "$name" ]] && continue

  # Template placeholders are runs of x's, or the literal USER:PASSWORD stand-in
  if [[ "$value" =~ [xX]{3,} || "$value" == *"USER:PASSWORD"* ]]; then
    unfilled+=("$name")
  fi
done < "$ENV_FILE"

if [ "${#unfilled[@]}" -gt 0 ]; then
  echo "These still have placeholder values in $ENV_FILE:"
  printf '  - %s\n' "${unfilled[@]}"
  echo
  echo "Open the file, replace those with your real values, then run this again."
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
