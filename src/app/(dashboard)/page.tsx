'use client'

import { type ReactNode, useDeferredValue, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { format, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  BriefcaseBusiness,
  CalendarRange,
  Clock3,
  GitBranch,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type DashboardResponse = {
  generatedAt: string
  range: {
    preset: 'day' | 'week' | 'month' | 'year' | 'custom'
    from: string
    to: string
    label: string
    granularity: 'day' | 'week' | 'month'
  }
  filterOptions: {
    recruiters: Array<{ id: string; name: string }>
    teams: Array<{ id: string; name: string }>
    branches: Array<{ value: string; label: string }>
  }
  summary: {
    pipelineEntries: { value: number; previous: number; change: number }
    hires: { value: number; previous: number; change: number }
    interviewsCompleted: { value: number; previous: number; change: number }
    offersSent: { value: number; previous: number; change: number }
    timeToHireDays: { value: number | null; previous: number | null; change: number }
    openPositions: { openRoles: number; openSeats: number }
    conversionRate: { value: number; previous: number; change: number }
    rejectionRate: { value: number }
    appsPerHire: { value: number | null }
    costPerHire: { value: number | null }
    daysInMarket: { value: number | null }
  }
  charts: {
    trend: Array<{ key: string; label: string; candidates: number; interviews: number; hires: number; offers: number }>
    sourcePerformance: Array<{ source: string; candidates: number; hires: number; conversionRate: number }>
    recruiterPerformance: Array<{ id: string; name: string; candidates: number; hires: number; interviews: number; conversionRate: number; avgTimeToHire: number | null }>
    teamPerformance: Array<{ id: string; name: string; candidates: number; hires: number; interviews: number; conversionRate: number }>
    branchPerformance: Array<{ branch: string; candidates: number; hires: number; openPositions: number; conversionRate: number }>
  }
  dashboard: {
    activePipeline: {
      totalPending: number
      stages: Array<{ key: string; label: string; count: number; color: string }>
    }
    executiveSnapshot: {
      totalApplicants: number
      shortlistedCandidates: number
      hiredCandidates: number
      rejectedCandidates: number
      timeToHireDays: number | null
      costToHire: number | null
      offerAcceptanceRatio: number | null
      offersAccepted: number
      offersProvided: number
      applicationDetails: Array<{
        id: string
        name: string
        email: string
        jobTitle: string
        appliedDate: string
        status: string
      }>
    }
  }
  tables: {
    vacancyPipeline: Array<{
      id: string
      title: string
      branch: string
      recruiter: string
      status: string
      openSeats: number
      candidates: number
      interviews: number
      offers: number
      hires: number
    }>
  }
  recentActivity: Array<{
    id: string
    descripcion: string
    tipo: string
    createdAt: string
    usuario?: { id: string; name: string | null } | null
  }>
}

const SOURCE_LABELS: Record<string, string> = {
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
  OTRO: 'Otra fuente',
}

const STATUS_LABELS: Record<string, string> = {
  REGISTRADO: 'Registrado',
  EN_PROCESO: 'En proceso',
  ENTREVISTA: 'Entrevista',
  CONTRATADO: 'Contratado',
  RECHAZADO: 'Rechazado',
}

const STATUS_BADGE: Record<string, string> = {
  REGISTRADO: 'border-slate-500/20 bg-slate-500/10 text-slate-200',
  EN_PROCESO: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  ENTREVISTA: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  CONTRATADO: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  RECHAZADO: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
}

const PIPELINE_COLORS = ['#76a7ff', '#50c8b8', '#d9c089', '#ff8a65', '#c084fc']

function formatMetricNumber(value: number | null, digits = 0) {
  if (value === null) return '--'
  return value.toLocaleString('es-MX', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatMetricPercent(value: number | null) {
  if (value === null) return '--'
  return `${formatMetricNumber(value, 1)}%`
}

function formatMetricCurrency(value: number | null) {
  if (value === null) return '--'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatChange(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function changeTone(value: number) {
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-rose-300'
  return 'text-slate-300'
}

function cardSurface(className?: string) {
  return cn(
    'rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,22,34,0.96),rgba(10,15,24,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.28)]',
    className
  )
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cardSurface(className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-white/56">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  change,
}: {
  icon: typeof Users
  label: string
  value: string
  detail: string
  change?: number
}) {
  return (
    <article className={cardSurface('p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Icon className="h-5 w-5 text-amber-300" />
        </div>
        {typeof change === 'number' ? (
          <span className={cn('text-xs font-medium', changeTone(change))}>{formatChange(change)}</span>
        ) : null}
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-2 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-2 text-sm text-white/58">{detail}</p>
    </article>
  )
}

function SelectField({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  allLabel: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex h-[14rem] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-white/46">{message}</div>
}

export default function DashboardPage() {
  const [preset, setPreset] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month')
  const [customRange, setCustomRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date() })
  const [recruiterId, setRecruiterId] = useState('all')
  const [teamId, setTeamId] = useState('all')
  const [branch, setBranch] = useState('all')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('preset', preset)

    if (preset === 'custom' && customRange?.from && customRange?.to) {
      params.set('from', format(customRange.from, 'yyyy-MM-dd'))
      params.set('to', format(customRange.to, 'yyyy-MM-dd'))
    }

    if (recruiterId !== 'all') params.set('recruiterId', recruiterId)
    if (teamId !== 'all') params.set('teamId', teamId)
    if (branch !== 'all') params.set('branch', branch)

    return params.toString()
  }, [branch, customRange, preset, recruiterId, teamId])

  const deferredQuery = useDeferredValue(queryString)
  const { data, isLoading, isFetching, isError, refetch } = useQuery<DashboardResponse>({
    queryKey: ['dashboard-analytics', deferredQuery],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/analytics?${deferredQuery}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('analytics_error')
      return response.json()
    },
    placeholderData: (previous) => previous,
    staleTime: 0,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  if (isLoading && !data) {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="h-[16rem] rounded-[1.5rem] skeleton" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-[7.5rem] rounded-[1.5rem] skeleton" />
          <div className="h-[7.5rem] rounded-[1.5rem] skeleton" />
          <div className="h-[7.5rem] rounded-[1.5rem] skeleton sm:col-span-2" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-[1.25rem] border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-100">
        No fue posible cargar el dashboard.
      </div>
    )
  }

  const summary = data.summary
  const snapshot = data.dashboard.executiveSnapshot
  const trend = data.charts.trend
  const recruiterPerformance = data.charts.recruiterPerformance.slice(0, 5)
  const teamPerformance = data.charts.teamPerformance.slice(0, 5)
  const sourcePerformance = data.charts.sourcePerformance.slice(0, 5)
  const branchPerformance = data.charts.branchPerformance.slice(0, 4)
  const pipelineStages = data.dashboard.activePipeline.stages
  const pipelineTotal = Math.max(1, data.dashboard.activePipeline.totalPending)
  const generatedAt = format(new Date(data.generatedAt), 'HH:mm:ss', { locale: es })

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(118,167,255,0.16),transparent_28%),radial-gradient(circle_at_0%_0%,rgba(217,192,137,0.14),transparent_22%),linear-gradient(180deg,rgba(10,16,26,0.98),rgba(7,10,17,0.98))] shadow-[0_32px_100px_rgba(0,0,0,0.32)]">
        <div className="grid gap-6 px-5 py-5 lg:grid-cols-[1.25fr_0.95fr] lg:px-6 lg:py-6">
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] text-amber-200">Dashboard operativo</Badge>
                <Badge className="border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/64">{data.range.label}</Badge>
                <Badge className="border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/64">Actualizado {generatedAt}</Badge>
              </div>
              <div>
                <h1 className="text-[clamp(2rem,4vw,3.1rem)] font-semibold leading-none tracking-[-0.05em] text-white">
                  Dashboard de reclutamiento
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
                  Vista limpia para seguir volumen, conversion, tiempos y cargas del pipeline sin mezclar metricas bonitas con datos inutiles.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="Periodo"
                value={preset}
                onChange={(value) => setPreset(value as typeof preset)}
                allLabel="Mes actual"
                options={[
                  { value: 'day', label: 'Dia actual' },
                  { value: 'week', label: 'Semana actual' },
                  { value: 'month', label: 'Mes actual' },
                  { value: 'year', label: 'Ano actual' },
                  { value: 'custom', label: 'Periodo custom' },
                ]}
              />
              <SelectField
                label="Reclutador"
                value={recruiterId}
                onChange={setRecruiterId}
                allLabel="Todos"
                options={data.filterOptions.recruiters.map((item) => ({ value: item.id, label: item.name }))}
              />
              <SelectField
                label="Equipo"
                value={teamId}
                onChange={setTeamId}
                allLabel="Todos"
                options={data.filterOptions.teams.map((item) => ({ value: item.id, label: item.name }))}
              />
              <SelectField
                label="Sucursal"
                value={branch}
                onChange={setBranch}
                allLabel="Todas"
                options={data.filterOptions.branches}
              />
            </div>
          </div>

          <div className="grid gap-3 self-start sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.16em] text-white/44">Rango custom</p>
                <CalendarRange className="h-4 w-4 text-amber-300" />
              </div>
              <p className="mt-3 text-lg font-medium text-white">
                {customRange?.from ? format(customRange.from, 'dd MMM yyyy', { locale: es }) : '--'}
                {' - '}
                {customRange?.to ? format(customRange.to, 'dd MMM yyyy', { locale: es }) : '--'}
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mt-4 h-10 w-full rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
                    Ajustar fechas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-white/10 bg-[#0b1018] p-0 text-white" align="end">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={(rangeValue) => {
                      setCustomRange(rangeValue)
                      if (rangeValue?.from && rangeValue?.to) setPreset('custom')
                    }}
                    numberOfMonths={2}
                    defaultMonth={customRange?.from}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.16em] text-white/44">Estado</p>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-sky-300" /> : <RefreshCw className="h-4 w-4 text-white/40" />}
              </div>
              <p className="mt-3 text-lg font-medium text-white">{isFetching ? 'Sincronizando datos' : 'Datos al dia'}</p>
              <p className="mt-2 text-sm text-white/58">
                Auto refresh cada 10 segundos con refetch manual disponible.
              </p>
              <Button variant="outline" className="mt-4 h-10 w-full rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]" onClick={() => refetch()}>
                Refrescar ahora
              </Button>
            </div>

            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 sm:col-span-2">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/44">Capacidad abierta</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{summary.openPositions.openSeats}</p>
                  <p className="text-sm text-white/58">{summary.openPositions.openRoles} vacantes publicadas</p>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/44">Aceptacion de oferta</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{formatMetricPercent(snapshot.offerAcceptanceRatio)}</p>
                  <p className="text-sm text-white/58">{snapshot.offersAccepted} aceptadas de {snapshot.offersProvided}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Aplicaciones" value={formatMetricNumber(summary.pipelineEntries.value)} detail={`${snapshot.shortlistedCandidates} en pipeline activo`} change={summary.pipelineEntries.change} />
        <StatCard icon={TrendingUp} label="Contrataciones" value={formatMetricNumber(summary.hires.value)} detail={`${formatMetricPercent(summary.conversionRate.value)} de conversion`} change={summary.hires.change} />
        <StatCard icon={Activity} label="Entrevistas" value={formatMetricNumber(summary.interviewsCompleted.value)} detail={`${formatMetricNumber(summary.offersSent.value)} ofertas enviadas`} change={summary.interviewsCompleted.change} />
        <StatCard icon={Clock3} label="Tiempo medio" value={summary.timeToHireDays.value === null ? '--' : `${formatMetricNumber(summary.timeToHireDays.value, 1)} d`} detail={`Costo por alta ${formatMetricCurrency(summary.costPerHire.value)}`} change={summary.timeToHireDays.change} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <SectionCard title="Tendencia del periodo" subtitle="Entradas, entrevistas y contrataciones dentro del rango seleccionado.">
          {trend.length === 0 ? (
            <EmptyState message="No hay movimiento para este rango." />
          ) : (
            <div className="h-[18rem]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="trendCandidates" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#76a7ff" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#76a7ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="trendHires" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d9c089" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#d9c089" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} fontSize={11} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0d121d',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '14px',
                      color: '#f8fafc',
                    }}
                  />
                  <Area type="monotone" dataKey="candidates" stroke="#76a7ff" strokeWidth={2.4} fill="url(#trendCandidates)" name="Aplicaciones" />
                  <Area type="monotone" dataKey="interviews" stroke="#50c8b8" strokeWidth={2.1} fillOpacity={0} name="Entrevistas" />
                  <Area type="monotone" dataKey="hires" stroke="#d9c089" strokeWidth={2.1} fill="url(#trendHires)" name="Contrataciones" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Pipeline activo" subtitle="Distribucion de candidatos pendientes por etapa.">
          {pipelineStages.every((stage) => stage.count === 0) ? (
            <EmptyState message="No hay candidatos activos en este momento." />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/44">Pendientes</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{data.dashboard.activePipeline.totalPending}</p>
                  <p className="mt-1 text-sm text-white/56">Candidatos sin cierre final.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/44">Apps por alta</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{formatMetricNumber(summary.appsPerHire.value, 1)}</p>
                  <p className="mt-1 text-sm text-white/56">Carga media necesaria para cerrar una posicion.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/44">Rechazo</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{formatMetricPercent(summary.rejectionRate.value)}</p>
                  <p className="mt-1 text-sm text-white/56">{snapshot.rejectedCandidates} candidatos rechazados en el periodo.</p>
                </div>
              </div>

              <div className="space-y-3">
                {pipelineStages.map((stage) => (
                  <div key={stage.key} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 text-white/78">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span>{stage.label}</span>
                      </div>
                      <span className="text-white/58">{stage.count} | {Math.round((stage.count / pipelineTotal) * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/6">
                      <div className="h-full rounded-full" style={{ width: `${(stage.count / pipelineTotal) * 100}%`, backgroundColor: stage.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
        <SectionCard title="Fuentes que convierten" subtitle="Volumen y eficiencia por canal.">
          {sourcePerformance.length === 0 ? (
            <EmptyState message="Sin fuentes para mostrar en el periodo." />
          ) : (
            <div className="space-y-3">
              {sourcePerformance.map((item, index) => (
                <div key={item.source} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold text-slate-950" style={{ backgroundColor: PIPELINE_COLORS[index % PIPELINE_COLORS.length] }}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">{SOURCE_LABELS[item.source] || item.source}</p>
                        <p className="text-xs text-white/52">{item.candidates} aplicaciones</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{formatMetricPercent(item.conversionRate)}</p>
                      <p className="text-xs text-white/52">{item.hires} contrataciones</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Reclutadores" subtitle="Ranking corto por volumen y conversion.">
          {recruiterPerformance.length === 0 ? (
            <EmptyState message="No hay actividad por reclutador en este rango." />
          ) : (
            <div className="space-y-3">
              {recruiterPerformance.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{item.name}</p>
                      <p className="text-xs text-white/52">{item.candidates} candidatos | {item.interviews} entrevistas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{formatMetricPercent(item.conversionRate)}</p>
                      <p className="text-xs text-white/52">
                        {item.avgTimeToHire === null ? '--' : `${formatMetricNumber(item.avgTimeToHire, 1)} d`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Equipos y sucursales" subtitle="Carga operativa donde esta pegando el pipeline.">
          {teamPerformance.length === 0 && branchPerformance.length === 0 ? (
            <EmptyState message="Todavia no hay distribucion operativa suficiente." />
          ) : (
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-white/44">Equipos</p>
                <div className="space-y-2">
                  {teamPerformance.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                      <div>
                        <p className="text-sm text-white">{item.name}</p>
                        <p className="text-xs text-white/52">{item.candidates} candidatos | {item.interviews} entrevistas</p>
                      </div>
                      <span className="text-sm font-medium text-white">{item.hires}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-white/44">Sucursales</p>
                <div className="space-y-2">
                  {branchPerformance.map((item) => (
                    <div key={item.branch} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                      <div>
                        <p className="text-sm text-white">{item.branch}</p>
                        <p className="text-xs text-white/52">{item.candidates} candidatos | {item.openPositions} posiciones abiertas</p>
                      </div>
                      <span className="text-sm font-medium text-white">{formatMetricPercent(item.conversionRate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Vacantes con mas movimiento" subtitle="Top 8 por hires y volumen de pipeline.">
          {data.tables.vacancyPipeline.length === 0 ? (
            <EmptyState message="No hay vacantes activas o historicas para este filtro." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8 hover:bg-transparent">
                    <TableHead className="text-white/56">Vacante</TableHead>
                    <TableHead className="text-white/56">Sucursal</TableHead>
                    <TableHead className="text-white/56">Pipeline</TableHead>
                    <TableHead className="text-white/56">Ofertas</TableHead>
                    <TableHead className="text-white/56">Hires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tables.vacancyPipeline.map((item) => (
                    <TableRow key={item.id} className="border-white/8 hover:bg-white/[0.03]">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{item.title}</p>
                          <p className="text-xs text-white/50">{item.recruiter}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/68">{item.branch}</TableCell>
                      <TableCell className="text-white/68">{item.candidates} cand. | {item.interviews} ent.</TableCell>
                      <TableCell className="text-white/68">{item.offers}</TableCell>
                      <TableCell className="text-white">{item.hires}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Distribucion de resultados" subtitle="Aplicaciones, shortlist, hires y rechazo del periodo.">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="h-[16rem]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Aplicaciones', value: snapshot.totalApplicants },
                      { name: 'Shortlist', value: snapshot.shortlistedCandidates },
                      { name: 'Contratados', value: snapshot.hiredCandidates },
                      { name: 'Rechazados', value: snapshot.rejectedCandidates },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={74}
                    paddingAngle={3}
                  >
                    {PIPELINE_COLORS.map((color) => (
                      <Cell key={color} fill={color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0d121d',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '14px',
                      color: '#f8fafc',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Aplicaciones', value: snapshot.totalApplicants, color: PIPELINE_COLORS[0] },
                { label: 'Shortlist', value: snapshot.shortlistedCandidates, color: PIPELINE_COLORS[1] },
                { label: 'Contratados', value: snapshot.hiredCandidates, color: PIPELINE_COLORS[2] },
                { label: 'Rechazados', value: snapshot.rejectedCandidates, color: PIPELINE_COLORS[3] },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-white/74">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-white">{formatMetricNumber(item.value)}</span>
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/44">Costo por alta</p>
                  <p className="mt-2 text-xl font-semibold text-white">{formatMetricCurrency(snapshot.costToHire)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/44">Dias en mercado</p>
                  <p className="mt-2 text-xl font-semibold text-white">{summary.daysInMarket.value === null ? '--' : `${formatMetricNumber(summary.daysInMarket.value, 1)} d`}</p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Candidatos recientes" subtitle="Ultimas aplicaciones dentro del periodo.">
          {snapshot.applicationDetails.length === 0 ? (
            <EmptyState message="No hay aplicaciones recientes para mostrar." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8 hover:bg-transparent">
                    <TableHead className="text-white/56">Candidato</TableHead>
                    <TableHead className="text-white/56">Vacante</TableHead>
                    <TableHead className="text-white/56">Fecha</TableHead>
                    <TableHead className="text-white/56">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.applicationDetails.map((item) => (
                    <TableRow key={item.id} className="border-white/8 hover:bg-white/[0.03]">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-xs text-white/50">{item.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/68">{item.jobTitle}</TableCell>
                      <TableCell className="text-white/68">{format(new Date(item.appliedDate), 'dd/MM/yyyy', { locale: es })}</TableCell>
                      <TableCell>
                        <Badge className={cn('border px-2.5 py-1 text-[11px]', STATUS_BADGE[item.status] || 'border-white/10 bg-white/[0.04] text-white/72')}>
                          {STATUS_LABELS[item.status] || item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Actividad reciente" subtitle="Ultimos eventos registrados por el sistema.">
          {data.recentActivity.length === 0 ? (
            <EmptyState message="No hubo actividad registrada en este rango." />
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                      <GitBranch className="h-4 w-4 text-amber-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">{item.descripcion}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/48">
                        <span>{item.usuario?.name || 'Sistema'}</span>
                        <span>|</span>
                        <span>{format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                        <span>|</span>
                        <span>{item.tipo}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Equipos por volumen" subtitle="Aplicaciones vs contrataciones en los equipos con mas carga.">
          {teamPerformance.length === 0 ? (
            <EmptyState message="Sin datos suficientes para comparar equipos." />
          ) : (
            <div className="h-[18rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformance}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} fontSize={11} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0d121d',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '14px',
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="candidates" fill="#76a7ff" radius={[8, 8, 0, 0]} name="Aplicaciones" />
                  <Bar dataKey="hires" fill="#d9c089" radius={[8, 8, 0, 0]} name="Contrataciones" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Indicadores rapidos" subtitle="Lectura operativa para tomar decisiones sin abrir otras pestanas.">
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickInfo icon={BriefcaseBusiness} title="Vacantes abiertas" value={String(summary.openPositions.openRoles)} note={`${summary.openPositions.openSeats} asientos por cubrir`} />
            <QuickInfo icon={Target} title="Offers enviadas" value={String(summary.offersSent.value)} note={`${formatMetricPercent(snapshot.offerAcceptanceRatio)} de aceptacion`} />
            <QuickInfo icon={Clock3} title="Apps por hire" value={formatMetricNumber(summary.appsPerHire.value, 1)} note="Relacion de carga actual" />
            <QuickInfo icon={TrendingUp} title="Conversion" value={formatMetricPercent(summary.conversionRate.value)} note={`${formatChange(summary.conversionRate.change)} vs periodo anterior`} />
          </div>
        </SectionCard>
      </section>
    </div>
  )
}

function QuickInfo({
  icon: Icon,
  title,
  value,
  note,
}: {
  icon: typeof Target
  title: string
  value: string
  note: string
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Icon className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <p className="text-sm text-white">{title}</p>
          <p className="text-xs text-white/48">{note}</p>
        </div>
      </div>
      <p className="mt-4 text-[1.75rem] font-semibold leading-none tracking-[-0.04em] text-white">{value}</p>
    </div>
  )
}
