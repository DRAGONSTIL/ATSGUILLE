'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Building2,
  Mail,
  User,
  Lock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

interface InviteData {
  email: string
  rol: string
  empresa?: { nombre: string }
  equipo?: { nombre: string }
  invitadoPor?: { name: string }
  expiresAt: string
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)

  // Validar invitación
  useEffect(() => {
    const validateInvite = async () => {
      try {
        const res = await fetch(`/api/auth/invite/validate?token=${token}`)

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Invitación inválida')
          return
        }

        const data = await res.json()
        setInviteData(data.invitacion)
      } catch (err) {
        setError('Error al validar la invitación')
      } finally {
        setLoading(false)
      }
    }

    validateInvite()
  }, [token])

  // Aceptar invitación
  const handleAccept = async () => {
    if (!name.trim()) {
      setError('Por favor ingresa tu nombre completo')
      return
    }

    setAccepting(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim(),
          password: password || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al aceptar la invitación')
        return
      }

      setAccepted(true)

      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      setError('Error al procesar la solicitud')
    } finally {
      setAccepting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validando invitación...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="flex flex-col items-center py-12">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Invitación Inválida</h2>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>
              Ir al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Accepted state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="flex flex-col items-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">¡Bienvenido a ATLAS GSE!</h2>
            <p className="text-muted-foreground text-center">
              Tu cuenta ha sido creada exitosamente. Serás redirigido al login...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="relative mx-auto mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <Building2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">¡Has sido invitado!</CardTitle>
          <CardDescription>
            {inviteData?.invitadoPor?.name || 'Un administrador'} te ha invitado a unirte a ATLAS GSE
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Info de la invitación */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{inviteData?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Rol</p>
                <p className="font-medium capitalize">{inviteData?.rol?.toLowerCase()}</p>
              </div>
            </div>
            {inviteData?.empresa && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  <p className="font-medium">{inviteData.empresa.nombre}</p>
                </div>
              </div>
            )}
            {inviteData?.equipo && (
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Equipo</p>
                  <p className="font-medium">{inviteData.equipo.nombre}</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Formulario */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Tu nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña (opcional)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Crea una contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Si no estableces una contraseña, podrás iniciar sesión con Google
              </p>
            </div>
          </div>

          <Button
            className="w-full h-12"
            onClick={handleAccept}
            disabled={accepting || !name.trim()}
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aceptar Invitación
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Esta invitación expira el{' '}
            {inviteData?.expiresAt
              ? new Date(inviteData.expiresAt).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
