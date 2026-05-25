import { redirect } from 'next/navigation'

/**
 * Ruta raíz — redirige al portal de administración.
 * Los tenants acceden por /{slug}/book o /{slug}/dashboard.
 */
export default function RootPage() {
  redirect('/adminbarberia/login')
}
