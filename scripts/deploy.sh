#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

RELEASE_DIR="${RELEASE_DIR:-$(pwd)}"
CURRENT_SYMLINK="${CURRENT_SYMLINK:-/opt/virtual-run-beard/current}"
WEB_SERVICE="${WEB_SERVICE:-virtual-run-beard-web.service}"
BACKEND_SERVICE="${BACKEND_SERVICE:-virtual-run-beard-backend.service}"
WORKER_SERVICE="${WORKER_SERVICE:-virtual-run-beard-worker.service}"

if [[ "${DEPLOY_CONFIRM:-}" != "I_HAVE_REVIEWED_THIS_RELEASE" ]]; then
  log "Set DEPLOY_CONFIRM=I_HAVE_REVIEWED_THIS_RELEASE before deploying"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  log "Missing required command: pnpm"
  exit 1
fi

log "Installing dependencies"
pnpm install --frozen-lockfile

log "Running quality gates"
pnpm typecheck
pnpm test:unit
pnpm build

log "Applying database migrations"
pnpm db:migrate

log "Updating current symlink"
ln -sfn "$RELEASE_DIR" "$CURRENT_SYMLINK"

log "Restarting services"
systemctl restart "$BACKEND_SERVICE"
systemctl restart "$WEB_SERVICE"
systemctl restart "$WORKER_SERVICE"

log "Deployment completed"
