/**
 * Tests unitaires pour la résistance aux valeurs null/undefined
 * venant de Prisma (tableaux JSON peuvent être null en DB)
 */

// ─── Helpers reproduisant la logique de ProductEditClient ───────────────────

function initImages(images: string[] | null | undefined): string[] {
  return images ?? []
}

function initFeatures(features: string[] | null | undefined): string[] {
  const safe = features ?? []
  return safe.length > 0 ? safe : ['']
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('initImages() — résistance null/undefined (ProductEditClient)', () => {
  it('retourne le tableau tel quel quand il est défini', () => {
    expect(initImages(['https://img.com/a.jpg', 'https://img.com/b.jpg']))
      .toEqual(['https://img.com/a.jpg', 'https://img.com/b.jpg'])
  })

  it('retourne [] quand images est null (cas Prisma)', () => {
    expect(initImages(null)).toEqual([])
  })

  it('retourne [] quand images est undefined', () => {
    expect(initImages(undefined)).toEqual([])
  })

  it('retourne [] quand images est un tableau vide', () => {
    expect(initImages([])).toEqual([])
  })
})

describe('initFeatures() — résistance null/undefined (ProductEditClient)', () => {
  it('retourne le tableau tel quel quand il est peuplé', () => {
    expect(initFeatures(['Livraison rapide', 'Garantie 2 ans']))
      .toEqual(['Livraison rapide', 'Garantie 2 ans'])
  })

  it("retourne [''] quand features est null (cas Prisma) — 1 champ vide par défaut", () => {
    expect(initFeatures(null)).toEqual([''])
  })

  it("retourne [''] quand features est undefined", () => {
    expect(initFeatures(undefined)).toEqual([''])
  })

  it("retourne [''] quand features est un tableau vide", () => {
    expect(initFeatures([])).toEqual([''])
  })

  it('préserve un seul élément existant', () => {
    expect(initFeatures(['Qualité premium'])).toEqual(['Qualité premium'])
  })
})
