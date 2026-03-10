'use client'

import { useState } from 'react'
import { Send, Search, CheckCircle, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import AdminSidebar from '@/components/admin/Sidebar'
import { formatDateTime } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

const SEGMENTS = [
  { value: 'all', label: 'Tous les clients', icon: '👥' },
  { value: 'buyers', label: 'Acheteurs', icon: '🛍️' },
  { value: 'abandoned', label: 'Abandons panier', icon: '🛒' },
  { value: 'visitors', label: 'Visiteurs', icon: '👁️' },
]

const EMAIL_TYPE_LABELS: Record<string, string> = {
  ORDER_CONFIRMATION: 'Confirmation commande',
  ORDER_SHIPPED: 'Expédition',
  ORDER_DELIVERED: 'Livraison',
  ORDER_CANCELLED: 'Annulation',
  CART_ABANDON_1: 'Abandon panier (1h)',
  CART_ABANDON_2: 'Abandon panier (24h)',
  PROMO: 'Promotion',
  UPSELL: 'Upsell',
  CAMPAIGN: 'Campagne',
}

export default function AdminMailingClient({
  customers,
  emailLogs,
  products,
}: {
  customers: any[]
  emailLogs: any[]
  products: any[]
}) {
  const { toast } = useToast()
  const [segment, setSegment] = useState('all')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [search, setSearch] = useState('')

  // Add contact modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newContact, setNewContact] = useState({ email: '', firstName: '', lastName: '' })
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [localCustomers, setLocalCustomers] = useState(customers)

  const filteredCustomers = localCustomers.filter((c: any) =>
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())
  )

  const segmentCount = {
    all: localCustomers.length,
    buyers: localCustomers.filter((c: any) => c._count.orders > 0).length,
    abandoned: localCustomers.filter((c: any) => c._count.carts > 0).length,
    visitors: localCustomers.length,
  }

  // ── Add contact ─────────────────────────────────────────────────────────────
  const handleAddContact = async () => {
    if (!newContact.email) return
    setIsAddingContact(true)
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocalCustomers((prev: any[]) => [{ ...data, _count: { orders: 0, carts: 0 } }, ...prev])
      setNewContact({ email: '', firstName: '', lastName: '' })
      setShowAddModal(false)
      toast({ title: '✅ Contact ajouté' })
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' })
    } finally {
      setIsAddingContact(false)
    }
  }

  // ── Delete contact ───────────────────────────────────────────────────────────
  const handleDeleteContact = async (id: string) => {
    if (!confirm('Supprimer ce contact ?')) return
    try {
      await fetch('/api/admin/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setLocalCustomers((prev: any[]) => prev.filter((c) => c.id !== id))
      toast({ title: 'Contact supprimé' })
    } catch {
      toast({ title: 'Erreur suppression', variant: 'destructive' })
    }
  }

  // ── Send campaign ────────────────────────────────────────────────────────────
  const handleSendCampaign = async () => {
    if (!subject.trim() || !content.trim()) {
      toast({ variant: 'destructive', title: 'Remplissez le sujet et le contenu' })
      return
    }
    if (!confirm(`Envoyer à ${segmentCount[segment as keyof typeof segmentCount]} destinataires ?`)) return

    setIsSending(true)
    setSendResult(null)

    try {
      const res = await fetch('/api/admin/mailing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment, subject, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSendResult(data)
      toast({ title: `✅ Campagne envoyée — ${data.sent}/${data.total} emails` })
      setSubject('')
      setContent('')
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur envoi', description: error instanceof Error ? error.message : 'Erreur inconnue' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mailing</h1>
            <p className="text-gray-500 text-sm">{localCustomers.length} contacts dans la base</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Campaign composer */}
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Envoyer une campagne</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Segment</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {SEGMENTS.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setSegment(s.value)}
                          className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                            segment === s.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-lg mb-1">{s.icon}</div>
                          <div className="font-medium">{s.label}</div>
                          <div className="text-xs text-gray-400">
                            {segmentCount[s.value as keyof typeof segmentCount]} contacts
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Sujet de l'email</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="🚀 Offre exclusive réservée aux membres..."
                    />
                  </div>

                  <div>
                    <Label>Contenu (HTML supporté)</Label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="<h2>Bonjour !</h2><p>...</p>"
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Variables disponibles : {'{firstName}'}, {'{email}'}
                    </p>
                  </div>

                  {sendResult && (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div className="text-sm">
                        <p className="font-medium text-green-800">Campagne envoyée</p>
                        <p className="text-green-600">
                          {sendResult.sent} envoyés · {sendResult.failed} erreurs · {sendResult.total} total
                        </p>
                      </div>
                    </div>
                  )}

                  <Button onClick={handleSendCampaign} disabled={isSending} className="w-full">
                    {isSending ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Envoi en cours...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Envoyer à {segmentCount[segment as keyof typeof segmentCount]} contacts
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Contacts list */}
            <div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Base contacts</CardTitle>
                  <Button size="sm" onClick={() => setShowAddModal(true)} className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher..."
                      className="pl-9 h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1 max-h-96 overflow-auto">
                    {filteredCustomers.slice(0, 100).map((customer: any) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between py-2 border-b last:border-0 group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {customer.firstName} {customer.lastName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{customer.email}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          {customer._count.orders > 0 && (
                            <Badge variant="success" className="text-[10px] px-1">
                              {customer._count.orders}cmd
                            </Badge>
                          )}
                          <button
                            onClick={() => handleDeleteContact(customer.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-6">Aucun contact</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Email logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique emails</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Destinataire</th>
                      <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Sujet</th>
                      <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {emailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="py-2">
                          <Badge variant="info" className="text-[10px]">
                            {EMAIL_TYPE_LABELS[log.type] || log.type}
                          </Badge>
                        </td>
                        <td className="py-2 text-gray-600 text-xs">{log.to}</td>
                        <td className="py-2 text-gray-700 text-xs max-w-xs truncate">{log.subject}</td>
                        <td className="py-2">
                          <span className={`text-xs ${log.status === 'sent' ? 'text-green-600' : 'text-red-500'}`}>
                            {log.status === 'sent' ? '✓ Envoyé' : '✗ Erreur'}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-gray-400">{formatDateTime(log.sentAt)}</td>
                      </tr>
                    ))}
                    {emailLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400 text-sm">
                          Aucun email envoyé
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

      {/* Add contact modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Ajouter un contact</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="nc-email">Email *</Label>
                <Input
                  id="nc-email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                  placeholder="contact@example.com"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nc-first">Prénom</Label>
                  <Input
                    id="nc-first"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Jean"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="nc-last">Nom</Label>
                  <Input
                    id="nc-last"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Dupont"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <Button
                onClick={handleAddContact}
                disabled={isAddingContact || !newContact.email}
                className="flex-1"
              >
                {isAddingContact ? 'Ajout...' : 'Ajouter le contact'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
