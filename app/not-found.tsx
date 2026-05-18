import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-xinuco-bg p-4">
      <div className="card text-center max-w-sm flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-xinuco-text">Página no encontrada</h1>
        <p className="text-sm text-xinuco-muted">
          El enlace al que intentas acceder no existe, o la barbería está inactiva o en configuración.
        </p>
        <Link href="/" className="btn-primary w-full mt-2">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
