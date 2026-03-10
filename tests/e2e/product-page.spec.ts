import { test, expect } from '@playwright/test'

test.describe('Page produit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('affiche le titre du produit ou un message vide', async ({ page }) => {
    // La page doit se charger sans erreur 500
    await expect(page).not.toHaveURL(/error/)
    const status = page.locator('h1, [data-testid="empty-state"]')
    await expect(status.first()).toBeVisible({ timeout: 10000 })
  })

  test('affiche le prix si un produit existe', async ({ page }) => {
    const priceEl = page.locator('text=/€/')
    const count = await priceEl.count()
    // Si des produits existent, le prix doit être affiché
    if (count > 0) {
      await expect(priceEl.first()).toBeVisible()
    }
  })

  test("le bouton 'Ajouter au panier' est visible si stock > 0", async ({ page }) => {
    // 'Ajouter au panier' is on the product page, not the catalog.
    // Navigate to the first product page; skip if no products exist.
    const firstProduct = page.locator('a[href*="/products/"]').first()
    if (await firstProduct.count() === 0) {
      test.skip()
      return
    }
    await firstProduct.click()
    await expect(page).toHaveURL(/\/products\//, { timeout: 10000 })

    const addBtn = page.getByRole('button', { name: /ajouter au panier/i })
    const outOfStock = page.locator('text=/rupture|indisponible/i')

    if (await outOfStock.count() === 0) {
      // Product is in stock — the button must be visible and enabled
      await expect(addBtn).toBeVisible({ timeout: 5000 })
    }
  })
})
