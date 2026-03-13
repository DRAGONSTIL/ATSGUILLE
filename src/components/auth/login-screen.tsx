'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, LockKeyhole, Mail, Shield, User2 } from 'lucide-react'
import { AtlasAuthShell } from '@/components/auth/atlas-auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type InvitationPreview = {
  token: string
  email: string
  code: string
  rol: string
  empresa?: { nombre: string }
  equipo?: { nombre: string }
  expiresAt: string
}

const errorMessages: Record<string, string> = {
  GOOGLE_NOT_AUTHORIZED: 'El correo de Google no coincide con una invitación activa o un acceso ya autorizado.',
  ACCOUNT_NOT_ACTIVATED: 'Tu acceso aún no está activado. Valida primero tu código de invitación.',
  ACCOUNT_SUSPENDED: 'Este acceso fue suspendido por la administración.',
  CredentialsSignin: 'No fue posible validar tus credenciales corporativas.',
}

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.77-.07-1.52-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l4.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

export function LoginScreen({ searchError }: { searchError?: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'activate' | 'forgot'>('signin')
  const [busy, setBusy] = useState<'google' | 'credentials' | 'validate' | 'activate' | 'forgot' | null>(null)
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [signInForm, setSignInForm] = useState({ identifier: '', password: '' })
  const [activateForm, setActivateForm] = useState({ email: '', code: '', name: '', username: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')

  const topMessage = useMemo(() => {
    if (!searchError) {
      return null
    }

    return errorMessages[searchError] || 'No fue posible completar el acceso solicitado.'
  }, [searchError])

  async function handleGoogleAccess() {
    setBusy('google')
    setAlert(null)
    await signIn('google', { callbackUrl: '/' })
  }

  async function handleCredentialAccess(event: FormEvent) {
    event.preventDefault()
    setBusy('credentials')
    setAlert(null)

    const result = await signIn('credentials', {
      identifier: signInForm.identifier,
      password: signInForm.password,
      redirect: false,
      callbackUrl: '/',
    })

    if (result?.error) {
      setAlert({
        type: 'error',
        message: errorMessages[result.error] || 'No fue posible validar tus credenciales corporativas.',
      })
      setBusy(null)
      return
    }

    router.push(result?.url || '/')
    router.refresh()
  }

  async function handleValidateInvitation(event: FormEvent) {
    event.preventDefault()
    setBusy('validate')
    setAlert(null)

    try {
      const response = await fetch(
        `/api/auth/invite/validate?email=${encodeURIComponent(activateForm.email)}&code=${encodeURIComponent(activateForm.code)}`
      )
      const data = await response.json()

      if (!response.ok || !data.valid) {
        setAlert({ type: 'error', message: data.error || 'No se encontró una invitación activa para este acceso.' })
        setBusy(null)
        return
      }

      setInvitation(data.invitation)
      setAlert({ type: 'success', message: 'Invitación validada. Continúa con tu método de activación autorizado.' })
    } catch {
      setAlert({ type: 'error', message: 'No fue posible validar el código en este momento.' })
    } finally {
      setBusy(null)
    }
  }

  async function handleActivateWithPassword(event: FormEvent) {
    event.preventDefault()
    setBusy('activate')
    setAlert(null)

    try {
      const response = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activateForm.email,
          code: activateForm.code,
          name: activateForm.name,
          username: activateForm.username || undefined,
          password: activateForm.password,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setAlert({ type: 'error', message: data.error || 'No fue posible activar el acceso corporativo.' })
        setBusy(null)
        return
      }

      const signInResult = await signIn('credentials', {
        identifier: activateForm.email,
        password: activateForm.password,
        redirect: false,
        callbackUrl: '/',
      })

      if (signInResult?.error) {
        setAlert({ type: 'success', message: 'Acceso activado. Inicia sesión con tus nuevas credenciales.' })
        setMode('signin')
        setBusy(null)
        return
      }

      router.push(signInResult?.url || '/')
      router.refresh()
    } catch {
      setAlert({ type: 'error', message: 'No fue posible activar el acceso corporativo.' })
      setBusy(null)
    }
  }

  async function handleForgotPassword(event: FormEvent) {
    event.preventDefault()
    setBusy('forgot')
    setAlert(null)

    try {
      const response = await fetch('/api/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await response.json()

      if (!response.ok) {
        setAlert({ type: 'error', message: data.error || 'No fue posible iniciar el restablecimiento.' })
        setBusy(null)
        return
      }

      setAlert({ type: 'success', message: data.message })
    } catch {
      setAlert({ type: 'error', message: 'No fue posible iniciar el restablecimiento.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <AtlasAuthShell
      eyebrow="Luxury ATS access orchestration"
      title="El ATS premium para operar talento con presencia ejecutiva."
      description="ATLAS GSE convierte el acceso a reclutamiento en una experiencia de alto nivel: segura, inmersiva y precisa. Cada ingreso abre una superficie de mando pensada para equipos que necesitan control, velocidad y lectura clara del pipeline."
      panelTitle="Ingresa a tu entorno ATS privado"
      panelDescription="Continua con tu cuenta autorizada, activa un acceso por invitacion o recupera el control de tu identidad operativa sin salir del flujo principal."
    >
      <div className="space-y-4">
        {(topMessage || alert) && (
          <div
            className={`rounded-[1.1rem] border px-4 py-2.5 text-[13px] leading-5 ${
              (alert?.type || 'error') === 'error'
                ? 'border-red-400/20 bg-red-500/10 text-red-100'
                : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {(alert?.type || (topMessage ? 'error' : 'success')) === 'error' ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{alert?.message || topMessage}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5 rounded-[1.05rem] border border-white/10 bg-black/20 p-1">
          {[
            ['signin', 'Ingresar'],
            ['activate', 'Activar'],
            ['forgot', 'Recuperar'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value as 'signin' | 'activate' | 'forgot')
                setAlert(null)
              }}
              className={`rounded-[0.9rem] px-3 py-2.5 text-[13px] transition ${
                mode === value
                  ? 'bg-white text-slate-950 shadow-[0_14px_35px_rgba(255,255,255,0.18)]'
                  : 'text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'signin' && (
          <div className="space-y-4 animate-fade-in">
            <Button
              type="button"
              onClick={handleGoogleAccess}
              disabled={busy !== null}
              className="h-12 w-full rounded-[1.1rem] border border-white/10 bg-white text-slate-950 hover:bg-white/90"
            >
              {busy === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleMark />}
              <span className="ml-3">Continuar con Google</span>
            </Button>

            <div className="relative py-0.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0a0d14] px-4 text-[11px] uppercase tracking-[0.28em] text-white/35">o acceso directo</span>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleCredentialAccess}>
              <label className="block space-y-1.5">
                <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Correo o usuario</span>
                <div className="relative">
                  <User2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    value={signInForm.identifier}
                    onChange={(event) => setSignInForm((current) => ({ ...current, identifier: event.target.value }))}
                    className="h-12 rounded-[1.1rem] border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-white/25"
                    placeholder="nombre@empresa.com o usuario"
                  />
                </div>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Contraseña</span>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    type="password"
                    value={signInForm.password}
                    onChange={(event) => setSignInForm((current) => ({ ...current, password: event.target.value }))}
                    className="h-12 rounded-[1.1rem] border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-white/25"
                    placeholder="Tu contraseña segura"
                  />
                </div>
              </label>

              <Button type="submit" disabled={busy !== null} className="h-12 w-full rounded-[1.1rem] btn-gold text-[15px]">
                {busy === 'credentials' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                Ingresar
              </Button>
            </form>
          </div>
        )}

        {mode === 'activate' && (
          <div className="space-y-4 animate-fade-in">
            {!invitation ? (
              <form className="space-y-3.5" onSubmit={handleValidateInvitation}>
                <label className="block space-y-1.5">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Correo invitado</span>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      type="email"
                      value={activateForm.email}
                      onChange={(event) => setActivateForm((current) => ({ ...current, email: event.target.value }))}
                      className="h-12 rounded-[1.1rem] border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-white/25"
                      placeholder="correo autorizado"
                    />
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Código de invitación</span>
                  <Input
                    value={activateForm.code}
                    onChange={(event) => setActivateForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                    className="h-12 rounded-[1.1rem] border-white/10 bg-white/[0.04] font-mono tracking-[0.2em] text-white placeholder:text-white/20"
                    placeholder="ATLAS-XXXX-XXXX-XXXX"
                  />
                </label>

                <Button type="submit" disabled={busy !== null} className="h-12 w-full rounded-[1.1rem] btn-gold text-[15px]">
                  {busy === 'validate' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Continuar
                </Button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="rounded-[1.25rem] border border-emerald-400/20 bg-emerald-500/10 p-3.5 text-[13px] text-emerald-100">
                  <p className="font-medium">Invitación validada</p>
                  <p className="mt-1 text-emerald-100/80">
                    Correo autorizado: {invitation.email}. Empresa: {invitation.empresa?.nombre || 'ATLAS GSE'}.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleGoogleAccess}
                  disabled={busy !== null}
                  className="h-12 w-full rounded-[1.1rem] border border-white/10 bg-white text-slate-950 hover:bg-white/90"
                >
                  {busy === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleMark />}
                  <span className="ml-3">Vincular con Google</span>
                </Button>

                <div className="relative py-0.5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-[#0a0d14] px-4 text-[11px] uppercase tracking-[0.28em] text-white/35">o define credenciales</span>
                  </div>
                </div>

                <form className="space-y-3.5" onSubmit={handleActivateWithPassword}>
                  <Input
                    value={activateForm.name}
                    onChange={(event) => setActivateForm((current) => ({ ...current, name: event.target.value }))}
                    className="h-12 rounded-[1.1rem] border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
                    placeholder="Nombre completo"
                  />
                  <Input
                    value={activateForm.username}
                    onChange={(event) => setActivateForm((current) => ({ ...current, username: event.target.value }))}
                    className="h-12 rounded-[1.1rem] border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
                    placeholder="Usuario corporativo opcional"
                  />
                  <Input
                    type="password"
                    value={activateForm.password}
                    onChange={(event) => setActivateForm((current) => ({ ...current, password: event.target.value }))}
                    className="h-12 rounded-[1.1rem] border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
                    placeholder="Crea una contraseña robusta"
                  />
                  <p className="text-[12px] leading-5 text-slate-400">
                    Debe incluir mínimo 10 caracteres, mayúsculas, minúsculas, número y carácter especial.
                  </p>
                  <Button type="submit" disabled={busy !== null} className="h-12 w-full rounded-[1.1rem] btn-gold text-[15px]">
                    {busy === 'activate' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                    Activar acceso corporativo
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}

        {mode === 'forgot' && (
          <form className="space-y-4 animate-fade-in" onSubmit={handleForgotPassword}>
            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">Correo corporativo</span>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  className="h-12 rounded-[1.1rem] border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-white/25"
                  placeholder="correo autorizado"
                />
              </div>
            </label>

            <Button type="submit" disabled={busy !== null} className="h-12 w-full rounded-[1.1rem] btn-gold text-[15px]">
              {busy === 'forgot' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Enviar enlace seguro
            </Button>
          </form>
        )}
      </div>
    </AtlasAuthShell>
  )
}
