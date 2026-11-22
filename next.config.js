/** @type {import('next').NextConfig} */

// Fonts are self-hosted via next/font at build time, so the CSP does not need
// to allow any third-party font or script origins at runtime.
//
// 'unsafe-eval' is only added in development: Next.js's dev-mode client
// runtime (React Fast Refresh / webpack HMR) relies on eval() to wire up
// hot-reloading. Without it the browser silently blocks the entire client
// bundle from executing — React never hydrates, so the page looks frozen
// forever (e.g. "Loading catalog…") with no console-visible network error.
// Production builds never need eval, so the strict policy still applies
// there.
const isDev = process.env.NODE_ENV !== 'production';
const CSP = [
  "default-src 'self'",
  // challenges.cloudflare.com serves the Turnstile bot-check widget (script + iframe).
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ''}`,
  'frame-src https://challenges.cloudflare.com',
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  {
    // geolocation=(self) allows the "Detect my location" checkout feature;
    // everything else this storefront doesn't need stays disabled.
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // BFF routes should never be cached by intermediaries.
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

module.exports = nextConfig;
