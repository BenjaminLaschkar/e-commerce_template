import {
  cn,
  formatPrice,
  formatDate,
  generateOrderNumber,
  generateSessionId,
  slugify,
  truncate,
} from '@/lib/utils'

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('deduplicates tailwind classes', () => {
    // tailwind-merge should resolve conflicts
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
  })
})

describe('formatPrice()', () => {
  it('formats euros correctly', () => {
    expect(formatPrice(29.99)).toMatch('29,99')
    expect(formatPrice(29.99)).toMatch('€')
  })

  it('handles zero', () => {
    expect(formatPrice(0)).toMatch('0,00')
  })

  it('handles large numbers', () => {
    expect(formatPrice(1000)).toMatch('1')
  })
})

describe('formatDate()', () => {
  it('returns a non-empty string', () => {
    const result = formatDate(new Date('2024-01-15'))
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('accepts string dates', () => {
    const result = formatDate('2024-06-01')
    expect(typeof result).toBe('string')
  })
})

describe('generateOrderNumber()', () => {
  it('starts with CMD-', () => {
    expect(generateOrderNumber()).toMatch(/^CMD-/)
  })

  it('generates unique values', () => {
    const a = generateOrderNumber()
    const b = generateOrderNumber()
    // Very unlikely to collide
    expect(a).not.toBe(b)
  })
})

describe('generateSessionId()', () => {
  it('starts with sess_', () => {
    expect(generateSessionId()).toMatch(/^sess_/)
  })

  it('generates unique values', () => {
    const a = generateSessionId()
    const b = generateSessionId()
    expect(a).not.toBe(b)
  })
})

describe('slugify()', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(slugify('Café & Bar!')).toBe('cafe-bar')
  })

  it('handles accents', () => {
    const result = slugify('Été formidable')
    expect(result).not.toMatch(/[éèêàùû]/)
  })

  it('trims leading/trailing hyphens', () => {
    const result = slugify('  hello  ')
    expect(result).not.toMatch(/^-|-$/)
  })
})

describe('truncate()', () => {
  it('truncates long strings', () => {
    const result = truncate('Hello World', 5)
    expect(result.length).toBeLessThanOrEqual(8) // 5 + '...'
  })

  it('does not truncate short strings', () => {
    expect(truncate('Hi', 10)).toBe('Hi')
  })

  it('appends ellipsis when truncated', () => {
    expect(truncate('Hello World', 5)).toContain('...')
  })
})
