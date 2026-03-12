'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Briefcase, Calendar, GripVertical } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Types
type EstatusCandidato = 'REGISTRADO' | 'EN_PROCESO' | 'ENTREVISTA' | 'CONTRATADO' | 'RECHAZADO'

interface Candidato {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string | null
  estatus: EstatusCandidato
  createdAt: string
  vacante?: { id: string; titulo: string } | null
  reclutador?: { id: string; name: string | null } | null
}

interface KanbanBoardProps {
  candidatos: Candidato[]
  onStatusChange: (id: string, estatus: EstatusCandidato) => void
  onSelectCandidato: (id: string) => void
  filtroVacante?: string | null
  filtroReclutador?: string | null
}

// Columnas del Kanban
const COLUMNAS: { id: EstatusCandidato; titulo: string; color: string }[] = [
  { id: 'REGISTRADO', titulo: 'Registrado', color: 'bg-slate-500' },
  { id: 'EN_PROCESO', titulo: 'En Proceso', color: 'bg-amber-500' },
  { id: 'ENTREVISTA', titulo: 'Entrevista', color: 'bg-teal-500' },
  { id: 'CONTRATADO', titulo: 'Contratado', color: 'bg-green-500' },
  { id: 'RECHAZADO', titulo: 'Rechazado', color: 'bg-red-500' },
]

// Componente de tarjeta arrastrable con useSortable
function SortableKanbanCard({
  candidato,
  onClick,
}: {
  candidato: Candidato
  onClick: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidato.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const initials = `${candidato.nombre[0]}${candidato.apellido[0]}`

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`kanban-card cursor-pointer group relative overflow-hidden transition-all duration-300 ${isDragging
          ? 'shadow-2xl ring-2 ring-primary scale-[1.02] z-50 opacity-90'
          : 'hover:shadow-md hover:-translate-y-0.5'
        }`}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8 text-xs">
            <AvatarFallback className="bg-primary/20 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {candidato.nombre} {candidato.apellido}
            </p>
            <p className="text-xs text-muted-foreground truncate">{candidato.email}</p>
          </div>
        </div>

        {candidato.vacante && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="h-3 w-3" />
            <span className="truncate">{candidato.vacante.titulo}</span>
          </div>
        )}

        {candidato.reclutador && (
          <p className="text-xs text-muted-foreground">
            Reclutador: {candidato.reclutador.name || 'Sin asignar'}
          </p>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(candidato.createdAt), 'dd MMM', { locale: es })}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente de tarjeta estática para el overlay
function KanbanCard({
  candidato,
  onClick,
}: {
  candidato: Candidato
  onClick: () => void
}) {
  const initials = `${candidato.nombre[0]}${candidato.apellido[0]}`

  return (
    <Card className="kanban-card cursor-grab shadow-2xl ring-2 ring-primary scale-[1.05] rotate-2 transition-transform duration-200">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8 text-xs">
            <AvatarFallback className="bg-primary/20 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {candidato.nombre} {candidato.apellido}
            </p>
            <p className="text-xs text-muted-foreground truncate">{candidato.email}</p>
          </div>
        </div>

        {candidato.vacante && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="h-3 w-3" />
            <span className="truncate">{candidato.vacante.titulo}</span>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(candidato.createdAt), 'dd MMM', { locale: es })}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente de columna con droppable
function KanbanColumn({
  id,
  titulo,
  color,
  candidatos,
  onSelectCandidato,
  isOver,
}: {
  id: EstatusCandidato
  titulo: string
  color: string
  candidatos: Candidato[]
  onSelectCandidato: (id: string) => void
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({
    id: id,
  })

  return (
    <div className="flex-shrink-0 w-80">
      <div className="sticky top-0 z-10 flex items-center gap-2 mb-3 bg-background/95 backdrop-blur py-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <h3 className="font-semibold text-sm">{titulo}</h3>
        <Badge variant="secondary" className="ml-auto">
          {candidatos.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`kanban-column space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] pr-1 p-2 rounded-xl transition-all duration-300 ${isOver
            ? 'bg-primary/5 ring-2 ring-primary/50 ring-dashed scale-[1.01]'
            : 'border bg-muted/10'
          }`}
      >
        <SortableContext items={candidatos.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {candidatos.map((candidato) => (
            <SortableKanbanCard
              key={candidato.id}
              candidato={candidato}
              onClick={() => onSelectCandidato(candidato.id)}
            />
          ))}
        </SortableContext>

        {candidatos.length === 0 && (
          <div className={`border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm ${isOver ? 'border-primary bg-primary/5' : ''
            }`}>
            {isOver ? 'Soltar aquí' : 'Sin candidatos'}
          </div>
        )}
      </div>
    </div>
  )
}

// Componente principal
export function KanbanBoard({
  candidatos,
  onStatusChange,
  onSelectCandidato,
  filtroVacante,
  filtroReclutador,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filtrar candidatos
  const candidatosFiltrados = useMemo(() => {
    let filtered = candidatos

    if (filtroVacante) {
      filtered = filtered.filter((c) => c.vacante?.id === filtroVacante)
    }

    if (filtroReclutador) {
      filtered = filtered.filter((c) => c.reclutador?.id === filtroReclutador)
    }

    return filtered
  }, [candidatos, filtroVacante, filtroReclutador])

  // Agrupar por estatus
  const candidatosPorEstatus = useMemo(() => {
    const grouped: Record<EstatusCandidato, Candidato[]> = {
      REGISTRADO: [],
      EN_PROCESO: [],
      ENTREVISTA: [],
      CONTRATADO: [],
      RECHAZADO: [],
    }

    candidatosFiltrados.forEach((candidato) => {
      grouped[candidato.estatus].push(candidato)
    })

    return grouped
  }, [candidatosFiltrados])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over) return

    const candidatoId = active.id as string
    const candidato = candidatos.find((c) => c.id === candidatoId)
    if (!candidato) return

    const overId = over.id as string
    const columnas = new Set(COLUMNAS.map((c) => c.id))

    let nuevoEstatus: EstatusCandidato | null = null

    if (columnas.has(overId as EstatusCandidato)) {
      nuevoEstatus = overId as EstatusCandidato
    } else {
      const candidatoObjetivo = candidatos.find((c) => c.id === overId)
      if (candidatoObjetivo) {
        nuevoEstatus = candidatoObjetivo.estatus
      }
    }

    if (nuevoEstatus && candidato.estatus !== nuevoEstatus) {
      onStatusChange(candidatoId, nuevoEstatus)
    }
  }

  const activeCandidato = activeId
    ? candidatos.find((c) => c.id === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNAS.map((columna) => (
          <KanbanColumn
            key={columna.id}
            id={columna.id}
            titulo={columna.titulo}
            color={columna.color}
            candidatos={candidatosPorEstatus[columna.id]}
            onSelectCandidato={onSelectCandidato}
            isOver={overId === columna.id}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCandidato && (
          <KanbanCard
            candidato={activeCandidato}
            onClick={() => onSelectCandidato(activeCandidato.id)}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
