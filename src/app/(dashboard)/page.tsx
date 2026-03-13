'use client'

import { type ReactNode, useDeferredValue, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { format, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { Cormorant_Garamond } from 'next/font/google'
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { CalendarRange, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  dashboard: {
    topMetrics: {
      hired: number
      appsPerHire: number | null
      daysToHire: number | null
      costPerHire: number | null
      openPositions: number
      daysInMarket: number | null
    }
    recruitmentFunnel: Array<{ key: string; label: string; count: number; share: number }>
    monthlyMetrics: Array<{ key: string; month: string; hires: number; daysToHire: number | null }>
    pipelineEfficiency: {
      totalDays: number | null
      stages: Array<{ key: string; label: string; days: number }>
    }
    applicationSources: Array<{
      source: string
      candidates: number
      hires: number
      shareOfHires: number
      conversionRate: number
    }>
    declineReasons: Array<{ reason: string; count: number; share: number }>
    activePipeline: {
      totalPending: number
      stages: Array<{ key: string; label: string; count: number; color: string }>
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

const PIE_COLORS = ['#1565c0', '#26a69a', '#7cb342', '#f4a300', '#ef5350']

function metricValue(value: number | null, mode: 'integer' | 'decimal' | 'plain' = 'integer') {
  if (value === null) return '--'
  if (mode === 'decimal') return value.toFixed(1)
  if (mode === 'plain') return value.toLocaleString('es-MX')
  return Math.round(value).toLocaleString('es-MX')
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="relative rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.26)]">
      <div className="pointer-events-none absolute left-5 top-0 -translate-y-1/2 rounded-md border border-white/10 bg-[#101521] px-3 py-1 text-[11px] text-white/68">
        {title}
      </div>
      {children}
    </section>
  )
}

function TopMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <article className="flex flex-col items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.03] px-3 py-4 text-center">
      <div
        className={cn(
          'flex h-12 min-w-[4.5rem] items-center justify-center px-3 text-[1.45rem] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
          accent ? 'bg-[#1565c0]' : 'bg-[#3a3f49]'
        )}
        style={{ clipPath: 'polygon(0 0,100% 0,100% 78%,50% 100%,0 78%)' }}
      >
        {value}
      </div>
      <p className="text-[12px] text-white/72">{label}</p>
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
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })

  if (isLoading && !data) {
    return <div className="h-[28rem] rounded-[1.5rem] skeleton" />
  }

  if (isError || !data) {
    return <div className="rounded-[1.4rem] border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">No fue posible cargar el dashboard.</div>
  }

  const top = data.dashboard.topMetrics
  const monthlyHiresMax = Math.max(1, ...data.dashboard.monthlyMetrics.map((item) => item.hires))
  const monthlyTimeMax = Math.max(1, ...data.dashboard.monthlyMetrics.map((item) => item.daysToHire || 0))
  const funnelBase = Math.max(1, data.dashboard.recruitmentFunnel[0]?.count || 0)
  const sourceConvMax = Math.max(1, ...data.dashboard.applicationSources.map((item) => item.conversionRate))
  const declineMax = Math.max(1, ...data.dashboard.declineReasons.map((item) => item.count))
  const recruiterLabel = recruiterId === 'all'
    ? 'Todos los reclutadores'
    : data.filterOptions.recruiters.find((item) => item.id === recruiterId)?.name || 'Reclutador'
  const teamLabel = teamId === 'all'
    ? 'Todos los equipos'
    : data.filterOptions.teams.find((item) => item.id === teamId)?.name || 'Equipo'
  const branchLabel = branch === 'all'
    ? 'Todas las sucursales'
    : data.filterOptions.branches.find((item) => item.value === branch)?.label || branch

  return (
    <div className={cn('space-y-4', cormorant.variable)}>
      <section className="rounded-[1.45rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(123,180,255,0.12),transparent_28%),linear-gradient(180deg,rgba(10,14,22,0.96),rgba(6,8,14,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <h1 className="font-[family:var(--font-auth-display)] text-[clamp(1.9rem,2.8vw,2.9rem)] leading-none tracking-[-0.04em] text-white">
              Recruitment Funnel and Application Source Dashboard
            </h1>
            <div className="flex flex-wrap gap-2">
              <Badge className="border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-white/68">{data.range.label}</Badge>
              <Badge className="border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-white/68">Sync {format(new Date(data.generatedAt), 'HH:mm:ss', { locale: es })}</Badge>
              <Badge className="border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-white/68">Auto refresh 30s</Badge>
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
            <SelectField
              label="Reclutador"
              value={recruiterId}
              onChange={setRecruiterId}
              allLabel="Todos"
              options={data.filterOptions.recruiters.map((option) => ({ value: option.id, label: option.name }))}
            />
            <SelectField
              label="Equipo"
              value={teamId}
              onChange={setTeamId}
              allLabel="Todos"
              options={data.filterOptions.teams.map((option) => ({ value: option.id, label: option.name }))}
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
      </section>

      <section className="rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,25,0.98),rgba(8,10,16,0.98))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
        <div className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-4 py-2 text-center text-[11px] text-white/64">
          {data.range.label} / {recruiterLabel} / {teamLabel} / {branchLabel}
          {isFetching ? <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-[#f2d48d]" /> : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <TopMetric label="Hired" value={metricValue(top.hired)} />
          <TopMetric label="Apps Per Hire" value={metricValue(top.appsPerHire, 'decimal')} />
          <TopMetric label="Days to Hire" value={metricValue(top.daysToHire, 'integer')} />
          <TopMetric label="Cost Per Hire" value={metricValue(top.costPerHire, 'plain')} />
          <TopMetric label="Open Positions" value={metricValue(top.openPositions)} accent />
          <TopMetric label="Days in MKT" value={metricValue(top.daysInMarket, 'integer')} accent />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <SectionCard title="Recruitment Funnel">
            <div className="space-y-3">
              {data.dashboard.recruitmentFunnel.map((stage) => (
                <div key={stage.key} className="grid grid-cols-[6.8rem_1fr_auto] items-center gap-3">
                  <p className="text-[13px] text-white/74">{stage.label}</p>
                  <div className="relative h-7 overflow-hidden rounded-sm bg-white/6">
                    <div
                      className="flex h-full items-center justify-end rounded-sm bg-[linear-gradient(90deg,#1565c0,#1e88e5)] pr-2 text-[11px] font-medium text-white"
                      style={{ width: `${Math.max((stage.count / funnelBase) * 100, stage.count > 0 ? 12 : 0)}%` }}
                    >
                      {stage.share}%
                    </div>
                  </div>
                  <p className="w-10 text-right text-[12px] text-white/62">{stage.count}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Monthly Metrics (Past 12 Months)">
            <div className="grid grid-cols-[4.3rem_1fr_1fr] gap-3 text-[11px] uppercase tracking-[0.16em] text-white/42">
              <span>Month</span>
              <span>Hired</span>
              <span>Days to Hire</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {data.dashboard.monthlyMetrics.map((item) => (
                <div key={item.key} className="grid grid-cols-[4.3rem_1fr_1fr] items-center gap-3">
                  <span className="text-[12px] text-white/68">{item.month}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-5 flex-1 overflow-hidden rounded-sm bg-white/6">
                      <div className="h-full bg-[#1565c0]" style={{ width: `${(item.hires / monthlyHiresMax) * 100}%` }} />
                    </div>
                    <span className="w-6 text-[12px] text-white/74">{item.hires}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 flex-1 overflow-hidden rounded-sm bg-white/6">
                      <div className="h-full bg-[#26a69a]" style={{ width: `${((item.daysToHire || 0) / monthlyTimeMax) * 100}%` }} />
                    </div>
                    <span className="w-8 text-[12px] text-white/74">{item.daysToHire === null ? '--' : item.daysToHire}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Pipeline Efficiency of Hiring">
            {data.dashboard.pipelineEfficiency.stages.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-white/46">Sin base suficiente para cycle time.</div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1fr_12rem]">
                <div className="space-y-2 pt-2">
                  {data.dashboard.pipelineEfficiency.stages.map((stage, index) => (
                    <div key={stage.key} className="flex items-center gap-2 text-[13px] text-white/72">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="flex-1">{stage.label}</span>
                      <span>{stage.days}d</span>
                    </div>
                  ))}
                </div>
                <div className="relative h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={data.dashboard.pipelineEfficiency.stages}
                        dataKey="days"
                        nameKey="label"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={2}
                      >
                        {data.dashboard.pipelineEfficiency.stages.map((stage, index) => (
                          <Cell key={stage.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => [`${value} dias`, '']}
                        contentStyle={{ backgroundColor: '#0d121d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#f8fafc' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-[family:var(--font-auth-display)] text-[2.1rem] leading-none tracking-[-0.04em] text-white">{metricValue(data.dashboard.pipelineEfficiency.totalDays)}</span>
                    <span className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/42">days</span>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <SectionCard title="Application Sources">
            <div className="grid grid-cols-[1fr_3.5rem_4rem_4rem] gap-2 text-[11px] uppercase tracking-[0.16em] text-white/42">
              <span>Source</span>
              <span># Hired</span>
              <span>% of Hired</span>
              <span>Conv Rate</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {data.dashboard.applicationSources.length === 0 ? (
                <div className="py-10 text-center text-sm text-white/46">Sin fuentes en el periodo.</div>
              ) : data.dashboard.applicationSources.map((item) => (
                <div key={item.source} className="grid grid-cols-[1fr_3.5rem_4rem_4rem] items-center gap-2">
                  <span className="truncate text-[13px] text-white/76">{SOURCE_LABELS[item.source] || item.source}</span>
                  <span className="text-[12px] text-white/72">{item.hires}</span>
                  <span className="text-[12px] text-white/72">{item.shareOfHires}%</span>
                  <div className="space-y-1">
                    <span className="text-[12px] text-white/72">{item.conversionRate}%</span>
                    <div className="h-2 overflow-hidden rounded-sm bg-white/6">
                      <div className="h-full bg-[linear-gradient(90deg,#1565c0,#1e88e5)]" style={{ width: `${(item.conversionRate / sourceConvMax) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Decline Reasons">
            <div className="grid grid-cols-[1fr_3.5rem_4rem] gap-2 text-[11px] uppercase tracking-[0.16em] text-white/42">
              <span>Reason</span>
              <span># Apps</span>
              <span>%</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {data.dashboard.declineReasons.length === 0 ? (
                <div className="py-10 text-center text-sm text-white/46">Sin rechazos con motivo en el periodo.</div>
              ) : data.dashboard.declineReasons.map((item) => (
                <div key={item.reason} className="grid grid-cols-[1fr_3.5rem_4rem] items-center gap-2">
                  <div className="space-y-1">
                    <span className="block truncate text-[13px] text-white/76">{item.reason}</span>
                    <div className="h-2 overflow-hidden rounded-sm bg-white/6">
                      <div className="h-full bg-[#26a69a]" style={{ width: `${(item.count / declineMax) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-[12px] text-white/72">{item.count}</span>
                  <span className="text-[12px] text-white/72">{item.share}%</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={`Active Pipeline   ${data.dashboard.activePipeline.totalPending} Pending`}>
            <div className="grid grid-cols-5 gap-1.5 pt-4">
              {data.dashboard.activePipeline.stages.map((stage) => (
                <div key={stage.key} className="overflow-hidden rounded-[0.8rem] border border-white/10 bg-white/[0.03]">
                  <div className="flex h-16 items-center justify-center text-[2rem] font-[family:var(--font-auth-display)] text-white" style={{ backgroundColor: stage.color }}>
                    {stage.count}
                  </div>
                  <div className="px-2 py-2 text-center text-[11px] leading-4 text-white/72">{stage.label}</div>
                </div>
              ))}
            </div>
          </SectionCard>
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
