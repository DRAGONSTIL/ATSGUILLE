'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, Loader2, Shield, Users, UserCheck } from 'lucide-react'

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [selectedRol, setSelectedRol] = useState<string | null>(null)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [demoKeyInput, setDemoKeyInput] = useState('')
    const [demoKeyLoading, setDemoKeyLoading] = useState(false)
    const [demoKeyError, setDemoKeyError] = useState('')

    const handleDemoLogin = async (provider: string, rol: string) => {
        setIsLoading(true)
        setSelectedRol(rol)
        try {
            await signIn(provider, { callbackUrl: "/" })
        } catch (error) {
            console.error('Login error:', error)
        } finally {
            setIsLoading(false)
            setSelectedRol(null)
        }
    }

    const handleGoogleLogin = async () => {
        setGoogleLoading(true)
        try {
            await signIn('google', { callbackUrl: '/' })
        } catch (error) {
            console.error('Google login error:', error)
        } finally {
            setGoogleLoading(false)
        }
    }

    // Check if Google OAuth is configured
    const hasGoogleOAuth = !!(process.env.NODE_ENV === 'development' ||
        (typeof window !== 'undefined' && window.location.hostname !== 'localhost'))

    const handleDemoKeyLogin = async () => {
        setDemoKeyError('')
        setDemoKeyLoading(true)
        try {
            const res = await fetch('/api/demo/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: demoKeyInput }),
            })
            const data = await res.json()

            if (!res.ok || !data.valid) {
                setDemoKeyError(data.error || 'Código inválido')
                return
            }

            const provider = data.rol === 'ADMIN' ? 'demo-admin' : data.rol === 'GERENTE' ? 'demo-gerente' : 'demo-reclutador'
            await signIn(provider, { callbackUrl: '/', email: data.email })
        } catch (error) {
            setDemoKeyError('No fue posible validar el código')
        } finally {
            setDemoKeyLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
            <Card className="w-full max-w-md border-0 shadow-2xl">
                <CardHeader className="text-center pb-2">
                    <div className="relative mx-auto mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-primary/30">
                            <Building2 className="h-10 w-10 text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-card" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">ATLAS GSE</CardTitle>
                    <CardDescription className="text-base">
                        Sistema Profesional de Gestión de Reclutamiento
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Google OAuth Button */}
                    <Button
                        className="w-full h-12 text-base font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                    >
                        {googleLoading ? (
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                        )}
                        Continuar con Google
                    </Button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-3 text-muted-foreground">Acceso Demo</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button
                            className="w-full h-12 text-base font-medium"
                            onClick={() => handleDemoLogin('demo-admin', 'ADMIN')}
                            disabled={isLoading}
                        >
                            {isLoading && selectedRol === 'ADMIN' ? (
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            ) : (
                                <Shield className="h-5 w-5 mr-2" />
                            )}
                            Entrar como Administrador
                        </Button>

                        <Button
                            className="w-full h-12 text-base font-medium"
                            variant="outline"
                            onClick={() => handleDemoLogin('demo-gerente', 'GERENTE')}
                            disabled={isLoading}
                        >
                            {isLoading && selectedRol === 'GERENTE' ? (
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            ) : (
                                <Users className="h-5 w-5 mr-2" />
                            )}
                            Entrar como Gerente
                        </Button>

                        <Button
                            className="w-full h-12 text-base font-medium"
                            variant="outline"
                            onClick={() => handleDemoLogin('demo-reclutador', 'RECLUTADOR')}
                            disabled={isLoading}
                        >
                            {isLoading && selectedRol === 'RECLUTADOR' ? (
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            ) : (
                                <UserCheck className="h-5 w-5 mr-2" />
                            )}
                            Entrar como Reclutador
                        </Button>
                    </div>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-3 text-muted-foreground">Código de acceso</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Input
                            placeholder="ATLAS-XXXX-XXXX-XXXX"
                            className="font-mono"
                            value={demoKeyInput}
                            onChange={(e) => setDemoKeyInput(e.target.value.toUpperCase())}
                        />
                        <Button className="w-full" onClick={handleDemoKeyLogin} disabled={demoKeyLoading || !demoKeyInput.trim()}>
                            {demoKeyLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Ingresar con código
                        </Button>
                        {demoKeyError && <p className="text-sm text-destructive">{demoKeyError}</p>}
                    </div>

                    <div className="text-center text-xs text-muted-foreground space-y-1 pt-2 border-t">
                        <p className="font-medium">ATLAS GSE v1.0</p>
                        <p>Sistema de Gestión de Reclutamiento Empresarial</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
