'use client'

import { type ReactNode, useDeferredValue, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { format, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { Cormorant_Garamond } from 'next/font/google'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { CalendarRange, Loader2 } from 'lucide-react'
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
    label: string
  }
  filterOptions: {
    recruiters: Array<{ id: string; name: string }>
    teams: Array<{ id: string; name: string }>
    branches: Array<{ value: string; label: string }>
  }
  dashboard: {
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
      openPositionsByTeam: Array<{ team: string; openPositions: number }>
      applicationsBySource: Array<{ source: string; applications: number }>
      compactFunnel: Array<{ key: string; label: string; count: number }>
      applicationsByTeam: Array<{ team: string; applications: number }>
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
}

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-auth-display',
})

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

const STATUS_LABELS: Record<string, string> = {
  REGISTRADO: 'Application',
  EN_PROCESO: 'Screening',
  ENTREVISTA: 'Interview',
  CONTRATADO: 'Hired',
  RECHAZADO: 'Rejected',
}

const DONUT_COLORS = ['#d9c089', '#76a7ff', '#4fd1c5', '#8ad05f', '#efb54a', '#ff7f6b']

function metricValue(value: number | null, kind: 'int' | 'decimal' | 'currency' = 'int') {
  if (value === null) return '--'
  if (kind === 'decimal') return value.toFixed(1)
  if (kind === 'currency') return `$ ${Math.round(value).toLocaleString('es-MX')}`
  return Math.round(value).toLocaleString('es-MX')
}

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('relative overflow-hidden rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.24)]', className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="mb-4 text-[12px] font-medium text-white/76">{title}</div>
      {children}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-3 py-3 text-center shadow-[0_16px_46px_rgba(0,0,0,0.18)]">
      <p className="text-[11px] text-white/52">{label}</p>
      <p className="mt-1 font-[family:var(--font-auth-display)] text-[1.8rem] leading-none tracking-[-0.04em] text-white">{value}</p>
    </article>
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
    staleTime: 0,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  if (isLoading && !data) {
    return <div className="h-[28rem] rounded-[1.5rem] skeleton" />
  }

  if (isError || !data) {
    return <div className="rounded-[1.3rem] border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">No fue posible cargar el dashboard.</div>
  }

  const snapshot = data.dashboard.executiveSnapshot
  const sourceMax = Math.max(1, ...snapshot.applicationsBySource.map((item) => item.applications))
  const departmentMax = Math.max(1, ...snapshot.applicationsByTeam.map((item) => item.applications))
  const funnelBase = Math.max(1, snapshot.compactFunnel[0]?.count || 1)

  return (
    <div className={cn('space-y-4', cormorant.variable)}>
      <section className="rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(118,167,255,0.12),transparent_30%),radial-gradient(circle_at_0%_0%,rgba(217,192,137,0.12),transparent_25%),linear-gradient(180deg,rgba(8,12,20,0.98),rgba(7,10,16,0.98))] p-4 shadow-[0_32px_100px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <h1 className="font-[family:var(--font-auth-display)] text-[clamp(1.9rem,2.8vw,2.8rem)] leading-none tracking-[-0.05em] text-white">
              Executive Recruitment Dashboard
            </h1>
            <div className="flex flex-wrap gap-2">
              <Badge className="border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-white/68">{data.range.label}</Badge>
              <Badge className="border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-white/68">Sync {format(new Date(data.generatedAt), 'HH:mm:ss', { locale: es })}</Badge>
              <Badge className="border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-white/68">Live refresh 10s</Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">Periodo</p>
              <div className="flex gap-2">
                <Select value={preset} onValueChange={(value) => setPreset(value as typeof preset)}>
                  <SelectTrigger className="h-10 min-w-[11rem] rounded-[0.9rem] border-white/10 bg-white/[0.04] text-white">
                    <SelectValue />
                  </SelectTrigger>
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
                    <Button variant="outline" className="h-10 rounded-[0.9rem] border-white/10 bg-white/[0.04] px-3 text-white hover:bg-white/[0.08]">
                      <CalendarRange className="h-4 w-4" />
                    </Button>
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
            <SelectField label="Reclutador" value={recruiterId} onChange={setRecruiterId} allLabel="Todos" options={data.filterOptions.recruiters.map((item) => ({ value: item.id, label: item.name }))} />
            <SelectField label="Equipo" value={teamId} onChange={setTeamId} allLabel="Todos" options={data.filterOptions.teams.map((item) => ({ value: item.id, label: item.name }))} />
            <SelectField label="Sucursal" value={branch} onChange={setBranch} allLabel="Todas" options={data.filterOptions.branches} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,18,28,0.98),rgba(9,12,18,0.98))] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.3)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Total Applicants" value={metricValue(snapshot.totalApplicants)} />
          <MetricCard label="Shortlisted Candidates" value={metricValue(snapshot.shortlistedCandidates)} />
          <MetricCard label="Hired Candidates" value={metricValue(snapshot.hiredCandidates)} />
          <MetricCard label="Rejected Candidates" value={metricValue(snapshot.rejectedCandidates)} />
          <MetricCard label="Time to hire" value={`${metricValue(snapshot.timeToHireDays)} day(s)`} />
          <MetricCard label="Cost to hire" value={metricValue(snapshot.costToHire, 'currency')} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr_0.85fr]">
          <Panel title="Open position by department">
            {snapshot.openPositionsByTeam.length === 0 ? (
              <div className="flex h-[15rem] items-center justify-center text-sm text-white/46">Sin posiciones abiertas.</div>
            ) : (
              <div className="grid h-[15rem] grid-cols-[10rem_1fr] gap-3">
                <div className="relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={snapshot.openPositionsByTeam} dataKey="openPositions" nameKey="team" innerRadius={34} outerRadius={70} paddingAngle={2}>
                        {snapshot.openPositionsByTeam.map((item, index) => <Cell key={item.team} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0d121d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#f8fafc' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 pt-2">
                  {snapshot.openPositionsByTeam.map((item, index) => (
                    <div key={item.team} className="flex items-center gap-2 text-[12px] text-white/72">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                      <span className="flex-1 truncate">{item.team}</span>
                      <span>{item.openPositions}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Application Received By Source">
            <div className="space-y-3 pt-1">
              {snapshot.applicationsBySource.map((item) => (
                <div key={item.source} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3">
                  <span className="truncate text-[12px] text-white/72">{SOURCE_LABELS[item.source] || item.source}</span>
                  <div className="h-5 overflow-hidden rounded-sm bg-white/6">
                    <div className="flex h-full items-center justify-end bg-[linear-gradient(90deg,#4f85e6,#76a7ff)] pr-2 text-[11px] text-white" style={{ width: `${(item.applications / sourceMax) * 100}%` }}>
                      {item.applications}
                    </div>
                  </div>
                  <span className="text-[11px] text-white/54">apps</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recruitment Funnel">
            <div className="flex h-[15rem] items-center justify-center">
              <div className="w-full max-w-[16rem] space-y-1.5">
                {snapshot.compactFunnel.map((item, index) => {
                  const width = 100 - index * 18
                  return (
                    <div key={item.key} className="mx-auto flex h-12 items-center justify-between px-4 text-[12px] text-white" style={{ width: `${width}%`, background: `linear-gradient(90deg, ${DONUT_COLORS[index % DONUT_COLORS.length]}, ${DONUT_COLORS[(index + 1) % DONUT_COLORS.length]})`, clipPath: 'polygon(9% 0,91% 0,100% 100%,0 100%)' }}>
                      <span>{item.label}</span>
                      <span>{item.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Panel>

          <Panel title="Offer Acceptance Ratio">
            <div className="flex h-[15rem] flex-col items-center justify-center text-center">
              <p className="font-[family:var(--font-auth-display)] text-[2.4rem] leading-none tracking-[-0.05em] text-white">{snapshot.offerAcceptanceRatio === null ? '--' : `${snapshot.offerAcceptanceRatio}%`}</p>
              <p className="mt-6 text-[13px] text-white/62">Offer Accepted</p>
              <p className="text-[1.35rem] text-white">{snapshot.offersAccepted}</p>
              <p className="mt-3 text-[13px] text-white/62">Offers Provided</p>
              <p className="text-[1.35rem] text-white">{snapshot.offersProvided}</p>
            </div>
          </Panel>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Application Received by Department">
            <div className="flex h-[16rem] items-end gap-3 pt-3">
              {snapshot.applicationsByTeam.map((item, index) => (
                <div key={item.team} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex w-full items-start justify-center rounded-t-[0.7rem] bg-[linear-gradient(180deg,#8dc0ff,#4f85e6)] text-[12px] text-white shadow-[0_10px_32px_rgba(79,133,230,0.28)]" style={{ height: `${Math.max((item.applications / departmentMax) * 100, 14)}%` }}>
                    <span className="pt-2">{item.applications}</span>
                  </div>
                  <span className="w-full text-center text-[11px] leading-4 text-white/62">{item.team}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Application details">
            <Table>
              <TableHeader>
                <TableRow className="border-white/8 hover:bg-transparent">
                  <TableHead className="text-white/56">Application Name</TableHead>
                  <TableHead className="text-white/56">Email</TableHead>
                  <TableHead className="text-white/56">Job Title</TableHead>
                  <TableHead className="text-white/56">Job Applied Date</TableHead>
                  <TableHead className="text-white/56">Current Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.applicationDetails.map((item) => (
                  <TableRow key={item.id} className="border-white/8 hover:bg-white/[0.03]">
                    <TableCell className="text-white">{item.name}</TableCell>
                    <TableCell className="text-white/68">{item.email}</TableCell>
                    <TableCell className="text-white/68">{item.jobTitle}</TableCell>
                    <TableCell className="text-white/68">{format(new Date(item.appliedDate), 'dd/MM/yyyy', { locale: es })}</TableCell>
                    <TableCell className="text-white/82">{STATUS_LABELS[item.status] || item.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
      </section>
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
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 min-w-[10rem] rounded-[0.9rem] border-white/10 bg-white/[0.04] text-white">
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
