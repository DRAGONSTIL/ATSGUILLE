'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  StickyNote, CheckSquare, Plus, Edit2, Trash2, Clock, Flag, User, CheckCircle,
  AlertCircle, FileText, Archive
} from 'lucide-react'
import { format } from 'date-fns'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { es } from 'date-fns/locale'

interface Nota {
  id: string
  titulo?: string
  contenido: string
  tipo: string
  createdAt: string
}

interface Tarea {
  id: string
  titulo: string
  descripcion?: string
  prioridad: string
  estatus: string
  fechaLimite?: string
  asignadoA?: { id: string; name?: string | null }
  createdAt: string
}

interface Usuario {
  id: string
  name?: string | null
  email: string
  rol: string
}

interface NotasTareasManagerProps {
  userId: string
  addNotification: (n: { type: string; title: string; message?: string }) => void
}

export function NotasTareasManager({ userId, addNotification }: NotasTareasManagerProps) {
  const [notas, setNotas] = useState<Nota[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  const [showNotaDialog, setShowNotaDialog] = useState(false)
  const [pendingDeleteNotaId, setPendingDeleteNotaId] = useState<string | null>(null)
  const [showTareaDialog, setShowTareaDialog] = useState(false)
  const [editingNota, setEditingNota] = useState<Nota | null>(null)
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null)

  const [notaForm, setNotaForm] = useState({ titulo: '', contenido: '', tipo: 'GENERAL' })
  const [tareaForm, setTareaForm] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'MEDIA',
    estatus: 'PENDIENTE',
    fechaLimite: '',
    asignadoAId: ''
  })
  const [tareaFilters, setTareaFilters] = useState({
    q: '',
    estatus: 'ALL',
    prioridad: 'ALL',
    onlyMine: false,
    overdue: false,
  })

  useEffect(() => {
    loadData()
  }, [tareaFilters])

  const getResponseError = async (res: Response) => {
    try {
      const data = await res.json()
      return data?.error || 'Error de servidor'
    } catch {
      return 'Error de servidor'
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const tareaParams = new URLSearchParams()
      if (tareaFilters.q.trim()) tareaParams.set('q', tareaFilters.q.trim())
      if (tareaFilters.estatus !== 'ALL') tareaParams.set('estatus', tareaFilters.estatus)
      if (tareaFilters.prioridad !== 'ALL') tareaParams.set('prioridad', tareaFilters.prioridad)
      if (tareaFilters.onlyMine) tareaParams.set('onlyMine', 'true')
      if (tareaFilters.overdue) tareaParams.set('overdue', 'true')

      const [notasRes, tareasRes, usuariosRes] = await Promise.all([
        fetch('/api/notas'),
        fetch(`/api/tareas?${tareaParams.toString()}`),
        fetch('/api/usuarios'),
      ])
      if (notasRes.ok) {
        const data = await notasRes.json()
        setNotas(data.notas || [])
      }
      if (tareasRes.ok) {
        const data = await tareasRes.json()
        setTareas(data.tareas || [])
      }
      if (usuariosRes.ok) {
        const data = await usuariosRes.json()
        setUsuarios(data.usuarios || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNota = async () => {
    try {
      const url = editingNota ? `/api/notas?id=${editingNota.id}` : '/api/notas'
      const method = editingNota ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingNota ? { id: editingNota.id, ...notaForm } : notaForm),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: editingNota ? 'Nota actualizada' : 'Nota creada' })
        setShowNotaDialog(false)
        setNotaForm({ titulo: '', contenido: '', tipo: 'GENERAL' })
        setEditingNota(null)
        loadData()
      } else {
        addNotification({ type: 'error', title: await getResponseError(res) })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al guardar nota' })
    }
  }

  const handleSaveTarea = async () => {
    try {
      const url = editingTarea ? `/api/tareas?id=${editingTarea.id}` : '/api/tareas'
      const method = editingTarea ? 'PUT' : 'POST'

      const data: any = {
        titulo: tareaForm.titulo,
        descripcion: tareaForm.descripcion,
        prioridad: tareaForm.prioridad,
        estatus: tareaForm.estatus,
      }
      if (tareaForm.fechaLimite) data.fechaLimite = tareaForm.fechaLimite
      if (tareaForm.asignadoAId) data.asignadoAId = tareaForm.asignadoAId

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTarea ? { id: editingTarea.id, ...data } : data),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: editingTarea ? 'Tarea actualizada' : 'Tarea creada' })
        setShowTareaDialog(false)
        setTareaForm({ titulo: '', descripcion: '', prioridad: 'MEDIA', estatus: 'PENDIENTE', fechaLimite: '', asignadoAId: '' })
        setEditingTarea(null)
        loadData()
      } else {
        addNotification({ type: 'error', title: await getResponseError(res) })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al guardar tarea' })
    }
  }

  const handleCompleteTarea = async (id: string, completed: boolean) => {
    try {
      const res = await fetch('/api/tareas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estatus: completed ? 'COMPLETADA' : 'PENDIENTE' }),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: completed ? 'Tarea completada' : 'Tarea reabierta' })
        loadData()
      } else {
        addNotification({ type: 'error', title: await getResponseError(res) })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al actualizar tarea' })
    }
  }

  const handleDeleteNota = async (id: string) => {
    try {
      const res = await fetch(`/api/notas?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        addNotification({ type: 'success', title: 'Nota eliminada' })
        loadData()
      } else {
        addNotification({ type: 'error', title: await getResponseError(res) })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al eliminar' })
    }
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'URGENTE': return 'bg-red-500/20 text-red-400'
      case 'ALTA': return 'bg-orange-500/20 text-orange-400'
      case 'MEDIA': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'IMPORTANTE': return 'bg-red-500/20 text-red-400'
      case 'REUNION': return 'bg-blue-500/20 text-blue-400'
      case 'IDEA': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const tareasPendientes = tareas.filter(t => t.estatus !== 'COMPLETADA')
  const tareasCompletadas = tareas.filter(t => t.estatus === 'COMPLETADA')

  if (loading) {
    return <div className="flex justify-center py-8"><StickyNote className="h-8 w-8 animate-pulse text-primary" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent">Notas y Tareas</h2>
          <p className="text-muted-foreground">Suite de productividad premium para seguimiento operativo impecable.</p>
        </div>
      </div>

      <Tabs defaultValue="tareas" className="w-full rounded-2xl border border-amber-300/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/20 p-4 shadow-[0_0_60px_rgba(251,191,36,0.12)]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tareas" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Tareas ({tareasPendientes.length})
          </TabsTrigger>
          <TabsTrigger value="notas" className="gap-2">
            <StickyNote className="h-4 w-4" />
            Notas ({notas.length})
          </TabsTrigger>
        </TabsList>

        {/* TAREAS */}
        <TabsContent value="tareas" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input
              placeholder="Buscar tarea..."
              value={tareaFilters.q}
              onChange={(e) => setTareaFilters((prev) => ({ ...prev, q: e.target.value }))}
              className="md:col-span-2"
            />
            <Select value={tareaFilters.estatus} onValueChange={(v) => setTareaFilters((prev) => ({ ...prev, estatus: v }))}>
              <SelectTrigger><SelectValue placeholder="Estatus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estatus</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_PROGRESO">En progreso</SelectItem>
                <SelectItem value="COMPLETADA">Completada</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tareaFilters.prioridad} onValueChange={(v) => setTareaFilters((prev) => ({ ...prev, prioridad: v }))}>
              <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las prioridades</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="MEDIA">Media</SelectItem>
                <SelectItem value="BAJA">Baja</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant={tareaFilters.onlyMine ? 'default' : 'outline'} onClick={() => setTareaFilters((prev) => ({ ...prev, onlyMine: !prev.onlyMine }))}>Mis tareas</Button>
              <Button variant={tareaFilters.overdue ? 'destructive' : 'outline'} onClick={() => setTareaFilters((prev) => ({ ...prev, overdue: !prev.overdue }))}>Vencidas</Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingTarea(null)
              setTareaForm({ titulo: '', descripcion: '', prioridad: 'MEDIA', estatus: 'PENDIENTE', fechaLimite: '', asignadoAId: '' })
              setShowTareaDialog(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarea
            </Button>
          </div>

          {tareasPendientes.length === 0 ? (
            <Card className="py-8">
              <CardContent className="text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>¡No hay tareas pendientes!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tareasPendientes.map((tarea) => (
                <Card key={tarea.id} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={tarea.estatus === 'COMPLETADA'}
                        className="mt-1"
                        onCheckedChange={(checked) => handleCompleteTarea(tarea.id, !!checked)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tarea.titulo}</p>
                          <Badge className={getPrioridadColor(tarea.prioridad)}>{tarea.prioridad}</Badge>
                          <Badge variant="outline">{tarea.estatus}</Badge>
                        </div>
                        {tarea.descripcion && (
                          <p className="text-sm text-muted-foreground mt-1">{tarea.descripcion}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {tarea.fechaLimite && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(tarea.fechaLimite), "d MMM", { locale: es })}
                            </span>
                          )}
                          {tarea.asignadoA && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {tarea.asignadoA.name || tarea.asignadoA.id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingTarea(tarea)
                        setTareaForm({
                          titulo: tarea.titulo,
                          descripcion: tarea.descripcion || '',
                          prioridad: tarea.prioridad,
                          estatus: tarea.estatus,
                          fechaLimite: tarea.fechaLimite ? tarea.fechaLimite.split('T')[0] : '',
                          asignadoAId: ''
                        })
                        setShowTareaDialog(true)
                      }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {tareasCompletadas.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Completadas ({tareasCompletadas.length})
              </h4>
              <div className="space-y-2 opacity-60">
                {tareasCompletadas.slice(0, 5).map((tarea) => (
                  <div key={tarea.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="line-through">{tarea.titulo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* NOTAS */}
        <TabsContent value="notas" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingNota(null)
              setNotaForm({ titulo: '', contenido: '', tipo: 'GENERAL' })
              setShowNotaDialog(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Nota
            </Button>
          </div>

          {notas.length === 0 ? (
            <Card className="py-8">
              <CardContent className="text-center text-muted-foreground">
                <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay notas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {notas.map((nota) => (
                <Card key={nota.id} className="card-hover">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        {nota.titulo && <CardTitle className="text-base">{nota.titulo}</CardTitle>}
                        <Badge className={getTipoColor(nota.tipo)} variant="outline">{nota.tipo}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingNota(nota)
                          setNotaForm({
                            titulo: nota.titulo || '',
                            contenido: nota.contenido,
                            tipo: nota.tipo
                          })
                          setShowNotaDialog(true)
                        }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPendingDeleteNotaId(nota.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{nota.contenido}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(nota.createdAt), "d MMM yyyy", { locale: es })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Nota */}
      <Dialog open={showNotaDialog} onOpenChange={setShowNotaDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNota ? 'Editar Nota' : 'Nueva Nota'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título (opcional)</Label>
              <Input value={notaForm.titulo} onChange={(e) => setNotaForm({ ...notaForm, titulo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contenido</Label>
              <Textarea value={notaForm.contenido} onChange={(e) => setNotaForm({ ...notaForm, contenido: e.target.value })} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={notaForm.tipo} onValueChange={(v) => setNotaForm({ ...notaForm, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="IMPORTANTE">Importante</SelectItem>
                  <SelectItem value="REUNION">Reunión</SelectItem>
                  <SelectItem value="IDEA">Idea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotaDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveNota} disabled={!notaForm.contenido}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tarea */}
      <Dialog open={showTareaDialog} onOpenChange={setShowTareaDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTarea ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={tareaForm.titulo} onChange={(e) => setTareaForm({ ...tareaForm, titulo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={tareaForm.descripcion} onChange={(e) => setTareaForm({ ...tareaForm, descripcion: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={tareaForm.prioridad} onValueChange={(v) => setTareaForm({ ...tareaForm, prioridad: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAJA">Baja</SelectItem>
                    <SelectItem value="MEDIA">Media</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estatus</Label>
                <Select value={tareaForm.estatus} onValueChange={(v) => setTareaForm({ ...tareaForm, estatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="EN_PROGRESO">En progreso</SelectItem>
                    <SelectItem value="COMPLETADA">Completada</SelectItem>
                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha límite</Label>
                <Input type="date" value={tareaForm.fechaLimite} onChange={(e) => setTareaForm({ ...tareaForm, fechaLimite: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Asignar a</Label>
              <Select value={tareaForm.asignadoAId || "none"} onValueChange={(v) => setTareaForm({ ...tareaForm, asignadoAId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email} ({u.rol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTareaDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTarea} disabled={!tareaForm.titulo}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDeleteNotaId)} onOpenChange={(open) => !open && setPendingDeleteNotaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar nota</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará la nota seleccionada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (!pendingDeleteNotaId) return; await handleDeleteNota(pendingDeleteNotaId); setPendingDeleteNotaId(null) }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
