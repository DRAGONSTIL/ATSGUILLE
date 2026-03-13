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
import { NotificationCenter } from '@/components/atlas/notification-center'
import { CommandPalette } from '@/components/atlas/command-palette'
import {
    Menu, Building2, Search, Sun, Moon, ChevronDown, Settings, LogOut,
    LayoutDashboard, Kanban, Briefcase, Users, Calendar, StickyNote, Mail, ClipboardList, FileBarChart, Target, Shield,
    Command, Plus, ChevronLeft
} from 'lucide-react'
import { useUIStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import { useGlobalDialogs } from '@/components/layout/global-dialogs'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const { theme, setTheme } = useTheme()
    const { globalSearch, setGlobalSearch, sidebarCollapsed, toggleSidebar } = useUIStore(useShallow((state) => ({
        globalSearch: state.busqueda,
        setGlobalSearch: state.setBusqueda,
        sidebarCollapsed: state.sidebarCollapsed,
        toggleSidebar: state.toggleSidebar,
    })))
    const pathname = usePathname()
    const router = useRouter()
    const { setIsNewCandidatoDialogOpen } = useGlobalDialogs()

    useEffect(() => {
        useUIStore.persist.rehydrate()
    }, [])

    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const isPrivilegedUser = session?.user?.rol === 'ADMIN' || session?.user?.rol === 'GERENTE'

    const navItems = [
        { id: 'dashboard', href: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Resumen y metricas' },
        { id: 'pipeline', href: '/pipeline', label: 'Pipeline', icon: Kanban, description: 'Kanban de candidatos' },
        { id: 'vacantes', href: '/vacantes', label: 'Vacantes', icon: Briefcase, description: 'Gestion de vacantes' },
        { id: 'directorio', href: '/directorio', label: 'Candidatos', icon: Users, description: 'Directorio de candidatos' },
        { id: 'entrevistas', href: '/entrevistas', label: 'Entrevistas', icon: Calendar, description: 'Agenda de entrevistas' },
        { id: 'notas', href: '/notas', label: 'Notas', icon: StickyNote, description: 'Notas y tareas' },
        { id: 'emails', href: '/emails', label: 'Emails', icon: Mail, description: 'Templates y envios' },
        { id: 'evaluaciones', href: '/evaluaciones', label: 'Evaluaciones', icon: ClipboardList, description: 'Evaluaciones tecnicas' },
        { id: 'reportes', href: '/reportes', label: 'Reportes', icon: FileBarChart, description: 'Reportes ejecutivos' },
        { id: 'metas', href: '/metas', label: 'Metas', icon: Target, description: 'Objetivos del equipo' },
        ...(isPrivilegedUser ? [{ id: 'admin', href: '/admin', label: 'Admin', icon: Shield, description: 'Configuracion avanzada' }] : []),
    ]

    const navGroups = [
        { label: 'Principal', items: navItems.slice(0, 4) },
        { label: 'Gestion', items: navItems.slice(4, 8) },
        { label: 'Analisis', items: navItems.slice(8) },
    ]

    const isNavItemActive = (href: string) => {
        if (href === '/') return pathname === '/'
        return pathname === href || pathname.startsWith(`${href}/`)
    }

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const isCtrlOrCmdK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
            const isSlash = event.key === '/'
            if (!isSlash && !isCtrlOrCmdK) return
            const target = event.target as HTMLElement | null
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
            event.preventDefault()
            if (isCtrlOrCmdK) { setCommandPaletteOpen((p) => !p); return }
            searchInputRef.current?.focus()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(222 18% 7%)' }}>
                <div className="text-center space-y-6 animate-fade-in">
                    <div className="relative mx-auto w-20 h-20">
                        {/* Outer ring */}
                        <div className="absolute inset-0 rounded-2xl border-2 border-amber-500/20 animate-spin-slow" />
                        {/* Inner glow */}
                        <div className="absolute inset-1 rounded-xl gradient-gold opacity-90 flex items-center justify-center glow-gold">
                            <Building2 className="h-9 w-9 text-amber-900" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg font-bold tracking-wide gradient-text-gold">ATLAS GSE</p>
                        <p className="text-sm text-muted-foreground">Iniciando sistema...</p>
                    </div>
                    <div className="flex justify-center gap-1.5">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (status === 'unauthenticated') return null

    const userInitial = session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || 'U'

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background flex">

                {/* Desktop sidebar */}
                <aside className={`hidden lg:flex flex-col border-r border-border/50 transition-all duration-300 ease-in-out shrink-0 ${sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'}`}
                    style={{ background: 'hsl(222 18% 8.5%)', position: 'sticky', top: 0, height: '100vh' }}>

                    {/* Logo area */}
                    <div className={`flex items-center gap-3 px-4 py-5 border-b border-border/50 shrink-0 ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
                        <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center glow-gold-sm">
                                <Building2 className="h-4.5 w-4.5 text-amber-900" />
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[hsl(222_18%_8.5%)]" />
                        </div>
                        {!sidebarCollapsed && (
                            <div className="min-w-0 flex-1">
                                <h1 className="text-base font-bold tracking-tight gradient-text-gold leading-none">ATLAS GSE</h1>
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Sistema de Reclutamiento</p>
                            </div>
                        )}
                    </div>

                    {/* Quick action button */}
                    {!sidebarCollapsed && (
                        <div className="px-3 py-3 shrink-0">
                            <button
                                onClick={() => setIsNewCandidatoDialogOpen(true)}
                                className="btn-gold w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo Candidato
                            </button>
                        </div>
                    )}
                    {sidebarCollapsed && (
                        <div className="px-2 py-3 shrink-0 flex justify-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setIsNewCandidatoDialogOpen(true)}
                                        className="btn-gold w-10 h-10 flex items-center justify-center rounded-lg"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Nuevo Candidato</TooltipContent>
                            </Tooltip>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
                        {navGroups.map((group) => (
                            <div key={group.label}>
                                {!sidebarCollapsed && (
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1">{group.label}</p>
                                )}
                                <div className="space-y-0.5">
                                    {group.items.map((item) => {
                                        const Icon = item.icon
                                        const isActive = isNavItemActive(item.href)
                                        return sidebarCollapsed ? (
                                            <Tooltip key={item.id}>
                                                <TooltipTrigger asChild>
                                                    <Link href={item.href}
                                                        className={`sidebar-item justify-center px-2 ${isActive ? 'active' : ''}`}>
                                                        <Icon className="h-4.5 w-4.5 shrink-0" />
                                                    </Link>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">{item.label}</TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Link key={item.id} href={item.href}
                                                className={`sidebar-item ${isActive ? 'active' : ''}`}>
                                                <Icon className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{item.label}</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* User section */}
                    <div className={`border-t border-border/50 p-3 shrink-0 space-y-2`}>
                        {/* Collapse toggle */}
                        <button
                            onClick={toggleSidebar}
                            className="sidebar-item w-full justify-center"
                            title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
                        >
                            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
                            {!sidebarCollapsed && <span className="text-xs">Colapsar</span>}
                        </button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={`sidebar-item w-full ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
                                    <Avatar className="h-7 w-7 shrink-0 border border-amber-500/20">
                                        <AvatarFallback className="bg-amber-500/10 text-amber-400 text-xs font-bold">
                                            {userInitial}
                                        </AvatarFallback>
                                    </Avatar>
                                    {!sidebarCollapsed && (
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-xs font-semibold truncate text-foreground">{session?.user?.name || 'Usuario'}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{session?.user?.rol}</p>
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="right" align="end" className="w-52">
                                <div className="p-2 border-b border-border/50">
                                    <p className="text-sm font-semibold">{session?.user?.name}</p>
                                    <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                                </div>
                                {isPrivilegedUser && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/admin"><Settings className="mr-2 h-4 w-4" /> Configuracion</Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" /> Cerrar sesion
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </aside>

                {/* Main content area */}
                <div className="flex-1 flex flex-col min-w-0 min-h-screen">

                    {/* Top Header */}
                    <header className="sticky top-0 z-50 border-b border-border/50 shrink-0"
                        style={{ background: 'hsl(222 18% 8% / 0.95)', backdropFilter: 'blur(16px)' }}>
                        <div className="flex items-center gap-3 px-4 h-14">
                            {/* Mobile menu */}
                            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9"
                                onClick={() => setSidebarOpen(!sidebarOpen)}>
                                <Menu className="h-5 w-5" />
                            </Button>

                            {/* Mobile logo */}
                            <div className="flex items-center gap-2 lg:hidden">
                                <div className="w-7 h-7 rounded-lg gradient-gold flex items-center justify-center">
                                    <Building2 className="h-4 w-4 text-amber-900" />
                                </div>
                                <span className="font-bold gradient-text-gold text-sm">ATLAS GSE</span>
                            </div>

                            {/* Search */}
                            <div className="hidden md:flex relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Buscar candidatos, vacantes... (/)"
                                    value={globalSearch}
                                    onChange={(e) => setGlobalSearch(e.target.value)}
                                    className="pl-9 h-9 text-sm bg-muted/40 border-border/50 focus:border-amber-500/40 focus:bg-background"
                                />
                            </div>

                            <div className="flex-1" />

                            {/* Command palette */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex"
                                        onClick={() => setCommandPaletteOpen(true)}>
                                        <Command className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Paleta de comandos (Ctrl/Cmd + K)</TooltipContent>
                            </Tooltip>

                            {/* Notifications */}
                            <NotificationCenter />

                            {/* Theme toggle */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9"
                                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                        {mounted ? (theme === 'dark'
                                            ? <Sun className="h-4 w-4" />
                                            : <Moon className="h-4 w-4" />
                                        ) : <div className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cambiar tema</TooltipContent>
                            </Tooltip>

                            {/* User menu (header desktop) */}
                            <div className="hidden lg:block">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="gap-2 px-2 h-9">
                                            <Avatar className="h-7 w-7 border border-amber-500/20">
                                                <AvatarFallback className="bg-amber-500/10 text-amber-400 text-xs font-bold">
                                                    {userInitial}
                                                </AvatarFallback>
                                            </Avatar>
                                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                        <div className="p-2 border-b border-border/50">
                                            <p className="text-sm font-semibold">{session?.user?.name}</p>
                                            <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                                            <Badge variant="outline" className="mt-1 text-[10px] py-0 border-amber-500/30 text-amber-400">
                                                {session?.user?.rol}
                                            </Badge>
                                        </div>
                                        {isPrivilegedUser && (
                                            <DropdownMenuItem asChild>
                                                <Link href="/admin"><Settings className="mr-2 h-4 w-4" /> Configuracion</Link>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                                            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesion
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    {/* Page content */}
                    <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 overflow-x-hidden">
                        {children}
                    </main>

                    {/* Mobile bottom nav */}
                    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/50 lg:hidden"
                        style={{ background: 'hsl(222 18% 8% / 0.98)', backdropFilter: 'blur(16px)' }}>
                        <div className="grid grid-cols-5 gap-0 h-16">
                            {navItems.slice(0, 4).map(item => {
                                const Icon = item.icon
                                const isActive = isNavItemActive(item.href)
                                return (
                                    <Link key={item.id} href={item.href}
                                        className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${isActive ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}>
                                        <Icon className="h-5 w-5" />
                                        <span className="text-[10px] font-medium">{item.label}</span>
                                    </Link>
                                )
                            })}
                            <button
                                className="flex flex-col items-center justify-center gap-0.5 py-2 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setSidebarOpen(true)}>
                                <Menu className="h-5 w-5" />
                                <span className="text-[10px] font-medium">Mas</span>
                            </button>
                        </div>
                    </nav>
                </div>

                {/* Mobile sidebar sheet */}
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                    <SheetContent side="left" className="w-[280px] p-0"
                        style={{ background: 'hsl(222 18% 8.5%)' }}>
                        {/* Logo */}
                        <div className="flex items-center gap-3 px-4 py-5 border-b border-border/50">
                            <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center glow-gold-sm">
                                <Building2 className="h-4.5 w-4.5 text-amber-900" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold gradient-text-gold">ATLAS GSE</h1>
                                <p className="text-[10px] text-muted-foreground">Sistema de Reclutamiento</p>
                            </div>
                        </div>
                        {/* Quick action */}
                        <div className="px-3 py-3 border-b border-border/50">
                            <button
                                onClick={() => { setIsNewCandidatoDialogOpen(true); setSidebarOpen(false) }}
                                className="btn-gold w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold">
                                <Plus className="h-4 w-4" />
                                Nuevo Candidato
                            </button>
                        </div>
                        {/* Nav */}
                        <nav className="p-2 space-y-4 overflow-y-auto h-full pb-20">
                            {navGroups.map((group) => (
                                <div key={group.label}>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1">{group.label}</p>
                                    <div className="space-y-0.5">
                                        {group.items.map((item) => {
                                            const Icon = item.icon
                                            const isActive = isNavItemActive(item.href)
                                            return (
                                                <Link key={item.id} href={item.href}
                                                    onClick={() => setSidebarOpen(false)}
                                                    className={`sidebar-item ${isActive ? 'active' : ''}`}>
                                                    <Icon className="h-4 w-4 shrink-0" />
                                                    <span>{item.label}</span>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </SheetContent>
                </Sheet>

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
