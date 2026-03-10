// cron.js — Abandoned cart email automation
// Runs inside Docker, calls the internal API endpoint every hour

const APP_URL = process.env.APP_URL || 'http://app:3000'
const CRON_SECRET = process.env.CRON_SECRET || ''
const INTERVAL_MS = 60 * 60 * 1000 // 1 hour

async function runAbandonedCarts() {
  const now = new Date().toISOString()
  console.log(`[${now}] Running abandoned cart check...`)

  try {
    const res = await fetch(`${APP_URL}/api/cron/abandoned-carts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[${now}] Error ${res.status}: ${text}`)
      return
    }

    const data = await res.json()
    console.log(`[${now}] Done:`, data)
  } catch (err) {
    console.error(`[${now}] Fetch error:`, err.message)
  }
}

// Run immediately on start, then every hour
runAbandonedCarts()
setInterval(runAbandonedCarts, INTERVAL_MS)

console.log('Cron service started — checking abandoned carts every hour')
