'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  ClipboardCheck,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Award,
  Code,
  Brain,
  FileQuestion,
  Play,
  Eye,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

// Types
interface Pregunta {
  id: string
  pregunta: string
  tipo: string
  opciones?: string | null
  puntaje: number
  orden: number
}

interface Evaluacion {
  id: string
  titulo: string
  descripcion?: string | null
  tipo: string
  duracion?: number | null
  puntajeMaximo: number
  puntajeAprobacion?: number | null
  instrucciones?: string | null
  activo: boolean
  createdAt: string
  preguntas?: Pregunta[]
  _count?: {
    respuestas: number
  }
}

interface RespuestaEvaluacion {
  id: string
  evaluacionId: string
  candidatoId: string
  respuestas: string
  puntaje?: number | null
  aprobado?: boolean | null
  tiempoEmpleado?: number | null
  completadoEn?: string | null
  candidato?: {
    id: string
    nombre: string
    apellido: string
    email: string
  }
  evaluacion?: {
    id: string
    titulo: string
    tipo: string
    puntajeMaximo: number
  }
}

interface Candidato {
  id: string
  nombre: string
  apellido: string
  email: string
}

interface EvaluacionesManagerProps {
  candidatos: Candidato[]
  addNotification: (n: { type: string; title: string; message?: string }) => void
}

const TIPOS_EVALUACION = [
  { value: 'TECNICA', label: 'Técnica', icon: Code, color: 'bg-blue-500/20 text-blue-400' },
  { value: 'CULTURA', label: 'Cultura Fit', icon: Brain, color: 'bg-violet-500/20 text-violet-400' },
  { value: 'PSICOMETRICA', label: 'Psicométrica', icon: Brain, color: 'bg-pink-500/20 text-pink-400' },
  { value: 'CUSTOM', label: 'Personalizada', icon: FileQuestion, color: 'bg-slate-500/20 text-slate-400' },
]

const TIPOS_PREGUNTA = [
  { value: 'OPCION_MULTIPLE', label: 'Opción Múltiple' },
  { value: 'VERDADERO_FALSO', label: 'Verdadero/Falso' },
  { value: 'TEXTO_LIBRE', label: 'Texto Libre' },
  { value: 'ESCALA', label: 'Escala (1-5)' },
]

export function EvaluacionesManager({ candidatos, addNotification }: EvaluacionesManagerProps) {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [respuestas, setRespuestas] = useState<RespuestaEvaluacion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('evaluaciones')

  // Dialogs
  const [showEvaluacionDialog, setShowEvaluacionDialog] = useState(false)
  const [showPreguntasDialog, setShowPreguntasDialog] = useState(false)
  const [showAsignarDialog, setShowAsignarDialog] = useState(false)
  const [showResultadosDialog, setShowResultadosDialog] = useState(false)
  const [editingEvaluacion, setEditingEvaluacion] = useState<Evaluacion | null>(null)
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<Evaluacion | null>(null)
  const [pendingDeleteEvaluacionId, setPendingDeleteEvaluacionId] = useState<string | null>(null)
  const [selectedRespuesta, setSelectedRespuesta] = useState<RespuestaEvaluacion | null>(null)

  // Evaluacion form
  const [evalForm, setEvalForm] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'TECNICA',
    duracion: '',
    puntajeMaximo: '100',
    puntajeAprobacion: '60',
    instrucciones: '',
  })

  // Pregunta form
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [newPregunta, setNewPregunta] = useState({
    pregunta: '',
    tipo: 'OPCION_MULTIPLE',
    opciones: '',
    puntaje: '1',
  })

  // Asignar form
  const [asignarForm, setAsignarForm] = useState({
    evaluacionId: '',
    candidatoIds: [] as string[],
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [evalRes, respRes] = await Promise.all([
        fetch('/api/evaluaciones'),
        fetch('/api/evaluaciones?includeRespuestas=true'),
      ])

      if (evalRes.ok) {
        const data = await evalRes.json()
        setEvaluaciones(data.evaluaciones || [])
      }
      if (respRes.ok) {
        const data = await respRes.json()
        setRespuestas(data.respuestas || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // CRUD Evaluacion
  const handleSaveEvaluacion = async () => {
    if (!evalForm.titulo) {
      addNotification({ type: 'error', title: 'El título es requerido' })
      return
    }

    try {
      const data = {
        titulo: evalForm.titulo,
        descripcion: evalForm.descripcion || undefined,
        tipo: evalForm.tipo,
        duracion: evalForm.duracion ? parseInt(evalForm.duracion) : undefined,
        puntajeMaximo: parseInt(evalForm.puntajeMaximo) || 100,
        puntajeAprobacion: evalForm.puntajeAprobacion ? parseInt(evalForm.puntajeAprobacion) : undefined,
        instrucciones: evalForm.instrucciones || undefined,
      }

      const url = editingEvaluacion ? `/api/evaluaciones/${editingEvaluacion.id}` : '/api/evaluaciones'
      const method = editingEvaluacion ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        addNotification({
          type: 'success',
          title: editingEvaluacion ? 'Evaluación actualizada' : 'Evaluación creada',
        })
        setShowEvaluacionDialog(false)
        resetEvalForm()
        loadData()
      } else {
        const error = await res.json()
        addNotification({ type: 'error', title: error.error || 'Error al guardar' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al guardar evaluación' })
    }
  }

  const handleDeleteEvaluacion = async (id: string) => {
    try {
      const res = await fetch(`/api/evaluaciones/${id}`, { method: 'DELETE' })
      if (res.ok) {
        addNotification({ type: 'success', title: 'Evaluación eliminada' })
        loadData()
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al eliminar' })
    }
  }

  // Preguntas
  const handleSavePreguntas = async () => {
    if (!selectedEvaluacion) return

    try {
      const res = await fetch(`/api/evaluaciones/${selectedEvaluacion.id}/preguntas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preguntas }),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: 'Preguntas guardadas' })
        setShowPreguntasDialog(false)
        loadData()
      } else {
        const error = await res.json()
        addNotification({ type: 'error', title: error.error || 'Error al guardar' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al guardar preguntas' })
    }
  }

  const addPregunta = () => {
    if (!newPregunta.pregunta) return

    const pregunta: Pregunta = {
      id: `temp-${Date.now()}`,
      pregunta: newPregunta.pregunta,
      tipo: newPregunta.tipo,
      opciones: newPregunta.opciones || null,
      puntaje: parseInt(newPregunta.puntaje) || 1,
      orden: preguntas.length,
    }
    setPreguntas([...preguntas, pregunta])
    setNewPregunta({ pregunta: '', tipo: 'OPCION_MULTIPLE', opciones: '', puntaje: '1' })
  }

  const removePregunta = (index: number) => {
    setPreguntas(preguntas.filter((_, i) => i !== index))
  }

  // Asignar evaluacion
  const handleAsignar = async () => {
    if (!asignarForm.evaluacionId || asignarForm.candidatoIds.length === 0) {
      addNotification({ type: 'error', title: 'Selecciona evaluación y candidatos' })
      return
    }

    try {
      const res = await fetch('/api/evaluaciones/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asignarForm),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: 'Evaluación asignada' })
        setShowAsignarDialog(false)
        setAsignarForm({ evaluacionId: '', candidatoIds: [] })
        loadData()
      } else {
        const error = await res.json()
        addNotification({ type: 'error', title: error.error || 'Error al asignar' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al asignar evaluación' })
    }
  }

  const toggleCandidatoSelection = (candidatoId: string) => {
    setAsignarForm(prev => ({
      ...prev,
      candidatoIds: prev.candidatoIds.includes(candidatoId)
        ? prev.candidatoIds.filter(id => id !== candidatoId)
        : [...prev.candidatoIds, candidatoId]
    }))
  }

  // Helpers
  const resetEvalForm = () => {
    setEvalForm({
      titulo: '',
      descripcion: '',
      tipo: 'TECNICA',
      duracion: '',
      puntajeMaximo: '100',
      puntajeAprobacion: '60',
      instrucciones: '',
    })
    setEditingEvaluacion(null)
  }

  const getTipoInfo = (tipo: string) => {
    return TIPOS_EVALUACION.find(t => t.value === tipo) || TIPOS_EVALUACION[3]
  }

  const formatTiempo = (segundos?: number | null) => {
    if (!segundos) return '-'
    const mins = Math.floor(segundos / 60)
    const secs = segundos % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <ClipboardCheck className="h-8 w-8 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Evaluaciones</h2>
          <p className="text-muted-foreground">Crea y asigna evaluaciones a candidatos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAsignarDialog(true)}
            disabled={evaluaciones.length === 0}
          >
            <Users className="h-4 w-4 mr-2" />
            Asignar
          </Button>
          <Button onClick={() => { resetEvalForm(); setShowEvaluacionDialog(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Evaluación
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Evaluaciones</p>
                <p className="text-2xl font-bold">{evaluaciones.length}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activas</p>
                <p className="text-2xl font-bold text-green-500">
                  {evaluaciones.filter(e => e.activo).length}
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
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-2xl font-bold text-blue-500">
                  {respuestas.filter(r => r.completadoEn).length}
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa Aprobación</p>
                <p className="text-2xl font-bold text-amber-500">
                  {respuestas.filter(r => r.aprobado).length > 0
                    ? Math.round((respuestas.filter(r => r.aprobado).length / respuestas.filter(r => r.completadoEn).length) * 100)
                    : 0}%
                </p>
              </div>
              <Award className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="evaluaciones" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Evaluaciones
          </TabsTrigger>
          <TabsTrigger value="resultados" className="gap-2">
            <Award className="h-4 w-4" />
            Resultados ({respuestas.filter(r => r.completadoEn).length})
          </TabsTrigger>
        </TabsList>

        {/* Evaluaciones Tab */}
        <TabsContent value="evaluaciones" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {evaluaciones.map(evaluacion => {
              const tipoInfo = getTipoInfo(evaluacion.tipo)
              const TipoIcon = tipoInfo.icon
              return (
                <Card key={evaluacion.id} className={`hover:shadow-md transition-shadow ${!evaluacion.activo ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${tipoInfo.color}`}>
                          <TipoIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{evaluacion.titulo}</CardTitle>
                          <Badge className={tipoInfo.color}>{tipoInfo.label}</Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedEvaluacion(evaluacion)
                            setPreguntas(evaluacion.preguntas || [])
                            setShowPreguntasDialog(true)
                          }}>
                            <FileQuestion className="h-4 w-4 mr-2" />
                            Editar Preguntas
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingEvaluacion(evaluacion)
                            setEvalForm({
                              titulo: evaluacion.titulo,
                              descripcion: evaluacion.descripcion || '',
                              tipo: evaluacion.tipo,
                              duracion: evaluacion.duracion?.toString() || '',
                              puntajeMaximo: evaluacion.puntajeMaximo.toString(),
                              puntajeAprobacion: evaluacion.puntajeAprobacion?.toString() || '',
                              instrucciones: evaluacion.instrucciones || '',
                            })
                            setShowEvaluacionDialog(true)
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPendingDeleteEvaluacionId(evaluacion.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {evaluacion.descripcion && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {evaluacion.descripcion}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {evaluacion.duracion && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {evaluacion.duracion} min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FileQuestion className="h-3 w-3" />
                        {evaluacion.preguntas?.length || 0} preguntas
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        Puntaje: {evaluacion.puntajeAprobacion || 0}/{evaluacion.puntajeMaximo}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {evaluacion._count?.respuestas || 0} intentos
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {evaluaciones.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay evaluaciones</h3>
                <p className="text-muted-foreground mb-4">
                  Crea tu primera evaluación para evaluar candidatos
                </p>
                <Button onClick={() => { resetEvalForm(); setShowEvaluacionDialog(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Evaluación
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Resultados Tab */}
        <TabsContent value="resultados" className="space-y-4">
          <div className="space-y-3">
            {respuestas.filter(r => r.completadoEn).map(respuesta => (
              <Card key={respuesta.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {respuesta.candidato?.nombre?.[0]}
                          {respuesta.candidato?.apellido?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {respuesta.candidato?.nombre} {respuesta.candidato?.apellido}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {respuesta.evaluacion?.titulo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">{respuesta.puntaje || 0}</p>
                        <p className="text-xs text-muted-foreground">
                          de {respuesta.evaluacion?.puntajeMaximo || 100}
                        </p>
                      </div>
                      <div className={`p-2 rounded-full ${
                        respuesta.aprobado
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {respuesta.aprobado ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <X className="h-5 w-5" />
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRespuesta(respuesta)
                          setShowResultadosDialog(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {respuesta.tiempoEmpleado && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTiempo(respuesta.tiempoEmpleado)}
                      </span>
                    )}
                    {respuesta.completadoEn && (
                      <span>
                        {format(new Date(respuesta.completadoEn), 'd MMM yyyy, HH:mm', { locale: es })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {respuestas.filter(r => r.completadoEn).length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay resultados</h3>
                <p className="text-muted-foreground mb-4">
                  Asigna evaluaciones a candidatos para ver resultados
                </p>
                <Button onClick={() => setShowAsignarDialog(true)} disabled={evaluaciones.length === 0}>
                  <Users className="h-4 w-4 mr-2" />
                  Asignar Evaluación
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Crear/Editar Evaluacion */}
      <Dialog open={showEvaluacionDialog} onOpenChange={setShowEvaluacionDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvaluacion ? 'Editar Evaluación' : 'Nueva Evaluación'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={evalForm.titulo}
                onChange={(e) => setEvalForm({ ...evalForm, titulo: e.target.value })}
                placeholder="Ej: Prueba de JavaScript"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={evalForm.descripcion}
                onChange={(e) => setEvalForm({ ...evalForm, descripcion: e.target.value })}
                placeholder="Descripción de la evaluación..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={evalForm.tipo}
                  onValueChange={(v) => setEvalForm({ ...evalForm, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_EVALUACION.map((t) => {
                      const Icon = t.icon
                      return (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {t.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duración (min)</Label>
                <Input
                  type="number"
                  value={evalForm.duracion}
                  onChange={(e) => setEvalForm({ ...evalForm, duracion: e.target.value })}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Puntaje Máximo</Label>
                <Input
                  type="number"
                  value={evalForm.puntajeMaximo}
                  onChange={(e) => setEvalForm({ ...evalForm, puntajeMaximo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Puntaje Aprobación</Label>
                <Input
                  type="number"
                  value={evalForm.puntajeAprobacion}
                  onChange={(e) => setEvalForm({ ...evalForm, puntajeAprobacion: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Instrucciones</Label>
              <Textarea
                value={evalForm.instrucciones}
                onChange={(e) => setEvalForm({ ...evalForm, instrucciones: e.target.value })}
                placeholder="Instrucciones para el candidato..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvaluacionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEvaluacion} disabled={!evalForm.titulo}>
              {editingEvaluacion ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Preguntas */}
      <Dialog open={showPreguntasDialog} onOpenChange={setShowPreguntasDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preguntas - {selectedEvaluacion?.titulo}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Lista de preguntas */}
            <div className="space-y-2">
              {preguntas.map((p, index) => (
                <div key={p.id} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{index + 1}. {p.pregunta}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {TIPOS_PREGUNTA.find(t => t.value === p.tipo)?.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {p.puntaje} puntos
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removePregunta(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Nueva pregunta */}
            <div className="p-4 rounded-lg border border-dashed">
              <h4 className="font-medium mb-3">Agregar Pregunta</h4>
              <div className="space-y-3">
                <Textarea
                  value={newPregunta.pregunta}
                  onChange={(e) => setNewPregunta({ ...newPregunta, pregunta: e.target.value })}
                  placeholder="Escribe tu pregunta..."
                  rows={2}
                />
                <div className="grid grid-cols-3 gap-3">
                  <Select
                    value={newPregunta.tipo}
                    onValueChange={(v) => setNewPregunta({ ...newPregunta, tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PREGUNTA.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={newPregunta.puntaje}
                    onChange={(e) => setNewPregunta({ ...newPregunta, puntaje: e.target.value })}
                    placeholder="Puntos"
                  />
                  <Button onClick={addPregunta} disabled={!newPregunta.pregunta}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>
                {newPregunta.tipo === 'OPCION_MULTIPLE' && (
                  <Input
                    value={newPregunta.opciones}
                    onChange={(e) => setNewPregunta({ ...newPregunta, opciones: e.target.value })}
                    placeholder="Opciones separadas por coma: Opción A, Opción B, Opción C"
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreguntasDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePreguntas}>
              Guardar Preguntas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Asignar */}
      <Dialog open={showAsignarDialog} onOpenChange={setShowAsignarDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Evaluación</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Evaluación</Label>
              <Select
                value={asignarForm.evaluacionId}
                onValueChange={(v) => setAsignarForm({ ...asignarForm, evaluacionId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar evaluación" />
                </SelectTrigger>
                <SelectContent>
                  {evaluaciones.filter(e => e.activo).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Candidatos</Label>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {candidatos.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                      asignarForm.candidatoIds.includes(c.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleCandidatoSelection(c.id)}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      asignarForm.candidatoIds.includes(c.id)
                        ? 'bg-primary border-primary text-white'
                        : ''
                    }`}>
                      {asignarForm.candidatoIds.includes(c.id) && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {c.nombre[0]}{c.apellido[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{c.nombre} {c.apellido}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAsignarDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAsignar}
              disabled={!asignarForm.evaluacionId || asignarForm.candidatoIds.length === 0}
            >
              Asignar a {asignarForm.candidatoIds.length} candidatos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Resultado */}
      <Dialog open={showResultadosDialog} onOpenChange={setShowResultadosDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>Resultado de Evaluación</DialogTitle>
          </DialogHeader>

          {selectedRespuesta && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Avatar>
                  <AvatarFallback>
                    {selectedRespuesta.candidato?.nombre?.[0]}
                    {selectedRespuesta.candidato?.apellido?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedRespuesta.candidato?.nombre} {selectedRespuesta.candidato?.apellido}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRespuesta.candidato?.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold">{selectedRespuesta.puntaje || 0}</p>
                    <p className="text-sm text-muted-foreground">Puntaje</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className={`text-3xl font-bold ${selectedRespuesta.aprobado ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedRespuesta.aprobado ? 'Aprobado' : 'Reprobado'}
                    </p>
                    <p className="text-sm text-muted-foreground">Resultado</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evaluación:</span>
                  <span>{selectedRespuesta.evaluacion?.titulo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiempo:</span>
                  <span>{formatTiempo(selectedRespuesta.tiempoEmpleado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completado:</span>
                  <span>
                    {selectedRespuesta.completadoEn
                      ? format(new Date(selectedRespuesta.completadoEn), 'd MMM yyyy, HH:mm', { locale: es })
                      : '-'}
                  </span>
                </div>
              </div>

              <Progress
                value={((selectedRespuesta.puntaje || 0) / (selectedRespuesta.evaluacion?.puntajeMaximo || 100)) * 100}
                className="h-2"
              />
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultadosDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDeleteEvaluacionId)} onOpenChange={(open) => !open && setPendingDeleteEvaluacionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar evaluación</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará la evaluación seleccionada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (!pendingDeleteEvaluacionId) return; await handleDeleteEvaluacion(pendingDeleteEvaluacionId); setPendingDeleteEvaluacionId(null) }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
