"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { formatXOF } from "@/lib/currency"
import { ExportTools } from "./ExportTools"
import { DollarSign, TrendingUp, TrendingDown, CheckCircle } from "lucide-react"
import { toast } from "sonner"

function tsToMillis(v: unknown): number {
  if (!v) return 0
  if (v instanceof Timestamp) return v.toMillis()
  if (typeof v === 'object' && v !== null && 'seconds' in v) return (v as any).seconds * 1000
  const n = parseInt(String(v))
  return isNaN(n) ? 0 : n
}

export function CashRegisterReport({ startDate, endDate }: { startDate: number; endDate: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(
        collection(db, 'cash_registers'),
        where('tenantId', '==', tenantId),
      ))
      const allSessions = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((s) => {
          const opened = tsToMillis(s.openedAt)
          return opened >= startDate && opened <= endDate
        })
      setSessions(allSessions)
    } catch (err) {
      console.error("Error loading cash register report:", err)
      setError(err instanceof Error ? err.message : "Erreur de chargement du rapport caisse")
    } finally {
      setLoading(false)
    }
  }, [tenantId, startDate, endDate])

  useEffect(() => { load() }, [load])

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <DollarSign className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); load() }}>
        Réessayer
      </Button>
    </div>
  )

  const totalExpected = sessions.reduce((s, sess) => s + (sess.expectedBalance || 0), 0)
  const totalActual = sessions.reduce((s, sess) => s + (sess.closingAmount || sess.expectedBalance || 0), 0)
  const totalDifference = totalActual - totalExpected

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Rapport de caisse</h2>
        <ExportTools
          data={sessions.map((s) => ({
            ouverture: s.openedAt ? new Date(tsToMillis(s.openedAt)).toLocaleDateString() : '-',
            fermeture: s.closedAt ? new Date(tsToMillis(s.closedAt)).toLocaleDateString() : 'En cours',
            soldeOuverture: s.openingBalance || 0,
            soldeFermeture: s.closingAmount || s.expectedBalance || 0,
            difference: (s.closingAmount || s.expectedBalance || 0) - (s.expectedBalance || 0),
          }))}
          columns={[
            { key: "ouverture", label: "Ouverture" },
            { key: "fermeture", label: "Fermeture" },
            { key: "soldeOuverture", label: "Solde ouverture" },
            { key: "soldeFermeture", label: "Solde fermeture" },
            { key: "difference", label: "Différence" },
          ]}
          filename="rapport-caisse"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              Attendu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatXOF(totalExpected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <TrendingDown className="w-4 h-4" />
              Réel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatXOF(totalActual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="w-4 h-4" />
              Différence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              totalDifference === 0 ? 'text-success' : totalDifference > 0 ? 'text-primary' : 'text-destructive'
            }`}>
              {totalDifference >= 0 ? '+' : ''}{formatXOF(totalDifference)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Session</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Ouverture</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Attendu</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Réel</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Différence</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const expected = s.expectedBalance || 0
              const actual = s.closingAmount || expected
              const diff = actual - expected
              return (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-sm">{new Date(tsToMillis(s.openedAt)).toLocaleDateString()}</td>
                  <td className="p-3 text-sm text-right">{formatXOF(s.openingBalance || 0)}</td>
                  <td className="p-3 text-sm text-right">{formatXOF(expected)}</td>
                  <td className="p-3 text-sm text-right">{formatXOF(actual)}</td>
                  <td className={`p-3 text-sm text-right font-medium ${
                    diff === 0 ? 'text-success' : diff > 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {diff >= 0 ? '+' : ''}{formatXOF(diff)}
                  </td>
                </tr>
              )
            })}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Aucune session de caisse
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
