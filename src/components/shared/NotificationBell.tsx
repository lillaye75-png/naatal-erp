"use client"

import { useState, useEffect, useMemo } from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/auth.store"
import { useOnSnapshot } from "@/hooks/useOnSnapshot"
import { initializeFirebase } from "@/lib/firebase"
import { collection, query, where, orderBy, type Firestore } from "firebase/firestore"
import { markAsRead, markAllAsRead, buildNotificationsQuery } from "@/services/notification.service"
import type { Notification } from "@/types"

export function NotificationBell() {
  const userId = useAuthStore((s) => s.user?.id)
  const [db, setDb] = useState<Firestore | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    initializeFirebase().then(({ db: d }) => setDb(d))
  }, [userId])

  const notifQ = useMemo(
    () => (db && userId ? buildNotificationsQuery(db, userId) : null),
    [db, userId],
  )

  const { data: notifications, loading } = useOnSnapshot<Notification>(notifQ)

  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length

  const handleMarkRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleMarkAllRead = async () => {
    if (!userId) return
    await markAllAsRead(userId)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK': return '📦'
      case 'PAYMENT': return '💰'
      case 'DEBT': return '⚠️'
      default: return '🔔'
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleMarkAllRead}>
              <CheckCheck className="w-3 h-3" /> Tout lire
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`flex items-start gap-3 px-3 py-2 cursor-pointer ${!n.isRead ? 'bg-muted/50' : ''}`}
              onClick={() => {
                if (!n.isRead) handleMarkRead(n.id)
                if (n.link) window.location.href = n.link
                setOpen(false)
              }}
            >
              <span className="text-lg mt-0.5">{getTypeIcon(n.type)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.isRead ? 'font-medium' : ''}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {n.createdAt ? new Date(parseInt(n.createdAt)).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Aucune notification
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
