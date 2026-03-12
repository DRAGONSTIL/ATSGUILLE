'use client'

import { EntrevistasManager } from '@/components/atlas/entrevistas-manager'
import { useUIStore } from '@/lib/store'

export default function EntrevistasPage() {
    const { addNotification } = useUIStore()

    return (
        <div className="animate-fade-in space-y-4">
            <EntrevistasManager addNotification={addNotification} />
        </div>
    )
}
