"use client"

import { X, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react"
import { useOfflineStore } from "@/stores/offline.store"
import { cn } from "@/lib/utils"

export function OfflineBanner() {
  const isOnline = useOfflineStore((s) => s.isOnline)
  const isSyncing = useOfflineStore((s) => s.isSyncing)
  const pendingCount = useOfflineStore((s) => s.pendingCount)
  const showBanner = useOfflineStore((s) => s.showBanner)
  const dismissBanner = useOfflineStore((s) => s.dismissBanner)

  if (!showBanner && !isSyncing) return null
  if (isOnline && !isSyncing && pendingCount === 0 && !showBanner) return null

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 text-white px-4 py-1.5 text-xs shadow-lg",
        "flex items-center justify-between",
        !isOnline && "bg-red-600",
        isOnline && isSyncing && "bg-amber-500",
        isOnline && !isSyncing && pendingCount === 0 && "bg-green-600",
      )}
    >
      <div className="flex items-center gap-2">
        {!isOnline && (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span>Hors ligne — les modifications seront synchronisées</span>
          </>
        )}
        {isOnline && isSyncing && (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Synchronisation en cours... ({pendingCount} en attente)</span>
          </>
        )}
        {isOnline && !isSyncing && pendingCount === 0 && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synchronisé</span>
          </>
        )}
      </div>
      <button
        onClick={dismissBanner}
        className="p-0.5 hover:bg-white/20 rounded"
        aria-label="Fermer"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
