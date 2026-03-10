'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Star, Shield, Truck, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import SiteHeader from '@/components/client/SiteHeader'
import SiteFooter from '@/components/client/SiteFooter'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/components/client/CartProvider'
import { useToast } from '@/components/ui/use-toast'
import { formatPrice } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  images: string[]
  stock: number
  features: string[]
  isActive: boolean
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ProductPageClient({ product }: { product: Product }) {
  const { addItem, totalItems, sessionId } = useCart()
  const { toast } = useToast()
  const router = useRouter()

  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const tracked = useRef(false)

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null

  // Track PRODUCT_VIEW once
  useEffect(() => {
    if (tracked.current || !sessionId) return
    tracked.current = true

    fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        event: 'PRODUCT_VIEW',
        productId: product.id,
      }),
    }).catch(() => {})
  }, [sessionId, product.id])

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleAddToCart() {
    setIsAdding(true)
    try {
      await addItem(product, quantity)

      // Track ADD_TO_CART
      fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          event: 'ADD_TO_CART',
          productId: product.id,
          metadata: { quantity },
        }),
      }).catch(() => {})

      toast({
        title: '🛒 Ajouté au panier',
        description: `${product.name} × ${quantity}`,
        duration: 2500,
      })
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Stock insuffisant',
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
    }
  }

  function handleBuyNow() {
    handleAddToCart().then(() => {
      router.push('/cart')
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader />
      <main className="flex-1">
      {/* Top banner */}
      <div className="bg-indigo-600 text-white text-center py-2 text-sm font-medium">
        🚚 Livraison gratuite à partir de 50€ — Satisfait ou remboursé 30 jours
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border"
            >
              {product.images.length > 0 ? (
                <Image
                  src={product.images[selectedImage]}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                  priority
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`https://placehold.co/600x600/e5e7eb/9ca3af?text=${encodeURIComponent(product.name)}`} alt={product.name} className="object-contain p-4 w-full h-full" />
              )}
              {discount && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  -{discount}%
                </div>
              )}
            </motion.div>

            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      i === selectedImage ? 'border-indigo-500' : 'border-gray-200'
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col gap-5">
            {/* Title + stars */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm text-gray-500">4.9 (127 avis)</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-gray-900">
                {formatPrice(product.price)}
              </span>
              {product.comparePrice && (
                <span className="text-xl text-gray-400 line-through">
                  {formatPrice(product.comparePrice)}
                </span>
              )}
              {discount && (
                <Badge className="bg-red-100 text-red-600">Économisez {discount}%</Badge>
              )}
            </div>

            {/* Stock badge */}
            <div>
              {product.stock <= 5 && product.stock > 0 ? (
                <Badge variant="warning">
                  🔥 Plus que {product.stock} en stock !
                </Badge>
              ) : product.stock === 0 ? (
                <Badge variant="destructive">Rupture de stock</Badge>
              ) : (
                <Badge variant="success">✓ En stock</Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <p className={`text-gray-600 leading-relaxed ${!showFullDesc ? 'line-clamp-3' : ''}`}>
                  {product.description}
                </p>
                {product.description.length > 180 && (
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="text-indigo-600 text-sm flex items-center gap-1 mt-1"
                  >
                    {showFullDesc ? (
                      <>Voir moins <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>Voir plus <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Features */}
            {(product.features ?? []).length > 0 && (
              <ul className="space-y-1.5">
                {(product.features ?? []).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-indigo-500 font-bold mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            )}

            {/* Quantity + CTA */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Quantité :</span>
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 bg-gray-50 hover:bg-gray-100 transition text-lg font-medium"
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="px-4 py-2 font-bold min-w-[3rem] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="px-3 py-2 bg-gray-50 hover:bg-gray-100 transition text-lg font-medium"
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={isAdding || product.stock === 0}
                  className="flex-1 h-12 text-base bg-indigo-600 hover:bg-indigo-700"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {isAdding ? 'Ajout...' : 'Ajouter au panier'}
                </Button>
                <Button
                  onClick={handleBuyNow}
                  disabled={isAdding || product.stock === 0}
                  variant="outline"
                  className="flex-1 h-12 text-base border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                >
                  Acheter maintenant
                </Button>
              </div>
            </div>

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t">
              {[
                { icon: <Shield className="w-5 h-5 text-indigo-500" />, label: 'Paiement sécurisé' },
                { icon: <Truck className="w-5 h-5 text-indigo-500" />, label: 'Livraison rapide' },
                { icon: <RefreshCw className="w-5 h-5 text-indigo-500" />, label: 'Retour 30 jours' },
              ].map((t) => (
                <div key={t.label} className="flex flex-col items-center text-center gap-1">
                  {t.icon}
                  <span className="text-xs text-gray-500">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Social proof */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Ce que disent nos clients
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Sophie M.',
                rating: 5,
                text: 'Qualité exceptionnelle, livraison rapide. Je recommande vivement !',
              },
              {
                name: 'Jean-Pierre D.',
                rating: 5,
                text: 'Très satisfait de mon achat. Produit conforme à la description.',
              },
              {
                name: 'Marie L.',
                rating: 5,
                text: "Service client au top, produit parfait. J'en ai commandé deux !",
              },
            ].map((review) => (
              <div key={review.name} className="bg-gray-50 rounded-xl p-5 border">
                <div className="flex text-yellow-400 mb-2">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm mb-3 italic">&quot;{review.text}&quot;</p>
                <p className="text-xs font-semibold text-gray-500">{review.name}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      </main>
      <SiteFooter />
    </div>
  )
}
