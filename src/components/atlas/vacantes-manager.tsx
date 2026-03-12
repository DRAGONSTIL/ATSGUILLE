'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  Eye,
  EyeOff,
  Pause,
  Play,
  Copy,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { VacanteCreateSchema } from '@/lib/validations'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Loader2 } from 'lucide-react'

// Types
type EstatusVacante = 'BORRADOR' | 'PUBLICADA' | 'PAUSADA' | 'CERRADA'
type PrioridadVacante = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE'

interface Vacante {
  id: string
  empresaId?: string
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

interface VacantesManagerProps {
  vacantes: Vacante[]
  onCreate: (data: Partial<Vacante>) => void | Promise<void>
  onUpdate: (id: string, data: Partial<Vacante>) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  onSelect: (id: string) => void
  userRole: string
}

// Estatus config
const ESTATUS_CONFIG: Record<EstatusVacante, { label: string; color: string; icon: any }> = {
  BORRADOR: { label: 'Borrador', color: 'bg-slate-500/20 text-slate-400', icon: EyeOff },
  PUBLICADA: { label: 'Publicada', color: 'bg-green-500/20 text-green-400', icon: Eye },
  PAUSADA: { label: 'Pausada', color: 'bg-amber-500/20 text-amber-400', icon: Pause },
  CERRADA: { label: 'Cerrada', color: 'bg-red-500/20 text-red-400', icon: null },
}

// Prioridad config
const PRIORIDAD_CONFIG: Record<PrioridadVacante, { label: string; color: string }> = {
  BAJA: { label: 'Baja', color: 'bg-slate-500/20 text-slate-400' },
  MEDIA: { label: 'Media', color: 'bg-blue-500/20 text-blue-400' },
  ALTA: { label: 'Alta', color: 'bg-amber-500/20 text-amber-400' },
  URGENTE: { label: 'Urgente', color: 'bg-red-500/20 text-red-400' },
}

export function VacantesManager({
  vacantes,
  onCreate,
  onUpdate,
  onDelete,
  onSelect,
  userRole,
}: VacantesManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVacante, setEditingVacante] = useState<Vacante | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const vacanteForm = useForm<z.infer<typeof VacanteCreateSchema>>({
    resolver: zodResolver(VacanteCreateSchema) as any,
    defaultValues: {
      titulo: '',
      descripcion: '',
      ubicacion: '',
      salarioMin: undefined,
      salarioMax: undefined,
      modalidad: '__none__',
      tipoContrato: '__none__',
      requisitos: '',
      beneficios: '',
      fechaLimite: undefined,
      estatus: 'BORRADOR',
      prioridad: 'MEDIA',
      vacantes: 1,
    }
  })

  const openCreateDialog = () => {
    setEditingVacante(null)
    vacanteForm.reset({
      titulo: '',
      descripcion: '',
      ubicacion: '',
      salarioMin: undefined,
      salarioMax: undefined,
      modalidad: '__none__',
      tipoContrato: '__none__',
      requisitos: '',
      beneficios: '',
      fechaLimite: undefined,
      estatus: 'BORRADOR',
      prioridad: 'MEDIA',
      vacantes: 1,
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (vacante: Vacante) => {
    setEditingVacante(vacante)
    vacanteForm.reset({
      titulo: vacante.titulo,
      descripcion: vacante.descripcion || '',
      ubicacion: vacante.ubicacion || '',
      salarioMin: vacante.salarioMin ?? undefined,
      salarioMax: vacante.salarioMax ?? undefined,
      modalidad: vacante.modalidad || '__none__',
      tipoContrato: vacante.tipoContrato || '__none__',
      requisitos: vacante.requisitos || '',
      beneficios: vacante.beneficios || '',
      fechaLimite: vacante.fechaLimite ? new Date(vacante.fechaLimite) : undefined,
      estatus: vacante.estatus,
      prioridad: vacante.prioridad,
    } as any)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (data: z.infer<typeof VacanteCreateSchema>) => {
    setIsSubmitting(true)
    try {
      const formattedData: Partial<Vacante> = {
        titulo: data.titulo,
        descripcion: data.descripcion || null,
        ubicacion: data.ubicacion || null,
        salarioMin: data.salarioMin ? Number(data.salarioMin) : null,
        salarioMax: data.salarioMax ? Number(data.salarioMax) : null,
        modalidad: data.modalidad === '__none__' || !data.modalidad ? null : data.modalidad,
        tipoContrato: data.tipoContrato === '__none__' || !data.tipoContrato ? null : data.tipoContrato,
        requisitos: data.requisitos || null,
        beneficios: data.beneficios || null,
        fechaLimite: data.fechaLimite ? data.fechaLimite.toISOString() : null,
        estatus: data.estatus as EstatusVacante,
        prioridad: data.prioridad as PrioridadVacante,
      }

      if (editingVacante) {
        await onUpdate(editingVacante.id, formattedData)
      } else {
        await onCreate(formattedData)
      }
      setIsDialogOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canCreate = userRole === 'ADMIN' || userRole === 'GERENTE'
  const canEdit = userRole === 'ADMIN' || userRole === 'GERENTE'
  const canDelete = userRole === 'ADMIN'

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Vacantes
          </h2>
          {canCreate && (
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Vacante
            </Button>
          )}
        </div>

        {/* Grid de vacantes */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vacantes.map((vacante) => {
            const estatusConfig = ESTATUS_CONFIG[vacante.estatus]
            const prioridadConfig = PRIORIDAD_CONFIG[vacante.prioridad]
            const EstatusIcon = estatusConfig.icon

            return (
              <Card
                key={vacante.id}
                className="card-hover cursor-pointer"
                onClick={() => onSelect(vacante.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-1">{vacante.titulo}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={prioridadConfig.color}>
                          {prioridadConfig.label}
                        </Badge>
                        <Badge className={estatusConfig.color}>
                          {EstatusIcon && <EstatusIcon className="h-3 w-3 mr-1" />}
                          {estatusConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => onSelect(vacante.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => openEditDialog(vacante)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {vacante.estatus === 'PUBLICADA' && canEdit && (
                          <DropdownMenuItem onClick={() => onUpdate(vacante.id, { estatus: 'PAUSADA' })}>
                            <Pause className="mr-2 h-4 w-4" />
                            Pausar
                          </DropdownMenuItem>
                        )}
                        {vacante.estatus === 'PAUSADA' && canEdit && (
                          <DropdownMenuItem onClick={() => onUpdate(vacante.id, { estatus: 'PUBLICADA' })}>
                            <Play className="mr-2 h-4 w-4" />
                            Reactivar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => {
                          const empresaId = vacante.empresaId || ''
                          const url = `${window.location.origin}/jobs/${empresaId}`
                          navigator.clipboard.writeText(url)
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar link del portal
                        </DropdownMenuItem>
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(vacante.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vacante.descripcion && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {vacante.descripcion}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {vacante.ubicacion && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{vacante.ubicacion}</span>
                      </div>
                    )}

                    {vacante.salarioMin && vacante.salarioMax && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          ${vacante.salarioMin.toLocaleString()} - ${vacante.salarioMax.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{vacante.candidatosCount || 0} candidatos</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(vacante.createdAt), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {vacantes.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay vacantes</h3>
              <p className="text-muted-foreground mb-4">
                Comienza creando tu primera vacante
              </p>
              {canCreate && (
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Vacante
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de creación/edición */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingVacante ? 'Editar Vacante' : 'Nueva Vacante'}
            </DialogTitle>
          </DialogHeader>

          <Form {...(vacanteForm as any)}>
            <form id="vacante-form" onSubmit={vacanteForm.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
              <FormField control={vacanteForm.control} name="titulo" render={({ field }) => (
                <FormItem><FormLabel>Título *</FormLabel><FormControl><Input placeholder="Ej: Senior Full Stack Developer" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={vacanteForm.control} name="descripcion" render={({ field }) => (
                <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Descripción del puesto..." rows={3} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={vacanteForm.control} name="ubicacion" render={({ field }) => (
                  <FormItem><FormLabel>Ubicación</FormLabel><FormControl><Input placeholder="Ciudad de México" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={vacanteForm.control} name="estatus" render={({ field }) => (
                  <FormItem><FormLabel>Estatus</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="BORRADOR">Borrador</SelectItem><SelectItem value="PUBLICADA">Publicada</SelectItem><SelectItem value="PAUSADA">Pausada</SelectItem><SelectItem value="CERRADA">Cerrada</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={vacanteForm.control} name="modalidad" render={({ field }) => (
                  <FormItem><FormLabel>Modalidad</FormLabel><Select onValueChange={field.onChange} value={field.value || '__none__'}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">Sin especificar</SelectItem><SelectItem value="Presencial">Presencial</SelectItem><SelectItem value="Remoto">Remoto</SelectItem><SelectItem value="Híbrido">Híbrido</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={vacanteForm.control} name="tipoContrato" render={({ field }) => (
                  <FormItem><FormLabel>Tipo de Contrato</FormLabel><Select onValueChange={field.onChange} value={field.value || '__none__'}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">Sin especificar</SelectItem><SelectItem value="Tiempo completo">Tiempo completo</SelectItem><SelectItem value="Medio tiempo">Medio tiempo</SelectItem><SelectItem value="Contrato">Contrato</SelectItem><SelectItem value="Freelance">Freelance</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={vacanteForm.control} name="requisitos" render={({ field }) => (
                <FormItem><FormLabel>Requisitos</FormLabel><FormControl><Textarea placeholder="Experiencia requerida, habilidades..." rows={3} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={vacanteForm.control} name="beneficios" render={({ field }) => (
                <FormItem><FormLabel>Beneficios</FormLabel><FormControl><Textarea placeholder="Seguro médico, home office..." rows={3} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={vacanteForm.control} name="fechaLimite" render={({ field }) => (
                <FormItem><FormLabel>Fecha límite</FormLabel><FormControl><Input type="date" {...field} value={field.value ? String(field.value).slice(0, 10) : ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={vacanteForm.control} name="salarioMin" render={({ field }) => (
                  <FormItem><FormLabel>Salario Mínimo</FormLabel><FormControl><Input type="number" placeholder="35000" {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={vacanteForm.control} name="salarioMax" render={({ field }) => (
                  <FormItem><FormLabel>Salario Máximo</FormLabel><FormControl><Input type="number" placeholder="55000" {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={vacanteForm.control} name="prioridad" render={({ field }) => (
                <FormItem><FormLabel>Prioridad</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="BAJA">Baja</SelectItem><SelectItem value="MEDIA">Media</SelectItem><SelectItem value="ALTA">Alta</SelectItem><SelectItem value="URGENTE">Urgente</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </form>
          </Form>

          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="vacante-form" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingVacante ? 'Guardar Cambios' : 'Crear Vacante'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
