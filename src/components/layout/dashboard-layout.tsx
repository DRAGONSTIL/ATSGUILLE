'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { NotificationCenter } from '@/components/atlas/notification-center'
import { CommandPalette } from '@/components/atlas/command-palette'
import {
    Menu, Building2, Search, Sun, Moon, ChevronDown, Settings, LogOut,
    LayoutDashboard, Kanban, Briefcase, Users, Calendar, StickyNote, Mail, ClipboardList, FileBarChart, Target, Shield,
    Command
} from 'lucide-react'
import { useUIStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import { useGlobalDialogs } from '@/components/layout/global-dialogs'
// Note: useGlobalDialogs is still needed for the new candidate dialog in other places

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const { theme, setTheme } = useTheme()
    const { globalSearch, setGlobalSearch, addNotification } = useUIStore(useShallow((state) => ({
        globalSearch: state.busqueda,
        setGlobalSearch: state.setBusqueda,
        addNotification: state.addNotification
    })))
    const pathname = usePathname()
    const router = useRouter()
    const { setIsNewCandidatoDialogOpen } = useGlobalDialogs()

    useEffect(() => {
        // Rehydrate zustand persist store
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useUIStore.persist.rehydrate()
    }, [])

    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const isPrivilegedUser = session?.user?.rol === 'ADMIN' || session?.user?.rol === 'GERENTE'

    const navItems = [
        { id: 'dashboard', href: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Resumen y métricas' },
        { id: 'pipeline', href: '/pipeline', label: 'Pipeline', icon: Kanban, description: 'Kanban de candidatos' },
        { id: 'vacantes', href: '/vacantes', label: 'Vacantes', icon: Briefcase, description: 'Gestión de vacantes' },
        { id: 'directorio', href: '/directorio', label: 'Candidatos', icon: Users, description: 'Directorio de candidatos' },
        { id: 'entrevistas', href: '/entrevistas', label: 'Entrevistas', icon: Calendar, description: 'Agenda de entrevistas' },
        { id: 'notas', href: '/notas', label: 'Notas', icon: StickyNote, description: 'Notas y tareas' },
        { id: 'emails', href: '/emails', label: 'Emails', icon: Mail, description: 'Templates y envíos' },
        { id: 'evaluaciones', href: '/evaluaciones', label: 'Evaluaciones', icon: ClipboardList, description: 'Evaluaciones técnicas' },
        { id: 'reportes', href: '/reportes', label: 'Reportes', icon: FileBarChart, description: 'Reportes ejecutivos' },
        { id: 'metas', href: '/metas', label: 'Metas', icon: Target, description: 'Objetivos del equipo' },
        ...(isPrivilegedUser ? [{ id: 'admin', href: '/admin', label: 'Admin', icon: Shield, description: 'Configuración avanzada' }] : []),
    ]



    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const isSlash = event.key === '/'
            const isCtrlOrCmdK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'

            if (!isSlash && !isCtrlOrCmdK) return

            const target = event.target as HTMLElement | null
            const isTypingInInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
            if (isTypingInInput) return

            event.preventDefault()
            if (isCtrlOrCmdK) {
                setCommandPaletteOpen((prev) => !prev)
                return
            }
            searchInputRef.current?.focus()
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
                        <Building2 className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-muted-foreground">Cargando ATLAS GSE...</p>
                </div>
            </div>
        )
    }

    if (status === 'unauthenticated') {
        return null
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background">
                {/* Header */}
                <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="lg:hidden"
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>

                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/20">
                                            <Building2 className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold tracking-tight">ATLAS GSE</h1>
                                        <p className="text-xs text-muted-foreground hidden sm:block">Sistema de Reclutamiento v1.1.0-DEPLOY-CHECK</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Quick Search */}
                                <div className="hidden md:flex relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        ref={searchInputRef}
                                        placeholder="Buscar..."
                                        value={globalSearch}
                                        onChange={(e) => setGlobalSearch(e.target.value)}
                                        className="pl-9 w-48 lg:w-64 bg-muted/50"
                                    />
                                </div>

                                <NotificationCenter />

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                        >
                                            {mounted ? (theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />) : <div className="h-5 w-5" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cambiar tema</TooltipContent>
                                </Tooltip>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="gap-2 px-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                                                    {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="hidden sm:block text-left">
                                                <p className="text-sm font-medium">{session?.user?.name || 'Usuario'}</p>
                                                <Badge variant="outline" className="text-xs py-0">
                                                    {session?.user?.rol}
                                                </Badge>
                                            </div>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <div className="p-2">
                                            <p className="text-sm font-medium">{session?.user?.name}</p>
                                            <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                                        </div>
                                        <DropdownMenuSeparator />
                                        {isPrivilegedUser && (
                                            <DropdownMenuItem asChild>
                                                <Link href="/admin"><Settings className="mr-2 h-4 w-4" /> Configuración</Link>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Cerrar Sesión
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                </header>

                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                    <SheetContent side="left" className="w-[280px] overflow-y-auto">
                        <div className="space-y-2 pt-8">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <Button
                                        key={item.id}
                                        variant={pathname === item.href ? 'secondary' : 'ghost'}
                                        className="w-full justify-start gap-2"
                                        asChild
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <Link href={item.href}>
                                            <Icon className="h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    </Button>
                                )
                            })}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Main content */}
                <main className="container mx-auto px-4 py-6 pb-24 lg:pb-6">
                    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                        <aside className="hidden lg:block">
                            <Card className="sticky top-24">
                                <CardContent className="p-3 space-y-1">
                                    {navItems.map((item) => {
                                        const Icon = item.icon
                                        return (
                                            <Button
                                                key={item.id}
                                                variant={pathname === item.href ? 'secondary' : 'ghost'}
                                                className="w-full justify-start gap-2"
                                                asChild
                                            >
                                                <Link href={item.href}>
                                                    <Icon className="h-4 w-4" />
                                                    {item.label}
                                                </Link>
                                            </Button>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        </aside>

                        <section className="min-w-0">
                            {children}
                        </section>
                    </div>
                </main>

                <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden">
                    <div className="grid grid-cols-4 gap-1 p-2">
                        <Button variant={pathname === '/pipeline' ? 'secondary' : 'ghost'} className="h-10" asChild>
                            <Link href="/pipeline">Pipeline</Link>
                        </Button>
                        <Button variant={pathname === '/directorio' ? 'secondary' : 'ghost'} className="h-10" asChild>
                            <Link href="/directorio">Candidatos</Link>
                        </Button>
                        <Button variant={pathname === '/vacantes' ? 'secondary' : 'ghost'} className="h-10" asChild>
                            <Link href="/vacantes">Vacantes</Link>
                        </Button>
                        <Button variant="ghost" className="h-10" onClick={() => setSidebarOpen(true)}>
                            Más
                        </Button>
                    </div>
                </nav>

                <CommandPalette
                    open={commandPaletteOpen}
                    onOpenChange={setCommandPaletteOpen}
                    items={navItems.map((item) => ({ id: item.id, label: item.label, description: item.description }))}
                    onSelect={(id) => {
                        const match = navItems.find((n) => n.id === id)
                        if (match) router.push(match.href)
                    }}
                    onOpenCandidate={(id) => router.push(`/directorio?candidatoId=${id}`)}
                    onOpenVacante={(id) => router.push(`/vacantes?vacanteId=${id}`)}
                />
            </div>
        </TooltipProvider>
    )
}
