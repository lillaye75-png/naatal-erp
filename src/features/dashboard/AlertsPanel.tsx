"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import type { AlertItem } from "./hooks/useDashboard"

interface AlertsPanelProps {
  alerts: AlertItem[]
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Alertes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{alert.name}</span>
                <span className="text-destructive">
                  Stock : {alert.stock} (min. {alert.minStock})
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-6">
            Aucune alerte pour le moment
          </div>
        )}
      </CardContent>
    </Card>
  )
}
