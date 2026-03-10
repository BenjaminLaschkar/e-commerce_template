'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Package, Star, Truck, Shield, RotateCcw, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { useLang } from '@/components/client/LangProvider'
import SiteHeader from '@/components/client/SiteHeader'
import SiteFooter from '@/components/client/SiteFooter'

interface Product {
  id: string
  name: string
  slug: string
  shortDesc: string | null
  price: number
  comparePrice: number | null
  images: string[]
  stock: number
}

interface Props {
  products: Product[]
  heroImages?: string[]
  storeName?: string
  storeTagline?: string
  logoUrl?: string | null
}

const PLACEHOLDER_HERO = [
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=80',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1400&q=80',
]

function HeroCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0)
  const total = images.length
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total])
  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total])

  useEffect(() => {
    if (total <= 1) return
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [next, total])

  return (
    <div className="relative w-full h-56 sm:h-72 md:h-[400px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[current]} alt={`Galerie ${current + 1}`} className="w-full h-full object-cover" />
        </motion.div>
      </AnimatePresence>
      {total > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${i === current ? 'bg-white w-5' : 'bg-white/50 w-2'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function CatalogClient({
  products,
  heroImages = [],
  storeName = 'Boutique',
  storeTagline,
  logoUrl,
}: Props) {
  const { t } = useLang()
  const images = heroImages.length > 0 ? heroImages : PLACEHOLDER_HERO

  const TRUST_BADGES = [
    { icon: Truck,     label: t.trust_ship, sub: t.trust_ship_sub },
    { icon: Shield,    label: t.trust_pay,  sub: t.trust_pay_sub  },
    { icon: RotateCcw, label: t.trust_ret,  sub: t.trust_ret_sub  },
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader storeName={storeName} logoUrl={logoUrl} />

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 md:py-20 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 text-center md:text-left"
          >
            <Badge className="bg-white/20 text-white border-0 mb-4 text-xs px-3 py-1">{t.hero_badge}</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              {storeTagline || t.tagline}
            </h1>
            <p className="text-indigo-200 text-base sm:text-lg mb-8 max-w-md mx-auto md:mx-0">{t.sub_tagline}</p>
            <a href="#catalogue">
              <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold gap-2">
                {t.hero_cta} <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full md:w-[420px] lg:w-[480px] shrink-0"
          >
            <HeroCarousel images={images} />
          </motion.div>
        </div>
      </section>

      {/* ── TRUST BADGES ── */}
      <section className="border-b bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-gray-500 text-xs">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATALOGUE ── */}
      <section id="catalogue" className="max-w-6xl mx-auto px-4 py-10 sm:py-14 flex-1">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{t.catalogue_title}</h2>
          <p className="text-gray-500 mt-1">
            {products.length} produit{products.length !== 1 ? 's' : ''} disponible{products.length !== 1 ? 's' : ''}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 bg-gray-50 rounded-2xl">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-500">Aucun produit disponible</h3>
            <p className="text-gray-400 mt-2">Revenez bientôt !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} t={t} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter storeName={storeName} />
    </div>
  )
}

function ProductCard({ product, index, t }: { product: Product; index: number; t: any }) {
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
      <Link href={`/products/${product.slug}`} className="group block h-full">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 h-full flex flex-col">
          <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
            {product.images[0] ? (
              <Image src={product.images[0]} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`https://placehold.co/400x300/e5e7eb/9ca3af?text=${encodeURIComponent(product.name)}`} alt={product.name} className="object-cover w-full h-full" />
            )}
            {discount && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-red-500 text-white border-0 font-bold text-xs">-{discount}%</Badge>
              </div>
            )}
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-white text-gray-800 text-sm font-semibold px-3 py-1 rounded-full">{t.out_of_stock}</span>
              </div>
            )}
          </div>
          <div className="p-4 sm:p-5 flex flex-col flex-1">
            <div className="flex items-center gap-0.5 mb-2">
              {[...Array(5)].map((_, s) => (<Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />))}
              <span className="text-xs text-gray-400 ml-1">(4.9)</span>
            </div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors flex-1">{product.name}</h3>
            {product.shortDesc && (<p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mb-3">{product.shortDesc}</p>)}
            <div className="flex items-baseline gap-2 mt-auto mb-3">
              <span className="text-lg sm:text-xl font-extrabold text-gray-900">{formatPrice(product.price)}</span>
              {product.comparePrice && (<span className="text-sm text-gray-400 line-through">{formatPrice(product.comparePrice)}</span>)}
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-sm" disabled={product.stock === 0} tabIndex={-1}>
              <ShoppingCart className="w-3.5 h-3.5" />
              {product.stock === 0 ? t.unavailable : t.view_product}
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
