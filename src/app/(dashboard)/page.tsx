'use client'

import { useDashboardData } from '@/components/layout/dashboard-context'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts'
import {
    Users, UserCheck, Clock, Briefcase, Zap, Award, TrendingUp, BarChart3,
    PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Activity, Sparkles
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const CHART_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316']
const GOLD = '#F59E0B'

const FUENTE_LABELS: Record<string, string> = {
    LINKEDIN: 'LinkedIn', OCC: 'OCC', COMPUTRABAJA: 'Computrabajo', COMPUTRABAJO: 'Computrabajo',
    REFERIDO: 'Referido', AGENCIA: 'Agencia', FERIA_EMPLEO: 'Feria', UNIVERSIDAD: 'Universidad',
    RED_SOCIAL: 'Red Social', INDEED: 'Indeed', OTRO: 'Otra',
}

const tooltipStyle = {
    contentStyle: {
        backgroundColor: 'hsl(222 18% 11%)',
        border: '1px solid hsl(222 14% 18%)',
        borderRadius: '12px',
        boxShadow: '0 20px 40px hsl(0 0% 0% / 0.5)',
        color: 'hsl(210 20% 95%)',
        fontSize: '13px',
    },
    labelStyle: { color: 'hsl(43 96% 56%)', fontWeight: 600 },
}

function StatCard({ title, value, icon: Icon, color, badge, sub, trend }: any) {
    return (
        <div className="luxury-card p-5 relative overflow-hidden group cursor-pointer">
            {/* Glow bg */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${color}`} />
            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`} style={{ background: `${color}15` }}>
                        <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {trend >= 0 ? '+' : ''}{trend.toFixed(0)}%
                        </div>
                    )}
                </div>
                <p className="stat-number text-foreground">{value}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{title}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

function SecondaryCard({ title, value, sub, icon: Icon, color }: any) {
    return (
        <div className="luxury-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl shrink-0" style={{ background: `${color}15` }}>
                <Icon className="h-6 w-6" style={{ color }} />
            </div>
            <div>
                <p className="text-xs text-muted-foreground font-medium">{title}</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const { candidatos, vacantes, actividadReciente, loading } = useDashboardData()

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Skeleton KPI row */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="luxury-card p-5 h-32 skeleton" />
                    ))}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="luxury-card p-5 h-20 skeleton" />
                    ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="luxury-card p-5 h-72 skeleton" />
                    ))}
                </div>
            </div>
        )
    }

    // ── Metrics ──────────────────────────────────────────────
    const stats = {
        total: candidatos.length,
        contratados: candidatos.filter((c: any) => c.estatus === 'CONTRATADO').length,
        enProceso: candidatos.filter((c: any) => c.estatus === 'EN_PROCESO' || c.estatus === 'ENTREVISTA').length,
        entrevistas: candidatos.filter((c: any) => c.estatus === 'ENTREVISTA').length,
        rechazados: candidatos.filter((c: any) => c.estatus === 'RECHAZADO').length,
    }

    const candidatosContratados = candidatos.filter((c: any) => c.estatus === 'CONTRATADO')
    const avgTimeToHire = candidatosContratados.length > 0
        ? Math.round(candidatosContratados.reduce((acc: number, c: any) =>
            acc + differenceInDays(new Date(), new Date(c.createdAt)), 0) / candidatosContratados.length)
        : 0

    const hoy = new Date()
    const mesActualStart = startOfMonth(hoy)
    const mesAnteriorStart = startOfMonth(subDays(mesActualStart, 1))
    const mesAnteriorEnd = endOfMonth(mesAnteriorStart)
    const candidatosMesActual = candidatos.filter((c: any) => new Date(c.createdAt) >= mesActualStart).length
    const candidatosMesAnterior = candidatos.filter((c: any) => {
        const f = new Date(c.createdAt); return f >= mesAnteriorStart && f <= mesAnteriorEnd
    }).length
    const porcentajeCambio = candidatosMesAnterior > 0
        ? ((candidatosMesActual - candidatosMesAnterior) / candidatosMesAnterior) * 100
        : null

    const candidatosConRating = candidatos.filter((c: any) => c.rating !== null && c.rating !== undefined)
    const calidadPromedio = candidatosConRating.length > 0
        ? (candidatosConRating.reduce((a: number, c: any) => a + (c.rating || 0), 0) / candidatosConRating.length).toFixed(1)
        : 'N/A'

    const tasaConversion = stats.total > 0 ? ((stats.contratados / stats.total) * 100).toFixed(1) : '0'

    // ── Chart data ───────────────────────────────────────────
    const embudoData = [
        { name: 'Registrados', value: candidatos.filter((c: any) => c.estatus === 'REGISTRADO').length, fill: '#94A3B8' },
        { name: 'En Proceso', value: candidatos.filter((c: any) => c.estatus === 'EN_PROCESO').length, fill: '#F59E0B' },
        { name: 'Entrevista', value: candidatos.filter((c: any) => c.estatus === 'ENTREVISTA').length, fill: '#3B82F6' },
        { name: 'Contratados', value: candidatos.filter((c: any) => c.estatus === 'CONTRATADO').length, fill: '#10B981' },
        { name: 'Rechazados', value: candidatos.filter((c: any) => c.estatus === 'RECHAZADO').length, fill: '#EF4444' },
    ].filter(d => d.value > 0)

    const fuenteData = Object.entries(
        candidatos.reduce((acc: any, c: any) => { acc[c.fuente] = (acc[c.fuente] || 0) + 1; return acc }, {})
    ).map(([name, value], i) => ({ name: FUENTE_LABELS[name] || name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }))

    const vacanteCount = candidatos.reduce((acc: any, c: any) => {
        const key = c.vacante?.titulo || 'Sin asignar'; acc[key] = (acc[key] || 0) + 1; return acc
    }, {})
    const vacanteData = Object.entries(vacanteCount)
        .map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }))
        .sort((a: any, b: any) => b.value - a.value).slice(0, 5)

    const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
        const fecha = subDays(hoy, 6 - i)
        return { fecha, nombre: format(fecha, 'EEE', { locale: es }) }
    })
    const trendData = ultimos7Dias.map((dia) => {
        const d = candidatos.filter((c: any) => {
            const f = new Date(c.createdAt)
            return f.getDate() === dia.fecha.getDate() && f.getMonth() === dia.fecha.getMonth() && f.getFullYear() === dia.fecha.getFullYear()
        })
        return { name: dia.nombre, candidatos: d.length, contrataciones: d.filter((c: any) => c.estatus === 'CONTRATADO').length }
    })

    return (
        <div className="space-y-6 stagger">

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Panel Principal</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {format(hoy, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Sistema en línea
                </div>
            </div>

            {/* Primary KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Candidatos" value={stats.total} icon={Users} color="#F59E0B"
                    trend={porcentajeCambio} sub={porcentajeCambio !== null ? 'vs mes anterior' : 'Sin datos previos'} />
                <StatCard title="Contrataciones" value={stats.contratados} icon={UserCheck} color="#10B981"
                    sub={`${tasaConversion}% tasa de conversión`} />
                <StatCard title="En Proceso" value={stats.enProceso} icon={Clock} color="#F59E0B"
                    sub={`${stats.entrevistas} en entrevista`} />
                <StatCard title="Vacantes Activas" value={vacantes.filter((v: any) => v.estatus === 'PUBLICADA').length}
                    icon={Briefcase} color="#3B82F6" sub={`de ${vacantes.length} totales`} />
            </div>

            {/* Secondary KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <SecondaryCard title="Time to Hire" value={avgTimeToHire > 0 ? `${avgTimeToHire} días` : 'N/A'}
                    sub={avgTimeToHire > 0 ? 'Promedio de contratación' : 'Sin datos suficientes'}
                    icon={Zap} color="#8B5CF6" />
                <SecondaryCard title="Calidad Promedio" value={calidadPromedio !== 'N/A' ? `${calidadPromedio}/5` : 'N/A'}
                    sub="Rating promedio de candidatos" icon={Award} color="#06B6D4" />
                <SecondaryCard title="Tasa de Conversión" value={`${tasaConversion}%`}
                    sub="Contratados / Total" icon={TrendingUp} color="#EC4899" />
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-6 lg:grid-cols-2">

                {/* Funnel */}
                <div className="luxury-card p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <BarChart3 className="h-4 w-4 text-amber-400" />
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Embudo de Reclutamiento</h3>
                            <p className="text-xs text-muted-foreground">Distribución por etapa del proceso</p>
                        </div>
                    </div>
                    {embudoData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={embudoData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 14% 16%)" horizontal={false} />
                                <XAxis type="number" stroke="hsl(220 10% 40%)" tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={90} stroke="hsl(220 10% 40%)" tick={{ fontSize: 11 }} />
                                <RechartsTooltip {...tooltipStyle} />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                    {embudoData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                            Sin datos para mostrar
                        </div>
                    )}
                </div>

                {/* Sources */}
                <div className="luxury-card p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <PieChartIcon className="h-4 w-4 text-amber-400" />
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Fuentes de Candidatos</h3>
                            <p className="text-xs text-muted-foreground">Origen de los candidatos registrados</p>
                        </div>
                    </div>
                    {fuenteData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={fuenteData} dataKey="value" nameKey="name"
                                    cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                                    {fuenteData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Pie>
                                <RechartsTooltip {...tooltipStyle} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: 8 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                            Sin datos para mostrar
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-6 lg:grid-cols-2">

                {/* Top Vacantes */}
                <div className="luxury-card p-5">
                    <div className="mb-5">
                        <h3 className="text-sm font-bold text-foreground">Top Vacantes por Candidatos</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Las 5 vacantes con más candidatos</p>
                    </div>
                    {vacanteData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={vacanteData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 14% 16%)" horizontal={false} />
                                <XAxis type="number" stroke="hsl(220 10% 40%)" tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={120} stroke="hsl(220 10% 40%)" tick={{ fontSize: 11 }} />
                                <RechartsTooltip {...tooltipStyle} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                    {vacanteData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                            Sin vacantes con candidatos
                        </div>
                    )}
                </div>

                {/* Weekly Trend */}
                <div className="luxury-card p-5">
                    <div className="mb-5">
                        <h3 className="text-sm font-bold text-foreground">Tendencia Semanal</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Candidatos y contrataciones por día</p>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={trendData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradCandidatos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradContrataciones" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 14% 16%)" />
                            <XAxis dataKey="name" stroke="hsl(220 10% 40%)" tick={{ fontSize: 11 }} />
                            <YAxis stroke="hsl(220 10% 40%)" tick={{ fontSize: 11 }} />
                            <RechartsTooltip {...tooltipStyle} />
                            <Area type="monotone" dataKey="candidatos" stroke="#3B82F6" strokeWidth={2} fill="url(#gradCandidatos)" name="Candidatos" />
                            <Area type="monotone" dataKey="contrataciones" stroke="#F59E0B" strokeWidth={2} fill="url(#gradContrataciones)" name="Contrataciones" />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: 8 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="luxury-card p-5">
                <div className="flex items-center gap-2 mb-5">
                    <Activity className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-foreground">Actividad Reciente</h3>
                </div>
                {actividadReciente.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin actividad reciente</p>
                ) : (
                    <div className="space-y-1">
                        {actividadReciente.map((act: any, i: number) => (
                            <div key={act.id} className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-muted/30 transition-colors group">
                                <div className="mt-1.5 shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 group-hover:bg-amber-400 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate">{act.descripcion}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {act.usuario?.name || 'Sistema'} · {format(new Date(act.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
