/** @type {import('next').NextConfig} */

// ─────────────────────────────────────────────────────────────────────────────
// Security headers applied to every response (Nginx adds HSTS + rate limiting)
// ─────────────────────────────────────────────────────────────────────────────
const securityHeaders = [
  // Content-Security-Policy — tighten as needed per feature
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' for style in dev; in prod use nonces/hashes
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Stripe JS SDK
      // 'unsafe-eval' is required by Next.js HMR (react-refresh) in dev only
      `script-src 'self' 'unsafe-inline' https://js.stripe.com${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}`,
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // self + Stripe API + MyMemory translation API used by DesignClient
      "connect-src 'self' https://api.stripe.com https://api.mymemory.translated.net",
      // Images: self + data URIs + configured remote patterns
      "img-src 'self' data: blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      // upgrade-insecure-requests only in production (localhost uses HTTP)
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ].join('; '),
  },
  // Prevent clickjacking (redundant with Nginx but defence-in-depth)
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Disable browser features not used by the app
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
  },
  // Remove the "X-Powered-By: Next.js" header
  // (poweredByHeader: false below handles this too)
]

const nextConfig = {
  poweredByHeader: false, // Do not reveal Next.js version
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    domains: ['localhost'],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
    instrumentationHook: true,
  },
  output: 'standalone',
}

module.exports = nextConfig
