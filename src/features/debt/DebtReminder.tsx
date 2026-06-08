"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, MessageSquare } from "lucide-react"
import { buildWhatsAppDebtURL } from "@/lib/whatsapp"
import { buildDebtReminderSms } from "@/lib/sms"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"

interface DebtReminderProps {
  customerName: string
  customerPhone?: string
  amount: number
  dueDate?: string
  storeName?: string
}

export function DebtReminder({
  customerName,
  customerPhone,
  amount,
  dueDate,
  storeName = "Mon Magasin",
}: DebtReminderProps) {
  const [sending, setSending] = useState(false)

  const handleWhatsAppReminder = () => {
    if (!customerPhone) {
      toast.error("Aucun numéro de téléphone")
      return
    }
    setSending(true)
    try {
      const url = buildWhatsAppDebtURL(customerPhone, customerName, amount, dueDate || '', storeName)
      window.open(url, '_blank')
    } finally {
      setSending(false)
    }
  }

  const handleSmsReminder = () => {
    if (!customerPhone) {
      toast.error("Aucun numéro de téléphone")
      return
    }
    const message = buildDebtReminderSms(storeName, customerName, amount, dueDate)
    const url = `https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    toast.success(`Rappel envoyé à ${customerPhone}`)
  }

  if (!customerPhone) return null

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="xs"
        onClick={handleWhatsAppReminder}
        disabled={sending}
        title="Rappel WhatsApp"
      >
        <Share2 className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={handleSmsReminder}
        title="Rappel SMS"
      >
        <MessageSquare className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}
