"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { getSales } from "@/repositories/sale.repository"
import { getInvoice } from "@/repositories/invoice.repository"
import { InvoiceModal } from "@/components/shared/InvoiceModal"
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"
import type { Sale, Invoice } from "@/types"

const TABS = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'PAID', label: 'Payées' },
  { value: 'UNPAID', label: 'Impayées' },
] as const

export default function InvoicesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [activeTab, setActiveTab] = useState<string>('ALL')
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const tenant = useAuthStore((s) => s.tenant)

  const filteredSales = useMemo(() => {
    if (activeTab === 'ALL') return sales
    if (activeTab === 'PENDING') return sales.filter((s) => s.paymentStatus === 'PENDING' && (s.paymentMethod === 'WAVE' || s.paymentMethod === 'OM'))
    if (activeTab === 'PAID') return sales.filter((s) => s.paymentStatus === 'PAID')
    if (activeTab === 'UNPAID') return sales.filter((s) => s.paymentStatus === 'UNPAID' || s.paymentStatus === 'PARTIAL')
    return sales
  }, [sales, activeTab])

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await getSales(tenantId)
      setSales(result.items)
    } catch (err) {
      console.error('Error loading invoices:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement des factures')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const handleViewInvoice = async (sale: Sale) => {
    setSelectedSale(sale)
    if (sale.invoiceId) {
      const invoice = await getInvoice(sale.invoiceId)
      setSelectedInvoice(invoice)
    } else {
      setSelectedInvoice(null)
    }
  }

  const handleCloseModal = () => {
    setSelectedSale(null)
    setSelectedInvoice(null)
  }

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); load() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Factures</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos factures</p>
        </div>
      </div>
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {filteredSales.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucune facture</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">N° Document</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s) => (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{s.invoiceId?.slice(-6) || '-'}</td>
                  <td className="p-3 text-sm text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50">
                      {s.invoiceType === 'PROFORMA' ? 'Pro Forma' : s.invoiceType === 'QUOTATION' ? 'Devis' : s.invoiceType === 'CREDIT_NOTE' ? 'Avoir' : 'Facture'}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-right font-medium">{formatXOF(s.total)}</td>
                  <td className="p-3 text-center">
                    <PaymentStatusBadge status={s.paymentStatus} />
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(s)}>
                      Voir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedSale && (
        <InvoiceModal
          open={!!selectedSale}
          onOpenChange={handleCloseModal}
          sale={selectedSale}
            invoice={selectedInvoice || {
              id: '',
              number: `INV-${selectedSale.invoiceId?.slice(-4) || '0000'}`,
              saleId: selectedSale.id,
              customerId: selectedSale.customerId,
              total: selectedSale.total,
              dueDate: '',
              printCount: 0,
              whatsappSent: false,
              invoiceType: selectedSale.invoiceType || 'INVOICE',
              tenantId: tenantId || '',
              createdAt: selectedSale.createdAt || '',
              updatedAt: '',
              createdBy: '',
              updatedBy: '',
              isDeleted: false,
              status: 'ACTIVE',
            }}
          storeName={tenant?.name || 'Mon Magasin'}
          storeLogo={tenant?.logoUrl}
        />
      )}
    </div>
  )
}
