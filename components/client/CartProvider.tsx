'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string
  productId: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  image?: string | null
  quantity: number
  stock: number
}

interface CartContextValue {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  sessionId: string
  isLoading: boolean
  addItem: (product: {
    id: string
    name: string
    slug: string
    price: number
    comparePrice?: number | null
    images?: string[]
    stock: number
  }, quantity?: number) => Promise<void>
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

// ─── Context ───────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null)

// ─── Session helper ────────────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = localStorage.getItem('session_id')
  if (!sid) {
    sid = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem('session_id', sid)
  }
  return sid
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // Initialize session + load persisted cart
  useEffect(() => {
    const sid = getOrCreateSessionId()
    setSessionId(sid)

    const stored = localStorage.getItem('cart_items')
    if (stored) {
      try {
        setItems(JSON.parse(stored))
      } catch {
        localStorage.removeItem('cart_items')
      }
    }
  }, [])

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart_items', JSON.stringify(items))
    }
  }, [items])

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0)
  const totalPrice = items.reduce((acc, i) => acc + i.price * i.quantity, 0)

  // ── Actions ───────────────────────────────────────────────────────────────

  const addItem = useCallback(async (
    product: {
      id: string
      name: string
      slug: string
      price: number
      comparePrice?: number | null
      images?: string[]
      stock: number
    },
    quantity = 1,
  ) => {
    setIsLoading(true)
    try {
      // Sync with server cart
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          productId: product.id,
          quantity,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur serveur')
      }

      // Update local state
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.id)
        if (existing) {
          const newQty = Math.min(existing.quantity + quantity, product.stock)
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: newQty } : i,
          )
        }
        return [
          ...prev,
          {
            id: `local_${product.id}`,
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            comparePrice: product.comparePrice,
            image: product.images?.[0] ?? null,
            quantity: Math.min(quantity, product.stock),
            stock: product.stock,
          },
        ]
      })
    } catch (err) {
      console.error('addItem error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))

    fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, productId }),
    }).catch(console.error)
  }, [sessionId])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId)
      return
    }

    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(quantity, i.stock) }
          : i,
      ),
    )

    // Sync with server
    fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, productId, quantity }),
    }).catch(console.error)
  }, [sessionId, removeItem])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.removeItem('cart_items')

    if (sessionId) {
      fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(console.error)
    }
  }, [sessionId])

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        sessionId,
        isLoading,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used inside <CartProvider>')
  }
  return ctx
}
