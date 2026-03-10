// Mock prisma
const mockCreate = jest.fn()
const mockCount = jest.fn()
const mockAggregate = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    funnelEvent: {
      create: mockCreate,
      count: mockCount,
      aggregate: mockAggregate,
    },
    order: {
      aggregate: mockAggregate,
    },
  },
}))

// Mock @prisma/client EventType enum
jest.mock('@prisma/client', () => ({
  EventType: {
    PAGE_VIEW: 'PAGE_VIEW',
    PRODUCT_VIEW: 'PRODUCT_VIEW',
    ADD_TO_CART: 'ADD_TO_CART',
    CHECKOUT_START: 'CHECKOUT_START',
    PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    CART_ABANDON: 'CART_ABANDON',
    UPSELL_VIEW: 'UPSELL_VIEW',
    UPSELL_ACCEPT: 'UPSELL_ACCEPT',
    UPSELL_DECLINE: 'UPSELL_DECLINE',
  },
}))

import { trackEvent } from '@/lib/tracking'

describe('trackEvent()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({ id: 'evt-1' })
  })

  it('calls prisma.funnelEvent.create with correct data', async () => {
    await trackEvent({
      sessionId: 'sess_abc123',
      event: 'PRODUCT_VIEW' as any,
      productId: 'prod-1',
      ip: '127.0.0.1',
    })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        sessionId: 'sess_abc123',
        event: 'PRODUCT_VIEW',
        productId: 'prod-1',
        customerId: undefined,
        metadata: undefined,
        ip: '127.0.0.1',
        userAgent: undefined,
      },
    })
  })

  it('does not throw if prisma.create fails (graceful)', async () => {
    mockCreate.mockRejectedValue(new Error('DB error'))

    await expect(
      trackEvent({ sessionId: 'sess_x', event: 'PAGE_VIEW' as any })
    ).resolves.not.toThrow()
  })

  it('tracks without optional fields', async () => {
    await trackEvent({ sessionId: 'sess_minimal', event: 'ADD_TO_CART' as any })
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('tracks with metadata', async () => {
    await trackEvent({
      sessionId: 'sess_meta',
      event: 'ADD_TO_CART' as any,
      metadata: { quantity: 2, productName: 'Test' },
    })

    const callArg = mockCreate.mock.calls[0][0]
    expect(callArg.data.metadata).toEqual({ quantity: 2, productName: 'Test' })
  })
})
