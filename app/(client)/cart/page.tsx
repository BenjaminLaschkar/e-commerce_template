'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Trash2, ArrowRight, Shield, RotateCcw, Zap } from 'lucide-react'
import SiteHeader from '@/components/client/SiteHeader'
import SiteFooter from '@/components/client/SiteFooter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCart } from '@/components/client/CartProvider'
import { useSettings } from '@/components/client/SettingsProvider'
import { useLang } from '@/components/client/LangProvider'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCart()
  const { storeName, logoUrl } = useSettings()
  const { t } = useLang()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckout = async () => {
    setIsLoading(true)
    const sessionId = localStorage.getItem('session_id') || ''
    try {
      await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'CHECKOUT_START', sessionId }),
      })
    } catch {}
    router.push('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SiteHeader storeName={storeName} logoUrl={logoUrl} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{t.cart_empty}</h1>
            <p className="text-gray-500 mb-6">{t.cart_empty_sub}</p>
            <Link href="/">
              <Button>{t.cart_see_products}</Button>
            </Link>
          </div>
        </div>
        <SiteFooter storeName={storeName} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader storeName={storeName} logoUrl={logoUrl} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 sm:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary">{t.bc_product}</Link>
          <span>›</span>
          <span className="text-gray-900 font-medium">{t.bc_cart}</span>
          <span>›</span>
          <span>{t.bc_checkout}</span>
          <span>›</span>
          <span>{t.bc_payment}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {t.cart_title} ({totalItems} {totalItems > 1 ? t.cart_articles : t.cart_article})
            </h1>

            {items.map((item) => (
              <Card key={item.productId} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {item.image && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                      <p className="text-indigo-600 font-bold mt-1">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors"
                        >
                          −
                        </button>
                        <span className="px-3 py-1 text-sm font-medium border-x">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-r-lg transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              {[
                { icon: Shield,    label: t.cart_trust_pay },
                { icon: RotateCcw, label: t.cart_trust_ret },
                { icon: Zap,       label: t.cart_trust_fast },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-gray-500 bg-white rounded-lg p-3 border">
                  <Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>{t.cart_summary}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate mr-2">{item.name} × {item.quantity}</span>
                    <span className="font-medium flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}

                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{t.cart_subtotal}</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600 mb-3">
                    <span>{t.cart_shipping}</span>
                    <span>{t.cart_shipping_free}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>{t.cart_total}</span>
                    <span className="text-indigo-600">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleCheckout}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      {t.cart_loading}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t.cart_checkout}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Shield className="w-3 h-3" />
                  <span>{t.cart_ssl}</span>
                </div>

                {/* Payment logos */}
                <div className="flex items-center justify-center gap-2 pt-2 opacity-50">
                  <div className="text-xs font-bold bg-blue-600 text-white px-2 py-1 rounded">VISA</div>
                  <div className="text-xs font-bold bg-red-500 text-white px-2 py-1 rounded">MC</div>
                  <div className="text-xs font-bold bg-blue-400 text-white px-2 py-1 rounded">AMEX</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter storeName={storeName} />
    </div>
  )
}