#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Full deployment script for OVH VPS
# Usage: bash scripts/deploy.sh [--domain yourdomain.com] [--email admin@email.com]
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[$(date '+%H:%M:%S')] $*${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $*${NC}"; }
err()  { echo -e "${RED}[ERROR] $*${NC}"; exit 1; }

# ─── Args ─────────────────────────────────────────────────────────────────────
DOMAIN=""
EMAIL=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email)  EMAIL="$2";  shift 2 ;;
    *) warn "Unknown arg: $1"; shift ;;
  esac
done

# ─── Step 1: System deps ──────────────────────────────────────────────────────
log "Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq curl git ufw

# ─── Step 2: Docker ───────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | bash
  systemctl enable docker
  systemctl start docker
else
  log "Docker already installed: $(docker --version)"
fi

# ─── Step 3: Docker Compose ───────────────────────────────────────────────────
if ! docker compose version &>/dev/null; then
  log "Installing Docker Compose v2..."
  COMPOSE_VER=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f4)
  curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

# ─── Step 4: Firewall ─────────────────────────────────────────────────────────
log "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ─── Step 5: .env check ───────────────────────────────────────────────────────
log "Checking .env file..."
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    warn ".env created from .env.example — Please fill in the required values!"
    warn "Edit .env then re-run this script."
    exit 0
  else
    err ".env file not found and no .env.example"
  fi
fi

# ─── Step 6: SSL cert (if domain provided) ────────────────────────────────────
if [[ -n "$DOMAIN" && -n "$EMAIL" ]]; then
  log "Setting up SSL for $DOMAIN..."

  # Update nginx config with real domain
  sed -i "s/YOUR_DOMAIN.com/$DOMAIN/g" nginx/conf.d/app.conf

  # Start nginx on port 80 only first (for ACME challenge)
  docker compose up -d nginx

  # Request cert
  docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

  log "SSL certificate obtained!"
fi

# ─── Step 7: Build & start ────────────────────────────────────────────────────
log "Building Docker images..."
docker compose build --no-cache

log "Starting services..."
docker compose up -d

# ─── Step 8: Run migrations ───────────────────────────────────────────────────
log "Running Prisma migrations..."
docker compose exec app npx prisma migrate deploy

# ─── Step 9: Seed database (first run) ───────────────────────────────────────
if [[ "${SEED_DB:-false}" == "true" ]]; then
  log "Seeding database..."
  docker compose exec app npx prisma db seed
fi

# ─── Step 10: Health check ────────────────────────────────────────────────────
log "Waiting for app to be healthy..."
for i in {1..20}; do
  if curl -sf http://localhost:3000/api/health &>/dev/null; then
    log "✅ App is up!"
    break
  fi
  sleep 3
done

# ─── Done ─────────────────────────────────────────────────────────────────────
log "
╔══════════════════════════════════════════════╗
║  🚀 Deployment complete!                     ║
║                                              ║
║  App:   http://localhost:3000                ║
║  Admin: http://localhost:3000/admin          ║
╚══════════════════════════════════════════════╝
"
