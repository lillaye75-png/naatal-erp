"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, Share2, Download, MessageSquare, Mail, X, FileText } from "lucide-react"
import { InvoicePreview, InvoiceDisplayData } from "./InvoicePreview"
import { downloadInvoicePdf } from "@/lib/pdf"
import type { Sale, Invoice, Customer } from "@/types"
import { buildWhatsAppInvoiceURL } from "@/lib/whatsapp"
import { buildInvoiceSms } from "@/lib/sms"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"

interface InvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: Sale | null
  invoice: Invoice | null
  customer?: Customer | null
  storeName?: string
  storeAddress?: string
  storePhone?: string
  storeLogo?: string
  invoiceFooter?: string
}

export function InvoiceModal({
  open,
  onOpenChange,
  sale,
  invoice,
  customer,
  storeName = "Mon Magasin",
  storeAddress,
  storePhone,
  storeLogo,
  invoiceFooter,
}: InvoiceModalProps) {
  const [sending, setSending] = useState(false)
  const [printFormat, setPrintFormat] = useState<'80mm' | 'A4'>('80mm')
  const previewRef = useRef<HTMLDivElement>(null)

  if (!sale || !invoice) return null

  const invoiceTypeLabel: Record<string, string> = {
    INVOICE: 'Facture',
    PROFORMA: 'Proforma',
    QUOTATION: 'Devis',
    CREDIT_NOTE: 'Avoir',
  }

  const isCreditNote = sale.invoiceType === 'CREDIT_NOTE'
  const isProforma = sale.invoiceType === 'PROFORMA' || sale.invoiceType === 'QUOTATION'
  const paid = sale.paymentStatus === 'PAID' ? sale.total : sale.amountPaid || 0
  const balance = sale.paymentStatus === 'PAID' ? 0 : invoice.total - paid

  const typeLabel = invoiceTypeLabel[sale.invoiceType] || 'Facture'

  const displayData: InvoiceDisplayData = {
    number: invoice.number,
    customerName: customer?.name || 'Client divers',
    items: sale.items.map((i) => ({
      name: i.name || i.productId,
      qty: i.qty,
      price: i.unitPrice,
      total: isCreditNote ? -i.total : i.total,
    })),
    subtotal: isCreditNote ? -sale.subtotal : sale.subtotal,
    tax: isCreditNote ? -(sale.tax || 0) : (sale.tax || 0),
    discount: isCreditNote ? -(sale.discount || 0) : (sale.discount || 0),
    total: isCreditNote ? -invoice.total : invoice.total,
    paid: isProforma ? 0 : paid,
    balance: isProforma ? 0 : balance,
    dueDate: invoice.dueDate || undefined,
    invoiceType: sale.invoiceType,
  }

  const pdfData = {
    storeName,
    storeAddress,
    storePhone,
    storeLogo,
    invoiceNumber: invoice.number,
    date: invoice.createdAt ? new Date(Number(invoice.createdAt)).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'),
    customerName: customer?.name || 'Client divers',
    customerPhone: customer?.phone,
    items: sale.items.map((i) => ({
      name: i.name || i.productId,
      qty: isCreditNote ? -i.qty : i.qty,
      price: i.unitPrice,
      total: isCreditNote ? -i.total : i.total,
    })),
    subtotal: isCreditNote ? -sale.subtotal : sale.subtotal,
    discount: isCreditNote ? -(sale.discount || 0) : (sale.discount || 0),
    tax: isCreditNote ? -(sale.tax || 0) : (sale.tax || 0),
    total: isCreditNote ? -invoice.total : invoice.total,
    paid: isProforma ? 0 : paid,
    balance: isProforma ? 0 : balance,
    footerText: invoiceFooter,
    invoiceType: sale.invoiceType,
  }

  const handlePrint = () => {
    window.print()
  }

  const handlePrintTwoCopies = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>Impression ${invoice.number}</title>
      <style>
        @page { margin: 5mm; }
        body { font-family: monospace; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 6px; text-align: left; border-bottom: 1px solid #ddd; }
        .right { text-align: right; }
        .page-break { page-break-after: always; }
        .no-print { display: none; }
      </style>
      </head><body>
      <div id="content">${previewRef.current?.innerHTML || ''}</div>
      <div class="page-break"></div>
      <div>${previewRef.current?.innerHTML || ''}</div>
      <script>window.onload = function() { window.print(); }<\/script>
      </body></html>
    `)
    printWindow.document.close()
  }

  const handlePdf = () => {
    downloadInvoicePdf(pdfData)
    toast.success("Téléchargement de la facture...")
  }

  const handleWhatsApp = async () => {
    if (!customer?.phone) {
      toast.error("Aucun numéro de téléphone client")
      return
    }
    setSending(true)
    try {
      const url = buildWhatsAppInvoiceURL(
        customer.phone,
        customer.name || 'Client',
        invoice.number,
        invoice.total,
        paid,
        balance,
        storeName,
      )
      window.open(url, '_blank')
    } finally {
      setSending(false)
    }
  }

  const handleSms = () => {
    if (!customer?.phone) {
      toast.error("Aucun numéro de téléphone client")
      return
    }
    const message = buildInvoiceSms(
      storeName,
      customer.name || 'Client',
      invoice.number,
      invoice.total,
      paid,
      balance,
    )
    const url = `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    toast.success("Message envoyé")
  }

  const handleEmail = () => {
    if (!customer?.email) {
      toast.error("Aucune adresse email client")
      return
    }
    const subject = encodeURIComponent(`Facture ${invoice.number} - ${storeName}`)
    const body = encodeURIComponent(
      `Bonjour ${customer.name || 'Client'},\n\nVoici votre facture ${invoice.number} du ${new Date().toLocaleDateString('fr-FR')}.\n\nMontant total: ${formatXOF(invoice.total)}\nPayé: ${formatXOF(paid)}\nReste: ${formatXOF(balance)}\n\n${storeName}\nMerci de votre visite !`
    )
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`, '_blank')
    toast.success("Email ouvert")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md print:max-w-full print:shadow-none print:border-none print:p-0">
          <DialogHeader className="print:hidden">
            <DialogTitle>{typeLabel} {invoice.number}</DialogTitle>
          </DialogHeader>

          <div
            ref={previewRef}
            id="invoice-preview"
            className={`print:block max-h-[65vh] overflow-y-auto print:max-h-none ${printFormat === '80mm' ? 'print-80mm' : 'print-a4'}`}
          >
            <InvoicePreview data={displayData} storeName={storeName} />
          </div>

          <div className="flex flex-wrap gap-2 justify-end print:hidden border-t pt-3">
            <div className="flex items-center gap-1 mr-auto">
              <Button
                variant={printFormat === '80mm' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setPrintFormat('80mm')}
              >
                80mm
              </Button>
              <Button
                variant={printFormat === 'A4' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setPrintFormat('A4')}
              >
                A4
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" /> Fermer
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Imprimer
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintTwoCopies}>
              <FileText className="w-4 h-4" /> 2 copies
            </Button>
            <Button variant="outline" size="sm" onClick={handlePdf}>
              <Download className="w-4 h-4" /> PDF
            </Button>
            {customer?.phone && (
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={sending}>
                <Share2 className="w-4 h-4" /> WhatsApp
              </Button>
            )}
            {!isProforma && customer?.phone && (
              <Button variant="outline" size="sm" onClick={handleSms}>
                <MessageSquare className="w-4 h-4" /> SMS
              </Button>
            )}
            {!isProforma && customer?.email && (
              <Button variant="outline" size="sm" onClick={handleEmail}>
                <Mail className="w-4 h-4" /> Email
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
