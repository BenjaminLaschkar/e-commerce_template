/**
 * Server wrapper — loads the checkout client with SSR disabled.
 * Required because @stripe/stripe-js accesses window.location at module
 * evaluation time, which crashes during server-side rendering.
 */
import dynamic from 'next/dynamic'

const CheckoutPage = dynamic(() => import('./_page'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  ),
})

export default CheckoutPage
