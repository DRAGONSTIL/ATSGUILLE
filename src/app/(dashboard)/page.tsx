'use client'

import { useDashboardData } from '@/components/layout/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart,
} from 'recharts'
import { Users, UserCheck, Clock, Briefcase, Zap, Award, TrendingUp, BarChart3, PieChartIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const CHART_COLORS = ['#d4af37', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

const FUENTE_LABELS: Record<string, string> = {
    LINKEDIN: 'LinkedIn',
    OCC: 'OCC',
    COMPUTRABAJA: 'Computrabajo',
    COMPUTRABAJO: 'Computrabajo',
    REFERIDO: 'Referido',
    AGENCIA: 'Agencia',
    FERIA_EMPLEO: 'Feria de empleo',
    UNIVERSIDAD: 'Universidad',
    RED_SOCIAL: 'Red social',
    INDEED: 'Indeed',
    OTRO: 'Otra',
}

export default function DashboardPage() {
    const { candidatos, vacantes, actividadReciente, loading } = useDashboardData()

    if (loading) {
        return <div className="animate-pulse space-y-4">Cargando métricas...</div>
    }

    // Stats calculations
    const stats = {
        total: candidatos.length,
        contratados: candidatos.filter((c: any) => c.estatus === 'CONTRATADO').length,
        enProceso: candidatos.filter((c: any) => c.estatus === 'EN_PROCESO' || c.estatus === 'ENTREVISTA').length,
        rechazados: candidatos.filter((c: any) => c.estatus === 'RECHAZADO').length,
        entrevistas: candidatos.filter((c: any) => c.estatus === 'ENTREVISTA').length,
    }

    // A) Time to hire
    const candidatosContratados = candidatos.filter((c: any) => c.estatus === 'CONTRATADO')
    let avgTimeToHire = 0
    if (candidatosContratados.length > 0) {
        const diasTotales = candidatosContratados.reduce((acc: number, c: any) => {
            return acc + differenceInDays(new Date(), new Date(c.createdAt))
        }, 0)
        avgTimeToHire = Math.round(diasTotales / candidatosContratados.length)
    }

    // B) Trend data
    const hoy = new Date()
    const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
        const fecha = subDays(hoy, 6 - i)
        return { fecha, nombre: format(fecha, 'EEE', { locale: es }) }
    })
    const trendData = ultimos7Dias.map((dia) => {
        const candidatosDia = candidatos.filter((c: any) => {
            const fechaCandidato = new Date(c.createdAt)
            return (
                fechaCandidato.getDate() === dia.fecha.getDate() &&
                fechaCandidato.getMonth() === dia.fecha.getMonth() &&
                fechaCandidato.getFullYear() === dia.fecha.getFullYear()
            )
        })
        return {
            name: dia.nombre,
            candidatos: candidatosDia.length,
            contrataciones: candidatosDia.filter((c: any) => c.estatus === 'CONTRATADO').length,
        }
    })

    // C) Comparación mes actual vs mes anterior
    const mesActualStart = startOfMonth(hoy)
    const mesAnteriorStart = startOfMonth(subDays(mesActualStart, 1))
    const mesAnteriorEnd = endOfMonth(mesAnteriorStart)

    const candidatosMesActual = candidatos.filter((c: any) => new Date(c.createdAt) >= mesActualStart).length
    const candidatosMesAnterior = candidatos.filter((c: any) => {
        const fecha = new Date(c.createdAt)
        return fecha >= mesAnteriorStart && fecha <= mesAnteriorEnd
    }).length

    let porcentajeCambio: number | null = null
    if (candidatosMesAnterior > 0) {
        porcentajeCambio = ((candidatosMesActual - candidatosMesAnterior) / candidatosMesAnterior) * 100
    }

    // E) Calidad promedio
    const candidatosConRating = candidatos.filter((c: any) => c.rating !== null && c.rating !== undefined)
    let calidadPromedio = 'N/A'
    if (candidatosConRating.length > 0) {
        const promedio = candidatosConRating.reduce((acc: number, c: any) => acc + (c.rating || 0), 0) / candidatosConRating.length
        calidadPromedio = `${promedio.toFixed(1)}/5`
    }

    // F) Tasa de Conversión
    const tasaConversion = stats.total > 0 ? ((stats.contratados / stats.total) * 100).toFixed(1) : '0'

    // Chart data - Embudo
    const embudoData = [
        { name: 'Registrados', value: candidatos.filter((c: any) => c.estatus === 'REGISTRADO').length, fill: CHART_COLORS[0] },
        { name: 'En Proceso', value: candidatos.filter((c: any) => c.estatus === 'EN_PROCESO').length, fill: CHART_COLORS[1] },
        { name: 'Entrevista', value: candidatos.filter((c: any) => c.estatus === 'ENTREVISTA').length, fill: CHART_COLORS[2] },
        { name: 'Contratados', value: candidatos.filter((c: any) => c.estatus === 'CONTRATADO').length, fill: CHART_COLORS[3] },
        { name: 'Rechazados', value: candidatos.filter((c: any) => c.estatus === 'RECHAZADO').length, fill: CHART_COLORS[4] },
    ].filter((d) => d.value > 0)

    // Chart data - Por fuente
    const fuenteData = Object.entries(
        candidatos.reduce((acc: any, c: any) => {
            acc[c.fuente] = (acc[c.fuente] || 0) + 1
            return acc
        }, {})
    ).map(([name, value], i) => ({ name: FUENTE_LABELS[name] || name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }))

    // Chart data - Vacantes (top 5)
    const vacanteCount = candidatos.reduce((acc: any, c: any) => {
        if (c.vacante?.titulo) {
            acc[c.vacante.titulo] = (acc[c.vacante.titulo] || 0) + 1
        } else {
            acc['Sin asignar'] = (acc['Sin asignar'] || 0) + 1
        }
        return acc
    }, {})

    const vacanteData = Object.entries(vacanteCount)
        .map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 5)

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid gap-3 md:grid-cols-3">
                <Card className="hover:shadow-sm transition-shadow"><CardContent className="pt-5"><p className="text-sm font-semibold tracking-tight">Acciones de hoy</p><p className="text-sm text-muted-foreground">Revisar entrevistas pendientes y estatus en pipeline.</p></CardContent></Card>
                <Card className="hover:shadow-sm transition-shadow"><CardContent className="pt-5"><p className="text-sm font-semibold tracking-tight">Candidatos nuevos</p><p className="text-sm text-muted-foreground">{stats.total} registrados en el periodo actual.</p></CardContent></Card>
                <Card className="hover:shadow-sm transition-shadow"><CardContent className="pt-5"><p className="text-sm font-semibold tracking-tight">Conversión</p><p className="text-sm text-muted-foreground">{tasaConversion}% de contratación.</p></CardContent></Card>
            </div>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Candidatos
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.total}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            {porcentajeCambio !== null ? (
                                <>
                                    {porcentajeCambio >= 0 ? (
                                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                                    )}
                                    <span className={porcentajeCambio >= 0 ? 'text-green-500' : 'text-red-500'}>
                                        {porcentajeCambio >= 0 ? '+' : ''}{porcentajeCambio.toFixed(0)}%
                                    </span>
                                    <span>vs mes anterior</span>
                                </>
                            ) : (
                                <span className="text-muted-foreground">Sin datos previos</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Contrataciones
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <UserCheck className="h-5 w-5 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-500">{stats.contratados}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.total > 0 ? ((stats.contratados / stats.total) * 100).toFixed(1) : 0}% tasa de conversión
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            En Proceso
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-amber-500">{stats.enProceso}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.entrevistas} en entrevista
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Vacantes Activas
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Briefcase className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {vacantes.filter((v: any) => v.estatus === 'PUBLICADA').length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            de {vacantes.length} totales
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-violet-500/10">
                                <Zap className="h-6 w-6 text-violet-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Time to Hire</p>
                                <p className="text-2xl font-bold">{avgTimeToHire} días</p>
                                <p className="text-xs text-muted-foreground">
                                    {avgTimeToHire > 0 ? 'Promedio de contratación' : 'Sin datos suficientes'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-cyan-500/10">
                                <Award className="h-6 w-6 text-cyan-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Calidad Promedio</p>
                                <p className="text-2xl font-bold">{calidadPromedio}</p>
                                <p className="text-xs text-muted-foreground">Rating de candidatos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-pink-500/10">
                                <TrendingUp className="h-6 w-6 text-pink-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tasa de Conversión</p>
                                <p className="text-2xl font-bold">{tasaConversion}%</p>
                                <p className="text-xs text-muted-foreground">Contratados / Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Embudo */}
                <Card className="col-span-1">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Embudo de Reclutamiento
                                </CardTitle>
                                <CardDescription>Distribución por etapa del proceso</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {embudoData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={embudoData} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                                    <YAxis type="category" dataKey="name" width={110} stroke="hsl(var(--muted-foreground))" />
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '10px',
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                                        {embudoData.map((entry, index) => (
                                            <Cell key={`embudo-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No hay datos para mostrar
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Por Fuente */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5" />
                            Fuentes de Candidatos
                        </CardTitle>
                        <CardDescription>Origen de los candidatos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {fuenteData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={fuenteData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={52}
                                        outerRadius={96}
                                        labelLine={false}
                                    >
                                        {fuenteData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No hay datos para mostrar
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Vacantes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Vacantes por Candidatos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {vacanteData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={vacanteData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        stroke="hsl(var(--muted-foreground))"
                                        width={150}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {vacanteData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-muted-foreground">
                                No hay vacantes con candidatos
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tendencia Semanal</CardTitle>
                        <CardDescription>Candidatos y contrataciones por día</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                                <YAxis stroke="hsl(var(--muted-foreground))" />
                                <RechartsTooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="candidatos"
                                    stackId="1"
                                    stroke={CHART_COLORS[1]}
                                    fill={CHART_COLORS[1]}
                                    fillOpacity={0.25}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="contrataciones"
                                    stackId="2"
                                    stroke={CHART_COLORS[0]}
                                    fill={CHART_COLORS[0]}
                                    fillOpacity={0.45}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Actividad Reciente */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        Actividad Reciente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {actividadReciente.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No hay actividad reciente
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {actividadReciente.map((act: any) => (
                                <div key={act.id} className="flex gap-3 items-start">
                                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{act.descripcion}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {act.usuario?.name || 'Sistema'} · {' '}
                                            {format(new Date(act.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
