import { test, expect } from '@playwright/test'

test.describe('Panier', () => {
  test('la page panier se charge', async ({ page }) => {
    await page.goto('/cart')
    await expect(page).not.toHaveURL(/error/)
  })

  test('affiche le message "panier vide" si aucun item', async ({ page }) => {
    // Clear localStorage pour s'assurer d'un panier vide
    await page.goto('/cart')
    await page.evaluate(() => {
      localStorage.removeItem('cart_items')
      localStorage.removeItem('session_id')
    })
    await page.reload()

    const emptyMsg = page.locator('text=/panier est vide/i')
    await expect(emptyMsg).toBeVisible({ timeout: 5000 })
  })

  test('le lien "Voir nos produits" redirige vers /', async ({ page }) => {
    await page.goto('/cart')
    await page.evaluate(() => {
      localStorage.removeItem('cart_items')
    })
    await page.reload()

    const link = page.getByRole('link', { name: /voir nos produits/i })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL('/')
  })
})
