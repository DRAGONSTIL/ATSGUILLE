'use client'

import type { FormEvent } from 'react'
import { use, useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Shield, Sparkles } from 'lucide-react'
import { AtlasAuthShell } from '@/components/auth/atlas-auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type InviteData = {
  token: string
  email: string
  code: string
  rol: string
  empresa?: { nombre: string }
  equipo?: { nombre: string }
  expiresAt: string
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

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [busy, setBusy] = useState<'loading' | 'google' | 'activate' | null>('loading')
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [form, setForm] = useState({ name: '', username: '', password: '' })

  useEffect(() => {
    const validate = async () => {
      try {
        const response = await fetch(`/api/auth/invite/validate?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (!response.ok || !data.valid) {
          setAlert({ type: 'error', message: data.error || 'No fue posible validar esta invitación.' })
          setBusy(null)
          return
        }

        setInviteData(data.invitation)
      } catch {
        setAlert({ type: 'error', message: 'No fue posible validar esta invitación.' })
      } finally {
        setBusy(null)
      }
    }

    validate()
  }, [token])

  async function handleGoogleActivation() {
    setBusy('google')
    await signIn('google', { callbackUrl: '/' })
  }

  async function handlePasswordActivation(event: FormEvent) {
    event.preventDefault()
    setBusy('activate')
    setAlert(null)

    try {
      const response = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-invite-token': token,
        },
        body: JSON.stringify({
          email: inviteData?.email,
          code: inviteData?.code,
          name: form.name,
          username: form.username || undefined,
          password: form.password,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setAlert({ type: 'error', message: data.error || 'No fue posible activar el acceso.' })
        setBusy(null)
        return
      }

      setAlert({ type: 'success', message: 'Acceso activado. Serás redirigido a la plataforma.' })
      setTimeout(() => {
        router.push('/login')
      }, 1200)
    } catch {
      setAlert({ type: 'error', message: 'No fue posible activar el acceso.' })
      setBusy(null)
    }
  }

  return (
    <AtlasAuthShell
      eyebrow="Authorized enterprise invitation"
      title="Activa tu acceso corporativo."
      description="Esta invitación habilita una identidad exclusiva dentro del entorno ATLAS GSE. Valida el correo autorizado y elige tu método de activación."
      panelTitle={busy === 'loading' ? 'Validando invitación' : 'Invitación corporativa'}
      panelDescription="El acceso inicial puede vincularse con Google o activarse mediante credenciales seguras. Después del primer acceso, el código no volverá a solicitarse."
    >
      <div className="space-y-5">
        {alert && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              alert.type === 'error' ? 'border-red-400/20 bg-red-500/10 text-red-100' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {alert.type === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{alert.message}</span>
            </div>
          </div>
        )}

        {busy === 'loading' && (
          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-8 text-center text-slate-300">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-300" />
            <p className="mt-4">Sincronizando tu invitación con el entorno seguro.</p>
          </div>
        )}

        {!busy && inviteData && (
          <>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-3 text-amber-300">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs uppercase tracking-[0.28em]">Access profile</p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p><span className="text-white/45">Correo:</span> {inviteData.email}</p>
                <p><span className="text-white/45">Código:</span> <span className="font-mono tracking-[0.22em] text-amber-300">{inviteData.code}</span></p>
                <p><span className="text-white/45">Entorno:</span> {inviteData.empresa?.nombre || 'ATLAS GSE'}</p>
                <p><span className="text-white/45">Rol:</span> {inviteData.rol}</p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleActivation}
              disabled={busy !== null}
              className="h-14 w-full rounded-2xl border border-white/10 bg-white text-slate-950 hover:bg-white/90"
            >
              {busy === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleMark />}
              <span className="ml-3">Vincular con Google</span>
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0c1018] px-4 text-[11px] uppercase tracking-[0.28em] text-white/35">o activar con contraseña</span>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handlePasswordActivation}>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="h-14 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
                placeholder="Nombre completo"
              />
              <Input
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                className="h-14 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
                placeholder="Usuario corporativo opcional"
              />
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="h-14 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
                placeholder="Contraseña robusta"
              />
              <Button type="submit" disabled={busy !== null} className="h-14 w-full rounded-2xl btn-gold text-base">
                {busy === 'activate' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                Activar acceso
              </Button>
            </form>
          </>
        )}
      </div>
    </AtlasAuthShell>
  )
}
