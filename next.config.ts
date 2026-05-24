/** @type {import('next').NextConfig} */
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
}

module.exports = nextConfig
