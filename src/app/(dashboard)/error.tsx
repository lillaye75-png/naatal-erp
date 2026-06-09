"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function DashboardErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <AlertTriangle className="w-12 h-12 text-destructive" />
      <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {error.message || "Quelque chose s'est mal passé."}
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  )
}