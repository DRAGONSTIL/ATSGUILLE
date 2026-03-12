'use client'

import { ReportesManager } from '@/components/atlas/reportes-manager'
import { useUIStore } from '@/lib/store'
import { useCandidatesQuery, useVacantesQuery } from '@/hooks/use-ats-queries'
import { Button } from '@/components/ui/button'

export default function ReportesPage() {
  const { addNotification } = useUIStore()
  const candidatesQuery = useCandidatesQuery({ limit: 50 })
  const vacantesQuery = useVacantesQuery({ limit: 25 })

  if (candidatesQuery.isLoading || vacantesQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando datos de reportes...</div>
  }

  if (candidatesQuery.isError || vacantesQuery.isError) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-destructive">No fue posible cargar reportes.</p>
        <Button variant="outline" onClick={() => { candidatesQuery.refetch(); vacantesQuery.refetch() }}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-4">
      <ReportesManager
        candidatos={candidatesQuery.data?.candidatos ?? []}
        vacantes={vacantesQuery.data?.vacantes ?? []}
        addNotification={addNotification}
      />
    </div>
  )
}
