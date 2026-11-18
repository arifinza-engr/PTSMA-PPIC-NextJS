#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/root/PTSMA-PPIC-NextJS"
NODE_BIN="/root/.nvm/versions/node/v24.22.2/bin"

cd "$APP_DIR"
[[ -f .env ]] || { echo "Missing VPS .env; refusing to build." >&2; exit 1; }

export PATH="$NODE_BIN:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Apply the versioned schema migrations against the VPS database configured in its local
# .env file. This changes schema/master metadata only; it never imports the local database.
install -m 644 deploy/ppic-nextjs.service /etc/systemd/system/ppic-nextjs.service
systemctl daemon-reload
npm ci --no-audit --no-fund
npm run build
systemctl stop ppic-nextjs.service || true
if ! npm run db:migrate; then
  echo "Database migration failed; attempting to start the existing service." >&2
  systemctl start ppic-nextjs.service || true
  exit 1
fi
systemctl enable ppic-nextjs.service >/dev/null
systemctl restart ppic-nextjs.service
systemctl is-active --quiet ppic-nextjs.service

for attempt in {1..15}; do
  if curl --fail --silent http://127.0.0.1:3000/api/auth/session -o /dev/null; then
    echo "Deployment succeeded: $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 2
done

echo "Application did not become healthy after restart." >&2
journalctl -u ppic-nextjs.service -n 50 --no-pager >&2
exit 1
