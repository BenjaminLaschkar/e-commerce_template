# 🤖 AI Agent — Guide de continuation du projet

## Contexte du projet

Mini site e-commerce Next.js 14 App Router avec :
- Tunnel de vente : `/` → `/cart` → `/checkout` → Stripe → `/confirmation` → `/upsell`
- Dashboard admin : `/admin` (protégé JWT)
- Base de données PostgreSQL via Prisma ORM
- Paiements Stripe (checkout sessions + webhooks)
- Emails SMTP via Nodemailer (OVH)
- Tracking funnel en base de données
- Déployable via Docker + Nginx sur OVH VPS

---

## Architecture à retenir

### Server vs Client components
- **Pages admin** = Server Components → fetcher data → passer à `*Client.tsx`
- **Pages client** = Mix (page.tsx server + `ProductPageClient.tsx` client)
- **CartProvider** = Context client, wrappé dans `app/(client)/layout.tsx`
- **API Routes** = Toujours dans `app/api/`

### Auth admin
- Cookie HTTP-only `admin_token` = JWT signé avec `JWT_SECRET`
- Helpers : `getCurrentAdmin()` (server components), `getAdminFromRequest(req)` (API routes)
- Guard dans `app/admin/layout.tsx`

### Tracking
- Appeler `POST /api/tracking` avec `{ sessionId, event, productId?, metadata? }`
- `sessionId` vient du localStorage (généré par `CartProvider`)
- Events : `PAGE_VIEW | PRODUCT_VIEW | ADD_TO_CART | CHECKOUT_START | PAYMENT_SUCCESS | PAYMENT_FAILED | CART_ABANDON | UPSELL_VIEW | UPSELL_ACCEPT | UPSELL_DECLINE`

### Stripe flow
1. `POST /api/stripe/checkout` → crée session Stripe + Order PENDING
2. Redirect client → Stripe
3. Webhook `checkout.session.completed` → Order PAID, stock --, email confirmation
4. Redirect vers `/confirmation?order=CMD-xxx&session_id=...`

---

## Fichiers clés à connaître

| Fichier | Rôle |
|---------|------|
| `prisma/schema.prisma` | Schéma DB complet |
| `lib/email.ts` | Toutes les fonctions email |
| `lib/auth.ts` | JWT + bcrypt + cookies |
| `lib/tracking.ts` | trackEvent, getFunnelStats |
| `components/client/CartProvider.tsx` | Cart context + useCart hook |
| `app/api/stripe/webhook/route.ts` | Logique post-paiement |

---

## Patterns de code à respecter

### Nouveau composant admin
```tsx
// app/admin/nouvelle-section/page.tsx (server)
import prisma from '@/lib/prisma'
import NouvelleClient from './NouvelleClient'

export default async function Page() {
  const data = await prisma.model.findMany()
  return <NouvelleClient data={data} />
}

// app/admin/nouvelle-section/NouvelleClient.tsx (client)
'use client'
import AdminSidebar from '@/components/admin/Sidebar'
// ...
```

### Nouvelle API route (admin protégée)
```ts
import { getAdminFromRequest } from '@/lib/auth'

export async function POST(req: Request) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  // ...
}
```

### Nouveau produit avec tracking
```tsx
const { sessionId } = useCart()

useEffect(() => {
  if (!sessionId) return
  fetch('/api/tracking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, event: 'PRODUCT_VIEW', productId: id }),
  })
}, [sessionId])
```

---

## Améliorations possibles (futures itérations)

### Features
- [ ] Système de codes promo / coupons (modèle `Coupon` à ajouter)
- [ ] Galerie multi-produits (actuellement 1 produit → homepage)
- [ ] Avis clients réels (modèle `Review`)
- [ ] Affiliés / programme de parrainage
- [ ] PDF de facture automatique joint à l'email confirmation
- [ ] Upload d'images vers S3/Cloudinary (actuellement URLs externes)
- [ ] Recherche produits (Elasticsearch ou PG full-text)
- [ ] Récupération de panier avec URL unique (lien email abandon cart)

### Performance
- [ ] Redis pour le cache des stats dashboard
- [ ] Edge runtime pour `/api/tracking` (volume élevé)
- [ ] Images Next.js `<Image>` avec domaines whitelist dans `next.config.js`

### Monitoring
- [ ] Sentry pour les erreurs
- [ ] Plausible Analytics ou PostHog pour analytics publiques
- [ ] Alertes email si webhook Stripe échoue

---

## Commandes utiles pour debug

```bash
# Voir les logs en temps réel
docker compose logs app -f

# Accéder à la DB
docker compose exec postgres psql -U postgres ecommerce

# Requêtes Prisma Studio (dev)
npx prisma studio

# Tester un email
# Depuis le dashboard admin → Mailing → envoyer un test

# Vérifier les événements tracking
# SELECT event, COUNT(*) FROM "FunnelEvent" GROUP BY event;

# Reset complet de la DB
npx prisma migrate reset
```

---

## Structure .env minimale pour démarrer

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecommerce"
JWT_SECRET="changeme-min-32-chars-xxxxxxxxxxxxxxxx"
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="test@gmail.com"
SMTP_PASS="app-password"
SMTP_FROM="test@gmail.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="test-secret"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin123!"
```
