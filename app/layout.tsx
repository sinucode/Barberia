import type { Metadata } from 'next'
import { Sora, Michroma } from 'next/font/google'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})

const michroma = Michroma({
  subsets: ['latin'],
  weight: ['400'], // Michroma solo tiene peso 400
  variable: '--font-michroma',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Xinuco — Tecnología · Inteligencia · Impacto',
  description: 'Software de gestión inteligente para negocios LATAM. Barberías, lavanderías y más.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${sora.variable} ${michroma.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
