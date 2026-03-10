'use client'

import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Euro,
  Package,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import AdminSidebar from '@/components/admin/Sidebar'
import { formatPrice, formatDate, formatDateTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'
import Link from 'next/link'

interface DashboardData {
  stats: {
    totalRevenue: number
    totalOrders: number
    todayRevenue: number
    todayOrders: number
    thisMonthRevenue: number
    lastMonthRevenue: number
    pendingOrders: number
    totalCustomers: number
    abandonedCarts: number
    conversionRate: string
  }
  funnel: {
    productViews: number
    addToCart: number
    checkoutStart: number
    paymentSuccess: number
  }
  recentOrders: any[]
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>
}

export default function AdminDashboardClient({ data }: { data: DashboardData }) {
  const { stats, funnel, recentOrders, revenueByDay } = data

  const monthGrowth =
    stats.lastMonthRevenue > 0
      ? (((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100).toFixed(1)
      : null

  const statCards = [
    {
      title: 'CA Total',
      value: formatPrice(stats.totalRevenue),
      description: `${stats.totalOrders} commandes`,
      icon: Euro,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      title: "CA Aujourd'hui",
      value: formatPrice(stats.todayRevenue),
      description: `${stats.todayOrders} commandes`,
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'CA Ce mois',
      value: formatPrice(stats.thisMonthRevenue),
      description:
        monthGrowth !== null
          ? `${monthGrowth > '0' ? '+' : ''}${monthGrowth}% vs mois dernier`
          : 'Premier mois',
      icon: TrendingUp,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      title: 'Clients',
      value: stats.totalCustomers.toString(),
      description: `${stats.abandonedCarts} paniers abandonnés`,
      icon: Users,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Taux conversion',
      value: `${stats.conversionRate}%`,
      description: 'Vue produit → paiement',
      icon: ArrowUpRight,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      title: 'En attente',
      value: stats.pendingOrders.toString(),
      description: 'Commandes à traiter',
      icon: AlertCircle,
      color: 'text-yellow-600 bg-yellow-50',
    },
  ]

  const funnelSteps = [
    { label: 'Vues produit', value: funnel.productViews, color: 'bg-blue-500' },
    { label: 'Ajout panier', value: funnel.addToCart, color: 'bg-indigo-500' },
    { label: 'Checkout', value: funnel.checkoutStart, color: 'bg-purple-500' },
    { label: 'Paiements', value: funnel.paymentSuccess, color: 'bg-green-500' },
  ]

  const maxFunnel = Math.max(...funnelSteps.map((s) => s.value), 1)

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 text-sm">Vue d'ensemble de votre boutique</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Badge>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {statCards.map((card) => (
              <Card key={card.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>
                    <card.icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{card.title}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Chiffre d'affaires — 14 derniers jours</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => {
                        const d = new Date(v)
                        return `${d.getDate()}/${d.getMonth() + 1}`
                      }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                    <Tooltip
                      formatter={(v: number) => [formatPrice(v), 'CA']}
                      labelFormatter={(label) => `Jour: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Funnel mini */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funnel 30 jours</CardTitle>
                <CardDescription className="text-xs">
                  Taux conversion: {stats.conversionRate}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {funnelSteps.map((step, i) => {
                  const pct = ((step.value / maxFunnel) * 100).toFixed(0)
                  const convFromPrev =
                    i > 0 && funnelSteps[i - 1].value > 0
                      ? ((step.value / funnelSteps[i - 1].value) * 100).toFixed(0)
                      : null
                  return (
                    <div key={step.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{step.label}</span>
                        <span className="text-gray-900 font-bold">{step.value.toLocaleString('fr-FR')}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${step.color} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {convFromPrev !== null && (
                        <p className="text-xs text-gray-400 mt-0.5 text-right">
                          → {convFromPrev}% du step précédent
                        </p>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Recent orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Commandes récentes</CardTitle>
              <Link href="/admin/orders" className="text-sm text-indigo-600 hover:underline">
                Voir tout →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Commande</th>
                      <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Montant</th>
                      <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="py-3 font-mono text-xs text-gray-600">{order.orderNumber}</td>
                        <td className="py-3">
                          <p className="font-medium text-gray-900">
                            {order.customer.firstName} {order.customer.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{order.customer.email}</p>
                        </td>
                        <td className="py-3 font-semibold">{formatPrice(order.total)}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-gray-400">
                          {formatDateTime(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {recentOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">
                          Aucune commande pour le moment
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
