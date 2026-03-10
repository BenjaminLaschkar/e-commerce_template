import { test, expect, type Page } from '@playwright/test'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!'

/** Helper: login via UI and wait for /admin */
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL('/admin', { timeout: 10000 })
}

test.describe('Admin - Authentification', () => {
  test('redirige vers /admin/login si non connecté', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('affiche le formulaire de connexion', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible()
  })

  test('affiche une erreur avec mauvais credentials', async ({ page }) => {
    await page.goto('/admin/login')
    await page.locator('#email').fill('wrong@email.com')
    await page.locator('#password').fill('wrongpassword')
    await page.getByRole('button', { name: /se connecter/i }).click()

    // The login page error message
    const error = page.locator('.text-red-400')
    await expect(error.first()).toBeVisible({ timeout: 8000 })
  })

  test('connecte avec les bons credentials et redirige vers /admin', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL('/admin')
    // Sidebar text is always visible when logged in
    await expect(page.locator('text=Boutique Admin')).toBeVisible()
  })
})

test.describe('Admin - Dashboard (authentifié)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('affiche la sidebar', async ({ page }) => {
    await expect(page.locator('text=Boutique Admin')).toBeVisible()
    await expect(page.locator('text=Tableau de bord')).toBeVisible()
  })

  test('navigue vers les produits', async ({ page }) => {
    await page.getByRole('link', { name: 'Produits' }).click()
    await expect(page).toHaveURL('/admin/products')
  })

  test('navigue vers les commandes', async ({ page }) => {
    await page.getByRole('link', { name: 'Commandes' }).click()
    await expect(page).toHaveURL('/admin/orders')
  })

  test('navigue vers le mailing', async ({ page }) => {
    await page.getByRole('link', { name: 'Mailing' }).click()
    await expect(page).toHaveURL('/admin/mailing')
  })

  test('se déconnecte', async ({ page }) => {
    const logoutBtn = page.getByRole('button', { name: 'Déconnexion' })
    await expect(logoutBtn).toBeVisible()
    await logoutBtn.click()
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})

test.describe('Admin - Produits', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/products')
  })

  test('affiche la page produits sans erreur', async ({ page }) => {
    await expect(page).toHaveURL('/admin/products')
    await expect(page.locator('text=Boutique Admin')).toBeVisible()
  })

  test('navigue vers le formulaire nouveau produit', async ({ page }) => {
    await page.getByRole('link', { name: /nouveau|ajouter/i }).click()
    await expect(page).toHaveURL('/admin/products/new')
    await expect(page.getByRole('heading', { name: 'Nouveau produit' })).toBeVisible()
  })
})
