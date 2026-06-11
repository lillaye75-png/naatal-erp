"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { useAuthStore } from "@/stores/auth.store"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { LogIn, LogOut, Monitor, Smartphone } from "lucide-react"
import type { SessionLog } from "@/types"

export default function SessionsPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(
        query(
          collection(db, 'session_logs'),
          where('tenantId', '==', tenantId),
          orderBy('createdAt', 'desc'),
          limit(100),
        ),
      )
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SessionLog)))
    } catch { /* collection may not exist yet */ }
    finally { setLoading(false) }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">Historique des connexions</p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Action</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Appareil</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Navigateur</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-sm">
                  <span className="flex items-center gap-2">
                    {l.action === 'LOGIN' ? (
                      <LogIn className="w-4 h-4 text-success" />
                    ) : (
                      <LogOut className="w-4 h-4 text-muted-foreground" />
                    )}
                    {l.action === 'LOGIN' ? 'Connexion' : 'Déconnexion'}
                  </span>
                </td>
                <td className="p-3 text-sm">
                  <span className="flex items-center gap-2">
                    {l.device === 'Mobile' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                    {l.device || '-'}
                  </span>
                </td>
                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{l.browser || '-'}</td>
                <td className="p-3 text-sm text-right text-muted-foreground">
                  {l.createdAt ? new Date(parseInt(l.createdAt)).toLocaleString() : '-'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">
                <p>Aucune session enregistrée</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
