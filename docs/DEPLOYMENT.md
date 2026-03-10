# 🚀 Guide de déploiement — OVH VPS

## Prérequis

- VPS OVH Ubuntu 22.04 (VPS Starter 2 Go RAM minimum recommandé)
- Nom de domaine pointant vers l'IP du VPS (A record)
- Compte Stripe avec clés API live
- Compte email OVH pour l'SMTP

---

## 1. Accès VPS & mise à jour

```bash
ssh root@YOUR_VPS_IP

# Mise à jour système
apt update && apt upgrade -y
apt install -y git curl ufw
```

---

## 2. Cloner le projet

```bash
cd /opt
git clone https://github.com/youruser/ecommerce_project.git
cd ecommerce_project
```

---

## 3. Configurer l'environnement

```bash
cp .env.example .env
nano .env
```

Remplir **toutes** les valeurs :

```env
DATABASE_URL="postgresql://postgres:STRONG_PASSWORD@postgres:5432/ecommerce"
POSTGRES_DB=ecommerce
POSTGRES_USER=postgres
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE

JWT_SECRET="generate-with: openssl rand -base64 32"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="SecureAdminPass123!"

STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."    # Récupérer après étape 7

SMTP_HOST="ssl0.ovh.net"
SMTP_PORT=587
SMTP_USER="contact@yourdomain.com"
SMTP_PASS="your-email-pass"
SMTP_FROM="contact@yourdomain.com"

NEXT_PUBLIC_APP_URL="https://yourdomain.com"
CRON_SECRET="$(openssl rand -hex 20)"
```

---

## 4. DNS — Pointer le domaine

Dans votre espace client OVH, créer/modifier les enregistrements DNS :

```
A    @            → YOUR_VPS_IP
A    www          → YOUR_VPS_IP
```

⚠️ La propagation DNS peut prendre jusqu'à 24h.

Vérifier : `dig +short yourdomain.com`

---

## 5. Déploiement automatique

```bash
chmod +x scripts/deploy.sh

# Déploiement avec SSL automatique
SEED_DB=true bash scripts/deploy.sh \
  --domain yourdomain.com \
  --email contact@yourdomain.com
```

Ce script :
1. Installe Docker + Docker Compose
2. Configure UFW (pare-feu)
3. Build les images Docker
4. Lance tous les services
5. Obtient le certificat SSL Let's Encrypt
6. Lance les migrations Prisma
7. Seed la base de données (si SEED_DB=true)

---

## 6. Vérifier les services

```bash
docker compose ps
# Tous les services doivent être "Up"

docker compose logs app --tail=50
docker compose logs nginx --tail=20
```

---

## 7. Configurer le webhook Stripe

Dans le dashboard Stripe → **Webhooks** → **Add endpoint** :

- URL : `https://yourdomain.com/api/stripe/webhook`
- Events à écouter :
  - `checkout.session.completed`
  - `payment_intent.payment_failed`
  - `checkout.session.expired`

Copier le **Signing secret** (`whsec_...`) dans `.env` → `STRIPE_WEBHOOK_SECRET`

Puis redémarrer :
```bash
docker compose restart app
```

---

## 8. Tester le déploiement

```bash
# Page boutique
curl -I https://yourdomain.com

# Health check
curl https://yourdomain.com/api/health

# Admin
open https://yourdomain.com/admin
```

---

## Maintenance

### Mise à jour de l'application

```bash
cd /opt/ecommerce_project
git pull origin main
docker compose build app
docker compose up -d app
docker compose exec app npx prisma migrate deploy
```

### Sauvegarde base de données

```bash
# Dump
docker compose exec postgres pg_dump -U postgres ecommerce > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U postgres ecommerce < backup_20241201.sql
```

### Logs

```bash
# App
docker compose logs app -f

# Nginx access
docker compose exec nginx tail -f /var/log/nginx/access.log

# Nginx errors
docker compose exec nginx tail -f /var/log/nginx/error.log

# Cron
docker compose logs cron -f
```

### Renouvellement SSL

Automatique via le service `certbot` dans docker-compose.yml (vérifie toutes les 12h).

Forcer le renouvellement :
```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

### Ressources VPS

```bash
# CPU / RAM
docker stats

# Espace disque
df -h

# Logs size
du -sh /var/lib/docker/containers/
```

---

## Résolution de problèmes

### App ne démarre pas
```bash
docker compose logs app --tail=100
# Vérifier les variables d'environnement dans .env
```

### Prisma connection error
```bash
# Vérifier que PostgreSQL est healthy
docker compose ps postgres
docker compose exec postgres pg_isready
```

### SSL cert error
```bash
# Vérifier que le DNS est bien propagé
dig +short yourdomain.com
# Doit retourner l'IP du VPS

# Re-tenter la certification
docker compose run --rm certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  --email your@email.com --agree-tos \
  -d yourdomain.com -d www.yourdomain.com
```

### Stripe webhook non reçu
```bash
# Tester le webhook manuellement
curl -X POST https://yourdomain.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{}'
# Doit retourner 400 (signature manquante), pas 404
```
