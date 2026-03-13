'use client'

import type { FormEvent } from 'react'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react'
import { AtlasAuthShell } from '@/components/auth/atlas-auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setAlert(null)

    if (password !== confirmPassword) {
      setAlert({ type: 'error', message: 'La confirmación no coincide con la nueva contraseña.' })
      return
    }

    setBusy(true)

    try {
      const response = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json()

      if (!response.ok) {
        setAlert({ type: 'error', message: data.error || 'No fue posible restablecer el acceso.' })
        setBusy(false)
        return
      }

      setAlert({ type: 'success', message: 'Contraseña actualizada. Serás redirigido al acceso principal.' })
      setTimeout(() => router.push('/login'), 1200)
    } catch {
      setAlert({ type: 'error', message: 'No fue posible restablecer el acceso.' })
      setBusy(false)
    }
  }

  return (
    <AtlasAuthShell
      eyebrow="Security recovery channel"
      title="Restablece tu acceso operativo."
      description="Protege la continuidad de tu operación con un reinicio seguro de credenciales. El enlace se invalida al primer uso y respeta la política de seguridad del entorno."
      panelTitle="Restablecimiento seguro"
      panelDescription="Define una contraseña robusta para recuperar el control de tu cuenta autorizada."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
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

        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-14 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
          placeholder="Nueva contraseña robusta"
        />
        <Input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="h-14 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
          placeholder="Confirma la contraseña"
        />

        <p className="text-xs leading-6 text-slate-400">
          Política mínima: 10 caracteres, combinación de mayúsculas, minúsculas, números y caracteres especiales.
        </p>

        <Button type="submit" disabled={busy} className="h-14 w-full rounded-2xl btn-gold text-base">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
          Restablecer contraseña
        </Button>
      </form>
    </AtlasAuthShell>
  )
}
