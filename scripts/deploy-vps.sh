#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/root/PTSMA-PPIC-NextJS"
NODE_BIN="/root/.nvm/versions/node/v24.22.2/bin"

cd "$APP_DIR"
[[ -f .env ]] || { echo "Missing VPS .env; refusing to build." >&2; exit 1; }

export PATH="$NODE_BIN:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Keep runtime and schema migration files in sync through Git. Intentionally do not run
# npm run db:migrate and do not copy, export, or import database data during deployment.
install -m 644 deploy/ppic-nextjs.service /etc/systemd/system/ppic-nextjs.service
systemctl daemon-reload
npm ci --no-audit --no-fund
npm run build
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