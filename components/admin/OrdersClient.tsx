'use client'

import { useState, Fragment } from 'react'
import { Search, Filter, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import AdminSidebar from '@/components/admin/Sidebar'
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'PAID', label: 'Payé' },
  { value: 'PROCESSING', label: 'En préparation' },
  { value: 'SHIPPED', label: 'Expédié' },
  { value: 'DELIVERED', label: 'Livré' },
  { value: 'CANCELLED', label: 'Annulé' },
]

interface Order {
  id: string
  orderNumber: string
  total: number
  status: string
  trackingNumber: string | null
  createdAt: Date
  customer: {
    firstName: string | null
    lastName: string | null
    email: string
  }
  items: Array<{
    name: string
    quantity: number
    price: number
    product: { name: string; images: string[] }
  }>
}

export default function AdminOrdersClient({ orders: initialOrders }: { orders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.email.toLowerCase().includes(search.toLowerCase()) ||
      `${o.customer.firstName} ${o.customer.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const updateStatus = async (orderId: string, status: string) => {
    const tracking = trackingInputs[orderId] || undefined

    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...(tracking ? { trackingNumber: tracking } : {}) }),
    })

    if (res.ok) {
      const data = await res.json()
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status, trackingNumber: data.order.trackingNumber } : o)))
      toast({ title: `✅ Statut mis à jour: ${ORDER_STATUS_LABELS[status]}` })
    } else {
      toast({ variant: 'destructive', title: 'Erreur mise à jour' })
    }
  }

  const statusCounts = ORDER_STATUSES.reduce((acc, s) => {
    acc[s.value] = orders.filter((o) => o.status === s.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
            <p className="text-gray-500 text-sm">{orders.length} commande{orders.length > 1 ? 's' : ''} au total</p>
          </div>

          {/* Status tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
            >
              Tout ({orders.length})
            </button>
            {ORDER_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'
                }`}
              >
                {s.label} ({statusCounts[s.value] || 0})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par n° commande, email..."
              className="pl-9"
            />
          </div>

          {/* Orders */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Commande</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((order) => (
                      <Fragment key={order.id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-indigo-600">{order.orderNumber}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">
                              {order.customer.firstName} {order.customer.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{order.customer.email}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold">{formatPrice(order.total)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                              {ORDER_STATUS_LABELS[order.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {formatDateTime(order.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <ChevronDown
                              className={`w-4 h-4 text-gray-400 transition-transform ${
                                expandedOrder === order.id ? 'rotate-180' : ''
                              }`}
                            />
                          </td>
                        </tr>

                        {/* Expanded detail */}
                        {expandedOrder === order.id && (
                          <tr key={`${order.id}-detail`}>
                            <td colSpan={6} className="px-4 py-4 bg-gray-50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Items */}
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2 text-xs uppercase">Articles</h4>
                                  {order.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm py-1">
                                      <span className="text-gray-600">{item.name} × {item.quantity}</span>
                                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Actions */}
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2 text-xs uppercase">Mettre à jour</h4>
                                  <div className="space-y-2">
                                    <Select
                                      defaultValue={order.status}
                                      onValueChange={(value) => updateStatus(order.id, value)}
                                    >
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ORDER_STATUSES.map((s) => (
                                          <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <Input
                                      placeholder="Numéro de suivi (tracking)"
                                      value={trackingInputs[order.id] || order.trackingNumber || ''}
                                      onChange={(e) =>
                                        setTrackingInputs({
                                          ...trackingInputs,
                                          [order.id]: e.target.value,
                                        })
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          Aucune commande trouvée
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
