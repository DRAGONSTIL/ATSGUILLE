'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('dashboard_route_error', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="p-8 space-y-3">
      <h2 className="text-xl font-semibold">Ocurrió un error en esta pantalla</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  )
}
