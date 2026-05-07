import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Xinuco — Gestión Inteligente para Barberías',
  description: 'SaaS multi-tenant para barberías. Agenda, inventario y control en un solo lugar.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
