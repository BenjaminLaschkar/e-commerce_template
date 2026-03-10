'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Plus, Trash2, Eye, EyeOff, Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import AdminSidebar from '@/components/admin/Sidebar'

interface ShippingRule {
  country: string
  price: number
  freeThreshold: number | null
  estimatedDays: string
}

interface Props {
  initialStripePublicKey: string
  initialStripeSecretKey: string
  initialStripeWebhookSecret: string
  initialFreeShippingThreshold: number
  initialShippingRules: ShippingRule[]
  initialBlockedCountries: string[]
  initialCgvContent: string
  initialFaqContent: string
  initialDeliveryContent: string
  initialCgvContentEN: string
  initialFaqContentEN: string
  initialDeliveryContentEN: string
}

export default function PaymentClient({
  initialStripePublicKey,
  initialStripeSecretKey,
  initialStripeWebhookSecret,
  initialFreeShippingThreshold,
  initialShippingRules,
  initialBlockedCountries,
  initialCgvContent,
  initialFaqContent,
  initialDeliveryContent,
  initialCgvContentEN,
  initialFaqContentEN,
  initialDeliveryContentEN,
}: Props) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Stripe
  const [pubKey, setPubKey] = useState(initialStripePublicKey)
  const [secKey, setSecKey] = useState(initialStripeSecretKey)
  const [webhookKey, setWebhookKey] = useState(initialStripeWebhookSecret)
  const [showSecKey, setShowSecKey] = useState(false)
  const [showWebhookKey, setShowWebhookKey] = useState(false)

  // Shipping
  const [freeThreshold, setFreeThreshold] = useState(initialFreeShippingThreshold)
  const [rules, setRules] = useState<ShippingRule[]>(
    initialShippingRules.length > 0
      ? initialShippingRules
      : [{ country: 'FR', price: 0, freeThreshold: 50, estimatedDays: '3-5 jours' }]
  )
  const [blockedCountries, setBlockedCountries] = useState<string[]>(initialBlockedCountries)
  const [newBlockedCountry, setNewBlockedCountry] = useState('')

  // Legal — FR
  const [cgvContent, setCgvContent] = useState(initialCgvContent)
  const [faqContent, setFaqContent] = useState(initialFaqContent)
  const [deliveryContent, setDeliveryContent] = useState(initialDeliveryContent)

  // Legal — EN
  const [cgvContentEN, setCgvContentEN] = useState(initialCgvContentEN)
  const [faqContentEN, setFaqContentEN] = useState(initialFaqContentEN)
  const [deliveryContentEN, setDeliveryContentEN] = useState(initialDeliveryContentEN)
  const [translating, setTranslating] = useState<Record<string, boolean>>({})

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

  const TranslateBtn = ({ fieldKey, src, setter }: { fieldKey: string; src: string; setter: (v: string) => void }) => (
    <button type="button" onClick={() => handleTranslate(src, fieldKey, setter)} disabled={translating[fieldKey] || !src.trim()}
      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      {translating[fieldKey]
        ? <><Loader2 className="w-3 h-3 animate-spin" />Traduction...</>
        : <><Globe className="w-3 h-3" />Traduire en anglais</>}
    </button>
  )

  const addRule = () => setRules(r => [...r, { country: '', price: 0, freeThreshold: null, estimatedDays: '' }])
  const removeRule = (i: number) => setRules(r => r.filter((_, idx) => idx !== i))
  const updateRule = (i: number, field: keyof ShippingRule, value: unknown) =>
    setRules(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row))

  const addBlockedCountry = () => {
    const code = newBlockedCountry.trim().toUpperCase()
    if (code && !blockedCountries.includes(code)) {
      setBlockedCountries(prev => [...prev, code])
      setNewBlockedCountry('')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        freeShippingThreshold: freeThreshold,
        shippingRules: rules,
        blockedCountries,
        cgvContent, faqContent, deliveryContent,
        cgvContentEN, faqContentEN, deliveryContentEN,
      }
      if (pubKey && !pubKey.includes('•')) body.stripePublicKey = pubKey
      if (secKey && !secKey.includes('•')) body.stripeSecretKey = secKey
      if (webhookKey && !webhookKey.includes('•')) body.stripeWebhookSecret = webhookKey

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const detail = errData?.error?.fieldErrors
          ? Object.entries(errData.error.fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' | ')
          : errData?.error?.formErrors?.join(', ') ?? JSON.stringify(errData?.error ?? errData)
        throw new Error(detail)
      }
      toast({ title: 'Sauvegardé ✓', description: 'Paramètres de paiement mis à jour.' })
      router.refresh() // Invalide le Router Cache Next.js pour afficher les données fraîches
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Impossible de sauvegarder.'
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde', description: msg })
    } finally { setSaving(false) }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-5xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paiement &amp; Livraison</h1>
            <p className="text-gray-500 mt-1">Configurez vos clés Stripe, règles de livraison et contenus légaux.</p>
          </div>

          {/* ── Stripe Keys ── */}
          <Card>
            <CardHeader>
              <CardTitle>Clés API Stripe</CardTitle>
              <CardDescription>
                Retrouvez vos clés sur{' '}
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  dashboard.stripe.com
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Clé publique (pk_...)</Label>
                <Input value={pubKey} onChange={e => setPubKey(e.target.value)} placeholder="pk_live_..." className="mt-1 font-mono text-sm" />
              </div>
              <div>
                <Label>Clé secrète (sk_...)</Label>
                <div className="relative mt-1">
                  <Input type={showSecKey ? 'text' : 'password'} value={secKey} onChange={e => setSecKey(e.target.value)} placeholder="sk_live_..." className="font-mono text-sm pr-10" />
                  <button type="button" onClick={() => setShowSecKey(!showSecKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSecKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Webhook secret (whsec_...)</Label>
                <div className="relative mt-1">
                  <Input type={showWebhookKey ? 'text' : 'password'} value={webhookKey} onChange={e => setWebhookKey(e.target.value)} placeholder="whsec_..." className="font-mono text-sm pr-10" />
                  <button type="button" onClick={() => setShowWebhookKey(!showWebhookKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showWebhookKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Shipping Rules ── */}
          <Card>
            <CardHeader>
              <CardTitle>Règles de livraison</CardTitle>
              <CardDescription>Définissez les tarifs d&apos;expédition par pays.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap">Livraison gratuite dès (global) :</Label>
                <Input type="number" value={freeThreshold} onChange={e => setFreeThreshold(Number(e.target.value))} className="w-28" min={0} />
                <span className="text-gray-500 text-sm">€</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Pays (code ISO)</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Prix (€)</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Gratuit dès (€)</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Délai estimé</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rules.map((rule, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2"><Input value={rule.country} onChange={e => updateRule(i, 'country', e.target.value.toUpperCase())} placeholder="FR" className="w-20 uppercase" maxLength={2} /></td>
                        <td className="px-3 py-2"><Input type="number" value={rule.price} onChange={e => updateRule(i, 'price', Number(e.target.value))} className="w-20" min={0} /></td>
                        <td className="px-3 py-2"><Input type="number" value={rule.freeThreshold ?? ''} onChange={e => updateRule(i, 'freeThreshold', e.target.value ? Number(e.target.value) : null)} className="w-24" min={0} placeholder="—" /></td>
                        <td className="px-3 py-2"><Input value={rule.estimatedDays} onChange={e => updateRule(i, 'estimatedDays', e.target.value)} placeholder="3-5 jours" className="w-32" /></td>
                        <td className="px-3 py-2"><button type="button" onClick={() => removeRule(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={addRule} className="gap-2">
                <Plus className="w-4 h-4" /> Ajouter un pays
              </Button>
            </CardContent>
          </Card>

          {/* ── Blocked Countries ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-red-500" /> Pays bloqués
              </CardTitle>
              <CardDescription>Les commandes de ces pays seront refusées.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {blockedCountries.map(c => (
                  <span key={c} className="flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-2.5 py-1 rounded-full">
                    {c}
                    <button type="button" onClick={() => setBlockedCountries(prev => prev.filter(x => x !== c))} className="hover:text-red-900">×</button>
                  </span>
                ))}
                {blockedCountries.length === 0 && <p className="text-sm text-gray-400">Aucun pays bloqué</p>}
              </div>
              <div className="flex gap-2">
                <Input value={newBlockedCountry} onChange={e => setNewBlockedCountry(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && addBlockedCountry()}
                  placeholder="Ex: RU, IR, KP" className="w-36 uppercase" maxLength={2} />
                <Button variant="outline" size="sm" onClick={addBlockedCountry}>Ajouter</Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Legal Content ── */}
          <Card>
            <CardHeader>
              <CardTitle>Contenus légaux</CardTitle>
              <CardDescription>
                Textes des pages CGV, FAQ et Livraison.
                Cliquez &quot;Traduire en anglais&quot; puis éditez si besoin — la version EN s&apos;affiche automatiquement aux visiteurs anglophones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

              {/* CGV */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Conditions Générales de Vente (CGV)</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1"><span>🇫🇷</span> CGV</Label>
                    <Textarea value={cgvContent} onChange={e => setCgvContent(e.target.value)} rows={8} placeholder="Entrez vos CGV..." className="font-mono text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="flex items-center gap-1.5"><span>🇬🇧</span> Terms &amp; Conditions</Label>
                      <TranslateBtn fieldKey="cgv" src={cgvContent} setter={setCgvContentEN} />
                    </div>
                    <Textarea value={cgvContentEN} onChange={e => setCgvContentEN(e.target.value)} rows={8} placeholder="Auto-translated..." className={`font-mono text-sm ${cgvContentEN ? '' : 'border-dashed'}`} />
                  </div>
                </div>
              </div>

              {/* FAQ */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">FAQ (format JSON : [{`{"q":"...","a":"..."}`}, ...])</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1"><span>🇫🇷</span> FAQ</Label>
                    <Textarea value={faqContent} onChange={e => setFaqContent(e.target.value)} rows={8} placeholder='[{"q":"Question ?","a":"Réponse."}]' className="font-mono text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="flex items-center gap-1.5"><span>🇬🇧</span> FAQ (EN)</Label>
                      <TranslateBtn fieldKey="faq" src={faqContent} setter={setFaqContentEN} />
                    </div>
                    <Textarea value={faqContentEN} onChange={e => setFaqContentEN(e.target.value)} rows={8} placeholder='[{"q":"Question?","a":"Answer."}]' className={`font-mono text-sm ${faqContentEN ? '' : 'border-dashed'}`} />
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Délais de livraison</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1"><span>🇫🇷</span> Livraison</Label>
                    <Textarea value={deliveryContent} onChange={e => setDeliveryContent(e.target.value)} rows={6} placeholder="Informations sur les délais..." className="font-mono text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="flex items-center gap-1.5"><span>🇬🇧</span> Delivery</Label>
                      <TranslateBtn fieldKey="delivery" src={deliveryContent} setter={setDeliveryContentEN} />
                    </div>
                    <Textarea value={deliveryContentEN} onChange={e => setDeliveryContentEN(e.target.value)} rows={6} placeholder="Delivery information..." className={`font-mono text-sm ${deliveryContentEN ? '' : 'border-dashed'}`} />
                  </div>
                </div>
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
