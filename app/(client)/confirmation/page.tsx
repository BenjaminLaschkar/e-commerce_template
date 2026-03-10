/**
 * Server wrapper — loads the confirmation client with SSR disabled.
 * The confirmation page shares a bundle chunk with @stripe/stripe-js which
 * accesses window.location at module evaluation time, crashing during SSR.
 */
import dynamic from 'next/dynamic'

const ConfirmationPage = dynamic(() => import('./_page'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  ),
})

export default ConfirmationPage
