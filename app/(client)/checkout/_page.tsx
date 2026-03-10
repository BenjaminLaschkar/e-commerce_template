'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Lock, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/components/client/CartProvider'
import { useSettings } from '@/components/client/SettingsProvider'
import { useLang } from '@/components/client/LangProvider'
import { formatPrice } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import SiteHeader from '@/components/client/SiteHeader'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ShippingForm {
  firstName: string
  lastName: string
  email: string
  address: string
  city: string
  zipCode: string
  country: string
}

// ── Inner payment form (needs Elements context) ────────────────────────────────

function PaymentForm({
  form,
  totalPrice,
  orderNumber,
}: {
  form: ShippingForm
  totalPrice: number
  orderNumber: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()
  const { t } = useLang()
  const [paying, setPaying] = useState(false)

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/confirmation?order=${orderNumber}`,
          payment_method_data: {
            billing_details: {
              name: `${form.firstName} ${form.lastName}`,
              email: form.email,
              address: {
                line1: form.address,
                city: form.city,
                postal_code: form.zipCode,
                country: form.country,
              },
            },
          },
        },
      })
      if (error) throw new Error(error.message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.checkout_processing
      toast({ variant: 'destructive', title: 'Erreur de paiement', description: msg })
    } finally {
      setPaying(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-500" />
            {t.checkout_payment_title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement options={{ layout: 'tabs' }} />
        </CardContent>
      </Card>
      <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={paying || !stripe}>
        {paying ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            {t.checkout_processing}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {t.checkout_pay} {formatPrice(totalPrice)}
            <ArrowRight className="w-4 h-4" />
          </span>
        )}
      </Button>
    </form>
  )
}

export default function CheckoutPage() {
  const { items: cart, totalPrice } = useCart()
  const { storeName, logoUrl, checkoutDistractionFree } = useSettings()
  const { t } = useLang()
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState<'shipping' | 'payment'>('shipping')
  const [isLoading, setIsLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [orderNumber, setOrderNumber] = useState<string>('')

  const [form, setForm] = useState<ShippingForm>({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    country: 'FR',
  })

  const [errors, setErrors] = useState<Partial<ShippingForm>>({})

  const validate = (): boolean => {
    const e: Partial<ShippingForm> = {}
    if (!form.firstName.trim()) e.firstName = t.err_firstname
    if (!form.lastName.trim()) e.lastName = t.err_lastname
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = t.err_email
    if (!form.address.trim()) e.address = t.err_address
    if (!form.city.trim()) e.city = t.err_city
    if (!form.zipCode.trim()) e.zipCode = t.err_zip
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (cart.length === 0) { router.push('/'); return }

    setIsLoading(true)
    try {
      const sessionId = localStorage.getItem('session_id') || ''
      const res = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, customer: form, sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      setStripePromise(loadStripe(data.publishableKey))
      setClientSecret(data.clientSecret)
      setOrderNumber(data.orderNumber)
      setStep('payment')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast({ variant: 'destructive', title: 'Erreur', description: msg })
    } finally {
      setIsLoading(false)
    }
  }

  if (cart.length === 0) {
    router.push('/cart')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Distraction-free mode: hide header during payment step */}
      {!(checkoutDistractionFree && step === 'payment') && (
        <SiteHeader storeName={storeName} logoUrl={logoUrl} />
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 sm:py-10">
        {/* Steps breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link href="/cart" className="text-gray-400 hover:text-gray-600">{t.bc_cart}</Link>
          <span className="text-gray-300">›</span>
          <span className={step === 'shipping' ? 'font-semibold text-gray-900' : 'text-gray-400'}>{t.bc_shipping}</span>
          <span className="text-gray-300">›</span>
          <span className={step === 'payment' ? 'font-semibold text-gray-900' : 'text-gray-400'}>{t.bc_payment}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* ── LEFT: Shipping or Payment ── */}
          <div className="lg:col-span-2 space-y-5">
            {step === 'shipping' ? (
              <form onSubmit={handleContinueToPayment} className="space-y-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t.checkout_shipping_title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">{t.checkout_firstname} *</Label>
                        <Input id="firstName" value={form.firstName}
                          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                          placeholder="Jean" className={errors.firstName ? 'border-red-500' : ''} />
                        {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                      </div>
                      <div>
                        <Label htmlFor="lastName">{t.checkout_lastname} *</Label>
                        <Input id="lastName" value={form.lastName}
                          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                          placeholder="Dupont" className={errors.lastName ? 'border-red-500' : ''} />
                        {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">{t.checkout_email} *</Label>
                      <Input id="email" type="email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="jean.dupont@email.com" className={errors.email ? 'border-red-500' : ''} />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="address">{t.checkout_address} *</Label>
                      <Input id="address" value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        placeholder="123 rue de la Paix" className={errors.address ? 'border-red-500' : ''} />
                      {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">{t.checkout_city} *</Label>
                        <Input id="city" value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          placeholder="Paris" className={errors.city ? 'border-red-500' : ''} />
                        {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <Label htmlFor="zipCode">{t.checkout_zip} *</Label>
                        <Input id="zipCode" value={form.zipCode}
                          onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                          placeholder="75001" className={errors.zipCode ? 'border-red-500' : ''} />
                        {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="country">{t.checkout_country}</Label>
                      <select id="country" value={form.country}
                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                        className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="FR">France</option>
                        <option value="BE">Belgique</option>
                        <option value="CH">Suisse</option>
                        <option value="LU">Luxembourg</option>
                        <option value="CA">Canada</option>
                        <option value="DE">Allemagne</option>
                        <option value="ES">Espagne</option>
                        <option value="IT">Italie</option>
                        <option value="GB">Royaume-Uni</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-start gap-3 text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span>{t.checkout_secured_by} <strong>Stripe</strong> — {t.checkout_ssl}.</span>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      {t.checkout_loading}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t.checkout_continue} <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
                <Link href="/cart">
                  <Button variant="ghost" className="w-full" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t.checkout_back_cart}
                  </Button>
                </Link>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Shipping recap */}
                <Card className="bg-gray-50 border-dashed">
                  <CardContent className="pt-4 pb-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{form.firstName} {form.lastName} — {form.email}</p>
                      <p className="text-gray-500">{form.address}, {form.zipCode} {form.city}, {form.country}</p>
                    </div>
                    <button onClick={() => setStep('shipping')} className="ml-auto text-indigo-600 text-xs hover:underline shrink-0">
                      {t.checkout_modify}
                    </button>
                  </CardContent>
                </Card>

                {clientSecret && stripePromise && (
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                    <PaymentForm form={form} totalPrice={totalPrice} orderNumber={orderNumber} />
                  </Elements>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Order summary ── */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">{t.checkout_your_order}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate mr-2">{item.name} × {item.quantity}</span>
                    <span className="font-medium shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{t.cart_shipping}</span>
                    <span className="text-green-600 font-medium">{t.checkout_shipping_calc}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>{t.cart_total}</span>
                    <span className="text-indigo-600">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
                  <Lock className="w-3 h-3" />
                  <span>{t.checkout_secure}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
