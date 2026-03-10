// Mock prisma
const mockFindUnique = jest.fn()
const mockCreate = jest.fn()
const mockUpsert = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    siteSettings: {
      findUnique: mockFindUnique,
      create: mockCreate,
      upsert: mockUpsert,
    },
  },
}))

import { getSiteSettings, updateSiteSettings } from '@/lib/site-settings'

const MOCK_SETTINGS = {
  id: 'singleton',
  storeName: 'Test Store',
  storeTagline: 'Great products',
  aboutContent: 'About us text',
  primaryColor: '#4f46e5',
  fontFamily: 'Inter',
  heroImages: ['https://example.com/img1.jpg'],
  logoUrl: null,
  stripePublicKey: 'pk_test_123',
  stripeSecretKey: 'sk_test_456',
  stripeWebhookSecret: 'whsec_789',
  freeShippingThreshold: 50,
  shippingRules: [{ country: 'FR', price: 0, freeThreshold: 50, estimatedDays: '3-5 jours' }],
  blockedCountries: ['RU'],
  cgvContent: 'CGV text',
  faqContent: '[]',
  deliveryContent: 'Delivery info',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('getSiteSettings()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns existing settings from DB', async () => {
    // getSiteSettings() now uses upsert (atomic, avoids race condition)
    mockUpsert.mockResolvedValue(MOCK_SETTINGS)

    const settings = await getSiteSettings()

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'singleton' } })
    )
    expect(settings.storeName).toBe('Test Store')
    expect(settings.stripePublicKey).toBe('pk_test_123')
    expect(Array.isArray(settings.shippingRules)).toBe(true)
    expect(settings.shippingRules[0].country).toBe('FR')
  })

  it('creates defaults if no settings exist', async () => {
    // upsert handles both create and find atomically
    mockUpsert.mockResolvedValue({ ...MOCK_SETTINGS, storeName: 'Boutique' })

    const settings = await getSiteSettings()

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    expect(settings).toBeDefined()
    expect(settings.storeName).toBe('Boutique')
  })

  it('returns shippingRules as an array', async () => {
    mockUpsert.mockResolvedValue({ ...MOCK_SETTINGS, shippingRules: [] })

    const settings = await getSiteSettings()

    expect(Array.isArray(settings.shippingRules)).toBe(true)
  })
})

describe('updateSiteSettings()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue(MOCK_SETTINGS)
  })

  it('calls prisma upsert with correct data', async () => {
    await updateSiteSettings({ storeName: 'New Name' })

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const call = mockUpsert.mock.calls[0][0]
    expect(call.update.storeName).toBe('New Name')
  })

  it('upserts singleton row', async () => {
    await updateSiteSettings({ primaryColor: '#ff0000' })

    const call = mockUpsert.mock.calls[0][0]
    expect(call.where.id).toBe('singleton')
    expect(call.create.id).toBe('singleton')
  })
})
