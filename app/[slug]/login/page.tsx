'use client'

import { useState, useTransition } from 'react'
import { Scissors, Eye, EyeOff, Loader2 } from 'lucide-react'
import { login } from '@/actions/auth'

interface LoginPageProps {
  params: Promise<{ slug: string }>
}

export default function LoginPage({ params }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      {/* Fondo con gradiente radial que usa el color del tenant */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, color-mix(in srgb, var(--primary-color) 18%, transparent), transparent)',
        }}
      />

      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center glow-primary"
            style={{ background: 'var(--primary-color)' }}
          >
            <Scissors size={28} color="var(--bg-color)" strokeWidth={2} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-xinuco-text">
              Bienvenido
            </h1>
            <p className="text-sm text-xinuco-muted mt-1">
              Accede a tu panel de gestión
            </p>
          </div>
        </div>

        {/* Card del formulario */}
        <div className="card">
          <form action={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-xinuco-muted uppercase tracking-wider">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@barberia.com"
                className="input-base"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-xinuco-muted uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="input-base pr-11"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xinuco-muted hover:text-xinuco-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="text-xs text-red-400 text-center px-2 animate-fade-in">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              id="btn-login"
              className="btn-primary mt-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Ingresando…
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-xinuco-muted mt-6">
          Powered by{' '}
          <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>
            Xinuco
          </span>
        </p>
      </div>
    </main>
  )
}
