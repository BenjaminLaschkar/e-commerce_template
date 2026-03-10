'use client'

import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import AdminSidebar from '@/components/admin/Sidebar'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'

export default function AdminAnalyticsClient({
  funnelStats,
  dailyStats,
  eventBreakdown,
  topProducts,
  products,
}: {
  funnelStats: any
  dailyStats: any[]
  eventBreakdown: any[]
  topProducts: any[]
  products: any[]
}) {
  const { metrics, steps } = funnelStats

  const funnelData = steps.map((step: any, i: number) => ({
    name: step.name,
    value: step.value,
    fill: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'][i],
  }))

  const maxStep = Math.max(...steps.map((s: any) => s.value), 1)

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Funnel</h1>
            <p className="text-gray-500 text-sm">Analyse de conversion des 30 derniers jours</p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Taux de conversion',
                value: `${metrics.conversionRate}%`,
                desc: 'Vue → Paiement',
                color: 'text-indigo-600',
                good: metrics.conversionRate > 2,
              },
              {
                label: 'Abandon panier',
                value: `${metrics.cartAbandonRate}%`,
                desc: `${metrics.cartAbandon} paniers abandonnés`,
                color: 'text-red-600',
                good: metrics.cartAbandonRate < 70,
              },
              {
                label: 'Checkout → Paiement',
                value: `${metrics.checkoutConversionRate}%`,
                desc: 'Des checkouts convertis',
                color: 'text-green-600',
                good: metrics.checkoutConversionRate > 60,
              },
              {
                label: 'Taux upsell',
                value: `${metrics.upsellConversionRate}%`,
                desc: `${metrics.upsellAccept} upsells acceptés`,
                color: 'text-purple-600',
                good: metrics.upsellConversionRate > 20,
              },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 font-medium mb-1">{kpi.label}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    {kpi.good ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{kpi.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Funnel visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entonnoir de conversion</CardTitle>
                <CardDescription className="text-xs">Analyse étape par étape</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step: any, i: number) => {
                    const pct = ((step.value / maxStep) * 100).toFixed(0)
                    const dropRate =
                      i > 0 && steps[i - 1].value > 0
                        ? (100 - (step.value / steps[i - 1].value) * 100).toFixed(1)
                        : null

                    return (
                      <div key={step.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700">{step.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {dropRate && (
                              <span className="text-xs text-red-500">
                                -{dropRate}%
                              </span>
                            )}
                            <span className="text-sm font-bold text-gray-900">
                              {step.value.toLocaleString('fr-FR')}
                            </span>
                          </div>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {i < steps.length - 1 && (
                          <div className="flex justify-center my-1">
                            <ArrowRight className="w-3 h-3 text-gray-300 rotate-90" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Daily stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ventes & Visites — 14 jours</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => {
                        const d = new Date(v)
                        return `${d.getDate()}/${d.getMonth() + 1}`
                      }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(l) => `Jour: ${l}`}
                    />
                    <Bar dataKey="views" fill="#e0e7ff" name="Vues" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="sales" fill="#6366f1" name="Ventes" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revenue chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenu journalier — 14 jours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => {
                      const d = new Date(v)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}€`, 'CA']} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ fill: '#6366f1', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Events breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Événements par type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {eventBreakdown.map((e) => (
                    <div key={e.event} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <span className="text-sm text-gray-600 font-mono text-xs">{e.event}</span>
                      <Badge variant="secondary">{e._count.event.toLocaleString('fr-FR')}</Badge>
                    </div>
                  ))}
                  {eventBreakdown.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">Aucun événement enregistré</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Résumé du funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Visiteurs produit', value: metrics.productViews, icon: '👁️' },
                    { label: 'Ajouts au panier', value: metrics.addToCart, icon: '🛒' },
                    { label: 'Checkouts démarrés', value: metrics.checkoutStart, icon: '📋' },
                    { label: 'Paiements réussis', value: metrics.paymentSuccess, icon: '✅' },
                    { label: 'Paniers abandonnés', value: metrics.cartAbandon, icon: '❌' },
                    { label: 'Upsells vus', value: metrics.upsellViews, icon: '🚀' },
                    { label: 'Upsells acceptés', value: metrics.upsellAccept, icon: '💰' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {item.icon} {item.label}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {item.value.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
