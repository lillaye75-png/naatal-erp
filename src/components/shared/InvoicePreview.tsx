"use client"

import { formatXOF } from "@/lib/currency"

export interface InvoiceDisplayData {
  number: string
  customerName: string
  items: Array<{ name: string; qty: number; price: number; total: number }>
  subtotal: number
  tax: number
  discount?: number
  total: number
  paid: number
  balance: number
  dueDate?: string
  invoiceType?: string
}

interface InvoicePreviewProps {
  data: InvoiceDisplayData
  storeName?: string
}

export function InvoicePreview({ data, storeName = "Mon Magasin" }: InvoicePreviewProps) {
  const invoiceTypeLabel: Record<string, string> = {
    INVOICE: 'Facture',
    PROFORMA: 'Proforma',
    QUOTATION: 'Devis',
    CREDIT_NOTE: 'Avoir',
  }

  const isProforma = data.invoiceType === 'PROFORMA' || data.invoiceType === 'QUOTATION'
  const isCreditNote = data.invoiceType === 'CREDIT_NOTE'
  const label = invoiceTypeLabel[data.invoiceType || 'INVOICE'] || 'Facture'
  const statusLabel = isProforma ? 'Estimation' : data.balance <= 0 ? 'Payée' : data.paid > 0 ? 'Partielle' : 'Impayée'
  const statusColor = isProforma
    ? 'text-blue-600'
    : data.balance <= 0
    ? 'text-green-600'
    : data.paid > 0
    ? 'text-orange-600'
    : 'text-red-600'

  return (
    <div className="p-4 space-y-4 text-sm">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">{storeName}</h2>
        <p className="text-muted-foreground">{label} {data.number}</p>
      </div>

      <div className="flex justify-between text-xs">
        <div>
          <p className="font-medium">Client:</p>
          <p>{data.customerName}</p>
        </div>
        {!isProforma && (
          <div className="text-right">
            <p className={statusColor}>{statusLabel}</p>
          </div>
        )}
      </div>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1">Article</th>
            <th className="text-right py-1">Qté</th>
            <th className="text-right py-1">PU</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} className="border-b last:border-0">
              <td className="py-1">{item.name}</td>
              <td className="text-right py-1">{item.qty}</td>
              <td className="text-right py-1">{formatXOF(item.price)}</td>
              <td className="text-right py-1">{formatXOF(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 text-right border-t pt-2">
        <div className="flex justify-between">
          <span>Sous-total:</span>
          <span>{formatXOF(data.subtotal)}</span>
        </div>
        {(data.discount || 0) > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Remise:</span>
            <span>-{formatXOF(data.discount || 0)}</span>
          </div>
        )}
        {data.tax > 0 && (
          <div className="flex justify-between">
            <span>TVA:</span>
            <span>{formatXOF(data.tax)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-1 border-t">
          <span>Total:</span>
          <span>{formatXOF(data.total)}</span>
        </div>
        {!isProforma && data.paid > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Payé:</span>
            <span>{formatXOF(data.paid)}</span>
          </div>
        )}
        {!isProforma && data.balance > 0 && (
          <div className="flex justify-between text-red-600 font-medium">
            <span>Reste:</span>
            <span>{formatXOF(data.balance)}</span>
          </div>
        )}
      </div>

      {data.dueDate && !isProforma && (
        <p className="text-xs text-center text-red-600 pt-2 border-t">
          Échéance: {data.dueDate}
        </p>
      )}

      <p className="text-xs text-center text-muted-foreground pt-2">
        {isCreditNote ? 'Avoir émis le ' + new Date().toLocaleDateString('fr-FR') : 'Merci de votre visite !'}
      </p>
    </div>
  )
}
