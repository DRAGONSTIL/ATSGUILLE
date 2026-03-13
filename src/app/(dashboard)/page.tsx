'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { format, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { Cormorant_Garamond } from 'next/font/google'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  BriefcaseBusiness,
  CalendarRange,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  UserRoundSearch,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type DashboardResponse = {
  generatedAt: string
  range: { preset: 'day' | 'week' | 'month' | 'year' | 'custom'; label: string }
  filterOptions: {
    recruiters: Array<{ id: string; name: string }>
    teams: Array<{ id: string; name: string }>
    branches: Array<{ value: string; label: string }>
  }
  summary: {
    pipelineEntries: { value: number; change: number }
    hires: { value: number; change: number }
    interviewsCompleted: { value: number; change: number }
    offersSent: { value: number; change: number }
    timeToHireDays: { value: number | null; change: number }
    openPositions: { openRoles: number; openSeats: number }
    conversionRate: { value: number; change: number }
    rejectionRate: { value: number }
  }
  charts: {
    trend: Array<{ label: string; candidates: number; interviews: number; hires: number; offers: number }>
    funnel: Array<{ key: string; label: string; count: number; share: number }>
    sourcePerformance: Array<{ source: string; candidates: number; hires: number; conversionRate: number }>
    recruiterPerformance: Array<{ id: string; name: string; candidates: number; interviews: number; hires: number; conversionRate: number }>
    teamPerformance: Array<{ id: string; name: string; candidates: number; interviews: number; hires: number; conversionRate: number }>
    branchPerformance: Array<{ branch: string; candidates: number; openPositions: number; hires: number; conversionRate: number }>
  }
  tables: {
    vacancyPipeline: Array<{
      id: string
      title: string
      branch: string
      recruiter: string
      openSeats: number
      candidates: number
      interviews: number
      offers: number
      hires: number
    }>
  }
  recentActivity: Array<{ id: string; descripcion: string; createdAt: string; usuario?: { name: string | null } | null }>
  dataNotes: { branchDefinition: string; stageDefinition: string }
}

const COLORS = ['#f2d48d', '#7bb4ff', '#35d6c1', '#f59e0b', '#ef4444']
const SOURCE_LABELS: Record<string, string> = {
  LINKEDIN: 'LinkedIn',
  OCC: 'OCC',
  COMPUTRABAJA: 'Computrabajo',
  REFERIDO: 'Referido',
  AGENCIA: 'Agencia',
  FERIA_EMPLEO: 'Feria',
  UNIVERSIDAD: 'Universidad',
  RED_SOCIAL: 'Red social',
  OTRO: 'Otra',
}

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-auth-display',
})

function metric(value: number | null, suffix = '') {
  if (value === null) return 'N/A'
  return `${value.toLocaleString('es-MX')}${suffix}`
}

function delta(change: number) {
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

function Kpi({ title, value, detail, change, icon: Icon }: { title: string; value: string; detail: string; change?: number; icon: typeof Sparkles }) {
  return (
    <article className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f2d48d]/70 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-[1rem] border border-white/10 bg-black/20 p-3"><Icon className="h-4 w-4 text-[#f2d48d]" /></div>
        {typeof change === 'number' ? <Badge className={cn('border-0 px-2 py-1 text-[11px]', change >= 0 ? 'bg-emerald-500/12 text-emerald-300' : 'bg-red-500/12 text-red-300')}>{delta(change)}</Badge> : null}
      </div>
      <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-white/36">{title}</p>
      <p className="mt-2 font-[family:var(--font-auth-display)] text-[2.3rem] leading-none tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-2 text-[13px] leading-6 text-white/56">{detail}</p>
    </article>
  )
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,17,28,0.88),rgba(8,11,18,0.96))] p-5 shadow-[0_32px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <p className="text-[10px] uppercase tracking-[0.32em] text-white/34">Executive view</p>
      <h2 className="mt-2 font-[family:var(--font-auth-display)] text-[2rem] leading-[0.94] tracking-[-0.03em] text-white">{title}</h2>
      <p className="mt-2 max-w-[60ch] text-[13px] leading-6 text-white/56">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
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
  const { data, isLoading, isFetching, isError } = useQuery<DashboardResponse>({
    queryKey: ['dashboard-analytics', deferredQuery],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/analytics?${deferredQuery}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('analytics_error')
      return response.json()
    },
    placeholderData: (previous) => previous,
  })

  if (isLoading && !data) {
    return <div className="h-[28rem] rounded-[2rem] skeleton" />
  }

  if (isError || !data) {
    return <div className="rounded-[1.8rem] border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-100">No fue posible cargar el dashboard ejecutivo.</div>
  }

  return (
    <div className={cn('space-y-6', cormorant.variable)}>
      <section className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(123,180,255,0.18),transparent_28%),radial-gradient(circle_at_12%_20%,rgba(242,212,141,0.14),transparent_22%),linear-gradient(180deg,rgba(9,13,23,0.96),rgba(5,8,14,0.98))] p-6 shadow-[0_38px_120px_rgba(0,0,0,0.36)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:88px_88px] opacity-[0.07]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
          <div className="max-w-[52rem]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[10px] uppercase tracking-[0.32em] text-white/56"><Sparkles className="h-3.5 w-3.5 text-[#f2d48d]" />Recruitment Intelligence</div>
            <h1 className="mt-5 font-[family:var(--font-auth-display)] text-[clamp(2.8rem,5vw,5rem)] leading-[0.88] tracking-[-0.05em] text-white">Dashboard corporativo con logica real y filtros ejecutivos.</h1>
            <p className="mt-4 max-w-[58ch] text-[15px] leading-7 text-slate-300">La lectura activa cubre <span className="text-white">{data.range.label}</span>. El dashboard recalcula sobre candidatos, vacantes, entrevistas y actividad operativa del tenant sin usar datos simulados.</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Badge className="border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/72">{data.dataNotes.branchDefinition}</Badge>
              <Badge className="border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/72">{data.dataNotes.stageDefinition}</Badge>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/10 bg-black/20 p-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/38">Control filters</p>
                <p className="mt-2 font-[family:var(--font-auth-display)] text-[1.85rem] leading-[0.96] tracking-[-0.03em] text-white">Periodo, reclutador, equipo y sucursal.</p>
              </div>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-[#f2d48d]" /> : null}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">Periodo</p>
                <div className="flex gap-2">
                  <Select value={preset} onValueChange={(value) => setPreset(value as typeof preset)}>
                    <SelectTrigger className="h-11 w-full rounded-[1rem] border-white/10 bg-white/[0.04] text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Dia actual</SelectItem>
                      <SelectItem value="week">Semana actual</SelectItem>
                      <SelectItem value="month">Mes actual</SelectItem>
                      <SelectItem value="year">Ano actual</SelectItem>
                      <SelectItem value="custom">Periodo custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-11 rounded-[1rem] border-white/10 bg-white/[0.04] px-3 text-white hover:bg-white/[0.08]"><CalendarRange className="h-4 w-4" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto border-white/10 bg-[#0b1018] p-0 text-white">
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
              </div>
              <SelectField label="Reclutador" value={recruiterId} onChange={setRecruiterId} allLabel="Todos los reclutadores" options={data.filterOptions.recruiters.map((option) => ({ value: option.id, label: option.name }))} />
              <SelectField label="Equipo" value={teamId} onChange={setTeamId} allLabel="Todos los equipos" options={data.filterOptions.teams.map((option) => ({ value: option.id, label: option.name }))} />
              <SelectField label="Sucursal" value={branch} onChange={setBranch} allLabel="Todas las sucursales" options={data.filterOptions.branches} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi title="Ingresos a pipeline" value={metric(data.summary.pipelineEntries.value)} detail={`${delta(data.summary.pipelineEntries.change)} contra periodo comparable`} change={data.summary.pipelineEntries.change} icon={Users} />
        <Kpi title="Contrataciones" value={metric(data.summary.hires.value)} detail={`${delta(data.summary.hires.change)} en hires`} change={data.summary.hires.change} icon={Target} />
        <Kpi title="Entrevistas realizadas" value={metric(data.summary.interviewsCompleted.value)} detail={`${delta(data.summary.interviewsCompleted.change)} vs tramo anterior`} change={data.summary.interviewsCompleted.change} icon={UserRoundSearch} />
        <Kpi title="Ofertas emitidas" value={metric(data.summary.offersSent.value)} detail={`${delta(data.summary.offersSent.change)} en ofertas`} change={data.summary.offersSent.change} icon={TrendingUp} />
        <Kpi title="Time to hire" value={metric(data.summary.timeToHireDays.value, ' dias')} detail={data.summary.timeToHireDays.value === null ? 'Sin contrataciones suficientes en el periodo.' : `${delta(data.summary.timeToHireDays.change)} contra periodo comparable`} change={data.summary.timeToHireDays.value === null ? undefined : data.summary.timeToHireDays.change} icon={Sparkles} />
        <Kpi title="Vacantes abiertas" value={metric(data.summary.openPositions.openSeats)} detail={`${data.summary.openPositions.openRoles} vacantes publicadas activas`} icon={BriefcaseBusiness} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.28fr_0.92fr]">
        <Panel title="Tendencia operativa del periodo" description="Ingresos al pipeline, entrevistas, ofertas y contrataciones efectivas segun el filtro activo.">
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charts.trend} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEntries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7bb4ff" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#7bb4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradHires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f2d48d" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f2d48d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.34)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.34)" tick={{ fontSize: 11 }} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#0d121d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', color: '#f8fafc' }} />
                <Area type="monotone" dataKey="candidates" name="Ingresos" stroke="#7bb4ff" strokeWidth={2.1} fill="url(#gradEntries)" />
                <Area type="monotone" dataKey="hires" name="Contrataciones" stroke="#f2d48d" strokeWidth={2.1} fill="url(#gradHires)" />
                <Bar dataKey="interviews" name="Entrevistas" fill="#35d6c1" radius={[6, 6, 0, 0]} barSize={16} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Embudo actual del periodo" description={data.dataNotes.stageDefinition}>
          <div className="space-y-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.funnel} layout="vertical" margin={{ left: 18, right: 12, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.34)" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={90} stroke="rgba(255,255,255,0.34)" tick={{ fontSize: 11 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0d121d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', color: '#f8fafc' }} />
                  <Bar dataKey="count" radius={[0, 12, 12, 0]}>
                    {data.charts.funnel.map((entry, index) => <Cell key={entry.key} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Conversion" value={`${data.summary.conversionRate.value}%`} detail="Ingreso a hire dentro del periodo." />
              <MiniStat label="Rechazo" value={`${data.summary.rejectionRate.value}%`} detail="Porcentaje de la cohorte descartada." />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <Panel title="Efectividad por fuente" description="No se estiman conversiones: se cruzan candidatos del periodo con contrataciones efectivas del mismo tramo.">
          <div className="space-y-3">
            {data.charts.sourcePerformance.length === 0 ? (
              <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-5 text-sm text-white/56">Sin fuentes registradas para el periodo filtrado.</div>
            ) : data.charts.sourcePerformance.map((source) => (
              <div key={source.source} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white">{SOURCE_LABELS[source.source] || source.source}</p>
                    <p className="mt-1 text-[12px] text-white/48">{source.candidates} ingresos · {source.hires} hires</p>
                  </div>
                  <div className="text-right">
                    <p className="font-[family:var(--font-auth-display)] text-[1.8rem] leading-none tracking-[-0.03em] text-[#f2d48d]">{source.conversionRate}%</p>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">conversion</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6"><div className="h-full rounded-full bg-[linear-gradient(90deg,#7bb4ff,#f2d48d)]" style={{ width: `${Math.min(100, source.conversionRate)}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Desglose por capa operativa" description="Cambia la lectura entre reclutador, equipo y sucursal sin perder consistencia.">
          <Tabs defaultValue="recruiters" className="gap-4">
            <TabsList className="h-10 rounded-[1rem] border border-white/10 bg-white/[0.04] p-1">
              <TabsTrigger value="recruiters" className="rounded-[0.85rem] data-[state=active]:bg-white/10">Reclutadores</TabsTrigger>
              <TabsTrigger value="teams" className="rounded-[0.85rem] data-[state=active]:bg-white/10">Equipos</TabsTrigger>
              <TabsTrigger value="branches" className="rounded-[0.85rem] data-[state=active]:bg-white/10">Sucursales</TabsTrigger>
            </TabsList>
            <TabsContent value="recruiters"><BreakdownTable headers={['Reclutador', 'Ingresos', 'Entrevistas', 'Hires', 'Conversion']} rows={data.charts.recruiterPerformance.map((item) => [item.name, `${item.candidates}`, `${item.interviews}`, `${item.hires}`, `${item.conversionRate}%`])} /></TabsContent>
            <TabsContent value="teams"><BreakdownTable headers={['Equipo', 'Ingresos', 'Entrevistas', 'Hires', 'Conversion']} rows={data.charts.teamPerformance.map((item) => [item.name, `${item.candidates}`, `${item.interviews}`, `${item.hires}`, `${item.conversionRate}%`])} /></TabsContent>
            <TabsContent value="branches"><BreakdownTable headers={['Sucursal', 'Ingresos', 'Posiciones', 'Hires', 'Conversion']} rows={data.charts.branchPerformance.map((item) => [item.branch, `${item.candidates}`, `${item.openPositions}`, `${item.hires}`, `${item.conversionRate}%`])} /></TabsContent>
          </Tabs>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
        <Panel title="Vacantes con mayor movimiento" description="Relacion directa entre asientos abiertos, ingresos, entrevistas, ofertas y contrataciones.">
          <Table>
            <TableHeader><TableRow className="border-white/8 hover:bg-transparent"><TableHead className="text-white/56">Vacante</TableHead><TableHead className="text-white/56">Sucursal</TableHead><TableHead className="text-white/56">Asientos</TableHead><TableHead className="text-white/56">Ingresos</TableHead><TableHead className="text-white/56">Entrevistas</TableHead><TableHead className="text-white/56">Ofertas</TableHead><TableHead className="text-white/56">Hires</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.tables.vacancyPipeline.map((vacancy) => (
                <TableRow key={vacancy.id} className="border-white/8 hover:bg-white/[0.03]">
                  <TableCell className="max-w-[18rem] whitespace-normal text-white"><div><p className="font-medium">{vacancy.title}</p><p className="mt-1 text-[12px] text-white/42">{vacancy.recruiter}</p></div></TableCell>
                  <TableCell className="text-white/64">{vacancy.branch}</TableCell>
                  <TableCell className="text-white/82">{vacancy.openSeats}</TableCell>
                  <TableCell className="text-white/82">{vacancy.candidates}</TableCell>
                  <TableCell className="text-white/82">{vacancy.interviews}</TableCell>
                  <TableCell className="text-white/82">{vacancy.offers}</TableCell>
                  <TableCell className="font-semibold text-[#f2d48d]">{vacancy.hires}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel title="Actividad reciente" description="Eventos reales del periodo filtrado dentro del alcance actual.">
          <div className="space-y-3">
            {data.recentActivity.length === 0 ? (
              <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4 text-sm text-white/56">No hubo actividad reciente dentro del filtro activo.</div>
            ) : data.recentActivity.map((activity) => (
              <div key={activity.id} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-full border border-white/10 bg-black/20 p-2"><Activity className="h-3.5 w-3.5 text-[#7bb4ff]" /></div>
                  <div className="min-w-0">
                    <p className="text-sm leading-6 text-white">{activity.descripcion}</p>
                    <p className="mt-1 text-[12px] text-white/42">{activity.usuario?.name || 'Sistema'} · {format(new Date(activity.createdAt), 'dd MMM yyyy HH:mm', { locale: es })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
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
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 w-full rounded-[1rem] border-white/10 bg-white/[0.04] text-white"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">{label}</p>
      <p className="mt-2 font-[family:var(--font-auth-display)] text-[2rem] leading-none tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-2 text-[12px] leading-5 text-white/56">{detail}</p>
    </div>
  )
}

function BreakdownTable({ headers, rows }: { headers: [string, string, string, string, string]; rows: string[][] }) {
  if (rows.length === 0) {
    return <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4 text-sm text-white/56">No hay datos en esta vista para el filtro activo.</div>
  }

  return (
    <Table>
      <TableHeader><TableRow className="border-white/8 hover:bg-transparent">{headers.map((header) => <TableHead key={header} className="text-white/52">{header}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.join('-')} className="border-white/8 hover:bg-white/[0.03]">
            <TableCell className="whitespace-normal text-white">{row[0]}</TableCell>
            <TableCell className="text-white/72">{row[1]}</TableCell>
            <TableCell className="text-white/72">{row[2]}</TableCell>
            <TableCell className="text-white/72">{row[3]}</TableCell>
            <TableCell className="font-semibold text-[#f2d48d]">{row[4]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
