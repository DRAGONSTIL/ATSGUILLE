'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  Mail,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  Calendar,
  Briefcase,
  UserX,
  Sparkles,
  MessageSquare,
  FileText,
  Building2,
  User,
  Clock,
  Code,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

// Types
interface EmailTemplate {
  id: string
  nombre: string
  asunto: string
  cuerpo: string
  tipo: string
  variables?: string | null
  activo: boolean
  createdAt: string
}

interface EmailTemplatesManagerProps {
  addNotification: (n: { type: string; title: string; message?: string }) => void
}

const TIPOS_TEMPLATE = [
  { value: 'ENTREVISTA', label: 'Invitación a Entrevista', icon: Calendar, color: 'bg-blue-500/20 text-blue-400' },
  { value: 'OFERTA', label: 'Oferta de Trabajo', icon: Briefcase, color: 'bg-green-500/20 text-green-400' },
  { value: 'RECHAZO', label: 'Rechazo de Candidato', icon: UserX, color: 'bg-red-500/20 text-red-400' },
  { value: 'BIENVENIDA', label: 'Bienvenida', icon: Sparkles, color: 'bg-amber-500/20 text-amber-400' },
  { value: 'SEGUIMIENTO', label: 'Seguimiento', icon: MessageSquare, color: 'bg-violet-500/20 text-violet-400' },
  { value: 'CUSTOM', label: 'Personalizado', icon: FileText, color: 'bg-slate-500/20 text-slate-400' },
]

const VARIABLES_DISPONIBLES = [
  { name: '{{nombre}}', description: 'Nombre del candidato' },
  { name: '{{apellido}}', description: 'Apellido del candidato' },
  { name: '{{email}}', description: 'Email del candidato' },
  { name: '{{empresa}}', description: 'Nombre de la empresa' },
  { name: '{{vacante}}', description: 'Título de la vacante' },
  { name: '{{fecha}}', description: 'Fecha de la entrevista' },
  { name: '{{hora}}', description: 'Hora de la entrevista' },
  { name: '{{ubicacion}}', description: 'Ubicación o enlace' },
  { name: '{{reclutador}}', description: 'Nombre del reclutador' },
  { name: '{{salario}}', description: 'Salario ofrecido' },
]

export function EmailTemplatesManager({ addNotification }: EmailTemplatesManagerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState<string | null>(null)

  // Form
  const [form, setForm] = useState({
    nombre: '',
    asunto: '',
    cuerpo: '',
    tipo: 'CUSTOM',
  })

  // Preview data
  const [previewData, setPreviewData] = useState({
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan.perez@email.com',
    empresa: 'Mi Empresa',
    vacante: 'Desarrollador Senior',
    fecha: '15 de Enero, 2025',
    hora: '10:00 AM',
    ubicacion: 'https://meet.google.com/abc-defg-hij',
    reclutador: 'María García',
    salario: '$50,000 MXN mensual',
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email-templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!form.nombre || !form.asunto || !form.cuerpo) {
      addNotification({ type: 'error', title: 'Completa todos los campos requeridos' })
      return
    }

    try {
      const data = {
        nombre: form.nombre,
        asunto: form.asunto,
        cuerpo: form.cuerpo,
        tipo: form.tipo,
      }

      const url = editingTemplate ? `/api/email-templates/${editingTemplate.id}` : '/api/email-templates'
      const method = editingTemplate ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        addNotification({
          type: 'success',
          title: editingTemplate ? 'Plantilla actualizada' : 'Plantilla creada',
        })
        setShowDialog(false)
        resetForm()
        loadTemplates()
      } else {
        const error = await res.json()
        addNotification({ type: 'error', title: error.error || 'Error al guardar' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al guardar plantilla' })
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/email-templates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        addNotification({ type: 'success', title: 'Plantilla eliminada' })
        loadTemplates()
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al eliminar' })
    }
  }

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    try {
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `${template.nombre} (Copia)`,
          asunto: template.asunto,
          cuerpo: template.cuerpo,
          tipo: template.tipo,
        }),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: 'Plantilla duplicada' })
        loadTemplates()
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al duplicar' })
    }
  }

  const handleToggleActivo = async (id: string, activo: boolean) => {
    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !activo }),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: activo ? 'Plantilla desactivada' : 'Plantilla activada' })
        loadTemplates()
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al actualizar' })
    }
  }

  const resetForm = () => {
    setForm({ nombre: '', asunto: '', cuerpo: '', tipo: 'CUSTOM' })
    setEditingTemplate(null)
  }

  const openPreview = (template: EmailTemplate) => {
    setPreviewTemplate(template)
    setShowPreviewDialog(true)
  }

  const getPreviewContent = (template: EmailTemplate) => {
    let contenido = template.cuerpo
    Object.entries(previewData).forEach(([key, value]) => {
      contenido = contenido.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
    return contenido
  }

  const insertVariable = (variable: string) => {
    setForm({ ...form, cuerpo: form.cuerpo + variable })
  }

  const getTipoInfo = (tipo: string) => {
    return TIPOS_TEMPLATE.find(t => t.value === tipo) || TIPOS_TEMPLATE[5]
  }

  // Agrupar por tipo
  const templatesPorTipo = templates.reduce((acc, template) => {
    if (!acc[template.tipo]) acc[template.tipo] = []
    acc[template.tipo].push(template)
    return acc
  }, {} as Record<string, EmailTemplate[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Mail className="h-8 w-8 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plantillas de Email</h2>
          <p className="text-muted-foreground">Gestiona tus plantillas para comunicación con candidatos</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Plantillas</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activas</p>
                <p className="text-2xl font-bold text-green-500">
                  {templates.filter(t => t.activo).length}
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tipos</p>
                <p className="text-2xl font-bold">{Object.keys(templatesPorTipo).length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivas</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {templates.filter(t => !t.activo).length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates por tipo */}
      {Object.entries(templatesPorTipo).map(([tipo, tipoTemplates]) => {
        const tipoInfo = getTipoInfo(tipo)
        const TipoIcon = tipoInfo.icon
        return (
          <div key={tipo} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={tipoInfo.color}>
                <TipoIcon className="h-3 w-3 mr-1" />
                {tipoInfo.label}
              </Badge>
              <span className="text-sm text-muted-foreground">({tipoTemplates.length})</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tipoTemplates.map(template => (
                <Card
                  key={template.id}
                  className={`hover:shadow-md transition-shadow ${!template.activo ? 'opacity-60' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {template.nombre}
                          {!template.activo && (
                            <Badge variant="outline" className="text-xs">Inactiva</Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{template.asunto}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openPreview(template)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Vista Previa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingTemplate(template)
                            setForm({
                              nombre: template.nombre,
                              asunto: template.asunto,
                              cuerpo: template.cuerpo,
                              tipo: template.tipo,
                            })
                            setShowDialog(true)
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActivo(template.id, template.activo)}>
                            {template.activo ? (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPendingDeleteTemplateId(template.id)}
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
                    <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                      {template.cuerpo}
                    </p>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPreview(template)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Vista Previa
                      </Button>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(template.createdAt), 'd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      {templates.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay plantillas</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primera plantilla de email para agilizar tu comunicación
            </p>
            <Button onClick={() => { resetForm(); setShowDialog(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Plantilla
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog Crear/Editar Template */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla de Email'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de la Plantilla *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Invitación entrevista inicial"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_TEMPLATE.map((t) => {
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
            </div>

            <div className="space-y-2">
              <Label>Asunto del Email *</Label>
              <Input
                value={form.asunto}
                onChange={(e) => setForm({ ...form, asunto: e.target.value })}
                placeholder="Ej: Invitación a entrevista - {{empresa}}"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contenido del Email *</Label>
                <span className="text-xs text-muted-foreground">
                  Usa variables como {'{{nombre}}'}
                </span>
              </div>
              <Textarea
                value={form.cuerpo}
                onChange={(e) => setForm({ ...form, cuerpo: e.target.value })}
                placeholder="Hola {{nombre}},

Te escribimos de {{empresa}} para invitarte a una entrevista..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            {/* Variables disponibles */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Variables Disponibles
              </Label>
              <div className="flex flex-wrap gap-2">
                {VARIABLES_DISPONIBLES.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => insertVariable(v.name)}
                    className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 flex items-center gap-1 transition-colors"
                    title={v.description}
                  >
                    <span className="font-mono">{v.name}</span>
                    <span className="text-muted-foreground">- {v.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!form.nombre || !form.asunto || !form.cuerpo}>
              {editingTemplate ? 'Actualizar' : 'Crear'} Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Vista Previa */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa - {previewTemplate?.nombre}</DialogTitle>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Mail className="h-4 w-4" />
                  <span>Asunto:</span>
                </div>
                <p className="font-medium">{previewTemplate.asunto}</p>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Datos de Prueba
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {Object.entries(previewData).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-muted-foreground capitalize">{key}:</span>
                      <Input
                        value={value}
                        onChange={(e) => setPreviewData({ ...previewData, [key]: e.target.value })}
                        className="h-7 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contenido Renderizado</Label>
                <div className="p-4 rounded-lg border bg-card whitespace-pre-wrap text-sm min-h-[200px]">
                  {getPreviewContent(previewTemplate)}
                </div>
              </div>

              <div className="flex gap-2">
                <Badge className={getTipoInfo(previewTemplate.tipo).color}>
                  {getTipoInfo(previewTemplate.tipo).label}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Creada: {format(new Date(previewTemplate.createdAt), 'd MMM yyyy', { locale: es })}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(getPreviewContent(previewTemplate!))
                addNotification({ type: 'success', title: 'Contenido copiado al portapapeles' })
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Contenido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDeleteTemplateId)} onOpenChange={(open) => !open && setPendingDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plantilla</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará la plantilla y no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (!pendingDeleteTemplateId) return; await handleDeleteTemplate(pendingDeleteTemplateId); setPendingDeleteTemplateId(null) }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
