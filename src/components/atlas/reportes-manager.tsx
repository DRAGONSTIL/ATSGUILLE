'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  Download,
  FileJson,
  FileSpreadsheet,
  BarChart3,
  PieChartIcon,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Filter,
  Loader2,
  Briefcase,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

// Types
interface Candidato {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string | null
  fuente: string
  estatus: string
  rating?: number | null
  createdAt: string
  fechaContratacion?: string | null
  vacante?: { id: string; titulo: string } | null
  reclutador?: { id: string; name: string | null } | null
}

interface Vacante {
  id: string
  titulo: string
  estatus: string
  prioridad: string
  candidatosCount?: number
  createdAt: string
}

interface ReportesManagerProps {
  candidatos: Candidato[]
  vacantes: Vacante[]
  addNotification: (n: { type: string; title: string; message?: string }) => void
}

const CHART_COLORS = ['#d4af37', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

export function ReportesManager({ candidatos, vacantes, addNotification }: ReportesManagerProps) {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState('30')
  const [selectedVacante, setSelectedVacante] = useState('all')

  // Export states
  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingJSON, setExportingJSON] = useState(false)

  // Filter candidates
  const filteredCandidatos = candidatos.filter(c => {
    if (selectedVacante !== 'all' && c.vacante?.id !== selectedVacante) return false
    const days = parseInt(dateRange)
    const cutoff = subDays(new Date(), days)
    return new Date(c.createdAt) >= cutoff
  })

  // Calculate metrics
  const metrics = {
    total: filteredCandidatos.length,
    contratados: filteredCandidatos.filter(c => c.estatus === 'CONTRATADO').length,
    enProceso: filteredCandidatos.filter(c => ['EN_PROCESO', 'ENTREVISTA'].includes(c.estatus)).length,
    rechazados: filteredCandidatos.filter(c => c.estatus === 'RECHAZADO').length,
    registrados: filteredCandidatos.filter(c => c.estatus === 'REGISTRADO').length,
    tasaContratacion: filteredCandidatos.length > 0 
      ? ((filteredCandidatos.filter(c => c.estatus === 'CONTRATADO').length / filteredCandidatos.length) * 100).toFixed(1)
      : 0,
  }

  // Funnel data
  const funnelData = [
    { name: 'Registrados', value: metrics.registrados, fill: CHART_COLORS[0] },
    { name: 'En Proceso', value: filteredCandidatos.filter(c => c.estatus === 'EN_PROCESO').length, fill: CHART_COLORS[1] },
    { name: 'Entrevista', value: filteredCandidatos.filter(c => c.estatus === 'ENTREVISTA').length, fill: CHART_COLORS[2] },
    { name: 'Contratados', value: metrics.contratados, fill: CHART_COLORS[3] },
    { name: 'Rechazados', value: metrics.rechazados, fill: CHART_COLORS[4] },
  ].filter(d => d.value > 0)

  // Source data
  const sourceData = Object.entries(
    filteredCandidatos.reduce((acc, c) => {
      acc[c.fuente] = (acc[c.fuente] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }))

  // Time to hire calculation
  const hiredCandidates = filteredCandidatos.filter(c => c.estatus === 'CONTRATADO' && c.fechaContratacion)
  const avgTimeToHire = hiredCandidates.length > 0
    ? Math.round(
        hiredCandidates.reduce((sum, c) => {
          return sum + differenceInDays(new Date(c.fechaContratacion!), new Date(c.createdAt))
        }, 0) / hiredCandidates.length
      )
    : 0

  // Trend data (last 7 days)
  const trendData: { name: string; candidatos: number; contrataciones: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i)
    const dayStart = new Date(date.setHours(0, 0, 0, 0))
    const dayEnd = new Date(date.setHours(23, 59, 59, 999))
    
    const dayCandidatos = candidatos.filter(c => {
      const created = new Date(c.createdAt)
      return created >= dayStart && created <= dayEnd
    }).length
    
    const dayContrataciones = candidatos.filter(c => {
      if (!c.fechaContratacion) return false
      const hired = new Date(c.fechaContratacion)
      return hired >= dayStart && hired <= dayEnd
    }).length
    
    trendData.push({
      name: format(subDays(new Date(), i), 'EEE', { locale: es }),
      candidatos: dayCandidatos,
      contrataciones: dayContrataciones,
    })
  }

  // Vacante performance
  const vacantePerformance = vacantes.map(v => ({
    name: v.titulo.length > 15 ? v.titulo.slice(0, 15) + '...' : v.titulo,
    candidatos: v.candidatosCount || 0,
    contratados: candidatos.filter(c => c.vacante?.id === v.id && c.estatus === 'CONTRATADO').length,
  })).sort((a, b) => b.candidatos - a.candidatos).slice(0, 5)

  // Export handlers
  const handleExportCSV = async () => {
    setExportingCSV(true)
    try {
      const res = await fetch(`/api/reportes?format=csv&vacanteId=${selectedVacante}&days=${dateRange}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `candidatos_${format(new Date(), 'yyyy-MM-dd')}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        addNotification({ type: 'success', title: 'CSV exportado correctamente' })
      } else {
        addNotification({ type: 'error', title: 'Error al exportar CSV' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al exportar CSV' })
    } finally {
      setExportingCSV(false)
    }
  }

  const handleExportJSON = async () => {
    setExportingJSON(true)
    try {
      const res = await fetch(`/api/reportes?format=json&vacanteId=${selectedVacante}&days=${dateRange}`)
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `candidatos_${format(new Date(), 'yyyy-MM-dd')}.json`
        a.click()
        window.URL.revokeObjectURL(url)
        addNotification({ type: 'success', title: 'JSON exportado correctamente' })
      } else {
        addNotification({ type: 'error', title: 'Error al exportar JSON' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al exportar JSON' })
    } finally {
      setExportingJSON(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reportes y Métricas</h2>
          <p className="text-muted-foreground">Análisis detallado de tu proceso de reclutamiento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={exportingCSV}>
            {exportingCSV ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={handleExportJSON} disabled={exportingJSON}>
            {exportingJSON ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileJson className="h-4 w-4 mr-2" />
            )}
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Período:</span>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="60">Últimos 60 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="365">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Vacante:</span>
              <Select value={selectedVacante} onValueChange={setSelectedVacante}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las vacantes</SelectItem>
                  {vacantes.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Badge variant="outline" className="ml-auto">
              {filteredCandidatos.length} candidatos en el rango
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Candidatos</p>
                <p className="text-3xl font-bold">{metrics.total}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+12%</span>
              <span>vs período anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contratados</p>
                <p className="text-3xl font-bold text-green-500">{metrics.contratados}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tasa: {metrics.tasaContratacion}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                <p className="text-3xl font-bold text-blue-500">{avgTimeToHire} días</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              De contratación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rechazados</p>
                <p className="text-3xl font-bold text-red-500">{metrics.rechazados}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.total > 0 ? ((metrics.rechazados / metrics.total) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Embudo de Reclutamiento
            </CardTitle>
            <CardDescription>Distribución por etapa del proceso</CardDescription>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" width={80} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Fuentes de Candidatos
            </CardTitle>
            <CardDescription>Origen de los candidatos</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {sourceData.map((entry, index) => (
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
        {/* Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendencia Semanal
            </CardTitle>
            <CardDescription>Candidatos y contrataciones por día</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
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
                <Legend />
                <Line
                  type="monotone"
                  dataKey="candidatos"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[0] }}
                />
                <Line
                  type="monotone"
                  dataKey="contrataciones"
                  stroke={CHART_COLORS[3]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[3] }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vacante Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Vacantes
            </CardTitle>
            <CardDescription>Rendimiento por posición</CardDescription>
          </CardHeader>
          <CardContent>
            {vacantePerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={vacantePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="candidatos" fill={CHART_COLORS[0]} name="Candidatos" />
                  <Bar dataKey="contratados" fill={CHART_COLORS[3]} name="Contratados" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No hay vacantes con candidatos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por Estatus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: 'Registrados', count: metrics.registrados, color: 'bg-slate-500' },
              { label: 'En Proceso', count: filteredCandidatos.filter(c => c.estatus === 'EN_PROCESO').length, color: 'bg-blue-500' },
              { label: 'En Entrevista', count: filteredCandidatos.filter(c => c.estatus === 'ENTREVISTA').length, color: 'bg-amber-500' },
              { label: 'Contratados', count: metrics.contratados, color: 'bg-green-500' },
              { label: 'Rechazados', count: metrics.rechazados, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">{item.count}</span>
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    {metrics.total > 0 ? ((item.count / metrics.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
