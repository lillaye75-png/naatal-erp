"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, CheckCircle2, XCircle } from "lucide-react"

const DISMISSED_KEY = "naatal_checklist_dismissed"

interface ChecklistPopupProps {
  items: { key: string; label: string; done: boolean }[]
}

export function ChecklistPopup({ items }: ChecklistPopupProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "true"
    const hasIncomplete = items.some((item) => !item.done)
    if (hasIncomplete && !dismissed) setOpen(true)
  }, [items])

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleDismiss() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Checklist de démarrage
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-3 text-sm">
              {item.done ? (
                <Check className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
              )}
              <span className={item.done ? "line-through text-muted-foreground" : ""}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss} className="w-full">
            Ne plus afficher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
