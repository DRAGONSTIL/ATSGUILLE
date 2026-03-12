'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUIStore } from '@/lib/store'
import {
  Bell,
  Check,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// Iconos por tipo
const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

// Colores por tipo
const COLORS = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [dbNotifications, setDbNotifications] = useState<any[]>([])
  const { notifications, removeNotification, clearNotifications } = useUIStore()

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await fetch('/api/notificaciones?limit=50')
        if (res.ok) {
          const data = await res.json()
          setDbNotifications(data.notificaciones || [])
        }
      } catch (error) {
        console.error('Error loading notifications:', error)
      }
    }

    loadNotifications()
  }, [])

  const mergedNotifications = useMemo(() => {
    const dbMapped = dbNotifications.map((n) => ({
      id: n.id,
      title: n.titulo,
      message: n.mensaje,
      type: (n.tipo || 'info').toLowerCase(),
      createdAt: new Date(n.createdAt),
      source: 'db' as const,
      leida: n.leida,
    }))

    const localMapped = notifications.map((n) => ({ ...n, source: 'local' as const, leida: false }))
    return [...dbMapped, ...localMapped].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [dbNotifications, notifications])

  const unreadCount = notifications.length + dbNotifications.filter((n) => !n.leida).length

  const handleMarkAsRead = async (notification: any) => {
    if (notification.source === 'db') {
      await fetch('/api/notificaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notification.id }),
      })
      setDbNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, leida: true } : n)))
      return
    }

    removeNotification(notification.id)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">Notificaciones</h4>
          {mergedNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNotifications}
              className="text-xs h-auto py-1 px-2"
            >
              Limpiar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-80">
          {mergedNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {mergedNotifications.map((notification) => {
                const Icon = ICONS[(notification.type as keyof typeof ICONS)] || Info
                const color = COLORS[(notification.type as keyof typeof COLORS)] || COLORS.info

                return (
                  <div
                    key={notification.id}
                    className="p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{notification.title}</p>
                            {notification.source === 'db' && !notification.leida && (
                              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleMarkAsRead(notification)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(notification.createdAt, {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
