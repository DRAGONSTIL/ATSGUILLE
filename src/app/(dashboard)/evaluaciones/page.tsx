'use client'

import { EvaluacionesManager } from '@/components/atlas/evaluaciones-manager'
import { useUIStore } from '@/lib/store'
import { useCandidatesQuery } from '@/hooks/use-ats-queries'
import { Button } from '@/components/ui/button'

export default function EvaluacionesPage() {
  const { addNotification } = useUIStore()
  const candidatesQuery = useCandidatesQuery({ limit: 50 })

  if (candidatesQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando candidatos para evaluación...</div>
  }

  if (candidatesQuery.isError) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-destructive">No fue posible cargar candidatos.</p>
        <Button variant="outline" onClick={() => candidatesQuery.refetch()}>Reintentar</Button>
      </div>
    )
  }

  const candidatos = (candidatesQuery.data?.candidatos ?? []).map((c: any) => ({
    id: c.id,
    nombre: c.nombre,
    apellido: c.apellido,
    email: c.email,
  }))

  return (
    <div className="animate-fade-in space-y-4">
      <EvaluacionesManager candidatos={candidatos} addNotification={addNotification} />
    </div>
  )
}
