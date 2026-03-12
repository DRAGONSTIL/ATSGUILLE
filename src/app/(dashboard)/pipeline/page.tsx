'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Plus } from 'lucide-react'
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
    // Optimistic update for all queries starting with 'candidatos'
    queryClient.setQueriesData({ queryKey: ['candidatos'] }, (current: any) => {
      if (!current?.candidatos) return current
      return {
        ...current,
        candidatos: current.candidatos.map((item: any) => (item.id === id ? { ...item, estatus } : item)),
      }
    })

    console.log(`[Pipeline] Cambiando estatus de ${id} a ${estatus}`)

    try {
      const response = await updateMutation.mutateAsync({
        id: String(id),
        payload: reason ? { estatus, notas: `Cambio crítico (${estatus}). Motivo: ${reason}` } : { estatus },
      })
      console.log(`[Pipeline] Éxito al cambiar estatus:`, response)
    } catch (err) {
      console.error(`[Pipeline] Error al cambiar estatus:`, err)
      // If error, invalidate all to get fresh data from server
      await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
    } finally {
      setSavingId(null)
    }
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando pipeline...</div>
  }

  if (isError) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-destructive">No se pudo cargar el pipeline.</p>
        <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Pipeline de Candidatos</h2>
          <p className="text-muted-foreground">Arrastra las tarjetas para cambiar el estatus</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar
          </Button>
          <Button onClick={() => setIsNewCandidatoDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Candidato
          </Button>
        </div>
      </div>

      {savingId && <p className="text-xs text-muted-foreground">Guardando cambios de estado...</p>}

      <KanbanBoard
        candidatos={candidatos}
        onStatusChange={async (id, estatus) => {
          if (estatus === 'CONTRATADO' || estatus === 'RECHAZADO') {
            setCriticalMove({ id, estatus })
            return
          }
          await changeStatus(id, estatus)
        }}
        onSelectCandidato={(id) => {
          const candidate = candidatos.find((item: any) => item.id === id)
          if (candidate) openCandidatoDialog(candidate)
        }}
      />

      <AlertDialog open={Boolean(criticalMove)} onOpenChange={(open) => !open && setCriticalMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio crítico</AlertDialogTitle>
            <AlertDialogDescription>
              Este movimiento cambia el candidato a <strong>{criticalMove?.estatus}</strong>. Puedes registrar un motivo opcional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            aria-label="Motivo del cambio"
            placeholder="Motivo (opcional)"
            value={criticalReason}
            onChange={(event) => setCriticalReason(event.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCriticalReason('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!criticalMove) return
                await changeStatus(criticalMove.id, criticalMove.estatus, criticalReason)
                setCriticalReason('')
                setCriticalMove(null)
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
