'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Upload, Trash2, GripVertical, ImagePlus, Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import AdminSidebar from '@/components/admin/Sidebar'

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Nunito', 'Open Sans', 'Lato', 'Raleway',
]

interface Props {
  initialStoreName: string
  initialStoreTagline: string
  initialAboutContent: string
  initialStoreNameEN: string
  initialStoreTaglineEN: string
  initialAboutContentEN: string
  initialPrimaryColor: string
  initialFontFamily: string
  initialLogoUrl: string
  initialHeroImages: string[]
}

export default function DesignClient({
  initialStoreName,
  initialStoreTagline,
  initialAboutContent,
  initialStoreNameEN,
  initialStoreTaglineEN,
  initialAboutContentEN,
  initialPrimaryColor,
  initialFontFamily,
  initialLogoUrl,
  initialHeroImages,
}: Props) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // FR content
  const [storeName, setStoreName] = useState(initialStoreName)
  const [storeTagline, setStoreTagline] = useState(initialStoreTagline)
  const [aboutContent, setAboutContent] = useState(initialAboutContent)

  // EN translations
  const [storeNameEN, setStoreNameEN] = useState(initialStoreNameEN)
  const [storeTaglineEN, setStoreTaglineEN] = useState(initialStoreTaglineEN)
  const [aboutContentEN, setAboutContentEN] = useState(initialAboutContentEN)
  const [translating, setTranslating] = useState<Record<string, boolean>>({})

  // Design
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor)
  const [fontFamily, setFontFamily] = useState(initialFontFamily)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [heroImages, setHeroImages] = useState<string[]>(initialHeroImages)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)

  const logoRef = useRef<HTMLInputElement>(null)
  const heroRef = useRef<HTMLInputElement>(null)

  const handleTranslate = async (text: string, key: string, setter: (v: string) => void) => {
    if (!text.trim()) return
    setTranslating(p => ({ ...p, [key]: true }))
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|en`
      )
      const data = await res.json()
      if (data.responseStatus === 200 || data.responseStatus === '200') {
        setter(data.responseData.translatedText)
        toast({ title: 'Traduction effectuée ✓' })
      } else {
        throw new Error(data.responseDetails || 'Erreur inconnue')
      }
    } catch {
      toast({ variant: 'destructive', title: 'Traduction échouée', description: 'Vérifiez votre connexion internet.' })
    } finally {
      setTranslating(p => ({ ...p, [key]: false }))
    }
  }

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Upload échoué')
    const { url } = await res.json()
    return url
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      setLogoUrl(await uploadFile(file))
      toast({ title: 'Logo uploadé' })
    } catch {
      toast({ variant: 'destructive', title: 'Upload du logo échoué.' })
    } finally { setUploadingLogo(false) }
  }

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploadingHero(true)
    try {
      const urls = await Promise.all(files.map(uploadFile))
      setHeroImages(prev => [...prev, ...urls])
      toast({ title: `${urls.length} image(s) ajoutée(s)` })
    } catch {
      toast({ variant: 'destructive', title: 'Upload échoué.' })
    } finally {
      setUploadingHero(false)
      if (heroRef.current) heroRef.current.value = ''
    }
  }

  const removeHeroImage = (i: number) => setHeroImages(h => h.filter((_, idx) => idx !== i))

  const moveHeroImage = (from: number, to: number) => {
    if (to < 0 || to >= heroImages.length) return
    const arr = [...heroImages]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    setHeroImages(arr)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName, storeTagline, aboutContent, storeNameEN, storeTaglineEN, aboutContentEN, primaryColor, fontFamily, logoUrl, heroImages }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const detail = errData?.error?.fieldErrors
          ? Object.entries(errData.error.fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' | ')
          : errData?.error?.formErrors?.join(', ') ?? JSON.stringify(errData?.error ?? errData)
        throw new Error(detail)
      }
      toast({ title: 'Sauvegardé ✓', description: 'Design et paramètres mis à jour.' })
      router.refresh() // Invalide le Router Cache Next.js pour afficher les données fraîches
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Impossible de sauvegarder.'
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde', description: msg })
    } finally { setSaving(false) }
  }

  const TranslateBtn = ({ fieldKey, src, setter }: { fieldKey: string; src: string; setter: (v: string) => void }) => (
    <button type="button" onClick={() => handleTranslate(src, fieldKey, setter)} disabled={translating[fieldKey] || !src.trim()}
      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      {translating[fieldKey]
        ? <><Loader2 className="w-3 h-3 animate-spin" />Traduction...</>
        : <><Globe className="w-3 h-3" />Traduire en anglais</>}
    </button>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-5xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Design &amp; Contenu</h1>
            <p className="text-gray-500 mt-1">Personnalisez l&apos;apparence et le contenu de votre boutique.</p>
          </div>

          {/* ── Store Info ── */}
          <Card>
            <CardHeader>
              <CardTitle>Informations de la boutique</CardTitle>
              <CardDescription>
                Contenu affiché sur la page d&apos;accueil et &quot;Qui sommes-nous&quot;.
                Cliquez &quot;Traduire en anglais&quot; pour chaque champ, puis éditez si nécessaire.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Store name */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5 mb-1"><span>🇫🇷</span> Nom de la boutique</Label>
                  <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Ma Boutique" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="flex items-center gap-1.5"><span>🇬🇧</span> Store name</Label>
                    <TranslateBtn fieldKey="storeName" src={storeName} setter={setStoreNameEN} />
                  </div>
                  <Input value={storeNameEN} onChange={e => setStoreNameEN(e.target.value)} placeholder="My Store" className={storeNameEN ? '' : 'border-dashed text-gray-400'} />
                </div>
              </div>

              {/* Tagline */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5 mb-1"><span>🇫🇷</span> Accroche (tagline)</Label>
                  <Input value={storeTagline} onChange={e => setStoreTagline(e.target.value)} placeholder="Des produits qui font la différence" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="flex items-center gap-1.5"><span>🇬🇧</span> Tagline</Label>
                    <TranslateBtn fieldKey="storeTagline" src={storeTagline} setter={setStoreTaglineEN} />
                  </div>
                  <Input value={storeTaglineEN} onChange={e => setStoreTaglineEN(e.target.value)} placeholder="Products that make a difference" className={storeTaglineEN ? '' : 'border-dashed text-gray-400'} />
                </div>
              </div>

              {/* About */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5 mb-1"><span>🇫🇷</span> À propos (page Qui sommes-nous)</Label>
                  <Textarea value={aboutContent} onChange={e => setAboutContent(e.target.value)} rows={6} placeholder="Décrivez votre boutique..." />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="flex items-center gap-1.5"><span>🇬🇧</span> About us</Label>
                    <TranslateBtn fieldKey="aboutContent" src={aboutContent} setter={setAboutContentEN} />
                  </div>
                  <Textarea value={aboutContentEN} onChange={e => setAboutContentEN(e.target.value)} rows={6} placeholder="Describe your store..." className={aboutContentEN ? '' : 'border-dashed text-gray-400'} />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* ── Logo ── */}
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Format PNG ou SVG recommandé. Taille max : 10 Mo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logoUrl && (
                <div className="flex items-center gap-4">
                  <div className="w-32 h-16 bg-gray-100 rounded-lg overflow-hidden border flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setLogoUrl('')} className="gap-2 text-red-500 hover:text-red-700 border-red-200">
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </Button>
                </div>
              )}
              <div>
                <Label>URL du logo</Label>
                <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="mt-1" placeholder="https://... ou /uploads/logo.png" />
              </div>
              <div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={uploadingLogo} className="gap-2">
                  <Upload className="w-4 h-4" /> {uploadingLogo ? 'Upload...' : 'Uploader un logo'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Appearance ── */}
          <Card>
            <CardHeader><CardTitle>Apparence</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Couleur principale</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white" />
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-32 font-mono text-sm" placeholder="#4f46e5" />
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['#4f46e5', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#1f2937'].map(c => (
                    <button key={c} type="button" onClick={() => setPrimaryColor(c)}
                      className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: primaryColor === c ? '2px solid #1f2937' : '2px solid transparent',
                        outlineOffset: '2px',
                      }} />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Appliqué aux boutons et éléments d&apos;accent de la boutique.</p>
              </div>
              <div>
                <Label>Police de caractères</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {FONT_OPTIONS.map(f => (
                    <button key={f} type="button" onClick={() => setFontFamily(f)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${fontFamily === f ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                      style={{ fontFamily: f }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Hero Gallery ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="w-5 h-5 text-indigo-500" /> Galerie Hero
              </CardTitle>
              <CardDescription>Images affichées dans le carrousel de la page d&apos;accueil. Réorganisez-les avec ↑↓.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {heroImages.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <ImagePlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune image. Uploadez des images pour le héros.</p>
                </div>
              )}
              <div className="space-y-2">
                {heroImages.map((url, i) => (
                  <div key={url + i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2 border border-gray-100">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <div className="w-20 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Hero ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-gray-500 truncate flex-1">{url}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => moveHeroImage(i, i - 1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveHeroImage(i, i + 1)} disabled={i === heroImages.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => removeHeroImage(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input id="heroUrlInput" placeholder="https://... URL d'une image" className="flex-1"
                  onKeyDown={e => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value.trim(); if (v) { setHeroImages(h => [...h, v]); (e.target as HTMLInputElement).value = '' } } }} />
                <Button variant="outline" size="sm" onClick={() => {
                  const inp = document.getElementById('heroUrlInput') as HTMLInputElement
                  const v = inp?.value.trim()
                  if (v) { setHeroImages(h => [...h, v]); inp.value = '' }
                }}>Ajouter URL</Button>
              </div>
              <div>
                <input ref={heroRef} type="file" accept="image/*" multiple className="hidden" onChange={handleHeroUpload} />
                <Button variant="outline" size="sm" onClick={() => heroRef.current?.click()} disabled={uploadingHero} className="gap-2">
                  <Upload className="w-4 h-4" /> {uploadingHero ? 'Upload...' : 'Uploader des images'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pb-8">
            <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
