'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Timer, CheckCircle, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { useCart } from '@/components/client/CartProvider'

interface UpsellProduct {
  id: string
  name: string
  slug: string
  images: string[]
  price: number
  comparePrice: number | null
  upsellPrice: number | null
  upsellMessage: string | null
  features: string[]
}

export default function UpsellPage() {
  const searchParams = useSearchParams()
  const productIds = searchParams.get('productIds') ?? ''
  const router = useRouter()
  const { addItem } = useCart()
  const { toast } = useToast()

  const [upsell, setUpsell] = useState<UpsellProduct | null>(null)
  const [fetching, setFetching] = useState(true)
  const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 minutes
  const [isLoading, setIsLoading] = useState(false)

  // Fetch the real upsell product
  useEffect(() => {
    if (!productIds) {
      router.replace('/')
      return
    }
    fetch(`/api/upsell?productIds=${encodeURIComponent(productIds)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.upsell) {
          router.replace('/')
        } else {
          setUpsell(data.upsell)
        }
      })
      .catch(() => router.replace('/'))
      .finally(() => setFetching(false))
  }, [productIds, router])

  // Countdown + view tracking
  useEffect(() => {
    const sessionId = localStorage.getItem('session_id') || ''
    fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'UPSELL_VIEW', sessionId }),
    }).catch(() => {})

    const interval = setInterval(() => {
      setTimeLeft((t) => (t <= 0 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const handleAccept = async () => {
    if (!upsell) return
    setIsLoading(true)
    const sessionId = localStorage.getItem('session_id') || ''
    try {
      await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'UPSELL_ACCEPT', sessionId }),
      })
      // Add the upsell product to cart at its special upsell price, then go to checkout
      await addItem(
        {
          id: upsell.id,
          name: upsell.name,
          slug: upsell.slug,
          price: upsell.upsellPrice ?? upsell.price,
          comparePrice: upsell.comparePrice,
          images: upsell.images,
          stock: 999,
        },
        1
      )
      router.push('/checkout')
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' })
      setIsLoading(false)
    }
  }

  const handleDecline = async () => {
    const sessionId = localStorage.getItem('session_id') || ''
    await fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'UPSELL_DECLINE', sessionId }),
    }).catch(() => {})
    router.push('/')
  }

  // Loading spinner while fetching the product
  if (fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-indigo-900 flex items-center justify-center">
        <span className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent" />
      </div>
    )
  }

  if (!upsell) return null

  const displayPrice = upsell.upsellPrice ?? upsell.price
  const originalPrice = upsell.comparePrice ?? upsell.price
  const discount =
    originalPrice > displayPrice
      ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
      : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-indigo-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Urgency header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-6 animate-pulse">
            <Timer className="w-4 h-4" />
            Offre expire dans {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Attendez ! 🚀<br />
            <span className="text-yellow-400">Offre spéciale client</span>
          </h1>
          <p className="text-slate-300 text-lg">
            Cette offre est <strong>uniquement disponible maintenant</strong> et ne sera plus accessible après votre départ.
          </p>
        </div>

        {/* Offer card */}
        <Card className="border-2 border-yellow-400 overflow-hidden mb-6">
          <div className="bg-yellow-400 px-6 py-3 text-center">
            <span className="font-bold text-slate-900 text-sm">
              ⚡ OFFRE EXCLUSIVE — NOUVEAUX CLIENTS UNIQUEMENT
            </span>
          </div>
          <CardContent className="p-6">
            {/* Product image */}
            {upsell.images?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={upsell.images[0]}
                alt={upsell.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <h2 className="text-xl font-bold text-gray-900 mb-2">{upsell.name}</h2>

            {upsell.upsellMessage && (
              <p className="text-gray-600 text-sm mb-4">{upsell.upsellMessage}</p>
            )}

            {upsell.features && upsell.features.length > 0 && (
              <ul className="space-y-3 mb-6">
                {upsell.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  {originalPrice > displayPrice && (
                    <p className="text-sm text-gray-500 line-through">
                      Valeur réelle: {formatPrice(originalPrice)}
                    </p>
                  )}
                  <p className="text-3xl font-bold text-indigo-600">{formatPrice(displayPrice)}</p>
                  <p className="text-xs text-gray-500">Paiement unique, accès à vie</p>
                </div>
                {discount !== null && (
                  <div className="bg-red-100 text-red-600 font-bold text-lg px-4 py-2 rounded-lg">
                    -{discount}%
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
              onClick={handleAccept}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Oui ! Je veux cette offre à {formatPrice(displayPrice)}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <button
              onClick={handleDecline}
              className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
            >
              <X className="w-3 h-3 inline mr-1" />
              Non merci, je décline cette offre unique et je perds cette opportunité
            </button>
          </CardContent>
        </Card>

        {/* Trust */}
        <div className="text-center text-slate-400 text-xs">
          <p>🔒 Paiement sécurisé par Stripe · Garantie 30 jours satisfait ou remboursé</p>
        </div>
      </div>
    </div>
  )
}
