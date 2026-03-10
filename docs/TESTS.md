# 🧪 Documentation des Tests

## Vue d'ensemble

Le projet dispose de deux niveaux de tests :

| Type | Framework | Commande | Fichiers |
|------|-----------|----------|----------|
| **Tests unitaires** | Jest + ts-jest | `npm test` | `__tests__/unit/` |
| **Tests E2E** | Playwright | `npm run test:e2e` | `tests/e2e/` |

**Résultats actuels :** 30 tests unitaires ✅ — 22 E2E passés / 3 skippés (requièrent des données en base) ✅

---

## Tests unitaires

### Configuration — `jest.config.ts`

```ts
preset: 'ts-jest'
testEnvironment: 'node'
moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }   // alias @/
testMatch: ['**/__tests__/unit/**/*.test.ts']
collectCoverageFrom: ['lib/**/*.ts']                 // couverture sur lib/
```

### Commandes

```bash
npm test                 # lancer tous les tests
npm run test:watch       # mode watch (relance à chaque save)
npm run test:coverage    # avec rapport de couverture HTML
```

---

### `__tests__/unit/utils.test.ts` — 18 tests

Teste les fonctions utilitaires de [`lib/utils.ts`](../lib/utils.ts).

#### `cn()` — fusion de classes Tailwind
| Test | Description |
|------|-------------|
| merges class names | `cn('a', 'b')` → `'a b'` |
| handles conditional classes | les valeurs falsy sont ignorées |
| deduplicates tailwind classes | `cn('p-2', 'p-4')` → `'p-4'` (tailwind-merge) |

#### `formatPrice()` — formatage monétaire
| Test | Description |
|------|-------------|
| formats euros correctly | `29.99` → contient `'29,99'` et `'€'` |
| handles zero | `0` → `'0,00'` |
| handles large numbers | `1000` → contient `'1'` |

#### `formatDate()` — formatage de date
| Test | Description |
|------|-------------|
| returns a non-empty string | retourne une chaîne non vide |
| accepts string dates | accepte une date ISO en string |

#### `generateOrderNumber()` — numéro de commande
| Test | Description |
|------|-------------|
| starts with CMD- | format `CMD-XXXXXXXX` |
| generates unique values | deux appels successifs ≠ |

#### `generateSessionId()` — identifiant de session
| Test | Description |
|------|-------------|
| starts with sess_ | format `sess_XXXXXXXX` |
| generates unique values | deux appels successifs ≠ |

#### `slugify()` — conversion en slug URL
| Test | Description |
|------|-------------|
| converts spaces to hyphens | `'Hello World'` → `'hello-world'` |
| removes special characters | `'Café & Bar!'` → `'cafe-bar'` |
| handles accents | les caractères accentués sont supprimés |
| trims leading/trailing hyphens | les espaces de bord ne produisent pas de tirets |

#### `truncate()` — troncature de texte
| Test | Description |
|------|-------------|
| truncates long strings | longueur ≤ `max + 3` (`...`) |
| does not truncate short strings | chaîne courte retournée intacte |
| appends ellipsis when truncated | contient `'...'` si tronqué |

---

### `__tests__/unit/auth.test.ts` — 7 tests

Teste les fonctions d'authentification de [`lib/auth.ts`](../lib/auth.ts).

**Mocks utilisés :**
- `next/headers` → simule `cookies()` (évite l'erreur hors contexte Next.js)
- `@/lib/prisma` → mock de `prisma.admin.findUnique`

#### `hashPassword / verifyPassword`
| Test | Description |
|------|-------------|
| hashes a password and verifies it correctly | hash bcrypt valide (`$2a$` ou `$2b$`), `verifyPassword` retourne `true` |
| rejects wrong password | `verifyPassword('wrong', hash)` retourne `false` |
| produces different hashes each time (salt) | deux hash du même mot de passe sont différents (sel aléatoire) |

#### `signToken / verifyToken`
| Test | Description |
|------|-------------|
| signs and verifies a valid token | token JWT en 3 parties, `verifyToken` restitue le payload complet |
| returns null for an invalid token | token malformé → `null` |
| returns null for a tampered token | token modifié → `null` |
| returns null for an empty string | chaîne vide → `null` |

---

### `__tests__/unit/tracking.test.ts` — 4 tests

Teste la fonction `trackEvent()` de [`lib/tracking.ts`](../lib/tracking.ts).

**Mocks utilisés :**
- `@/lib/prisma` → mock de `prisma.funnelEvent.create/count/aggregate`
- `@prisma/client` → mock de l'enum `EventType`

#### `trackEvent()`
| Test | Description |
|------|-------------|
| calls prisma.funnelEvent.create with correct data | vérifie les champs `sessionId`, `event`, `productId`, `ip` transmis à Prisma |
| does not throw if prisma.create fails (graceful) | une erreur DB ne lève pas d'exception — tracking silencieux |
| tracks without optional fields | appel minimal (`sessionId` + `event`) sans crash |
| tracks with metadata | l'objet `metadata` est correctement transmis |

---

## Tests E2E (Playwright)

### Configuration — `playwright.config.ts`

```ts
testDir: './tests/e2e'
baseURL: 'http://localhost:3000'
workers: 1             // tests séquentiels (évite conflits de session)
retries: 2             // en CI uniquement
screenshot: 'only-on-failure'
trace: 'on-first-retry'
webServer: { command: 'npm run dev', reuseExistingServer: true }
```

> Le serveur Next.js est démarré automatiquement si aucune instance ne tourne déjà.

### Commandes

```bash
npm run test:e2e         # lancer tous les tests E2E (headless)
npm run test:e2e:ui      # mode UI interactif Playwright
npx playwright show-report  # afficher le rapport HTML après un run
```

### Prérequis

```bash
# Installer le navigateur Chromium (une seule fois)
npx playwright install chromium

# La base de données doit être accessible et migrée
# Pour les tests avec produits (actuellement skippés) :
npm run db:seed
```

---

### `tests/e2e/admin.spec.ts` — 11 tests

Teste l'espace d'administration. Utilise un helper `loginAsAdmin()` partagé.

**Variables d'environnement utilisées :**
```
ADMIN_EMAIL    (défaut : admin@example.com)
ADMIN_PASSWORD (défaut : Admin123!)
```

#### Admin - Authentification
| Test | Scénario |
|------|----------|
| redirige vers /admin/login si non connecté | `GET /admin` sans cookie → redirige vers `/admin/login` |
| affiche le formulaire de connexion | champs `#email`, `#password` et bouton "Se connecter" visibles |
| affiche une erreur avec mauvais credentials | mauvais email/mdp → message d'erreur rouge visible |
| connecte avec les bons credentials | formulaire rempli → redirige vers `/admin`, sidebar visible |

#### Admin - Dashboard (authentifié)
| Test | Scénario |
|------|----------|
| affiche la sidebar | textes "Boutique Admin" et "Tableau de bord" visibles |
| navigue vers les produits | clic "Produits" → URL `/admin/products` |
| navigue vers les commandes | clic "Commandes" → URL `/admin/orders` |
| navigue vers le mailing | clic "Mailing" → URL `/admin/mailing` |
| se déconnecte | clic "Déconnexion" → redirige vers `/admin/login` |

#### Admin - Produits
| Test | Scénario |
|------|----------|
| affiche la page produits sans erreur | URL `/admin/products`, sidebar visible |
| navigue vers le formulaire nouveau produit | clic "Nouveau" → URL `/admin/products/new`, titre H1 visible |

---

### `tests/e2e/cart.spec.ts` — 3 tests

Teste la page panier côté client (`/cart`).

| Test | Scénario |
|------|----------|
| la page panier se charge | `GET /cart` → pas d'URL d'erreur |
| affiche le message "panier vide" si aucun item | vide le localStorage, recharge → message "panier est vide" |
| le lien "Voir nos produits" redirige vers / | clic → URL `/` |

---

### `tests/e2e/product-page.spec.ts` — 3 tests

Teste la page d'accueil boutique et l'affichage produit. Tous démarrent sur `/`.

| Test | Scénario |
|------|----------|
| affiche le titre du produit ou un message vide | h1 ou état vide visible, pas d'erreur 500 |
| affiche le prix si un produit existe | élément contenant `€` visible (si produits en base) |
| le bouton 'Ajouter au panier' est visible si stock > 0 | bouton visible sauf si rupture de stock |

---

### `tests/e2e/funnel.spec.ts` — 8 tests (5 actifs + 3 conditionnels)

Teste le tunnel de vente complet.

| Test | Statut | Scénario |
|------|--------|----------|
| page accueil charge sans erreur | ✅ toujours | pas de titre "500/error", pas de message "Internal Server Error" |
| affiche des produits ou un message vide | ✅ toujours | page valide quelle que soit la DB |
| naviguer vers un produit depuis la home | ⏭ skip si DB vide | clic → URL contient `/products/` |
| ajouter au panier depuis la page produit | ⏭ skip si DB vide | clic "Ajouter" → feedback visible |
| page panier accessible depuis header | ✅ toujours | lien `/cart` dans le header ou navigation directe |
| page panier vide affiche CTA | ✅ toujours | texte "vide" ou lien retour présent |
| page checkout charge sans erreur 500 | ✅ toujours | formulaire, ou redirection `/cart`/`/checkout`/`/` |
| formulaire checkout valide les champs obligatoires | ⏭ skip si pas de form | soumission vide → erreurs de validation visibles |

---

## Structure des fichiers

```
ecommerce_project/
├── __tests__/
│   └── unit/
│       ├── utils.test.ts       # 18 tests — lib/utils.ts
│       ├── auth.test.ts        # 7 tests  — lib/auth.ts
│       └── tracking.test.ts    # 4 tests  — lib/tracking.ts
├── tests/
│   └── e2e/
│       ├── admin.spec.ts       # 11 tests — /admin/*
│       ├── cart.spec.ts        # 3 tests  — /cart
│       ├── product-page.spec.ts# 3 tests  — /
│       └── funnel.spec.ts      # 8 tests  — tunnel de vente
├── jest.config.ts
└── playwright.config.ts
```

---

## Ajouter un nouveau test

### Test unitaire

Créer `__tests__/unit/mon-module.test.ts` :

```ts
import { maFonction } from '@/lib/mon-module'

describe('maFonction()', () => {
  it('fait ce qui est attendu', () => {
    expect(maFonction('input')).toBe('output')
  })
})
```

Si le module importe `next/headers` ou `@/lib/prisma`, ajouter les mocks en haut du fichier (voir `auth.test.ts` pour l'exemple).

### Test E2E

Créer `tests/e2e/ma-page.spec.ts` :

```ts
import { test, expect } from '@playwright/test'

test.describe('Ma page', () => {
  test('se charge correctement', async ({ page }) => {
    await page.goto('/ma-page')
    await expect(page).not.toHaveTitle(/error|500/i)
  })
})
```

Pour les tests authentifiés, importer et utiliser `loginAsAdmin()` depuis `admin.spec.ts`, ou dupliquer le helper.

---

## CI/CD

En environnement CI (`CI=true`), Playwright active automatiquement :
- `retries: 2` (nouvelle tentative sur échec)
- `forbidOnly: true` (interdit `test.only` qui bloquerait le pipeline)

Exemple GitHub Actions :

```yaml
- name: Run unit tests
  run: npm test

- name: Install Playwright browsers
  run: npx playwright install chromium --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
    ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
```
