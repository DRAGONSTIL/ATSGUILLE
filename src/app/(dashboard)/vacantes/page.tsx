'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { VacantesManager } from '@/components/atlas/vacantes-manager'
import { useGlobalDialogs } from '@/components/layout/global-dialogs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useVacantesQuery } from '@/hooks/use-ats-queries'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export default function VacantesPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { setSelectedVacante, setIsVacanteDialogOpen } = useGlobalDialogs()
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useVacantesQuery({ limit: 20 })
  const vacantes = useMemo(() => data?.vacantes ?? [], [data])

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/vacantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('No fue posible crear la vacante')
      return res.json()
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['vacantes'] }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/vacantes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('No fue posible actualizar la vacante')
      return res.json()
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['vacantes'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vacantes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No fue posible eliminar la vacante')
      return res.json()
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['vacantes'] }),
  })

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando vacantes...</div>

  if (isError) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-destructive">No se pudieron cargar vacantes.</p>
        <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-4">
      {vacantes.length === 0 ? (
        <div className="rounded-lg border p-8 text-center space-y-3">
          <p className="font-medium">No hay vacantes</p>
          <p className="text-sm text-muted-foreground">Crea la primera vacante para activar el portal de empleos.</p>
        </div>
      ) : null}

      <VacantesManager
        vacantes={vacantes}
        onCreate={async (payload) => createMutation.mutateAsync(payload)}
        onUpdate={async (id, payload) => updateMutation.mutateAsync({ id, payload })}
        onDelete={async (id) => setPendingDelete(id)}
        onSelect={(id) => {
          const selected = vacantes.find((item: any) => item.id === id)
          if (selected) {
            setSelectedVacante(selected)
            setIsVacanteDialogOpen(true)
          }
        }}
        userRole={session?.user?.rol || 'RECLUTADOR'}
      />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar vacante</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción despublica la vacante y elimina su registro permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (!pendingDelete) return
                await deleteMutation.mutateAsync(pendingDelete)
                setPendingDelete(null)
              }}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
