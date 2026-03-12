'use client'

import { AdminPanel } from '@/components/atlas/admin-panel'
import { useUIStore } from '@/lib/store'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'

export default function AdminPage() {
  const { addNotification } = useUIStore()
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  return (
    <div className="animate-fade-in space-y-4">
      <AdminPanel
        userRole={session?.user?.rol || 'RECLUTADOR'}
        empresaId={session?.user?.empresaId || null}
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
          await queryClient.invalidateQueries({ queryKey: ['vacantes'] })
          await queryClient.invalidateQueries({ queryKey: ['actividades'] })
        }}
        addNotification={addNotification}
      />
    </div>
  )
}
