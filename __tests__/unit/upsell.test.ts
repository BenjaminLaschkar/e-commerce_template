/**
 * Tests unitaires — Configuration Upsell
 *
 * Couvre :
 *  1. Initialisation des champs upsell (résistance null/undefined)
 *  2. Parsing et validation des valeurs saisies par l'admin
 *  3. Logique de matching produits déclencheurs
 *  4. Construction du body envoyé à l'API
 */

// ─── 1. Helpers d'initialisation (ProductEditClient / NewProductClient) ─────

function initUpsellActive(v: boolean | null | undefined): boolean {
  return v ?? false
}

function initUpsellPrice(v: number | null | undefined): string {
  return v != null ? v.toString() : ''
}

function initUpsellMessage(v: string | null | undefined): string {
  return v ?? ''
}

function initUpsellSendEmail(v: boolean | null | undefined): boolean {
  return v ?? false
}

function initUpsellTriggerIds(v: string[] | null | undefined): string[] {
  return v ?? []
}

describe('initUpsellActive()', () => {
  it('retourne true quand la valeur est true', () => {
    expect(initUpsellActive(true)).toBe(true)
  })
  it('retourne false quand la valeur est false', () => {
    expect(initUpsellActive(false)).toBe(false)
  })
  it('retourne false quand la valeur est null (Prisma default)', () => {
    expect(initUpsellActive(null)).toBe(false)
  })
  it('retourne false quand la valeur est undefined', () => {
    expect(initUpsellActive(undefined)).toBe(false)
  })
})

describe('initUpsellPrice()', () => {
  it('retourne la valeur en string', () => {
    expect(initUpsellPrice(97)).toBe('97')
    expect(initUpsellPrice(49.9)).toBe('49.9')
  })
  it('retourne "" quand null', () => {
    expect(initUpsellPrice(null)).toBe('')
  })
  it('retourne "" quand undefined', () => {
    expect(initUpsellPrice(undefined)).toBe('')
  })
  it('retourne "0" pour un prix à zéro', () => {
    expect(initUpsellPrice(0)).toBe('0')
  })
})

describe('initUpsellMessage()', () => {
  it('retourne la chaîne telle quelle', () => {
    expect(initUpsellMessage('Offre exclusive')).toBe('Offre exclusive')
  })
  it('retourne "" quand null', () => {
    expect(initUpsellMessage(null)).toBe('')
  })
  it('retourne "" quand undefined', () => {
    expect(initUpsellMessage(undefined)).toBe('')
  })
  it('préserve les espaces', () => {
    expect(initUpsellMessage('  bonjour  ')).toBe('  bonjour  ')
  })
})

describe('initUpsellSendEmail()', () => {
  it('retourne true', () => expect(initUpsellSendEmail(true)).toBe(true))
  it('retourne false', () => expect(initUpsellSendEmail(false)).toBe(false))
  it('retourne false pour null', () => expect(initUpsellSendEmail(null)).toBe(false))
  it('retourne false pour undefined', () => expect(initUpsellSendEmail(undefined)).toBe(false))
})

describe('initUpsellTriggerIds()', () => {
  it('retourne le tableau tel quel', () => {
    expect(initUpsellTriggerIds(['id1', 'id2'])).toEqual(['id1', 'id2'])
  })
  it('retourne [] pour null', () => {
    expect(initUpsellTriggerIds(null)).toEqual([])
  })
  it('retourne [] pour undefined', () => {
    expect(initUpsellTriggerIds(undefined)).toEqual([])
  })
  it('retourne [] pour un tableau vide', () => {
    expect(initUpsellTriggerIds([])).toEqual([])
  })
})

// ─── 2. Parsing des valeurs formulaire avant envoi API ──────────────────────

function parseUpsellPrice(raw: string): number | null {
  const n = parseFloat(raw)
  return raw.trim() !== '' && !isNaN(n) ? n : null
}

function buildUpsellBody(upsell: {
  upsellActive: boolean
  upsellPrice: string
  upsellMessage: string
  upsellSendEmail: boolean
  upsellTriggerIds: string[]
}) {
  return {
    upsellActive: upsell.upsellActive,
    upsellPrice: parseUpsellPrice(upsell.upsellPrice),
    upsellMessage: upsell.upsellMessage.trim() || null,
    upsellSendEmail: upsell.upsellSendEmail,
    upsellTriggerIds: upsell.upsellTriggerIds,
  }
}

describe('parseUpsellPrice()', () => {
  it('parse un prix valide', () => {
    expect(parseUpsellPrice('97')).toBe(97)
    expect(parseUpsellPrice('49.90')).toBe(49.9)
  })
  it('retourne null pour une chaîne vide', () => {
    expect(parseUpsellPrice('')).toBeNull()
  })
  it('retourne null pour des espaces uniquement', () => {
    expect(parseUpsellPrice('   ')).toBeNull()
  })
  it('retourne null pour une chaîne non numérique', () => {
    expect(parseUpsellPrice('abc')).toBeNull()
  })
})

describe('buildUpsellBody()', () => {
  it('construit le body complet avec toutes les valeurs', () => {
    const result = buildUpsellBody({
      upsellActive: true,
      upsellPrice: '97',
      upsellMessage: 'Offre exclusive',
      upsellSendEmail: true,
      upsellTriggerIds: ['prod1', 'prod2'],
    })
    expect(result).toEqual({
      upsellActive: true,
      upsellPrice: 97,
      upsellMessage: 'Offre exclusive',
      upsellSendEmail: true,
      upsellTriggerIds: ['prod1', 'prod2'],
    })
  })

  it('met upsellPrice à null si champ vide', () => {
    const result = buildUpsellBody({
      upsellActive: false,
      upsellPrice: '',
      upsellMessage: '',
      upsellSendEmail: false,
      upsellTriggerIds: [],
    })
    expect(result.upsellPrice).toBeNull()
    expect(result.upsellMessage).toBeNull()
  })

  it('met upsellMessage à null si seulement des espaces', () => {
    const result = buildUpsellBody({
      upsellActive: true,
      upsellPrice: '0',
      upsellMessage: '   ',
      upsellSendEmail: false,
      upsellTriggerIds: [],
    })
    expect(result.upsellMessage).toBeNull()
  })
})

// ─── 3. Logique de matching des produits déclencheurs (réplique /api/upsell) ─

interface UpsellCandidate {
  id: string
  name: string
  upsellTriggerIds: string[]
}

function findMatchingUpsell(
  candidates: UpsellCandidate[],
  purchasedProductIds: string[],
): UpsellCandidate | null {
  return (
    candidates.find((u) =>
      u.upsellTriggerIds.some((tid) => purchasedProductIds.includes(tid)),
    ) ?? null
  )
}

describe('findMatchingUpsell()', () => {
  const upsellA: UpsellCandidate = {
    id: 'upsell-a',
    name: 'Pack VIP',
    upsellTriggerIds: ['prod-1', 'prod-2'],
  }
  const upsellB: UpsellCandidate = {
    id: 'upsell-b',
    name: 'Formation Avancée',
    upsellTriggerIds: ['prod-3'],
  }

  it('retourne le bon upsell quand prod-1 est acheté', () => {
    expect(findMatchingUpsell([upsellA, upsellB], ['prod-1'])).toEqual(upsellA)
  })

  it('retourne le bon upsell quand prod-2 est acheté', () => {
    expect(findMatchingUpsell([upsellA, upsellB], ['prod-2'])).toEqual(upsellA)
  })

  it('retourne le deuxième upsell quand prod-3 est acheté', () => {
    expect(findMatchingUpsell([upsellA, upsellB], ['prod-3'])).toEqual(upsellB)
  })

  it("retourne null quand aucun produit ne correspond", () => {
    expect(findMatchingUpsell([upsellA, upsellB], ['prod-999'])).toBeNull()
  })

  it("retourne null pour une liste vide d'achetés", () => {
    expect(findMatchingUpsell([upsellA, upsellB], [])).toBeNull()
  })

  it('retourne null si aucun candidat upsell', () => {
    expect(findMatchingUpsell([], ['prod-1'])).toBeNull()
  })

  it('retourne le premier match si plusieurs upsells correspondent', () => {
    const upsellC: UpsellCandidate = {
      id: 'upsell-c',
      name: 'Bonus Spécial',
      upsellTriggerIds: ['prod-1'],
    }
    // upsellA appears first
    expect(findMatchingUpsell([upsellA, upsellC], ['prod-1'])).toEqual(upsellA)
  })

  it('gère plusieurs produits achetés simultanément', () => {
    expect(findMatchingUpsell([upsellA, upsellB], ['prod-3', 'prod-1'])).toEqual(upsellA)
  })
})

// ─── 4. Calcul du prix et de la réduction affiché ───────────────────────────

function computeDisplayPrice(price: number, upsellPrice: number | null): number {
  return upsellPrice ?? price
}

function computeDiscount(displayPrice: number, originalPrice: number): number | null {
  if (originalPrice <= displayPrice) return null
  return Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
}

describe('computeDisplayPrice()', () => {
  it('utilise upsellPrice quand défini', () => {
    expect(computeDisplayPrice(297, 97)).toBe(97)
  })
  it('utilise price normal quand upsellPrice est null', () => {
    expect(computeDisplayPrice(297, null)).toBe(297)
  })
  it('accepte upsellPrice = 0 (produit offert)', () => {
    expect(computeDisplayPrice(297, 0)).toBe(0)
  })
})

describe('computeDiscount()', () => {
  it('calcule -67% pour 97€ vs 297€', () => {
    expect(computeDiscount(97, 297)).toBe(67)
  })
  it('calcule -50% pour 50€ vs 100€', () => {
    expect(computeDiscount(50, 100)).toBe(50)
  })
  it('retourne null si aucune réduction', () => {
    expect(computeDiscount(97, 97)).toBeNull()
  })
  it('retourne null si displayPrice > originalPrice (pas logique)', () => {
    expect(computeDiscount(200, 100)).toBeNull()
  })
})

// ─── 5. Toggles déclencheurs (checkboxes) ───────────────────────────────────

function toggleTrigger(current: string[], id: string): string[] {
  return current.includes(id)
    ? current.filter((t) => t !== id)
    : [...current, id]
}

describe('toggleTrigger()', () => {
  it('ajoute un id absent', () => {
    expect(toggleTrigger(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
  })
  it('retire un id présent', () => {
    expect(toggleTrigger(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })
  it('gère un tableau vide', () => {
    expect(toggleTrigger([], 'x')).toEqual(['x'])
  })
  it('ne duplique pas un id déjà présent', () => {
    const result = toggleTrigger(['a'], 'a')
    expect(result).toEqual([])
  })
})
