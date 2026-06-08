"use client"

interface PaymentStatusBadgeProps {
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'PENDING' | 'FAILED'
}

const LABELS: Record<string, string> = {
  PAID: 'Payé',
  PARTIAL: 'Partiel',
  UNPAID: 'Impayé',
  PENDING: 'En attente',
  FAILED: 'Échoué',
}

const COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PARTIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  UNPAID: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${COLORS[status] || ''}`}>
      {LABELS[status] || status}
    </span>
  )
}
