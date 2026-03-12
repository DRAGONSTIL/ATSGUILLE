'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Plus, Kanban, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/atlas/kanban-board'
import { useGlobalDialogs } from '@/components/layout/global-dialogs'
import { useCandidatesQuery, useUpdateCandidateMutation } from '@/hooks/use-ats-queries'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { useQueryClient } from '@tanstack/react-query'

type Estatus = 'REGISTRADO' | 'EN_PROCESO' | 'ENTREVISTA' | 'CONTRATADO' | 'RECHAZADO'

export default function PipelinePage() {
  const queryClient = useQueryClient()
  const { setIsNewCandidatoDialogOpen, openCandidatoDialog } = useGlobalDialogs()
  const { data, isLoading, isError, refetch } = useCandidatesQuery({ limit: 50 })
  const candidatos = useMemo(() => data?.candidatos ?? [], [data])
  const updateMutation = useUpdateCandidateMutation()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [criticalMove, setCriticalMove] = useState<{ id: string; estatus: Estatus } | null>(null)
  const [criticalReason, setCriticalReason] = useState('')

  const changeStatus = async (id: string, estatus: Estatus, reason?: string) => {
    queryClient.setQueriesData({ queryKey: ['candidatos'] }, (current: any) => {
      if (!current?.candidatos) return current
      return { ...current, candidatos: current.candidatos.map((item: any) => (item.id === id ? { ...item, estatus } : item)) }
    })
    try {
      await updateMutation.mutateAsync({
        id: String(id),
        payload: reason ? { estatus, notas: `Cambio crítico (${estatus}). Motivo: ${reason}` } : { estatus },
      })
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
    } finally {
      setSavingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="shrink-0 w-72 space-y-2">
              <div className="h-11 rounded-xl skeleton" />
              {[...Array(3)].map((_, j) => <div key={j} className="h-24 rounded-xl skeleton" />)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="luxury-card p-8 text-center space-y-4">
        <p className="text-destructive font-semibold">No se pudo cargar el pipeline</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Kanban className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Reclutamiento</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de Candidatos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Arrastra las tarjetas para actualizar el estatus · {candidatos.length} candidatos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}
            className="border-border/60 hover:border-amber-500/30 h-9 text-sm">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Sincronizar
          </Button>
          <button onClick={() => setIsNewCandidatoDialogOpen(true)}
            className="btn-gold flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold h-9">
            <Plus className="h-4 w-4" />
            Nuevo Candidato
          </button>
        </div>
      </div>

      {savingId && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Guardando cambios...
        </div>
      )}

      <KanbanBoard
        candidatos={candidatos}
        onStatusChange={async (id, estatus) => {
          if (estatus === 'CONTRATADO' || estatus === 'RECHAZADO') {
            setCriticalMove({ id, estatus }); return
          }
          await changeStatus(id, estatus)
        }}
        onSelectCandidato={(id) => {
          const candidate = candidatos.find((item: any) => item.id === id)
          if (candidate) openCandidatoDialog(candidate)
        }}
      />

      {/* Critical Move Confirmation */}
      <AlertDialog open={Boolean(criticalMove)} onOpenChange={(open) => !open && setCriticalMove(null)}>
        <AlertDialogContent className="border-border/60"
          style={{ background: 'hsl(222 18% 10%)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Confirmar cambio crítico
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás moviendo este candidato a{' '}
              <span className={`font-semibold ${criticalMove?.estatus === 'CONTRATADO' ? 'text-emerald-400' : 'text-red-400'}`}>
                {criticalMove?.estatus === 'CONTRATADO' ? '✓ Contratado' : '✗ Rechazado'}
              </span>.
              Puedes agregar un motivo opcional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Motivo del cambio (opcional)"
            value={criticalReason}
            onChange={(e) => setCriticalReason(e.target.value)}
            className="bg-muted/30 border-border/50"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCriticalReason('')} className="border-border/60">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!criticalMove) return
                await changeStatus(criticalMove.id, criticalMove.estatus, criticalReason)
                setCriticalReason(''); setCriticalMove(null)
              }}
              className={`btn-gold border-0 ${criticalMove?.estatus === 'RECHAZADO' ? '!bg-red-600 !text-white hover:!bg-red-700' : ''}`}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
