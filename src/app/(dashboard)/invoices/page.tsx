"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { FileText, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseLocalDate(s: string): number {
  if (!s) return 0
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

export default function InvoicesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [activeTab, setActiveTab] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<string>('TODAY')
  const [startDate, setStartDate] = useState(toLocalDateString(new Date()))
  const [endDate, setEndDate] = useState(toLocalDateString(new Date()))
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const tenant = useAuthStore((s) => s.tenant)

  const filteredSales = useMemo(() => {
    let base = sales
    if (dateFilter === 'TODAY') {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      base = base.filter((s) => {
        const ts = parseInt(s.createdAt || '0')
        return !isNaN(ts) && ts >= start
      })
    } else if (dateFilter === 'CUSTOM') {
      const start = parseLocalDate(startDate)
      const end = parseLocalDate(endDate) + 86400000
      base = base.filter((s) => {
        const ts = parseInt(s.createdAt || '0')
        return !isNaN(ts) && ts >= start && ts < end
      })
    }
    if (activeTab === 'ALL') return base
    if (activeTab === 'PENDING') return base.filter((s) => s.paymentStatus === 'PENDING' && (s.paymentMethod === 'WAVE' || s.paymentMethod === 'OM'))
    if (activeTab === 'PAID') return base.filter((s) => s.paymentStatus === 'PAID')
    if (activeTab === 'UNPAID') return base.filter((s) => s.paymentStatus === 'UNPAID' || s.paymentStatus === 'PARTIAL')
    return base
  }, [sales, activeTab, dateFilter, startDate, endDate])

  const totalSales = filteredSales
    .filter((s) => s.invoiceType !== 'PROFORMA' && s.invoiceType !== 'QUOTATION' && s.invoiceType !== 'CREDIT_NOTE')
    .reduce((sum, s) => sum + s.total, 0)

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setDateFilter('TODAY')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              dateFilter === 'TODAY'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('CUSTOM')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
              dateFilter === 'CUSTOM'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-3 h-3" />
            Personnalisé
          </button>
        </div>
        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs">Du</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36 h-8 text-xs" />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs">Au</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36 h-8 text-xs" />
            </div>
          </div>
        )}
        <div className="text-sm font-medium">
          Total des ventes: {formatXOF(totalSales)}
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
