'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Package, Mail, ArrowRight, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/components/client/CartProvider'

interface Order {
  orderNumber: string
  total: number
  status: string
  customer: { firstName?: string; email: string }
  items: Array<{ name: string; quantity: number; price: number; productId?: string }>
}

interface UpsellProduct {
  id: string
  name: string
  upsellPrice: number | null
  price: number
  comparePrice: number | null
  upsellMessage: string | null
}

export default function ConfirmationPage() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')
  const paymentIntent = searchParams.get('payment_intent')
  const redirectStatus = searchParams.get('redirect_status')
  const { clearCart } = useCart()
  const [order, setOrder] = useState<Order | null>(null)
  const [upsell, setUpsell] = useState<UpsellProduct | null>(null)
  const [showUpsell, setShowUpsell] = useState(false)
  const emailSentRef = useRef(false)

  // When Stripe redirects back with redirect_status=succeeded, trigger the
  // confirmation email server-side (idempotent — safe to call multiple times)
  useEffect(() => {
    if (redirectStatus === 'succeeded' && orderNumber && !emailSentRef.current) {
      emailSentRef.current = true
      fetch('/api/orders/confirm-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, paymentIntentId: paymentIntent ?? undefined }),
      }).catch(() => {})
    }
  }, [redirectStatus, orderNumber, paymentIntent])

  useEffect(() => {
    clearCart()
    if (orderNumber) {
      fetch(`/api/orders?orderNumber=${orderNumber}`)
        .then((r) => r.json())
        .then(async (data) => {
          if (data.order) {
            const fetchedOrder: Order = data.order
            setOrder(fetchedOrder)

            // Fetch upsell based on purchased product IDs
            const productIds = (fetchedOrder.items ?? [])
              .map((i) => i.productId)
              .filter(Boolean)
              .join(',')

            if (productIds) {
              const upsellRes = await fetch(`/api/upsell?productIds=${encodeURIComponent(productIds)}`)
              const upsellData = await upsellRes.json()
              if (upsellData.upsell) {
                setUpsell(upsellData.upsell)
                setTimeout(() => setShowUpsell(true), 2000)
              }
            }
          }
        })
        .catch(() => {})
    }
  }, [orderNumber])

  const productIdsParam = order?.items
    .map((i) => i.productId)
    .filter(Boolean)
    .join(',') ?? ''

  const upsellDisplayPrice = upsell
    ? (upsell.upsellPrice ?? upsell.price)
    : 0
  const upsellOriginalPrice = upsell?.comparePrice ?? upsell?.price ?? 0
  const upsellDiscount =
    upsellOriginalPrice > upsellDisplayPrice
      ? Math.round(((upsellOriginalPrice - upsellDisplayPrice) / upsellOriginalPrice) * 100)
      : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            🛍️ Boutique
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Success animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Commande confirmée ! 🎉
          </h1>
          <p className="text-gray-500 text-lg">
            Merci {order?.customer.firstName ? `${order.customer.firstName} !` : '!'}
          </p>
          {orderNumber && (
            <p className="text-sm text-gray-400 mt-1">
              Numéro de commande :{' '}
              <span className="font-mono font-semibold text-gray-700">{orderNumber}</span>
            </p>
          )}
        </div>

        {/* Order details */}
        {order && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Détails de votre commande</h2>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} × {item.quantity}</span>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                  <span>Total payé</span>
                  <span className="text-indigo-600">{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: Mail,
              title: 'Email de confirmation',
              desc: 'Un email a été envoyé à votre adresse',
              color: 'text-blue-500 bg-blue-50',
            },
            {
              icon: Package,
              title: 'Préparation en cours',
              desc: 'Votre commande est en cours de traitement',
              color: 'text-orange-500 bg-orange-50',
            },
            {
              icon: ShoppingBag,
              title: 'Livraison',
              desc: "Vous recevrez un email dès l'expédition",
              color: 'text-green-500 bg-green-50',
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="text-center bg-white rounded-xl border p-4">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${color} mb-3`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>

        {/* Upsell — shown only when an upsell is configured for the purchased products */}
        {showUpsell && upsell && (
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 mb-6 animate-in slide-in-from-bottom-4">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🚀</div>
                <div className="flex-1">
                  <div className="inline-block bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded mb-2">
                    OFFRE EXCLUSIVE — 30 min seulement
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{upsell.name}</h3>
                  {upsell.upsellMessage && (
                    <p className="text-sm text-gray-600 mb-3">{upsell.upsellMessage}</p>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-bold text-indigo-600">
                      {formatPrice(upsellDisplayPrice)}
                    </span>
                    {upsellOriginalPrice > upsellDisplayPrice && (
                      <span className="text-gray-400 line-through text-lg">
                        {formatPrice(upsellOriginalPrice)}
                      </span>
                    )}
                    {upsellDiscount !== null && (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">
                        -{upsellDiscount}%
                      </span>
                    )}
                  </div>
                  <Link href={`/upsell?productIds=${encodeURIComponent(productIdsParam)}`}>
                    <Button className="w-full sm:w-auto">
                      Oui, je veux cette offre
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <button
                    className="block text-xs text-gray-400 mt-2 hover:text-gray-600 transition-colors"
                    onClick={() => setShowUpsell(false)}
                  >
                    Non merci, je décline cette offre
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Link href="/">
            <Button variant="outline" size="lg">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continuer mes achats
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
