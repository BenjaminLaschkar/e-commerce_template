// Mock next/headers before importing auth (it uses cookies() at module level via functions)
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    admin: {
      findUnique: jest.fn(),
    },
  },
}))

import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
} from '@/lib/auth'

describe('hashPassword / verifyPassword', () => {
  it('hashes a password and verifies it correctly', async () => {
    const password = 'SecurePass123!'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true)

    const valid = await verifyPassword(password, hash)
    expect(valid).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct')
    const valid = await verifyPassword('wrong', hash)
    expect(valid).toBe(false)
  })

  it('produces different hashes each time (salt)', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    expect(h1).not.toBe(h2)
  })
})

describe('signToken / verifyToken', () => {
  const payload = { id: 'admin-1', email: 'admin@test.com', name: 'Admin' }

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-for-unit-tests'
  })

  afterAll(() => {
    delete process.env.JWT_SECRET
  })

  it('signs and verifies a valid token', () => {
    const token = signToken(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3) // JWT format

    const decoded = verifyToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded?.id).toBe(payload.id)
    expect(decoded?.email).toBe(payload.email)
    expect(decoded?.name).toBe(payload.name)
  })

  it('returns null for an invalid token', () => {
    const result = verifyToken('invalid.token.here')
    expect(result).toBeNull()
  })

  it('returns null for a tampered token', () => {
    const token = signToken(payload)
    const tampered = token.slice(0, -5) + 'xxxxx'
    const result = verifyToken(tampered)
    expect(result).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(verifyToken('')).toBeNull()
  })
})
