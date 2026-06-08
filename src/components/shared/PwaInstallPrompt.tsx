"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePWAInstall } from "@/hooks/usePWAInstall"
import { Download, X } from "lucide-react"

export function PwaInstallPrompt() {
  const { canInstall, install, dismiss } = usePWAInstall()

  if (!canInstall) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
      <Card className="shadow-lg border-primary/20">
        <CardContent className="flex items-center gap-3 pt-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Installer Naatal ERP</p>
            <p className="text-xs text-muted-foreground">Accès rapide depuis votre écran d'accueil</p>
          </div>
          <Button size="sm" onClick={install}>Installer</Button>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={dismiss}>
            <X className="w-3 h-3" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
