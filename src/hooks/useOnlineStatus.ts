"use client"

import { useEffect } from 'react'
import { useOfflineStore } from '@/stores/offline.store'

export function useOnlineStatus() {
  const setOnline = useOfflineStore((s) => s.setOnline)
  const isOnline = useOfflineStore((s) => s.isOnline)

  useEffect(() => {
    setOnline(navigator.onLine)

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  return isOnline
}
