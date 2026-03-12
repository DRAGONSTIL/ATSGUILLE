'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CandidatesTable } from '@/components/atlas/candidates-table'
import { useSession } from 'next-auth/react'
import { useGlobalDialogs } from '@/components/layout/global-dialogs'
import { useBulkCandidatesMutation, useCandidatesQuery, useDeleteCandidateMutation, useUpdateCandidateMutation } from '@/hooks/use-ats-queries'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export default function DirectorioPage() {
  const { data: session } = useSession()
  const { setIsNewCandidatoDialogOpen, openCandidatoDialog } = useGlobalDialogs()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([])

  const { data, isLoading, isError, refetch, error } = useCandidatesQuery({ limit: 25 })
  const candidatos = useMemo(() => data?.candidatos ?? [], [data])

  const updateMutation = useUpdateCandidateMutation()
  const deleteMutation = useDeleteCandidateMutation()
  const bulkMutation = useBulkCandidatesMutation()

  const busy = updateMutation.isPending || deleteMutation.isPending || bulkMutation.isPending

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-14 rounded-xl skeleton w-64" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-lg skeleton" />)}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="luxury-card p-8 text-center space-y-4">
        <p className="text-destructive font-semibold">No se pudo cargar el directorio</p>
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Reclutamiento</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Directorio de Candidatos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestiona, busca y filtra tus candidatos · {candidatos.length} registros</p>
        </div>
        <button onClick={() => setIsNewCandidatoDialogOpen(true)}
          className="btn-gold flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold h-9">
          <Plus className="h-4 w-4" />
          Nuevo Candidato
        </button>
      </div>

      {candidatos.length === 0 ? (
        <div className="luxury-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl gradient-gold-subtle border border-amber-500/20 flex items-center justify-center mx-auto">
            <Plus className="h-7 w-7 text-amber-400" />
          </div>
          <p className="font-semibold text-foreground">No hay candidatos registrados</p>
          <p className="text-sm text-muted-foreground">Crea el primer candidato para iniciar el pipeline.</p>
          <button onClick={() => setIsNewCandidatoDialogOpen(true)}
            className="btn-gold px-6 py-2.5 rounded-lg text-sm font-semibold">
            Crear primer candidato
          </button>
        </div>
      ) : (
        <CandidatesTable
          candidatos={candidatos}
          onSelectCandidato={(id) => {
            const candidate = candidatos.find((item: any) => item.id === id)
            if (candidate) {
              openCandidatoDialog(candidate)
            }
          }}
          onStatusChange={async (id, estatus) => {
            await updateMutation.mutateAsync({ id, payload: { estatus } })
          }}
          onBulkAction={async (ids, action, dataPayload) => {
            if (action === 'eliminar') {
              setPendingBulkDeleteIds(ids)
              return
            }
            await bulkMutation.mutateAsync({ ids, action, ...(typeof dataPayload === 'string' ? { estatus: dataPayload } : dataPayload) })
          }}
          onDelete={async (id) => setPendingDeleteId(id)}
          globalSearch=""
          onRefresh={() => refetch()}
          userRole={session?.user?.rol || 'RECLUTADOR'}
        />
      )}

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar candidato</AlertDialogTitle>
            <AlertDialogDescription>Esta acción es permanente y removerá también sus documentos asociados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async () => {
                if (!pendingDeleteId) return
                await deleteMutation.mutateAsync(pendingDeleteId)
                setPendingDeleteId(null)
              }}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingBulkDeleteIds.length > 0} onOpenChange={(open) => !open && setPendingBulkDeleteIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar selección</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán {pendingBulkDeleteIds.length} candidatos seleccionados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async () => {
                await bulkMutation.mutateAsync({ ids: pendingBulkDeleteIds, action: 'eliminar' })
                setPendingBulkDeleteIds([])
              }}
            >
              {bulkMutation.isPending ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
