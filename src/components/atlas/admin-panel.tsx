'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Building2,
  Users,
  UserPlus,
  Settings,
  Link2,
  Trash2,
  Edit2,
  Plus,
  CheckCircle,
  XCircle,
  Mail,
  Copy,
  MoreHorizontal,
  UserMinus,
  UserCheck,
  Shield,
  Crown,
  User,
  ExternalLink,
  RefreshCw,
  Info,
  Send,
} from 'lucide-react'

// Types
interface Empresa {
  id: string
  nombre: string
  logo?: string | null
  direccion?: string | null
  telefono?: string | null
  sitioWeb?: string | null
  industria?: string | null
  tamano?: string | null
  activa: boolean
  usuariosCount?: number
  equiposCount?: number
}

interface Equipo {
  id: string
  nombre: string
  descripcion?: string | null
  color?: string | null
  appsScriptUrl?: string | null
  empresaId: string
  empresa?: { id: string; nombre: string }
  usuariosCount?: number
  candidatosCount?: number
  usuarios?: Usuario[]
}

interface Usuario {
  id: string
  email: string
  name?: string | null
  rol: string
  activo: boolean
  empresa?: { id: string; nombre: string } | null
  equipo?: { id: string; nombre: string } | null
}

interface Invitacion {
  id: string
  email: string
  rol: string
  token: string
  code: string
  expiresAt: string
  status: 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED'
  usedAt?: string | null
  empresa?: { id: string; nombre: string } | null
  equipo?: { id: string; nombre: string } | null
}

interface AdminPanelProps {
  userRole: string
  empresaId: string | null
  onRefresh: () => void
  addNotification: (n: { type: string; title: string; message?: string }) => void
}

export function AdminPanel({ userRole, empresaId, onRefresh, addNotification }: AdminPanelProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(false)
  const [showDemoKeyDialog, setShowDemoKeyDialog] = useState(false)
  const [demoKeyForm, setDemoKeyForm] = useState({
    email: '',
    nombre: '',
    empresa: '',
    rolSolicitado: 'RECLUTADOR',
    diasExpiracion: 7,
  })

  // Dialogs
  const [showEmpresaDialog, setShowEmpresaDialog] = useState(false)
  const [showEquipoDialog, setShowEquipoDialog] = useState(false)
  const [showInvitarDialog, setShowInvitarDialog] = useState(false)
  const [showEditUserDialog, setShowEditUserDialog] = useState(false)
  const [showEquipoDetailDialog, setShowEquipoDetailDialog] = useState(false)
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string } | null>(null)
  
  // Estado para mostrar el link de invitación creado
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)

  // Forms
  const [empresaForm, setEmpresaForm] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    sitioWeb: '',
    industria: '',
    tamano: '',
  })

  const [equipoForm, setEquipoForm] = useState({
    nombre: '',
    descripcion: '',
    color: '#d4af37',
    appsScriptUrl: '',
    empresaId: '',
  })

  const [invitarForm, setInvitarForm] = useState({
    email: '',
    rol: 'RECLUTADOR',
    equipoId: '',
    mensaje: '',
    expiresInDays: 7,
  })

  const [editUserForm, setEditUserForm] = useState({
    name: '',
    rol: '',
    equipoId: '',
    activo: true,
  })

  const [addMemberForm, setAddMemberForm] = useState({
    usuarioId: '',
  })

  // Cargar datos
  const loadData = async () => {
    setLoading(true)
    try {
      const [empRes, eqRes, usrRes, invRes] = await Promise.all([
        fetch('/api/empresas'),
        fetch('/api/equipos'),
        fetch('/api/usuarios'),
        fetch('/api/auth/invite'),
      ])

      if (empRes.ok) {
        const data = await empRes.json()
        setEmpresas(data.empresas || [])
      }
      if (eqRes.ok) {
        const data = await eqRes.json()
        setEquipos(data.equipos || [])
      }
      if (usrRes.ok) {
        const data = await usrRes.json()
        setUsuarios(data.usuarios || [])
      }
      if (invRes.ok) {
        const data = await invRes.json()
        setInvitaciones(data.invitaciones || [])
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Crear/Editar empresa
  const handleSaveEmpresa = async () => {
    try {
      const url = editingEmpresa ? `/api/empresas?id=${editingEmpresa.id}` : '/api/empresas'
      const method = editingEmpresa ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empresaForm),
      })

      if (res.ok) {
        addNotification({
          type: 'success',
          title: editingEmpresa ? 'Empresa actualizada' : 'Empresa creada',
        })
        setShowEmpresaDialog(false)
        loadData()
        onRefresh()
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al guardar empresa' })
    }
  }

  // Crear/Editar equipo
  const handleSaveEquipo = async () => {
    try {
      const data = { ...equipoForm }
      
      // Para GERENTE, usar su empresa
      if (userRole === 'GERENTE') {
        data.empresaId = empresaId!
      }
      
      // Validar que ADMIN tenga empresa seleccionada
      if (userRole === 'ADMIN' && !editingEquipo && !data.empresaId) {
        addNotification({ type: 'error', title: 'Debes seleccionar una empresa' })
        return
      }

      const url = editingEquipo ? `/api/equipos?id=${editingEquipo.id}` : '/api/equipos'
      const method = editingEquipo ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const responseData = await res.json()

      if (res.ok) {
        addNotification({
          type: 'success',
          title: editingEquipo ? 'Equipo actualizado' : 'Equipo creado',
        })
        setShowEquipoDialog(false)
        loadData()
        onRefresh()
      } else {
        addNotification({ 
          type: 'error', 
          title: responseData.error || 'Error al guardar equipo',
          message: responseData.details
        })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al guardar equipo' })
    }
  }

  // Enviar invitación
  const handleSendInvitation = async () => {
    try {
      // Preparar datos - no enviar strings vacíos
      const payload: {
        email: string
        rol: string
        empresaId?: string
        equipoId?: string
        mensaje?: string
        expiresInDays: number
      } = {
        email: invitarForm.email,
        rol: invitarForm.rol,
        expiresInDays: invitarForm.expiresInDays,
      }

      if (userRole === 'GERENTE' && empresaId) {
        payload.empresaId = empresaId
      }

      if (invitarForm.equipoId && invitarForm.equipoId !== '__none__') {
        payload.equipoId = invitarForm.equipoId
      }

      if (invitarForm.mensaje?.trim()) {
        payload.mensaje = invitarForm.mensaje.trim()
      }

      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        // Guardar el link de invitación para mostrarlo
        if (data.invitacion?.id) {
          // Obtener el token de la invitación recién creada
          const inviteRes = await fetch('/api/auth/invite')
          if (inviteRes.ok) {
            const inviteData = await inviteRes.json()
            const newInvite = inviteData.invitaciones?.find((inv: Invitacion) => inv.email === invitarForm.email)
            if (newInvite) {
              const link = `${window.location.origin}/invite/${newInvite.token}`
              setCreatedInviteLink(link)
            }
          }
        }
        
        addNotification({
          type: 'success',
          title: 'Invitación enviada',
          message: `Se envió invitación a ${invitarForm.email}`,
        })
        setInvitarForm({ email: '', rol: 'RECLUTADOR', equipoId: '', mensaje: '', expiresInDays: 7 })
        loadData()
      } else {
        addNotification({ type: 'error', title: data.error || 'Error al enviar invitación', message: data.details })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al enviar invitación' })
    }
  }

  // Cancelar invitación
  const handleCancelInvitation = async (id: string) => {
    try {
      const res = await fetch(`/api/auth/invite?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        addNotification({ type: 'success', title: 'Invitación cancelada' })
        loadData()
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al cancelar invitación' })
    }
  }

  const handleResendInvitation = async (id: string) => {
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'resend' }),
      })

      const data = await res.json()

      if (!res.ok) {
        addNotification({ type: 'error', title: data.error || 'Error al reenviar invitación' })
        return
      }

      addNotification({ type: 'success', title: 'Invitación reenviada' })
      loadData()
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al reenviar invitación' })
    }
  }

  // Editar usuario
  const handleEditUser = async () => {
    if (!editingUser) return
    try {
      const payload: {
        name: string
        rol: string
        equipoId?: string | null
        activo: boolean
      } = {
        name: editUserForm.name,
        rol: editUserForm.rol,
        activo: editUserForm.activo,
      }

      // Solo enviar equipoId si no está vacío
      if (editUserForm.equipoId && editUserForm.equipoId !== '__none__') {
        payload.equipoId = editUserForm.equipoId
      } else if (editUserForm.equipoId === '' || editUserForm.equipoId === '__none__') {
        payload.equipoId = null
      }

      const res = await fetch(`/api/usuarios?id=${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        addNotification({ type: 'success', title: 'Usuario actualizado' })
        setShowEditUserDialog(false)
        loadData()
        onRefresh()
      } else {
        addNotification({ type: 'error', title: data.error || 'Error al actualizar usuario', message: data.details })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al actualizar usuario' })
    }
  }

  // Agregar miembro a equipo
  const handleAddMember = async () => {
    if (!selectedEquipo || !addMemberForm.usuarioId) return
    try {
      const res = await fetch('/api/admin/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: addMemberForm.usuarioId,
          equipoId: selectedEquipo.id,
        }),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: 'Miembro agregado al equipo' })
        setShowAddMemberDialog(false)
        setAddMemberForm({ usuarioId: '' })
        loadData()
      } else {
        const error = await res.json()
        addNotification({ type: 'error', title: error.error || 'Error al agregar miembro' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al agregar miembro' })
    }
  }

  // Remover miembro de equipo
  const handleRemoveMember = async (usuarioId: string) => {
    try {
      const res = await fetch('/api/admin/asignar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId }),
      })

      if (res.ok) {
        addNotification({ type: 'success', title: 'Miembro removido del equipo' })
        loadData()
      } else {
        const error = await res.json()
        addNotification({ type: 'error', title: error.error || 'Error al remover miembro' })
      }
    } catch (error) {
      addNotification({ type: 'error', title: 'Error al remover miembro' })
    }
  }

  // Copiar link de invitación
  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url)
    addNotification({ type: 'success', title: 'Link copiado al portapapeles' })
  }

  // Obtener usuarios sin equipo
  const usuariosSinEquipo = usuarios.filter(u => !u.equipo?.id)
  
  // Obtener miembros de un equipo
  const getEquipoMembers = (equipoId: string) => {
    return usuarios.filter(u => u.equipo?.id === equipoId)
  }

  // Obtener icono de rol
  const getRolIcon = (rol: string) => {
    switch (rol) {
      case 'ADMIN': return <Crown className="h-4 w-4" />
      case 'GERENTE': return <Shield className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Panel de Administración</h2>
          <p className="text-muted-foreground">Gestiona empresas, equipos y usuarios</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="equipos">
        <TabsList className={`grid w-full ${userRole === 'ADMIN' ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="equipos">Equipos</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="invitaciones">Invitaciones</TabsTrigger>
          {userRole === 'ADMIN' && (
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
          )}
        </TabsList>

        {/* Equipos */}
        <TabsContent value="equipos" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button onClick={() => {
              setEditingEquipo(null)
              setEquipoForm({ nombre: '', descripcion: '', color: '#d4af37', appsScriptUrl: '', empresaId: '' })
              setShowEquipoDialog(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Equipo
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {equipos.map((equipo) => {
              const members = getEquipoMembers(equipo.id)
              return (
                <Card key={equipo.id} className="card-hover">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: equipo.color || '#d4af37' }}
                        >
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{equipo.nombre}</CardTitle>
                          {equipo.empresa && (
                            <p className="text-xs text-muted-foreground">{equipo.empresa.nombre}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedEquipo(equipo)
                            setShowEquipoDetailDialog(true)
                          }}>
                            <Users className="h-4 w-4 mr-2" />
                            Ver Miembros
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedEquipo(equipo)
                            setShowAddMemberDialog(true)
                          }}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Agregar Miembro
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setEditingEquipo(equipo)
                            setEquipoForm({
                              nombre: equipo.nombre,
                              descripcion: equipo.descripcion || '',
                              color: equipo.color || '#d4af37',
                              appsScriptUrl: equipo.appsScriptUrl || '',
                              empresaId: equipo.empresaId,
                            })
                            setShowEquipoDialog(true)
                          }}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {equipo.appsScriptUrl && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <Link2 className="h-4 w-4" />
                        <span>Google Sheets vinculado</span>
                      </div>
                    )}
                    
                    {/* Miembros del equipo */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Miembros ({members.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {members.slice(0, 4).map((m) => (
                          <Avatar key={m.id} className="h-7 w-7" title={m.name || m.email}>
                            <AvatarFallback className="text-xs">
                              {m.name?.[0] || m.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {members.length > 4 && (
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs">
                            +{members.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 pt-2 text-sm text-muted-foreground">
                      <span>{equipo.candidatosCount || 0} candidatos</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Usuarios */}
        <TabsContent value="usuarios" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button onClick={() => setShowInvitarDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invitar Usuario
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {usuarios.map((usuario) => (
                  <div key={usuario.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className={`
                          ${usuario.rol === 'ADMIN' ? 'bg-amber-500/20 text-amber-600' : ''}
                          ${usuario.rol === 'GERENTE' ? 'bg-primary/20 text-primary' : ''}
                          ${usuario.rol === 'RECLUTADOR' ? 'bg-muted' : ''}
                        `}>
                          {getRolIcon(usuario.rol)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{usuario.name || 'Sin nombre'}</p>
                        <p className="text-sm text-muted-foreground">{usuario.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        usuario.rol === 'ADMIN' ? 'default' :
                        usuario.rol === 'GERENTE' ? 'secondary' : 'outline'
                      }>
                        {usuario.rol}
                      </Badge>
                      {usuario.equipo && (
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {usuario.equipo.nombre}
                        </Badge>
                      )}
                      <Badge variant={usuario.activo ? 'default' : 'destructive'}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingUser(usuario)
                            setEditUserForm({
                              name: usuario.name || '',
                              rol: usuario.rol,
                              equipoId: usuario.equipo?.id || '',
                              activo: usuario.activo,
                            })
                            setShowEditUserDialog(true)
                          }}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {usuario.equipo?.id && (
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(usuario.id)}
                              className="text-destructive"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Quitar del Equipo
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitaciones */}
        <TabsContent value="invitaciones" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowInvitarDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nueva Invitación
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {invitaciones.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay invitaciones pendientes</p>
                    <p className="text-sm mt-1">Invita usuarios para que se unan a tu equipo</p>
                  </div>
                ) : (
                  invitaciones.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${inv.status === 'USED' ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
                          {inv.status === 'USED' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Mail className="h-5 w-5 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{inv.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Rol: {inv.rol}
                            {inv.equipo && ` • Equipo: ${inv.equipo.nombre}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Código: <span className="font-mono">{inv.code}</span> • Expira {new Date(inv.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={inv.status === 'USED' ? 'default' : 'secondary'}>
                          {inv.status === 'USED' ? 'Usada' : inv.status === 'EXPIRED' ? 'Expirada' : inv.status === 'REVOKED' ? 'Revocada' : 'Pendiente'}
                        </Badge>
                        {inv.status === 'PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyInviteLink(inv.token)}
                              title="Copiar link de invitación"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResendInvitation(inv.id)}
                              title="Reenviar invitación"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelInvitation(inv.id)}
                              title="Cancelar invitación"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Empresas */}
        {userRole === 'ADMIN' && (
          <TabsContent value="empresas" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => {
                setEditingEmpresa(null)
                setEmpresaForm({ nombre: '', direccion: '', telefono: '', sitioWeb: '', industria: '', tamano: '' })
                setShowEmpresaDialog(true)
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Empresa
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {empresas.map((empresa) => (
                <Card key={empresa.id} className="card-hover">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{empresa.nombre}</CardTitle>
                          <Badge variant={empresa.activa ? 'default' : 'secondary'}>
                            {empresa.activa ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingEmpresa(empresa)
                          setEmpresaForm({
                            nombre: empresa.nombre,
                            direccion: empresa.direccion || '',
                            telefono: empresa.telefono || '',
                            sitioWeb: empresa.sitioWeb || '',
                            industria: empresa.industria || '',
                            tamano: empresa.tamano || '',
                          })
                          setShowEmpresaDialog(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {empresa.industria && <p>Industria: {empresa.industria}</p>}
                    {empresa.telefono && <p>Tel: {empresa.telefono}</p>}
                    <div className="flex gap-4 pt-2">
                      <span>{empresa.usuariosCount || 0} usuarios</span>
                      <span>{empresa.equiposCount || 0} equipos</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={showDemoKeyDialog} onOpenChange={setShowDemoKeyDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Key</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Email *</Label><Input value={demoKeyForm.email} onChange={(e) => setDemoKeyForm({ ...demoKeyForm, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Nombre</Label><Input value={demoKeyForm.nombre} onChange={(e) => setDemoKeyForm({ ...demoKeyForm, nombre: e.target.value })} /></div>
            <div className="space-y-1"><Label>Empresa</Label><Input value={demoKeyForm.empresa} onChange={(e) => setDemoKeyForm({ ...demoKeyForm, empresa: e.target.value })} /></div>
            <div className="space-y-1"><Label>Rol solicitado</Label><Select value={demoKeyForm.rolSolicitado} onValueChange={(v) => setDemoKeyForm({ ...demoKeyForm, rolSolicitado: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ADMIN">ADMIN</SelectItem><SelectItem value="GERENTE">GERENTE</SelectItem><SelectItem value="RECLUTADOR">RECLUTADOR</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>Días expiración</Label><Input type="number" value={demoKeyForm.diasExpiracion} onChange={(e) => setDemoKeyForm({ ...demoKeyForm, diasExpiracion: Number(e.target.value) || 7 })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDemoKeyDialog(false)}>Cancelar</Button>
            <Button onClick={async () => {
              await fetch('/api/demo/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(demoKeyForm) })
              setShowDemoKeyDialog(false)
              loadData()
            }}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Empresa */}
      <Dialog open={showEmpresaDialog} onOpenChange={setShowEmpresaDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEmpresa ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={empresaForm.nombre}
                onChange={(e) => setEmpresaForm({ ...empresaForm, nombre: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industria</Label>
                <Input
                  value={empresaForm.industria}
                  onChange={(e) => setEmpresaForm({ ...empresaForm, industria: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tamaño</Label>
                <Select
                  value={empresaForm.tamano}
                  onValueChange={(v) => setEmpresaForm({ ...empresaForm, tamano: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 empleados</SelectItem>
                    <SelectItem value="11-50">11-50 empleados</SelectItem>
                    <SelectItem value="51-200">51-200 empleados</SelectItem>
                    <SelectItem value="201-500">201-500 empleados</SelectItem>
                    <SelectItem value="500+">500+ empleados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={empresaForm.telefono}
                onChange={(e) => setEmpresaForm({ ...empresaForm, telefono: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sitio Web</Label>
              <Input
                value={empresaForm.sitioWeb}
                onChange={(e) => setEmpresaForm({ ...empresaForm, sitioWeb: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmpresaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmpresa} disabled={!empresaForm.nombre}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Equipo */}
      <Dialog open={showEquipoDialog} onOpenChange={setShowEquipoDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEquipo ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={equipoForm.nombre}
                onChange={(e) => setEquipoForm({ ...equipoForm, nombre: e.target.value })}
                placeholder="Nombre del equipo"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={equipoForm.descripcion}
                onChange={(e) => setEquipoForm({ ...equipoForm, descripcion: e.target.value })}
                rows={2}
                placeholder="Descripción del equipo..."
              />
            </div>
            
            {/* Mostrar empresa para GERENTE (solo lectura) */}
            {userRole === 'GERENTE' && (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  {empresas.find(e => e.id === empresaId)?.nombre || 'Tu empresa'}
                </div>
                <p className="text-xs text-muted-foreground">
                  El equipo se creará en tu empresa
                </p>
              </div>
            )}
            
            {/* Selector de empresa para ADMIN */}
            {userRole === 'ADMIN' && (
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select
                  value={equipoForm.empresaId}
                  onValueChange={(v) => setEquipoForm({ ...equipoForm, empresaId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {empresas.length === 0 && (
                  <p className="text-xs text-destructive">
                    No hay empresas creadas. Crea una empresa primero.
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={equipoForm.color}
                  onChange={(e) => setEquipoForm({ ...equipoForm, color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={equipoForm.color}
                  onChange={(e) => setEquipoForm({ ...equipoForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                URL de Google Apps Script
              </Label>
              <Input
                value={equipoForm.appsScriptUrl}
                onChange={(e) => setEquipoForm({ ...equipoForm, appsScriptUrl: e.target.value })}
                placeholder="https://script.google.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Vincula este equipo con un Google Sheet para sincronizar candidatos
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEquipoDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEquipo} 
              disabled={
                !equipoForm.nombre || 
                (userRole === 'ADMIN' && !editingEquipo && !equipoForm.empresaId)
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Invitar */}
      <Dialog open={showInvitarDialog} onOpenChange={(open) => {
        setShowInvitarDialog(open)
        if (!open) setCreatedInviteLink(null)
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar Usuario</DialogTitle>
            <DialogDescription>
              Envía una invitación por email para que el usuario se una a tu organización
            </DialogDescription>
          </DialogHeader>

          {createdInviteLink ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">¡Invitación creada!</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  El email ha sido enviado. También puedes compartir el link directamente:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={createdInviteLink}
                    readOnly
                    className="text-xs bg-muted"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInviteLink)
                      addNotification({ type: 'success', title: 'Link copiado' })
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <strong>Nota:</strong> En modo desarrollo los emails se registran en la consola del servidor. 
                    Usa el link de arriba para compartir la invitación manualmente.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={invitarForm.email}
                  onChange={(e) => setInvitarForm({ ...invitarForm, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select
                  value={invitarForm.rol}
                  onValueChange={(v) => setInvitarForm({ ...invitarForm, rol: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {userRole === 'ADMIN' && <SelectItem value="ADMIN">Administrador</SelectItem>}
                    <SelectItem value="GERENTE">Gerente</SelectItem>
                    <SelectItem value="RECLUTADOR">Reclutador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Equipo</Label>
                <Select
                  value={invitarForm.equipoId || '__none__'}
                  onValueChange={(v) => setInvitarForm({ ...invitarForm, equipoId: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar equipo (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin equipo específico</SelectItem>
                    {equipos.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mensaje personalizado</Label>
                <Textarea
                  value={invitarForm.mensaje}
                  onChange={(e) => setInvitarForm({ ...invitarForm, mensaje: e.target.value })}
                  rows={2}
                  placeholder="Hola, te invito a unirte a nuestro equipo..."
                />
              </div>
              <div className="space-y-2">
                <Label>Vigencia (días)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={invitarForm.expiresInDays}
                  onChange={(e) => setInvitarForm({ ...invitarForm, expiresInDays: Number(e.target.value) || 7 })}
                />
              </div>
              
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <strong>Nota:</strong> En desarrollo, el correo de invitación se registra en la consola del servidor.
                    El acceso es invite-only y no existen registros libres ni modo demo.
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {createdInviteLink ? (
              <Button onClick={() => {
                setShowInvitarDialog(false)
                setCreatedInviteLink(null)
              }}>
                Cerrar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowInvitarDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSendInvitation} disabled={!invitarForm.email}>
                  Enviar Invitación
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Usuario */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              {editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={editUserForm.name}
                onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={editUserForm.rol}
                onValueChange={(v) => setEditUserForm({ ...editUserForm, rol: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userRole === 'ADMIN' && <SelectItem value="ADMIN">Administrador</SelectItem>}
                  <SelectItem value="GERENTE">Gerente</SelectItem>
                  <SelectItem value="RECLUTADOR">Reclutador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select
                value={editUserForm.equipoId || '__none__'}
                onValueChange={(v) => setEditUserForm({ ...editUserForm, equipoId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin equipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin equipo</SelectItem>
                  {equipos.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={editUserForm.activo}
                onChange={(e) => setEditUserForm({ ...editUserForm, activo: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="activo">Usuario activo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditUser}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalle Equipo */}
      <Dialog open={showEquipoDetailDialog} onOpenChange={setShowEquipoDetailDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEquipo && (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: selectedEquipo.color || '#d4af37' }}
                >
                  <Users className="h-4 w-4 text-white" />
                </div>
              )}
              {selectedEquipo?.nombre}
            </DialogTitle>
            <DialogDescription>
              {selectedEquipo?.descripcion || 'Miembros del equipo'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedEquipo && (
              <>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowEquipoDetailDialog(false)
                      setShowAddMemberDialog(true)
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Agregar Miembro
                  </Button>
                </div>
                
                <div className="divide-y rounded-lg border">
                  {getEquipoMembers(selectedEquipo.id).length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No hay miembros en este equipo
                    </div>
                  ) : (
                    getEquipoMembers(selectedEquipo.id).map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {member.name?.[0] || member.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{member.name || 'Sin nombre'}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {member.rol}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <UserMinus className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEquipoDetailDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Agregar Miembro */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Miembro al Equipo</DialogTitle>
            <DialogDescription>
              Equipo: {selectedEquipo?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {usuariosSinEquipo.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay usuarios disponibles sin equipo</p>
                <p className="text-sm mt-1">Invita nuevos usuarios primero</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Seleccionar Usuario</Label>
                  <Select
                    value={addMemberForm.usuarioId}
                    onValueChange={(v) => setAddMemberForm({ usuarioId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuariosSinEquipo.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email} ({u.rol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Solo se muestran usuarios que no pertenecen a ningún equipo
                </p>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddMember} 
              disabled={usuariosSinEquipo.length === 0 || !addMemberForm.usuarioId}
            >
              Agregar al Equipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
