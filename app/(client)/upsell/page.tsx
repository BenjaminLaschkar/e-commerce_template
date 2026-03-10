'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Timer, CheckCircle, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

export default function UpsellPage() {
  const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 minutes
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Countdown
  useEffect(() => {
    const sessionId = localStorage.getItem('session_id') || ''
    fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'UPSELL_VIEW', sessionId }),
    }).catch(() => {})

    const interval = setInterval(() => {
      setTimeLeft((t) => (t <= 0 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const handleAccept = async () => {
    setIsLoading(true)
    const sessionId = localStorage.getItem('session_id') || ''
    try {
      await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'UPSELL_ACCEPT', sessionId }),
      })
      // Redirect to upsell checkout
      window.location.href = '/checkout?upsell=1'
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecline = async () => {
    const sessionId = localStorage.getItem('session_id') || ''
    await fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'UPSELL_DECLINE', sessionId }),
    }).catch(() => {})
    window.location.href = '/'
  }

  const benefits = [
    '3 sessions de coaching individuel (1h chacune)',
    'Accès au groupe privé Telegram',
    'Templates et ressources exclusives (valeur 197€)',
    'Audit de votre stratégie marketing',
    'Support prioritaire pendant 30 jours',
    'Garantie satisfait ou remboursé 30 jours',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-indigo-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Urgency header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-6 animate-pulse">
            <Timer className="w-4 h-4" />
            Offre expire dans {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Attendez ! 🚀<br />
            <span className="text-yellow-400">Offre spéciale client</span>
          </h1>
          <p className="text-slate-300 text-lg">
            Cette offre est <strong>uniquement disponible maintenant</strong> et ne sera plus accessible après votre départ.
          </p>
        </div>

        {/* Offer card */}
        <Card className="border-2 border-yellow-400 overflow-hidden mb-6">
          <div className="bg-yellow-400 px-6 py-3 text-center">
            <span className="font-bold text-slate-900 text-sm">
              ⚡ OFFRE EXCLUSIVE — NOUVEAUX CLIENTS UNIQUEMENT
            </span>
          </div>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Pack Coaching VIP — Accélérateur de Résultats
            </h2>

            <ul className="space-y-3 mb-6">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 line-through">Valeur réelle: 297 €</p>
                  <p className="text-3xl font-bold text-indigo-600">{formatPrice(97)}</p>
                  <p className="text-xs text-gray-500">Paiement unique, accès à vie</p>
                </div>
                <div className="bg-red-100 text-red-600 font-bold text-lg px-4 py-2 rounded-lg">
                  -67%
                </div>
              </div>
            </div>

            <Button
              className="w-full h-14 text-lg font-bold"
              onClick={handleAccept}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Oui ! Je veux le coaching à 97€
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <button
              onClick={handleDecline}
              className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
            >
              <X className="w-3 h-3 inline mr-1" />
              Non merci, je decline cette offre unique et je perds cette opportunité
            </button>
          </CardContent>
        </Card>

        {/* Trust */}
        <div className="text-center text-slate-400 text-xs">
          <p>🔒 Paiement sécurisé par Stripe · Garantie 30 jours satisfait ou remboursé</p>
        </div>
      </div>
    </div>
  )
}
