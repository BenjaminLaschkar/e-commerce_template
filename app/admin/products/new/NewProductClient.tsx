'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, X, Upload, Images, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AdminSidebar from '@/components/admin/Sidebar'
import { useToast } from '@/components/ui/use-toast'
import { slugify } from '@/lib/utils'
import MediaPicker from '@/components/admin/MediaPicker'

interface ProductRef {
  id: string
  name: string
  slug: string
}

export default function NewProductClient({ allProducts }: { allProducts: ProductRef[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [images, setImages] = useState<string[]>([''])
  const [pickerOpen, setPickerOpen] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  // Options
  const [optGroups, setOptGroups] = useState<Array<{ name: string; choices: string[] }>>([]) 
  const [newChoices, setNewChoices] = useState<Record<number, string>>({})

  const addOptGroup = () => setOptGroups(prev => [...prev, { name: '', choices: [] }])
  const removeOptGroup = (gi: number) => {
    setOptGroups(prev => prev.filter((_, i) => i !== gi))
    setNewChoices(prev => { const n = { ...prev }; delete n[gi]; return n })
  }
  const updateOptGroupName = (gi: number, name: string) =>
    setOptGroups(prev => prev.map((g, i) => i === gi ? { ...g, name } : g))
  const addChoice = (gi: number) => {
    const val = (newChoices[gi] ?? '').trim()
    if (!val) return
    setOptGroups(prev => prev.map((g, i) => i === gi ? { ...g, choices: [...g.choices, val] } : g))
    setNewChoices(prev => ({ ...prev, [gi]: '' }))
  }
  const removeChoice = (gi: number, ci: number) =>
    setOptGroups(prev => prev.map((g, i) => i === gi ? { ...g, choices: g.choices.filter((_, j) => j !== ci) } : g))

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        if (res.ok) {
          const { url } = await res.json()
          setImages(prev => {
            const withoutEmpty = prev.filter(Boolean)
            return [...withoutEmpty, url]
          })
        }
      }
      toast({ title: `${files.length} image(s) ajoutée(s)` })
    } catch {
      toast({ variant: 'destructive', title: 'Upload échoué' })
    } finally {
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    shortDesc: '',
    price: '',
    comparePrice: '',
    stock: '',
    sku: '',
    isActive: true,
  })

  const [upsell, setUpsell] = useState({
    upsellActive: false,
    upsellPrice: '',
    upsellMessage: '',
    upsellSendEmail: false,
    upsellTriggerIds: [] as string[],
  })

  const handleNameChange = (name: string) => {
    setForm({ ...form, name, slug: slugify(name) })
  }

  const handleUpsellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setUpsell((u) => ({
      ...u,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const toggleTrigger = (id: string) => {
    setUpsell((u) => ({
      ...u,
      upsellTriggerIds: u.upsellTriggerIds.includes(id)
        ? u.upsellTriggerIds.filter((t) => t !== id)
        : [...u.upsellTriggerIds, id],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
          stock: parseInt(form.stock) || 0,
          images: images.filter(Boolean),
          // Options
          options: { groups: optGroups.filter(g => g.name.trim()) },
          // Upsell
          upsellActive: upsell.upsellActive,
          upsellPrice: upsell.upsellPrice ? parseFloat(upsell.upsellPrice) : null,
          upsellMessage: upsell.upsellMessage || null,
          upsellSendEmail: upsell.upsellSendEmail,
          upsellTriggerIds: upsell.upsellTriggerIds,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      toast({ title: '✅ Produit créé', description: 'Le produit a été créé avec succès.' })
      router.push('/admin/products')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/admin/products">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nouveau produit</h1>
              <p className="text-gray-500 text-sm">Ajouter un nouveau produit à la boutique</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informations générales</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Nom du produit *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Formation Marketing Digital"
                        required
                      />
                    </div>
                    <div>
                      <Label>Slug (URL)</Label>
                      <Input
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                        placeholder="formation-marketing-digital"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        URL: /produit/{form.slug || 'slug-produit'}
                      </p>
                    </div>
                    <div>
                      <Label>Description courte</Label>
                      <Input
                        value={form.shortDesc}
                        onChange={(e) => setForm({ ...form, shortDesc: e.target.value })}
                        placeholder="Résumé accrocheur du produit"
                      />
                    </div>
                    <div>
                      <Label>Description complète *</Label>
                      <Textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Description détaillée du produit. HTML accepté."
                        rows={8}
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">HTML supporté pour le formatage</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Images */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Images</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {images.map((img, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={img}
                          onChange={(e) => {
                            const next = [...images]
                            next[i] = e.target.value
                            setImages(next)
                          }}
                          placeholder="https://example.com/image.jpg ou /uploads/image.jpg"
                        />
                        {images.length > 1 && (
                          <Button
                            type="button" variant="ghost" size="icon"
                            onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => setImages([...images, ''])}
                        className="gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Ajouter une URL
                      </Button>
                      <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => uploadRef.current?.click()}
                        className="gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Uploader
                      </Button>
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => setPickerOpen(true)}
                        className="gap-1.5"
                      >
                        <Images className="w-3.5 h-3.5" /> Médiathèque
                      </Button>
                    </div>
                    {images.filter(Boolean).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {images.filter(Boolean).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <MediaPicker
                  open={pickerOpen}
                  onClose={() => setPickerOpen(false)}
                  multiple
                  onSelect={urls => setImages(prev => {
                    const withoutEmpty = prev.filter(Boolean)
                    const newUrls = urls.filter(u => !withoutEmpty.includes(u))
                    return [...withoutEmpty, ...newUrls]
                  })}
                />

                {/* ── OPTIONS ── */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Options produit</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-gray-500">
                      Définissez les variantes disponibles (Version, Couleur, Taille…).
                      Les choix seront affichés sur la page produit.
                    </p>
                    {optGroups.map((group, gi) => (
                      <div key={gi} className="border rounded-lg p-3 space-y-3">
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="Nom du groupe (ex : Version, Couleur)"
                            value={group.name}
                            onChange={e => updateOptGroupName(gi, e.target.value)}
                            className="flex-1"
                          />
                          <button type="button" onClick={() => removeOptGroup(gi)} className="text-red-500 hover:text-red-700 p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.choices.map((choice, ci) => (
                            <span key={ci} className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm">
                              {choice}
                              <button type="button" onClick={() => removeChoice(gi, ci)} className="text-gray-400 hover:text-red-500">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ajouter un choix…"
                            value={newChoices[gi] ?? ''}
                            onChange={e => setNewChoices(prev => ({ ...prev, [gi]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChoice(gi))}
                            className="flex-1"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={() => addChoice(gi)}>
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addOptGroup} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un groupe d’options
                    </Button>
                  </CardContent>
                </Card>

                {/* ── UPSELL ── */}
                <Card className="border-indigo-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-500" />
                      Configuration Upsell
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Active toggle */}
                    <div className="flex items-center gap-3">
                      <input
                        id="upsellActive"
                        name="upsellActive"
                        type="checkbox"
                        checked={upsell.upsellActive}
                        onChange={handleUpsellChange}
                        className="h-4 w-4 accent-indigo-600"
                      />
                      <Label htmlFor="upsellActive" className="cursor-pointer font-medium">
                        Activer cet article comme offre upsell
                      </Label>
                    </div>

                    {upsell.upsellActive && (
                      <div className="space-y-4 pl-4 border-l-2 border-indigo-100">
                        {/* Upsell price */}
                        <div>
                          <Label htmlFor="upsellPrice">Prix upsell (€)</Label>
                          <p className="text-xs text-gray-400 mb-1">
                            Prix spécial affiché sur la page upsell. Laissez vide pour utiliser le prix normal.
                          </p>
                          <Input
                            id="upsellPrice"
                            name="upsellPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={form.price || '0.00'}
                            value={upsell.upsellPrice}
                            onChange={handleUpsellChange}
                            className="max-w-xs"
                          />
                        </div>

                        {/* Upsell message */}
                        <div>
                          <Label htmlFor="upsellMessage">Message upsell</Label>
                          <p className="text-xs text-gray-400 mb-1">
                            Texte d'accroche affiché sur la page upsell.
                          </p>
                          <Textarea
                            id="upsellMessage"
                            name="upsellMessage"
                            value={upsell.upsellMessage}
                            onChange={handleUpsellChange}
                            rows={3}
                            placeholder="Complétez votre achat avec cette offre exclusive..."
                          />
                        </div>

                        {/* Send email */}
                        <div className="flex items-start gap-3">
                          <input
                            id="upsellSendEmail"
                            name="upsellSendEmail"
                            type="checkbox"
                            checked={upsell.upsellSendEmail}
                            onChange={handleUpsellChange}
                            className="h-4 w-4 accent-indigo-600 mt-0.5"
                          />
                          <div>
                            <Label htmlFor="upsellSendEmail" className="cursor-pointer font-medium">
                              Envoyer un e-mail automatique pour cet upsell
                            </Label>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Un e-mail de type "UPSELL" est envoyé au client quand il accepte cette offre.
                            </p>
                          </div>
                        </div>

                        {/* Trigger products */}
                        <div>
                          <Label>Produits déclencheurs</Label>
                          <p className="text-xs text-gray-400 mb-2">
                            Cochez les produits dont l'achat doit afficher cette offre upsell en page de confirmation.
                          </p>
                          {allProducts.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Aucun autre produit disponible.</p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                              {allProducts.map((p) => (
                                <label
                                  key={p.id}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={upsell.upsellTriggerIds.includes(p.id)}
                                    onChange={() => toggleTrigger(p.id)}
                                    className="h-4 w-4 accent-indigo-600"
                                  />
                                  <div>
                                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                                    <span className="ml-2 text-xs text-gray-400 font-mono">{p.slug}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                          {upsell.upsellTriggerIds.length > 0 && (
                            <p className="text-xs text-indigo-600 mt-1">
                              {upsell.upsellTriggerIds.length} produit(s) sélectionné(s)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Prix & Stock</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Prix (€) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        placeholder="97.00"
                        required
                      />
                    </div>
                    <div>
                      <Label>Prix barré (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.comparePrice}
                        onChange={(e) => setForm({ ...form, comparePrice: e.target.value })}
                        placeholder="197.00"
                      />
                    </div>
                    <div>
                      <Label>Stock *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        placeholder="999"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">999 = illimité (digital)</p>
                    </div>
                    <div>
                      <Label>SKU</Label>
                      <Input
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder="PROD-001"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Statut</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Label>Produit actif</Label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, isActive: !form.isActive })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.isActive ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            form.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {form.isActive ? 'Visible sur la boutique' : 'Masqué de la boutique'}
                    </p>
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Création...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Créer le produit
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
