# 🛍️ Mini E-Commerce — Documentation Technique

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Stack technique](#stack-technique)
4. [Structure du projet](#structure-du-projet)
5. [Schéma de base de données](#schéma-de-base-de-données)
6. [Tunnel de vente](#tunnel-de-vente)
7. [Système d'emails](#système-demails)
8. [Admin Dashboard](#admin-dashboard)
9. [API Routes](#api-routes)
10. [Variables d'environnement](#variables-denvironnement)
11. [Développement local](#développement-local)
12. [Déploiement OVH](#déploiement-ovh)

---

## Vue d'ensemble

Plateforme e-commerce complète avec :
- **Tunnel de vente optimisé** : Produit → Panier → Checkout Stripe → Confirmation → Upsell
- **Analytics funnel** : Tracking de chaque étape de conversion
- **Automatisation email** : Confirmation, expédition, livraison, panier abandonné (×2)
- **Admin dashboard** : Produits, commandes, mailing, analytics
- **Segmentation clients** : Acheteurs, abandons, visiteurs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (SSL)                          │
│                    :80 → :443 redirect                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Next.js App (:3000)                       │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │  Client Pages  │  │  Admin Pages   │  │  API Routes   │  │
│  │  (App Router)  │  │  (App Router)  │  │  (App Router) │  │
│  └────────────────┘  └────────────────┘  └───────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
┌──────▼───────┐   ┌───────▼──────┐   ┌───────▼──────┐
│  PostgreSQL  │   │    Stripe    │   │  Nodemailer  │
│  (Prisma)    │   │  (Payments)  │   │  (SMTP/OVH)  │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## Stack technique

| Layer | Tech | Version |
|-------|------|---------|
| Framework | Next.js App Router | 14.2.5 |
| Styling | Tailwind CSS + shadcn/ui | 3.4.6 |
| ORM | Prisma | 5.14.0 |
| DB | PostgreSQL | 16 |
| Paiements | Stripe | 16.2.0 |
| Email | Nodemailer (SMTP) | 6.9.14 |
| Auth | JWT + bcryptjs | — |
| Charts | Recharts | 2.12.7 |
| Animations | Framer Motion | 11.3.2 |
| Validation | Zod | 3.23.8 |
| Deploy | Docker + Nginx + Certbot | — |

---

## Structure du projet

```
ecommerce_project/
├── app/
│   ├── (client)/                  # Tunnel de vente (pages publiques)
│   │   ├── layout.tsx             # Wrap CartProvider
│   │   ├── page.tsx               # Page produit
│   │   ├── cart/page.tsx          # Panier
│   │   ├── checkout/page.tsx      # Formulaire checkout
│   │   ├── confirmation/page.tsx  # Confirmation + upsell initial
│   │   └── upsell/page.tsx        # Page upsell dédiée
│   ├── admin/                     # Dashboard admin (protégé)
│   │   ├── layout.tsx             # Guard auth
│   │   ├── login/page.tsx
│   │   ├── page.tsx               # Dashboard stats
│   │   ├── products/
│   │   │   ├── page.tsx           # Liste produits
│   │   │   ├── new/page.tsx       # Nouveau produit
│   │   │   └── [id]/edit/         # Modifier produit
│   │   ├── orders/page.tsx        # Commandes
│   │   ├── mailing/page.tsx       # Campagnes email
│   │   └── analytics/page.tsx     # Analytics funnel
│   ├── api/                       # API Routes
│   │   ├── products/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── stripe/
│   │   │   ├── checkout/
│   │   │   └── webhook/
│   │   ├── tracking/
│   │   ├── admin/
│   │   └── cron/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── admin/                     # Composants admin (client)
│   │   ├── Sidebar.tsx
│   │   ├── DashboardClient.tsx
│   │   ├── ProductsClient.tsx
│   │   ├── OrdersClient.tsx
│   │   ├── MailingClient.tsx
│   │   └── AnalyticsClient.tsx
│   ├── client/                    # Composants client
│   │   ├── CartProvider.tsx       # Context + useCart hook
│   │   └── ProductPageClient.tsx  # Page produit interactive
│   └── ui/                        # shadcn/ui components
├── lib/
│   ├── prisma.ts
│   ├── stripe.ts
│   ├── email.ts
│   ├── auth.ts
│   ├── tracking.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── nginx/
│   ├── nginx.conf
│   └── conf.d/app.conf
├── scripts/
│   ├── deploy.sh
│   └── cron.js
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Schéma de base de données

### Modèles principaux

```
Admin → AdminLog
Product → CartItem, OrderItem, FunnelEvent
Customer → Cart, Order
Cart → CartItem (1→N)
Order → OrderItem (1→N), EmailLog
```

### Statuts commande (OrderStatus)
- `PENDING` → Créée, paiement en attente
- `PAID` → Paiement confirmé par Stripe webhook
- `PROCESSING` → En préparation
- `SHIPPED` → Expédiée (déclenche email)
- `DELIVERED` → Livrée (déclenche email)
- `CANCELLED` → Annulée

### Événements tracking (EventType)
```
PAGE_VIEW → PRODUCT_VIEW → ADD_TO_CART → CHECKOUT_START
→ PAYMENT_SUCCESS / PAYMENT_FAILED
→ UPSELL_VIEW → UPSELL_ACCEPT / UPSELL_DECLINE
CART_ABANDON
```

---

## Tunnel de vente

```
/ (page produit)
  │  Track: PRODUCT_VIEW
  ▼
/cart
  │  Track: CHECKOUT_START
  ▼
/checkout (formulaire adresse)
  │  POST /api/stripe/checkout → Stripe Checkout Session
  ▼
Stripe Checkout (hébergé par Stripe)
  │  Webhook: checkout.session.completed
  │  → Order PAID, stock décrementé, email confirmation
  ▼
/confirmation?order=CMD-xxx
  │  Upsell affiché après 2s
  │  Track: PAYMENT_SUCCESS
  ▼
/upsell (optionnel)
  │  Compte à rebours 30min
  │  Track: UPSELL_VIEW / ACCEPT / DECLINE
```

---

## Système d'emails

### Emails transactionnels
| Trigger | Email envoyé |
|---------|-------------|
| Paiement confirmé | Confirmation de commande (avec récap items) |
| Statut → SHIPPED | Email d'expédition avec numéro de suivi |
| Statut → DELIVERED | Email de livraison + demande d'avis |

### Emails automatiques (paniers abandonnés)
| Délai | Email |
|-------|-------|
| +1h après abandon | Rappel doux + lien retour panier |
| +24h après abandon | Urgence + éventuelle réduction |

Le cron tourne toutes les heures via `scripts/cron.js` → `POST /api/cron/abandoned-carts`

### Campagnes mailing
Depuis le dashboard admin → **Mailing** :
- **Tous les clients** : Email à tous les clients enregistrés
- **Acheteurs** : Clients ayant passé au moins une commande
- **Paniers abandonnés** : Clients avec panier abandonné non converti
- **Visiteurs** : Clients sans commande

---

## Admin Dashboard

### Accès
URL : `/admin/login`  
Credentials : `ADMIN_EMAIL` / `ADMIN_PASSWORD` (définis dans `.env`)

### Sections
| Section | URL | Description |
|---------|-----|-------------|
| Dashboard | `/admin` | CA, stats, funnel, commandes récentes |
| Produits | `/admin/products` | CRUD produits, toggle actif |
| Commandes | `/admin/orders` | Liste, filtres, mise à jour statut |
| Mailing | `/admin/mailing` | Campagnes, historique emails |
| Analytics | `/admin/analytics` | Funnel, conversions, événements |

---

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/products` | — | Liste produits actifs |
| POST | `/api/products` | Admin | Créer produit |
| PATCH | `/api/products/[id]` | Admin | Modifier produit |
| DELETE | `/api/products/[id]` | Admin | Supprimer produit |
| GET | `/api/cart` | — | Panier par sessionId |
| POST | `/api/cart` | — | Ajouter/mettre à jour item |
| DELETE | `/api/cart` | — | Retirer item ou vider |
| GET | `/api/orders` | Admin | Toutes commandes |
| POST | `/api/orders` | — | Créer commande |
| PATCH | `/api/orders/[id]` | Admin | MAJ statut (→ email) |
| POST | `/api/stripe/checkout` | — | Créer session Stripe |
| POST | `/api/stripe/webhook` | Stripe | Traiter événements paiement |
| POST | `/api/tracking` | — | Enregistrer événement funnel |
| POST | `/api/admin/login` | — | Login admin |
| POST | `/api/admin/logout` | — | Logout admin |
| POST | `/api/admin/mailing` | Admin | Envoyer campagne |
| POST | `/api/cron/abandoned-carts` | Cron | Automatisation abandon |

---

## Variables d'environnement

Copier `.env.example` → `.env` :

```bash
# Base de données
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecommerce"

# Auth admin
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="SecurePassword123!"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# SMTP (OVH)
SMTP_HOST="ssl0.ovh.net"
SMTP_PORT="587"
SMTP_USER="contact@yourdomain.com"
SMTP_PASS="your-email-password"
SMTP_FROM="contact@yourdomain.com"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
CRON_SECRET="random-cron-secret"
```

---

## Développement local

```bash
# 1. Cloner et installer
npm install

# 2. Démarrer PostgreSQL (Docker)
docker run -d  --name ecommerce_db  -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ecommerce -p 5432:5432 postgres:16-alpine

# 3. Configurer .env
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. Migrations Prisma
npx prisma migrate dev

# 5. Seed (admin + produits démo)
npm run db:seed

# 6. Lancer le dev server
npm run dev
```

Accès :
- Boutique : http://localhost:3000
- Admin : http://localhost:3000/admin

### Stripe en dev
```bash
# Installer Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copier le webhook secret affiché dans STRIPE_WEBHOOK_SECRET
```

---

## Déploiement OVH

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour le guide complet.

Commande rapide :
```bash
# Sur le VPS OVH (Ubuntu 22.04+)
git clone https://github.com/yourrepo/ecommerce_project.git
cd ecommerce_project
cp .env.example .env
# Éditer .env
bash scripts/deploy.sh --domain yourdomain.com --email admin@yourdomain.com
```
