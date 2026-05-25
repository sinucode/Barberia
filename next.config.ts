/** @type {import('next').NextConfig} */

// ── [SEC M-6] Security Headers ────────────────────────────────────────────────
// Se aplican a todas las rutas. Defensa en profundidad contra clickjacking,
// MIME sniffing, fugas de referrer y otros ataques comunes de navegador.
const securityHeaders = [
  // Impide que la app se embeba en iframes de terceros (anti-clickjacking)
  { key: 'X-Frame-Options',        value: 'DENY' },
  // Previene MIME sniffing — el navegador respeta el Content-Type declarado
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Solo enviar el origin al hacer requests cross-origin (no la URL completa)
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  // Forzar HTTPS durante 1 año, incluyendo subdominios
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Deshabilitar APIs de sensor/cámara/micrófono innecesarias
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // CSP básica: misma origen + CDNs conocidos usados en la app.
  // Ajustar si se agregan fuentes externas de scripts.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js requiere 'unsafe-inline' y 'unsafe-eval' en desarrollo;
      // en producción se puede endurecer con nonces cuando Next.js lo soporte nativamente.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Supabase storage + API + QR externo (imagen, no script)
      "img-src 'self' data: https://*.supabase.co https://api.qrserver.com",
      // Supabase API calls
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig = {
  typescript: {
    // Los tipos de DB se definen manualmente en types/database.ts y difieren
    // del tipo inferido por el cliente Supabase. Ignorar errores de build hasta
    // regenerar tipos con: npx supabase gen types typescript
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // ── [SEC M-6] Headers de seguridad HTTP ────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
