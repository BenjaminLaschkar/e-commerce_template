import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripeInstance(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined')
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
      typescript: true,
    })
  }
  return _stripe
}

// Proxy pour compatibilité avec le code existant (`stripe.xxx`)
export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    return (getStripeInstance() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100)
}

export const formatAmountFromStripe = (amount: number): number => {
  return amount / 100
}
