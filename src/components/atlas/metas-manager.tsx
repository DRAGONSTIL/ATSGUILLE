'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Target,
  Plus,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  DollarSign,
  Briefcase,
  Star,
  MessageSquare,
  UserCheck,
} from 'lucide-react'
import { METRICAS_INFO, type TipoMetrica, type PeriodoMeta } from '@/lib/validations'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

// Types
interface Meta {
  id: string
  tipo: TipoMetrica
  valor: number
  valorActual: number
  periodo: PeriodoMeta
  fechaInicio: string
  fechaFin: string
  estatus: string
  notas?: string | null
  reclutador?: {
    id: string
    name?: string | null
    email: string
  }
}

interface Reclutador {
  id: string
  name?: string | null
  email: string
  rol: string
}

interface MetasManagerProps {
  empresaId: string | null
  userRole: string
  userId: string
  addNotification: (n: { type: string; title: string; message?: string }) => void
}

// Icono según tipo de métrica
const getMetricIcon = (tipo: TipoMetrica) => {
  const icons: Record<string, any> = {
    TIME_TO_HIRE: Clock,
    COST_PER_HIRE: DollarSign,
    QUALITY_OF_HIRE: Star,
    OFFER_ACCEPTANCE_RATE: CheckCircle,
    SOURCE_EFFECTIVENESS: Target,
    PIPELINE_VELOCITY: TrendingUp,
    CANDIDATES_PER_HIRE: Users,
    INTERVIEW_TO_OFFER_RATIO: MessageSquare,
    FIRST_YEAR_RETENTION: UserCheck,
    REQUISITION_FILL_RATE: Briefcase,
  }
  return icons[tipo] || Target
}

// Color según estatus
const getStatusColor = (estatus: string) => {
  const colors: Record<string, string> = {
    PENDIENTE: 'bg-slate-500/20 text-slate-400',
    EN_PROGRESO: 'bg-blue-500/20 text-blue-400',
    COMPLETADA: 'bg-green-500/20 text-green-400',
    EXCEDIDA: 'bg-amber-500/20 text-amber-400',
    VENCIDA: 'bg-red-500/20 text-red-400',
  }
  return colors[estatus] || 'bg-slate-500/20 text-slate-400'
}

export function MetasManager({ empresaId, userRole, userId, addNotification }: MetasManagerProps) {
  const [metas, setMetas] = useState<Meta[]>([])
  const [reclutadores, setReclutadores] = useState<Reclutador[]>([])
  const [metricasConfig, setMetricasConfig] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog
  const [showDialog, setShowDialog] = useState(false)
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null)
  const [pendingDeleteMetaId, setPendingDeleteMetaId] = useState<string | null>(null)

  // Form
  const [form, setForm] = useState({
    reclutadorId: '',
    tipo: '' as TipoMetrica | '',
    valor: '',
    periodo: 'MENSUAL' as PeriodoMeta,
    fechaInicio: '',
    fechaFin: '',
    notas: '',
  })

  // Cargar datos
  useEffect(() => {
    loadData()
  }, [empresaId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [metasRes, usuariosRes, metricasRes] = await Promise.all([
        fetch('/api/metas'),
        fetch('/api/usuarios'),
        fetch('/api/metricas'),
      ])

      if (metasRes.ok) {
        const data = await metasRes.json()
        setMetas(data.metas || [])
      }
      if (usuariosRes.ok) {
        const data = await usuariosRes.json()
        // Incluir reclutadores Y también el usuario actual si es GERENTE o ADMIN
        const usuarios = data.usuarios || []
        const reclutadoresFiltrados = usuarios.filter(
          (u: any) => u.rol === 'RECLUTADOR' || u.rol === 'GERENTE'
        )
        setReclutadores(reclutadoresFiltrados)
      }
      if (metricasRes.ok) {
        const data = await metricasRes.json()
        // Si no hay métricas configuradas, usar las por defecto de METRICAS_INFO
        const metricas = data.metricas || []
        if (metricas.length === 0) {
          // Usar métricas por defecto
          const defaultMetricas = Object.entries(METRICAS_INFO).map(([tipo, info]) => ({
            tipo,
            nombre: info.nombre,
            activa: true,
          }))
          setMetricasConfig(defaultMetricas)
        } else {
          setMetricasConfig(metricas)
        }
      }
    } catch (error) {
      console.error('Error loading metas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Guardar meta
  const handleSave = async () => {
    try {
      // Validar campos requeridos
      if (!form.tipo) {
        addNotification({ type: 'error', title: 'Debes seleccionar una métrica' })
        return
      }
      
      if (!form.valor || parseFloat(form.valor) <= 0) {
        addNotification({ type: 'error', title: 'El valor objetivo debe ser mayor a 0' })
        return
      }
      
      if (!form.fechaFin) {
        addNotification({ type: 'error', title: 'La fecha fin es requerida' })
        return
      }
      
      // Determinar reclutadorId
      let reclutadorId = form.reclutadorId
      if (userRole === 'RECLUTADOR') {
        reclutadorId = userId
      }
      
      if (!reclutadorId && userRole !== 'RECLUTADOR') {
        addNotification({ type: 'error', title: 'Debes seleccionar un reclutador' })
        return
      }
      
      const data = {
        reclutadorId,
        tipo: form.tipo,
        valor: parseFloat(form.valor),
        periodo: form.periodo,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        notas: form.notas || undefined,
      }

      const url = editingMeta ? `/api/metas/${editingMeta.id}` : '/api/metas'
      const method = editingMeta ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const responseData = await res.json()

      if (res.ok) {
        addNotification({
          type: 'success',
          title: editingMeta ? 'Meta actualizada' : 'Meta creada',
        })
        setShowDialog(false)
        loadData()
      } else {
        addNotification({ 
          type: 'error', 
          title: responseData.error || 'Error al guardar meta',
          message: responseData.details
        })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al guardar meta' })
    }
  }

  // Eliminar meta
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/metas/${id}`, { method: 'DELETE' })
      const data = await res.json()
      
      if (res.ok) {
        addNotification({ type: 'success', title: 'Meta eliminada' })
        loadData()
      } else {
        addNotification({ type: 'error', title: data.error || 'Error al eliminar meta' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al eliminar meta' })
    }
  }

  // Abrir dialog para nueva meta
  const openNewDialog = () => {
    setEditingMeta(null)
    const hoy = new Date()
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    setForm({
      reclutadorId: userRole === 'RECLUTADOR' ? userId : '',
      tipo: '',
      valor: '',
      periodo: 'MENSUAL',
      fechaInicio: hoy.toISOString().split('T')[0],
      fechaFin: finMes.toISOString().split('T')[0],
      notas: '',
    })
    setShowDialog(true)
  }

  // Abrir dialog para editar
  const openEditDialog = (meta: Meta) => {
    setEditingMeta(meta)
    setForm({
      reclutadorId: meta.reclutador?.id || '',
      tipo: meta.tipo,
      valor: meta.valor.toString(),
      periodo: meta.periodo,
      fechaInicio: meta.fechaInicio.split('T')[0],
      fechaFin: meta.fechaFin.split('T')[0],
      notas: meta.notas || '',
    })
    setShowDialog(true)
  }

  // Calcular progreso
  const calculateProgress = (meta: Meta) => {
    return Math.min(100, (meta.valorActual / meta.valor) * 100)
  }

  // Agrupar por reclutador
  const metasPorReclutador = metas.reduce((acc, meta) => {
    const key = meta.reclutador?.id || 'sin-asignar'
    if (!acc[key]) {
      acc[key] = {
        reclutador: meta.reclutador,
        metas: [],
      }
    }
    acc[key].metas.push(meta)
    return acc
  }, {} as Record<string, { reclutador?: any; metas: Meta[] }>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Target className="h-8 w-8 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent">Metas y Métricas</h2>
          <p className="text-muted-foreground">Control estratégico de alto nivel con experiencia visual ultra-luxury.</p>
        </div>
        {userRole !== 'RECLUTADOR' && (
          <Button onClick={openNewDialog} className="bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 hover:from-amber-300 hover:to-yellow-400">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Meta
          </Button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Metas</p>
                <p className="text-3xl font-bold">{metas.length}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-300/20 bg-gradient-to-br from-zinc-950 to-zinc-900 shadow-[0_0_30px_rgba(251,191,36,0.12)]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-3xl font-bold text-green-500">
                  {metas.filter(m => m.estatus === 'COMPLETADA' || m.estatus === 'EXCEDIDA').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Progreso</p>
                <p className="text-3xl font-bold text-blue-500">
                  {metas.filter(m => m.estatus === 'EN_PROGRESO').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-3xl font-bold text-red-500">
                  {metas.filter(m => m.estatus === 'VENCIDA').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metas por reclutador */}
      {Object.entries(metasPorReclutador).map(([key, group]) => (
        <Card key={key} className="border-amber-300/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {group.reclutador?.name?.[0] || group.reclutador?.email[0].toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {group.reclutador?.name || 'Sin asignar'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{group.reclutador?.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {group.metas.map((meta) => {
                const Icon = getMetricIcon(meta.tipo)
                const progress = calculateProgress(meta)
                const metricInfo = METRICAS_INFO[meta.tipo]

                return (
                  <div
                    key={meta.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {metricInfo?.nombre || meta.tipo}
                          </p>
                          <Badge className={getStatusColor(meta.estatus)}>
                            {meta.estatus}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(meta)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPendingDeleteMetaId(meta.id)}
                            className="text-destructive"
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">
                          {meta.valorActual} / {meta.valor} {metricInfo?.unidad}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(meta.fechaFin).toLocaleDateString('es-MX')}
                        </span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {metas.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay metas configuradas</h3>
            <p className="text-muted-foreground mb-4">
              Crea metas para tus reclutadores y mejora el rendimiento del equipo
            </p>
            {userRole !== 'RECLUTADOR' && (
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Meta
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog Nueva/Edit Meta */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMeta ? 'Editar Meta' : 'Nueva Meta'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {userRole !== 'RECLUTADOR' && (
              <div className="space-y-2">
                <Label>Reclutador</Label>
                {reclutadores.length === 0 ? (
                  <div className="p-3 rounded-md bg-muted text-sm text-muted-foreground">
                    No hay reclutadores disponibles. Invita usuarios primero desde el panel de administración.
                  </div>
                ) : (
                  <Select
                    value={form.reclutadorId}
                    onValueChange={(v) => setForm({ ...form, reclutadorId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar reclutador" />
                    </SelectTrigger>
                    <SelectContent>
                      {reclutadores.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name || r.email} <span className="text-muted-foreground">({r.rol})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Métrica</Label>
              {metricasConfig.length === 0 ? (
                <div className="p-3 rounded-md bg-muted text-sm text-muted-foreground">
                  No hay métricas configuradas. Contacta al administrador.
                </div>
              ) : (
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v as TipoMetrica })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar métrica" />
                  </SelectTrigger>
                  <SelectContent>
                    {metricasConfig.filter(m => m.activa !== false).map((m) => (
                      <SelectItem key={m.tipo} value={m.tipo}>
                        {m.nombre || METRICAS_INFO[m.tipo as TipoMetrica]?.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Objetivo</Label>
                <Input
                  type="number"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={form.periodo}
                  onValueChange={(v) => setForm({ ...form, periodo: v as PeriodoMeta })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMANAL">Semanal</SelectItem>
                    <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                    <SelectItem value="MENSUAL">Mensual</SelectItem>
                    <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.tipo || 
                !form.valor || 
                !form.fechaFin ||
                (userRole !== 'RECLUTADOR' && reclutadores.length > 0 && !form.reclutadorId)
              }
            >
              {editingMeta ? 'Actualizar' : 'Crear'} Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDeleteMetaId)} onOpenChange={(open) => !open && setPendingDeleteMetaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar meta</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (!pendingDeleteMetaId) return; await handleDelete(pendingDeleteMetaId); setPendingDeleteMetaId(null) }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
