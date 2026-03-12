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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  CalendarIcon, Clock, Video, Phone, MapPin, Plus, Edit2, Trash2, CheckCircle, XCircle,
  Send, Star, MessageSquare, User
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Entrevista {
  id: string
  titulo?: string
  tipo?: string
  fecha: string
  duracion?: number
  ubicacion?: string
  enlace?: string
  notas?: string
  estatus: string
  candidato?: { id: string; nombre: string; apellido: string; email: string }
}

interface Candidato {
  id: string
  nombre: string
  apellido: string
  email: string
}

interface EntrevistasManagerProps {
  addNotification: (n: { type: string; title: string; message?: string }) => void
}

export function EntrevistasManager({ addNotification }: EntrevistasManagerProps) {
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([])
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [selectedEntrevista, setSelectedEntrevista] = useState<Entrevista | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>()

  const [form, setForm] = useState({
    candidatoId: '',
    titulo: '',
    tipo: 'VIDEO',
    fecha: '',
    hora: '10:00',
    duracion: '60',
    ubicacion: '',
    enlace: '',
    notas: '',
  })

  const [feedbackForm, setFeedbackForm] = useState({
    puntualidad: 3,
    comunicacion: 3,
    habilidadesTecnicas: 3,
    culturaFit: 3,
    experiencia: 3,
    fortalezas: '',
    areasMejora: '',
    recomendacion: 'CONSIDERAR',
    notas: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [entRes, candRes] = await Promise.all([
        fetch('/api/entrevistas'),
        fetch('/api/candidatos?limit=100'),
      ])
      if (entRes.ok) {
        const data = await entRes.json()
        setEntrevistas(data.entrevistas || [])
      }
      if (candRes.ok) {
        const data = await candRes.json()
        setCandidatos(data.candidatos || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const fechaHora = selectedDate ? new Date(selectedDate) : new Date()
      const [horas, minutos] = form.hora.split(':').map(Number)
      fechaHora.setHours(horas, minutos, 0, 0)

      const data = {
        candidatoId: form.candidatoId,
        titulo: form.titulo,
        tipo: form.tipo,
        fecha: fechaHora.toISOString(),
        duracion: parseInt(form.duracion),
        ubicacion: form.ubicacion,
        enlace: form.enlace,
        notas: form.notas,
      }

      const res = await fetch('/api/entrevistas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: 'Entrevista agendada' })
        setShowDialog(false)
        setForm({ candidatoId: '', titulo: '', tipo: 'VIDEO', fecha: '', hora: '10:00', duracion: '60', ubicacion: '', enlace: '', notas: '' })
        loadData()
      } else {
        const error = await res.json()
        addNotification({ type: 'error', title: error.error || 'Error al agendar' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al agendar entrevista' })
    }
  }

  const handleSaveFeedback = async () => {
    if (!selectedEntrevista) return
    try {
      const res = await fetch(`/api/entrevistas/${selectedEntrevista.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estatus: 'REALIZADA',
          feedback: JSON.stringify(feedbackForm),
        }),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: 'Feedback guardado' })
        setShowFeedbackDialog(false)
        loadData()
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al guardar feedback' })
    }
  }

  const getTipoIcon = (tipo?: string) => {
    switch (tipo) {
      case 'VIDEO': return <Video className="h-4 w-4" />
      case 'TELEFONICA': return <Phone className="h-4 w-4" />
      case 'PRESENCIAL': return <MapPin className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  const getStatusColor = (estatus: string) => {
    switch (estatus) {
      case 'PROGRAMADA': return 'bg-blue-500/20 text-blue-400'
      case 'REALIZADA': return 'bg-green-500/20 text-green-400'
      case 'CANCELADA': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const proximasEntrevistas = entrevistas.filter(e => 
    new Date(e.fecha) >= new Date() && e.estatus === 'PROGRAMADA'
  ).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

  const entrevistasPasadas = entrevistas.filter(e => 
    new Date(e.fecha) < new Date() || e.estatus !== 'PROGRAMADA'
  )

  if (loading) {
    return <div className="flex justify-center py-8"><Clock className="h-8 w-8 animate-pulse text-primary" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Entrevistas</h2>
          <p className="text-muted-foreground">Agenda y gestiona entrevistas con candidatos</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Entrevista
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Programadas</p>
                <p className="text-3xl font-bold text-blue-500">{proximasEntrevistas.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Realizadas</p>
                <p className="text-3xl font-bold text-green-500">{entrevistas.filter(e => e.estatus === 'REALIZADA').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Esta Semana</p>
                <p className="text-3xl font-bold text-primary">
                  {proximasEntrevistas.filter(e => {
                    const fecha = new Date(e.fecha)
                    const hoy = new Date()
                    const semanaSiguiente = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000)
                    return fecha >= hoy && fecha <= semanaSiguiente
                  }).length}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de entrevistas */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold">Próximas Entrevistas</h3>
        {proximasEntrevistas.length === 0 ? (
          <Card className="py-8">
            <CardContent className="text-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay entrevistas programadas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {proximasEntrevistas.map((ent) => (
              <Card key={ent.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/20">
                        {getTipoIcon(ent.tipo)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {ent.candidato?.nombre} {ent.candidato?.apellido}
                        </p>
                        <p className="text-sm text-muted-foreground">{ent.titulo || ent.tipo}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(ent.fecha), "d MMM yyyy", { locale: es })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(ent.fecha), "HH:mm")}
                          </span>
                          {ent.duracion && <span>{ent.duracion} min</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(ent.estatus)}>{ent.estatus}</Badge>
                      {ent.enlace && (
                        <Button variant="outline" size="sm" onClick={() => window.open(ent.enlace, '_blank')}>
                          <Video className="h-4 w-4 mr-1" />
                          Unirse
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedEntrevista(ent)
                        setShowFeedbackDialog(true)
                      }}>
                        Feedback
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Nueva Entrevista */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar Entrevista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Candidato</Label>
              <Select value={form.candidatoId} onValueChange={(v) => setForm({ ...form, candidatoId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar candidato" />
                </SelectTrigger>
                <SelectContent>
                  {candidatos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre} {c.apellido} - {c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Entrevista técnica..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">Video llamada</SelectItem>
                    <SelectItem value="TELEFONICA">Telefónica</SelectItem>
                    <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                    <SelectItem value="TECNICA">Técnica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duración (min)</Label>
                <Select value={form.duracion} onValueChange={(v) => setForm({ ...form, duracion: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {selectedDate ? format(selectedDate, "d MMM yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Enlace de videollamada</Label>
              <Input value={form.enlace} onChange={(e) => setForm({ ...form, enlace: e.target.value })} placeholder="https://meet.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Ubicación / Notas</Label>
              <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.candidatoId}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Feedback */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>Feedback de Entrevista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {['Puntualidad', 'Comunicación', 'Técnicas', 'Cultura', 'Experiencia'].map((label, i) => {
                const keys = ['puntualidad', 'comunicacion', 'habilidadesTecnicas', 'culturaFit', 'experiencia'] as const
                return (
                  <div key={keys[i]} className="text-center">
                    <Label className="text-xs">{label}</Label>
                    <div className="flex justify-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setFeedbackForm({ ...feedbackForm, [keys[i]]: star })}
                          className={cn("p-0.5", feedbackForm[keys[i]] >= star ? 'text-amber-500' : 'text-muted')}
                        >
                          <Star className="h-4 w-4 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fortalezas</Label>
                <Textarea value={feedbackForm.fortalezas} onChange={(e) => setFeedbackForm({ ...feedbackForm, fortalezas: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Áreas de mejora</Label>
                <Textarea value={feedbackForm.areasMejora} onChange={(e) => setFeedbackForm({ ...feedbackForm, areasMejora: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Recomendación</Label>
              <Select value={feedbackForm.recomendacion} onValueChange={(v) => setFeedbackForm({ ...feedbackForm, recomendacion: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTRATAR">✅ Contratar</SelectItem>
                  <SelectItem value="CONSIDERAR">🤔 Considerar</SelectItem>
                  <SelectItem value="RECHAZAR">❌ No contratar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea value={feedbackForm.notas} onChange={(e) => setFeedbackForm({ ...feedbackForm, notas: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveFeedback}>Guardar Feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
