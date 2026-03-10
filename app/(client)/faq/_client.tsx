'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useLang } from '@/components/client/LangProvider'
import SiteHeader from '@/components/client/SiteHeader'
import SiteFooter from '@/components/client/SiteFooter'

const DEFAULT_FAQS_FR = [
  {
    q: 'Comment passer une commande ?',
    a: "Ajoutez les produits souhaités à votre panier, puis cliquez sur « Procéder au paiement ». Remplissez vos informations de livraison et payez en toute sécurité via Stripe.",
  },
  {
    q: 'Quels modes de paiement acceptez-vous ?',
    a: "Nous acceptons les cartes bancaires (Visa, Mastercard, American Express) via Stripe. Tous les paiements sont sécurisés et chiffrés.",
  },
  {
    q: 'Quels sont les délais de livraison ?',
    a: "Les délais varient selon votre pays. Consultez notre page « Délais de livraison » pour les informations détaillées.",
  },
  {
    q: 'Puis-je retourner un produit ?',
    a: "Oui, vous disposez de 14 jours pour exercer votre droit de rétractation. Contactez-nous par email pour initier le retour.",
  },
  {
    q: 'Comment suivre ma commande ?',
    a: "Vous recevrez un email de confirmation avec les informations de suivi dès l'expédition de votre commande.",
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: "Absolument. Nous ne stockons aucune donnée bancaire. Vos paiements sont traités directement par Stripe, certifié PCI DSS.",
  },
]

const DEFAULT_FAQS_EN = [
  {
    q: 'How do I place an order?',
    a: 'Add the desired products to your cart, then click "Proceed to checkout". Fill in your shipping information and pay securely via Stripe.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept credit cards (Visa, Mastercard, American Express) via Stripe. All payments are secured and encrypted.',
  },
  {
    q: 'What are the delivery times?',
    a: 'Delivery times vary by country. Please check our "Delivery times" page for detailed information.',
  },
  {
    q: 'Can I return a product?',
    a: 'Yes, you have 14 days to exercise your right of withdrawal. Contact us by email to initiate the return.',
  },
  {
    q: 'How do I track my order?',
    a: 'You will receive a confirmation email with tracking information as soon as your order is shipped.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We do not store any banking data. Your payments are processed directly by Stripe, which is PCI DSS certified.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full text-left flex items-center justify-between py-4 gap-4 hover:text-indigo-600 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-gray-900">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 shrink-0 text-indigo-500" />
          : <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />}
      </button>
      {open && <div className="pb-4 text-gray-600 text-sm leading-relaxed">{a}</div>}
    </div>
  )
}

interface Props {
  storeName: string
  logoUrl?: string | null
  faqContentFr: string
  faqContentEn?: string | null
}

export default function FaqClient({ storeName, logoUrl, faqContentFr, faqContentEn }: Props) {
  const { lang, t } = useLang()
  const content = lang === 'en' && faqContentEn?.trim() ? faqContentEn : faqContentFr
  const defaultFaqs = lang === 'en' ? DEFAULT_FAQS_EN : DEFAULT_FAQS_FR

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader storeName={storeName} logoUrl={logoUrl} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">{t.faq_title}</h1>
        <p className="text-gray-500 mb-8">{t.faq_subtitle}</p>

        {content.trim() ? (
          /* Admin has set custom FAQ content → show as prose */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
              {content}
            </div>
          </div>
        ) : (
          /* No custom content → show default accordion in current language */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6">
            {defaultFaqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter storeName={storeName} />
    </div>
  )
}
