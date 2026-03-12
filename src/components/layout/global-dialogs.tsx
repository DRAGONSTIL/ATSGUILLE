'use client'
import { createContext, useContext, useState } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUIStore } from '@/lib/store'
import { useDashboardData } from '@/components/layout/dashboard-context'
import { Loader2, UserX, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DocumentosManager } from '@/components/atlas/documentos-manager'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CandidatoCreateSchema, CandidatoUpdateSchema, type CandidatoCreate } from '@/lib/validations'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

type EstatusCandidato = 'REGISTRADO' | 'EN_PROCESO' | 'ENTREVISTA' | 'CONTRATADO' | 'RECHAZADO'
type FuenteCandidato = 'LINKEDIN' | 'OCC' | 'COMPUTRABAJA' | 'COMPUTRABAJO' | 'REFERIDO' | 'AGENCIA' | 'FERIA_EMPLEO' | 'UNIVERSIDAD' | 'RED_SOCIAL' | 'INDEED' | 'OTRO'
type EstatusVacante = 'BORRADOR' | 'PUBLICADA' | 'PAUSADA' | 'CERRADA'
type PrioridadVacante = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE'
type TipoDocumento = 'CV' | 'PORTAFOLIO' | 'CERTIFICADO' | 'OTRO'

interface Candidato {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string | null
  fuente: FuenteCandidato
  estatus: EstatusCandidato
  notas?: string | null
  linkedin?: string | null
  portfolio?: string | null
  salarioEsperado?: number | null
  rating?: number | null
  tags?: string | null
  createdAt: string
  vacante?: { id: string; titulo: string } | null
  reclutador?: { id: string; name: string | null } | null
  documentos?: { id: string; nombre: string; tipo: string; url: string; createdAt: string }[]
}

interface Vacante {
  id: string
  titulo: string
  descripcion?: string | null
  requisitos?: string | null
  beneficios?: string | null
  ubicacion?: string | null
  modalidad?: string | null
  tipoContrato?: string | null
  salarioMin?: number | null
  salarioMax?: number | null
  fechaLimite?: string | null
  estatus: EstatusVacante
  prioridad: PrioridadVacante
  createdAt: string
  candidatosCount?: number
  reclutador?: { id: string; name: string | null } | null
}


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

const CHART_COLORS = ['#d4af37', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']


const VALID_TABS = new Set([
  'dashboard',
  'pipeline',
  'vacantes',
  'directorio',
  'entrevistas',
  'notas',
  'emails',
  'evaluaciones',
  'reportes',
  'metas',
])

const GlobalDialogsContext = createContext<any>(null)

export function GlobalDialogsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const { addNotification } = useUIStore()
  const { candidatos, vacantes } = useDashboardData()
  const queryClient = useQueryClient()
  const router = useRouter()

  const [selectedCandidato, setSelectedCandidato] = useState<Candidato | null>(null)
  const [selectedVacante, setSelectedVacante] = useState<Vacante | null>(null)
  const [isCandidatoDialogOpen, setIsCandidatoDialogOpen] = useState(false)
  const [isVacanteDialogOpen, setIsVacanteDialogOpen] = useState(false)
  const [isNewCandidatoDialogOpen, setIsNewCandidatoDialogOpen] = useState(false)
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false)
  const [editingCandidatoMode, setEditingCandidatoMode] = useState(false)
  const [isUpdatingCandidato, setIsUpdatingCandidato] = useState(false)
  const editCandidatoForm = useForm<z.infer<typeof CandidatoUpdateSchema>>({
    resolver: zodResolver(CandidatoUpdateSchema) as any,
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      linkedin: '',
      portfolio: '',
      notas: '',
      tags: '',
      salarioEsperado: undefined,
      rating: 0,
      vacanteId: '',
    }
  })
  // Actividades
  const [candidatoActividades, setCandidatoActividades] = useState<any[]>([])
  const [loadingActividades, setLoadingActividades] = useState(false)
  const [actividadReciente, setActividadReciente] = useState<any[]>([])

  // New candidato form
  const [isCreatingCandidato, setIsCreatingCandidato] = useState(false)
  const newCandidatoForm = useForm<CandidatoCreate>({
    resolver: zodResolver(CandidatoCreateSchema) as any,
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      fuente: 'OTRO',
      vacanteId: '',
      notas: '',
      linkedin: '',
      portfolio: '',
      tags: '',
      salarioEsperado: undefined,
      equipoId: 'temp', // Updated on submit
    }
  })

  // Sync form
  const [syncForm, setSyncForm] = useState({
    equipoId: '',
  })

  // Cargar actividades del candidato
  const loadCandidatoActividades = async (candidatoId: string) => {
    setLoadingActividades(true)
    try {
      const res = await fetch(`/api/actividades?candidatoId=${candidatoId}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setCandidatoActividades(data.actividades || [])
      }
    } catch (error) {
      console.error('Error loading actividades:', error)
    } finally {
      setLoadingActividades(false)
    }
  }

  const hasUnsavedCandidatoChanges = editingCandidatoMode && editCandidatoForm.formState.isDirty

  const handleStatusChange = async (id: string, estatus: EstatusCandidato) => {
    try {
      const res = await fetch(`/api/candidatos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus }),
      })

      if (res.ok) {
        const candidatoActualizado = candidatos.find((c: any) => c.id === id)
        await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
        addNotification({
          type: 'success',
          title: 'Estatus actualizado',
          message: 'El estatus del candidato fue actualizado correctamente',
        })

        if (session?.user?.id && candidatoActualizado) {
          await fetch('/api/notificaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo: 'ESTATUS_CANDIDATO',
              titulo: 'Cambio de estatus',
              mensaje: `${candidatoActualizado.nombre} ${candidatoActualizado.apellido} movido a ${estatus}`,
              usuarioId: session.user.id,
            }),
          })
        }
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar el estatus',
      })
    }
  }



  const openCandidatoDialog = (candidato: Candidato) => {
    setSelectedCandidato(candidato)
    setIsCandidatoDialogOpen(true)
    setEditingCandidatoMode(false)
    editCandidatoForm.reset({
      nombre: candidato.nombre || '',
      apellido: candidato.apellido || '',
      email: candidato.email || '',
      telefono: candidato.telefono || '',
      linkedin: candidato.linkedin || '',
      portfolio: candidato.portfolio || '',
      notas: candidato.notas || '',
      tags: candidato.tags || '',
      salarioEsperado: candidato.salarioEsperado ? Number(candidato.salarioEsperado) : undefined,
      rating: candidato.rating || 0,
      vacanteId: candidato.vacante?.id || '',
    })
    loadCandidatoActividades(candidato.id)
  }

  const handleUpdateCandidato = async (data: z.infer<typeof CandidatoUpdateSchema>) => {
    if (!selectedCandidato) return
    setIsUpdatingCandidato(true)

    try {
      const payload = {
        ...data,
        rating: Number(data.rating) || 0,
        salarioEsperado: data.salarioEsperado ? Number(data.salarioEsperado) : undefined,
        vacanteId: data.vacanteId === '' || data.vacanteId === '__none__' ? null : data.vacanteId,
      }

      const res = await fetch(`/api/candidatos/${selectedCandidato.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error('Response not ok')
      }

      const updated = await res.json()
      await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
      setSelectedCandidato(updated)
      setEditingCandidatoMode(false)
      editCandidatoForm.reset({
        nombre: updated.nombre || '',
        apellido: updated.apellido || '',
        email: updated.email || '',
        telefono: updated.telefono || '',
        linkedin: updated.linkedin || '',
        portfolio: updated.portfolio || '',
        notas: updated.notas || '',
        tags: updated.tags || '',
        salarioEsperado: updated.salarioEsperado ? Number(updated.salarioEsperado) : undefined,
        rating: updated.rating || 0,
        vacanteId: updated.vacanteId || '',
      })
      addNotification({ type: 'success', title: 'Candidato actualizado' })
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al actualizar candidato' })
    } finally {
      setIsUpdatingCandidato(false)
    }
  }

  const handleBulkAction = async (ids: string[], action: string, data?: any) => {
    try {
      const res = await fetch('/api/candidatos/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, ...data }),
      })

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
        addNotification({
          type: 'success',
          title: 'Acción completada',
          message: `Se procesaron ${ids.length} candidatos`,
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo completar la acción',
      })
    }
  }


  const handleCommandOpenCandidate = (id: string) => {
    const candidato = candidatos.find((item: any) => item.id === id)
    if (candidato) {
      openCandidatoDialog(candidato)
      router.push('/directorio')
    }
  }

  const handleCommandOpenVacante = (id: string) => {
    const vacante = vacantes.find((item: any) => item.id === id)
    if (vacante) {
      setSelectedVacante(vacante)
      setIsVacanteDialogOpen(true)
      router.push('/vacantes')
    }
  }

  const handleDeleteCandidato = async (id: string) => {
    try {
      const res = await fetch(`/api/candidatos/${id}`, { method: 'DELETE' })

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
        setIsCandidatoDialogOpen(false)
        addNotification({
          type: 'success',
          title: 'Candidato eliminado',
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error al eliminar',
      })
    }
  }

  const handleCreateVacante = async (data: Partial<Vacante>) => {
    try {
      const res = await fetch('/api/vacantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const newVacante = await res.json()
        await queryClient.invalidateQueries({ queryKey: ['vacantes'] })
        addNotification({
          type: 'success',
          title: 'Vacante creada',
          message: `Se creó la vacante "${data.titulo}"`,
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error al crear vacante',
      })
    }
  }

  const handleUpdateVacante = async (id: string, data: Partial<Vacante>) => {
    try {
      const res = await fetch(`/api/vacantes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const updated = await res.json()
        await queryClient.invalidateQueries({ queryKey: ['vacantes'] })
        addNotification({
          type: 'success',
          title: 'Vacante actualizada',
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error al actualizar vacante',
      })
    }
  }

  const handleDeleteVacante = async (id: string) => {
    try {
      const res = await fetch(`/api/vacantes/${id}`, { method: 'DELETE' })

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['vacantes'] })
        setIsVacanteDialogOpen(false)
        addNotification({
          type: 'success',
          title: 'Vacante eliminada',
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error al eliminar vacante',
      })
    }
  }

  const handleCreateCandidato = async (data: CandidatoCreate) => {
    setIsCreatingCandidato(true)
    try {
      const equipoId = session?.user?.equipoId
      if (!equipoId) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'No tienes un equipo asignado. Contacta al administrador.',
        })
        return
      }

      const candidatoData = {
        ...data,
        vacanteId: data.vacanteId === '__none__' || !data.vacanteId ? undefined : data.vacanteId,
        salarioEsperado: data.salarioEsperado ? Number(data.salarioEsperado) : undefined,
        equipoId,
      }

      const res = await fetch('/api/candidatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidatoData),
      })

      const resData = await res.json()

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
        setIsNewCandidatoDialogOpen(false)
        newCandidatoForm.reset()
        addNotification({
          type: 'success',
          title: 'Candidato creado',
          message: `Se registró a ${data.nombre} ${data.apellido}`,
        })
      } else {
        addNotification({
          type: 'error',
          title: 'Error al crear candidato',
          message: resData.error || 'Error desconocido',
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error al crear candidato',
        message: 'Ocurrió un error inesperado',
      })
    } finally {
      setIsCreatingCandidato(false)
    }
  }

  const handleUploadDocument = async (file: File, tipo: TipoDocumento) => {
    if (!selectedCandidato) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('candidatoId', selectedCandidato.id)
    formData.append('tipo', tipo)

    try {
      const res = await fetch('/api/documentos', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const newDoc = await res.json()
        setSelectedCandidato((prev) =>
          prev ? { ...prev, documentos: [...(prev.documentos || []), newDoc] } : prev
        )
        addNotification({
          type: 'success',
          title: 'Documento subido',
          message: file.name,
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error al subir documento',
      })
    }
  }

  const handleDeleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/documentos?id=${id}`, { method: 'DELETE' })

      if (res.ok) {
        setSelectedCandidato((prev) =>
          prev
            ? { ...prev, documentos: prev.documentos?.filter((d) => d.id !== id) }
            : prev
        )
        addNotification({
          type: 'success',
          title: 'Documento eliminado',
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error al eliminar documento',
      })
    }
  }

  const handleSync = async () => {
    if (!syncForm.equipoId) {
      addNotification({ type: 'error', title: 'Selecciona un equipo' })
      return
    }

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId: syncForm.equipoId }),
      })

      if (res.ok) {
        const result = await res.json()
        addNotification({
          type: 'success',
          title: 'Sincronización completada',
          message: `${result.resultados?.total || 0} registros procesados`,
        })
        setIsSyncDialogOpen(false)
        await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
        await queryClient.invalidateQueries({ queryKey: ['vacantes'] })
      } else {
        const error = await res.json()
        addNotification({ type: 'error', title: error.error || 'Error en sincronización' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error en sincronización' })
    }
  }

  const contextValue = {
    openCandidatoDialog,
    setIsNewCandidatoDialogOpen,
    setSelectedVacante,
    setIsVacanteDialogOpen,
    setIsSyncDialogOpen,
    isCandidatoDialogOpen,
    isNewCandidatoDialogOpen,
    isVacanteDialogOpen,
    isSyncDialogOpen
  }

  return (
    <GlobalDialogsContext.Provider value={contextValue}>
      {children}
      {/* Candidato Detail Side-Panel */}
      <Sheet open={isCandidatoDialogOpen} onOpenChange={(nextOpen) => {
        setIsCandidatoDialogOpen(nextOpen)
        if (!nextOpen) {
          setEditingCandidatoMode(false)
        }
      }}>
        <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-screen overflow-y-auto sm:border-l">
          <SheetHeader className="pb-6 border-b mb-6">
            <SheetTitle className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border">
                  <AvatarFallback className="bg-primary/5 text-primary">
                    {selectedCandidato?.nombre[0]}{selectedCandidato?.apellido[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                  <span className="text-xl font-bold">{selectedCandidato?.nombre} {selectedCandidato?.apellido}</span>
                  {selectedCandidato?.vacante && (
                    <span className="text-sm text-muted-foreground font-normal">
                      {selectedCandidato.vacante.titulo}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditingCandidatoMode((prev) => !prev)}>
                {editingCandidatoMode ? 'Cancelar Edición' : 'Editar Perfil'}
              </Button>
            </SheetTitle>
          </SheetHeader>

          {selectedCandidato && (
            <div className="space-y-8 pb-12">
              {editingCandidatoMode ? (
                <Form {...(editCandidatoForm as any)}>
                  <form id="edit-candidato-form" onSubmit={editCandidatoForm.handleSubmit(handleUpdateCandidato)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={editCandidatoForm.control} name="nombre" render={({ field }) => (
                        <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={editCandidatoForm.control} name="apellido" render={({ field }) => (
                        <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={editCandidatoForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={editCandidatoForm.control} name="telefono" render={({ field }) => (
                        <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={editCandidatoForm.control} name="linkedin" render={({ field }) => (
                        <FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={editCandidatoForm.control} name="portfolio" render={({ field }) => (
                        <FormItem><FormLabel>Portfolio URL</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={editCandidatoForm.control} name="vacanteId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vacante</FormLabel>
                        <Select value={field.value || '__none__'} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecciona una vacante" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Sin vacante</SelectItem>
                            {vacantes.map((v) => <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editCandidatoForm.control} name="tags" render={({ field }) => (
                      <FormItem><FormLabel>Tags</FormLabel><FormControl><Input {...field} placeholder="ej: javascript, senior, remoto" value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editCandidatoForm.control} name="salarioEsperado" render={({ field }) => (
                      <FormItem><FormLabel>Salario esperado</FormLabel><FormControl><Input type="number" {...field} placeholder="MXN mensual" value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editCandidatoForm.control} name="rating" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} type="button" className={star <= (Number(field.value) || 0) ? 'text-amber-500 text-xl' : 'text-muted text-xl'} onClick={() => field.onChange(star)}>★</button>
                            ))}
                          </div>
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={editCandidatoForm.control} name="notas" render={({ field }) => (
                      <FormItem className="col-span-1 sm:col-span-2"><FormLabel>Notas</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value || ''} className="resize-none" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </form>
                </Form>
              ) : (
                <>
                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedCandidato.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Teléfono</Label>
                      <p className="font-medium">{selectedCandidato.telefono || 'No registrado'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Fuente</Label>
                      <p className="font-medium">{selectedCandidato.fuente}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Estatus</Label>
                      <div>
                        <Badge>{selectedCandidato.estatus}</Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Vacante</Label>
                      <p className="font-medium">{selectedCandidato.vacante?.titulo || 'Sin asignar'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Reclutador</Label>
                      <p className="font-medium">{selectedCandidato.reclutador?.name || 'Sin asignar'}</p>
                    </div>
                    {selectedCandidato.rating && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">Rating</Label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={star <= selectedCandidato.rating! ? 'text-amber-500' : 'text-muted'}>
                              â
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {selectedCandidato.tags && (
                    <div>
                      <Label className="text-muted-foreground">Etiquetas</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedCandidato.tags.split(',').map((tag, i) => (
                          <Badge key={i} variant="secondary">{tag.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  {selectedCandidato.notas && (
                    <div>
                      <Label className="text-muted-foreground">Notas</Label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                        {selectedCandidato.notas}
                      </p>
                    </div>
                  )}

                  {/* Documentos */}
                  <DocumentosManager
                    documentos={selectedCandidato.documentos || []}
                    candidatoId={selectedCandidato.id}
                    onUpload={handleUploadDocument}
                    onDelete={handleDeleteDocument}
                  />

                  {/* Historial de Actividad */}
                  <div>
                    <Label className="text-muted-foreground font-semibold">
                      Historial de Actividad
                    </Label>
                    {loadingActividades ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando historial...
                      </div>
                    ) : candidatoActividades.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">
                        Sin actividad registrada
                      </p>
                    ) : (
                      <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                        {candidatoActividades.map((act) => (
                          <div key={act.id} className="flex gap-3 text-sm p-2 rounded-lg bg-muted/50">
                            <div className="flex-1">
                              <p className="font-medium">{act.descripcion}</p>
                              <p className="text-xs text-muted-foreground">
                                {act.usuario?.name || 'Sistema'} · {' '}
                                {format(new Date(act.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex justify-end gap-2 pt-6 border-t mt-8">
                    <Select
                      onValueChange={(v) =>
                        handleStatusChange(selectedCandidato.id, v as EstatusCandidato)
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Cambiar estatus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REGISTRADO">Registrado</SelectItem>
                        <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                        <SelectItem value="ENTREVISTA">Entrevista</SelectItem>
                        <SelectItem value="CONTRATADO">Contratado</SelectItem>
                        <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteCandidato(selectedCandidato.id)}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Eliminar Perfil
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
          {editingCandidatoMode && (
            <SheetFooter className="absolute bottom-0 left-0 w-full p-4 bg-background border-t">
              <Button variant="outline" type="button" onClick={() => setEditingCandidatoMode(false)}>Cancelar</Button>
              <Button type="submit" form="edit-candidato-form" disabled={isUpdatingCandidato || !hasUnsavedCandidatoChanges}>
                {isUpdatingCandidato ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar cambios
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* New Candidato Dialog */}
      <Sheet open={isNewCandidatoDialogOpen} onOpenChange={setIsNewCandidatoDialogOpen}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl max-h-screen overflow-y-auto sm:border-l">
          <SheetHeader className="pb-6 border-b mb-6">
            <SheetTitle>Nuevo Candidato</SheetTitle>
          </SheetHeader>

          <Form {...(newCandidatoForm as any)}>
            <form onSubmit={newCandidatoForm.handleSubmit(handleCreateCandidato)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={newCandidatoForm.control} name="nombre" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={newCandidatoForm.control} name="apellido" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={newCandidatoForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={newCandidatoForm.control} name="telefono" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={newCandidatoForm.control} name="fuente" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                        <SelectItem value="OCC">OCC</SelectItem>
                        <SelectItem value="COMPUTRABAJO">Computrabajo</SelectItem>
                        <SelectItem value="INDEED">Indeed</SelectItem>
                        <SelectItem value="REFERIDO">Referido</SelectItem>
                        <SelectItem value="AGENCIA">Agencia</SelectItem>
                        <SelectItem value="FERIA_EMPLEO">Feria de Empleo</SelectItem>
                        <SelectItem value="UNIVERSIDAD">Universidad</SelectItem>
                        <SelectItem value="RED_SOCIAL">Red Social</SelectItem>
                        <SelectItem value="OTRO">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={newCandidatoForm.control} name="vacanteId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vacante</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Sin vacante específica</SelectItem>
                        {vacantes.filter((v: any) => v.estatus === 'PUBLICADA').map((v: any) => (
                          <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={newCandidatoForm.control} name="notas" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl><Textarea rows={3} {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={newCandidatoForm.control} name="linkedin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl><Input placeholder="https://linkedin.com/in/..." {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={newCandidatoForm.control} name="portfolio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio/Sitio Web</FormLabel>
                    <FormControl><Input placeholder="https://portfolio.com" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={newCandidatoForm.control} name="tags" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl><Input placeholder="javascript, senior, remoto" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={newCandidatoForm.control} name="salarioEsperado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salario esperado</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="MXN mensual"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="pb-20" />
              <SheetFooter className="absolute bottom-0 left-0 w-full p-4 bg-background border-t">
                <Button type="button" variant="outline" onClick={() => setIsNewCandidatoDialogOpen(false)} disabled={isCreatingCandidato}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreatingCandidato}>
                  {isCreatingCandidato && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Candidato
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Vacante Detail Dialog */}
      <Sheet open={isVacanteDialogOpen} onOpenChange={setIsVacanteDialogOpen}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg max-h-screen overflow-y-auto sm:border-l">
          <SheetHeader className="pb-6 border-b mb-6">
            <SheetTitle>{selectedVacante?.titulo}</SheetTitle>
          </SheetHeader>

          {selectedVacante && (
            <div className="space-y-4">
              {selectedVacante.descripcion && (
                <div>
                  <Label className="text-muted-foreground">Descripción</Label>
                  <p className="text-sm mt-1">{selectedVacante.descripcion}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Ubicación</Label>
                  <p>{selectedVacante.ubicacion || 'No especificada'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Salario</Label>
                  <p>
                    {selectedVacante.salarioMin && selectedVacante.salarioMax
                      ? `$${selectedVacante.salarioMin.toLocaleString()} - $${selectedVacante.salarioMax.toLocaleString()}`
                      : 'No especificado'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estatus</Label>
                  <Badge>{selectedVacante.estatus}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Prioridad</Label>
                  <Badge variant="outline">{selectedVacante.prioridad}</Badge>
                </div>
              </div>

              {selectedVacante.modalidad && <p className="text-sm"><span className="text-muted-foreground">Modalidad:</span> {selectedVacante.modalidad}</p>}
              {selectedVacante.tipoContrato && <p className="text-sm"><span className="text-muted-foreground">Tipo de contrato:</span> {selectedVacante.tipoContrato}</p>}
              {selectedVacante.requisitos && <p className="text-sm"><span className="text-muted-foreground">Requisitos:</span> {selectedVacante.requisitos}</p>}
              {selectedVacante.beneficios && <p className="text-sm"><span className="text-muted-foreground">Beneficios:</span> {selectedVacante.beneficios}</p>}
              {selectedVacante.fechaLimite && <p className="text-sm"><span className="text-muted-foreground">Fecha límite:</span> {format(new Date(selectedVacante.fechaLimite), 'dd/MM/yyyy')}</p>}

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedVacante.candidatosCount || 0} candidatos registrados
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sync Dialog */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sincronizar con Google Sheets</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona el equipo para sincronizar candidatos desde Google Sheets.
            </p>
            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select
                value={syncForm.equipoId}
                onValueChange={(v) => setSyncForm({ ...syncForm, equipoId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                  {/* Teams would be loaded dynamically */}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlobalDialogsContext.Provider>
  )
}

export const useGlobalDialogs = () => useContext(GlobalDialogsContext)

