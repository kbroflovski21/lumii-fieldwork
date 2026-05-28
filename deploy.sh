#!/bin/bash
set -e

# ── GoldenYears Dashboard — Staging Deploy Script ──
# Usage: ./deploy.sh
#
# This script deploys the dashboard to the staging server.
# It NEVER overwrites the staging .env file.

STAGING_HOST="ubuntu@124.221.48.52"
STAGING_DIR="/home/ubuntu/lumii-goldenyears-dashboard"
STAGING_LOG="/tmp/lumii-gy-dashboard.log"

echo "=== GoldenYears Dashboard Staging Deploy ==="

# 1. Build frontend
echo "[1/5] Building frontend..."
npx vite build

# 2. Sync files (excluding .env, node_modules, .git, local dev files)
echo "[2/5] Syncing files to staging..."
rsync -az --delete \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='generated' \
  --exclude='*.log' \
  --exclude='.claude' \
  server/ "$STAGING_HOST:$STAGING_DIR/server/"

rsync -az --delete \
  dist/ "$STAGING_HOST:$STAGING_DIR/dist/"

rsync -az \
  --exclude='.env' \
  prisma/schema.prisma "$STAGING_HOST:$STAGING_DIR/prisma/schema.prisma"

rsync -az \
  prisma/seed.ts "$STAGING_HOST:$STAGING_DIR/prisma/seed.ts"

# 3. Generate Prisma client + push schema on staging
echo "[3/5] Syncing database schema..."
ssh "$STAGING_HOST" "
  cd $STAGING_DIR
  npx prisma generate --schema prisma/schema.prisma 2>&1 | tail -1
  npx prisma db push --schema prisma/schema.prisma --accept-data-loss --url \"\$(grep DATABASE_URL .env | cut -d'\"' -f2)\" 2>&1 | tail -2
"

# 4. Restart server
echo "[4/5] Restarting server..."
ssh "$STAGING_HOST" "
  fuser -k 3004/tcp 2>/dev/null || true
  sleep 1
  cd $STAGING_DIR
  nohup npx tsx server/index.ts > $STAGING_LOG 2>&1 &
  sleep 4
  if curl -sf http://127.0.0.1:3004/api/health > /dev/null; then
    echo '  ✓ Server healthy'
  else
    echo '  ✗ Server health check failed!'
    tail -10 $STAGING_LOG
    exit 1
  fi
"

# 5. Verify
echo "[5/5] Verifying..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://stage-gy.lumii-ai.cn/api/health)
if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✓ https://stage-gy.lumii-ai.cn/api/health → 200"
else
  echo "  ✗ Health check returned $HTTP_CODE"
  exit 1
fi

echo ""
echo "=== Deploy complete ==="
echo "  Dashboard: https://stage-gy.lumii-ai.cn/"
echo "  Server log: ssh $STAGING_HOST tail -f $STAGING_LOG"
