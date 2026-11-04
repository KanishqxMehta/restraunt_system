#!/bin/sh
set -eu

# A persistent, random local signing key avoids committing a working secret.
if [ -z "${BETTER_AUTH_SECRET:-}" ]; then
  mkdir -p /app/.runtime
  if [ ! -s /app/.runtime/auth-secret ]; then
    (umask 077; node -e 'process.stdout.write(require("node:crypto").randomBytes(48).toString("base64url"))' > /app/.runtime/auth-secret)
  fi
  BETTER_AUTH_SECRET="$(cat /app/.runtime/auth-secret)"
  export BETTER_AUTH_SECRET
fi
npm run db:deploy
if [ "${ENABLE_DEMO_DATA:-false}" = "true" ]; then
  npm run db:seed
fi
exec "$@"
