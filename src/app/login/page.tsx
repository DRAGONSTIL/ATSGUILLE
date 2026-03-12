'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, Loader2, Shield, Users, UserCheck, Lock, Sparkles } from 'lucide-react'

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
            await signIn(provider, { callbackUrl: '/' })
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

    const demoRoles = [
        { id: 'ADMIN', provider: 'demo-admin', label: 'Administrador', icon: Shield, description: 'Acceso total al sistema' },
        { id: 'GERENTE', provider: 'demo-gerente', label: 'Gerente', icon: Users, description: 'Reportes y supervisión', variant: 'outline' as const },
        { id: 'RECLUTADOR', provider: 'demo-reclutador', label: 'Reclutador', icon: UserCheck, description: 'Gestión de candidatos', variant: 'outline' as const },
    ]

    return (
        <div className="min-h-screen flex" style={{ background: 'hsl(222 18% 7%)' }}>
            {/* Left decorative panel */}
            <div className="hidden lg:flex flex-1 flex-col justify-between p-10 relative overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse at 30% 50%, hsl(43 96% 56% / 0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, hsl(210 80% 50% / 0.05) 0%, transparent 50%)'
                    }} />
                    <div className="absolute inset-0 opacity-30" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(43 96% 56% / 0.15) 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center glow-gold-sm">
                        <Building2 className="h-5 w-5 text-amber-900" />
                    </div>
                    <span className="text-xl font-bold gradient-text-gold">ATLAS GSE</span>
                </div>

                {/* Hero content */}
                <div className="relative z-10 space-y-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-medium">
                            <Sparkles className="h-3 w-3" />
                            Sistema de Reclutamiento Enterprise
                        </div>
                        <h2 className="text-4xl font-bold leading-tight text-white">
                            Gestión de talento
                            <br />
                            <span className="gradient-text-gold">de clase mundial</span>
                        </h2>
                        <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                            Pipeline Kanban, evaluaciones en tiempo real, reportes ejecutivos y mucho más en una sola plataforma.
                        </p>
                    </div>

                    {/* Feature highlights */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Pipeline Kanban', desc: 'Drag & drop intuitivo' },
                            { label: 'Análisis avanzado', desc: 'Métricas en tiempo real' },
                            { label: 'Multi-empresa', desc: 'Gestión centralizada' },
                            { label: 'Colaboración', desc: 'Equipos sincronizados' },
                        ].map((feat) => (
                            <div key={feat.label} className="p-3 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm">
                                <p className="text-sm font-semibold text-foreground">{feat.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <p className="text-xs text-muted-foreground/50">ATLAS GSE v1.1 · Sistema profesional de gestión de reclutamiento</p>
                </div>
            </div>

            {/* Right — Login panel */}
            <div className="flex-1 lg:max-w-md flex flex-col items-center justify-center p-6 lg:p-10 relative">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center glow-gold-sm">
                        <Building2 className="h-5 w-5 text-amber-900" />
                    </div>
                    <span className="text-xl font-bold gradient-text-gold">ATLAS GSE</span>
                </div>

                <div className="w-full max-w-sm space-y-6 animate-fade-up">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Bienvenido</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Inicia sesión para acceder a tu panel</p>
                    </div>

                    {/* Google OAuth */}
                    <button
                        className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border/70 bg-card hover:bg-muted/60 hover:border-border transition-all duration-200 text-sm font-medium"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                    >
                        {googleLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        Continuar con Google
                    </button>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="divider-gold w-full" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-3 text-xs text-muted-foreground/60 uppercase tracking-widest"
                                style={{ background: 'hsl(222 18% 7%)' }}>
                                Acceso Demo
                            </span>
                        </div>
                    </div>

                    {/* Demo roles */}
                    <div className="space-y-2">
                        {demoRoles.map((role) => {
                            const Icon = role.icon
                            const isThisLoading = isLoading && selectedRol === role.id
                            return (
                                <button key={role.id}
                                    onClick={() => handleDemoLogin(role.provider, role.id)}
                                    disabled={isLoading}
                                    className={`w-full flex items-center gap-3 h-12 px-4 rounded-xl border transition-all duration-200 text-sm font-medium text-left group disabled:opacity-60
                                        ${role.id === 'ADMIN'
                                            ? 'btn-gold border-transparent'
                                            : 'border-border/60 bg-card/50 hover:bg-muted/50 hover:border-amber-500/20 text-foreground'
                                        }`}
                                >
                                    {isThisLoading
                                        ? <Loader2 className="h-4.5 w-4.5 animate-spin shrink-0" />
                                        : <Icon className={`h-4.5 w-4.5 shrink-0 ${role.id === 'ADMIN' ? 'text-amber-900' : 'text-amber-400 group-hover:text-amber-300'}`} />
                                    }
                                    <div className="flex-1 min-w-0">
                                        <span className="block font-semibold">{role.label}</span>
                                        <span className={`block text-[11px] ${role.id === 'ADMIN' ? 'text-amber-900/70' : 'text-muted-foreground'}`}>
                                            {role.description}
                                        </span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="divider-gold w-full" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-3 text-xs text-muted-foreground/60 uppercase tracking-widest"
                                style={{ background: 'hsl(222 18% 7%)' }}>
                                Código de acceso
                            </span>
                        </div>
                    </div>

                    {/* Access code */}
                    <div className="space-y-2">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ATLAS-XXXX-XXXX-XXXX"
                                className="pl-9 font-mono h-11 bg-card/50 border-border/60 focus:border-amber-500/40 tracking-widest uppercase"
                                value={demoKeyInput}
                                onChange={(e) => setDemoKeyInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && !demoKeyLoading && demoKeyInput.trim() && handleDemoKeyLogin()}
                            />
                        </div>
                        <Button className="w-full h-11 btn-gold rounded-xl" onClick={handleDemoKeyLogin}
                            disabled={demoKeyLoading || !demoKeyInput.trim()}>
                            {demoKeyLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Ingresar con código
                        </Button>
                        {demoKeyError && (
                            <p className="text-xs text-destructive text-center animate-fade-in">{demoKeyError}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
