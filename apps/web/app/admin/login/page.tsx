'use client'

import { useState, useRef, useTransition } from 'react'
import { Globe, Eye, EyeOff, Loader2 } from 'lucide-react'
import { loginWithPassword } from '@/actions/auth'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ''

/**
 * AdminLoginPage — Login del Super Admin para el panel GLOBAL Xinuco.
 *
 * Ruta: /admin/login  (servida por apps/web)
 * El mismo super_admin puede navegar a /adminbarberia desde aquí
 * gracias al SSO por cookies del mismo dominio.
 */
export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await loginWithPassword(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#080808]">
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(197, 160, 89, 0.10), transparent)',
        }}
      />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #C5A059, #A88642)' }}
          >
            <Globe size={28} color="#080808" strokeWidth={2} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#F4F4F4]">
              Admin Global
            </h1>
            <p className="text-sm text-[#6B6B6B] mt-1">
              Xinuco — Todas las verticales
            </p>
          </div>
        </div>

        <div
          className="rounded-xl p-6 border"
          style={{ backgroundColor: '#0D0D0D', borderColor: '#1A1A1A' }}
        >
          <form action={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="slug" value="admin" />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-email" className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
                Correo electrónico
              </label>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@xinuco.com"
                className="w-full px-4 py-3 rounded-lg text-sm text-[#F4F4F4] placeholder-[#444] outline-none transition-all focus:ring-2 focus:ring-[#C5A059]/40"
                style={{ backgroundColor: '#141414', border: '1px solid #222' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-password" className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-lg text-sm text-[#F4F4F4] placeholder-[#444] outline-none transition-all focus:ring-2 focus:ring-[#C5A059]/40"
                  style={{ backgroundColor: '#141414', border: '1px solid #222' }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#C5A059] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-400 text-center px-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              id="btn-admin-login"
              className="w-full mt-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: '#C5A059', color: '#080808' }}
            >
              {isPending ? (
                <><Loader2 size={16} className="animate-spin" />Verificando…</>
              ) : (
                'Acceder al Admin Global'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#444] mt-6">
          Powered by <span className="font-semibold text-[#C5A059]">Xinuco</span>
        </p>
      </div>
    </main>
  )
}
