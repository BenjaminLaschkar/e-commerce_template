'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, ArrowLeft, Upload, Images, Zap } from 'lucide-react'
import MediaPicker from '@/components/admin/MediaPicker'

interface ProductRef {
  id: string
  name: string
  slug: string
}

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  images: string[]
  stock: number
  sku: string | null
  features: string[]
  isActive: boolean
  // Upsell
  upsellActive: boolean
  upsellPrice: number | null
  upsellMessage: string | null
  upsellSendEmail: boolean
  upsellTriggerIds: string[]
}

export default function ProductEditClient({
  product,
  allProducts,
}: {
  product: Product
  allProducts: ProductRef[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? '',
    price: product.price.toString(),
    comparePrice: product.comparePrice?.toString() ?? '',
    stock: product.stock.toString(),
    sku: product.sku ?? '',
    isActive: product.isActive,
  })
  const [images, setImages] = useState<string[]>(product.images ?? [])
  const [features, setFeatures] = useState<string[]>(
    (product.features ?? []).length > 0 ? (product.features ?? []) : [''],
  )
  const [upsell, setUpsell] = useState({
    upsellActive: product.upsellActive,
    upsellPrice: product.upsellPrice?.toString() ?? '',
    upsellMessage: product.upsellMessage ?? '',
    upsellSendEmail: product.upsellSendEmail,
    upsellTriggerIds: product.upsellTriggerIds ?? [],
  })
  const [newImageUrl, setNewImageUrl] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const toastRef = toast({ title: 'Upload en cours...' })
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        if (res.ok) {
          const { url } = await res.json()
          setImages(prev => [...prev, url])
        }
      }
      toast({ title: `${files.length} image(s) ajoutée(s)` })
    } catch {
      toast({ variant: 'destructive', title: 'Upload échoué' })
    } finally {
      if (uploadRef.current) uploadRef.current.value = ''
    }
    void toastRef
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
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

  const addImage = () => {
    if (!newImageUrl.trim()) return
    setImages((prev) => [...prev, newImageUrl.trim()])
    setNewImageUrl('')
  }

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i))
  }

  const updateFeature = (i: number, val: string) => {
    setFeatures((prev) => prev.map((f, idx) => (idx === i ? val : f)))
  }

  const addFeature = () => setFeatures((prev) => [...prev, ''])
  const removeFeature = (i: number) => setFeatures((prev) => prev.filter((_, idx) => idx !== i))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
      stock: parseInt(form.stock),
      sku: form.sku || null,
      images,
      features: features.filter((f) => f.trim()),
      isActive: form.isActive,
      // Upsell
      upsellActive: upsell.upsellActive,
      upsellPrice: upsell.upsellPrice ? parseFloat(upsell.upsellPrice) : null,
      upsellMessage: upsell.upsellMessage || null,
      upsellSendEmail: upsell.upsellSendEmail,
      upsellTriggerIds: upsell.upsellTriggerIds,
    }

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur serveur')
      }

      toast({ title: '✅ Produit mis à jour avec succès' })
      router.push('/admin/products')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast({ title: 'Erreur', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Other products (exclude self) for the trigger list
  const otherProducts = allProducts.filter((p) => p.id !== product.id)

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/products')}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Modifier le produit</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Infos générales */}
            <Card>
              <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du produit *</Label>
                  <Input id="name" name="name" value={form.name} onChange={handleChange} required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" value={form.description} onChange={handleChange} rows={4} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input id="sku" name="sku" value={form.sku} onChange={handleChange} className="mt-1" />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      id="isActive"
                      name="isActive"
                      type="checkbox"
                      checked={form.isActive}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">Produit actif</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prix & stock */}
            <Card>
              <CardHeader><CardTitle className="text-base">Prix & Stock</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price">Prix (€) *</Label>
                    <Input id="price" name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="comparePrice">Prix barré (€)</Label>
                    <Input id="comparePrice" name="comparePrice" type="number" step="0.01" min="0" value={form.comparePrice} onChange={handleChange} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock *</Label>
                    <Input id="stock" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader><CardTitle className="text-base">Images</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                  />
                  <Button type="button" onClick={addImage} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                  <Button type="button" variant="outline" size="sm" onClick={() => uploadRef.current?.click()} className="gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Uploader
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)} className="gap-1.5">
                    <Images className="w-3.5 h-3.5" /> Depuis la médiathèque
                  </Button>
                </div>
                {images.length > 0 && (
                  <div className="space-y-2">
                    {images.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-12 h-12 object-cover rounded" />
                        <span className="flex-1 text-sm text-gray-600 truncate">{url}</span>
                        <button type="button" onClick={() => removeImage(i)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <MediaPicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              multiple
              onSelect={urls => setImages(prev => [...prev, ...urls.filter(u => !prev.includes(u))])}
            />

            {/* Features */}
            <Card>
              <CardHeader><CardTitle className="text-base">Caractéristiques</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {features.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Caractéristique ${i + 1}`}
                      value={f}
                      onChange={(e) => updateFeature(i, e.target.value)}
                    />
                    <button type="button" onClick={() => removeFeature(i)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addFeature} className="w-full mt-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une caractéristique
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
                        placeholder={form.price}
                        value={upsell.upsellPrice}
                        onChange={handleUpsellChange}
                        className="max-w-xs"
                      />
                    </div>

                    {/* Upsell message */}
                    <div>
                      <Label htmlFor="upsellMessage">Message upsell</Label>
                      <p className="text-xs text-gray-400 mb-1">
                        Texte d'accroche affiché sur la page upsell (ex: "Offre exclusive réservée aux nouveaux clients").
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
                      {otherProducts.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Aucun autre produit disponible.</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                          {otherProducts.map((p) => (
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

            <div className="flex gap-3 pb-8">
              <Button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                {loading ? 'Enregistrement...' : '💾 Enregistrer les modifications'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>
                Annuler
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
