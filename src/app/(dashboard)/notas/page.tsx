'use client'

import { NotasTareasManager } from '@/components/atlas/notas-tareas-manager'
import { useSession } from 'next-auth/react'
import { useUIStore } from '@/lib/store'

export default function NotasPage() {
    const { data: session } = useSession()
    const { addNotification } = useUIStore()

    return (
        <div className="animate-fade-in space-y-4">
            <NotasTareasManager userId={session?.user?.id || ''} addNotification={addNotification} />
        </div>
    )
}
