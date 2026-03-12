'use client'

import { MetasManager } from '@/components/atlas/metas-manager'
import { useUIStore } from '@/lib/store'
import { useSession } from 'next-auth/react'

export default function MetasPage() {
    const { addNotification } = useUIStore()
    const { data: session } = useSession()

    return (
        <div className="animate-fade-in space-y-4">
            <MetasManager
                empresaId={session?.user?.empresaId || null}
                userRole={session?.user?.rol || 'RECLUTADOR'}
                userId={session?.user?.id || ''}
                addNotification={addNotification}
            />
        </div>
    )
}
