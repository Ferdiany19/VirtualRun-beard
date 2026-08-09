#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-virtual-run-beard}"
APP_ROOT="${APP_ROOT:-/opt/virtual-run-beard/current}"
BACKEND_ENV="${BACKEND_ENV:-/etc/virtual-run-beard/backend.env}"
WEB_ENV="${WEB_ENV:-/etc/virtual-run-beard/web.env}"

WEB_SERVICE="${WEB_SERVICE:-virtual-run-beard-web}"
BACKEND_SERVICE="${BACKEND_SERVICE:-virtual-run-beard-backend}"
WORKER_SERVICE="${WORKER_SERVICE:-virtual-run-beard-worker}"

BRANCH="${1:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/update-production.sh"
  exit 1
fi

if [[ ! -d "$APP_ROOT/.git" ]]; then
  echo "Git repository not found at $APP_ROOT"
  exit 1
fi

if [[ ! -f "$BACKEND_ENV" ]]; then
  echo "Backend env not found: $BACKEND_ENV"
  exit 1
fi

if [[ ! -f "$WEB_ENV" ]]; then
  echo "Web env not found: $WEB_ENV"
  exit 1
fi

run_as_app() {
  sudo -u "$APP_USER" bash -lc "$*"
}

echo "==> Stop web service"
systemctl stop "$WEB_SERVICE"

echo "==> Fix release ownership"
chown -R "$APP_USER:$APP_USER" "$(readlink -f "$APP_ROOT")"

echo "==> Pull latest code"
if [[ -n "$BRANCH" ]]; then
  run_as_app "cd '$APP_ROOT' && git pull origin '$BRANCH'"
else
  run_as_app "cd '$APP_ROOT' && git pull"
fi

echo "==> Install dependencies"
run_as_app "cd '$APP_ROOT' && corepack pnpm install --frozen-lockfile"

echo "==> Build backend"
run_as_app "set -a && . '$BACKEND_ENV' && set +a && cd '$APP_ROOT' && corepack pnpm --filter backend build"

echo "==> Run database migrations"
run_as_app "set -a && . '$BACKEND_ENV' && set +a && cd '$APP_ROOT' && corepack pnpm db:migrate"

echo "==> Clean frontend build output"
rm -rf "$APP_ROOT/frontend/.next"
chown -R "$APP_USER:$APP_USER" "$APP_ROOT/frontend"

echo "==> Build frontend"
run_as_app "set -a && . '$WEB_ENV' && set +a && cd '$APP_ROOT' && corepack pnpm --filter frontend build"

echo "==> Restart services"
systemctl restart "$BACKEND_SERVICE"
systemctl restart "$WORKER_SERVICE"
systemctl start "$WEB_SERVICE"

echo "==> Health checks"
systemctl --no-pager --quiet is-active "$BACKEND_SERVICE"
systemctl --no-pager --quiet is-active "$WORKER_SERVICE"
systemctl --no-pager --quiet is-active "$WEB_SERVICE"
curl -fsS -I http://127.0.0.1:3000 >/dev/null
curl -fsS -I http://127.0.0.1:3001/api/health >/dev/null

echo "Deployment update completed."
