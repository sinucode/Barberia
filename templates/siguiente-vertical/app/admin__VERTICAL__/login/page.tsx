'use client'

import { useState, useTransition } from 'react'
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react'
// TODO: importar loginWithPassword desde '@/actions/auth'

/**
 * Admin__VERTICAL_TITULO__LoginPage — Login del Super Admin para la vertical __VERTICAL_TITULO__.
 *
 * Ruta: /admin__VERTICAL__/login
 * Instanciar: reemplazar __VERTICAL__ y __VERTICAL_TITULO__ con el nombre real.
 */
export default function Admin__VERTICAL_TITULO__LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      // TODO: const result = await loginWithPassword(formData)
      // if (result?.error) setError(result.error)
      alert('TODO: implementar loginWithPassword para __VERTICAL_TITULO__')
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#080808]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #C5A059, #A88642)' }}
          >
            <Shield size={28} color="#080808" strokeWidth={2} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#F4F4F4]">
              Admin __VERTICAL_TITULO__
            </h1>
            <p className="text-sm text-[#6B6B6B] mt-1">Acceso exclusivo — Gerencia Xinuco</p>
          </div>
        </div>

        <div className="rounded-xl p-6 border" style={{ backgroundColor: '#0D0D0D', borderColor: '#1A1A1A' }}>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="slug" value="admin__VERTICAL__" />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">Correo</label>
              <input id="email" name="email" type="email" required placeholder="admin@xinuco.com"
                className="w-full px-4 py-3 rounded-lg text-sm text-[#F4F4F4] placeholder-[#444] outline-none"
                style={{ backgroundColor: '#141414', border: '1px solid #222' }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} required placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-lg text-sm text-[#F4F4F4] placeholder-[#444] outline-none"
                  style={{ backgroundColor: '#141414', border: '1px solid #222' }} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p role="alert" className="text-xs text-red-400 text-center">{error}</p>}

            <button type="submit" disabled={isPending}
              className="w-full mt-2 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: '#C5A059', color: '#080808' }}>
              {isPending ? <><Loader2 size={16} className="animate-spin" />Verificando…</> : 'Acceder'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
