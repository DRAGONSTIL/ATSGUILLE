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
    return <div className="p-6 text-sm text-muted-foreground">Cargando candidatos...</div>
  }

  if (isError) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-destructive">No se pudo cargar el directorio: {(error as Error).message}</p>
        <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Directorio de Candidatos</h2>
          <p className="text-muted-foreground">Gestiona y busca candidatos</p>
        </div>
        <Button onClick={() => setIsNewCandidatoDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Candidato
        </Button>
      </div>

      {candidatos.length === 0 ? (
        <div className="rounded-lg border p-8 text-center space-y-3">
          <p className="font-medium">No hay candidatos registrados</p>
          <p className="text-sm text-muted-foreground">Crea el primer candidato para iniciar el pipeline.</p>
          <Button onClick={() => setIsNewCandidatoDialogOpen(true)}>Crear candidato</Button>
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
