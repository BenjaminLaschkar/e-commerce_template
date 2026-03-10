'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Plus, Trash2, Eye, EyeOff, Globe, Loader2, Megaphone, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import AdminSidebar from '@/components/admin/Sidebar'

// ── ISO country data ─────────────────────────────────────────────────────────

function getFlag(code: string): string {
  return code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  )
}

const COUNTRY_LIST: { code: string; name: string }[] = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albanie' },
  { code: 'DZ', name: 'Algérie' }, { code: 'AD', name: 'Andorre' },
  { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua-et-Barbuda' },
  { code: 'AR', name: 'Argentine' }, { code: 'AM', name: 'Arménie' },
  { code: 'AU', name: 'Australie' }, { code: 'AT', name: 'Autriche' },
  { code: 'AZ', name: 'Azerbaïdjan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahreïn' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbade' }, { code: 'BY', name: 'Biélorussie' },
  { code: 'BE', name: 'Belgique' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Bénin' }, { code: 'BT', name: 'Bhoutan' },
  { code: 'BO', name: 'Bolivie' }, { code: 'BA', name: 'Bosnie-Herzégovine' },
  { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brésil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgarie' },
  { code: 'BF', name: 'Burkina Faso' }, { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cap-Vert' }, { code: 'KH', name: 'Cambodge' },
  { code: 'CM', name: 'Cameroun' }, { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'République centrafricaine' }, { code: 'TD', name: 'Tchad' },
  { code: 'CL', name: 'Chili' }, { code: 'CN', name: 'Chine' },
  { code: 'CO', name: 'Colombie' }, { code: 'KM', name: 'Comores' },
  { code: 'CG', name: 'Congo' }, { code: 'CD', name: 'Congo (RDC)' },
  { code: 'CR', name: 'Costa Rica' }, { code: 'HR', name: 'Croatie' },
  { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Chypre' },
  { code: 'CZ', name: 'République tchèque' }, { code: 'DK', name: 'Danemark' },
  { code: 'DJ', name: 'Djibouti' }, { code: 'DO', name: 'République dominicaine' },
  { code: 'EC', name: 'Équateur' }, { code: 'EG', name: 'Égypte' },
  { code: 'SV', name: 'Salvador' }, { code: 'GQ', name: 'Guinée équatoriale' },
  { code: 'ER', name: 'Érythrée' }, { code: 'EE', name: 'Estonie' },
  { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Éthiopie' },
  { code: 'FJ', name: 'Fidji' }, { code: 'FI', name: 'Finlande' },
  { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambie' }, { code: 'GE', name: 'Géorgie' },
  { code: 'DE', name: 'Allemagne' }, { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Grèce' }, { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinée' }, { code: 'GW', name: 'Guinée-Bissau' },
  { code: 'GY', name: 'Guyana' }, { code: 'HT', name: 'Haïti' },
  { code: 'HN', name: 'Honduras' }, { code: 'HU', name: 'Hongrie' },
  { code: 'IS', name: 'Islande' }, { code: 'IN', name: 'Inde' },
  { code: 'ID', name: 'Indonésie' }, { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Irak' }, { code: 'IE', name: 'Irlande' },
  { code: 'IL', name: 'Israël' }, { code: 'IT', name: 'Italie' },
  { code: 'JM', name: 'Jamaïque' }, { code: 'JP', name: 'Japon' },
  { code: 'JO', name: 'Jordanie' }, { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' }, { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'Corée du Nord' }, { code: 'KR', name: 'Corée du Sud' },
  { code: 'KW', name: 'Koweït' }, { code: 'KG', name: 'Kirghizistan' },
  { code: 'LA', name: 'Laos' }, { code: 'LV', name: 'Lettonie' },
  { code: 'LB', name: 'Liban' }, { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libye' },
  { code: 'LI', name: 'Liechtenstein' }, { code: 'LT', name: 'Lituanie' },
  { code: 'LU', name: 'Luxembourg' }, { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaisie' },
  { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malte' }, { code: 'MH', name: 'Îles Marshall' },
  { code: 'MR', name: 'Mauritanie' }, { code: 'MU', name: 'Maurice' },
  { code: 'MX', name: 'Mexique' }, { code: 'FM', name: 'Micronésie' },
  { code: 'MD', name: 'Moldavie' }, { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolie' }, { code: 'ME', name: 'Monténégro' },
  { code: 'MA', name: 'Maroc' }, { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' }, { code: 'NA', name: 'Namibie' },
  { code: 'NR', name: 'Nauru' }, { code: 'NP', name: 'Népal' },
  { code: 'NL', name: 'Pays-Bas' }, { code: 'NZ', name: 'Nouvelle-Zélande' },
  { code: 'NI', name: 'Nicaragua' }, { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' }, { code: 'MK', name: 'Macédoine du Nord' },
  { code: 'NO', name: 'Norvège' }, { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' }, { code: 'PW', name: 'Palaos' },
  { code: 'PA', name: 'Panama' }, { code: 'PG', name: 'Papouasie-Nouvelle-Guinée' },
  { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Pérou' },
  { code: 'PH', name: 'Philippines' }, { code: 'PL', name: 'Pologne' },
  { code: 'PT', name: 'Portugal' }, { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Roumanie' }, { code: 'RU', name: 'Russie' },
  { code: 'RW', name: 'Rwanda' }, { code: 'KN', name: 'Saint-Kitts-et-Nevis' },
  { code: 'LC', name: 'Sainte-Lucie' }, { code: 'VC', name: 'Saint-Vincent' },
  { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'Saint-Marin' },
  { code: 'ST', name: 'Sao Tomé-et-Principe' }, { code: 'SA', name: 'Arabie saoudite' },
  { code: 'SN', name: 'Sénégal' }, { code: 'RS', name: 'Serbie' },
  { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapour' }, { code: 'SK', name: 'Slovaquie' },
  { code: 'SI', name: 'Slovénie' }, { code: 'SB', name: 'Îles Salomon' },
  { code: 'SO', name: 'Somalie' }, { code: 'ZA', name: 'Afrique du Sud' },
  { code: 'SS', name: 'Soudan du Sud' }, { code: 'ES', name: 'Espagne' },
  { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Soudan' },
  { code: 'SR', name: 'Suriname' }, { code: 'SE', name: 'Suède' },
  { code: 'CH', name: 'Suisse' }, { code: 'SY', name: 'Syrie' },
  { code: 'TW', name: 'Taïwan' }, { code: 'TJ', name: 'Tadjikistan' },
  { code: 'TZ', name: 'Tanzanie' }, { code: 'TH', name: 'Thaïlande' },
  { code: 'TL', name: 'Timor oriental' }, { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinité-et-Tobago' },
  { code: 'TN', name: 'Tunisie' }, { code: 'TR', name: 'Turquie' },
  { code: 'TM', name: 'Turkménistan' }, { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Ouganda' }, { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'Émirats arabes unis' }, { code: 'GB', name: 'Royaume-Uni' },
  { code: 'US', name: 'États-Unis' }, { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Ouzbékistan' }, { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Viêt Nam' },
  { code: 'YE', name: 'Yémen' }, { code: 'ZM', name: 'Zambie' },
  { code: 'ZW', name: 'Zimbabwe' },
]

// ── Country picker component ──────────────────────────────────────────────────

function CountryPicker({ onAdd, blocked }: { onAdd: (code: string) => void; blocked: string[] }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = COUNTRY_LIST.filter(c =>
    !blocked.includes(c.code) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 12)

  return (
    <div className="relative w-72">
      <Input
        ref={inputRef}
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="🔍 Rechercher un pays..."
        className="w-full"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filtered.map(c => (
            <button
              key={c.code}
              type="button"
              onMouseDown={() => { onAdd(c.code); setSearch(''); setOpen(false); inputRef.current?.focus() }}
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-indigo-50 text-sm text-left"
            >
              <span className="text-xl leading-none">{getFlag(c.code)}</span>
              <span className="flex-1 text-gray-800">{c.name}</span>
              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{c.code}</span>
            </button>
          ))}
        </div>
      )}
      {open && search.length >= 1 && filtered.length === 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          Aucun pays trouvé
        </div>
      )}
    </div>
  )
}

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
  initialAnnounceBannerFr: string
  initialAnnounceBannerEn: string
  initialCheckoutDistractionFree: boolean
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
  initialAnnounceBannerFr,
  initialAnnounceBannerEn,
  initialCheckoutDistractionFree,
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

  // Announce banner
  const [announceBannerFr, setAnnounceBannerFr] = useState(initialAnnounceBannerFr)
  const [announceBannerEn, setAnnounceBannerEn] = useState(initialAnnounceBannerEn)
  const [translatingBanner, setTranslatingBanner] = useState(false)

  // Checkout options
  const [checkoutDistractionFree, setCheckoutDistractionFree] = useState(initialCheckoutDistractionFree)

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

  const handleTranslateBanner = async () => {
    if (!announceBannerFr.trim()) return
    setTranslatingBanner(true)
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(announceBannerFr)}&langpair=fr|en`
      )
      const data = await res.json()
      if (data.responseStatus === 200 || data.responseStatus === '200') {
        setAnnounceBannerEn(data.responseData.translatedText)
        toast({ title: 'Traduction du bandeau effectuée ✓' })
      } else {
        throw new Error(data.responseDetails || 'Erreur inconnue')
      }
    } catch {
      toast({ variant: 'destructive', title: 'Traduction échouée', description: 'Vérifiez votre connexion internet.' })
    } finally {
      setTranslatingBanner(false)
    }
  }

  const generateBannerFromRules = () => {
    const parts: string[] = []
    if (freeThreshold > 0) {
      parts.push(`Livraison gratuite à partir de ${freeThreshold}€`)
    }
    parts.push('Satisfait ou remboursé 30 jours')
    setAnnounceBannerFr(parts.join(' — '))
    toast({ title: 'Bandeau généré depuis les règles ✓' })
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

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        freeShippingThreshold: freeThreshold,
        shippingRules: rules,
        blockedCountries,
        cgvContent, faqContent, deliveryContent,
        cgvContentEN, faqContentEN, deliveryContentEN,
        announceBannerFr: announceBannerFr || null,
        announceBannerEn: announceBannerEn || null,
        checkoutDistractionFree,
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
      router.refresh()
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

          {/* ── Announce Banner ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-500" /> Bandeau d&apos;annonce
              </CardTitle>
              <CardDescription>
                Affiché en haut des pages produit. Laissez vide pour masquer le bandeau.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" size="sm" onClick={generateBannerFromRules} className="gap-2 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Auto-générer depuis les règles de livraison
              </Button>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5 mb-1"><span>🇫🇷</span> Bandeau FR</Label>
                  <Input
                    value={announceBannerFr}
                    onChange={e => setAnnounceBannerFr(e.target.value)}
                    placeholder="Livraison gratuite dès 50€ — Satisfait ou remboursé 30 jours"
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Affiché aux visiteurs francophones</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="flex items-center gap-1.5"><span>🇬🇧</span> Bandeau EN</Label>
                    <button
                      type="button"
                      onClick={handleTranslateBanner}
                      disabled={translatingBanner || !announceBannerFr.trim()}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {translatingBanner
                        ? <><Loader2 className="w-3 h-3 animate-spin" />Traduction...</>
                        : <><Globe className="w-3 h-3" />Traduire en anglais</>}
                    </button>
                  </div>
                  <Input
                    value={announceBannerEn}
                    onChange={e => setAnnounceBannerEn(e.target.value)}
                    placeholder="Free shipping from €50 — 30-day money-back guarantee"
                    className={`text-sm ${announceBannerEn ? '' : 'border-dashed'}`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Affiché aux visiteurs anglophones</p>
                </div>
              </div>
              {announceBannerFr && (
                <div className="bg-indigo-600 text-white text-center py-2 text-sm font-medium rounded-lg mt-2">
                  🚚 {announceBannerFr}
                </div>
              )}
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
                {blockedCountries.map(c => {
                  const country = COUNTRY_LIST.find(x => x.code === c)
                  return (
                    <span key={c} className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-2.5 py-1 rounded-full">
                      <span className="text-base leading-none">{getFlag(c)}</span>
                      <span>{country?.name ?? c}</span>
                      <span className="font-mono text-red-400">({c})</span>
                      <button type="button" onClick={() => setBlockedCountries(prev => prev.filter(x => x !== c))} className="hover:text-red-900 ml-0.5">×</button>
                    </span>
                  )
                })}
                {blockedCountries.length === 0 && <p className="text-sm text-gray-400">Aucun pays bloqué</p>}
              </div>
              <CountryPicker
                onAdd={code => {
                  if (!blockedCountries.includes(code)) {
                    setBlockedCountries(prev => [...prev, code])
                  }
                }}
                blocked={blockedCountries}
              />
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

          {/* ── Checkout Options ── */}
          <Card>
            <CardHeader>
              <CardTitle>Options de paiement</CardTitle>
              <CardDescription>Comportement du tunnel de commande.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checkoutDistractionFree}
                  onChange={e => setCheckoutDistractionFree(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">
                    Mode Distraction-Free
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Masque la navigation (header) à l&apos;étape paiement pour réduire les abandons de panier.
                  </p>
                </div>
              </label>
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
