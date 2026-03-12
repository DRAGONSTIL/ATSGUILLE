'use client'

import { useState, useMemo } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent,
  closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Briefcase, Calendar, GripVertical, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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

const COLUMNAS: { id: EstatusCandidato; titulo: string; color: string; hex: string; bg: string }[] = [
  { id: 'REGISTRADO', titulo: 'Registrado', color: 'text-slate-400', hex: '#94A3B8', bg: 'bg-slate-500/10' },
  { id: 'EN_PROCESO', titulo: 'En Proceso', color: 'text-amber-400', hex: '#F59E0B', bg: 'bg-amber-500/10' },
  { id: 'ENTREVISTA', titulo: 'Entrevista', color: 'text-blue-400', hex: '#3B82F6', bg: 'bg-blue-500/10' },
  { id: 'CONTRATADO', titulo: 'Contratado', color: 'text-emerald-400', hex: '#10B981', bg: 'bg-emerald-500/10' },
  { id: 'RECHAZADO', titulo: 'Rechazado', color: 'text-red-400', hex: '#EF4444', bg: 'bg-red-500/10' },
]

function KanbanCardContent({ candidato }: { candidato: Candidato }) {
  const initials = `${candidato.nombre[0]}${candidato.apellido[0]}`
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5">
        <Avatar className="h-8 w-8 shrink-0 border border-amber-500/20">
          <AvatarFallback className="bg-amber-500/10 text-amber-400 text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate leading-tight">
            {candidato.nombre} {candidato.apellido}
          </p>
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <Mail className="h-2.5 w-2.5 shrink-0" />
            {candidato.email}
          </p>
        </div>
      </div>

      {candidato.vacante && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-2 py-1">
          <Briefcase className="h-3 w-3 shrink-0 text-amber-400/60" />
          <span className="truncate">{candidato.vacante.titulo}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
        <div className="flex items-center gap-1">
          <Calendar className="h-2.5 w-2.5" />
          {format(new Date(candidato.createdAt), 'dd MMM', { locale: es })}
        </div>
        {candidato.reclutador?.name && (
          <span className="truncate max-w-[80px]">{candidato.reclutador.name}</span>
        )}
      </div>
    </div>
  )
}

function SortableKanbanCard({ candidato, onClick }: { candidato: Candidato; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: candidato.id })

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style}
      className={`kanban-card luxury-card p-3.5 select-none group transition-all cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40 scale-95' : ''}`}
      onClick={() => { if (!isDragging) onClick() }}
      {...attributes} {...listeners}
    >
      <KanbanCardContent candidato={candidato} />
      {/* Drag handle indicator */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-30 transition-opacity">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  )
}

function KanbanCardOverlay({ candidato }: { candidato: Candidato }) {
  return (
    <div className="luxury-card p-3.5 rotate-2 scale-105 shadow-2xl border-amber-500/30"
      style={{ boxShadow: '0 25px 50px hsl(0 0% 0% / 0.6), 0 0 0 1px hsl(43 96% 56% / 0.2)' }}>
      <KanbanCardContent candidato={candidato} />
    </div>
  )
}

function KanbanColumnComp({ id, titulo, color, hex, bg, candidatos, onSelectCandidato, isOver }: {
  id: EstatusCandidato; titulo: string; color: string; hex: string; bg: string
  candidatos: Candidato[]; onSelectCandidato: (id: string) => void; isOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div className="shrink-0 w-72">
      {/* Column header */}
      <div className="sticky top-0 z-10 mb-3 px-1">
        <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${isOver ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/50 bg-card/60'} backdrop-blur transition-all`}>
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: hex, boxShadow: `0 0 8px ${hex}60` }} />
          <h3 className={`font-semibold text-sm ${color}`}>{titulo}</h3>
          <div className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold"
            style={{ background: `${hex}20`, color: hex }}>
            {candidatos.length}
          </div>
        </div>
      </div>

      {/* Column body */}
      <div ref={setNodeRef}
        className={`kanban-column space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] p-2 rounded-xl transition-all duration-200 ${isOver
          ? 'bg-amber-500/5 ring-2 ring-amber-500/25 ring-dashed'
          : 'bg-muted/10 border border-border/30'
        }`}
      >
        <SortableContext items={candidatos.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {candidatos.map((candidato) => (
            <SortableKanbanCard key={candidato.id} candidato={candidato}
              onClick={() => onSelectCandidato(candidato.id)} />
          ))}
        </SortableContext>

        {candidatos.length === 0 && (
          <div className={`rounded-xl p-6 text-center text-xs text-muted-foreground border-2 border-dashed transition-colors ${isOver
            ? 'border-amber-500/40 bg-amber-500/5 text-amber-400'
            : 'border-border/30'
          }`}>
            {isOver ? '✦ Soltar aquí' : 'Sin candidatos'}
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ candidatos, onStatusChange, onSelectCandidato, filtroVacante, filtroReclutador }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const candidatosFiltrados = useMemo(() => {
    let f = candidatos
    if (filtroVacante) f = f.filter(c => c.vacante?.id === filtroVacante)
    if (filtroReclutador) f = f.filter(c => c.reclutador?.id === filtroReclutador)
    return f
  }, [candidatos, filtroVacante, filtroReclutador])

  const candidatosPorEstatus = useMemo(() => {
    const grouped: Record<EstatusCandidato, Candidato[]> = { REGISTRADO: [], EN_PROCESO: [], ENTREVISTA: [], CONTRATADO: [], RECHAZADO: [] }
    candidatosFiltrados.forEach(c => grouped[c.estatus].push(c))
    return grouped
  }, [candidatosFiltrados])

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string)
  const handleDragOver = (e: DragOverEvent) => setOverId(e.over?.id as string || null)
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    setActiveId(null); setOverId(null)
    if (!over) return
    const candidato = candidatos.find(c => c.id === active.id)
    if (!candidato) return
    const columnaIds = new Set(COLUMNAS.map(c => c.id))
    let nuevoEstatus: EstatusCandidato | null = null
    if (columnaIds.has(over.id as EstatusCandidato)) {
      nuevoEstatus = over.id as EstatusCandidato
    } else {
      const objetivo = candidatos.find(c => c.id === over.id)
      if (objetivo) nuevoEstatus = objetivo.estatus
    }
    if (nuevoEstatus && candidato.estatus !== nuevoEstatus) onStatusChange(candidato.id, nuevoEstatus)
  }

  const activeCandidato = activeId ? candidatos.find(c => c.id === activeId) : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners}
      onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[500px]">
        {COLUMNAS.map(col => (
          <KanbanColumnComp key={col.id} {...col}
            candidatos={candidatosPorEstatus[col.id]}
            onSelectCandidato={onSelectCandidato}
            isOver={overId === col.id}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeCandidato && <KanbanCardOverlay candidato={activeCandidato} />}
      </DragOverlay>
    </DndContext>
  )
}
