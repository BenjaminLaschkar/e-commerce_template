'use client'

import { useLang } from '@/components/client/LangProvider'
import SiteHeader from '@/components/client/SiteHeader'
import SiteFooter from '@/components/client/SiteFooter'
import { Truck, Clock, Globe } from 'lucide-react'

interface ShippingRule {
  country: string
  price: number
  freeThreshold?: number | null
  estimatedDays?: string
}

interface Props {
  storeName: string
  logoUrl?: string | null
  deliveryContentFr: string
  deliveryContentEn?: string | null
  shippingRules: ShippingRule[]
}

export default function DeliveryClient({
  storeName,
  logoUrl,
  deliveryContentFr,
  deliveryContentEn,
  shippingRules,
}: Props) {
  const { lang, t } = useLang()
  const content = lang === 'en' && deliveryContentEn?.trim() ? deliveryContentEn : deliveryContentFr

  const cards = [
    { icon: Truck, title: t.delivery_fast,  desc: t.delivery_fast_sub },
    { icon: Clock, title: t.delivery_time,  desc: t.delivery_time_sub },
    { icon: Globe, title: t.delivery_world, desc: t.delivery_world_sub },
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader storeName={storeName} logoUrl={logoUrl} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">{t.delivery_title}</h1>
        <p className="text-gray-500 mb-8">{t.delivery_subtitle}</p>

        {/* Quick info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {cards.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-indigo-50 rounded-xl p-4 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              <p className="text-gray-500 text-xs">{desc}</p>
            </div>
          ))}
        </div>

        {/* Shipping rules table if configured */}
        {shippingRules.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t.delivery_rates}</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t.col_country}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t.col_price}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t.col_free_from}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t.col_estimated}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {shippingRules.map((rule, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{rule.country}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {rule.price === 0 ? t.shipping_free : `${rule.price}€`}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {rule.freeThreshold ? `${rule.freeThreshold}€` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{rule.estimatedDays || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Main content from DB */}
        {content.trim() && (
          <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
            {content}
          </div>
        )}
      </main>
      <SiteFooter storeName={storeName} />
    </div>
  )
}
