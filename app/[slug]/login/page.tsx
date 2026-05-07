'use client'

import { useState, useEffect, useTransition, use } from 'react'
import { useRouter } from 'next/navigation'
import { Scissors, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { login, logout as signOut } from '@/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'

interface LoginPageProps {
  params: Promise<{ slug: string }>
}

type SessionState = 'loading' | 'conflict' | 'none'

export default function LoginPage({ params }: LoginPageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  const [sessionState, setSessionState] = useState<SessionState>('loading')
  const [userSlug, setUserSlug]         = useState<string | null>(null)

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const metadataSlug = user.user_metadata?.slug as string | undefined

        if (metadataSlug === slug) {
          // Caso A: Match -> Redirige al dashboard del tenant
          router.push(`/${slug}/dashboard`)
        } else if (metadataSlug) {
          // Caso B: Conflicto -> Sesión de otro tenant
          setUserSlug(metadataSlug)
          setSessionState('conflict')
        } else {
          // Fallback si por alguna razón no tiene slug en metadata
          setSessionState('none')
        }
      } else {
        // Caso C: No hay sesión
        setSessionState('none')
      }
    }

    checkSession()
  }, [slug, router])

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) setError(result.error)
    })
  }

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
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
        {/* Logo / Brand / Skeletons */}
        <div className="flex flex-col items-center mb-8 gap-3">
          {sessionState === 'loading' ? (
            <Skeleton className="w-16 h-16" rounded="lg" />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center glow-primary"
              style={{ background: 'var(--primary-color)' }}
            >
              <Scissors size={28} color="var(--bg-color)" strokeWidth={2} />
            </div>
          )}

          <div className="text-center">
            {sessionState === 'loading' ? (
              <>
                <Skeleton className="h-8 w-32 mb-2 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
              </>
            ) : sessionState === 'conflict' ? (
              <h1 className="text-2xl font-bold tracking-tight text-xinuco-text">
                Acceso Restringido
              </h1>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-xinuco-text">
                  Bienvenido
                </h1>
                <p className="text-sm text-xinuco-muted mt-1">
                  Accede a tu panel de gestión
                </p>
              </>
            )}
          </div>
        </div>

        {/* Card de contenido principal */}
        <div className="card">
          {sessionState === 'loading' ? (
            /* Estado de Carga (Skeletons) */
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-11 w-full" rounded="md" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-11 w-full" rounded="md" />
              </div>
              <Skeleton className="h-12 w-full mt-2" rounded="md" />
            </div>
          ) : sessionState === 'conflict' ? (
            /* Estado de Conflicto Multi-tenant */
            <div className="flex flex-col items-center gap-6 py-4 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}
              >
                <AlertCircle size={32} style={{ color: 'var(--primary-color)' }} />
              </div>

              <div>
                <p className="text-lg font-bold text-xinuco-text">Sesión activa en otro local</p>
                <p className="text-sm text-xinuco-muted mt-2">
                  Actualmente tienes una sesión iniciada en la barbería{' '}
                  <span className="font-semibold text-xinuco-text">/{userSlug}</span>.
                </p>
              </div>

              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/${userSlug}/dashboard`)}
                  className="btn-primary w-full !py-6"
                >
                  Ir a mi Dashboard ({userSlug})
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={isPending}
                  className="btn-ghost w-full !py-6"
                >
                  {isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Cerrar sesión e ingresar aquí'
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Formulario de Login Normal */
            <form action={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-xinuco-muted uppercase tracking-wider"
                >
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
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-xinuco-muted uppercase tracking-wider"
                >
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
                className="btn-primary mt-2 !py-6"
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
          )}
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
