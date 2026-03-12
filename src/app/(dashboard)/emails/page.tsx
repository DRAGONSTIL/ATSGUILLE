'use client'

import { EmailTemplatesManager } from '@/components/atlas/email-templates-manager'
import { useUIStore } from '@/lib/store'

export default function EmailsPage() {
    const { addNotification } = useUIStore()

    return (
        <div className="animate-fade-in space-y-4">
            <EmailTemplatesManager addNotification={addNotification} />
        </div>
    )
}
